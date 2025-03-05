const express = require('express');
const jwt = require('jsonwebtoken');
const { check, _, validationResult } = require('express-validator');
const logger = require('../../logger'); 
require('dotenv').config();
const router = express.Router();

// Middleware to restrict access to internal endpoints
function verifyInternalRequest(req, res, next) {
  const headerSecret = req.headers['x-internal-auth'];
  
  if (!headerSecret) {
    logger.warn('Missing internal auth secret');
    return res.status(403).json({ error: 'Not authorized access' });
  }
  next();
}

router.use(verifyInternalRequest);

function validateRequiredFields(req, fields) {
  const missingFields = fields.filter(field => !req.body[field]);

  if (missingFields.length > 0) {
    throw new Error(`Missing required field(s): ${missingFields.join(', ')}`);
  }
}

// Endpoint to login a user and return a JWT token
router.post('/login',  [
    check('userId').isLength({ min: 3 }).trim().escape(),
    check('username').isLength({ min: 3 }).trim().escape(),
    check('password').isLength({ min: 3 }).trim().escape(),
    check('role').isIn(['admin', 'user']).trim().escape()
  ],
  async (req, res) => {
    try {
        validateRequiredFields(req, ['username', 'password', 'role']);
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ error: errors.array().toString()});
        }

        let userId = req.body.userId.toString();
        let username = req.body.username.toString();
        let password = req.body.password.toString();
        let role = req.body.role.toString();

        const userResponse = await axios.get(`http://localhost:8001/users?id=${userId}`);
        const user = userResponse.data;

        if (!user) {
          logger.error(`Failure in login: user ${username} not found`);
          return res.status(401).json({ error: 'Not a valid user' });
        }
        
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          logger.error(`Failure in login: invalid password for user ${username}`);
          return res.status(401).json({ error: 'Not a valid password' });
        }

        if (user.role !== role) {
          logger.error(`Failure in login: user ${username} does not have the role ${role}`);
          return res.status(401).json({ error: 'Not a valid role' });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role }, 
            process.env.JWT_SECRET, // Use the secret key from environment variable
            { expiresIn: '1h' }
        );

        res.json({ token: token, username: username, createdAt: user.createdAt });

    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to register a new user
router.post('/register', [
    check('username').isLength({ min: 3 }).trim().escape(),
    check('password').isLength({ min: 6 }).trim().escape(),
    check('role').isIn(['admin', 'user']).trim().escape()
  ],
  async (req, res) => {
    try {      
      validateRequiredFields(req, ['username', 'password', 'role']);
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
          logger.error('Error on /register endpoint', errors.array());
          return res.status(400).json({ error: errors.array().toString() });
      }
      
      const { username, password, role } = req.body;  
      const newUserResponse = await axios.post( 'http://localhost:8001/users', { username, password, role } );
      const newUser = newUserResponse.data;
      
      res.status(201).json(
        { message: 'User successfully registered: ', username: newUser.username });
      
    } catch (error) {
        logger.error('Error en el endpoint /register', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


module.exports = router;