const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Question = require('../question-model');
const router = require('./RouterQuestionRetriever');

let mongoServer;
let app;

describe('RouterQuestionRetriever', () => {
    beforeAll(async () => {
        // Create an in-memory MongoDB server
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        // Connect to the in-memory database
        await mongoose.connect(mongoUri);

        // Set up the Express app with the router
        app = express();
        app.use(express.json());
        app.use('/api', router);
    }, 10000); // Increase timeout to 10 seconds

    afterAll(async () => {
        // Clean up after tests
        await mongoose.disconnect();
        await mongoServer.stop();
    }, 10000); // Increase timeout to 10 seconds

    beforeEach(async () => {
        // Clear the database before each test
        await Question.deleteMany({});
    });

    it('should return 3 random questions with 3 options each by default', async () => {
        // Create test data
        const questions = [];
        for (let i = 1; i <= 10; i++) {
            questions.push({
                subject: 'Math',
                answer: `Answer ${i}`,
                _id: new mongoose.Types.ObjectId()
            });
        }
        await Question.insertMany(questions);

        const res = await request(app).get('/api/game/Math');

        expect(res.status).toBe(200);
        expect(res.body.length).toBe(3);
        res.body.forEach(question => {
            expect(question.answers.length).toBe(3);
            expect(question.image_name).toBe(`/images/${question.question_id}.jpg`);
        });
    }, 10000); // Increase timeout

    it('should return the specified number of questions and options', async () => {
        // Create test data
        const questions = [];
        for (let i = 1; i <= 10; i++) {
            questions.push({
                subject: 'Science',
                answer: `Answer ${i}`,
                _id: new mongoose.Types.ObjectId()
            });
        }
        await Question.insertMany(questions);

        const res = await request(app).get('/api/game/Science/2/4');

        expect(res.status).toBe(200);
        expect(res.body.length).toBe(2);
        res.body.forEach(question => {
            expect(question.answers.length).toBe(4);
        });
    }, 10000); // Increase timeout

    it('should return 400 if not enough questions in DB', async () => {
        await Question.insertMany([
            { _id: new mongoose.Types.ObjectId(), subject: 'History', answer: 'Answer 1' }
        ]);

        const res = await request(app).get('/api/game/History/3');

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Not enough questions in DB.');
    }, 10000); // Increase timeout

    it('should return 500 if an error occurs', async () => {
        // Mock the aggregate method to throw an error
        jest.spyOn(Question, 'aggregate').mockImplementationOnce(() => {
            throw new Error('Mocked error');
        });

        const res = await request(app).get('/api/game/Math');

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Error retrieving questions');

        // Restore the original implementation
        jest.restoreAllMocks();
    }, 10000); // Increase timeout
    // POST /question/validate tests
    it('should validate correct answer', async () => {
        const question = await Question.create({
            _id: new mongoose.Types.ObjectId(),
            subject: 'Math',
            answer: 'Mock answer'
        });

        const res = await request(app)
            .post('/api/question/validate')
            .send({
                question_id: question._id,
                selected_answer: 'Mock answer'
            });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            isCorrect: true,
            correctAnswer: null
        });
    });

    it('should validate incorrect answer', async () => {
        const question = await Question.create({
            _id: new mongoose.Types.ObjectId(),
            subject: 'Math',
            answer: 'Mock answer'
        });

        const res = await request(app)
            .post('/api/question/validate')
            .send({
                question_id: question._id,
                selected_answer: 'Wrong answer'
            });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            isCorrect: false,
            correctAnswer: 'Mock answer'
        });
    });

    it('should return 404 for non-existent question', async () => {
        let question_id = new mongoose.Types.ObjectId();
        const res = await request(app)
            .post('/api/question/validate')
            .send({
                question_id: question_id,
                selected_answer: 'Any answer'
            });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Question not found');
    });

    // GET /question/internal/:id tests
    it('should return right answer for internal use', async () => {
        const question = await Question.create({
            _id: new mongoose.Types.ObjectId(),
            subject: 'Math',
            answer: 'Mock answer'
        });

        const res = await request(app)
            .get(`/api/question/internal/${question._id}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            right_answer: 'Mock answer'
        });
    });

    it('should return 404 for non-existent question', async () => {
        const res = await request(app)
            .get(`/api/question/internal/${new mongoose.Types.ObjectId()}`);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Question not found');
    });

    it('should return 500 on database error', async () => {
        jest.spyOn(Question, 'findOne').mockImplementationOnce(() => {
            throw new Error('Database error');
        });

        const res = await request(app)
            .get(`/api/question/internal/${new mongoose.Types.ObjectId()}`);

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Error retrieving question data');
    });
});