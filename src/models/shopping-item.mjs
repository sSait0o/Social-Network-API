import mongoose from 'mongoose';

const Schema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'name is required'],
    trim: true,
    maxlength: [100, 'name must be at most 100 characters']
  },
  quantity: {
    type: Number,
    required: [true, 'quantity is required'],
    min: [1, 'quantity must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'quantity must be an integer'
    }
  },
  arrival_time: {
    type: Date,
    required: [true, 'arrival_time is required']
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
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
  collection: 'shopping_items',
  minimize: false,
  versionKey: false
});

Schema.index({ event: 1, name: 1 }, { unique: true, collation: { locale: 'fr', strength: 2 } });

export default Schema;
