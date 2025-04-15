const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { Session } = require("../models/session-model");
const Question = require('../../gameservice/question-model')
const GameInfo = require("../../gameservice/game-result-model");

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

        // { HOST EVENTS }

        // Host joins a specific game room to control de game questions
        socket.on("host-join-game", async (gameCode) => {
            try {
                // Check if user is authenticated
                if (!socket.user) {
                    socket.emit("error", "Authentication required")
                    return
                }

                // Get session from database
                const session = await Session.findOne({gameCode: gameCode})

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
                const session = await Session.findOne({gameCode})

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
                    timePerQuestion: session.timePerQuestion,
                    questions: session.questions,
                    answers: new Map(),
                    points: new Map(),
                    numberCorrectAnswers: new Map(),
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

        // { PLAYER EVENTS }

        // Join game. Client arrive this point once /wihoot/:code/join is responded
        socket.on("join-game", async (gameCode, playerName, isGuest, callback) => {
            try {

                // Validate inputs
                if (!gameCode || !playerName) {
                    if (callback) callback({success: false, message: "Game code and player name are required"})
                    return
                }

                // Get session from database
                const session = await Session.findOne({gameCode: gameCode})

                if (!session) {
                    if (callback) callback({success: false, message: "Game not found"})
                    return
                }

                // Join the socket room for this game
                socket.join(gameCode)

                let playerId = socket.id
                let player = {
                    id: playerId,
                    name: playerName,
                    isGuest: isGuest
                }

                // Store game code and player name in socket for disconnection handling
                socket.gameCode = gameCode
                socket.playerName = playerName
                socket.isPlayer = true

                session.players.push(player)
                session.save();

                const game = gameSessions.get(gameCode);
                game.players = session.players;

                // Notify all clients in the room (including the host) about new player
                io.to(gameCode).emit("player-joined", player)

                // Send updated player list to everyone
                io.to(gameCode).emit("update-players", session.players)

                if (callback) callback({success: true})

                console.log(`Player ${playerName} joined game ${gameCode}`)
            } catch (error) {
                console.error("Error joining game:", error)
                if (callback) callback({success: false, message: "Failed to join game"})
            }
        })

        // Submit answer
        socket.on("submit-answer", async (gameCode, answerIndex, callback) => {
            try {
                // Get game from memory
                const game = gameSessions.get(gameCode)

                if (!game || !game.session.started || game.currentQuestionIndex < 0) {
                    if (callback) callback({success: false, message: "Game not active"})
                    return
                }

                const playerId = socket.id
                const playerName = socket.playerName

                // Find player in session
                const player = game.session.players.find((p) => p.name === playerName)

                if (!player) {
                    if (callback) callback({success: false, message: "Player not found"})
                    return
                }

                // Record answer with timestamp
                const answerTime = Date.now()


                if (!game.answers[playerId]) {
                    game.answers[playerId] = new Map()
                }
                // Access the dictionary of answers for the player and to the current question
                let playerAnswers = game.answers[playerId][game.currentQuestionIndex];
                if (playerAnswers) {
                    playerAnswers.answerIndex = answerIndex
                    playerAnswers.time = answerTime
                } else {
                    game.answers[playerId]
                        .set(game.currentQuestionIndex,
                            {
                                answerIndex,
                                time: answerTime,
                            });
                }

                // Notify the player that their answer was received
                socket.emit("answer-submitted", {answerIndex})

                if (callback) callback({success: true})

                console.log(`Player ${playerName} submitted answer for game ${gameCode}`)

                // Check if all players have answered
                if (game.answers.size === game.session.players.length) {
                    // End question early if everyone has answered
                    endQuestion(gameCode, io)
                }
            } catch (error) {
                console.error("Error submitting answer:", error)
                if (callback) callback({success: false, message: "Failed to submit answer"})
            }
        })

        // Handle disconnections
        socket.on("disconnect", async () => {
            const gameCode = socket.gameCode

            if (gameCode && socket.isPlayer) {
                try {
                    // Get session from database
                    const session = await Session.findOne({gameCode})

                    if (session && !session.started) {
                        // Remove player from session
                        const playerIndex = session.players.findIndex((p) => p.name === socket.playerName)

                        if (playerIndex !== -1) {
                            const player = session.players[playerIndex]
                            session.players.splice(playerIndex, 1)
                            await session.save()
                            gameSessions[gameCode].players = session.players

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

        if (game.currentQuestionIndex >= 0) {
            // Compute the points of the last question for each player
            let lastAnswer;
            try {
                game.answers.forEach((playerId) => {
                    lastAnswer = game.answers[playerId][game.currentQuestionIndex]
                    const points = computePoints(
                        game.questions[game.currentQuestionIndex].question_id,
                        lastAnswer.answerIndex,
                        lastAnswer.time,
                        game.questions.answers.length,
                        game.timePerQuestion);

                    if (!game.points[playerId]) {
                        game.points.set(playerId, points);
                        if (!game.numberCorrectAnswers[playerId]){
                            game.numberCorrectAnswers.set(playerId, 0);
                        } else {
                            game.numberCorrectAnswers.set(playerId, game.numberCorrectAnswers[playerId] + 1);
                        }
                    } else {
                        game.points[playerId].set(playerId, game.points[playerId] + points);
                    }
                })
            } catch (error) {
                console.error("Error computing points for lastAnswer:", lastAnswer, "Error:", error.message);
                io.emit("error", "Error computing points for lastAnswer")
            }
        }

        // Move to next question
        game.currentQuestionIndex++

        // Check if we've reached the end of questions
        if (game.currentQuestionIndex >= game.questions.length) {
            // End the game
            endGame(gameCode, io)
            return
        }

        const currentQuestion = game.questions[game.currentQuestionIndex]

        // Send question to players (without correct answer)
        const questionForPlayers = {
            questionIndex: game.currentQuestionIndex,
            text: currentQuestion.text,
            answers: currentQuestion.answers.map((a) => ({text: a.text})),
            timeLimit: game.timePerQuestion,
        }

        // Send question to host (with correct answer marked) (TODO: evaluate if this is needed)
        const questionForHost = {
            questionIndex: game.currentQuestionIndex,
            text: currentQuestion.text,
            answers: currentQuestion.answers.map((a) => ({text: a.text, isCorrect: a.isCorrect})),
            timeLimit: game.timePerQuestion,
        }

        // Emit different events to players and host
        io.to(gameCode).emit("question-started", questionForPlayers)

        // Start timer
        startQuestionTimer(gameCode, game.timePerQuestion, io)

        console.log(`Game ${gameCode} moved to question ${game.currentQuestionIndex + 1}`)
    }

    function startQuestionTimer(gameCode, timeLimit, io) {
        const game = gameSessions.get(gameCode)
        if (!game) return

        // Clear any existing timer
        if (game.timer) {
            clearInterval(game.timer)
        }

        // Set start time
        game.questionStartTime = Date.now()

        // Set end time
        const endTime = game.questionStartTime + timeLimit * 1000

        // Create timer that updates every second
        game.timer = setInterval(() => {
            const timeLeft = Math.ceil((endTime - Date.now()) / 1000)

            // Send time update to all players
            io.to(gameCode).emit("timer-update", timeLeft)

            // End question when timer reaches 0
            if (timeLeft <= 0) {
                clearInterval(game.timer)
                game.timer = null
                endQuestion(gameCode, io)
            }
        }, 1000)
    }

    async function endQuestion(gameCode, io) {
        const game = gameSessions.get(gameCode)
        if (!game) return

        // Clear timer if it exists
        if (game.timer) {
            clearInterval(game.timer)
            game.timer = null
        }

        const currentQuestion = game.questions[game.currentQuestionIndex]
        let correctAnswer = requestValidalidAnser(currentQuestion)
        const correctAnswerIndex = currentQuestion.answers.findIndex((a) => a.text === correctAnswer) //TODO: check if this is needed

        // Calculate leaderboard position for each player
        const playersLeaderboard = []
        game.players.forEach((playerId) =>{
            playersLeaderboard.push(
                {
                    playerId: playerId,
                    playerName: game.players[playerId].name,
                    points: game.points[playerId],
                    correctAnswer: correctAnswer
                }
            );
        });

        // Sort by total score (highest first)
        playersLeaderboard.sort((a, b) => b.points - a.points)

        // Send results to all players
        io.to(gameCode).emit("question-ended", {
            questionIndex: game.currentQuestionIndex,
            playersLeaderboard,
        })

        console.log(`Question ended for game ${gameCode}`)
    }

    async function endGame(gameCode, io) {
        const game = gameSessions[gameCode]
        if (!game) return

        // Clear any active timers
        if (game.timer) {
            clearInterval(game.timer)
            game.timer = null
        }

        // Calculate final results
        const finalResults = game.players.map((player) => {
            return {
                isGuest: player.isGuest,
                playerId: player.id,
                playerName: player.name,
                points_gain: game.points[player.id].reduce((acc, points) => acc + points, 0),
                number_correct_answers: game.numberCorrectAnswers[player.id],
                number_of_questions: game.questions.length,
            }
        });

        // Sort by score (highest first)
        finalResults.sort((a, b) => b.points_gain - a.points_gain);

        // Send final results to all players
        io.to(gameCode).emit("game-ended", finalResults)

        // Mark game as ended in database
        const sessionData = await Session.findOne({gameCode})
        sessionData.ended = true;
        sessionData.endedAt = new Date();
        await sessionData.save()

        finalResults.forEach(data => {
            if (data.isGuest){
                //TODO: comunicate via a view/form to include the needed data to register the guest player
            } else {
                const gameInfo = new GameInfo({
                    user_id: data.playerId,
                    subject: sessionData.subject,
                    points_gain: data.points_gain,
                    number_of_questions: data.number_of_questions,
                    number_correct_answers: data.number_correct_answers,
                    total_time: game.timePerQuestion * game.questions.length
                })
                gameInfo.save()
                    .then(() => {
                        console.log("Game info saved successfully")
                    })
                    .catch((error) => {
                        console.error("Error saving game info:", error)
                    })
            }
        })

        // Remove game from memory
        gameSessions.delete(gameCode)

        console.log(`Game ${gameCode} ended`)
    }

    async function computePoints(question_id, answerIndex, time, maxTimeConfigured, numberOptions) {
        try {
            const gatewayServiceUrl = process.env.GATEWAY_SERVICE_URL || 'http://gatewayservice:8000';
            const response = await fetch(`${gatewayServiceUrl}/question/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({question_id, selected_answer: answerIndex}),
            });
            if (!response.ok) {
                throw new Error('Fai when validating the questions. Response: ' + response.statusText);
            }
            const data = await response.json();
            if (data.isCorrect) {
                // Calculate points based on time taken
                const timeTaken = maxTimeConfigured - time;
                return Math.ceil(10 * (80 * numberOptions / maxTimeConfigured) * (timeTaken / maxTimeConfigured));
            }
            return 0;
        } catch (error) {
            throw new Error("Error when performing the request of validation. ErrorMessage: " + error.message);
        }
    }

    async function requestValidalidAnser(questions){
        try {
            const likedAnswer = Question.findOne({_id: new ObjectId(questions.question_id)});
            if (!likedAnswer) {
                throw new Error('Question not found');
            }
            let validAnser;
            questions.forEach(q=> {
                if (q.answer === likedAnswer.answer) {
                    validAnser = q.answer;
                }
            })
            if (!validAnser) {
                throw new Error('No valid answer found');
            } else {
                return validAnser;
            }
        } catch (error) {
            throw new Error("Error when requesting the correct answer. ErrorMessage: " + error.message);
        }
    }
}