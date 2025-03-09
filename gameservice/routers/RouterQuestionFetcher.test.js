const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;
    app = require('./RouterQuestionFetcher'); 
});

afterAll(async () => {
    app.close();
    await mongoServer.stop();
});

describe('Question Fetcher', () => {
    it('should fetch data from Wikidata', async () => {
        const response = await request(app).get('/generate/Q515/5');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', '✅ Data fetched successfully');
    });

    it('should return an error when failing to fetch data (non existing code)', async () => {
        const response = await request(app).get('/generate/Q000/5');
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', '❌ Failed to retrieve data');
    });

    it('should return 5 questions)', async () => {
        const response = await request(app).get('/questions/Q515');
        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(5);
    });
}
);
