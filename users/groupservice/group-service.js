const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const app = express();
app.use(helmet.hidePoweredBy());
const bodyParser = require('body-parser');
const groupRoutes = require('./routers/GroupRouter');

app.use(bodyParser.json());

const port = 8005;

// Connection to MongoDB group database
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/userdb';
mongoose.connect(mongoUri)

// Use the group routes
app.use(groupRoutes);

const server = app.listen(port, () => {
    console.log(`Group service running on: http://localhost:${port}`);
});

server.on('close', () => {
    // Close the Mongoose connection
    mongoose.connection.close();
});

module.exports = server;