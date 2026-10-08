import mongoose from 'mongoose';

const Schema = new mongoose.Schema({
  poll: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll',
    required: true
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  answer: {
    type: Number,
    required: true,
    min: 0
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'votes',
  minimize: false,
  versionKey: false
});

Schema.index({ poll: 1, question: 1, user: 1 }, { unique: true });

export default Schema;
