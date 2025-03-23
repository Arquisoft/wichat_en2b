const request = require('supertest');
const axios = require('axios');
const app = require('./gateway-service'); 

afterAll(async () => {
    app.close();
  });
global.fetch = jest.fn();
jest.mock('axios');

describe('Gateway Service', () => {
  beforeEach(()=>{
    jest.clearAllMocks();
  });
  // Mock responses from external services
  axios.post.mockImplementation((url, data) => {
    if (url.endsWith('/login')) {
      return Promise.resolve({ data: { token: 'mockedToken' } });
    } else if (url.endsWith('/adduser')) {
      return Promise.resolve({ data: { userId: 'mockedUserId' } });
    } else if (url.endsWith('/askllm')) {
      return Promise.resolve({ data: { answer: 'llmanswer' } });
    }
  });

  // Test /login endpoint
  it('should forward login request to auth service', async () => {
    const response = await request(app)
      .post('/login')
      .send({ username: 'testuser', password: 'testpassword' });

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBe('mockedToken');
  });

  // Test /adduser endpoint
  it('should forward add user request to user service', async () => {
    const response = await request(app)
      .post('/adduser')
      .send({ username: 'newuser', password: 'newpassword' });

    expect(response.statusCode).toBe(200);
    expect(response.body.userId).toBe('mockedUserId');
  });

  // Test /askllm endpoint
  it('should forward askllm request to the llm service', async () => {
    const response = await request(app)
      .post('/askllm')
      .send({ question: 'question', apiKey: 'apiKey', model: 'gemini' });

    expect(response.statusCode).toBe(200);
    expect(response.body.answer).toBe('llmanswer');
  });

  //Test /game/:subject/:totalQuestions/:numberOptions endpoint
  it('should forward game/:subject/:totalQuestions/:numberOptions to the game service', async () => {
    const mockQuestions = [
      {
        image_name: '/images/123.jpg',
        answers: ['Answer 1', 'Answer 2', 'Answer 3'],
        right_answer: 'Answer 1'
      },
      {
        image_name: '/images/456.jpg',
        answers: ['Answer 4', 'Answer 5', 'Answer 6'],
        right_answer: 'Answer 4'
      }
    ];

    global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockQuestions)
        })
    );

    const response = await request(app)
        .get('/game/Math/6/4');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockQuestions);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8004/game/Math/6/4',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Origin': 'http://localhost:8000'
          })
        })
    );
  });

  //Test error response from /game/:subject/:totalQuestions/:numberOptions
  it('should handle game service errors', async () => {
    global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false
        })
    );

    const responseNotFound = await request(app)
        .get('/game/6/4');

    expect(responseNotFound.statusCode).toBe(404);

    const responseError = await request(app)
        .get('/game/Math/6/4');

    expect(responseError.statusCode).toBe(500);
    expect(responseError.body).toEqual({
      error: 'Hubo un problema al obtener las preguntas'
    });
  });

  // Test /game/statistics/subject/:subject endpoint
  it('should forward subject statistics request to game service', async () => {
    const mockStats = {
      stats: {
        totalGames: 10,
        avgScore: 85,
        totalScore: 850,
        totalCorrectAnswers: 42,
        totalQuestions: 50,
        avgTime: 25,
        successRatio: 0.84
      }
    };

    global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStats)
        })
    );

    const response = await request(app)
        .get('/statistics/subject/Math')
        .set('Authorization', 'Bearer mockToken');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockStats);
    expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8004/statistics/subject/Math',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mockToken',
            'Origin': 'http://localhost:8000'
          })
        })
    );
  });

// Test /game/statistics/global endpoint
  it('should forward global statistics request to game service', async () => {
    const mockGlobalStats = {
      stats: {
        totalGames: 20,
        avgScore: 75,
        totalScore: 1500,
        totalCorrectAnswers: 80,
        totalQuestions: 100,
        avgTime: 30,
        successRatio: 0.8
      }
    };

    global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGlobalStats)
        })
    );

    const response = await request(app)
        .get('/statistics/global')
        .set('Authorization', 'Bearer mockToken');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockGlobalStats);
    expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8004/statistics/global',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mockToken',
            'Origin': 'http://localhost:8000'
          })
        })
    );
  });

// Test /game/leaderboard endpoint
  it('should forward leaderboard request to game service', async () => {
    const mockLeaderboard = {
      leaderboard: [
        { username: 'user1', score: 100 },
        { username: 'user2', score: 90 },
        { username: 'user3', score: 80 }
      ]
    };

    global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockLeaderboard)
        })
    );

    const response = await request(app)
        .get('/leaderboard')
        .set('Authorization', 'Bearer mockToken');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockLeaderboard);
    expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8004/leaderboard',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mockToken',
            'Origin': 'http://localhost:8000'
          })
        })
    );
  });

// Test error handling
  describe('Error handling for statistics endpoints', () => {
    const errorScenarios = [
      {
        endpoint: '/statistics/subject/Math',
        errorMessage: 'Error retrieving subject statistics'
      },
      {
        endpoint: '/statistics/global',
        errorMessage: 'Error retrieving global statistics'
      },
      {
        endpoint: '/leaderboard',
        errorMessage: 'Error retrieving leaderboard'
      }
    ];

    errorScenarios.forEach(({ endpoint, errorMessage }) => {
      describe(`${endpoint} errors`, () => {
        it('should handle service errors', async () => {
          global.fetch.mockImplementationOnce(() =>
              Promise.resolve({
                ok: false
              })
          );

          const response = await request(app)
              .get(endpoint)
              .set('Authorization', 'Bearer mockToken');

          expect(response.statusCode).toBe(500);
          expect(response.body).toEqual({
            error: errorMessage
          });
        });

        it('should handle network errors', async () => {
          global.fetch.mockImplementationOnce(() =>
              Promise.reject(new Error('Network error'))
          );

          const response = await request(app)
              .get(endpoint)
              .set('Authorization', 'Bearer mockToken');

          expect(response.statusCode).toBe(500);
          expect(response.body).toEqual({
            error: errorMessage
          });
        });
      });
    });
  });
});