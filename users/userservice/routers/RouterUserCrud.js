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

// Update a user by username
router.patch('/users/:username', async (req, res) => {
  try {
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Request body is required' });
    }

    const user = await User.findOne({ username: req.params.username.toString() });

    if (!user) {
      return res.status(404).send();
    }

    let somethingChanged = false;
    if (req.body.secret && req.body.secret === user.secret) {

        const existingSecretUser = await User.findOne({ secret: req.body.secret });
        if (existingSecretUser) {
        return res.status(400).send({ error: 'Secret must be unique' });
        }
    }
    for (const key in req.body) {
      // Check for 'secret' and update it
      if (key === 'secret') {
        somethingChanged = true;
      } else if (key === 'password') {
        somethingChanged = !bcrypt.compareSync(req.body.password, user.password);
      } else if (user[key] === undefined) {
        return res.status(400).json({ error: `${key} is not a valid user property` });
      } else if (req.body[key] != user[key]) {
        somethingChanged = true;
      }
    }

    if (!somethingChanged) {
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

    // Save the updated user, including the secret
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