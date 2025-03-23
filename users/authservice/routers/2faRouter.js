const express = require('express');
const bodyParser = require('body-parser');
const otplib = require('otplib');

require('dotenv').config(); 

const router = express.Router();

// Endpoint to login a user and return a JWT token
router.post('/setup2fa',
  async (req, res) => {
    try {
       

    } catch (error) {
     
    }
});

module.exports = router;
