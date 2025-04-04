const mongoose = require('mongoose');
const bcrypt = require("bcrypt");

beforeAll(async () => {
    jest.setTimeout(60000)
    // put your client connection code here, example with mongoose:
    const mongooseDB = await mongoose.connect(process.env.MONGODB_URI, {
        bufferCommands: true,
        socketTimeoutMS: 30000,
        connectTimeoutMS: 30000
    });
    console.log("🗣️Connected with mongoose response: ", mongooseDB.connection.readyState);

    global.mongooseDB = mongooseDB;

    try{
        const data = {username: "mock", password: "123456", role: "USER"};
        global.userTestData = data;
        if (mongooseDB.connection.readyState === 1) {

            const userSchema = require('../../users/userservice/user-model').schema
            const User = mongooseDB.model('User', userSchema);
            const user = new User({
                username: data.username,
                password: bcrypt.hashSync(data.password, 10),
                role: data.role,
                createdAt: Date.now(),
                secret: "test",
            });

            let savedData = await user.save();
            console.log("✅ User created:", user);
            return;
        } else {
            throw new Error("Failed to establish MongoDB connection, state: " + mongooseDB.connection.readyState);
        }
    } catch (err) {
        console.error("⚠️ Error:", err);
        throw err;
    }
}, 15000);

afterAll(async () => {
    // put your client disconnection code here, example with mongoose:
    if (global.mongooseDB.connection.readyState === 1 ){
        global.mongooseDB.disconnect();
        console.log("✅ Disconnected from MongoDB");
    }
});

