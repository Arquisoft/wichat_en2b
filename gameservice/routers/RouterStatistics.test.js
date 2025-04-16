const mongoose = require('mongoose');
const GameInfo = require('../game-result-model.js');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const jwt = require('jsonwebtoken');
const router = require('./RouterStatistics');

// Modelling the user
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    role: String
});
mongoose.model('User', userSchema);

let mongoServer;
let app;
let server;
let validToken;

global.fetch = jest.fn((url, options) => {
    const authHeader = options.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    try {
        const user = jwt.verify(token, 'testing-secret');
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(user)
        });
    } catch (err) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Invalid token' }) });
    }
});

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
    fetch.mockClear();

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
            expect(response.body.stats).toStrictEqual({
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
        beforeEach(async function() {
            await GameInfo.deleteMany({});
            const User = mongoose.model('User');
            await User.deleteMany({});

            // Create 11 users
            const users = Array.from({length: 11}, (_, i) => ({
                username: `user${i + 1}`,
                password: 'hashedpass',
                role: 'USER'
            }));
            await User.create(users);

            // Create game results with different scores
            const games = [
                // Top 10 users
                { user_id: 'user1', subject: 'math', points_gain: 1000, number_of_questions: 10, number_correct_answers: 10, total_time: 300 },
                { user_id: 'user2', subject: 'math', points_gain: 900, number_of_questions: 10, number_correct_answers: 9, total_time: 300 },
                { user_id: 'user3', subject: 'math', points_gain: 800, number_of_questions: 10, number_correct_answers: 8, total_time: 300 },
                { user_id: 'user4', subject: 'math', points_gain: 700, number_of_questions: 10, number_correct_answers: 7, total_time: 300 },
                { user_id: 'user5', subject: 'math', points_gain: 600, number_of_questions: 10, number_correct_answers: 6, total_time: 300 },
                { user_id: 'user6', subject: 'math', points_gain: 500, number_of_questions: 10, number_correct_answers: 5, total_time: 300 },
                { user_id: 'user7', subject: 'math', points_gain: 400, number_of_questions: 10, number_correct_answers: 4, total_time: 300 },
                { user_id: 'user8', subject: 'math', points_gain: 300, number_of_questions: 10, number_correct_answers: 3, total_time: 300 },
                { user_id: 'user9', subject: 'math', points_gain: 200, number_of_questions: 10, number_correct_answers: 2, total_time: 300 },
                { user_id: 'user10', subject: 'math', points_gain: 100, number_of_questions: 10, number_correct_answers: 1, total_time: 300 },
                // User outside top 10
                { user_id: 'user11', subject: 'math', points_gain: 50, number_of_questions: 10, number_correct_answers: 1, total_time: 300 }

            ];
            await GameInfo.insertMany(games);
        });
        it('should return top 10 players when the user is inside top 10', async function(){
            const token = jwt.sign( // User is user5
                { username: 'user5', role: 'USER' },
                'testing-secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .get('/leaderboard')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.leaderboard).toHaveLength(10);
            expect(response.body.leaderboard[0]).toStrictEqual({
                _id: 'user1',
                username: 'user1',
                totalScore: 1000,
                totalGames: 1,
                avgScore: 1000,
                rank: 1
            });
            expect(response.body.leaderboard[4]).toStrictEqual({
                _id: 'user5',
                username: 'user5',
                totalScore: 600,
                totalGames: 1,
                avgScore: 600,
                rank: 5
            });
        });
        it('should return top 10 plus user when the user is outside top 10', async function() {
            const token = jwt.sign(
                { username: 'user11', role: 'USER' , _id: "user11"},
                'testing-secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .get('/leaderboard')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.leaderboard).toHaveLength(11);
            expect(response.body.leaderboard[0]).toStrictEqual({
                _id: 'user1',
                username: 'user1',
                totalScore: 1000,
                totalGames: 1,
                avgScore: 1000,
                rank: 1
            });
            expect(response.body.leaderboard[10]).toStrictEqual({
                _id: 'user11',
                username: 'user11',
                totalScore: 50,
                totalGames: 1,
                avgScore: 50,
                rank: 11
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