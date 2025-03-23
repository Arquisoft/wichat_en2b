const mongoose = require('mongoose');
const GameInfo = require('../game-result-model');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const jwt = require('jsonwebtoken');
const router = require('./RouterStatistics');

let mongoServer;
let app;
let server;
let validToken;

beforeAll(async function() {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    app = express();
    app.use(express.json());
    app.use(router);
    server = app.listen(0);
    validToken = jwt.sign(
        { username: 'testuser', role: 'USER' },
        'testing-secret',
        { expiresIn: '1h' }
    );
});

beforeEach(async function() {
    // Sample game data
    const testGames = [
        {
            user_id: 'testuser',
            subject: 'math',
            points_gain: 100,
            number_of_questions: 10,
            number_correct_answers: 8,
            total_time: 300
        },
        {
            user_id: 'testuser',
            subject: 'math',
            points_gain: 80,
            number_of_questions: 10,
            number_correct_answers: 6,
            total_time: 250
        },
        {
            user_id: 'otheruser',
            subject: 'math',
            points_gain: 150,
            number_of_questions: 10,
            number_correct_answers: 9,
            total_time: 280
        }
    ];

    await GameInfo.insertMany(testGames);
});

afterEach(async function() {
    await GameInfo.deleteMany({});
});

afterAll(async function() {
    await mongoose.disconnect();
    server.close();
    await mongoServer.stop();
});

describe('Statistics Router', function() {
    describe('Subject Statistics', function() {
        it('should return correct statistics for a specific subject', async function() {
            const response = await request(app)
                .get('/statistics/subject/math')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(200);
            expect(response.body.subject).toBe('math');
            expect(response.body.stats).toStrictEqual({
                _id: 'math',
                totalGames: 2,
                avgScore: 90,
                totalScore: 180,
                totalCorrectAnswers: 14,
                totalQuestions: 20,
                avgTime: 275,
                successRatio: 0.7
            });
        });

        it('should return null stats for non-existent subject', async function() {
            const response = await request(app)
                .get('/statistics/subject/physics')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(200);
            expect(response.body.stats).toBeNull();
        });
    });

    describe('Global Statistics', function() {
        it('should return correct global statistics for user', async function() {
            const response = await request(app)
                .get('/statistics/global')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(200);
            expect(response.body.stats).toMatchObject({
                _id: null,
                totalGames: 2,
                avgScore: 90,
                totalScore: 180,
                totalCorrectAnswers: 14,
                totalQuestions: 20,
                avgTime: 275,
                successRatio: 0.7
            });
        });
    });

    describe('Leaderboard', function() {
        it('should return correct leaderboard data', async function() {
            const response = await request(app)
                .get('/leaderboard')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(200);
            expect(response.body.leaderboard).toHaveLength(2);
            expect(response.body.leaderboard[0]).toStrictEqual({
                _id: 'testuser',
                totalScore: 180,
                totalGames: 2,
                avgScore: 90
            });
            expect(response.body.leaderboard[1]).toStrictEqual({
                _id: 'otheruser',
                totalScore: 150,
                totalGames: 1,
                avgScore: 150
            });

        });
    });

    describe('Authentication', function() {
        it('should reject requests without valid token', async function() {
            const invalidToken = 'invalid.token.here';
            const endpoints = [
                '/statistics/subject/math',
                '/statistics/global',
                '/leaderboard'
            ];

            for (const endpoint of endpoints) {
                const response = await request(app)
                    .get(endpoint)
                    .set('Authorization', `Bearer ${invalidToken}`);

                expect(response.status).toBe(401);
                expect(response.body.error).toBe('Invalid token');
            }
        });

        it('should reject requests without token', async function() {
            const endpoints = [
                '/statistics/subject/math',
                '/statistics/global',
                '/leaderboard'
            ];

            for (const endpoint of endpoints) {
                const response = await request(app)
                    .get(endpoint);

                expect(response.status).toBe(401);
                expect(response.body.error).toBe('Access token is required');
            }
        });
    });
});