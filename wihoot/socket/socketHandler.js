const socketIo = require("socket.io")
const SharedQuizSession = require("../models/session-model")

module.exports = {
    io: null, // Initialize io to null
    initializeSocket : function (server) {
        // Check if io is already initialized
        if (this.io == null){
            this.io = socketIo(server, {
                cors: {
                    origin: [
                        "http://localhost:3000",
                        "https://wichat.ddns.net"
                    ],
                    methods: ["GET", "POST"],
                    credentials: true,
                },
            })
        }
        this.io.on("connection", (socket) => {
                console.log("New client connected:", socket.id)

                // Join a session room
                socket.on("join-session", async ({ code, playerId, username }) => {
                    try {
                        // Find the session
                        const session = await SharedQuizSession.findOne({ code })

                        if (!session) {
                            socket.emit("error", { message: "Session not found" })
                            return
                        }

                        // Join the room
                        socket.join(code)

                        // Store session code and player info in socket
                        socket.sessionCode = code
                        socket.playerId = playerId
                        socket.username = username

                        console.log(`Player ${username} (${playerId}) joined session ${code}`)

                        // Notify the player about successful join
                        socket.emit("joined-session", {
                            code,
                            status: session.status,
                            currentQuestionIndex: session.currentQuestionIndex,
                            players: session.players.map((p) => ({
                                id: p.id,
                                username: p.username,
                                score: p.score,
                            })),
                        })

                        // Notify other players about the new player
                        socket.to(code).emit("player-joined", {
                            playerId,
                            username,
                        })
                    } catch (error) {
                        console.error("Error joining session room:", error)
                        socket.emit("error", { message: "Failed to join session" })
                    }
                })

                // Host joins a session
                socket.on("host-session", async ({ code, hostId }) => {
                    try {
                        // Find the session
                        const session = await SharedQuizSession.findOne({ code })

                        if (!session) {
                            socket.emit("error", { message: "Session not found" })
                            return
                        }

                        if (session.hostId !== hostId) {
                            socket.emit("error", { message: "You are not the host of this session" })
                            return
                        }

                        // Join the room
                        socket.join(code)

                        // Store session code and host info in socket
                        socket.sessionCode = code
                        socket.isHost = true
                        socket.hostId = hostId

                        console.log(`Host (${hostId}) joined session ${code}`)

                        // Notify the host about successful join
                        socket.emit("hosting-session", {
                            code,
                            status: session.status,
                            currentQuestionIndex: session.currentQuestionIndex,
                            players: session.players.map((p) => ({
                                id: p.id,
                                username: p.username,
                                score: p.score,
                            })),
                        })
                    } catch (error) {
                        console.error("Error hosting session:", error)
                        socket.emit("error", { message: "Failed to host session" })
                    }
                })

                // Chat message
                socket.on("send-message", ({ message }) => {
                    if (!socket.sessionCode) {
                        socket.emit("error", { message: "You are not in a session" })
                        return
                    }

                    const messageData = {
                        senderId: socket.playerId || socket.hostId,
                        senderName: socket.username || "Host",
                        isHost: !!socket.isHost,
                        message,
                        timestamp: new Date(),
                    }

                    // Broadcast to everyone in the session including sender
                    io.to(socket.sessionCode).emit("new-message", messageData)
                })

                // Disconnect
                socket.on("disconnect", async () => {
                    console.log("Client disconnected:", socket.id);

                    // Handle regular player disconnection
                    if (socket.sessionCode && socket.playerId && !socket.isHost) {
                        try {
                            // First notify others that player left
                            socket.to(socket.sessionCode).emit("player-left", {
                                playerId: socket.playerId,
                                username: socket.username
                            });
                            
                            // Use the static method for safe player removal
                            await SharedQuizSession.removePlayer(socket.sessionCode, socket.playerId);
                            console.log(`Player ${socket.playerId} removed from session ${socket.sessionCode}`);
                        } catch (error) {
                            console.error("Error handling player disconnection:", error);
                        }
                    }
                    
                    // Handle host disconnection - completely delete the session
                    if (socket.sessionCode && socket.isHost) {
                        try {
                            // First notify all clients that the host disconnected and session will end
                            this.io.to(socket.sessionCode).emit("host-disconnected", {
                                message: "The host has left the session. The session will be closed."
                            });
                            
                            // Then delete the session using the static method
                            const deletedSession = await SharedQuizSession.deleteSession(socket.sessionCode);
                            
                            if (deletedSession) {
                                console.log(`Session ${socket.sessionCode} was completely deleted because the host disconnected`);
                            } else {
                                console.log(`No session found with code ${socket.sessionCode} to delete`);
                            }
                            
                            // Disconnect all clients from this room
                            const sockets = await this.io.in(socket.sessionCode).fetchSockets();
                            for (const s of sockets) {
                                s.leave(socket.sessionCode);
                            }
                        } catch (error) {
                            console.error(`Error handling host disconnection for session ${socket.sessionCode}:`, error);
                        }
                    }
                });

                socket.on("waiting-for-next", async ({ code }) => {
                    try {
                        const session = await SharedQuizSession.findOne({ code });
                        if (!session) {
                            socket.emit("error", { message: "Session not found" });
                            return;
                        }
                        session.waitingForNext = true;
                        await session.save();
                        socket.to(code).emit("waiting-for-next");
                    } catch (error) {
                        console.error("Error in waiting-for-next:", error);
                        socket.emit("error", { message: "Failed to process waiting-for-next" });
                    }
                });

                socket.on("show-correct-answer", async ({ code, correctAnswer }) => {
                    // Now we're passing the correctAnswer from the host to the players
                    this.io.to(code).emit("show-correct-answer", { correctAnswer });
                });
            })

        return this.io
    }
}