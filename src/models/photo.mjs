import mongoose from 'mongoose';
import validator from 'validator';

const Schema = new mongoose.Schema({
  url: {
    type: String,
    required: [true, 'url is required'],
    trim: true,
    validate: {
      validator: (value) => validator.isURL(value, { protocols: ['http', 'https'], require_protocol: true }),
      message: 'url must be a valid http(s) URL'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'description must be at most 500 characters']
  },
  album: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Album',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'photos',
  minimize: false,
  versionKey: false
});

export default Schema;
