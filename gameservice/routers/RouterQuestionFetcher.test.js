const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const router = require('./RouterQuestionFetcher');

let mongoServer;
let app;
let server;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

    app = express();
    app.use(router); // Attach the router to the app
    server = app.listen(0); // Start the server on a random port
});

afterAll(async () => {
    await mongoose.disconnect();
    server.close();
    await mongoServer.stop();
});

describe('Question Fetcher', () => {
    it('should fetch data from Wikidata', async () => {
        const response = await request(app).get('/generate/Q515/5');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', '✅ Data fetched successfully');
    }, 10000); // Increase timeout to 10 seconds

    it('should return an error for invalid type', async () => {
        const response = await request(app).get('/generate/Q000/5');
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', '❌ Failed to retrieve data');
    }, 10000);

    it('should return 5 questions)', async () => {
        const response = await request(app).get('/questions/Q515');
        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(5);
    });
}
);
