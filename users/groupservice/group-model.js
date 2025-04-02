const mongoose = require('mongoose');

const userGroupSchema = new mongoose.Schema({
    groupName: {
		type: String,
		required: true,
		unique: true,
    },
    owner: {
		type: String,
		required: true,
		unique: true,
   },
   createdAt: {
		type: Date,
		default: Date.now,
		immutable: true,
   }, 
});

const UserGroup = mongoose.model('UserGroup', userGroupSchema);

module.exports = UserGroup;