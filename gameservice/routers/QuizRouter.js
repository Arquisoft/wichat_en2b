const express = require('express');
const router = express.Router();
const QuizModel = require('../quizz-model');
const saveQuestionsToDB = require('./help/util');

const wikiDataUri = "https://query.wikidata.org/sparql?format=json&query=";

router.get('/quiz', async (req, res) => {
    try {
        const quizzes = await QuizModel.find();
        res.status(200).send(quizzes);
    } catch (error) {
        res.status(500).send(error);
    }
});

router.get('/quiz/allTopics', async (req, res) => {
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
    
        const query = req.body.wikidataQuery;
        const code = req.body.wikidataCode;
        try {
            await saveQuestionsToDB(code, query);
            await quiz.save();
            res.status(201).json(quiz);

        } catch(err){
            console.error(err);
            res.status(204).json({ message: 'No items where found with that query, not saving the category.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});



module.exports = router;