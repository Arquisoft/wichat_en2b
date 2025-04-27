import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from './user-model.mjs';
import userRoutes from './routers/RouterUserCrud.js'; // Adjust path as necessary

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    promises: {
      ...actualFs.promises, // 👈 keep all original promises
      mkdir: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined),
    },
    existsSync: jest.fn().mockReturnValue(true),
    unlinkSync: jest.fn(),
    renameSync: jest.fn(),
  };
});

jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    resize: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toFormat: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-image-data')),
  }));
});

jest.mock('file-type-mime', () => ({
  parse: jest.fn().mockReturnValue({ mime: 'image/png' }),
}));

// Mock fetch for gateway service communications
global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })
);

describe('User Routes', () => {
  let app;
  let mongoServer;
  let mockUser;
  let token;
  let imagesDirPath;

  beforeAll(async () => {
    // Setup MongoDB Memory Server for testing
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Setup Express app
    app = express();
    app.use('/api', userRoutes);

    // Create test user
    mockUser = {
      username: 'testuser',
      password: 'password123',
      role: 'USER',
      profilePicture: ''
    };

    // Setup path for testing profile pictures
    imagesDirPath = path.resolve('public', 'images');

    // Mock path.resolve to always return the imagesDirPath for profile picture paths
    jest.spyOn(path, 'resolve').mockImplementation((...args) => {
      if (args.includes('public') && args.includes('images')) {
        return imagesDirPath;
      }
      return path.join(...args);
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    // Clear all users from the database before each test
    await User.deleteMany({});

    // Create a test user with hashed password
    const user = new User({
      ...mockUser,
      password: bcrypt.hashSync(mockUser.password, 10)
    });
    await user.save();

    // Generate a token for authentication tests
    token = jwt.sign(
        { _id: user._id, role: 'USER' },
        process.env.JWT_SECRET || 'testing-secret',
        { expiresIn: '1h' }
    );
  });

  describe('Authentication Middleware', () => {
    test('should reject requests without authentication token', async () => {
      const response = await request(app)
          .delete(`/api/users`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    test('should reject requests with invalid token', async () => {
      const response = await request(app)
          .delete(`/api/users`)
          .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });

    test('should allow requests with valid token', async () => {
      const response = await request(app)
          .delete(`/api/users`)
          .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'User deleted successfully');
    });
  });

  describe('POST /users', () => {
    test('should create a new user successfully', async () => {
      const newUser = {
        username: 'newuser',
        password: 'newpass123',
        role: 'USER'
      };

      const response = await request(app)
          .post('/api/users')
          .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('username', newUser.username);

      // Password should be hashed
      expect(response.body.password).not.toBe(newUser.password);
    });

    test('should reject duplicate username', async () => {
      const response = await request(app)
          .post('/api/users')
          .send(mockUser);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username already exists');
    });

    test('should reject invalid user data', async () => {
      // Assume User model validates username and password
      const invalidUser = {
        username: 'u', // too short
        password: 'pw', // too short
      };

      const response = await request(app)
          .post('/api/users')
          .send(invalidUser);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /users', () => {
    test('should get all users', async () => {
      const response = await request(app)
          .get('/api/users');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('username', mockUser.username);
    });
  });

  describe('GET /users/:username', () => {
    test('should get a user by username', async () => {
      const response = await request(app)
          .get(`/api/users/${mockUser.username}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', mockUser.username);
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
          .get('/api/users/nonexistentuser');

      expect(response.status).toBe(404);
    });

    test('should handle database errors when getting a user', async () => {
      // Mock mongoose findOne to simulate a database error
      const originalFindOne = mongoose.Model.findOne;
      mongoose.Model.findOne = jest.fn().mockImplementation(() => {
        throw new Error('Database connection error');
      });

      const response = await request(app)
          .get(`/api/users/${mockUser.username}`);

      expect(response.status).toBe(500);

      // Restore the original function
      mongoose.Model.findOne = originalFindOne;
    });
  });

  describe('DELETE /users', () => {
    test('should delete a user', async () => {
      const response = await request(app)
          .delete(`/api/users`)
          .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'User deleted successfully');

      // Check if user was actually deleted
      const deletedUser = await User.findOne({ username: mockUser.username });
      expect(deletedUser).toBeNull();
    });

    test('should return 404 for non-existent user', async () => {
      // First delete the user
      await User.deleteOne({ username: mockUser.username });

      const response = await request(app)
          .delete(`/api/users`)
          .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });

    test('should delete profile picture when user is deleted', async () => {
      // Update user to have a profile picture
      await User.findOneAndUpdate(
          { username: mockUser.username },
          { profilePicture: `images/${mockUser.username}_profile_picture.png` }
      );

      const response = await request(app)
          .delete(`/api/users`)
          .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    test('should handle error when profile picture cannot be deleted', async () => {
      // First set a profile picture
      await User.findOneAndUpdate(
          { username: mockUser.username },
          { profilePicture: `images/${mockUser.username}_profile_picture.png` }
      );

      // Mock existsSync to return true but unlinkSync to throw an error
      fs.existsSync.mockReturnValueOnce(true);
      fs.unlinkSync.mockImplementationOnce(() => {
        throw new Error('Failed to delete file');
      });

      // Mock console.error to check it's called
      console.error = jest.fn();

      const response = await request(app)
          .delete(`/api/users`)
          .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'User deleted successfully');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error deleting profile picture'));
    });
  });

  describe('PATCH /users', () => {
    test('should update username successfully', async () => {
      const newUsername = 'updateduser';

      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({ newUsername });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'User updated successfully');

      // Check if username was actually updated
      const updatedUser = await User.findOne({ username: newUsername });
      expect(updatedUser).not.toBeNull();
      expect(updatedUser.username).toBe(newUsername);
    });

    test('should update password successfully', async () => {
      const oldPassword = mockUser.password;
      const newPassword = 'newpassword123';

      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({ oldPassword, newPassword });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'User updated successfully');

      // Check if password was actually updated
      const updatedUser = await User.findOne({ username: mockUser.username });
      const isNewPasswordCorrect = bcrypt.compareSync(newPassword, updatedUser.password);
      expect(isNewPasswordCorrect).toBe(true);
    });

    test('should reject password update with incorrect old password', async () => {
      const oldPassword = 'wrongpassword';
      const newPassword = 'newpassword123';

      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({ oldPassword, newPassword });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Current password is incorrect');
    });

    test('should update profile picture URL', async () => {
      const profilePicture = 'images/testuser_profile_picture.png';

      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({ profilePicture });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'User updated successfully');

      // Check if profile picture was actually updated
      const updatedUser = await User.findOne({ username: mockUser.username });
      expect(updatedUser.profilePicture).toBe(profilePicture);
    });

    test('should update secret', async () => {
      const secret = 'new-secret-value';

      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({ secret });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'User updated successfully');

      // Check if secret was actually updated
      const updatedUser = await User.findOne({ username: mockUser.username });
      expect(updatedUser.secret).toBe(secret);
    });

    test('should clear profile picture when empty string is provided', async () => {
      // First set a profile picture
      await User.findOneAndUpdate(
          { username: mockUser.username },
          { profilePicture: 'images/testuser_profile_picture.png' }
      );

      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({ profilePicture: '' });

      expect(response.status).toBe(200);

      // Check if profile picture was cleared
      const updatedUser = await User.findOne({ username: mockUser.username });
      expect(updatedUser.profilePicture).toBe('');
    });

    test('should reject username update when new username is too short', async () => {
      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({ newUsername: 'ab' }); // Less than 3 characters

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username must be at least 3 characters');
    });

    test('should reject username update when new username contains whitespace', async () => {
      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({ newUsername: 'test user' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username cannot contain whitespace');
    });

    test('should reject username update when username is the same', async () => {
      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({ newUsername: mockUser.username });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'New username must be different from current username');
    });

    test('should reject username update when new username is already taken', async () => {
      // Create another user
      const anotherUser = {
        username: 'takenusername',
        password: 'password123',
        role: 'USER'
      };

      await new User({
        ...anotherUser,
        password: bcrypt.hashSync(anotherUser.password, 10)
      }).save();

      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({ newUsername: 'takenusername' });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'Username already taken');
    });

    test('should handle database connection errors', async () => {
      // Mock mongoose findOne to simulate a database error
      const originalFindOne = mongoose.Model.findOne;
      mongoose.Model.findOne = jest.fn().mockImplementation(() => {
        const err = new Error("failed to connect");
        err.name = "MongoNetworkError";
        throw err;
      });

      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({ secret: 'new-secret' });

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('error', 'Database unavailable');

      // Restore the original function
      mongoose.Model.findOne = originalFindOne;
    });

    test('should handle validation errors', async () => {
      // Mock mongoose save to simulate a validation error
      const originalSave = mongoose.Model.prototype.save;
      mongoose.Model.prototype.save = jest.fn().mockImplementation(function() {
        const error = new Error('Validation failed');
        error.name = 'ValidationError';
        // Añadimos la estructura típica de errores de validación de Mongoose
        error.errors = {
          someField: {
            message: 'Error de validación en campo específico'
          }
        };
        throw error;
      });

      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({ secret: 'new-secret' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');

      // Restore the original function
      mongoose.Model.prototype.save = originalSave;
    });

    test('should reject password update when new password is too short', async () => {
      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({ oldPassword: mockUser.password, newPassword: 'short' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Password must be at least 6 characters');
    });

    test('should reject password update when new password is the same as old', async () => {
      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({ oldPassword: mockUser.password, newPassword: mockUser.password });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'New password must be different from current password');
    });

    test('should reject password update when new password contains whitespace', async () => {
      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({ oldPassword: mockUser.password, newPassword: 'new password 123' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Password cannot contain whitespace');
    });

    test('should reject profile picture with whitespace', async () => {
      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({ profilePicture: 'invalid url with spaces.jpg' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Profile picture URL cannot contain whitespace');
    });

    test('should reject secret with whitespace', async () => {
      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({ secret: 'secret with spaces' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Secret cannot contain whitespace');
    });

    test('should return 400 when no valid update parameters are provided', async () => {
      const response = await request(app)
          .patch(`/api/users`)
          .set('Authorization', `Bearer ${token}`)
          .send({}); // Empty update

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'No valid update parameters provided');
    });

  });

  describe('POST /user/profile/picture', () => {
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    test('should upload profile picture successfully', async () => {
      const response = await request(app)
          .post('/api/user/profile/picture')
          .set('Authorization', `Bearer ${token}`)
          .send({
            username: mockUser.username,
            image: base64Image
          });

      console.log(response)

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('profilePicture');
      expect(fs.promises.writeFile).toHaveBeenCalled();

      // Check if user's profile was updated
      const updatedUser = await User.findOne({ username: mockUser.username });
      expect(updatedUser.profilePicture).toBe(response.body.profilePicture);
    });

    test('should reject request without image', async () => {
      const response = await request(app)
          .post('/api/user/profile/picture')
          .set('Authorization', `Bearer ${token}`)
          .send({
            username: mockUser.username
          });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'No image provided.');
    });


    test('should handle invalid file type', async () => {
      // Mock parse to return an invalid mime type
      require('file-type-mime').parse.mockReturnValueOnce({ mime: 'application/pdf' });

      const response = await request(app)
          .post('/api/user/profile/picture')
          .set('Authorization', `Bearer ${token}`)
          .send({
            username: mockUser.username,
            image: base64Image
          });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid file type. Only JPEG, PNG and WebP allowed.');
    });

    test('should create images directory if it does not exist', async () => {
      // Mock existsSync to return false for directory check
      fs.existsSync.mockReturnValueOnce(false);

      const response = await request(app)
          .post('/api/user/profile/picture')
          .set('Authorization', `Bearer ${token}`)
          .send({
            username: mockUser.username,
            image: base64Image
          });

      expect(response.status).toBe(200);
      expect(fs.promises.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    test('should handle file type detection failure', async () => {
      // Mock parse to return null (file type detection failed)
      require('file-type-mime').parse.mockReturnValueOnce(null);

      const response = await request(app)
          .post('/api/user/profile/picture')
          .set('Authorization', `Bearer ${token}`)
          .send({
            username: mockUser.username,
            image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
          });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid file type. Only JPEG, PNG and WebP allowed.');
    });

    test('should handle error when processing image', async () => {
      // Mock sharp to throw an error
      require('sharp').mockImplementationOnce(() => {
        return {
          resize: jest.fn().mockReturnThis(),
          toFormat: jest.fn().mockReturnThis(),
          toBuffer: jest.fn().mockRejectedValue(new Error('Error processing image'))
        };
      });

      const response = await request(app)
          .post('/api/user/profile/picture')
          .set('Authorization', `Bearer ${token}`)
          .send({
            username: mockUser.username,
            image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
          });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Error uploading profile picture');
    });
  });

  describe('GET /user/profile/picture', () => {
    test('should get profile picture URL', async () => {
      // First set a profile picture
      const profilePicture = 'images/testuser_profile_picture.png';
      const user = await User.findOneAndUpdate(
          { username: mockUser.username },
          { profilePicture }
      );

      const response = await request(app)
          .get(`/api/user/profile/picture/${user._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('profilePicture', profilePicture);
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
          .get('/api/user/profile/picture/nonexistentuser');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });
  });

  describe('POST /users/by-ids', () => {
    const createValidId = () => new mongoose.Types.ObjectId();
    // Test 1: Debería devolver usuarios encontrados por sus IDs
    test('debería obtener usuarios por IDs válidos', async () => {
      // Crear usuarios de prueba
      const user1 = await User.create({ username: 'Usuario1', role: 'USER', password: 'testPassword' }); //NOSONAR
      const user2 = await User.create({ username: 'Usuario2', role: 'USER', password: 'testPassword' }); //NOSONAR
      
      const userIds = [user1._id.toString(), user2._id.toString()];
      
      const response = await request(app)
        .post('/api/users/by-ids')
        .send({ users: userIds })
        .expect(200);
      
      expect(response.body).toHaveLength(2);
      expect(response.body[0]._id).toBe(user1._id.toString());
      expect(response.body[1]._id).toBe(user2._id.toString());
    });
    
    // Test 2: Debería manejar el caso de IDs inexistentes
    test('debería manejar IDs que no existen en la base de datos', async () => {
      const nonExistentId = createValidId().toString();
      
      const response = await request(app)
        .post('/api/users/by-ids')
        .send({ users: [nonExistentId] })
        .expect(200);
      
      expect(response.body).toHaveLength(0);
    });
    
    // Test 3: Debería devolver un subconjunto de usuarios cuando algunos IDs existen y otros no
    test('debería devolver solo los usuarios que existen cuando se envían IDs mixtos', async () => {
      const user = await User.create({ username: 'Usuario1', role: 'USER', password: 'testPassword' }); //NOSONAR
      
      const nonExistentId = createValidId().toString();
      const userIds = [user._id.toString(), nonExistentId];
      
      const response = await request(app)
        .post('/api/users/by-ids')
        .send({ users: userIds })
        .expect(200);
      
      expect(response.body).toHaveLength(1);
      expect(response.body[0]._id).toBe(user._id.toString());
    });
    
    // Test 4: Debería devolver error 400 si no se envía un array de usuarios
    test('debería devolver error 400 si no se proporciona un array de usuarios', async () => {
      await request(app)
        .post('/api/users/by-ids')
        .send({})
        .expect(400);
      
      await request(app)
        .post('/api/users/by-ids')
        .send({ users: 'no-es-un-array' })
        .expect(400);
    });
    
    // Test 5: Debería filtrar IDs no válidos
    test('debería filtrar IDs no válidos y solo buscar los válidos', async () => {
      const user = await User.create({ username: 'Usuario1', role: 'USER', password: 'testPassword' }); //NOSONAR
      
      const userIds = [user._id.toString(), null, undefined, '', 123];
      
      const response = await request(app)
        .post('/api/users/by-ids')
        .send({ users: userIds })
        .expect(200);
      
      expect(response.body).toHaveLength(1);
      expect(response.body[0]._id).toBe(user._id.toString());
    });
    
    // Test 6: Debería manejar errores internos del servidor
    test('debería devolver un error 500 cuando ocurre una excepción', async () => {
      // Mock de User.find para que lance un error
      const originalFind = User.find;
      User.find = jest.fn().mockImplementation(() => {
        throw new Error('Error simulado de base de datos');
      });
      
      await request(app)
        .post('/api/users/by-ids')
        .send({ users: [createValidId().toString()] })
        .expect(500);
      
      // Restaurar la implementación original
      User.find = originalFind;
    });
  });

  describe('GET /users/id/:id', () => {
    test('should get user by valid ID', async () => {
      const user = await User.create({ username: 'Usuario1', role: 'USER', password: 'testPassword' }); //NOSONAR
      const response = await request(app)
        .get(`/api/users/id/${user._id}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id', user._id.toString());
      expect(response.body).toHaveProperty('username', user.username);
    });
    
    test('should return 404 for non-existent user ID', async () => {
      // ID con formato válido pero que no existe en la BD
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/users/id/${nonExistentId}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });
    
    test('should return 404 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/users/id/invalidIdFormat');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });
    
    test('should handle database errors properly', async () => {
      const user = await User.create({ username: 'Usuario1', role: 'USER', password: 'testPassword' }); //NOSONAR
      // Mock para simular un error en la base de datos
      const originalFindById = User.findById;
      User.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database connection error');
      });
      
      const response = await request(app)
        .get(`/api/users/id/${user._id}`);
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Internal Server Error');
      
      // Restaurar la función original
      User.findById = originalFindById;
    });
  });
});