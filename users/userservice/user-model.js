import mongoose from 'mongoose';

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
    profilePicture: {
      type: String,
      default: "",
      required: false,
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
      validate: [noWhitespaceValidator],
    },
});

const User = mongoose.model('User', userSchema);

export default User;