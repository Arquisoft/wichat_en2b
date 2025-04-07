const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const path = require('path');
const bodyParser = require('body-parser');
const userRoutes = require('./routers/RouterUserCrud.js');

const app = express();
app.use(helmet.hidePoweredBy());
app.use(bodyParser.json());

const port = 8001;

// Connection to MongoDB user database
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/userdb';
mongoose.connect(mongoUri)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ Error when connecting to MongoDB:', err));


// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));
  
// Use the user routes
app.use(userRoutes);

const server = app.listen(port, () => {
    console.log(`👨 User service running on: http://localhost:${port}`);
});

server.on('close', () => {
    mongoose.connection.close();
});

module.exports = server;