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
                question_id: q._id,
                image_name: `/images/${q._id}.${q.ext}`,
                answers
            };
        }));
        

        res.status(200).json(formattedQuestions);

    } catch (error) {
        console.error('Error retrieving questions:', error);
        res.status(500).json({ error: 'Error retrieving questions' });
    }
});

router.post('/question/validate', async (req, res) => {
    try {
        const { question_id, selected_answer } = req.body;

        const question = await Question.findOne({ _id: question_id }).exec();
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const isCorrect = question.answer === selected_answer;
        res.json({
            isCorrect,
            correctAnswer: question.answer
        });

    } catch (error) {
        console.error('Error validating answer:', error);
        res.status(500).json({ error: 'Error validating answer' });
    }
});

router.get('/question/internal/:id', async (req, res) => {
    try {
        console.log("Retrieving question data for LLM...");
        const question = await Question.findOne({ _id: req.params.id }).exec();
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        res.json({
            right_answer: question.answer
        });
    } catch (error) {
        console.error('Error retrieving question data:', error);
        res.status(500).json({ error: 'Error retrieving question data' });
    }
});

router.get('/question/amount/:code', async (req, res) => {
    const code = req.params.code;
    try{
        console.log("Retrieving amount of questions...");
        const amount = await Question.countDocuments({ subject: code });
        res.status(200).json(amount);
    } catch (error) {
        console.error('Error retrieving the amount of questions:', error);
        res.status(500).json({ error: 'Error retrieving question amount' });
    }
});

module.exports = router;