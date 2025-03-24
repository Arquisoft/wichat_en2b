const express = require('express');
const bodyParser = require('body-parser');
const otplib = require('otplib');
const qrcode = require("qrcode")

require('dotenv').config(); 

const router = express.Router();

// Endpoint to login a user and return a JWT token
router.post('/setup2fa',
  async (req, res) => {
    try {
      const secret = otplib.authenticator.generateSecret();
      qrcode.toDataURL(
        otplib.authenticator.keyuri(req.user,"wichat_en2b",secret),
        (err, imageUrl) => {
          if(err){
            return res.status(500).send("Error generating QR code");
          }
          res.send({ secret, imageUrl})
        }
      )

    } catch (error) {
     
    }
});



module.exports = router;
