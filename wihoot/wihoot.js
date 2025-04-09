const express = require('express');
const gamesessionRouter = require('./routers/RouterGameSession');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
app.use(express.json());
const port = 8005;

app.use(gamesessionRouter);

const server = http.createServer(app);
const io = socketIO(server, {
    cors: { origin: "*" }
});

//TODO remove console.log, replace by logger
//SocketIO connection
io.on('connection', (socket) => {
    console.log(`🟢 User connected: ${socket.id}`);

    socket.on('join-game', ({ gameCode, playerName, isGest }) => {
        console.log(`${playerName} want to join to session: ${gameCode} and isGuest?: ${isGest}`);
    });

    socket.on("disconnect", () => {
        console.log(`🔴 User disconnected: ${socket.id}`);
        // Delete the player? TODO:decide Impact: having data that is not useful if not deleted
    });
});

server.listen(port, () => {
    console.log(`🚀 Wihoot server running on: http://localhost:${port}`);
});

module.exports = server;