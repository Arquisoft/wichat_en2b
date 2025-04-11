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



app.use(gamesessionRouter);
require('./socket/socketHandler')(io)

server.listen(port, () => {
    console.log(`🚀 Wihoot server running on: http://localhost:${port}`);
});

module.exports = server;