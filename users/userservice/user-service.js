const express = require('express');
const mongoose = require('mongoose');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const User = require('./user-model');
const bcrypt = require('bcrypt');
const router = express.Router();

const port = 8001;

// Connection to MongoDB user database
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/userdb';
mongoose.connect(mongoUri)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ Error when connecting to MongoDB:', err));

// Create a new user
app.post('/users', async (req, res) => {
    try {
        const saltRounds = 10;
        const hashedPassword = bcrypt.hashSync(req.body.password, saltRounds);
        const user = new User({
            ...req.body,
            password: hashedPassword
        });
        await user.save();
        res.status(201).send(user);
    } catch (error) {
        res.status(400).send(error);
    }
});

// Get all users
app.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).send(users);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Get a user by username
app.get('/users/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) {
            return res.status(404).send();
        }
        res.status(200).send(user);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Update a user by username
app.patch('/users/:username', async (req, res) => {
    try {
        const user = await User.findOneAndUpdate({ username: req.params.username }, { ...req.body, $inc: { __v: 1 } }, { new: true, runValidators: true });
        if (!user) {
            return res.status(404).send();
        }
        res.status(200).send(user);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Delete a user by username
app.delete('/users/:username', async (req, res) => {
    try {
        const user = await User.findOneAndDelete({username: req.params.username});
        if (!user) {
            return res.status(404).send();
        }
        res.status(200).send(user);
    } catch (error) {
        res.status(500).send(error);
    }
});

const server = app.listen(port, () => {
    console.log(`🚀 User service running on: http://localhost:${port}`);
});

server.on('close', () => {
    // Close the Mongoose connection
    mongoose.connection.close();
  });

module.exports = server;