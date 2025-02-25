const express = require('express');
const Question = require('../question-model');
const router = express.Router();

// Route to get a random question
router.get('/game/:numQuestions?/:numOptions?', async (req, res) => {
    try {
        const numQuestions = parseInt(req.params.numQuestions, 10) || 3;
        const numOptions = parseInt(req.params.numOptions, 10) || 3;

        // Retrieve random questions from the database limited by the number of questions requested
        const questionsFromDb = await Question.aggregate([{ $sample: { size: numQuestions } }]);
        if (questionsFromDb.length < 3) {
            return res.status(400).json({ error: 'No hay suficientes preguntas en la base de datos' });
        }

        const selectedQuestions = questionsFromDb.sort(() => 0.5 - Math.random()).slice(0, numQuestions);
        
        const formattedQuestions = selectedQuestions.map(q => {
            // Obtain random fake answers
            let fakeAnswers = questionsFromDb
                .filter(item => item.answer !== q.answer)
                .map(item => item.answer);

            // Select random incorrect answers and mix them with the correct answer
            fakeAnswers = fakeAnswers.sort(() => 0.5 - Math.random()).slice(0, numOptions - 1);
            const answers = [q.answer, ...fakeAnswers].sort(() => 0.5 - Math.random());

            return {
                image_name: `/images/${q._id}.jpg`,
                answers,
                right_answer: q.answer
            };
        });

        res.status(200).json(formattedQuestions);

    } catch (error) {
        console.error('Error retrieving questions:', error);
        res.status(500).json({ error: 'Error retrieving questions' });
    }
});

module.exports = router;