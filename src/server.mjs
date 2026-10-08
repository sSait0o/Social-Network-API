import fs from 'node:fs';
import https from 'node:https';
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import routes from './controllers/routes.mjs';
import models from './models/models.mjs';
import config from './config.mjs';
import { authenticate } from './middlewares/auth.mjs';
import { apiLimiter } from './middlewares/rate-limit.mjs';
import errorHandler from './middlewares/errors.mjs';

const Server = class Server {
  constructor() {
    this.app = express();
    this.config = config[process.argv[2]] || config.developement;
  }

  checkConfig() {
    if (this.config.jwt.secret.length < 32) {
      throw new Error('JWT_SECRET is missing or too short (32 characters minimum), see .env.example');
    }

    if (!fs.existsSync(this.config.https.key) || !fs.existsSync(this.config.https.cert)) {
      throw new Error('SSL certificate not found, run "npm run certs" to generate a self-signed one');
    }
  }

  async dbConnect() {
    try {
      const { uri, dbName } = this.config.mongodb;

      this.connect = mongoose.createConnection(uri, { dbName });

      const close = async () => {
        try {
          await this.connect.close();
          console.log('[CLOSE] api dbConnect() close() -> mongodb closed');
        } catch (error) {
          console.error('[ERROR] api dbConnect() close() -> mongodb error', error);
        }
      };

      this.connect.on('error', (err) => {
        console.error(`[ERROR] api dbConnect() -> mongodb error: ${err.message}`);
      });

      this.connect.on('disconnected', () => {
        console.log('[ERROR] api dbConnect() -> mongodb disconnected');
      });

      process.on('SIGINT', async () => {
        await close();
        process.exit(0);
      });

      await this.connect.asPromise();

      Object.entries(models).forEach(([name, schema]) => {
        this.connect.model(name, schema);
      });
    } catch (err) {
      throw new Error(`mongodb connection failed: ${err.message}`);
    }
  }

  middleware() {
    this.app.use(helmet());

    this.app.use(cors({
      origin: this.config.cors.origins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600
    }));

    this.app.use(apiLimiter(this.config));

    this.app.use(express.json({ limit: '10kb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10kb' }));

    this.app.use((req, res, next) => {
      req.body ??= {};
      next();
    });
  }

  routes() {
    const auth = authenticate(this.config);

    new routes.Auth(this.app, this.connect, this.config);
    new routes.Tickets(this.app, this.connect, auth);

    this.app.use(auth);

    new routes.Users(this.app, this.connect);
    new routes.Groups(this.app, this.connect);
    new routes.Events(this.app, this.connect, this.config);
    new routes.Threads(this.app, this.connect);
    new routes.Albums(this.app, this.connect);
    new routes.Photos(this.app, this.connect);
    new routes.Polls(this.app, this.connect);
    new routes.Shopping(this.app, this.connect);
    new routes.Carpools(this.app, this.connect);

    this.app.use((req, res) => {
      res.status(404).json({
        code: 404,
        message: 'Not Found'
      })
    });

    this.app.use(errorHandler);
  }

  async run() {
    try {
      this.checkConfig();
      await this.dbConnect();
      this.middleware();
      this.routes();

      const credentials = {
        key: fs.readFileSync(this.config.https.key),
        cert: fs.readFileSync(this.config.https.cert)
      };

      https.createServer(credentials, this.app)
        .on('error', (err) => {
          console.error(`[ERROR] api run() -> ${err.message}`);
          process.exit(1);
        })
        .listen(this.config.port, () => {
          console.log(`[START] api listening on https://localhost:${this.config.port}`);
        });
    } catch (err) {
      console.error(`[ERROR] api run() -> ${err.message}`);
      process.exit(1);
    }
  }
};

export default Server;
