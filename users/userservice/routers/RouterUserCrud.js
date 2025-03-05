const express = require('express');
const router = express.Router();
const User = require('../user-model');
const bcrypt = require('bcrypt');

// Create a new user
router.post('/users', async (req, res) => {
    try {
        const existingUser = await User.findOne({ username: req.body.username });

        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const user = new User({
            ...req.body
        });

        const errors = user.validateSync();

        if (errors) {
            return res.status(400).send(errors);
        }

        user.password = bcrypt.hashSync(req.body.password, 10);

        await user.save();

        res.status(201).send(user);
    } catch (error) {
        res.status(500).send(error);
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
        const existingUser = await User.findOne({ username: req.body.username });

        if (existingUser && existingUser.username !== req.params.username) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const user = await User.findOne({ username: req.params.username });

        if (!user) {
            return res.status(404).send();
        }

        if (req.body.password) {
            req.body.password = bcrypt.hashSync(req.body.password, 10);
        }

        Object.assign(user, req.body);

        const errors = user.validateSync();

        if (errors) {
            return res.status(400).send(errors);
        }

        await user.save();

        user.__v += 1;

        await user.save();

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