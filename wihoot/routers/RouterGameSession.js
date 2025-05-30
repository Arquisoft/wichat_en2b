const express = require("express")
const router = express.Router()
const SharedQuizSession = require("../models/session-model")
const socketHandlerObject = require("../socket/socketHandler")

// Create a new shared quiz session
router.post("/create", async (req, res) => {
    try {
        const { quizData, quizMetaData, hostId, hostUsername } = req.body

        if (!quizData || !hostId || !hostUsername) {
            return res.status(400).json({ error: "Missing required fields" })
        }

        // Generate a unique code
        let code
        let isUnique = false

        while (!isUnique) {
            code = SharedQuizSession.generateCode()
            const existingSession = await SharedQuizSession.findOne({ code })
            if (!existingSession) {
                isUnique = true
            }
        }

        const session = new SharedQuizSession({
            code,
            quizData,
            quizMetaData,
            hostId,
            players: [], // Host doesn't play
        })

        await session.save()

        res.status(201).json({
            success: true,
            code,
            sessionId: session._id,
        })
    } catch (error) {
        console.error("Error creating shared quiz session:", error)
        res.status(500).json({ error: "Failed to create shared quiz session" })
    }
})

router.get('/internal/quizdata/:code', async (req, res) => {
    try {
        const session = await SharedQuizSession.findOne({ code: req.params.code });
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        } else {
            const quiz = {
                quizData: session.quizData,
                quizMetaData: session.quizMetaData
            };
            res.status(200).json(quiz);
        }
    } catch (error){ // NOSONAR
        res.status(500).json({ error: 'Error retrieving quiz data' });
    }
})

// Join a shared quiz session
router.post("/:code/join", async (req, res) => {
    try {
        const { code } = req.params
        const { playerId, username } = req.body

        if (!playerId || !username) {
            return res.status(400).json({ error: "Missing required fields" })
        }

        const session = await SharedQuizSession.findOne({ code })

        if (!session) {
            return res.status(404).json({ error: "Session not found" })
        }

        if (session.players.some((player) => player.id === playerId)) {
            return res.status(400).json({ error: "Player already exists in this session" })
        }

        if (session.status !== "waiting") {
            return res.status(400).json({ error: "Session has already started" })
        }

        try {
            const player = {
                id: playerId,
                username,
                score: 0,
                answers: [],
            }

            session.addPlayer(player)
            await session.save()

            // Notify all clients about the new player, if io is initialized
            if (socketHandlerObject.io) {
                socketHandlerObject.io.to(code).emit("player-joined", {
                    playerId: playerId,
                    username: username,
                })
            } else {
                console.warn("Socket.IO instance not initialized; skipping player-joined emit")
            }

            res.status(200).json({
                success: true,
                sessionId: session._id,
                players: session.players,
            })
        } catch (error) {
            return res.status(400).json({ error: error.message })
        }
    } catch (error) {
        console.error("Error joining shared quiz session:", error)
        res.status(500).json({ error: "Failed to join shared quiz session" })
    }
})

// Start a shared quiz session (host only)
router.get("/:code/start", async (req, res) => {
    try {
        let code = req.params.code
        let hostId  = req.query.hostId

        if (!hostId) {
            return res.status(400).json({ error: "Missing host ID" })
        }

        const session = await SharedQuizSession.findOne({ code })

        if (!session) {
            return res.status(404).json({ error: "Session not found" })
        }

        if (session.hostId !== hostId) {
            return res.status(403).json({ error: "Only the host can start the session" })
        }

        try {
            session.waitingForNext = false;
            session.start()
            await session.save()
            
            // Notify all clients that the session has started
            socketHandlerObject.io.to(code).emit("session-started", {
                currentQuestionIndex: session.currentQuestionIndex,
            })
            
            res.status(200).json({
                success: true,
                status: session.status,
                currentQuestionIndex: session.currentQuestionIndex,
            })
        } catch (error) {
            return res.status(400).json({ error: error.message })
        }
    } catch (error) {
        console.error("Error starting shared quiz session:", error)
        res.status(500).json({ error: "Failed to start shared quiz session" })
    }
})

// Move to the next question (host only)
router.get("/:code/next", async (req, res) => {
    try {
        const { code } = req.params
        const { hostId } = req.query

        if (!hostId) {
            return res.status(400).json({ error: "Missing host ID" })
        }

        const session = await SharedQuizSession.findOne({ code })

        if (!session) {
            return res.status(404).json({ error: "Session not found" })
        }

        if (session.hostId !== hostId) {
            return res.status(403).json({ error: "Only the host can navigate questions" })
        }

        try {
            session.waitingForNext = false;
            //Set the answer of the users that did not answer before /next to incorrect
            await session.checkForNoAnswer()

            const nextQuestionIndex = session.nextQuestion()
            await session.save()

            // Notify all clients about the question change
            socketHandlerObject.io.to(code).emit("question-changed", {
                currentQuestionIndex: nextQuestionIndex,
            })

            res.status(200).json({
                success: true,
                currentQuestionIndex: nextQuestionIndex,
            })
        } catch (error) {
            return res.status(400).json({ error: error.message })
        }
    } catch (error) {
        console.error("Error navigating to next question:", error)
        res.status(500).json({ error: "Failed to navigate to next question" })
    }
})

