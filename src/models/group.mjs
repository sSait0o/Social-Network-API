import mongoose from 'mongoose';
import validator from 'validator';

const isUrl = (value) => validator.isURL(value, { protocols: ['http', 'https'], require_protocol: true });

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
    maxlength: [2000, 'description must be at most 2000 characters']
  },
  icon: {
    type: String,
    trim: true,
    validate: {
      validator: isUrl,
      message: 'icon must be a valid http(s) URL'
    }
  },
  cover: {
    type: String,
    trim: true,
    validate: {
      validator: isUrl,
      message: 'cover must be a valid http(s) URL'
    }
  },
  type: {
    type: String,
    enum: {
      values: ['public', 'private', 'secret'],
      message: 'type must be public, private or secret'
    },
    default: 'public'
  },
  allow_member_posts: {
    type: Boolean,
    default: true
  },
  allow_member_events: {
    type: Boolean,
    default: false
  },
  admins: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    validate: {
      validator: (value) => value.length > 0,
      message: 'a group needs at least one admin'
    }
  },
  members: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    validate: {
      validator: (value) => value.length > 0,
      message: 'a group needs at least one member'
    }
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'groups',
  minimize: false,
  versionKey: false
});

export default Schema;
