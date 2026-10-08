import mongoose from 'mongoose';

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      code: 400,
      message: 'Malformed JSON body'
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      code: 413,
      message: 'Request body too large'
    });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      code: 400,
      message: 'Validation failed',
      errors: Object.values(err.errors).map((error) => ({
        field: error.path,
        message: error instanceof mongoose.Error.CastError
          ? `${error.path} has an invalid type`
          : error.message
      }))
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      code: 400,
      message: `Invalid value for ${err.path}`
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      code: 409,
      message: `${Object.keys(err.keyValue || {}).join(', ') || 'Resource'} already exists`
    });
  }

  console.error(`[ERROR] ${req.method} ${req.originalUrl} ->`, err);

  return res.status(500).json({
    code: 500,
    message: 'Internal Server Error'
  });
};

export default errorHandler;
