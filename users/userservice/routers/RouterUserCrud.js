import express from 'express';
import User from '../user-model.js';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { parse } from 'file-type-mime';

const router = express.Router();
router.use(express.json());
const gatewayServiceUrl = process.env.GATEWAY_SERVICE_URL || 'http://gatewayservice:8000'; // NOSONAR

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

// Delete a user by username
router.delete('/users/:username', async (req, res) => {
    try {
        const user = await User.findOneAndDelete({username: req.params.username.toString() });
        if (!user) {
            return res.status(404).send();
        }
        res.status(200).send(user);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Update a user's username, update game records, and generate a new JWT
router.patch('/users/:username', async (req, res) => {
    try {
        const { username } = req.params; // Old username
        const { newUsername } = req.body;

        if (!newUsername || newUsername.length < 3) {
            return res.status(400).json({ error: "Username must be at least 3 characters" });
        }

        // Verify if the new username is available
        const existingUser = await User.findOne({ username: newUsername.toString() });
        if (existingUser) return res.status(404).json({ error: "Username already taken" });

        const user = await User.findOne({ username: username.toString() });
        if (!user) return res.status(500).json({ error: "User not found" });

        const oldUsername = user.username;

        // Update all game records: change user_id from oldUsername to newUsername
        const payload = { newUsername: newUsername };

        const gameResponse = await fetch(`${gatewayServiceUrl}/game/update/${oldUsername}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Origin: process.env.USER_SERVICE_URL || 'http://localhost:8001',
            },
            body: JSON.stringify(payload),
        });
        
        if (!gameResponse.ok) {
            return res.status(404).json({ error: "Error updating the game history to the new username" });
        }

        // Update the username in the users table
        user.username = newUsername;

        if(user.profilePicture != null || user.profilePicture != undefined) {
            user.profilePicture = user.profilePicture.replace(oldUsername, newUsername); 
        } else {
            user.profilePicture = `public/images/${newUsername}_profile_picture.png`;
        }

        await user.save();
        
        // Generate a new JWT with the updated username
        const jwt = require('jsonwebtoken');
        const newToken = jwt.sign(
            { username: user.username, role: user.role },
            process.env.JWT_SECRET || 'testing-secret',
            { expiresIn: '1h' }
        );

        res.status(200).json({ message: "Username updated successfully", token: newToken });
    } catch (error) {
        if (error.name === "MongoNetworkError" || error.name == "MongoNotConnectedError" ||  error.name === "MongooseServerSelectionError" ||
            error.message?.includes("failed to connect") || error.message?.includes("ECONNREFUSED")) {
            return res.status(500).json({ error: "Database unavailable" });
        }

        console.error("Error updating username:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Update a user's password
router.patch('/users/:username/password', async (req, res) => {
    try {
        const { username } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        const user = await User.findOne({ username: username.toString() });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        user.password = bcrypt.hashSync(newPassword, 10);
        await user.save();

        res.status(200).json({ message: "Password updated successfully" });

    } catch (error) {
        if (error.name === "MongoNetworkError" || error.name == "MongoNotConnectedError" ||  error.name === "MongooseServerSelectionError" ||
            error.message?.includes("failed to connect") || error.message?.includes("ECONNREFUSED")) {
            return res.status(500).json({ error: "Database unavailable" });
        }

        console.error("Error updating password:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post('/user/profile/picture', async (req, res) => {
    const { image, username } = req.body;

    if (!image || !username) {
        return res.status(400).json({ error: "No image or username provided." });
    }

    try {
        const user = await User.findOne({ username: username.toString() });
        if (!user) return res.status(404).json({ error: "User not found" });

        const __dirname = path.resolve();
        const imagesDir = path.resolve(__dirname, 'public', 'images');

        // Clean the filename to prevent directory traversal attacks
        const sanitizeFilename = (filename) => {
            return filename.replace(/[^a-zA-Z0-9._-]/g, '').replace(/\.\./g, '');
        };

        // Define the old and new file paths for the profile picture
        const sanitizedUsername = sanitizeFilename(username);
        const oldFilePath = path.join(imagesDir, `${sanitizedUsername}_profile_picture.png`);
        const newFilePath = path.join(imagesDir, `${sanitizedUsername}_profile_picture.png`);

        // Verify that the paths are within the allowed directory
        if (!path.resolve(oldFilePath).startsWith(imagesDir)) {
            console.log(`Access Denied: ${oldFilePath} is outside of images folder`);
            throw new Error("Access denied to files outside the images folder");
        }
        
        if (!path.resolve(newFilePath).startsWith(imagesDir)) {
            console.log(`Access Denied: ${newFilePath} is outside of images folder`);
            throw new Error("Access denied to files outside the images folder");
        }

        // Process the base64 image
        const buffer = Buffer.from(image, 'base64');
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

        // Detecta el MIME type usando file-type-mime
        const fileTypeResult = parse(arrayBuffer);
        if (!fileTypeResult || !['image/jpeg', 'image/png'].includes(fileTypeResult.mime)) {
            return res.status(400).json({ error: "Invalid file type. Only JPEG and PNG allowed." });
        }

        // Use sharp to process the image (resize and convert to PNG)
        const processedBuffer = await sharp(buffer)
            .resize({ width: 500, height: 500, fit: 'inside' })
            .toFormat('png')
            .toBuffer();

        // Assure the directory exists
        if (!fs.existsSync(imagesDir)) {
            await fs.promises.mkdir(imagesDir, { recursive: true });
        }

        // Save the processed image to the file system
        await fs.promises.writeFile(newFilePath, processedBuffer);

        // Generate the URL for the image
        const imageUrl = `images/${sanitizedUsername}_profile_picture.png`;

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

router.get('/user/profile/picture/:username', async (req, res) => {
    const { username } = req.params;

    try {
        const user = await User.findOne({ username: username.toString() });
        if (!user) return res.status(404).json({ error: "User not found" });

        const profilePictureUrl = `${gatewayServiceUrl}/${user.profilePicture}`;
        res.status(200).json({ profilePicture: profilePictureUrl });

    } catch (error) {
        console.error("Error getting profile picture:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }    
});

export default router;