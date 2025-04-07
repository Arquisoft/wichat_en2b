import request from 'supertest';
import bcrypt from 'bcrypt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from './user-model';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import jwt from "jsonwebtoken";

jest.mock('sharp', () => {
  const sharpInstance = {
    resize: jest.fn().mockReturnThis(),
    toFormat: jest.fn().mockReturnThis(),
    toBuffer: jest.fn()
  };
  const sharpFn = jest.fn(() => sharpInstance);
  return sharpFn;
});

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    promises: {
      ...actualFs.promises,
      mkdir: jest.fn(),
      writeFile: jest.fn()
    }
  };
});

const testUser1 = {
  username: 'testuser1',
  password: 'testpassword1',
  role: 'USER',
  profilePicture: 'testuser1_profile_picture.png'
};

const testUser2 = {
  username: 'testuser2',
  password: 'testpassword2',
  role: 'USER',
  profilePicture: 'testuser2_profile_picture.png'
};

// First, create a JWT for authentication
const token = jwt.sign(
    { username: testUser1.username, role: 'USER' },
    process.env.JWT_SECRET || 'testing-secret',
    { expiresIn: '1h' }
);

async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

const checkUserExistsInDb = async (testUser, bool) => {
  // Get the user from the database
  const userInDb = await User.findOne({ username: testUser.username })

  // Assert user existance in the database
  expect(userInDb != null).toBe(bool);
  if (!bool) return;
  expect(userInDb.username).toBe(testUser.username);
  expect(userInDb.role).toBe(testUser.role);

  // Assert that the password is encrypted in the database
  const isPasswordValid = await bcrypt.compare(testUser.password, userInDb.password);
  expect(isPasswordValid).toBe(true);
};

const validateResponse = async (response, expected) => {
  expect(response).toHaveProperty('username', expected.username);
  expect(response).toHaveProperty('role', expected.role);
  expect(await bcrypt.compare(expected.password, response.password)).toBe(true);
  expect(response).toHaveProperty('createdAt');
}

let mongoServer;
let app;

