const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('./auth-model')
const bcrypt = require('bcrypt');
const { check, _, validationResult } = require('express-validator');
const router = express.Router();

router.post('/login',  [
    check('username').isLength({ min: 3 }).trim().escape(),
    check('password').isLength({ min: 3 }).trim().escape()
  ],
  async (req, res) => {
    try {
        // Check if required fields are present in the request body
        validateRequiredFields(req, ['username', 'password']);
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array().toString()});
        }
        let username = req.body.username.toString();
        let password = req.body.password.toString();

        // Find the user by username in the database
        // TODO: change to not interact with the database, delegate to the CRUD service
        const user = await User.findOne({ username }); 

        // Check if the user exists and verify the password
        if(!user || !await bcrypt.compare(password, user.password)) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const token = jwt.sign(
            { userId: user._id }, 
            'your-secret-key', // TODO: change to use a secret key from environment variable
            { expiresIn: '1h' }
        );

        res.json({ token: token, username: username, createdAt: user.createdAt });

    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
});
  
module.exports = router;