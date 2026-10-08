import mongoose from 'mongoose';
import validator from 'validator';

const Schema = new mongoose.Schema({
  ticket_type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TicketType',
    required: [true, 'ticket_type is required']
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  firstname: {
    type: String,
    required: [true, 'firstname is required'],
    trim: true,
    maxlength: [50, 'firstname must be at most 50 characters']
  },
  lastname: {
    type: String,
    required: [true, 'lastname is required'],
    trim: true,
    maxlength: [50, 'lastname must be at most 50 characters']
  },
  email: {
    type: String,
    required: [true, 'email is required'],
    trim: true,
    lowercase: true,
    validate: {
      validator: (value) => validator.isEmail(value),
      message: 'email must be a valid email address'
    }
  },
  address: {
    street: {
      type: String,
      required: [true, 'address.street is required'],
      trim: true,
      maxlength: [200, 'address.street must be at most 200 characters']
    },
    zip_code: {
      type: String,
      required: [true, 'address.zip_code is required'],
      trim: true,
      match: [/^[A-Za-z0-9 -]{2,10}$/, 'address.zip_code is invalid']
    },
    city: {
      type: String,
      required: [true, 'address.city is required'],
      trim: true,
      maxlength: [100, 'address.city must be at most 100 characters']
    },
    country: {
      type: String,
      required: [true, 'address.country is required'],
      trim: true,
      maxlength: [100, 'address.country must be at most 100 characters']
    }
  },
  purchased_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'tickets',
  minimize: false,
  versionKey: false
});

Schema.index({ event: 1, email: 1 }, { unique: true });

export default Schema;
