const request = require('supertest');
const axios = require('axios');
const { app, server } = require('./auth-server');

jest.mock('axios');

// Test users
const validUser = {
  userId: 1,
  username: 'testuser',
  password: 'testpassword',
  role: 'user'
};

const invalidUser = {
  userId: 2,
  username: 'invaliduser',
  password: 'invalidpassword',
  role: 'user'
};

const newUser = {
  userId: 3,
  username: 'newuser',
  password: 'newpassword',
  role: 'user'
};

beforeEach(() => {
  jest.clearAllMocks(); // Reset mocks before each test
});

afterAll(() => {
  server.close();
});

describe('Auth Service', () => {
  describe('POST /register', () => {
    it('Should register a new user', async () => {
      axios.post.mockResolvedValue({ data: newUser });

      const response = await request(app).post('/register').send({id: 3, username: 'newuser', password: 'newpassword', role: 'user'});
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User successfully registered');
      expect(response.body).toHaveProperty('username', newUser.username);
    });

    it('Should not register a user with existing username', async () => {
      axios.post.mockRejectedValue({
        response: { status: 400, data: { error: 'User already exists' } },
      });

      const response = await request(app).post('/register').send({id: 1, username: 'testuser', password: 'testpassword', role: 'user'});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'User already exists');
    });

    it('Should not register a user with missing fields', async () => {
      const response = await request(app).post('/register').send({ username: 'incompleteuser' }); // Falta `password` y `role`
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', expect.stringContaining('Missing required field'));
    });
    
    it('Should not register a user with invalid role', async () => {
      const invalidRoleUser = { username: 'testuser', password: 'testpassword', role: 'invalidrole' }; // Rol no permitido
      const response = await request(app).post('/register').send(invalidRoleUser);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', expect.stringContaining('Invalid role'));
    });    
  });

  describe('POST /login', () => {
    it('Should login a valid user and return a JWT token', async () => {
      axios.get.mockResolvedValue({ data: { ...validUser, password: 'hashedpassword' } });

      const response = await request(app).post('/login').send(validUser);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('username', validUser.username);
      expect(response.body).toHaveProperty('createdAt');
    });

    it('Should not login with invalid username', async () => {
      axios.get.mockResolvedValue({ data: null });

      const response = await request(app).post('/login').send({ ...invalidUser, password: validUser.password });
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Not a valid user');
    });

    it('Should not login with invalid password', async () => {
      axios.get.mockResolvedValue({ data: { ...validUser, password: 'hashedpassword' } });

      const response = await request(app).post('/login').send({ ...validUser, password: 'wrongpassword' });
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Not a valid password');
    });

    it('Should not login with missing fields', async () => {
      const response = await request(app).post('/login').send({ username: validUser.username });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required field(s)');
    });

    it('Should not login with invalid role', async () => {
      axios.get.mockResolvedValue({ data: { ...validUser, password: 'hashedpassword' } });

      const invalidRoleLogin = { ...validUser, role: 'invalidrole' };
      const response = await request(app).post('/login').send(invalidRoleLogin);
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Not a valid role');
    });
  });
});
