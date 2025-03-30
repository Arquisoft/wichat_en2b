const request = require('supertest');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('./logger'); 
const { app, server } = require('./auth-service');
const otplib = require('otplib');
const qrcode = require('qrcode');

jest.mock('qrcode');
jest.mock('otplib');
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
describe('2FA Service', () => {
  describe('POST /auth/setup2fa', () => {
    it('Should generate a 2FA secret and QR code image URL', async () => {
      const imageUrl = 'mockImageUrl';
      const mockUser = { username: 'testuser', role: 'USER' };
      const mockToken = 'valid-jwt-token';
      const mockSecret = 'mockSecret'; // Mock secret value
    
      // Mock the token decoding to return the mockUser
      jwt.verify.mockReturnValue(mockUser);
      
      // Mock otplib to return a mock secret
      otplib.authenticator.generateSecret.mockReturnValue(mockSecret);
      
      qrcode.toDataURL.mockImplementation((uri, callback) => callback(null, imageUrl));
    
      // Mock axios to resolve successfully when patching the user
      axios.patch.mockResolvedValue({ data: { username: mockUser.username, role: mockUser.role } });
    
      const response = await request(app)
        .post('/auth/setup2fa')
        .set('Authorization', `Bearer ${mockToken}`)
        .send();
    
      // Assert that the response is as expected
      expect(response.status).toBe(200);
      expect(otplib.authenticator.generateSecret).toHaveBeenCalled();
      expect(response.body).toHaveProperty('imageUrl', imageUrl);
    
      // Ensure axios.patch was called with the correct secret
      expect(axios.patch).toHaveBeenCalledWith('http://gatewayservice:8000/users/testuser', { secret: mockSecret });
    });
    
    it('Should handle errors when generating 2FA setup', async () => {
      const errorMessage = 'Error generating QR code';
      const mockUser = { username: 'testuser', role: 'USER' };
      const mockToken = 'valid-jwt-token';
      
      // Mock the token decoding to return the mockUser
      jwt.verify.mockReturnValue(mockUser);
      
      qrcode.toDataURL.mockImplementation((uri, callback) => callback(new Error(errorMessage)));

      const response = await request(app)
        .post('/auth/setup2fa')
        .set('Authorization', `Bearer ${mockToken}`)
        .send();

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Error setting up 2FA');
    });

    it('Should log errors when there is an issue generating 2FA setup', async () => {
      const errorMessage = 'Error setting up 2FA';
      const mockUser = { username: 'testuser', role: 'USER' };
      const mockToken = 'valid-jwt-token';
      
      // Mock the token decoding to return the mockUser
      jwt.verify.mockReturnValue(mockUser);

      otplib.authenticator.generateSecret.mockImplementation(() => { throw new Error(errorMessage); });

      const response = await request(app)
        .post('/auth/setup2fa')
        .set('Authorization', `Bearer ${mockToken}`)
        .send();

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Error setting up 2FA');
      expect(logger.error).toHaveBeenCalledWith('Failure setting up 2FA: Error setting up 2FA');
    });
  });

  describe('POST /auth/verify2fa', () => {
    it('Should verify a valid 2FA token', async () => {
      const mockUser = { username: 'testuser', role: 'USER' }; // Ensure role is included
      const mockToken = 'valid-jwt-token';
      const mockSecret = 'mockSecret';
      const mockDbUser = { username: 'testuser', role: 'USER', secret: mockSecret }; // Mocked user from DB
      const mock2faToken = '123456'; // Mock valid token
    
      // Mock jwt.verify to return the mockUser (user from the token)
      jwt.verify.mockReturnValue(mockUser);
      
      // Mock axios to return the mockDbUser when fetching the user from the gateway service
      axios.get.mockResolvedValue({ data: mockDbUser });
    
      // Mock otplib to return true for a valid token
      otplib.authenticator.verify.mockReturnValue(true);
    
      // Make the request to the /verify2fa endpoint
      const response = await request(app)
        .post('/auth/verify2fa')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ token: mock2faToken, user: mockUser });
    
      // Assert that the response is as expected
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', '2FA Verified');
    
      // Ensure that jwt.sign was called with the correct arguments
      expect(jwt.sign).toHaveBeenCalledWith(
        { username: mockUser.username, role: mockUser.role }, // Ensure role is passed correctly
        process.env.JWT_SECRET || 'testing-secret',
        { expiresIn: '1h' }
      );
    });
    

    it('Should reject an invalid 2FA token', async () => {
      const secret = 'validSecret';
      const token = '123456';
      const mockUser = { username: 'testuser', role: 'USER' };
      const mockToken = 'valid-jwt-token';

      // Mock the token decoding to return the mockUser
      jwt.verify.mockReturnValue(mockUser);

      // Mock axios to return a valid user from DB
      axios.get.mockResolvedValue({ data: { username: 'testuser', secret } });

      otplib.authenticator.verify.mockReturnValue(false);

      const response = await request(app)
        .post('/auth/verify2fa')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ token, user: mockUser });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid 2FA Token');
    });

    it('Should handle missing token or secret', async () => {
      const response = await request(app)
        .post('/auth/verify2fa')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Token is required');
    });

    it('Should log an error if an unexpected error occurs during token verification', async () => {
      const secret = 'validSecret';
      const token = '123456';
      const mockUser = { username: 'testuser', role: 'USER' };
      const mockToken = 'valid-jwt-token';
      const errorMessage = 'Unexpected error during verification';
      
      // Mock the token decoding to return the mockUser
      jwt.verify.mockReturnValue(mockUser);

      // Mock axios to return a valid user from DB
      axios.get.mockResolvedValue({ data: { username: 'testuser', secret } });

      otplib.authenticator.verify.mockImplementation(() => { throw new Error(errorMessage); });

      const response = await request(app)
        .post('/auth/verify2fa')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ token, user: mockUser });

      expect(response.status).toBe(500);
      expect(logger.error).toHaveBeenCalledWith('Failure verifying the 2FA token: Unexpected error during verification');
    });
  });
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