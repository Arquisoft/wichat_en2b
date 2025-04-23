const socketIo = require("socket.io")
const SharedQuizSession = require("../models/session-model")

let io

function initializeSocket(server) {
    io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    })

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id)

        // Join a session room
        socket.on("join-session", async ({ code, playerId, username, isGuest }) => {
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
                socket.isGuest = isGuest

                console.log(`Player ${username} (${playerId}) joined session ${code}`)

                // Notify the player about successful join
                socket.emit("joined-session", {
                    code,
                    status: session.status,
                    currentQuestionIndex: session.currentQuestionIndex,
                    players: session.players.map((p) => ({
                        id: p.id,
                        username: p.username,
                        isGuest: p.isGuest,
                        score: p.score,
                    })),
                })

                // Notify other players about the new player
                socket.to(code).emit("player-joined", {
                    playerId,
                    username,
                    isGuest,
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
                        isGuest: p.isGuest,
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
            console.log("Client disconnected:", socket.id)

            if (socket.sessionCode && socket.playerId && !socket.isHost) {
                // Notify others that player left
                socket.to(socket.sessionCode).emit("player-left", {
                    playerId: socket.playerId,
                    username: socket.username,
                })
            }
        })
    })

    return io
}


module.exports = {initializeSocket }

