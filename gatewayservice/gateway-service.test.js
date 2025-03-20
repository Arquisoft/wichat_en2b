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
});