const express = require('express')
const GameInfo = require('../game-result-model')
// Middleware to verify JWT token
const verifyToken = require('./middleware/auth');
const router = express.Router()

function validateGameInfo(body) {
    if (body.subject === null || typeof(body.subject) === 'undefined') {
        throw Error("Subject not sent in the body of the message");
    }
    if (body.points_gain === null || typeof(body.points_gain) === 'undefined') {
        throw Error("Points gain not sent in the body of the message");
    }
    if (body.number_of_questions === null || typeof(body.number_of_questions) === 'undefined') {
        throw Error("Number of questions not sent in the body of the message");
    }
    if (body.number_correct_answers === null || typeof(body.number_correct_answers) === 'undefined') {
        throw Error("Number of correct answers not sent in the body of the message");
    }
    if (body.total_time === null || typeof(body.total_time) === 'undefined') {
        throw Error("Total time not sent in the body of the message");
    }
}

router.post('/game', verifyToken, async (req, res) => {
    try {
        validateGameInfo(req.body);

        const gameInfo = new GameInfo({
            user_id: req.user.username,
            subject: req.body.subject,
            points_gain: req.body.points_gain,
            number_of_questions: req.body.number_of_questions,
            number_correct_answers: req.body.number_correct_answers,
            total_time: req.body.total_time
        });

        const savedGame = await gameInfo.save();
        res.status(201).json(savedGame);
    } catch (error) {
        console.error("Error when saving the game data:", error);
        res.status(500).json({ error: 'Error saving game data' });
    }
});

// Update game info history of user by username
router.patch('/game/update/:oldUsername', async (req, res) => {
    try {
        const { oldUsername } = req.params;
        const { newUsername } = req.body;    

        const gameInfo = await GameInfo.updateMany(
            { user_id: oldUsername }, 
            { $set: { user_id: newUsername } });

        if (gameInfo.matchedCount === 0) {
            return res.status(200).json({ 
                gameInfo: gameInfo,
                message: "No game history found for the user" 
            });
        }

        res.status(200).json({ 
            gameInfo: gameInfo,
            message: "Game history updated successfully" 
        });
        
    } catch (error) {
        console.error("Error when updating the game data:", error);
        res.status(500).json({ error: 'Error updating game data' });
    }
});

module.exports = router