const express = require('express');
const otplib = require('otplib');
const qrcode = require("qrcode");
const logger = require('../logger');
const jwt = require('jsonwebtoken');
const axios = require('axios');  // Make sure axios is installed
const { route } = require('./AuthRouter');
const router = express.Router();

otplib.authenticator.options = { window: 1 };
const gatewayServiceUrl = process.env.GATEWAY_SERVICE_URL || 'http://gatewayservice:8000'; // NOSONAR
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
          reject(new Error("Error generating QR code"));
        } else {
          resolve(url);
        }
      });
    });

    // Save the secret to the user (make sure the gatewayServiceUrl is defined)
    try {
      await axios.patch(`${gatewayServiceUrl}/users/${user.username}`, { secret });
      logger.info('User updated with 2FA secret');
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
    const { token, user} = req.body;
    let userResponse;
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }
    
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
      let secret = userFromDB.secret;
      const isValid = otplib.authenticator.verify({ token, secret});
      if(isValid){
      const jwtToken = jwt.sign(
          { username: userFromDB.username, role: userFromDB.role },
          process.env.JWT_SECRET || 'testing-secret',
          { expiresIn: '1h' }
        );
      res.json({ message: "2FA Verified" , token: jwtToken});
      }else {
        res.status(401).json({ error: "Invalid 2FA Token" });
      }
    }  catch (error) {
    logger.error(`Failure verifying the 2FA token: ${error.message}`);
    res.status(500).json({ error: "Error verifying 2FA token" });
  }
});
router.get('/check2fa', async (req, res) => {
  try {
    // Get the user from the token
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized. Invalid or expired token.' });
    }

    // Check if the user exists and retrieve their 2FA status
    const foundUser = await User.findOne({ username: user.username });

    if (!foundUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if 2FA is enabled (assuming `secret` holds the 2FA secret)
    const is2faEnabled = !!foundUser.secret; // If `secret` exists, 2FA is enabled

    // Respond with the 2FA status
    return res.status(200).json({ twoFactorEnabled: is2faEnabled , username : user.username});

  } catch (error) {
    logger.error("Error checking 2FA status:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
module.exports = router;
