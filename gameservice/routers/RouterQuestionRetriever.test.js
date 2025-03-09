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

});