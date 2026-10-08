import jwt from 'jsonwebtoken';

const unauthorized = (res, message) => {
  res.set('WWW-Authenticate', 'Bearer');

  return res.status(401).json({
    code: 401,
    message
  });
};

export const authenticate = (config) => (req, res, next) => {
  const header = req.get('Authorization');

  if (!header) {
    return unauthorized(res, 'Missing token');
  }

  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return unauthorized(res, 'Invalid authorization header, expected "Bearer <token>"');
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });

    req.user = {
      id: payload.sub,
      email: payload.email
    };

    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return unauthorized(res, 'Token expired');
    }

    return unauthorized(res, 'Invalid token');
  }
};

export const signToken = (user, config) => jwt.sign(
  { email: user.email },
  config.jwt.secret,
  {
    algorithm: 'HS256',
    expiresIn: config.jwt.expiresIn,
    subject: user.id
  }
);
