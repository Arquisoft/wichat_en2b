const express = require('express');
const router = express.Router();
const Question = require('../question-model');
const fs = require('fs');
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

        const query = req.body.wikidataQuery;
        const code = req.body.wikidataCode;
        try {

            // Fetch data from Wikidata
            const url = wikiDataUri + encodeURIComponent(query);
            const response = await fetch(url, {
                headers: {
                  'User-Agent': 'wichat_en2b/1.0'
                }
            });
            
            // Parse JSON response
            const data = await response.json();
    
            // Filter out items with missing data
            const items = data.results.bindings.filter(item => {
                const itemId = item.item.value.split('/').pop();
                return item.itemLabel.value != null && item.image.value != null 
                && !/^Q\d+$/.test(item.itemLabel.value) && itemId != item.itemLabel.value;
            }).map(item => ({
                    name: item.itemLabel.value,
                    image: item.image.value
                }));
            // Check if items are empty (invalid type or no results)
            if (items.length === 0) {
                throw new Error('No valid items found for the given type');
            }
    
            // Save items to database and images to disk
            await saveQuestionsToDB(items, code);
        } catch(err){
            console.error(err);
        }
        res.status(201).json(quiz);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});



module.exports = router;