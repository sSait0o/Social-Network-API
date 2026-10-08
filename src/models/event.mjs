import mongoose from 'mongoose';
import validator from 'validator';

const Schema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'name is required'],
    trim: true,
    maxlength: [100, 'name must be at most 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [5000, 'description must be at most 5000 characters']
  },
  start_date: {
    type: Date,
    required: [true, 'start_date is required']
  },
  end_date: {
    type: Date,
    required: [true, 'end_date is required'],
    validate: {
      validator(value) {
        return !this.start_date || value > this.start_date;
      },
      message: 'end_date must be after start_date'
    }
  },
  location: {
    type: String,
    required: [true, 'location is required'],
    trim: true,
    maxlength: [200, 'location must be at most 200 characters']
  },
  cover: {
    type: String,
    trim: true,
    validate: {
      validator: (value) => validator.isURL(value, { protocols: ['http', 'https'], require_protocol: true }),
      message: 'cover must be a valid http(s) URL'
    }
  },
  visibility: {
    type: String,
    enum: {
      values: ['public', 'private'],
      message: 'visibility must be public or private'
    },
    default: 'public'
  },
  organizers: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    validate: {
      validator: (value) => value.length > 0,
      message: 'an event needs at least one organizer'
    }
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  ticketing: {
    type: Boolean,
    default: false,
    validate: {
      validator(value) {
        return !value || this.visibility === 'public';
      },
      message: 'only public events can have a ticketing'
    }
  },
  shopping_list: {
    type: Boolean,
    default: false
  },
  carpool: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'events',
  minimize: false,
  versionKey: false
});

export default Schema;
