const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Question = require('../question-model');
const router = require('./RouterQuestionRetriever');

const app = express();
app.use(express.json());
app.use('/api', router);

describe('RouterQuestionRetriever', () => {
    beforeAll(async () => {
        const url = `mongodb://127.0.0.1/test_database`;
        await mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await Question.deleteMany({});
    });
    it('should return 3 random questions with 3 options each by default', async () => {
        await Question.insertMany([
            { answer: 'Answer 1' },
            { answer: 'Answer 2' },
            { answer: 'Answer 3' },
            { answer: 'Answer 4' },
            { answer: 'Answer 5' }
        ]);

        const res = await request(app).get('/api/game');

        expect(res.status).toBe(200);
        expect(res.body.length).toBe(3);
        res.body.forEach(question => {
            expect(question.answers.length).toBe(3);
            expect(question.answers).toContain(question.right_answer);
        });
    });

    it('should return the specified number of questions and options', async () => {
        await Question.insertMany([
            { answer: 'Answer 1' },
            { answer: 'Answer 2' },
            { answer: 'Answer 3' },
            { answer: 'Answer 4' },
            { answer: 'Answer 5' },
            { answer: 'Answer 6' }
        ]);

        const res = await request(app).get('/api/game/2/4');

        expect(res.status).toBe(200);
        expect(res.body.length).toBe(2);
        res.body.forEach(question => {
            expect(question.answers.length).toBe(4);
            expect(question.answers).toContain(question.right_answer);
        });
    });
    
    it('should return 400 if not enough questions in DB', async () => {
        await Question.insertMany([
            { answer: 'Answer 1' }
        ]);

        const res = await request(app).get('/api/game/3');

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Not enough questions in DB.');
    });

    it('should return 500 if an error occurs', async () => {
        jest.spyOn(Question, 'aggregate').mockImplementationOnce(() => {
            throw new Error('Mocked error');
        });

        const res = await request(app).get('/api/game');

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Error retrieving questions');
    });

});