const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const router = require('./RouterGameInfo')
const e = require("express");

let mongoServer;
let app;
let server;

beforeAll(async function (){
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    app = express();
    app.use(router);
    server = app.listen(0);
});

afterAll(async function (){
    await mongoose.disconnect();
    server.close();
    await mongoServer.stop();
});

describe('Game Info Router', async function (){
   it('should add the valid game information');
   it('should throw an exception if the data in invalid');
   it('')
});