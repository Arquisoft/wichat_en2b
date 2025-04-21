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
        { _id: 'testuser', role: 'USER' },
        'testing-secret',
        { expiresIn: '1h' }
    );
});

afterAll(async function() {
    await mongoose.disconnect();
    server.close();
    await mongoServer.stop();
});

describe('Statistics Router', function() {
    beforeEach(async function() {
        // Sample game data
        await GameInfo.deleteMany({}); // Clear before inserting new data
        
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
        fetch.mockClear();
    });

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
        let dbUsers;
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
            dbUsers = await User.create(users);

            // Create game results with different scores
            const games = [
                // Top 10 users
                { user_id: dbUsers[0]._id, subject: 'math', points_gain: 1000, number_of_questions: 10, number_correct_answers: 10, total_time: 300 },
                { user_id: dbUsers[1]._id, subject: 'math', points_gain: 900, number_of_questions: 10, number_correct_answers: 9, total_time: 300 },
                { user_id: dbUsers[2]._id, subject: 'math', points_gain: 800, number_of_questions: 10, number_correct_answers: 8, total_time: 300 },
                { user_id: dbUsers[3]._id, subject: 'math', points_gain: 700, number_of_questions: 10, number_correct_answers: 7, total_time: 300 },
                { user_id: dbUsers[4]._id, subject: 'math', points_gain: 600, number_of_questions: 10, number_correct_answers: 6, total_time: 300 },
                { user_id: dbUsers[5]._id, subject: 'math', points_gain: 500, number_of_questions: 10, number_correct_answers: 5, total_time: 300 },
                { user_id: dbUsers[6]._id, subject: 'math', points_gain: 400, number_of_questions: 10, number_correct_answers: 4, total_time: 300 },
                { user_id: dbUsers[7]._id, subject: 'math', points_gain: 300, number_of_questions: 10, number_correct_answers: 3, total_time: 300 },
                { user_id: dbUsers[8]._id, subject: 'math', points_gain: 200, number_of_questions: 10, number_correct_answers: 2, total_time: 300 },
                { user_id: dbUsers[9]._id, subject: 'math', points_gain: 100, number_of_questions: 10, number_correct_answers: 1, total_time: 300 },
                // User outside top 10
                { user_id: dbUsers[10]._id, subject: 'math', points_gain: 50, number_of_questions: 10, number_correct_answers: 1, total_time: 300 }
            ];
            await GameInfo.insertMany(games);
        });
        
        it('should return top 10 players when the user is inside top 10', async function(){
            const token = jwt.sign( // User is user5
                { _id: dbUsers[4]._id, role: 'USER' },
                'testing-secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .get('/leaderboard')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.leaderboard).toHaveLength(10);
            expect(response.body.leaderboard[0]).toStrictEqual({
                _id: dbUsers[0]._id.toString(),
                totalScore: 1000,
                totalGames: 1,
                avgScore: 1000,
                rank: 1
            });
            expect(response.body.leaderboard[4]).toStrictEqual({
                _id: dbUsers[4]._id.toString(),
                totalScore: 600,
                totalGames: 1,
                avgScore: 600,
                rank: 5
            });
        });
        
        it('should return top 10 plus user when the user is outside top 10', async function() {
            const token = jwt.sign(
                { _id: dbUsers[10]._id, role: 'USER'},
                'testing-secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .get('/leaderboard')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.leaderboard).toHaveLength(11);
            expect(response.body.leaderboard[0]).toStrictEqual({
                _id: dbUsers[0]._id.toString(),
                totalScore: 1000,
                totalGames: 1,
                avgScore: 1000,
                rank: 1
            });
            expect(response.body.leaderboard[10]).toStrictEqual({
                _id: dbUsers[10]._id.toString(),
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

describe('Group Leaderboard API', () => {
    // Use ObjectIds instead of strings
    const user1Id = new mongoose.Types.ObjectId();
    const user2Id = new mongoose.Types.ObjectId();
    const user3Id = new mongoose.Types.ObjectId();
    const user4Id = new mongoose.Types.ObjectId();
    
    console.log("User1ID: ", user1Id);
    console.log("User2ID: ", user2Id);
    console.log("User3ID: ", user3Id);
    console.log("User4ID: ", user4Id);

    const User = mongoose.model('User');
    let validToken;
    let dbUsers;
    
    beforeAll(async () => {
        // We already have a connection from the previous suite
        // Clear collections before tests
        await User.deleteMany({});
        await GameInfo.deleteMany({});
        
        // Insert test users
        const testUsers = [
            { _id: user1Id, username: 'player1', role: 'USER', password: 'asdad' },
            { _id: user2Id, username: 'player2', role: 'USER', password: 'asdad' },
            { _id: user3Id, username: 'player3', role: 'USER', password: 'asdad' },
            { _id: user4Id, username: 'player4', role: 'USER', password: 'asdad' }
        ];
        
        dbUsers = await User.insertMany(testUsers);
        
        // Generate valid token for testing
        validToken = jwt.sign(
            { _id: user1Id.toString(), role: 'USER' },
            'testing-secret',
            { expiresIn: '1h' }
        );
    });
    
    beforeEach(async () => {
        // Clear game data before each test
        await GameInfo.deleteMany({});
        
        // Insert test games
        const testGames = [
            // Games for user1
            { user_id: user1Id, subject: 'math', points_gain: 100, number_of_questions: 10, number_correct_answers: 8, total_time: 300 },
            { user_id: user1Id, subject: 'history', points_gain: 150, number_of_questions: 10, number_correct_answers: 9, total_time: 250 },
            
            // Games for user2
            { user_id: user2Id, subject: 'math', points_gain: 80, number_of_questions: 10, number_correct_answers: 6, total_time: 320 },
            { user_id: user2Id, subject: 'science', points_gain: 120, number_of_questions: 10, number_correct_answers: 8, total_time: 280 },
            
            // Games for user3
            { user_id: user3Id, subject: 'math', points_gain: 150, number_of_questions: 10, number_correct_answers: 10, total_time: 240 },
            
            // user4 has no games
        ];
        
        await GameInfo.insertMany(testGames);
    });
    
    it('should verify game data is correctly saved', async () => {
        // Verify data in the collection
        const allGames = await GameInfo.find({});
        expect(allGames.length).toBe(5); // We have 5 test games
        
        // Verify user1 games
        const user1Games = await GameInfo.find({ user_id: user1Id });
        expect(user1Games.length).toBe(2);
    });
    
    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .post('/leaderboard/group')
            .send({ players: [dbUsers[1]._id] });
        
        expect(response.status).toBe(401);
    });
    
    it('should return 400 if players array is missing', async () => {
        const response = await request(app)
            .post('/leaderboard/group')
            .set('Authorization', `Bearer ${validToken}`)
            .send({});
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Invalid request body');
    });
    
    it('should return 400 if players is not an array', async () => {
        const response = await request(app)
            .post('/leaderboard/group')
            .set('Authorization', `Bearer ${validToken}`)
            .send({ players: dbUsers[0]._id });
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Invalid request body');
    });
    
    it('should return group leaderboard for specified players', async () => {
        const response = await request(app)
            .post('/leaderboard/group')
            .set('Authorization', `Bearer ${validToken}`)
            .send({ 
                players: [
                    user1Id.toString(), 
                    user2Id.toString(), 
                    user3Id.toString()
                ] 
            });
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('leaderboard');
        expect(Array.isArray(response.body.leaderboard)).toBe(true);
        expect(response.body.leaderboard).toHaveLength(3);
        console.log("leaderboard: ", response.body.leaderboard);
        // Verify the leaderboard is sorted by rank
        expect(response.body.leaderboard[0].rank).toBe(1);
        expect(response.body.leaderboard[1].rank).toBe(2);
        expect(response.body.leaderboard[2].rank).toBe(3);
        
        // User with highest score (rank 1)
        expect(response.body.leaderboard[0]._id).toBe(user1Id.toString());
        expect(response.body.leaderboard[0].totalScore).toBe(250);
        expect(response.body.leaderboard[0].totalGames).toBe(2);
        expect(response.body.leaderboard[0].avgScore).toBe(125);
        
        // User with second highest total score (rank 2)
        expect(response.body.leaderboard[1]._id).toBe(user2Id.toString());
        expect(response.body.leaderboard[1].totalScore).toBe(200);
        expect(response.body.leaderboard[1].totalGames).toBe(2);
        expect(response.body.leaderboard[1].avgScore).toBe(100);
        
        // User with lowest score (rank 3)
        expect(response.body.leaderboard[2]._id).toBe(user3Id.toString());
        expect(response.body.leaderboard[2].totalScore).toBe(150);
        expect(response.body.leaderboard[2].totalGames).toBe(1);
        expect(response.body.leaderboard[2].avgScore).toBe(150);
    });
    
    it('should return empty leaderboard for non-existent players', async () => {
        const response = await request(app)
            .post('/leaderboard/group')
            .set('Authorization', `Bearer ${validToken}`)
            .send({ 
                players: [
                    new mongoose.Types.ObjectId().toString(), 
                    new mongoose.Types.ObjectId().toString()
                ] 
            });
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('leaderboard');
        expect(Array.isArray(response.body.leaderboard)).toBe(true);
        expect(response.body.leaderboard).toHaveLength(0);
    });
    
    it('should return leaderboard only for players with game data', async () => {
        const response = await request(app)
            .post('/leaderboard/group')
            .set('Authorization', `Bearer ${validToken}`)
            .send({ 
                players: [
                    user1Id.toString(), 
                    user2Id.toString(), 
                    user3Id.toString(), 
                    user4Id.toString()
                ] 
            });
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('leaderboard');
        expect(Array.isArray(response.body.leaderboard)).toBe(true);
        
        // Only users with games should appear
        expect(response.body.leaderboard).toHaveLength(3);
        
        // Verify user4 is not in the leaderboard (no games)
        const hasUser4 = response.body.leaderboard.some(player => player._id === user4Id.toString());
        expect(hasUser4).toBe(false);
    });
});