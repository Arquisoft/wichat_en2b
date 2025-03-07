const request = require('supertest');
const axios = require('axios');
const bcrypt = require('bcrypt');
const logger = require('./logger'); 
const { app, server } = require('./auth-service');

jest.mock('axios');
jest.mock('bcrypt');
jest.mock('./logger', () => ({
  error: jest.fn(), 
}));

const validUser = {
  username: 'testuser',
  password: 'testpassword', // NOSONAR
  role: 'user'
};

const hashedPassword = 'hashedpassword';

const newUser = {
  username: 'newuser',
  password: 'newpassword', // NOSONAR
  role: 'user'
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
      // This line mocks an HTTP petition to the /auth/register endpoint and its response
      axios.post.mockResolvedValue({ data: { token: 'JWT_TOKEN' } });
  
      const response = await request(app)
        .post('/auth/register')
        .send({ username: newUser.username, password: newUser.password, role: newUser.role });
  
      expect(response.status).toBe(201); // 201 == Created status code
      expect(response.body).toHaveProperty('token');  // Expect the token to be returned
    });
  
    it('Should not register a user with an already existing username', async () => {
      axios.post.mockRejectedValue({ // This line mocks the response from the crud service when a user already exists
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
        .send({ username: 'incompleteuser' });  // Missing password and role
  
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', "Password must be at least 6 characters, Role must be one of the following: user");
    });
  
    it('Should not register a user with an invalid role', async () => {
      const invalidRoleUser = { username: 'testuser', password: 'testpassword', role: 'invalidrole' }; // NOSONAR
      const response = await request(app).post('/auth/register').send(invalidRoleUser);
  
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', "Role must be one of the following: user");
    });
  
    it('Should not register a user if the password is too short', async () => {
      const shortPasswordUser = { username: 'user', password: '123', role: 'user' }; // NOSONAR
      const response = await request(app).post('/auth/register').send(shortPasswordUser);
  
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error',"Password must be at least 6 characters");
    });
  
    it('Should log an error if an unexpected error occurs during registration', async () => {
      axios.post.mockRejectedValue(new Error('Database error')); // This line mocks the response from the crud service when an error occurs
  
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
        .send({ username: 'incompleteuser' });  // Missing password and role
  
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', "Password must be at least 6 characters, Role must be one of the following: user");
    });
  });  

  describe('POST /login', () => {
    it('Should log in a valid user and return a JWT token', async () => {
      const hashedPassword = await bcrypt.hash(validUser.password, 10);
      const userFromDB = { ...validUser, password: hashedPassword};

      // Simulate a call to the CRUD service to get the user
      axios.get.mockResolvedValue({ data: userFromDB }); 

      // Simulate a call to bcrypt to compare the passwords
      bcrypt.compare.mockResolvedValue(true);

      const response = await request(app)
        .post('/auth/login')
        .send({ user: validUser });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('Should not log in if the user does not exist', async () => {
      axios.get.mockResolvedValue({ data: null });

      const response = await request(app)
        .post('/auth/login')
        .send({ user: { ...validUser, username: 'nonexistent', id: '999' } });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Not a valid user');
    });

    it('Should not log in if the password is incorrect', async () => {
      const userFromDB = { ...validUser, password: hashedPassword, _id: '123' };
      axios.get.mockResolvedValue({ data: userFromDB });
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/auth/login')
        .send({ user: validUser });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Not a valid password');
    });

    it('Should not log in if required fields are missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ user: { username: validUser.username } }); // Missing password, role, and id

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', expect.stringContaining('Missing required field'));
    });

    it('Should not log in if the role does not match', async () => {
      const userFromDB = { ...validUser, password: hashedPassword, _id: '123' };
      axios.get.mockResolvedValue({ data: userFromDB });
      bcrypt.compare.mockResolvedValue(true);

      const response = await request(app)
        .post('/auth/login')
        .send({ user: { ...validUser, role: 'invalidrole' } });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Not a valid role');
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
        .send({ user: { username: 'testuser' } });  // Missing password, role, and id
    
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Missing required/);
    });
  });
});
