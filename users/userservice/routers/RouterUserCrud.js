const express = require('express');
const router = express.Router();
const User = require('../user-model');
const bcrypt = require('bcrypt');

// Create a new user
router.post('/users', async (req, res) => {
    try {
        const user = new User({
            ...req.body
        });
        const errors = user.validateSync();

        if (errors) {
            console.log(errors);
            return res.status(400).send(errors);
        }

        const existingUser = await User.findOne({ username: req.body.username.toString() });

        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
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
        const user = await User.findOne({ username: req.params.username.toString() });
        if (!user) {
            return res.status(404).send();
        }
        res.status(200).send(user);
    } catch (error) {
        res.status(500).send(error);
    }
});

router.post('/users/by-ids', async (req, res) => {
    try {
        const { users } = req.body;
        console.log("Users " + users);
        if (!users || !Array.isArray(users)) {
            return res.status(400).json({ error: 'Request body must contain a "users" array' });
        }

        const foundUsers = await User.find({ _id: { $in: users } });
        console.log("Found users " + foundUsers);
        
        res.status(200).json(foundUsers);
    } catch (error) {
        res.status(500).send();
    }
});

router.patch('/users/:username', async (req, res) => { //NOSONAR
    try {
        if (Object.keys(req.body).length === 0) {
            return res.status(400).
                json({ error: 'Request body is required' });
        }

        const user = await User.findOne({ username: req.params.username.toString() });

        if (!user) {
            return res.status(404).send();
        }

        let somethingchanged = false;

        for (const key in req.body) {
            if (key === 'secret') {
                somethingchanged = true;
            }else if (key === 'password') {
                somethingchanged = !bcrypt.compareSync(req.body.password, user.password);
            } else if (user[key] === undefined) {
                return res.status(400).json({ error: `${key} is not a valid user property` });
            } else if (req.body[key] != user[key]) {
                somethingchanged = true;
            }
        }

        if (!somethingchanged) {
            return res.status(400).json({ error: 'No changes detected' });
        }

        if (req.body.username && req.body.username !== req.params.username) {
            const existingUser = await User.findOne({ username: req.body.username.toString() });

            if (existingUser) {
                return res.status(400).json({ error: 'Username already exists' });
            }
        }

        Object.assign(user, req.body);

        const errors = user.validateSync();

        if (errors) {
            return res.status(400).send(errors);
        }

        if (req.body.password) {
            user.password = bcrypt.hashSync(req.body.password, 10);
        }

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
        const user = await User.findOneAndDelete({username: req.params.username.toString() });
        if (!user) {
            return res.status(404).send();
        }
        res.status(200).send(user);
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;