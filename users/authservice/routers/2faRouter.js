const express = require('express');
const otplib = require('otplib');
const qrcode = require("qrcode");
const logger = require('../logger');
const jwt = require('jsonwebtoken');
const axios = require('axios');  // Make sure axios is installed
const router = express.Router();

otplib.authenticator.options = { window: 1 };

// Function to decode user from token
const getUserFromToken = (req) => {
  try {
      const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;
      if (!token) return null;

      return jwt.verify(token, process.env.JWT_SECRET || 'testing-secret');
  } catch (error) {
      logger.error("Invalid or expired token");
      return null;
  }
};

// Endpoint to set up 2FA
router.post('/setup2fa', async (req, res) => {
  try {
    // Get the user from the token
    let user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Generate 2FA secret
    const secret = otplib.authenticator.generateSecret();
    const otpauth = otplib.authenticator.keyuri(user.username, "wichat_en2b", secret);

    // Generate QR code
    const imageUrl = await new Promise((resolve, reject) => {
      qrcode.toDataURL(otpauth, (err, url) => {
        if (err) {
          reject("Error generating QR code");
        } else {
          resolve(url);
        }
      });
    });

    // Save the secret to the user (make sure the gatewayServiceUrl is defined)
    try {
      const newUserResponse = await axios.patch(`http://localhost:8000/users/${user.username}`, { secret });
      logger.info('User updated with 2FA secret');
      console.log(newUserResponse.data); // Log the response from the user update request
    } catch (error) {
      logger.error(`Error saving 2FA secret to user: ${error.message}`);
    }

    // Return the QR code URL
    res.json({ imageUrl });
  } catch (error) {
    logger.error(`Failure setting up 2FA: ${error.message}`);
    res.status(500).json({ error: "Error setting up 2FA" });
  }
});

// Endpoint to verify 2FA token
router.post('/verify2fa', async (req, res) => {
  try {
    const { token, secret } = req.body;

    if (!token || !secret) {
      return res.status(400).json({ error: "Token and Secret are required" });
    }

    const isValid = otplib.authenticator.verify({ token, secret });

    if (isValid) {
      res.json({ message: "2FA Verified" });
    } else {
      res.status(401).json({ error: "Invalid 2FA Token" });
    }
  } catch (error) {
    logger.error(`Failure verifying the 2FA token: ${error.message}`);
    res.status(500).json({ error: "Error verifying 2FA token" });
  }
});

module.exports = router;
