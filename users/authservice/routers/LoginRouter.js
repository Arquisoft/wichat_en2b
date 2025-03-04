const express = require('express');
const jwt = require('jsonwebtoken');
const { check, _, validationResult } = require('express-validator');
const userService = require('../../userservice/user-service');
const logger = require('../../logger'); // TODO: Add logger to the project
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