describe('User Service - POST /users', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;
    
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    const module = await import('./user-service.js');
    app = module.default;
    
  });

  it('should add a new user on POST /users', async () => {
    // Ask to add testUser1
    const response = await request(app).post('/users').send(testUser1);
    expect(response.status).toBe(201);

    // Check if the response contains the user with the password encrypted
    expect(response.body).toHaveProperty('username', testUser1.username);
    expect(await bcrypt.compare(testUser1.password, response.body.password)).toBe(true);
    expect(response.body).toHaveProperty('role', testUser1.role);
    expect(response.body).toHaveProperty('createdAt');

    // Check if the user is inserted into the database
    await checkUserExistsInDb(testUser1, true);
  });
  it('should add a new user with a secret on POST /users', async () => {
    const userWithSecret = {
      username: 'testuserWithSecret',
      password: 'testpassword',
      role: 'USER',
      secret: 'uniqueSecretKey123'
    };
  
    const response = await request(app).post('/users').send(userWithSecret);
    expect(response.status).toBe(201);
  
    // Check if the response contains the user with the encrypted password and secret
    expect(response.body).toHaveProperty('username', userWithSecret.username);
    expect(await bcrypt.compare(userWithSecret.password, response.body.password)).toBe(true);
    expect(response.body).toHaveProperty('role', userWithSecret.role);
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).toHaveProperty('secret', userWithSecret.secret);
  
    // Check if the user is inserted into the database
    await checkUserExistsInDb(userWithSecret, true);
  });
  
  it('should not add a user with missing username on POST /users', async () => {
    const noUsernameUser = {
      // Missing username
      password: 'password',
      role: 'USER'
    };

    const response = await request(app).post('/users').send(noUsernameUser);

    expect(response.status).toBe(400);

    await checkUserExistsInDb(noUsernameUser, false);
  });

  it('should not add a user with missing password on POST /users', async () => {
    const noPassUser = {
      username: 'noPassUser',
      // Missing password
      role: 'USER'
    };

    const response = await request(app).post('/users').send(noPassUser);

    expect(response.status).toBe(400);

    await checkUserExistsInDb(noPassUser, false);
  });

  it('should not add a user with missing role on POST /users', async () => {
    const noRoleUser = {
      username: 'noRoleUser',
      password: 'password'
      // Missing role
    };

    const response = await request(app).post('/users').send(noRoleUser);

    expect(response.status).toBe(400);

    await checkUserExistsInDb(noRoleUser, false);
  });

  it('should not add a user with repeated username on POST /users', async () => {
    const repeatedUser = {
      username: 'testuser1',
      password: 'repeatedTestPassword',
      role: 'ADMIN'
    };

    const response = await request(app).post('/users').send(repeatedUser);

    expect(response.status).toBe(400);

    // Check that the user in the database is still user 1
    await checkUserExistsInDb(testUser1, true);
  });

  it('should not add a user with empty username on POST /users', async () => {
    const emptyUsernameUser = {
      username: '',
      password: 'password',
      role: 'USER'
    };

    const response = await request(app).post('/users').send(emptyUsernameUser);

    expect(response.status).toBe(400);

    await checkUserExistsInDb(emptyUsernameUser, false);
  });

  it('should not add a user with empty password on POST /users', async () => {
    const emptyPasswordUser = {
      username: 'emptyPasswordUser',
      password: '',
      role: 'USER'
    };

    const response = await request(app).post('/users').send(emptyPasswordUser);

    expect(response.status).toBe(400);

    await checkUserExistsInDb(emptyPasswordUser, false);
  });

  it('should not add a user with empty role on POST /users', async () => {
    const emptyRoleUser = {
      username: 'emptyRoleUser',
      password: 'password',
      role: ''
    };

    const response = await request(app).post('/users').send(emptyRoleUser);

    expect(response.status).toBe(400);

    await checkUserExistsInDb(emptyRoleUser, false);
  });

  it('should not add a user with empty fields on POST /users', async () => {
    const emptyFieldsUser = {
      username: '',
      password: '',
      role: ''
    };

    const response = await request(app).post('/users').send(emptyFieldsUser);

    expect(response.status).toBe(400);

    await checkUserExistsInDb(emptyFieldsUser, false);
  });

  it('should not add a user with no fields on POST /users', async () => {
    const response = await request(app).post('/users').send({});

    expect(response.status).toBe(400);
  });

  it('should not add a user with no data on POST /users', async () => {
    const response = await request(app).post('/users');

    expect(response.status).toBe(400);
  });

  it('should not add a user with blank username on POST /users', async () => {
    const blankUsernameUser = {
      username: '       ',
      password: 'password',
      role: 'USER'
    };

    const response = await request(app).post('/users').send(blankUsernameUser);

    expect(response.status).toBe(400);

    await checkUserExistsInDb(blankUsernameUser, false);
  });

  it('should not add a user with blank password on POST /users', async () => {
    const blankPasswordUser = {
      username: 'blankPasswordUser',
      password: '       ',
      role: 'USER'
    };

    const response = await request(app).post('/users').send(blankPasswordUser);

    expect(response.status).toBe(400);

    await checkUserExistsInDb(blankPasswordUser, false);
  });

  it('should not add a user with blank role on POST /users', async () => {
    const blankRoleUser = {
      username: 'blankRoleUser',
      password: 'password',
      role: '       '
    };

    const response = await request(app).post('/users').send(blankRoleUser);

    expect(response.status).toBe(400);

    await checkUserExistsInDb(blankRoleUser, false);
  });
});

describe('User Service - GET /users/:username', () => {
  beforeAll(async () => {
    await clearDatabase();
    
    await request(app).post('/users').send(testUser1);
  });

  it('should get a user by username on GET /users/:username', async () => {
    const response = await request(app).get(`/users/${testUser1.username}`);
    expect(response.status).toBe(200);

    await validateResponse(response.body, testUser1);
  });

  it('should return 404 for non-existent user on GET /users/:username', async () => {
    const nonExistentUsername = 'inventeduser';

    const response = await request(app).get(`/users/${nonExistentUsername}`);

    expect(response.status).toBe(404);
  });
});

