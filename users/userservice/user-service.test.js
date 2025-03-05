const request = require('supertest');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('./user-model');

let mongoServer;
let app;

describe('User Service', () => {
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



  it('should add a new user on POST /users', async () => {
    const newUser = {
      username: 'testuser',
      password: 'testpassword',
      role: 'USER'
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



  it('should get a user by username on GET /users/:username', async () => {
    const newUser = new User({
      username: 'testuser2',
      password: 'testpassword2',
      role: 'USER'
    });
    await newUser.save();

    const response = await request(app).get(`/users/${newUser.username}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('username', 'testuser2');
    expect(response.body).toHaveProperty('role', 'USER');
    // No value can be checked for the password
    expect(response.body).toHaveProperty('password');
    expect(response.body).toHaveProperty('createdAt');
  });

  
  
  it('should get all users on GET /users', async () => {
    const response = await request(app).get('/users');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    // First user
    expect(response.body[0]).toHaveProperty('username', 'testuser');
    expect(response.body[0]).toHaveProperty('role', 'USER');
    // No value can be checked for the password
    expect(response.body[0]).toHaveProperty('password');
    expect(response.body[0]).toHaveProperty('createdAt');

    // Second user
    expect(response.body[1]).toHaveProperty('username', 'testuser2');
    expect(response.body[1]).toHaveProperty('role', 'USER');
    // No value can be checked for the password
    expect(response.body[1]).toHaveProperty('password');
    expect(response.body[1]).toHaveProperty('createdAt');
  });



  it('should update a user by username on PATCH /users/:username', async () => {
    const newUser = new User({
      username: 'testuser3',
      password: 'testpassword3',
      role: 'USER'
    });
    await newUser.save();

    const response = await request(app).patch(`/users/${newUser.username}`).send({ username: 'updateduser' });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('username', 'updateduser');
    expect(response.body).toHaveProperty('__v', 1);
  });



  it('should delete a user by username on DELETE /users/:username', async () => {
    const newUser = new User({
      username: 'testuser4',
      password: 'testpassword4',
      role: 'USER'
    });
    await newUser.save();

    const response = await request(app).delete(`/users/${newUser.username}`);
    expect(response.status).toBe(200);

    // Check if the user is deleted from the database
    const userInDb = await User.findById(newUser._id);
    expect(userInDb).toBeNull();
  });



  // NEGATIVE TEST CASES
  
  it('should not add a user with missing password on POST /users', async () => {
    const newUser = {
      username: 'testuser',
      // Missing password
      role: 'USER'
    };

    const response = await request(app).post('/users').send(newUser);
    expect(response.status).toBe(400);
  });



  it('should not add a user with missing role on POST /users', async () => {
    const newUser = {
      username: 'testuser',
      password: 'testpassword'
    };

    const response = await request(app).post('/users').send(newUser);
    expect(response.status).toBe(400);
  });



  it('should not add a user with repeated username on POST /users', async () => {
    const newUser = {
      username: 'testuser',
      password: 'errepetio',
      role: 'USER'
    };

    const response = await request(app).post('/users').send(newUser);
    expect(response.status).toBe(400);
  });



  it('should return 404 for non-existent user on GET /users/:username', async () => {
    const noneExistentUsername = 'inventeduser';
    const response = await request(app).get(`/users/${noneExistentUsername}`);
    expect(response.status).toBe(404);
  });

});

describe('User Service - Database unavailable', () => {
  beforeAll(async () => {
    app = require('./user-service');
  });
  
  afterAll(async () => {
      app.close();
  });

  it('should return 500 when database is unavailable on POST /users', async () => {
    const newUser = {
      username: 'atestuserthatdoesnoteevenexist',
      password: 'testpassword',
      role: 'USER'
    };

    const response = await request(app).post('/users').send(newUser);
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
    const response = await request(app).patch('/users/testuser').send({ username: 'updateduser' });
    expect(response.status).toBe(500);
  });



  it('should return 500 when database is unavailable on DELETE /users/:username', async () => {
    const response = await request(app).delete('/users/testuser');
    expect(response.status).toBe(500);
  });

});