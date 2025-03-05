const express = require('express');
const loginRouter = require('./routers/AuthRouter');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8002; 

// Middleware to parse JSON in request body
app.use(express.json());

// Routers
app.use(loginRouter); 

// Start the server
const server = app.listen(port, () => {
    console.log(`Auth server listening at http://localhost:${port}`);
});

module.exports = { app, server };