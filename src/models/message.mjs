import mongoose from 'mongoose';

const Schema = new mongoose.Schema({
  thread: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Thread',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'content is required'],
    trim: true,
    maxlength: [5000, 'content must be at most 5000 characters']
  },
  reply_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'messages',
  minimize: false,
  versionKey: false
});

export default Schema;
