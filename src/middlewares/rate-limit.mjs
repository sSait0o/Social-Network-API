import { rateLimit } from 'express-rate-limit';

const tooManyRequests = (req, res, next, options) => {
  res.status(options.statusCode).json({
    code: options.statusCode,
    message: 'Too Many Requests, please try again later'
  });
};

export const apiLimiter = (config) => rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: tooManyRequests
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: tooManyRequests
});
