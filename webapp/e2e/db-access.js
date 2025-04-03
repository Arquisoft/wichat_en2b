const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

async function startMemoryDB() {
    global.mongoserver = await MongoMemoryServer.create();
    const uri = global.mongoserver.getUri();


    global.mongoClient = new MongoClient(uri);
    await global.mongoClient.connect();


    global.db = global.mongoClient.db('userdb');

    console.log("✅ Connected to MongoMemoryServer.");
}

async function stopMemoryDB() {
    if (global.mongoClient) {
        await global.mongoClient.close();
    }
    if (global.mongoserver) {
        await global.mongoserver.stop();
    }
    console.log("🛑 MongoMemoryServer stopped.");
}

module.exports = {
    startMemoryDB,
    stopMemoryDB
};
