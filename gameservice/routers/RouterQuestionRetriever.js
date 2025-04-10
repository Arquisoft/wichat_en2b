const express = require('express');
const Question = require('../question-model');
const router = express.Router();

// Route to get a random question
router.get('/game/:subject/:numQuestions?/:numOptions?', async (req, res) => {
    try {
        const numQuestions = parseInt(req.params.numQuestions, 10) || 3;
        const numOptions = parseInt(req.params.numOptions, 10) || 3;
        const subject = req.params.subject;

        // Query: get random questions from the database to be used in the game
        const gameQuestions = await Question.aggregate([
            { $match: { subject: subject } },
            { $sample: { size: numQuestions } }
        ]);

        if (gameQuestions.length < numQuestions) {
            return res.status(400).json({ error: 'Not enough questions in DB.' });
        }
        
        const formattedQuestions = await Promise.all(gameQuestions.map(async q => {
            // Use the 'ext' field from the database to determine the file extension
            const imageExtension = q.ext || 'jpg';  // Fallback to 'jpg' if 'ext' is not set
            const imageName = `/images/${q._id}.${imageExtension}`;  // Build the full image path dynamically
        
            // Obtain random fake answers from the database excluding the correct answer
            const fakeAnswersDocs = await Question.aggregate([
                { $match: { subject: subject, answer: { $ne: q.answer } } },
                { $sample: { size: numOptions - 1 } }
            ]);
        
            if (fakeAnswersDocs.length < numOptions - 1) {
                throw new Error('Not enough questions to generate responses.');
            }
        
            const fakeAnswers = fakeAnswersDocs.toSorted(() => 0.5 - Math.random()).slice(0, numOptions - 1).map(q => q.answer);
        
            // Shuffle the correct answer with the fake answers
            const answers = [q.answer, ...fakeAnswers].sort(() => 0.5 - Math.random());
        
            return {
                image_name: imageName,  // Dynamically set the image name based on the extension
                answers,
                right_answer: q.answer
            };
        }));
        

        res.status(200).json(formattedQuestions);

    } catch (error) {
        console.error('Error retrieving questions:', error);
        res.status(500).json({ error: 'Error retrieving questions' });
    }
});

module.exports = router;