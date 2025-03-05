const express = require('express');
const router = express.Router();
const User = require('../user-model');
const bcrypt = require('bcrypt');

// Create a new user
router.post('/users', async (req, res) => {
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
router.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).send(users);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Get a user by username
router.get('/users/:username', async (req, res) => {
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
router.patch('/users/:username', async (req, res) => {
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
router.delete('/users/:username', async (req, res) => {
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

module.exports = router;