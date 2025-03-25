const express = require('express');
const otplib = require('otplib');
const qrcode = require("qrcode")

const router = express.Router();
// Endpoint to set-up a 2fa
router.post('/setup2fa', async (req, res) => {
  try {
    const secret = otplib.authenticator.generateSecret();
    qrcode.toDataURL(
      otplib.authenticator.keyuri("user", "wichat_en2b", secret),
      (err, imageUrl) => {
        if (err) {
          return res.status(500).send("Error generating QR code");
        }
        res.send({ secret, imageUrl });
      }
    );
  } catch (error) {
    res.status(500).send("Error setting up 2FA");
  }
});

router.post('/verify2fa', async (req, res) => {
  try {
    const { token, secret } = req.body;

    // Validate input
    if (!token || !secret) {
      return res.status(401).send("Token and Secret are required");
    }

    // Verify the token using the otplib authenticator
    const isValid = otplib.authenticator.verify({ token, secret });

    if (isValid) {
      // If the token is valid, return a success message
      res.send("2FA Verified");
    } else {
      // If the token is invalid, return an error
      res.status(401).send("Invalid 2FA Token");
    }
  } catch (error) {
    // Handle any unexpected errors
    res.status(500).send("Error verifying 2FA token");
  }
});

module.exports = router;