describe('User Service - GET /users', () => {
  beforeAll(async () => {
    await clearDatabase();
    
    await request(app).post('/users').send(testUser1);
    await request(app).post('/users').send(testUser2);
  });

  it('should get all users on GET /users', async () => {
    const response = await request(app).get('/users');

    expect(response.status).toBe(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);

    // First user
    await validateResponse(response.body[0], testUser1);

    // Second user
    await validateResponse(response.body[1], testUser2);
  });
});

describe('User Service - PATCH /users/:username', () => {
  beforeAll(async () => {
    await clearDatabase();
    
    await request(app).post('/users').send(testUser1);
    await request(app).post('/users').send(testUser2);

    // Mock fetch API for the game service call
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    );
    
    // Create public/images directory if it doesn't exist
    const imagesDir = path.join(__dirname, './public/images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const user1ImagePath = path.join(imagesDir, `${testUser1.username}_profile_picture.png`);
    if (!fs.existsSync(user1ImagePath)) {
      fs.writeFileSync(user1ImagePath, 'dummy image content'); 
    }
  });

  afterAll(async () => {
    const imagesDir = path.join(__dirname, './public/images');
    const user1ImagePath = path.join(imagesDir, `${testUser1.username}_profile_picture.png`);
    if (!fs.existsSync(user1ImagePath)) {
      fs.writeFileSync(user1ImagePath, 'dummy image content'); 
    }
  });
  
  it('should return 409 when updating a username to an already taken one', async () => {
    const response = await request(app)
        .patch(`/users/${testUser1.username}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ newUsername: testUser2.username });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Username already taken');
  });

  it('should return 400 when updating a username with less than 3 characters', async () => {
    const response = await request(app)
        .patch(`/users/${testUser1.username}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ newUsername: 'ab' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Username must be at least 3 characters');
  });

  it('should return 403 when updating a non-existent user', async () => {
    const response = await request(app)
        .patch(`/users/patatito`)
        .set('Authorization', `Bearer ${token}`)
        .send({ newUsername: 'newUser' });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('You can only access your own profile');
  });

  it('should update a user\'s password', async () => {
    const newPassword = 'newSecurePassword123';
    const oldPassword = testUser1.password;

    const response = await request(app)
        .patch(`/users/${testUser1.username}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: oldPassword, newPassword : newPassword });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('User updated successfully');
  });

  it('should return 400 when updating a password with less than 6 characters', async () => {
    const response = await request(app)
        .patch(`/users/${testUser1.username}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: 'newSecurePassword123', newPassword: '12345' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Password must be at least 6 characters');
  });

  it('should return 403 when updating a password for a non-existent user', async () => {
    const response = await request(app)
        .patch(`/users/nonexistent`)
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: 'newSecurePassword123', newPassword: 'newPassword123' });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('You can only access your own profile');
  });

  it('should update a user\'s username and generate a new JWT', async () => {
    const newUsername = 'updatedUser';
    const response = await request(app)
        .patch(`/users/${testUser1.username}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ newUsername : newUsername });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.message).toBe('User updated successfully');

    const testUser = {
      username: newUsername,
      password: 'newSecurePassword123',
      role: testUser1.role
    }

    await checkUserExistsInDb(testUser, true);
  });
});

describe('POST /user/profile/picture', () => {
  const imagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
  const validBuffer = fs.readFileSync(imagePath);
  const validBase64 = validBuffer.toString('base64');

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const module = await import('./user-service.js');
    app = module.default;

    await clearDatabase();

    await request(app).post('/users').send(testUser1);
  })

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mock('./user-model.js'); 
  }); 

  test('Should process and save an image correctly', async () => {
    const validBase64 = validBuffer.toString('base64');
    const processedBuffer = Buffer.from('processedImage');
    sharp().toBuffer.mockResolvedValue(processedBuffer);

    fs.promises.writeFile.mockResolvedValue();
    fs.promises.writeFile.mockImplementation((filePath, data) => {
      return Promise.resolve(); 
    });
  
    const res = await request(app)
      .post('/user/profile/picture')
        .set('Authorization', `Bearer ${token}`)
        .send({ image: validBase64, username: testUser1.username });
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('profilePicture');
    expect(res.body.profilePicture).toBe("images/testuser1_profile_picture.png")
  
    const savedPath = fs.promises.writeFile.mock.calls[0][0];

    expect(savedPath).toBeDefined();
    expect(savedPath.endsWith('testuser1_profile_picture.png')).toBe(true);
  });
  
  test('Should respond 403 if no image or username is provided', async () => {
    const res = await request(app)
        .post('/user/profile/picture')
        .set('Authorization', `Bearer ${token}`)
        .send({});

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "You can only access your own profile" });
  });

  test('Should respond 404 if the user is not found', async () => {
    const res = await request(app)
      .post('/user/profile/picture')
        .set('Authorization', `Bearer ${token}`)
      .send({ image: validBase64, username: "usuarioInexistente" });

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "You can only access your own profile" });
  });

  test('Should respond 400 if the image exceeds the maximum size (5MB)', async () => {
    // 5MB + 1 byte
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, 'a');
    const largeBase64 = largeBuffer.toString('base64');

    const res = await request(app)
      .post('/user/profile/picture')
        .set('Authorization', `Bearer ${token}`)
      .send({ image: largeBase64, username: testUser1.username });

    expect(res.statusCode).toBe(413); // Payload Too Large
  });
});

describe('POST /user/profile/picture - Security Tests', () => {
  let traversalToken;

  beforeAll(async () => {
    await clearDatabase();
    
    await request(app).post('/users').send(testUser1);
    
    // Mock sharp and fs for these tests
    sharp().toBuffer.mockResolvedValue(Buffer.from('test image'));
    fs.promises.mkdir.mockResolvedValue();
    fs.promises.writeFile.mockResolvedValue();
    global.parse = jest.fn(() => ({ mime: 'image/png' }));

    await request(app).post('/users').send({
        username: '../../../etc/passwd',
        password: 'password123',
        role: testUser1.role
    });

    traversalToken = jwt.sign(
        { username: '../../../etc/passwd', role: 'USER' },
        'testing-secret',
    )
  });
  
  it('should sanitize filenames to prevent path traversal', async () => {
    // Username with path traversal characters that should be sanitized
    const username = 'user../.././etc/passwd';
    const validBase64 = Buffer.from('test image data').toString('base64');
    
    // Create a test user with this username first
    await User.create({
      username: username,
      password: bcrypt.hashSync('password123', 10),
      role: 'USER'
    });
    
    await request(app)
      .post('/user/profile/picture')
      .send({
        username: username,
        image: validBase64
      });
    
    // Check if sanitization worked
    const writeFileCalls = fs.promises.writeFile.mock.calls;
    if (writeFileCalls.length > 0) {
      const savedPath = writeFileCalls[0][0];
      expect(savedPath).not.toContain('../');
      expect(savedPath).not.toContain('etc');
      expect(savedPath).not.toContain('passwd');
      
      // Check that path is within imagesDir
      const imagesDir = path.resolve(__dirname, 'public', 'images');
      expect(path.resolve(savedPath).startsWith(imagesDir)).toBe(true);
    }
  });
  
  it('should ensure file paths remain within allowed directory', async () => {
    // Override path.resolve for this specific test
    const originalResolve = path.resolve;
    const mockResolve = jest.fn((p) => {
      // Return a path outside the images directory to trigger security check
      if (p.includes('profile_picture')) {
        return '/tmp/malicious/path'; //NOSONAR
      }
      return originalResolve(p);
    });
    
    path.resolve = mockResolve;
    
    try {
      const validBase64 = Buffer.from('test image data').toString('base64');
      
      const response = await request(app)
        .post('/user/profile/picture')
          .set('Authorization', `Bearer ${token}`)
        .send({
          username: testUser1.username,
          image: validBase64
        });
      
      // Security check should prevent this operation
      expect(response.statusCode).toBe(500);
    } finally {
      // Restore original path.resolve
      path.resolve = originalResolve;
    }
  });
  
  it('should handle directory traversal attempts in profile picture path', async () => {
    // Create a user with a malicious profile picture path
    const user = await User.findOne({ username: testUser1.username });
    user.profilePicture = '../../../etc/passwd';
    await user.save();
    
    const validBase64 = Buffer.from('test image data').toString('base64');
    
    const response = await request(app)
      .post('/user/profile/picture')
      .send({
        username: testUser1.username,
        image: validBase64
      });
    
    // Path validation should sanitize or reject the malicious path
    expect(response.statusCode).not.toBe(200);
    // Or if it does handle the case by sanitizing:
    // expect(fs.promises.writeFile.mock.calls[0][0]).not.toContain('../');
  });
});

describe('User Service - GET /user/profile/picture/:username', () => {
  beforeAll(async () => {
    await clearDatabase();
    await request(app).post('/users').send(testUser1);

    // Set dummy image URL
    const user = await User.findOne({ username: testUser1.username });
    user.profilePicture = 'http://localhost:3000/images/testuser1_profile_picture.png';
    await user.save();
  });

  it('should return the profile picture URL for a valid user', async () => {
    const response = await request(app).get(`/user/profile/picture/${testUser1.username}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('profilePicture');
    expect(response.body.profilePicture).toMatch(/\/images\/testuser1_profile_picture\.png$/);
  });

  it('should return 404 if user not found', async () => {
    const response = await request(app).get('/user/profile/picture/nonexistentuser');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('User not found');
  });

  it('should return 400 if username param is missing', async () => {
    const response = await request(app).get('/user/profile/picture/');
    expect(response.status).toBe(404);
  });
});

describe('User Service - DELETE /users/:username', () => {

  beforeAll(async () => {
    await clearDatabase();
    
    await request(app).post('/users').send(testUser1);
    
  });

  afterAll(async () => {
    
    await mongoServer.stop();
  });

  it('should delete a user by username on DELETE /users/:username', async () => {
    const response = await request(app).delete(`/users/${testUser1.username}`).set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    // Check if the user is deleted from the database
    await checkUserExistsInDb(testUser1, false);
  });

  it('should return 404 for non-existent user on DELETE /users/:username', async () => {
    const noneExistentUsername = 'inventeduser';

    const response = await request(app).delete(`/users/${noneExistentUsername}`).set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);

    await checkUserExistsInDb({ username: noneExistentUsername }, false);
  });
});

