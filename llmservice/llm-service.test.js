const request = require('supertest');
const axios = require('axios');
const app = require('./llm-service'); 

afterAll(async () => {
    app.close();
  });

jest.mock('axios');

describe('LLM Service', () => {
  // Mock responses from external services
  axios.post.mockImplementation((url, data) => {
    if (url.startsWith('https://generativelanguage')) {
      return Promise.resolve({ data: { candidates: [{ content: { parts: [{ text: 'llmanswer' }] } }] } });
    } else if (url.endsWith('https://empathyai')) {
      return Promise.resolve({ data: { answer: 'llmanswer' } });
    }
  });

  // Test /askllm endpoint
  it('the llm should reply', async () => {
    const response = await request(app)
      .post('/askllm')
      .send({ conversation: [
        { 
          role: "user", 
          content: "Hello, can you give me a hint for the question?"
        }],
        model: 'gemini',
        possibleAnswers: {"answers":["San José","Lima","Perugia","Panama City"],"right_answer":"Panama City"} });

    expect(response.statusCode).toBe(200);
    console.log(response.body);
    expect(response.body.content).toBe('llmanswer');
  });

});