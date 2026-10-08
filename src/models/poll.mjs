import mongoose from 'mongoose';

const Question = new mongoose.Schema({
  label: {
    type: String,
    required: [true, 'question label is required'],
    trim: true,
    maxlength: [500, 'question label must be at most 500 characters']
  },
  answers: {
    type: [{
      type: String,
      trim: true,
      maxlength: [200, 'answer must be at most 200 characters']
    }],
    validate: {
      validator: (value) => value.length >= 2,
      message: 'a question needs at least two possible answers'
    }
  }
});

const Schema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'title is required'],
    trim: true,
    maxlength: [200, 'title must be at most 200 characters']
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: {
    type: [Question],
    validate: {
      validator: (value) => value.length > 0,
      message: 'a poll needs at least one question'
    }
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'polls',
  minimize: false,
  versionKey: false
});

export default Schema;
