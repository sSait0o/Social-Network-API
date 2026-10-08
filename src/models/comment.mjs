import mongoose from 'mongoose';

const Schema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'content is required'],
    trim: true,
    maxlength: [1000, 'content must be at most 1000 characters']
  },
  photo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photo',
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
  collection: 'comments',
  minimize: false,
  versionKey: false
});

export default Schema;
