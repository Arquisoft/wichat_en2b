const express = require('express');
const mongoose = require('mongoose');
const loginRouter = require('./routers/LoginRouter');
require('dotenv').config();

const app = express();
const port = process.env.PORT; 

// Middleware to parse JSON in request body
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.info('Conectado a MongoDB'))
    .catch((err) => logger.error('Error al conectar a MongoDB', err));

// Routers
app.use(loginRouter); 

// Start the server
const server = app.listen(port, () => {
    console.log(`Auth Service listening at http://localhost:${port}`);
});

server.on('close', () => {
    mongoose.connection.close(); // Close the Mongoose connection
});
