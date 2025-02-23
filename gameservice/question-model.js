const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    subject: String,
    image_path: String,
    answer: String,
});

const Question = mongoose.model('Question', questionSchema);