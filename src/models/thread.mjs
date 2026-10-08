import mongoose from 'mongoose';

const Schema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'threads',
  minimize: false,
  versionKey: false
});

Schema.pre('validate', function checkTarget() {
  if (Boolean(this.group) === Boolean(this.event)) {
    this.invalidate('group', 'a thread must be linked to a group or an event, but not both');
  }
});

export default Schema;
