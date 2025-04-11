const jwt = require('jsonwebtoken');
const {Session, Player} = require("../models/session-model");

// Memory map storage for game sessions codes
const gameSessions = new Map();

module.exports = (io) => {
    // Middleware to authenticate socket connections for hosts
    io.use((socket, next) => {
        const token = socket.handshake.auth.token

        // If no token, allow connection (for players)
        if (!token) {
            return next()
        }

        try {
            // Verify token for hosts
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'testing-secret');
            socket.user = decoded
            next()
        } catch (error) {
            next(new Error("Authentication error"))
        }
    })
    io.on("connection", (socket) => {
        console.log(`🟢 User connected: ${socket.id}`);

        // HOST EVENTS

        // Host joins a specific game room to control de game questions
        socket.on("host-join-game", async (gameCode) => {
            try {
                // Check if user is authenticated
                if (!socket.user) {
                    socket.emit("error", "Authentication required")
                    return
                }

                // Get session from database
                const session = await Session.findOne({ gameCode: gameCode })

                if (!session) {
                    socket.emit("error", "Game not found")
                    return
                }

                // Check if user is the host
                if (session.hostId !== socket.user.id) {
                    socket.emit("error", "Unauthorized")
                    return
                }

                // Join the host to the game room
                socket.join(gameCode)
                socket.gameCode = gameCode
                socket.isHost = true

                console.log(`Host joined game room: ${gameCode}`)

                // Send current players to the host
                socket.emit("update-players", session.players)
            } catch (error) {
                console.error("Error in host-join-game:", error)
                socket.emit("error", "Failed to join game room")
            }
        })

        // Start game
        socket.on("start-game", async (gameCode) => {
            try {
                // Check if user is authenticated
                if (!socket.user) {
                    socket.emit("error", "Authentication required")
                    return
                }

                // Get session from database
                const session = await Session.findOne({ gameCode })

                if (!session) {
                    socket.emit("error", "Game not found")
                    return
                }

                // Check if user is the host
                if (session.hostId !== socket.user.id) {
                    socket.emit("error", "Unauthorized")
                    return
                }

                // Check if game has already started
                if (session.started) {
                    socket.emit("error", "Game has already started")
                    return
                }

                // Check if there are any players
                if (session.players.length === 0) {
                    socket.emit("error", "Cannot start game with no players")
                    return
                }

                // Start the game
                session.started = true
                session.startedAt = new Date()
                await session.save()

                // Store game data in memory for faster access
                gameSessions.set(gameCode, {
                    session: session,
                    currentQuestionIndex: -1,
                    timer: null,
                })

                // Notify all players
                io.to(gameCode).emit("game-started")

                // Automatically move to the first question
                setTimeout(() => {
                    const game = gameSessions.get(gameCode)
                    if (game) {
                        moveToNextQuestion(gameCode, io)
                    }
                }, 2000)

                console.log(`Game ${gameCode} started`)
            } catch (error) {
                console.error("Error starting game:", error)
                socket.emit("error", "Failed to start game")
            }
        })

        // Next question
        socket.on("next-question", async (gameCode) => {
            try {
                // Check if user is authenticated
                if (!socket.user) {
                    socket.emit("error", "Authentication required")
                    return
                }

                // Get game from memory
                const game = gameSessions.get(gameCode)

                if (!game) {
                    socket.emit("error", "Game not found")
                    return
                }

                // Check if user is the host
                if (game.session.hostId !== socket.user.id) {
                    socket.emit("error", "Unauthorized")
                    return
                }

                // Move to next question
                moveToNextQuestion(gameCode, io)
            } catch (error) {
                console.error("Error moving to next question:", error)
                socket.emit("error", "Failed to move to next question")
            }
        })

        // Skip timer
        socket.on("skip-timer", async (gameCode) => {
            try {
                // Check if user is authenticated
                if (!socket.user) {
                    socket.emit("error", "Authentication required")
                    return
                }

                // Get game from memory
                const game = gameSessions.get(gameCode)

                if (!game) {
                    socket.emit("error", "Game not found")
                    return
                }

                // Check if user is the host
                if (game.session.hostId !== socket.user.id) {
                    socket.emit("error", "Unauthorized")
                    return
                }

                // End the current question immediately
                endQuestion(gameCode, io)
            } catch (error) {
                console.error("Error skipping timer:", error)
                socket.emit("error", "Failed to skip timer")
            }
        })

        // End game
        socket.on("end-game", async (gameCode) => {
            try {
                // Check if user is authenticated
                if (!socket.user) {
                    socket.emit("error", "Authentication required")
                    return
                }

                // Get game from memory
                const game = gameSessions.get(gameCode)

                if (!game) {
                    socket.emit("error", "Game not found")
                    return
                }

                // Check if user is the host
                if (game.session.hostId !== socket.user.id) {
                    socket.emit("error", "Unauthorized")
                    return
                }

                // End the game
                endGame(gameCode, io)
            } catch (error) {
                console.error("Error ending game:", error)
                socket.emit("error", "Failed to end game")
            }
        })

        // PLAYER EVENTS

        // Join game
        socket.on("join-game", async (gameCode, playerName, callback) => {
            try {
                // Validate inputs
                if (!gameCode || !playerName) {
                    if (callback) callback({ success: false, message: "Game code and player name are required" })
                    return
                }

                // Get session from database
                const session = await Session.findOne({ gameCode })

                if (!session) {
                    if (callback) callback({ success: false, message: "Game not found" })
                    return
                }

                // Check if game has already started
                if (session.started) {
                    if (callback) callback({ success: false, message: "Game has already started" })
                    return
                }

                // Check if player name is already taken
                if (session.players.some((p) => p.name === playerName)) {
                    if (callback) callback({ success: false, message: "Player name already taken" })
                    return
                }

                // Add player to session
                const playerId = socket.id
                const player = new Player({
                    id: playerId,
                    name: playerName,
                    score: 0,
                });

                session.players.push(player)
                await session.save()

                // Join the socket room for this game
                socket.join(gameCode)

                // Store game code and player name in socket for disconnection handling
                socket.gameCode = gameCode
                socket.playerName = playerName
                socket.isPlayer = true

                // Notify all clients in the room (including the host) about new player
                io.to(gameCode).emit("player-joined", player)

                // Send updated player list to everyone
                io.to(gameCode).emit("update-players", session.players)

                if (callback) callback({ success: true })

                console.log(`Player ${playerName} joined game ${gameCode}`)
            } catch (error) {
                console.error("Error joining game:", error)
                if (callback) callback({ success: false, message: "Failed to join game" })
            }
        })

        // Submit answer
        socket.on("submit-answer", async (gameCode, answerIndex, callback) => {
            try {
                // Get game from memory
                const game = gameSessions.get(gameCode)

                if (!game || !game.session.started || game.currentQuestionIndex < 0) {
                    if (callback) callback({ success: false, message: "Game not active" })
                    return
                }

                const playerId = socket.id
                const playerName = socket.playerName

                // Find player in session
                const player = game.session.players.find((p) => p.name === playerName)

                if (!player) {
                    if (callback) callback({ success: false, message: "Player not found" })
                    return
                }

                // Record answer with timestamp
                const answerTime = Date.now()


                if (!game.answers[playerId]){
                    game.answers[playerId] = new Map()
                }
                // Access the dictionary of answers for the player and to the current question
                let playerAnswers = game.answers[playerId][game.currentQuestionIndex];
                if (playerAnswers){
                    playerAnswers.answerIndex = answerIndex
                    playerAnswers.time = answerTime
                } else {
                    game.answers[playerId].set(game.currentQuestionIndex, {
                        answerIndex,
                        time: answerTime,
                    })
                }

                // Notify the player that their answer was received
                socket.emit("answer-submitted", { answerIndex })

                if (callback) callback({ success: true })

                console.log(`Player ${playerName} submitted answer for game ${gameCode}`)

                // Check if all players have answered
                if (game.answers.size === game.session.players.length) {
                    // End question early if everyone has answered
                    endQuestion(gameCode, io)
                }
            } catch (error) {
                console.error("Error submitting answer:", error)
                if (callback) callback({ success: false, message: "Failed to submit answer" })
            }
        })

        // Handle disconnections
        socket.on("disconnect", async () => {
            const gameCode = socket.gameCode

            if (gameCode && socket.isPlayer) {
                try {
                    // Get session from database
                    const session = await Session.findOne({ gameCode })

                    if (session && !session.started) {
                        // Remove player from session
                        const playerIndex = session.players.findIndex((p) => p.name === socket.playerName)

                        if (playerIndex !== -1) {
                            const player = session.players[playerIndex]
                            session.players.splice(playerIndex, 1)
                            await session.save()

                            // Notify others that player left
                            io.to(gameCode).emit("player-left", player)

                            // Send updated player list to everyone
                            io.to(gameCode).emit("update-players", session.players)

                            console.log(`🔴 Player ${socket.playerName} disconnected from game ${gameCode}`)
                        }
                    }
                } catch (error) {
                    console.error("Error handling disconnect:", error)
                }
            }

            console.log("🔴 Client disconnected:", socket.id)
        })
    })

    // Helper functions
    function moveToNextQuestion(gameCode, io) {
        const game = gameSessions.get(gameCode)
        if (!game) return

        // Clear any existing timer
        if (game.timer) {
            clearInterval(game.timer)
            game.timer = null
        }

        // Compute the points of the last question for each player

        let lastAnswer;
        try {
            game.answers.forEach((playerId) => {
                 lastAnswer = game.answers[playerId][game.currentQuestionIndex]

            })
        } catch (error) {
            console.error("Error computing points for lastAnswer:",lastAnswer, "Error:", error.message);
            // Handle error (e.g., log it, notify players, etc.)
        }


        // Move to next question
        game.currentQuestionIndex++

        // Check if we've reached the end of questions
        if (game.currentQuestionIndex >= game.quiz.questions.length) {
            // End the game
            endGame(gameCode, io)
            return
        }

        const currentQuestion = game.quiz.questions[game.currentQuestionIndex]
        const timeLimit = currentQuestion.timeLimit || 20 // Default 20 seconds

        // Reset answers for this question
        game.playerAnswers = new Map()

        // Update session in database
        Session.findOneAndUpdate({ gameCode }, { currentQuestionIndex: game.currentQuestionIndex })
            .then(() => {
                console.log(`Updated question index in database for game ${gameCode}`)
            })
            .catch((err) => {
                console.error(`Error updating question index in database for game ${gameCode}:`, err)
            })

        // Send question to players (without correct answer)
        const questionForPlayers = {
            questionIndex: game.currentQuestionIndex,
            text: currentQuestion.text,
            answers: currentQuestion.answers.map((a) => ({ text: a.text })),
            timeLimit,
        }

        // Send question to host (with correct answer marked)
        const questionForHost = {
            questionIndex: game.currentQuestionIndex,
            text: currentQuestion.text,
            answers: currentQuestion.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
            timeLimit,
        }

        // Emit different events to players and host
        io.to(gameCode).emit("question-started", questionForPlayers)

        // Start timer
        startQuestionTimer(gameCode, timeLimit, io)

        console.log(`Game ${gameCode} moved to question ${game.currentQuestionIndex + 1}`)
    }

    async function endGame(gameCode, io) {
        const game = activeGames.get(gameCode)
        if (!game) return

        // Clear any active timers
        if (game.timer) {
            clearInterval(game.timer)
            game.timer = null
        }

        // Calculate final results
        const finalResults = game.session.players.map((player) => {
            // Count correct answers
            let correctAnswers = 0

            if (game.session.questionAnswers) {
                game.session.questionAnswers.forEach((qa) => {
                    const playerAnswer = qa.answers.find((a) => a.playerId === player.id)
                    if (playerAnswer && playerAnswer.isCorrect) {
                        correctAnswers++
                    }
                })
            }

            return {
                playerId: player.id,
                playerName: player.name,
                totalPoints: player.score,
                correctAnswers,
                totalQuestions: game.quiz.questions.length,
            }
        })

        // Sort by score (highest first)
        finalResults.sort((a, b) => b.totalPoints - a.totalPoints)

        // Send final results to all players
        io.to(gameCode).emit("game-ended", finalResults)

        // Mark game as ended in database
        await Session.findOneAndUpdate(
            { gameCode },
            {
                ended: true,
                endedAt: new Date(),
            },
        )

        // Remove active session reference from quiz
        await Quiz.findByIdAndUpdate(game.quiz._id, { activeSession: null })

        // Remove game from memory
        activeGames.delete(gameCode)

        console.log(`Game ${gameCode} ended`)
    }
}