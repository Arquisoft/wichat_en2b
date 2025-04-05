const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        trim: true
    },
    quizName: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    wikidataQuery: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    question: {
        type: String,
        required: true,
        trim: true
    },
    difficulty: {
        type: Number,
        required: true,
        min: 1,  // Ensuring a minimum difficulty level
        max: 5   // Assuming 1-5 difficulty scale
    },
    numQuestions: {
        type: Number,
        required: true,
        min: 1   // At least one question per quiz
    },
    timePerQuestion: {
        type: Number,
        required: true,
        min: 5   // Ensuring at least 5 seconds per question
    },
    numOptions: {
        type: Number,
        required: true,
        min: 2,  // At least 2 answer choices
        max: 10  // Assuming a reasonable limit
    },
    color: {
        type: String,
        match: /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
        required: true
    }
});

// Handling duplicate key errors (E11000 duplicate key error)
questionSchema.post('save', function (error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('Quiz name must be unique. A quiz with this name already exists.'));
    } else {
        next(error);
    }
});

const QuizCategories = mongoose.model('QuizCategories', questionSchema);

module.exports = QuizCategories;
