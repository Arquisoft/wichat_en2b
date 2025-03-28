const request = require('supertest');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('./logger'); 
const { app, server } = require('./auth-service');

jest.mock('axios');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('./logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

const validUser = {
  username: 'testuser',
  password: 'testpassword', // NOSONAR
  role: 'USER',
};

const hashedPassword = 'hashedpassword';

const newUser = {
  username: 'newuser',
  password: 'newpassword', // NOSONAR
  role: 'USER',
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  server.close();
});

describe('Auth Service', () => {
  describe('POST /register', () => {
    it('Should register a new user', async () => {
      axios.post.mockResolvedValue({
        data: { username: newUser.username, password: hashedPassword, role: newUser.role },
      });
      jwt.sign.mockReturnValue('JWT_TOKEN');

      const response = await request(app)
        .post('/auth/register')
        .send({ username: newUser.username, password: newUser.password, role: newUser.role });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token', 'JWT_TOKEN');
    });

    it('Should not register a user with an already existing username', async () => {
      axios.post.mockRejectedValue({
        response: { status: 400, data: { error: 'User already exists' } },
      });

      const response = await request(app)
        .post('/auth/register')
        .send({ username: validUser.username, password: validUser.password, role: validUser.role });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', expect.stringContaining('User already exists'));
    });

    it('Should not register a user if required fields are missing', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ username: 'incompleteuser' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Password must be at least 6 characters, Role must be defined.');
    });

    it('Should not register a user with an invalid role', async () => {
      const invalidRoleUser = { username: 'testuser', password: 'testpassword', role: 'invalidrole' }; // NOSONAR
      const response = await request(app).post('/auth/register').send(invalidRoleUser);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Role must be one of the following: USER, ADMIN');
    });

    it('Should not register a user if the password is too short', async () => {
      const shortPasswordUser = { username: 'user', password: '123', role: 'user' }; // NOSONAR
      const response = await request(app).post('/auth/register').send(shortPasswordUser);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Password must be at least 6 characters');
    });

    it('Should log an error if an unexpected error occurs during registration', async () => {
      axios.post.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/auth/register')
        .send({ username: newUser.username, password: newUser.password, role: newUser.role });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Internal Server Error');
      expect(logger.error).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        'Error in /register endpoint'
      );
    });

    it('Should return a 400 error if required fields are missing during registration', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ username: 'incompleteuser' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Password must be at least 6 characters, Role must be defined.');
    });
  });

  describe('POST /login', () => {
    it('Should log in a valid user and return a JWT token', async () => {
      const hashedPassword = await bcrypt.hash(validUser.password, 10);
      const userFromDB = { ...validUser, password: hashedPassword };

      const userToCheck = {
        username: validUser.username,
        password: validUser.password,
      };

      axios.get.mockResolvedValue({ data: userFromDB });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('JWT_TOKEN');

      const response = await request(app)
        .post('/auth/login')
        .send({ user: userToCheck });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', 'JWT_TOKEN');
    });

    it('Should not log in if the user does not exist', async () => {
      axios.get.mockResolvedValue({ data: null });

      const response = await request(app)
        .post('/auth/login')
        .send({ user: { ...validUser, username: 'nonexistent', id: '999' } });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Username not found');
    });

    it('Should not log in if the password is incorrect', async () => {
      const userFromDB = { ...validUser, password: hashedPassword, _id: '123' };
      axios.get.mockResolvedValue({ data: userFromDB });
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/auth/login')
        .send({ user: validUser });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Password is incorrect');
    });

    it('Should not log in if required fields are missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ user: { username: validUser.username } }); // Missing password

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Password must be at least 3 characters');
    });

    it('Should log an error if an unexpected error occurs during login', async () => {
      axios.get.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/auth/login')
        .send({ user: validUser });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Internal Server Error');
      expect(logger.error).toHaveBeenCalledWith('Error in /login endpoint', expect.any(Error));
    });

    it('Should return a 400 error if required fields are missing during login', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ user: { username: 'testuser' } }); // Missing password

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Password must be at least 3 characters');
    });

    it('Should not log in if user is already logged in', async () => {
      // Mock synchronous jwt.verify to return a decoded token
      jwt.verify.mockReturnValue({ username: 'testuser', role: 'USER' });
    
      const response = await request(app)
        .post('/auth/login')
        .set('Authorization', 'Bearer valid-token')
        .send({ user: validUser });
    
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'You are already logged in');
      expect(logger.info).toHaveBeenCalledWith('User already logged in, rejecting login attempt');
    });
  });
});