import mongoose from 'mongoose';

const Schema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'title is required'],
    trim: true,
    maxlength: [100, 'title must be at most 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'description must be at most 500 characters']
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  photos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photo'
  }],
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'albums',
  minimize: false,
  versionKey: false
});

export default Schema;
