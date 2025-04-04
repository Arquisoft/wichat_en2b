import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import path from 'path';
import bodyParser from 'body-parser';
import userRoutes from './routers/RouterUserCrud.js'; 
import { fileURLToPath } from 'url';

const app = express();
app.use(helmet.hidePoweredBy());
app.use(bodyParser.json());

const port = 8001;

// Connection to MongoDB user database
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/userdb';
mongoose.connect(mongoUri)

// Middleware to serve static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// Use the user routes
app.use(userRoutes);

const server = app.listen(port, () => {
    console.log(`👨 User service running on: http://localhost:${port}`);
});

server.on('close', () => {
    // Close the Mongoose connection
    mongoose.connection.close();
});

export default app; 