// Submit an answer for a question
router.post("/:code/answer", async (req, res) => {
    try {
        const { code } = req.params
        const { playerId, questionId, answerId, isCorrect, timeToAnswer, rightAnswer, answer } = req.body

        if (!playerId || !questionId || answerId === undefined || isCorrect === undefined || timeToAnswer === undefined) {
            return res.status(400).json({ error: "Missing required fields" })
        }

        const session = await SharedQuizSession.findOne({ code })

        if (!session) {
            return res.status(404).json({ error: "Session not found" })
        }

        if (session.status !== "active") {
            return res.status(400).json({ error: "Session is not active" })
        }

        // Find the player
        const playerIndex = session.players.findIndex((p) => p.id === playerId)

        if (playerIndex === -1) {
            return res.status(404).json({ error: "Player not found in this session" })
        }

        let numAnswers = session.quizData[0].answers
        const numberOptions = numAnswers.length
        const timerDuration = session.quizMetaData[0].timePerQuestion
        const timeLeft = timerDuration - timeToAnswer

        // Add the answer
        const scoreIncrement = isCorrect ? Math.ceil(10 * (80 * numberOptions / timerDuration) * (timeLeft / timerDuration)) : 0

        session.players[playerIndex].answers.push({
            questionId,
            answerId,
            isCorrect: !!isCorrect,
            timeToAnswer,
            rightAnswer: rightAnswer,
            answer: answer
        })

        session.players[playerIndex].score += scoreIncrement
        session.players[playerIndex].total_time += timeToAnswer

        await session.save()

        // Notify all clients about the answer
        socketHandlerObject.io.to(code).emit("answer-submitted", {
            playerId,
            score: session.players[playerIndex].score,
            isCorrect: !!isCorrect,
        })

        res.status(200).json({
            success: true,
            score: session.players[playerIndex].score,
        })
    } catch (error) {
        console.error("Error submitting answer:", error)
        res.status(500).json({ error: "Failed to submit answer" })
    }
})

// Get session status and players
router.get("/:code/status", async (req, res) => {
    try {
        const { code } = req.params
        const { playerId } = req.query // Get playerId from query parameters

        const session = await SharedQuizSession.findOne({ code })
        if (!session) {
            return res.status(404).json({ error: "Session not found" })
        }
        
        // If playerId is provided, verify it belongs to this session
        if (playerId && !session.players.some(player => player.id === playerId)) {
            return res.status(403).json({ error: "Player not authorized for this session" })
        }

        res.status(200).json({
            status: session.status,
            currentQuestionIndex: session.currentQuestionIndex,
            waitingForNext: session.waitingForNext,
            players: session.players.map((p) => ({
                id: p.id,
                username: p.username,
                score: p.score,
                answers: p.answers
            })),
        })
    } catch (error) {
        console.error("Error getting session status:", error)
        res.status(500).json({ error: "Failed to get session status" })
    }
})

// End the session (host only)
router.get("/:code/end", async (req, res) => {
    try {
        const { code } = req.params
        const { hostId } = req.query

        if (!hostId) {
            return res.status(400).json({ error: "Missing host ID" })
        }

        const session = await SharedQuizSession.findOne({ code })
        if (!session) {
            return res.status(404).json({ error: "Session not found" })
        }
        if (session.hostId !== hostId) {
            return res.status(403).json({ error: "Only the host can end the session" })
        }

        try {
            //Set the answer of the users that did not answer before /next to incorrect
            await session.checkForNoAnswer()
            session.finish()
            await session.save()

            // Notify all clients that the session has ended
            socketHandlerObject.io.to(code).emit("session-ended", {
                players: session.players.map((p) => ({
                    id: p.id,
                    username: p.username,
                    score: p.score,
                    answers: p.answers
                })),
            })

            res.status(200).json({
                success: true,
                status: session.status,
                players: session.players.map((p) => ({
                    id: p.id,
                    username: p.username,
                    score: p.score,
                    answers: p.answers,
                    total_time: p.total_time
                })),
            })
        } catch (error) {
            return res.status(400).json({ error: error.message })
        }
    } catch (error) {
        console.error("Error ending shared quiz session:", error)
        res.status(500).json({ error: "Failed to end shared quiz session" })
    }
})

// Remove a player from the session
router.delete("/:code/player/:playerId", async (req, res) => {
    try {
        const { code, playerId } = req.params;

        const session = await SharedQuizSession.findOne({ code });
        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }

        // Remove the player from the session
        session.players = session.players.filter(p => p.id !== playerId);
        await session.save();

        // Notify all clients about the player removal
        socketHandlerObject.io.to(code).emit("player-left", {
            playerId,
            removed: true
        });

        res.status(200).json({
            success: true,
            players: session.players
        });
    } catch (error) {
        console.error("Error removing player from session:", error);
        res.status(500).json({ error: "Failed to remove player from session" });
    }
});

module.exports = router