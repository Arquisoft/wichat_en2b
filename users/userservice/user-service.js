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

let serverInstance = null;

const startServer = () => {
  if (!serverInstance) {
    serverInstance = app.listen(port, () => {
        console.log(`👨 User service running on: http://localhost:${port}`);
    });
  }
  return serverInstance;
};

// Export a function to close the server and connections
const stopServer = async () => {
  return new Promise((resolve, reject) => {
    if (serverInstance) {
      serverInstance.close(async () => {
        console.log("Server closed");
        try {
          await mongoose.connection.close(false); // Pass false to avoid waiting for all ops to complete
          console.log("MongoDB connection closed");
          serverInstance = null;
          resolve();
        } catch (err) {
          reject(new Error(err));
        }
      });
    } else {
      // If the server isn't running, just close the MongoDB connection
      mongoose.connection.close(false)
        .then(() => {
          console.log("MongoDB connection closed");
          resolve();
        })
        .catch(reject);
    }
  });
};

export { startServer, stopServer };
export default app; 