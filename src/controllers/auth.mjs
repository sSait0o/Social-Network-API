import { signToken } from '../middlewares/auth.mjs';
import { loginLimiter } from '../middlewares/rate-limit.mjs';

const Auth = class Auth {
  constructor(app, connect, config) {
    this.app = app;
    this.config = config;
    this.Model = connect.model('User');

    this.run();
  }

  register() {
    this.app.post('/auth/register', async (req, res, next) => {
      try {
        const { email, password, firstname, lastname, avatar, birthdate } = req.body;

        const user = await this.Model.create({
          email,
          password,
          firstname,
          lastname,
          avatar,
          birthdate
        });

        res.status(201).json({
          user,
          token: signToken(user, this.config)
        });
      } catch (err) {
        next(err);
      }
    });
  }

  login() {
    this.app.post('/auth/login', loginLimiter, async (req, res, next) => {
      try {
        const { email, password } = req.body;

        if (typeof email !== 'string' || typeof password !== 'string') {
          return res.status(400).json({
            code: 400,
            message: 'email and password are required and must be strings'
          });
        }

        const user = await this.Model
          .findOne({ email: email.trim().toLowerCase() })
          .select('+password');

        if (!user || !(await user.comparePassword(password))) {
          return res.status(401).json({
            code: 401,
            message: 'Invalid email or password'
          });
        }

        res.status(200).json({
          user,
          token: signToken(user, this.config),
          expiresIn: this.config.jwt.expiresIn
        });
      } catch (err) {
        next(err);
      }
    });
  }

  run() {
    this.register();
    this.login();
  }
};

export default Auth;
