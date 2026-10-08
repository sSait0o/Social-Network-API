import mongoose from 'mongoose';

const Schema = new mongoose.Schema({
  departure_place: {
    type: String,
    required: [true, 'departure_place is required'],
    trim: true,
    maxlength: [200, 'departure_place must be at most 200 characters']
  },
  departure_time: {
    type: Date,
    required: [true, 'departure_time is required']
  },
  price: {
    type: Number,
    required: [true, 'price is required'],
    min: [0, 'price must be positive']
  },
  seats: {
    type: Number,
    required: [true, 'seats is required'],
    min: [1, 'seats must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'seats must be an integer'
    }
  },
  max_delay: {
    type: Number,
    required: [true, 'max_delay is required'],
    min: [0, 'max_delay must be positive'],
    validate: {
      validator: Number.isInteger,
      message: 'max_delay must be an integer (minutes)'
    }
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'carpools',
  minimize: false,
  versionKey: false
});

export default Schema;
