const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const questionRouter = require('./routers/RouterQuestionRetriever');
const gameRouter = require('./routers/RouterGameInfo');
const statisticsRouter = require('./routers/RouterStatistics');
const quizRouter = require('./routers/QuizRouter');

const app = express(); //NOSONAR
app.use(express.json());
const port = 8004;

// Connection to MongoDB game database
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/game';
mongoose.connect(mongoUri)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ Error when connecting to MongoDB:', err));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routers
app.use(questionRouter);
app.use(gameRouter);
app.use(statisticsRouter);
app.use(quizRouter);

const server = app.listen(port, () => {
    console.log(`🚀 Server running on: http://localhost:${port}`);
});

server.on('close', () => {
    // Close the Mongoose connection
    mongoose.connection.close();
});

module.exports = server;