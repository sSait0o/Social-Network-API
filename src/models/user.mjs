import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';

const Schema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: (value) => validator.isEmail(value),
      message: 'email must be a valid email address'
    }
  },
  password: {
    type: String,
    required: [true, 'password is required'],
    select: false,
    maxlength: [72, 'password must be at most 72 characters'],
    validate: {
      validator: (value) => validator.isStrongPassword(value),
      message: 'password must be at least 8 characters and contain a lowercase letter, an uppercase letter, a number and a symbol'
    }
  },
  firstname: {
    type: String,
    required: [true, 'firstname is required'],
    trim: true,
    maxlength: [50, 'firstname must be at most 50 characters'],
    validate: {
      validator: (value) => validator.isAlpha(value, 'fr-FR', { ignore: ' -' }),
      message: 'firstname can only contain letters, spaces and "-"'
    }
  },
  lastname: {
    type: String,
    required: [true, 'lastname is required'],
    trim: true,
    maxlength: [50, 'lastname must be at most 50 characters'],
    validate: {
      validator: (value) => validator.isAlpha(value, 'fr-FR', { ignore: ' -' }),
      message: 'lastname can only contain letters, spaces and "-"'
    }
  },
  avatar: {
    type: String,
    trim: true,
    validate: {
      validator: (value) => validator.isURL(value, { protocols: ['http', 'https'], require_protocol: true }),
      message: 'avatar must be a valid http(s) URL'
    }
  },
  birthdate: {
    type: Date
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'users',
  minimize: false,
  versionKey: false,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
      return ret;
    }
  }
});

Schema.pre('save', async function hashPassword() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

Schema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

export default Schema;
