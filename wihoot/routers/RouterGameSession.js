const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();


// Memory map storage for game sessions codes
const gameSessions = {};

// Create a new game session with its code (This is available for logged users only)
router.post("/game/create", (req, res) => {
    const { subject, totalQuestions, numberOptions, adminName } = req.body;

    //TODO: call verifyToken ENDPOINT to check if the user is logged in

    if (!subject || !totalQuestions || !numberOptions || !adminName) {
        return res.status(400).json({ error: "Missing required game parameters." });
    }

    const userId = req.user.id; // del token JWT
    const gameCode = uuidv4().slice(0, 6).toUpperCase();

    gameSessions[gameCode] = {
        admin: {
            name: adminName,
            isGuest: false,
            userId,
        },
        subject,
        totalQuestions,
        numberOptions,
        questions: [],
        players: {},
        currentQuestionIndex: 0,
        gameStarted: false,
        phase: "waiting", // waiting | question | leaderboard | finished
    };

    res.json({ gameCode });
});

// Join to a game session using a code
router.post("/game/:code/join", (req, res) => {
    const joinData = { gameCode, playerName, isGuest }
    joinData.playerName = req.body.playerName;
    joinData.isGuest = req.body.isGuest;
    joinData.gameCode = req.params.code;

    //TODO: validate fields assigned in a external function

    if (!gameSessions[joinData.gameCode]) {
        return res.status(404).json({ error: "The session was not found." });
    } else {
        //TODO: store the player session data (name, isGuest, _id if registered, socketId, ...)
        res.status(200).json({ success: true, message: `You have joined to the session: ${joinData.gameCode}.`});
    }
});



// Export game sessions for Socket.IO
router.get("/internal/game-sessions", (req, res) => {
    res.json(gameSessions);
});

module.exports = router;
