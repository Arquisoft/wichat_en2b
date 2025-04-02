const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    category: String,
    quizName: String,
    wikidataQuery: String,
    numQuestions: Number,
    timePerQuestion: Number,
    numOptions: Number,
    color: {
        type: String,
        match: /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, // Validates 3 or 6 character hex codes
    },
});

const QuizCategories = mongoose.model('QuizCategories', questionSchema);

module.exports = QuizCategories