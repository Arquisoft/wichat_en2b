import express from 'express';
import User from '../user-model.mjs';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { parse } from 'file-type-mime';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const router = express.Router();
router.use(express.json());
const gatewayServiceUrl = process.env.GATEWAY_SERVICE_URL || 'http://gatewayservice:8000'; // NOSONAR

// Authentication middleware
const authenticateUser = async (req, res, next) => {
    try {
        // Extract authentication token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const token = authHeader.split(' ')[1];
        let decodedToken;

        try {
            decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'testing-secret');
        } catch (err) {
            console.error("Token verification error:", err);
            return res.status(401).json({ error: "Invalid or expired token" });
        }

        // Add the decoded token to the request object
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Authentication error:", error);
        res.status(500).json({ error: "Authentication error" });
    }
};


// Create a new user
router.post('/users', async (req, res) => {
    try {
        const user = new User({
            ...req.body
        });
        const errors = user.validateSync();

        if (errors) {
            return res.status(400).send(errors);
        }

        const existingUser = await User.findOne({ username: req.body.username.toString() });

        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        user.password = bcrypt.hashSync(req.body.password, 10);

        await user.save();

        res.status(201).send(user);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).send(users);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Get a user by username
router.get('/users/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username.toString() });
        if (!user) {
            return res.status(404).send();
        }
        res.status(200).send(user);
    } catch (error) {
        res.status(500).send(error);
    }
});

router.post('/users/by-ids', async (req, res) => {
    try {
        const { users } = req.body;
        if (!users || !Array.isArray(users)) {
            return res.status(400).json({ error: 'Request body must contain a "users" array' });
        }

        const validIds = users
            .filter(id => id && (typeof id === 'string' || id instanceof mongoose.Types.ObjectId))
            .filter(id => mongoose.Types.ObjectId.isValid(id));
    
        if (validIds.length === 0) {
            return res.status(200).json([]);
        }
        const foundUsers = await User.find({ _id: { $in: validIds } });

        res.status(200).json(foundUsers);
    } catch (error) {
        console.error('Error fetching users by IDs:', error);
        res.status(500).send();
    }
});

router.get('/users/id/:id', async (req, res) => {
    const userId = req.params.id;
  
    // Validar formato del ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(404).send({ error: "User not found" });
    }
  
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).send({ error: "User not found" });
      }
      return res.status(200).send(user);
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      return res.status(500).send({ error: "Internal Server Error" });
    }
  });