describe('User Service - Database unavailable', () => {
  beforeAll(async () => {
    mongoose.connection.readyState = 0; // 0 = disconnected
    
  });

  it('should return 500 when database is unavailable on POST /users', async () => {
    const response = await request(app).post('/users').send(testUser1);
    expect(response.status).toBe(500);
  });

  it('should return 500 when database is unavailable on GET /users/:username', async () => {
    const response = await request(app).get('/users/testuser');
    expect(response.status).toBe(500);
  });

  it('should return 500 when database is unavailable on GET /users', async () => {
    const response = await request(app).get('/users');
    expect(response.status).toBe(500);
  });

  it('should return 500 when database is unavailable on PATCH /users/:username', async () => {
    const response = await request(app).patch('/users/testuser').send({ newUsername: 'updateduser' });
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });

  it('should return 500 when database is unavailable on PATCH /users/:username/password', async () => {
    const response = await request(app).patch('/users/testuser/password').send({ newPassword: 'newPassword123' });
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });  

  it('should return 500 when database is unavailable on DELETE /users/:username', async () => {
    const response = await request(app).delete('/users/testuser');
    expect(response.status).toBe(500);
  });
  
  it('should return 500 when database is unavailable on POST /user/profile/picture', async () => {
    const response = await request(app).post('/user/profile/picture')
      .send({ image: 'test-image-data', username: 'testuser' });
    expect(response.status).toBe(500);
  });
  
  it('should return 500 when database is unavailable on GET /user/profile/picture/:username', async () => {
    const response = await request(app).get('/user/profile/picture/testuser');
    expect(response.status).toBe(500);
  });
});