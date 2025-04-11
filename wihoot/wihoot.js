const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');

const gamesessionRouter = require('./routers/RouterGameSession');

const app = express();
app.use(express.json());
const port = 8005;
const server = http.createServer(app);

// Set up Socket.io with CORS
const io = socketIo(server, {
    cors: {
        origin: process.env.GATEWAY_SERVICE_URL || "http://gatewayservice:3000",
        methods: ["GET", "POST"],
        credentials: true,
    },
})

// Connection to MongoDB game database
const connectWithRetry = () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/game';
    mongoose.connect(mongoUri)
        .then(() => console.log('✅ Connected to MongoDB'))
        .catch(err => {
            console.error('❌ Error when connecting to MongoDB:', err)
            setTimeout(connectWithRetry, 5000)
        });
}
// Handle MongoDB connection events
mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err)
})

mongoose.connection.on("disconnected", () => {
    console.log("MongoDB disconnected, attempting to reconnect...")
    connectWithRetry()
})

app.use(gamesessionRouter);
require('./socket/socketHandler')(io)

server.on('close', () => {
    // Close the Mongoose connection
    mongoose.connection.close();
});

server.listen(port, () => {
    console.log(`🚀 Wihoot server running on: http://localhost:${port}`);
});

module.exports = server;