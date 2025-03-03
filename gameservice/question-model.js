const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    subject: String,
    answer: String,
});

const Question = mongoose.model('Question', questionSchema);

module.exports = Question