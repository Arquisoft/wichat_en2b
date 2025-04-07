import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import path from 'path';
import bodyParser from 'body-parser';
import userRoutes from './routers/RouterUserCrud.js';   

const app = express();
app.use(helmet.hidePoweredBy());
app.use(bodyParser.json());

const port = 8001;

// Connection to MongoDB user database
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/userdb';
// Set mongoose connection options
mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 1000, 
    connectTimeoutMS: 1000
    }).then(() => {
        console.log('MongoDB connection successful');
    }).catch(err => {
        console.error('MongoDB connection error:', err);
    });

// Middleware to serve static files
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to handle DB connection errors
app.use((req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: 'Database unavailable' });
    }
    next();
});
  
// Use the user routes
app.use(userRoutes);

let server = app.listen(port, () => {
    console.log(`👨 User service running on: http://localhost:${port}`);
});

module.exports = server;