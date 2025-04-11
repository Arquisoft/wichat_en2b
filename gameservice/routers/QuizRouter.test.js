const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const QuizCategories = require('../quizz-model'); // Adjust the path accordingly
const request = require('supertest');
const express = require('express');
const quizRouter = require('./QuizRouter'); // Adjust the path if needed

const app = express();
app.use(express.json());
app.use(quizRouter); // Use your router

// Mock global fetch for Wikidata and image downloading
global.fetch = jest.fn();

describe('Quiz Router Tests', () => {
  let mongoServer;

  beforeAll(async () => {
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async () => {
      await mongoose.disconnect();
      await mongoServer.stop();
  });

  afterEach(async () => {
      await QuizCategories.deleteMany();
      jest.clearAllMocks();
  });

  const validQuiz = {
      category: 'Science',
      quizName: 'Planets',
      wikidataQuery: 'SELECT ?item WHERE { ?item wdt:P31 wd:Q634. }',
      wikidataCode: 'WD_PLANETS',
      description: 'A quiz about the planets in our solar system',
      question: 'Which planet is known as the Red Planet?',
      difficulty: 3,
      numQuestions: 5,
      timePerQuestion: 15,
      numOptions: 4,
      color: '#ff5733'
  };

  it('GET /quiz - should return all quizzes', async () => {
      await QuizCategories.create(validQuiz);
      const res = await request(app).get('/quiz');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].quizName).toBe('Planets');
  });

  it('GET /quiz/AllTopics - should return distinct categories', async () => {
      await QuizCategories.create({ ...validQuiz, category: 'Math', quizName: 'test1' });
      await QuizCategories.create({ ...validQuiz, category: 'Science', quizName: 'test2' });
      
      const res = await request(app).get('/quiz/AllTopics');
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Math');
      expect(res.body).toContain('Science');
  });

  it('GET /quiz/:topic - should return quizzes for a topic', async () => {
    await QuizCategories.create({ ...validQuiz, category: 'Math', quizName:'test1' });
    await QuizCategories.create({ ...validQuiz, category: 'Science', quizName: 'test2' });

    const res = await request(app).get('/quiz/Math');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].category).toBe('Math');
});

it('should create quiz and save to database', async () => {
  const quizData = {
    quizName: 'Sample Quiz',
    category: 'Science',
    color: '#123456',
    numOptions: 4,
    timePerQuestion: 30,
    numQuestions: 10,
    difficulty: 3,
    question: 'What is the capital of France?',
    wikidataCode: 'Q298',
    wikidataQuery: 'SELECT ?item WHERE { ?item rdfs:label "Paris"@en }',
  };

  const response = await request(app)
    .post('/quiz')
    .send(quizData)
    .expect(201);

  // Check if the response contains the created quiz data
  expect(response.body.quizName).toBe(quizData.quizName);
  expect(response.body.category).toBe(quizData.category);
  expect(response.body.color).toBe(quizData.color);
  expect(response.body.numOptions).toBe(quizData.numOptions);
  expect(response.body.timePerQuestion).toBe(quizData.timePerQuestion);
  expect(response.body.numQuestions).toBe(quizData.numQuestions);
  expect(response.body.difficulty).toBe(quizData.difficulty);
  expect(response.body.question).toBe(quizData.question);
  expect(response.body.wikidataCode).toBe(quizData.wikidataCode);
  expect(response.body.wikidataQuery).toBe(quizData.wikidataQuery);

  const quizInDb = await QuizCategories.findById(response.body._id);
  expect(quizInDb).toBeTruthy();
});

it('POST /quiz - handles invalid quiz body gracefully', async () => {
  const res = await request(app)
      .post('/quiz')
      .send({}); // Invalid body

  expect(res.statusCode).toBe(500);
  expect(res.body.message).toBe('Server error');
});

});
describe('QuizCategories Model', () => {
    let mongoServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri(), {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    afterEach(async () => {
        await QuizCategories.deleteMany();
    });

    const validQuiz = {
        category: 'Science',
        quizName: 'Planets',
        wikidataQuery: 'SELECT ?item WHERE { ?item wdt:P31 wd:Q634. }',
        wikidataCode: 'WD_PLANETS',
        description: 'A quiz about the planets in our solar system',
        question: 'Which planet is known as the Red Planet?',
        difficulty: 3,
        numQuestions: 5,
        timePerQuestion: 15,
        numOptions: 4,
        color: '#ff5733'
    };

    it('should save a valid quiz', async () => {
        const quiz = new QuizCategories(validQuiz);
        const saved = await quiz.save();
        expect(saved._id).toBeDefined();
        expect(saved.quizName).toBe('Planets');
    });

    it('should fail to save duplicate quizName', async () => {
        await QuizCategories.create(validQuiz);

        try {
            await QuizCategories.create({ ...validQuiz });
        } catch (error) {
            expect(error.message).toBe('Quiz name must be unique. A quiz with this name already exists.');
        }
    });

    it('should require all required fields', async () => {
        const incomplete = new QuizCategories({});

        let err;
        try {
            await incomplete.validate();
        } catch (validationError) {
            err = validationError;
        }

        expect(err).toBeDefined();
        const requiredFields = [
            'category', 'quizName', 'wikidataQuery', 'wikidataCode',
            'question', 'difficulty', 'numQuestions', 'timePerQuestion',
            'numOptions', 'color'
        ];
        requiredFields.forEach(field => {
            expect(err.errors[field]).toBeDefined();
        });
    });

    it('should fail if color is not a valid hex code', async () => {
        const quiz = new QuizCategories({ ...validQuiz, color: 'red' });

        try {
            await quiz.validate();
        } catch (err) {
            expect(err.errors.color).toBeDefined();
        }
    });

    it('should fail if difficulty is out of range', async () => {
        const quiz = new QuizCategories({ ...validQuiz, difficulty: 10 });

        try {
            await quiz.validate();
        } catch (err) {
            expect(err.errors.difficulty).toBeDefined();
        }
    });

    it('should fail if numOptions < 2 or > 10', async () => {
        const low = new QuizCategories({ ...validQuiz, numOptions: 1 });
        const high = new QuizCategories({ ...validQuiz, numOptions: 11 });

        await expect(low.validate()).rejects.toThrow();
        await expect(high.validate()).rejects.toThrow();
    });
});
