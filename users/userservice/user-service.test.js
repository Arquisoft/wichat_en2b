const request = require('supertest');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require("mongoose");

const User = require('./user-model');

const testUser1 = {
  username: 'testuser1',
  password: 'testpassword1',
  role: 'USER'
};

const testUser2 = {
  username: 'testuser2',
  password: 'testpassword2',
  role: 'USER'
};

async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

const checkUserExistsInDb = async (testUser, bool) => {
  // Get the user from the database
  const userInDb = await User.findOne({ username: testUser.username });

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
    app = require('./user-service');
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
      role: 'admin'
    };

    const response = await request(app).post('/users').send(repeatedUser);

    expect(response.status).toBe(400);

    // Check that the user in the database is still user 1
    await checkUserExistsInDb(testUser1, true);
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
  });

  it('should update a user by username on PATCH /users/:username', async () => {
    const updatedUser = {
      username: 'updateduser',
      password: testUser1.password,
      role: testUser1.role
    };

    const response = await request(app).patch(`/users/${testUser1.username}`).send({ username: updatedUser.username });

    expect(response.status).toBe(200);

    await checkUserExistsInDb(updatedUser, true);

    await validateResponse(response.body, updatedUser);
  });

  it('should update a user by password on PATCH /users/:username', async () => {
    const updatedUser = {
      username: 'updateduser',
      password: 'updatedpassword',
      role: testUser1.role
    };

    const response = await request(app).patch(`/users/${updatedUser.username}`).send({ password: updatedUser.password });

    expect(response.status).toBe(200);

    await checkUserExistsInDb(updatedUser, true);

    await validateResponse(response.body, updatedUser);
  });

  it('should update a user by role on PATCH /users/:username', async () => {
    const updatedUser = {
      username: 'updateduser',
      password: 'updatedpassword',
      role: 'ADMIN'
    };

    const response = await request(app).patch(`/users/${updatedUser.username}`).send({ role: updatedUser.role });

    expect(response.status).toBe(200);

    await checkUserExistsInDb(updatedUser, true);

    await validateResponse(response.body, updatedUser);
  });

  it('should update a user by all fields on PATCH /users/:username', async () => {
    const updatedUser = {
      username: testUser1.username,
      password: testUser1.password,
      role: testUser1.role
    };

    const response = await request(app).patch(`/users/updateduser`).send({ ...updatedUser });

    expect(response.status).toBe(200);

    await checkUserExistsInDb(testUser1, true);

    await validateResponse(response.body, testUser1);
  });

  it('should not update user\'s data with a repeated username on PATCH /users/:username', async () => {
    const updatedUser = {
      username: testUser2.username,
      password: 'arandompassword',
      role: 'ADMIN'
    };

    const response = await request(app).patch(`/users/${testUser1.username}`).send({ ...updatedUser });
    
    expect(response.status).toBe(400);

    await checkUserExistsInDb(testUser1, true);

    await checkUserExistsInDb(testUser2, true);
  });

  it('should return 404 when updating a non-existent user on PATCH /users/:username', async () => {
    const nonExistentUsername = 'inventeduser';
    const editNonExistentUsername = 'editedinventeduser';

    const response = await request(app).patch(`/users/${nonExistentUsername}`).send({ username: editNonExistentUsername });

    expect(response.status).toBe(404);
    
    await checkUserExistsInDb({ username: nonExistentUsername }, false);

    await checkUserExistsInDb({ username: editNonExistentUsername }, false);
  });

  it('should not update a user with empty username on PATCH /users/:username', async () => {
    const response = await request(app).patch(`/users/${testUser1.username}`).send({ username: '' });
    
    expect(response.status).toBe(400);
    
    await checkUserExistsInDb(testUser1, true);
  });

  it('should not update a user with empty password on PATCH /users/:username', async () => {
    const response = await request(app).patch(`/users/${testUser1.username}`).send({ password: '' });

    expect(response.status).toBe(400);
    
    await checkUserExistsInDb(testUser1, true);  
  });

  it('should not update a user with empty role on PATCH /users/:username', async () => {
    const response = await request(app).patch(`/users/${testUser1.username}`).send({ role: '' });

    expect(response.status).toBe(400);
    
    await checkUserExistsInDb(testUser1, true);  
  });

  it('should not update a user with empty fields on PATCH /users/:username', async () => {
    const response = await request(app).patch(`/users/${testUser1.username}`).send({ password: '', role: 'ADMIN' });

    expect(response.status).toBe(400);
    
    // Assert that THE EMPTY FIELD has not been updated
    await checkUserExistsInDb(testUser1, true);
  });
});

describe('User Service - DELETE /users/:username', () => {
  beforeAll(async () => {
    await clearDatabase();
    await request(app).post('/users').send(testUser1);
  });

  afterAll(async () => {
    app.close();
    await mongoServer.stop();
  });

  it('should delete a user by username on DELETE /users/:username', async () => {
    const response = await request(app).delete(`/users/${testUser1.username}`);

    expect(response.status).toBe(200);

    // Check if the user is deleted from the database
    await checkUserExistsInDb(testUser1, false);
  });

  it('should return 404 for non-existent user on DELETE /users/:username', async () => {
    const noneExistentUsername = 'inventeduser';

    const response = await request(app).delete(`/users/${noneExistentUsername}`);

    expect(response.status).toBe(404);

    await checkUserExistsInDb({ username: noneExistentUsername }, false);
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
    const response = await request(app).patch('/users/testuser').send({ username: 'updateduser' });
    expect(response.status).toBe(500);
  });

  it('should return 500 when database is unavailable on DELETE /users/:username', async () => {
    const response = await request(app).delete('/users/testuser');
    expect(response.status).toBe(500);
  });
});