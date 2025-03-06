const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const bcrypt = require('bcrypt'); // Added bcrypt import
const { check, validationResult } = require('express-validator');
const logger = require('../logger'); 
require('dotenv').config({ path: '../../../.env' }); 
const router = express.Router();

// Endpoint to login a user and return a JWT token
router.post('/login', [
  check('user').notEmpty().withMessage('Missing required field: user'),
  check('user.username').isLength({ min: 3 }).trim().escape().withMessage('Invalid value'),
  check('user.password').isLength({ min: 3 }).trim().escape().withMessage('Invalid value'),
  check('user.role').notEmpty().withMessage('Missing required field: role'),
  ],
  async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ error: errors.array().map(err => err.msg).join(', ') });
        }

        const { user } = req.body; 
        const userResponse = await axios.get(`http://localhost:8001/users?id=${user.username}`);
        const userFromDB = userResponse.data;

        if (!userFromDB || userFromDB.length === 0) {
          logger.error(`Failure in login: user ${user.username} not found`);
          return res.status(401).json({ error: 'Not a valid user' });
        }

        const passwordMatch = await bcrypt.compare(user.password, userFromDB.password);
        if (!passwordMatch) {
          logger.error(`Failure in login: invalid password for user ${user.username}`);
          return res.status(401).json({ error: 'Not a valid password' });
        }

        if (userFromDB.role !== user.role) {
          logger.error(`Failure in login: user ${user.username} does not have the role ${user.role}`);
          return res.status(401).json({ error: 'Not a valid role' });
        }

        const token = jwt.sign(
            { id: userFromDB._id, role: userFromDB.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        res.json({ token: token});

    } catch (error) {
      logger.error('Error in /login endpoint', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Endpoint to register a new user
router.post('/register', [
    check('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters').trim().escape(),
    check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters').trim().escape(),
    check('role').isIn(['user']).withMessage('Role must be one of the following: user').trim().escape()
  ],
  async (req, res) => {
    try {      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
          return res.status(400).json({ error: errors.array().map(err => err.msg).join(', ') });
      }
      
      const { username, password, role } = req.body;  

      try {
        // Creating a new user by sending a POST request to the user service
        const newUserResponse = await axios.post('http://localhost:8001/users', { username, password, role });
        const newUser = newUserResponse.data;

        // Hashing the password before sending it back
        const token = jwt.sign(
            { username: newUser.username, role: newUser.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        // Responding with the token
        res.status(201).json({
          token,
        });
      } catch (error) {
        if (error.response && error.response.status === 400) {
          return res.status(400).json({ error: error.response.data.error });
        }
        throw error;
      }

    } catch (error) {
      logger.error('Error in /register endpoint', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

module.exports = router;
