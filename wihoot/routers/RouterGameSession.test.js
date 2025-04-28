const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const SharedQuizSession = require('../models/session-model');
const socketHandlerObject = require('../socket/socketHandler');
const sessionRoutes = require('./RouterGameSession');

// Mock the socket.io instance
jest.mock('../socket/socketHandler', () => ({
  io: {
    to: jest.fn().mockReturnValue({
      emit: jest.fn()
    })
  }
}));

// Mock the SharedQuizSession model
jest.mock('../models/session-model');

describe('Session Routes', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    // Set up the Express app
    app = express();
    app.use(express.json());
    app.use('/api/sessions', sessionRoutes);

    // Set up MongoDB memory server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /create', () => {
    it('should create a new shared quiz session', async () => {
      // Mock data
      const mockQuizData = [{ question: 'Test question', answers: [{ text: 'Answer 1', correct: true }] }];
      const mockQuizMetaData = [{ timePerQuestion: 30 }];
      const mockHostId = 'host123';
      const mockHostUsername = 'TestHost';
      const mockCode = 'ABC123';
      const mockSessionId = 'session123';

      // Mock the generateCode method
      SharedQuizSession.generateCode.mockReturnValue(mockCode);
      
      // Mock the findOne method for checking uniqueness
      SharedQuizSession.findOne.mockResolvedValueOnce(null);

      // Mock the save method
      SharedQuizSession.mockImplementation(() => ({
        _id: mockSessionId,
        save: jest.fn().mockResolvedValue(true)
      }));

      const response = await request(app)
        .post('/api/sessions/create')
        .send({
          quizData: mockQuizData,
          quizMetaData: mockQuizMetaData,
          hostId: mockHostId,
          hostUsername: mockHostUsername
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        code: mockCode,
        sessionId: mockSessionId
      });
      expect(SharedQuizSession).toHaveBeenCalledWith({
        code: mockCode,
        quizData: mockQuizData,
        quizMetaData: mockQuizMetaData,
        hostId: mockHostId,
        players: []
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/sessions/create')
        .send({
          quizData: [],
          // Missing hostId and hostUsername
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing required fields' });
    });
  });

  describe('GET /internal/quizdata/:code', () => {
    it('should return quiz data for a valid code', async () => {
      const mockCode = 'ABC123';
      const mockQuizData = [{ question: 'Test question', answers: [{ text: 'Answer 1', correct: true }] }];
      const mockQuizMetaData = [{ timePerQuestion: 30 }];
      
      // Mock the findOne method
      SharedQuizSession.findOne.mockResolvedValueOnce({
        quizData: mockQuizData,
        quizMetaData: mockQuizMetaData
      });

      const response = await request(app)
        .get(`/api/sessions/internal/quizdata/${mockCode}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        quizData: mockQuizData,
        quizMetaData: mockQuizMetaData
      });
      expect(SharedQuizSession.findOne).toHaveBeenCalledWith({ code: mockCode });
    });

    it('should return 404 if session is not found', async () => {
      const mockCode = 'INVALID';
      
      // Mock the findOne method to return null (session not found)
      SharedQuizSession.findOne.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/sessions/internal/quizdata/${mockCode}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Session not found' });
    });
  });

  describe('POST /:code/join', () => {
    it('should allow a player to join a session', async () => {
      const mockCode = 'ABC123';
      const mockPlayerId = 'player123';
      const mockUsername = 'TestPlayer';
      const mockSessionId = 'session123';
      
      // Mock the findOne method
      const mockSession = {
        _id: mockSessionId,
        status: 'waiting',
        players: [],
        addPlayer: jest.fn(),
        save: jest.fn().mockResolvedValue(true)
      };
      
      SharedQuizSession.findOne.mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .post(`/api/sessions/${mockCode}/join`)
        .send({
          playerId: mockPlayerId,
          username: mockUsername
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        sessionId: mockSessionId,
        players: []
      });
      expect(mockSession.addPlayer).toHaveBeenCalledWith({
        id: mockPlayerId,
        username: mockUsername,
        score: 0,
        answers: []
      });
      expect(socketHandlerObject.io.to).toHaveBeenCalledWith(mockCode);
      expect(socketHandlerObject.io.to().emit).toHaveBeenCalledWith('player-joined', {
        playerId: mockPlayerId,
        username: mockUsername
      });
    });

    it('should return 404 if session is not found', async () => {
      const mockCode = 'INVALID';
      
      // Mock the findOne method to return null (session not found)
      SharedQuizSession.findOne.mockResolvedValueOnce(null);

      const response = await request(app)
        .post(`/api/sessions/${mockCode}/join`)
        .send({
          playerId: 'player123',
          username: 'TestPlayer'
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Session not found' });
    });

    it('should return 400 if required fields are missing', async () => {
      const mockCode = 'ABC123';
      
      const response = await request(app)
        .post(`/api/sessions/${mockCode}/join`)
        .send({
          // Missing playerId and username
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing required fields' });
    });

    it('should return 400 if player already exists in session', async () => {
      const mockCode = 'ABC123';
      const mockPlayerId = 'player123';
      const mockUsername = 'TestPlayer';
      
      // Mock the findOne method
      const mockSession = {
        status: 'waiting',
        players: [{ id: mockPlayerId }]
      };
      
      SharedQuizSession.findOne.mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .post(`/api/sessions/${mockCode}/join`)
        .send({
          playerId: mockPlayerId,
          username: mockUsername
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Player already exists in this session' });
    });

    it('should return 400 if session has already started', async () => {
      const mockCode = 'ABC123';
      const mockPlayerId = 'player123';
      const mockUsername = 'TestPlayer';
      
      // Mock the findOne method
      const mockSession = {
        status: 'active', // Session already started
        players: []
      };
      
      SharedQuizSession.findOne.mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .post(`/api/sessions/${mockCode}/join`)
        .send({
          playerId: mockPlayerId,
          username: mockUsername
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Session has already started' });
    });
  });

  describe('GET /:code/start', () => {
    it('should start a session when host requests it', async () => {
      const mockCode = 'ABC123';
      const mockHostId = 'host123';
      
      // Mock the findOne method
      const mockSession = {
        hostId: mockHostId,
        waitingForNext: true,
        start: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
        currentQuestionIndex: 0
      };
      
      SharedQuizSession.findOne.mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .get(`/api/sessions/${mockCode}/start`)
        .query({ hostId: mockHostId });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        status: undefined, // The mock doesn't have a status property
        currentQuestionIndex: 0
      });
      expect(mockSession.start).toHaveBeenCalled();
      expect(mockSession.waitingForNext).toBe(false);
      expect(socketHandlerObject.io.to).toHaveBeenCalledWith(mockCode);
      expect(socketHandlerObject.io.to().emit).toHaveBeenCalledWith('session-started', {
        currentQuestionIndex: 0
      });
    });

    it('should return 400 if hostId is missing', async () => {
      const mockCode = 'ABC123';
      
      const response = await request(app)
        .get(`/api/sessions/${mockCode}/start`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing host ID' });
    });

    it('should return 404 if session is not found', async () => {
      const mockCode = 'INVALID';
      const mockHostId = 'host123';
      
      // Mock the findOne method to return null (session not found)
      SharedQuizSession.findOne.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/sessions/${mockCode}/start`)
        .query({ hostId: mockHostId });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Session not found' });
    });

    it('should return 403 if requester is not the host', async () => {
      const mockCode = 'ABC123';
      const mockHostId = 'host123';
      const mockRequesterId = 'notTheHost';
      
      // Mock the findOne method
      const mockSession = {
        hostId: mockHostId
      };
      
      SharedQuizSession.findOne.mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .get(`/api/sessions/${mockCode}/start`)
        .query({ hostId: mockRequesterId });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Only the host can start the session' });
    });
  });

  describe('GET /:code/next', () => {
    it('should move to the next question when host requests it', async () => {
      const mockCode = 'ABC123';
      const mockHostId = 'host123';
      
      // Mock the findOne method
      const mockSession = {
        hostId: mockHostId,
        waitingForNext: true,
        checkForNoAnswer: jest.fn().mockResolvedValue(true),
        nextQuestion: jest.fn().mockReturnValue(1), // Next question index
        save: jest.fn().mockResolvedValue(true)
      };
      
      SharedQuizSession.findOne.mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .get(`/api/sessions/${mockCode}/next`)
        .query({ hostId: mockHostId });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        currentQuestionIndex: 1
      });
      expect(mockSession.checkForNoAnswer).toHaveBeenCalled();
      expect(mockSession.nextQuestion).toHaveBeenCalled();
      expect(mockSession.waitingForNext).toBe(false);
      expect(socketHandlerObject.io.to).toHaveBeenCalledWith(mockCode);
      expect(socketHandlerObject.io.to().emit).toHaveBeenCalledWith('question-changed', {
        currentQuestionIndex: 1
      });
    });

    it('should return 400 if hostId is missing', async () => {
      const mockCode = 'ABC123';
      
      const response = await request(app)
        .get(`/api/sessions/${mockCode}/next`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing host ID' });
    });

    it('should return 404 if session is not found', async () => {
      const mockCode = 'INVALID';
      const mockHostId = 'host123';
      
      // Mock the findOne method to return null (session not found)
      SharedQuizSession.findOne.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/sessions/${mockCode}/next`)
        .query({ hostId: mockHostId });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Session not found' });
    });

    it('should return 403 if requester is not the host', async () => {
      const mockCode = 'ABC123';
      const mockHostId = 'host123';
      const mockRequesterId = 'notTheHost';
      
      // Mock the findOne method
      const mockSession = {
        hostId: mockHostId
      };
      
      SharedQuizSession.findOne.mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .get(`/api/sessions/${mockCode}/next`)
        .query({ hostId: mockRequesterId });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Only the host can navigate questions' });
    });
  });

  describe('POST /:code/answer', () => {
    it('should submit a player answer', async () => {
      const mockCode = 'ABC123';
      const mockPlayerId = 'player123';
      const mockQuestionId = 'question123';
      const mockAnswerId = 'answer123';
      
      // Mock the findOne method
      const mockSession = {
        status: 'active',
        quizData: [{ answers: [1, 2, 3, 4] }], // 4 options
        quizMetaData: [{ timePerQuestion: 30 }],
        players: [
          {
            id: mockPlayerId,
            answers: [],
            score: 0,
            total_time: 0
          }
        ],
        save: jest.fn().mockResolvedValue(true)
      };
      
      SharedQuizSession.findOne.mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .post(`/api/sessions/${mockCode}/answer`)
        .send({
          playerId: mockPlayerId,
          questionId: mockQuestionId,
          answerId: mockAnswerId,
          isCorrect: true,
          timeToAnswer: 15 // Half of the time limit
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        score: expect.any(Number)
      });
      
      // Check if the answer was added correctly
      expect(mockSession.players[0].answers.length).toBe(1);
      expect(mockSession.players[0].answers[0]).toEqual({
        questionId: mockQuestionId,
        answerId: mockAnswerId,
        isCorrect: true,
        timeToAnswer: 15
      });
      
      // Check if score was calculated and updated
      expect(mockSession.players[0].score).toBeGreaterThan(0);
      expect(mockSession.players[0].total_time).toBe(15);
      
      expect(socketHandlerObject.io.to).toHaveBeenCalledWith(mockCode);
      expect(socketHandlerObject.io.to().emit).toHaveBeenCalledWith('answer-submitted', {
        playerId: mockPlayerId,
        score: mockSession.players[0].score,
        isCorrect: true
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const mockCode = 'ABC123';
      
      const response = await request(app)
        .post(`/api/sessions/${mockCode}/answer`)
        .send({
          playerId: 'player123',
          questionId: 'question123'
          // Missing answerId, isCorrect, timeToAnswer
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing required fields' });
    });

    it('should return 404 if session is not found', async () => {
      const mockCode = 'INVALID';
      
      // Mock the findOne method to return null (session not found)
      SharedQuizSession.findOne.mockResolvedValueOnce(null);

      const response = await request(app)
        .post(`/api/sessions/${mockCode}/answer`)
        .send({
          playerId: 'player123',
          questionId: 'question123',
          answerId: 'answer123',
          isCorrect: true,
          timeToAnswer: 15
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Session not found' });
    });

    it('should return 400 if session is not active', async () => {
      const mockCode = 'ABC123';
      
      // Mock the findOne method
      const mockSession = {
        status: 'waiting' // Not active
      };
      
      SharedQuizSession.findOne.mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .post(`/api/sessions/${mockCode}/answer`)
        .send({
          playerId: 'player123',
          questionId: 'question123',
          answerId: 'answer123',
          isCorrect: true,
          timeToAnswer: 15
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Session is not active' });
    });

    it('should return 404 if player is not found in session', async () => {
      const mockCode = 'ABC123';
      const mockPlayerId = 'nonExistentPlayer';
      
      // Mock the findOne method
      const mockSession = {
        status: 'active',
        players: []
      };
      
      SharedQuizSession.findOne.mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .post(`/api/sessions/${mockCode}/answer`)
        .send({
          playerId: mockPlayerId,
          questionId: 'question123',
          answerId: 'answer123',
          isCorrect: true,
          timeToAnswer: 15
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Player not found in this session' });
    });
  });

  describe('GET /:code/status', () => {
    it('should return session status and players', async () => {
      const mockCode = 'ABC123';
      
      // Mock the findOne method
      const mockSession = {
        waitingForNext: false,
        code: mockCode,
        status: 'active',
        currentQuestionIndex: 2,
        players: [
          {
            id: 'player1',
            username: 'Player 1',
            score: 150,
            answers: [{ questionId: 'q1', answerId: 'a1', isCorrect: true }]
          }
        ]
      };
      
      SharedQuizSession.findOne.mockResolvedValueOnce(mockSession);
  
      const response = await request(app)
        .get(`/api/sessions/${mockCode}/status`);
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        waitingForNext: false,
        status: 'active',
        currentQuestionIndex: 2,
        players: [
          {
            id: 'player1',
            username: 'Player 1',
            score: 150,
            answers: [{ questionId: 'q1', answerId: 'a1', isCorrect: true }]
          }
        ]
      });
    });
  });

  describe('GET /:code/end', () => {
    it('should end a session when host requests it', async () => {
      const mockCode = 'ABC123';
      const mockHostId = 'host123';
      
      // Mock the findOne method
      const mockSession = {
        hostId: mockHostId,
        checkForNoAnswer: jest.fn().mockResolvedValue(true),
        finish: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
        players: [
          {
            id: 'player1',
            username: 'Player 1',
            score: 150,
            answers: [{ questionId: 'q1', answerId: 'a1', isCorrect: true }],
            total_time: 45
          }
        ]
      };
      
      SharedQuizSession.findOne.mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .get(`/api/sessions/${mockCode}/end`)
        .query({ hostId: mockHostId });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        status: undefined, // The mock doesn't have a status property after finish()
        players: [
          {
            id: 'player1',
            username: 'Player 1',
            score: 150,
            answers: [{ questionId: 'q1', answerId: 'a1', isCorrect: true }],
            total_time: 45
          }
        ]
      });
      expect(mockSession.checkForNoAnswer).toHaveBeenCalled();
      expect(mockSession.finish).toHaveBeenCalled();
      expect(socketHandlerObject.io.to).toHaveBeenCalledWith(mockCode);
      expect(socketHandlerObject.io.to().emit).toHaveBeenCalledWith('session-ended', {
        players: expect.any(Array)
      });
    });

    it('should return 400 if hostId is missing', async () => {
      const mockCode = 'ABC123';
      
      const response = await request(app)
        .get(`/api/sessions/${mockCode}/end`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing host ID' });
    });

    it('should return 404 if session is not found', async () => {
      const mockCode = 'INVALID';
      const mockHostId = 'host123';
      
      // Mock the findOne method to return null (session not found)
      SharedQuizSession.findOne.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/sessions/${mockCode}/end`)
        .query({ hostId: mockHostId });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Session not found' });
    });

    it('should return 403 if requester is not the host', async () => {
      const mockCode = 'ABC123';
      const mockHostId = 'host123';
      const mockRequesterId = 'notTheHost';
      
      // Mock the findOne method
      const mockSession = {
        hostId: mockHostId
      };
      
      SharedQuizSession.findOne.mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .get(`/api/sessions/${mockCode}/end`)
        .query({ hostId: mockRequesterId });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Only the host can end the session' });
    });
  });
});