const request = require('supertest');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('./user-model');

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;
  app = require('./user-service'); 
});

afterAll(async () => {
    app.close();
    await mongoServer.stop();
});

describe('User Service', () => {
  it('should add a new user on POST /users', async () => {
    const newUser = {
      username: 'testuser',
      password: 'testpassword',
      role: 'user'
    };

    const response = await request(app).post('/users').send(newUser);
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('username', 'testuser');

    // Check if the user is inserted into the database
    const userInDb = await User.findOne({ username: 'testuser' });

    // Assert that the user exists in the database
    expect(userInDb).not.toBeNull();
    expect(userInDb.username).toBe('testuser');

    // Assert that the password is encrypted
    const isPasswordValid = await bcrypt.compare('testpassword', userInDb.password);
    expect(isPasswordValid).toBe(true);
  });

  it('should get all users on GET /users', async () => {
    const response = await request(app).get('/users');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should get a user by ID on GET /users/:id', async () => {
    const newUser = new User({
      username: 'testuser2',
      password: 'testpassword2',
      role: 'user'
    });
    await newUser.save();

    const response = await request(app).get(`/users/${newUser._id}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('username', 'testuser2');
  });

  it('should update a user by ID on PATCH /users/:id', async () => {
    const newUser = new User({
      username: 'testuser3',
      password: 'testpassword3',
      role: 'user'
    });
    await newUser.save();

    const response = await request(app).patch(`/users/${newUser._id}`).send({ username: 'updateduser' });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('username', 'updateduser');
  });

  it('should delete a user by ID on DELETE /users/:id', async () => {
    const newUser = new User({
      username: 'testuser4',
      password: 'testpassword4',
      role: 'user'
    });
    await newUser.save();

    const response = await request(app).delete(`/users/${newUser._id}`);
    expect(response.status).toBe(200);

    // Check if the user is deleted from the database
    const userInDb = await User.findById(newUser._id);
    expect(userInDb).toBeNull();
  });
});