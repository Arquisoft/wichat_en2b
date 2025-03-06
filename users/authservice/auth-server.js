const express = require('express');
const loginRouter = require('./routers/AuthRouter');
require('dotenv').config({ path: '../../.env' }); 

const app = express();
const port = process.env.PORT; 

// Middleware to parse JSON in request body
app.use(express.json());

// Disable X-Powered-By header
app.disable('x-powered-by');

// Routers
app.use(loginRouter); 

// Start the server
const server = app.listen(port, () => {
    console.log(`Auth server listening at http://localhost:${port}`);
});

module.exports = { app, server };