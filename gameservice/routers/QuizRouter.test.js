const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Question = require('../quizz-model');  // Assuming the model is in question-model.js

let mongoServer;

beforeAll(async () => {
  // Set up in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  // Close connection and stop the in-memory server
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clean up the database before each test
  await Question.deleteMany({});
});

describe('Question Model', () => {
  it('should be invalid if required fields are missing', async () => {
    const quiz = new Question({
      category: 'Science',
      quizName: '',  // Missing required quiz name
      wikidataQuery: 'some query',
      wikidataCode: 'Q123',
      description: 'A science quiz',
      question: 'What is 2 + 2?',
      difficulty: 3,
      numQuestions: 10,
      timePerQuestion: 15,
      numOptions: 4,
      color: '#ff0000',
    });

    try {
      await quiz.validate();
    } catch (error) {
      expect(error.errors['quizName']).toBeDefined();
    }
  });

  it('should be invalid if difficulty is outside valid range', async () => {
    const quiz = new Question({
      category: 'Math',
      quizName: 'Basic Math',
      wikidataQuery: 'some query',
      wikidataCode: 'Q456',
      description: 'A basic math quiz',
      question: 'What is 2 + 2?',
      difficulty: 6,  // Invalid difficulty
      numQuestions: 5,
      timePerQuestion: 10,
      numOptions: 4,
      color: '#00ff00',
    });

    try {
      await quiz.validate();
    } catch (error) {
      expect(error.errors['difficulty']).toBeDefined();
    }
  });

  it('should be invalid if color is not a valid hex code', async () => {
    const quiz = new Question({
      category: 'General Knowledge',
      quizName: 'Test Color',
      wikidataQuery: 'some query',
      wikidataCode: 'Q789',
      description: 'A quiz with invalid color',
      question: 'What is 2 + 2?',
      difficulty: 2,
      numQuestions: 5,
      timePerQuestion: 10,
      numOptions: 4,
      color: 'red',  // Invalid color
    });

    try {
      await quiz.validate();
    } catch (error) {
      expect(error.errors['color']).toBeDefined();
    }
  });

  it('should save a valid quiz', async () => {
    const validQuizData = {
      category: 'Science',
      quizName: 'Physics 101',
      wikidataQuery: 'some query',
      wikidataCode: 'Q123',
      description: 'A physics quiz',
      question: 'What is the speed of light?',
      difficulty: 3,
      numQuestions: 5,
      timePerQuestion: 10,
      numOptions: 4,
      color: '#ff0000',
    };

    const quiz = new Question(validQuizData);

    const savedQuiz = await quiz.save();

    expect(savedQuiz.quizName).toBe('Physics 101');
    expect(savedQuiz.color).toBe('#ff0000');
  });

  it('should throw an error if quiz name is not unique (duplicate key)', async () => {
    const existingQuiz = new Question({
      category: 'Math',
      quizName: 'Math 101',
      wikidataQuery: 'some query',
      wikidataCode: 'Q123',
      description: 'A math quiz',
      question: 'What is 2 + 2?',
      difficulty: 3,
      numQuestions: 5,
      timePerQuestion: 10,
      numOptions: 4,
      color: '#00ff00',
    });

    await existingQuiz.save();

    const newQuiz = new Question({
      category: 'Math',
      quizName: 'Math 101',  // Same quiz name
      wikidataQuery: 'some query',
      wikidataCode: 'Q123',
      description: 'Another math quiz',
      question: 'What is 3 + 3?',
      difficulty: 2,
      numQuestions: 5,
      timePerQuestion: 10,
      numOptions: 4,
      color: '#ff0000',
    });

    try {
      await newQuiz.save();
    } catch (error) {
      expect(error.message).toBe('Quiz name must be unique. A quiz with this name already exists.');
    }
  });
});
