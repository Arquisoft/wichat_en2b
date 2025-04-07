import express from 'express';
import User from '../user-model.js';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { parse } from 'file-type-mime';
import jwt from 'jsonwebtoken';

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

// Delete a user by username with authentication
router.delete('/users/:username', async (req, res) => {
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
            return res.status(401).json({ error: "Invalid or expired token" });
        }

        // Ensure user can only delete their own profile
        const { username } = req.params;
        if (decodedToken.username !== username) {
            return res.status(403).json({ error: "You can only delete your own profile" });
        }

        const user = await User.findOneAndDelete({ username: username.toString() });
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        // Delete profile picture if it exists
        if (user.profilePicture) {
            const publicDir = path.resolve('public', 'images');
            const safeUsername = path.basename(username);
            const profilePicturePath = path.join(publicDir, `${safeUsername}_profile_picture.png`);

            if (fs.existsSync(profilePicturePath)) {
                fs.unlinkSync(profilePicturePath);
            }
        }

        res.status(200).send({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});

// Update a user's information
router.patch('/users/:username', async (req, res) => {
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
            return res.status(401).json({ error: "Invalid or expired token" });
        }

        // Ensure user can only edit their own profile
        const { username } = req.params;
        if (decodedToken.username !== username) {
            return res.status(403).json({ error: "You can only update your own profile" });
        }

        // Find the user
        const user = await User.findOne({ username: username.toString() });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const oldUsername = user.username;
        let updateMade = false;
        let newToken = null;

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
            console.log(existingUser)
            if (existingUser) {
                return res.status(409).json({ error: "Username already taken" });
            }

            // Update game records through gateway service
            const payload = { newUsername: newUsername };
            try {
                const gameResponse = await fetch(`${gatewayServiceUrl}/game/update/${oldUsername}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Origin: process.env.USER_SERVICE_URL || 'http://localhost:8001',
                    },
                    body: JSON.stringify(payload),
                });

                if (!gameResponse.ok) {
                    return res.status(502).json({ error: "Error updating game history with new username" });
                }
            } catch (error) {
                return res.status(502).json({ error: "Failed to communicate with game service" });
            }

            // Handle profile picture renaming
            if (user.profilePicture) {
                const publicDir = path.resolve('public', 'images');

                const safeOldUsername = path.basename(oldUsername);
                const safeNewUsername = path.basename(newUsername);

                // Construct secure absolute paths
                const oldProfilePicturePath = path.join(publicDir, `${safeOldUsername}_profile_picture.png`);
                const newProfilePicturePath = path.join(publicDir, `${safeNewUsername}_profile_picture.png`);

                // Check if the old profile picture exists and rename it
                if (fs.existsSync(oldProfilePicturePath)) {
                    fs.renameSync(oldProfilePicturePath, newProfilePicturePath);
                    user.profilePicture = `images/${safeNewUsername}_profile_picture.png`;
                } else {
                    console.error("Profile picture not found.");
                }
            } else {
                user.profilePicture = `public/images/${newUsername}_profile_picture.png`;
            }

            // Update the username
            user.username = newUsername;
            updateMade = true;

            // Generate a new JWT with the updated username
            newToken = jwt.sign(
                { username: user.username, role: 'USER' },
                process.env.JWT_SECRET || 'testing-secret',
                { expiresIn: '1h' }
            );
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
        if (newToken) {
            response.token = newToken;
        }

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
        res.status(200).json({ profilePicture: user.profilePicture });

    } catch (error) {
        console.error("Error getting profile picture:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }    
});

export default router;