const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const Group = require('./../group-model')

jest.mock('./../group-model');
jest.mock('jsonwebtoken');

const app = express();
app.use(express.json());

// Mock del middleware verifyToken
const fakeVerifyToken = (req, res, next) => {
    req.user = { _id: 'mockUserId123' }; 
    next();
};

app.use('/groups', fakeVerifyToken, router); 

describe('POST /groups', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    it('should create a group successfully', async () => {
      // mock sin grupo existente
      Group.findOne
        .mockResolvedValueOnce(null) // No existe grupo con ese nombre
        .mockResolvedValueOnce(null); // Usuario no pertenece a ningún grupo
  
      const mockGroupInstance = {
        groupName: 'New Group',
        owner: 'mockUserId123',
        members: ['mockUserId123'],
        validateSync: () => null,
        save: jest.fn().mockResolvedValue(true),
      };
  
      // mock del constructor de Group
      Group.mockImplementation(() => mockGroupInstance);
  
      const response = await request(app)
        .post('/groups')
        .send({ name: 'New Group' });
  
      expect(response.status).toBe(200);
      expect(response.body.groupName).toBe('New Group');
      expect(Group).toHaveBeenCalled();
      expect(mockGroupInstance.save).toHaveBeenCalled();
    });
  });