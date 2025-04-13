const mongoose = require('mongoose');
const GameInfo = require('../game-result-model.js');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const jwt = require('jsonwebtoken');
const router = require('./RouterGameInfo');

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
        return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Invalid token' })
        });
    }
});

beforeAll(async function (){
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

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

afterAll(async function (){
    await mongoose.disconnect();
    server.close();
    await mongoServer.stop();
    fetch.mockClear();
});

describe('Game Info Router', function (){
    it('should add the valid game information', async function() {
        const validGameData = {
            subject: 'math',
            points_gain: 100,
            number_of_questions: 10,
            number_correct_answers: 8,
            total_time: 300
        };

        const response = await request(app)
            .post('/game')
            .set('Authorization', `Bearer ${validToken}`)
            .send(validGameData);

        expect(response.status).toBe(201);

        const savedGame = await GameInfo.findOne({ user_id: 'testuser' });

        expect(savedGame).not.toBeNull();
        expect(savedGame.subject).toBe('math');
        expect(savedGame.points_gain).toBe(100);
        expect(savedGame.number_of_questions).toBe(10);
        expect(savedGame.number_correct_answers).toBe(8);
        expect(savedGame.total_time).toBe(300);
    }, 10000);

    it('should throw an exception if the body data is invalid', async function() {
        const incompleteGameData = {
            subject: 'math',
            number_of_questions: 10,
            number_correct_answers: 8,
        };

        const response = await request(app)
            .post('/game')
            .set('Authorization', `Bearer ${validToken}`)
            .send(incompleteGameData);

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Error saving game data');
    });


    it('should throw an exception if the user is not registered', async function() {
        const validGameData = {
            subject: 'math',
            points_gain: 100,
            number_of_questions: 10,
            number_correct_answers: 8,
            total_time: 300
        };

        // Test with invalid token
        const invalidTokenResponse = await request(app)
            .post('/game')
            .set('Authorization', `Bearer invalidtoken123`)
            .send(validGameData);

        expect(invalidTokenResponse.status).toBe(401);
        expect(invalidTokenResponse.body.error).toBe('Invalid token');

        // Test with missing token
        const noTokenResponse = await request(app)
            .post('/game')
            .send(validGameData);

        expect(noTokenResponse.status).toBe(401);
        expect(noTokenResponse.body.error).toBe('Access token is required');
    });
});