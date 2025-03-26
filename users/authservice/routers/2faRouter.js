const express = require('express');
const otplib = require('otplib');
const qrcode = require("qrcode");
const logger = require('../logger'); 
const router = express.Router();

otplib.authenticator.options = { window: 1 };

// Endpoint to set up 2FA
router.post('/setup2fa', async (req, res) => {
  try {
    const secret = otplib.authenticator.generateSecret();
    const otpauth = otplib.authenticator.keyuri("user", "wichat_en2b", secret);
    qrcode.toDataURL(otpauth, (err, imageUrl) => {
      if (err) {
        return res.status(500).json({ error: "Error generating QR code" });
      }
      // Send only the QR Code URL, not the secret
      res.json({ imageUrl });

    });
  } catch (error) {
    logger.error(`Failure setting up the 2FA`);
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
    logger.error(`Failure verifying the 2FA token`);
    res.status(500).json({ error: "Error verifying 2FA token" });
  }
});

module.exports = router;
