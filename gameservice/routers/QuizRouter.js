const express = require('express');
const router = express.Router();
const QuizModel = require('../quizz-model');

router.get('/quiz/AllTopics', async (req, res) => {
    try {
        const quizzes = await QuizModel.distinct("category");
        res.status(200).send(quizzes);
    } catch (error) {
        res.status(500).send(error);
    }
});
router.get('/quiz/:topic', async (req, res) => {
    try {
        const quizzes = await QuizModel.find({ category: req.params.topic.toString() });
        res.status(200).send(quizzes);
    } catch (error) {
        res.status(500).send(error);
    }
});

router.post('/quiz', async (req, res) => {
    try {
        const quiz = new QuizModel(req.body);

        // Validate asynchronously
        await quiz.validate();

        await quiz.save();
        res.status(201).json(quiz);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
module.exports = router;