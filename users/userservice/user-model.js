const mongoose = require('mongoose');

const noWhitespaceValidator = {
  validator: function(value) {
    return !/\s/.test(value);
  },
  message: props => `${props.path} cannot contain whitespace`
};

const userSchema = new mongoose.Schema({
    username: {
      type: String,
      required: true,
      unique: true,
      validate: [noWhitespaceValidator],
    },
    password: {
      type: String,
      required: true,
      validate: [noWhitespaceValidator],
    },
    role: {
      type: String,
      required: true,
      enum: ['USER', 'ADMIN'],
      validate: [noWhitespaceValidator],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    secret: {
      type: String,
      required: false,
      unique: true,
      validate: [noWhitespaceValidator],
    },
});

const User = mongoose.model('User', userSchema);

module.exports = User;