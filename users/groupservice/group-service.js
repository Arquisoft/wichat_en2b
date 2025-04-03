const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const app = express();
app.use(helmet.hidePoweredBy());
const bodyParser = require('body-parser');
const userRoutes = require('./routers/GroupRouter');

app.use(bodyParser.json());

const port = 8005;

// Connection to MongoDB user database
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/userdb';
mongoose.connect(mongoUri)

// Use the user routes
app.use(userRoutes);

const server = app.listen(port, () => {
    console.log(`User group service running on: http://localhost:${port}`);
});

server.on('close', () => {
    // Close the Mongoose connection
    mongoose.connection.close();
});

module.exports = server;