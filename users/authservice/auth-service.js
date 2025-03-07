const express = require('express');
const authRouter = require('./routers/AuthRouter');
require('dotenv').config(); 

const app = express();
const port = process.env.PORT || 8002; 

// Middleware to parse JSON in request body
app.use(express.json());

// Disable X-Powered-By header
app.disable('x-powered-by');

// Routers
app.use("/auth", authRouter); 

// Start the server
const server = app.listen(port, () => {
    console.log(`Auth server listening at http://localhost:${port}`);
});

module.exports = { app, server };