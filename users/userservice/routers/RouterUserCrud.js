const express = require('express');
const router = express.Router();
const User = require('../user-model');
const bcrypt = require('bcrypt');
const multer = require('multer');

const gatewayServiceUrl = process.env.GATEWAY_SERVICE_URL || 'http://gatewayservice:8000'; // NOSONAR

// Create a new user
router.post('/users', async (req, res) => {
    try {
        const user = new User({
            ...req.body
        });
        const errors = user.validateSync();

        if (errors) {
            console.log(errors);
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

        if(!username) {
            return res.status(400).json({ error: "Username is required" });
        }

        const user = await User.findOne({ username: username.toString() });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Verify if the new username is available
        const existingUser = await User.findOne({ username: newUsername.toString() });
        if (existingUser) return res.status(400).json({ error: "Username already taken" });

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
        console.error("Error updating username:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Update a user's password
router.patch('/users/:username/password', async (req, res) => {
    try {
        const { username } = req.params;
        const { newPassword } = req.body;

        if (!username) {
            return res.status(400).json({ error: "Username is required" });
        }

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
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/user/profile/picture', upload.single('file'), async (req, res) => {
    const { username } = req.body;
    const picture = req.file;

    if (!username) {
        return res.status(400).json({ error: "Username required" });
    }

    if (!picture) {
        return res.status(400).json({ error: "Picture required" });
    }

    try {
        // Aquí puedes guardar el archivo en un sistema de almacenamiento (por ejemplo, S3, disco local, etc.)
        // Por ahora, simplemente devolvemos el archivo como respuesta para verificar que se recibió correctamente.
        console.log(`Archivo recibido: ${file.originalname}, tamaño: ${file.size} bytes`);
/*
        // Simular guardar la imagen en la base de datos o almacenamiento
        const profilePictureUrl = `/uploads/${file.originalname}`; // Ruta simulada

        // Update the user's profile picture in the database
        const user = await User.findOne({ username: username.toString() });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Save the image URL in the user
        user.profilePicture = profilePictureUrl; 
        await user.save();
*/
        res.status(200).json({ 
            message: "Profile picture uploaded successfully", 
            profilePicture: profilePictureUrl 
        });

    } catch (error) {
        console.error("Error uploading profile picture:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }    
});


router.get('/user/profile/picture/:username', async (req, res) => {
    const { username } = req.params;

    if (!username) {
        return res.status(400).json({ error: "Username required" });
    }

    try {
        const user = await User.findOne({ username: username.toString() });
        if (!user) return res.status(404).json({ error: "User not found" });

        const profilePictureUrl = user.profilePicture; 

        res.status(200).json({ profilePicture: profilePictureUrl });

    } catch (error) {
        console.error("Error getting profile picture:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }    
});

module.exports = router;