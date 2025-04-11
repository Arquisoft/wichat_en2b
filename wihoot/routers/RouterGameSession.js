const express = require("express");
const {v4: uuidv4} = require("uuid");
const router = express.Router();
const verifyToken = require('../../gameservice/routers/middleware/auth')
const {Session, Player} = require('../models/session-model');

async function requestQuestions(subject, totalQuestions, numberOptions) {
    try {
        const gatewayServiceUrl = process.env.GATEWAY_SERVICE_URL || 'http://gatewayservice:8000';
        const response = await fetch(`${gatewayServiceUrl}/game/${subject}/${totalQuestions}/${numberOptions}`);
        if (!response.ok) {
            throw new Error('Failed to retrieve questions');
        }
        return await response.json();
    } catch(error) {
        console.log('Error requesting the questions:', error.message);
        return new Error('Error requesting the questions');
    }
}

// Create a new game session with its code (This is available for logged users only)
router.post("/wihoot/create", verifyToken, (req, res) => {
    const {subject, totalQuestions, numberOptions} = req.body;

    if (!subject || !totalQuestions || !numberOptions) {
        return res.status(400).json({error: "Missing required game parameters."});
    }

    const userId = req.user.id; // del token JWT
    const gameCode = uuidv4().slice(0, 6).toUpperCase();

    let questionsRequested;
    try {
        questionsRequested = requestQuestions(subject, totalQuestions, numberOptions);
    } catch (errror) {
        return res.status(500).json({error: "Error requesting the questions."});
    }

    const session = new Session({
        gameCode: gameCode,
        hostId: userId,
        questions: questionsRequested,
    })

    session.save()

    res.json({gameCode});
});

// Join to a game session using a code
router.post("/wihoot/:code/join", async (req, res) => {
    const joinData = {gameCode, playerName, isGuest}
    joinData.playerName = req.body.playerName;
    joinData.isGuest = req.body.isGuest;
    joinData.gameCode = req.params.code;

    //TODO: validate fields assigned in a external function

    try {
        const session = await Session.findOne( {gameCode: joinData.gameCode});

        if (!session) {
            return res.status(404).json({error: "The session was not found."});
        } else {
            if (session.hostId !== req.user.id) {
                const newPlayer = new Player({
                    id: uuidv4(),
                    name: joinData.playerName,
                    score: 0,
                    isGuest: joinData.isGuest
                });

                session.save();
                session.players.push(newPlayer);

                res.status(200).json({success: true, message: `You have joined to the session: ${joinData.gameCode}.`});
            } else {
                res.status(403).json({error: "You cannot join your own session."});
            }
        }
    } catch (error) {
        console.error("Error fetching session:", error)
        res.status(500).json({ error: error.message })
    }
});


// Export game sessions for Socket.IO
router.get("/wihoot/game-sessions", verifyToken, (req, res) => {
    res.json(gameSessions);
});

module.exports = router;
