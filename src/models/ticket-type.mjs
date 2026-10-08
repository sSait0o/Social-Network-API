import mongoose from 'mongoose';

const Schema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'name is required'],
    trim: true,
    maxlength: [100, 'name must be at most 100 characters']
  },
  amount: {
    type: Number,
    required: [true, 'amount is required'],
    min: [0, 'amount must be positive']
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
  sold: {
    type: Number,
    default: 0
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'ticket_types',
  minimize: false,
  versionKey: false
});

export default Schema;
