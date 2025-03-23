const express = require('express');
const authRouter = require('./routers/AuthRouter');
const helmet = require('helmet')

require('dotenv').config(); 

const app = express();
const port = process.env.PORT || 8002; 

app.use(helmet());
// Middleware to parse JSON in request body
app.use(express.json());

// Disable X-Powered-By header
app.disable('x-powered-by');
// Routers
app.use("/", authRouter); 

// Start the server
const server = app.listen(port, () => {
    console.log(`Auth server listening at http://localhost:${port}`);
});

module.exports = { app, server };