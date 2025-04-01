const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const bcrypt = require('bcrypt'); // Added bcrypt import
const { check, validationResult } = require('express-validator');
const logger = require('../logger'); 
require('dotenv').config(); 

const router = express.Router();
const validRoles = ['USER', 'ADMIN'];
const gatewayServiceUrl = process.env.GATEWAY_SERVICE_URL || 'http://gatewayservice:8000'; // NOSONAR
const ERROR_USERNAME_NOT_FOUND = "Username not found";
const ERROR_WRONG_PASSWORD = "Password is incorrect";

// Endpoint to login a user and return a JWT token
router.post('/login', [
  check('user').notEmpty().withMessage('Missing required field: user'),
  check('user.username').isLength({ min: 3 }).trim().escape().withMessage('Username must be at least 3 characters'),
  check('user.password').isLength({ min: 3 }).trim().escape().withMessage('Password must be at least 3 characters'),
], async (req, res) => {
  // Check for existing token in Authorization header or cookies
  const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'testing-secret');
      logger.info("User already logged in, rejecting login attempt");
      return res.status(403).json({ error: "You are already logged in" });
    } catch (err) {
      // Invalid token, proceed with login (treat as not logged in)
      logger.warn("Invalid token provided, proceeding with login");
    }
  }
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMsg = errors.array().map(err => err.msg).join(', ');
      return res.status(400).json({ error: errorMsg });
    }

    const { user } = req.body;
    let userResponse;
    try {
      userResponse = await axios.get(`${gatewayServiceUrl}/users/${user.username}`);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        logger.error(`Failure in login: user ${user.username} not found`);
        return res.status(401).json({ 
          error: ERROR_USERNAME_NOT_FOUND, 
          field: 'username' 
        });
      }
      throw err;
    }
    const userFromDB = userResponse.data;
    if (!userFromDB || userFromDB.length === 0) {
      logger.error(`Failure in login: user ${user.username} not found`);
      return res.status(401).json({ 
        error: ERROR_USERNAME_NOT_FOUND,
        field: 'username' 
      });
    }

    const passwordMatch = await bcrypt.compare(user.password, userFromDB.password);
    if (!passwordMatch) {
      logger.error(`Failure in login: invalid password for user ${user.username}`);
      return res.status(401).json({ 
        error: ERROR_WRONG_PASSWORD,
        field: 'password' 
      });
    }
    let has2fa = userFromDB.secret;
    if(has2fa){
      
      res.json({has2fa : has2fa});
    }else{
      const token = jwt.sign(
        { username: userFromDB.username, role: userFromDB.role },
        process.env.JWT_SECRET || 'testing-secret',
        { expiresIn: '1h' }
      );
      res.json({ token: token , has2fa : has2fa});
    }
    
    
  } catch (error) {
    logger.error('Error in /login endpoint', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Endpoint to register a new user
router.post('/register', [
    check('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters').trim().escape(),
    check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters').trim().escape(),
    check('role').notEmpty().withMessage('Role must be defined.'),
    check('role').custom(value => {
        if (value && !validRoles.includes(value.toUpperCase())) {
            throw new Error('Role must be one of the following: USER, ADMIN');
        }
        return true;
    }).trim().escape()
  ],
  async (req, res) => {
    try {      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
          logger.error({ err: errors.array() }, 'Validation error in /register endpoint');
          return res.status(400).json({ error: errors.array().map(err => err.msg).join(', ') });
      }
      
      const { username, password } = req.body;  
      const role = req.body.role.toUpperCase(); 

      try {
        // Creating a new user by sending a POST request to the user service
        const newUserResponse = await axios.post(`${gatewayServiceUrl}/users`, { username, password, role });
        const newUser = newUserResponse.data;

        // Hashing the password before sending it back
        const token = jwt.sign(
            { username: newUser.username, role: newUser.role }, 
            process.env.JWT_SECRET || 'testing-secret',
            { expiresIn: '1h' }
        );

        // Responding with the token
        res.status(201).json({token : token});

      } catch (error) {
        if (error.response && error.response.status === 400) {
          logger.error({ err: error.response.data.error }, 'Error in /register endpoint');
          return res.status(400).json({ error: error.response.data.error });
        }

        logger.error({ err: error }, 'Error in /register endpoint');
        throw error;
      }

    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// Endpoint to get user details
router.get('/me', async (req, res) => {
  try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ error: "Unauthorized" });

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'testing-secret');

      // Llamada al backend user CRUD para obtener detalles del usuario
      const userResponse = await axios.get(`${gatewayServiceUrl}/users/${decoded.username}`);

      if (!userResponse.data) {
          return res.status(404).json({ error: "User not found" });
      }

      res.status(200).json(userResponse.data);
      
  } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint to validate the user password
router.post('/validatePassword', async (req, res) => {
    let { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const userResponse = await axios.get(`${gatewayServiceUrl}/users/${username}`);
        const userFromDB = userResponse.data;
        
        if (!userFromDB) {
            return res.status(404).json({ error: 'User not found' });
        }

        const passwordMatch = await bcrypt.compare(password, userFromDB.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        res.status(200).json({ message: 'Password is valid' });
    } catch (error) {
        console.error('Error validating password:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



module.exports = router;