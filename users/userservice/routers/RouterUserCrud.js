const express = require('express');
const router = express.Router();
const User = require('../user-model');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

router.use(express.json());
const gatewayServiceUrl = process.env.GATEWAY_SERVICE_URL || 'http://gatewayservice:8000'; // NOSONAR
const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:8001'// NOSONAR

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
        await user.save();

        // Find new user by new username
        const updatedUser = await User.findOne({ username: newUsername.toString() });        

        if (!updatedUser) {
            return res.status(500).json({ error: "Updated user not found" });
        }
        
        // Generate a new JWT with the updated username
        const jwt = require('jsonwebtoken');
        const newToken = jwt.sign(
            { username: user.username, role: user.role },
            process.env.JWT_SECRET || 'testing-secret',
            { expiresIn: '1h' }
        );

        res.status(200).json({ message: "Username updated successfully", token: newToken });
    } catch (error) {
        if (error.name === "MongoNetworkError") {
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
        if (error.name === "MongoNetworkError") {
            return res.status(500).json({ error: "Database unavailable" });
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post('/user/profile/picture', async (req, res) => {
    const { image, username } = req.body;

    // Verificar si la imagen y el nombre de usuario fueron proporcionados
    if (!image || !username) {
        return res.status(400).json({ error: "No image or username provided." });
    }

    try {
        // Buscar el usuario en la base de datos
        const user = await User.findOne({ username: username.toString() });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const imagesDir = './public/images';

        // Sanitizar el nombre de archivo para evitar problemas con nombres no válidos
        const sanitizeFilename = (filename) => filename.replace(/[^a-zA-Z0-9_-]/g, '').replace(/\.\./g, '');

        // Definir la ruta para el archivo antiguo (si existe) y la nueva imagen
        const sanitizedUsername = sanitizeFilename(username);
        const oldFilePath = path.join(imagesDir, `${sanitizedUsername}_profile_picture.png`);
        const newFilePath = path.join(imagesDir, `${sanitizedUsername}_profile_picture.png`);

        // Verificar que las rutas estén dentro del directorio permitido
        if(!oldFilePath.startsWith(path.resolve(imagesDir))) {
            throw new Error("Access denied to files outside the images folder");
        }

        if (!newFilePath.startsWith(path.resolve(imagesDir))) {
            throw new Error("Access denied to files outside the images folder");
        }

        // Procesar la imagen base64
        const buffer = Buffer.from(image, 'base64');

        // Limitar el tamaño máximo de la imagen a 5MB
        const MAX_SIZE = 5 * 1024 * 1024;
        if (buffer.length > MAX_SIZE) {
            return res.status(400).json({ error: "Image size exceeds the limit of 5MB." });
        }

        // Validar el tipo MIME para asegurar que es una imagen
        const fileType = (await import('file-type')).fileTypeFromBuffer;
        const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/gif'];

        const mimeType = (await fileType(buffer))?.mime;
        if (!mimeType || !allowedMimeTypes.includes(mimeType)) {
            return res.status(400).json({ error: "Image format not allowed." });
        }

        // Usar sharp para procesar la imagen (redimensionar y convertir a PNG)
        const processedBuffer = await sharp(buffer)
            .resize({ width: 500, height: 500, fit: 'inside' })
            .toFormat('png')
            .toBuffer();

        // Asegurar que el directorio de imágenes exista
        await fs.promises.mkdir(imagesDir, { recursive: true });

        // Guardar la imagen procesada
        await fs.promises.writeFile(newFilePath, processedBuffer);

        // Generar la URL de la imagen
        const imageUrl = `${userServiceUrl}/images/${sanitizedUsername}_profile_picture.png`;

        // Actualizar el perfil del usuario con la nueva URL de la imagen
        user.profilePicture = imageUrl;
        await user.save();

        // Responder con la URL de la imagen
        res.status(200).json({ profilePicture: imageUrl });

    } catch (error) {
        console.error('Error uploading profile picture:', error);
        res.status(500).json({ error: 'Error uploading profile picture' });
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