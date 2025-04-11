const jwt = require('jsonwebtoken');

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
}