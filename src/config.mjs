import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

dotenv.config({ path: root('.env'), quiet: true });

const port = Number(process.env.PORT) || 3000;

const common = {
  port,
  publicUrl: process.env.PUBLIC_URL || `https://localhost:${port}`,
  mongodb: {
    uri: process.env.MONGODB_URI || '',
    dbName: process.env.MONGODB_DB || 'social_network'
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: '1h'
  },
  cors: {
    origins: (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  },
  rateLimit: {
    windowMs: 60 * 60 * 1000,
    limit: 100
  },
  https: {
    key: root('certs/key.pem'),
    cert: root('certs/cert.pem')
  }
};

export default {
  developement: {
    ...common,
    type: 'developement'
  },
  production: {
    ...common,
    type: 'production'
  }
};
