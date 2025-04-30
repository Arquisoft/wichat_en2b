const { initializeSocket } = require('../socket/socketHandler');
const socketIo = require('socket.io');
const SharedQuizSession = require('../models/session-model');

// Mock dependencies
jest.mock('socket.io');
jest.mock('../models/session-model');

describe('Socket Handler', () => {
  let mockServer;
  let mockIo;
  let mockSocket;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock server
    mockServer = {};
    
    // Mock socket.io instance
    mockIo = {
      on: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    };
    
    // Mock socket
    mockSocket = {
      id: 'socket123',
      join: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      on: jest.fn()
    };
    
    // Setup socketIo mock to return our mockIo
    socketIo.mockReturnValue(mockIo);
  });
  
  describe('initializeSocket', () => {
    it('should initialize socket.io with correct options', () => {
      const handler = require('../socket/socketHandler');
      handler.io = null; // Reset io
      
      const result = handler.initializeSocket(mockServer);
      
      expect(socketIo).toHaveBeenCalledWith(mockServer, {
        cors: {
          origin: [
            "http://localhost:3000",   // Development URL
            "https://wichat.ddns.net", // Production URL
          ],
          methods: ['GET', 'POST'],
          credentials: true
        }
      });
      
      expect(result).toBe(mockIo);
      expect(handler.io).toBe(mockIo);
    });
    
    it('should set up connection handler', () => {
      const handler = require('../socket/socketHandler');
      handler.io = null; // Reset io
      
      handler.initializeSocket(mockServer);
      
      expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });
  
  describe('Socket Events', () => {
    let connectionHandler;
    let handler;
    
    beforeEach(() => {
      handler = require('../socket/socketHandler');
      handler.io = null; // Reset io
      
      handler.initializeSocket(mockServer);
      
      // Extract the connection handler function
      connectionHandler = mockIo.on.mock.calls[0][1];
    });
    
    it('should handle "join-session" event with valid session', async () => {
      const mockCode = 'ABC123';
      const mockPlayerId = 'player123';
      const mockUsername = 'TestPlayer';
      
      const mockSession = {
        code: mockCode,
        status: 'waiting',
        currentQuestionIndex: 0,
        players: [
          {
            id: 'player1',
            username: 'Player 1',
            score: 100
          }
        ]
      };
      
      SharedQuizSession.findOne.mockResolvedValueOnce(mockSession);
      
      // Call the connection handler with our mock socket
      connectionHandler(mockSocket);
      
      // Extract the join-session handler
      const joinSessionHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'join-session'
      )[1];
      
      // Call the join-session handler
      await joinSessionHandler({
        code: mockCode,
        playerId: mockPlayerId,
        username: mockUsername
      });
      
      expect(SharedQuizSession.findOne).toHaveBeenCalledWith({ code: mockCode });
      expect(mockSocket.join).toHaveBeenCalledWith(mockCode);
      expect(mockSocket.sessionCode).toBe(mockCode);
      expect(mockSocket.playerId).toBe(mockPlayerId);
      expect(mockSocket.username).toBe(mockUsername);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('joined-session', {
        code: mockCode,
        status: 'waiting',
        currentQuestionIndex: 0,
        players: [
          {
            id: 'player1',
            username: 'Player 1',
            score: 100
          }
        ]
      });
      
      expect(mockSocket.to).toHaveBeenCalledWith(mockCode);
      expect(mockSocket.to().emit).toHaveBeenCalledWith('player-joined', {
        playerId: mockPlayerId,
        username: mockUsername
      });
    });
    
    it('should handle "join-session" event with invalid session', async () => {
      SharedQuizSession.findOne.mockResolvedValueOnce(null);
      
      // Call the connection handler with our mock socket
      connectionHandler(mockSocket);
      
      // Extract the join-session handler
      const joinSessionHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'join-session'
      )[1];
      
      // Call the join-session handler
      await joinSessionHandler({
        code: 'INVALID',
        playerId: 'player123',
        username: 'TestPlayer'
      });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Session not found'
      });
      expect(mockSocket.join).not.toHaveBeenCalled();
    });
    
    it('should handle "join-session" event with exception', async () => {
      SharedQuizSession.findOne.mockRejectedValueOnce(new Error('Database error'));
      
      // Call the connection handler with our mock socket
      connectionHandler(mockSocket);
      
      // Extract the join-session handler
      const joinSessionHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'join-session'
      )[1];
      
      // Call the join-session handler
      await joinSessionHandler({
        code: 'ABC123',
        playerId: 'player123',
        username: 'TestPlayer'
      });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to join session'
      });
    });
    
    it('should handle "host-session" event with valid session and host', async () => {
      const mockCode = 'ABC123';
      const mockHostId = 'host123';
      
      const mockSession = {
        code: mockCode,
        hostId: mockHostId,
        status: 'waiting',
        currentQuestionIndex: 0,
        players: [
          {
            id: 'player1',
            username: 'Player 1',
            score: 100
          }
        ]
      };
      
      SharedQuizSession.findOne.mockResolvedValueOnce(mockSession);
      
      // Call the connection handler with our mock socket
      connectionHandler(mockSocket);
      
      // Extract the host-session handler
      const hostSessionHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'host-session'
      )[1];
      
      // Call the host-session handler
      await hostSessionHandler({
        code: mockCode,
        hostId: mockHostId
      });
      
      expect(SharedQuizSession.findOne).toHaveBeenCalledWith({ code: mockCode });
      expect(mockSocket.join).toHaveBeenCalledWith(mockCode);
      expect(mockSocket.sessionCode).toBe(mockCode);
      expect(mockSocket.isHost).toBe(true);
      expect(mockSocket.hostId).toBe(mockHostId);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('hosting-session', {
        code: mockCode,
        status: 'waiting',
        currentQuestionIndex: 0,
        players: [
          {
            id: 'player1',
            username: 'Player 1',
            score: 100
          }
        ]
      });
    });
    
    it('should handle "host-session" event with invalid host', async () => {
      const mockCode = 'ABC123';
      const mockHostId = 'host123';
      const wrongHostId = 'wrongHost';
      
      const mockSession = {
        code: mockCode,
        hostId: mockHostId,
        status: 'waiting',
        currentQuestionIndex: 0,
        players: []
      };
      
      SharedQuizSession.findOne.mockResolvedValueOnce(mockSession);
      
      // Call the connection handler with our mock socket
      connectionHandler(mockSocket);
      
      // Extract the host-session handler
      const hostSessionHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'host-session'
      )[1];
      
      // Call the host-session handler with wrong hostId
      await hostSessionHandler({
        code: mockCode,
        hostId: wrongHostId
      });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'You are not the host of this session'
      });
      expect(mockSocket.join).not.toHaveBeenCalled();
    });
    
    it('should handle "send-message" event when in a session', () => {
      // Set up the mock io for this test
      global.io = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      };
      
      // Setup socket with session info
      mockSocket.sessionCode = 'ABC123';
      mockSocket.playerId = 'player123';
      mockSocket.username = 'TestPlayer';
      
      // Call the connection handler with our mock socket
      connectionHandler(mockSocket);
      
      // Extract the send-message handler
      const sendMessageHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'send-message'
      )[1];
      
      // Call the send-message handler
      const mockMessage = 'Hello everyone!';
      sendMessageHandler({ message: mockMessage });
      
      // Since we use io.to() in the handler and not socket.to(), we need to check global.io
      expect(global.io.to).toHaveBeenCalledWith('ABC123');
      expect(global.io.to().emit).toHaveBeenCalledWith('new-message', {
        senderId: 'player123',
        senderName: 'TestPlayer',
        isHost: false,
        message: mockMessage,
        timestamp: expect.any(Date)
      });
      
      // Clean up global
      delete global.io;
    });
    
    it('should handle "send-message" event when not in a session', () => {
      // Call the connection handler with our mock socket
      connectionHandler(mockSocket);
      
      // Extract the send-message handler
      const sendMessageHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'send-message'
      )[1];
      
      // Call the send-message handler
      sendMessageHandler({ message: 'Hello everyone!' });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'You are not in a session'
      });
    });
    
    it('should handle "disconnect" event when player is in a session', () => {
      // Setup socket with session info
      mockSocket.sessionCode = 'ABC123';
      mockSocket.playerId = 'player123';
      mockSocket.username = 'TestPlayer';
      
      // Call the connection handler with our mock socket
      connectionHandler(mockSocket);
      
      // Extract the disconnect handler
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];
      
      // Call the disconnect handler
      disconnectHandler();
      
      expect(mockSocket.to).toHaveBeenCalledWith('ABC123');
      expect(mockSocket.to().emit).toHaveBeenCalledWith('player-left', {
        playerId: 'player123',
        username: 'TestPlayer'
      });
    });
    
    it('should handle "disconnect" event when host is in a session', () => {
      // Setup socket with session info
      mockSocket.sessionCode = 'ABC123';
      mockSocket.hostId = 'host123';
      mockSocket.isHost = true;
      
      // Call the connection handler with our mock socket
      connectionHandler(mockSocket);
      
      // Extract the disconnect handler
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];
      
      // Call the disconnect handler
      disconnectHandler();
      
      // Host disconnecting shouldn't emit player-left
      expect(mockSocket.to().emit).not.toHaveBeenCalledWith('player-left', expect.anything());
    });
    
    it('should handle "waiting-for-next" event with valid session', async () => {
      const mockCode = 'ABC123';
      
      const mockSession = {
        save: jest.fn().mockResolvedValue(true)
      };
      
      SharedQuizSession.findOne.mockResolvedValueOnce(mockSession);
      
      // Call the connection handler with our mock socket
      connectionHandler(mockSocket);
      
      // Extract the waiting-for-next handler
      const waitingHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'waiting-for-next'
      )[1];
      
      // Call the waiting-for-next handler
      await waitingHandler({ code: mockCode });
      
      expect(SharedQuizSession.findOne).toHaveBeenCalledWith({ code: mockCode });
      expect(mockSession.waitingForNext).toBe(true);
      expect(mockSession.save).toHaveBeenCalled();
      expect(mockSocket.to).toHaveBeenCalledWith(mockCode);
      expect(mockSocket.to().emit).toHaveBeenCalledWith('waiting-for-next');
    });
    
    it('should handle "waiting-for-next" event with invalid session', async () => {
      SharedQuizSession.findOne.mockResolvedValueOnce(null);
      
      // Call the connection handler with our mock socket
      connectionHandler(mockSocket);
      
      // Extract the waiting-for-next handler
      const waitingHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'waiting-for-next'
      )[1];
      
      // Call the waiting-for-next handler
      await waitingHandler({ code: 'INVALID' });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Session not found'
      });
    });
    
    it('should handle "waiting-for-next" event with exception', async () => {
      SharedQuizSession.findOne.mockRejectedValueOnce(new Error('Database error'));
      
      // Call the connection handler with our mock socket
      connectionHandler(mockSocket);
      
      // Extract the waiting-for-next handler
      const waitingHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'waiting-for-next'
      )[1];
      
      // Call the waiting-for-next handler
      await waitingHandler({ code: 'ABC123' });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to process waiting-for-next'
      });
    });
  });
});