// Delete a user by username
router.delete('/users', authenticateUser, async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        // Delete profile picture if it exists
        if (user.profilePicture) {
            const publicDir = path.resolve('public', 'images');
            const safeUsername = path.basename(userId);
            const profilePicturePath = path.join(publicDir, `${safeUsername}_profile_picture.png`);

            if (fs.existsSync(profilePicturePath)) {
                try {
                    fs.unlinkSync(profilePicturePath);
                } catch (err) { // NOSONAR
                    console.error(`Error deleting profile picture`);                  
                }
            }
        }

        res.status(200).send({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// Update a user's information
router.patch('/users', authenticateUser, async (req, res) => {
    try {
        const userId = req.user._id;

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const oldUsername = user.username;
        let updateMade = false;

        // Handle username update
        if (req.body.newUsername) {
            const { newUsername } = req.body;

            // Validate new username
            if (newUsername.length < 3) {
                return res.status(400).json({ error: "Username must be at least 3 characters" });
            }

            if (/\s/.test(newUsername)) {
                return res.status(400).json({ error: "Username cannot contain whitespace" });
            }

            // Check if username is different
            if (newUsername === oldUsername) {
                return res.status(400).json({ error: "New username must be different from current username" });
            }

            // Verify if the new username is available
            const existingUser = await User.findOne({ username: newUsername.toString() });
            if (existingUser) {
                return res.status(409).json({ error: "Username already taken" });
            }

            // Update the username
            user.username = newUsername;
            updateMade = true;
        }

        // Handle password update
        if (req.body.oldPassword && req.body.newPassword) {
            const { oldPassword, newPassword } = req.body;

            // Verify old password
            const isPasswordCorrect = bcrypt.compareSync(oldPassword, user.password);
            if (!isPasswordCorrect) {
                return res.status(401).json({ error: "Current password is incorrect" });
            }

            // Validate new password
            if (newPassword.length < 6) {
                return res.status(400).json({ error: "Password must be at least 6 characters" });
            }

            if (newPassword === oldPassword) {
                return res.status(400).json({ error: "New password must be different from current password" });
            }

            if (/\s/.test(newPassword)) {
                return res.status(400).json({ error: "Password cannot contain whitespace" });
            }

            // Update password
            user.password = bcrypt.hashSync(newPassword, 10);
            updateMade = true;
        }

        // Handle profile picture update (URL only, not the actual upload)
        if (req.body.profilePicture !== undefined) {
            if (req.body.profilePicture === "") {
                user.profilePicture = "";
            } else if (!/\s/.test(req.body.profilePicture)) {
                user.profilePicture = req.body.profilePicture;
            } else {
                return res.status(400).json({ error: "Profile picture URL cannot contain whitespace" });
            }
            updateMade = true;
        }

        // Handle secret update
        if (req.body.secret !== undefined) {
            if (req.body.secret === "") {
                user.secret = "";
            } else if (!/\s/.test(req.body.secret)) {
                user.secret = req.body.secret;
            } else {
                return res.status(400).json({ error: "Secret cannot contain whitespace" });
            }
            updateMade = true;
        }

        // Make sure at least one change was requested
        if (!updateMade) {
            return res.status(400).json({ error: "No valid update parameters provided" });
        }

        // Save the updated user
        await user.save();

        // Prepare response
        const response = { message: "User updated successfully" };

        res.status(200).json(response);
    } catch (error) {
        // Handle database connection errors
        if (error.name === "MongoNetworkError" ||
            error.name === "MongoNotConnectedError" ||
            error.name === "MongooseServerSelectionError" ||
            error.message?.includes("failed to connect") ||
            error.message?.includes("ECONNREFUSED")) {
            return res.status(503).json({ error: "Database unavailable" });
        }

        // Handle validation errors from Mongoose
        if (error.name === "ValidationError") {
            return res.status(400).json({ error: error.message });
        }

        console.error("Error updating user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Upload profile picture
router.post('/user/profile/picture', authenticateUser, async (req, res) => {
    try {
        const { image, username } = req.body;
        const userID = req.user._id;

        if (!image) {
            return res.status(400).json({ error: "No image provided." });
        }

        const user = await User.findById(userID);
        if (!user) return res.status(404).json({ error: "User not found" });

        const __dirname = path.resolve();
        const imagesDir = path.resolve(__dirname, 'public', 'images');

        const filePath = path.join(imagesDir, `${userID}_profile_picture.png`);
        // Verify that the path is within the allowed directory
        if (!path.resolve(filePath).startsWith(imagesDir)) {
            console.log(`Access Denied: ${username} is outside of images folder`);
            throw new Error("Access denied to files outside the images folder");
        }
       
        // Process the base64 image
        const buffer = Buffer.from(image, 'base64');
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

        // Detect the MIME type using file-type-mime
        const fileTypeResult = parse(arrayBuffer);
        if (!fileTypeResult || !['image/jpeg', 'image/png'].includes(fileTypeResult.mime)) {
            return res.status(400).json({ error: "Invalid file type. Only JPEG and PNG allowed." });
        }

        // Use sharp to process the image (resize and convert to PNG)
        const processedBuffer = await sharp(buffer)
            .resize({ width: 500, height: 500, fit: 'inside' })
            .toFormat('png')
            .toBuffer();

        // Ensure the directory exists
        if (!fs.existsSync(imagesDir)) {
            await fs.promises.mkdir(imagesDir, { recursive: true });
        }

        // Save the processed image to the file system
        await fs.promises.writeFile(filePath, processedBuffer);

        // Generate the URL for the image
        const imageUrl = `images/${userID}_profile_picture.png`;

        // Update the user's profile with the new image URL
        user.profilePicture = imageUrl;
        await user.save();

        // Respond with the image URL
        res.status(200).json({ profilePicture: imageUrl });

    } catch (error) {
        console.error('Error uploading profile picture:', error);
        res.status(500).json({ error: 'Error uploading profile picture' });
    }
});

// Get profile picture
router.get('/user/profile/picture/:id', async (req, res) => {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: "User not found" });
    }

    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: "User not found" });
        res.status(200).json({ profilePicture: user.profilePicture });

    } catch (error) {
        console.error("Error getting profile picture:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;