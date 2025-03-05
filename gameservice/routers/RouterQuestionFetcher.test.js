const request = require('supertest');
const fetcher = require('./RouterQuestionFetcher');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;
    app = require('./user-service'); 
});

afterAll(async () => {
    app.close();
    await mongoServer.stop();
});
