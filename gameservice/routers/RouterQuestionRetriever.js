const express = require('express');
const Question = require('../question-model');
const router = express.Router();

// Route to get a random question
router.get('/game/:numQuestions?/:numOptions?', async (req, res) => {
    try {
        const numQuestions = parseInt(req.params.numQuestions, 10) || 3;
        const numOptions = parseInt(req.params.numOptions, 10) || 3;

        // Query: get random questions from the database to be used in the game
        const gameQuestions = await Question.aggregate([
            { $match: { answer: { $not: { $regex: /^Q\d+$/ } } } },
            { $sample: { size: numQuestions } }
        ]);

        if (gameQuestions.length < numQuestions) {
            return res.status(400).json({ error: 'Not enough questions in DB.' });
        }
        
        const formattedQuestions = await Promise.all(gameQuestions.map(async q => {
            // Obtain random fake answers from the database excluding the correct answer
            const fakeAnswersDocs = await Question.aggregate([
                { $match: { answer: { $ne: q.answer } } },
                { $sample: { size: numOptions - 1 } }
            ]);

            if (fakeAnswersDocs.length < numOptions - 1) {
                throw new Error('Not enough questions to generate responses.');
            }

            // Create a pool of fake answers and select a random subset of them to be used as options
            const fakeAnswers  = fakeAnswersDocs.sort(() => 0.5 - Math.random()).slice(0, numOptions - 1);

            // Shuffle the correct answer with the fake answers
            const answers = [q.answer, ...fakeAnswers].sort(() => 0.5 - Math.random());

            return {
                image_name: `/images/${q._id}.jpg`,
                answers,
                right_answer: q
            };
        }));

        res.status(200).json(formattedQuestions);

    } catch (error) {
        console.error('Error retrieving questions:', error);
        res.status(500).json({ error: 'Error retrieving questions' });
    }
});

module.exports = router;