const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { setDefaultOptions } = require("expect-puppeteer");


beforeAll(async () => {
    jest.setTimeout(60000);
    setDefaultOptions({timeout: 60000, });
    // put your client connection code here, example with mongoose:
    const mongooseDB = await mongoose.connect(process.env.MONGODB_URI, {
        bufferCommands: true,
        socketTimeoutMS: 30000,
        connectTimeoutMS: 30000
    });
    console.log("🗣️Connected with mongoose response: ", mongooseDB.connection.readyState);

    global.mongooseDB = mongooseDB;
    await configUserAddition();
    await configGameInfoAddition();
    global.mockQuestions = Array.from({ length: 10 }, (_, i) => ({
        image_name: `/images/mock${(i % 2) + 1}.jpg`,
        answers: i % 2 === 0
            ? ["Answer 1", "Answer 2", "Answer 3", "Answer 4"]
            : ["Answer 4", "Answer 5", "Answer 6", "Answer 7"],
        question_id: '1'
    }));
}, 15000);

afterAll(async () => {
    // put your client disconnection code here, example with mongoose:
    if (global.mongooseDB.connection.readyState === 1 ){
        global.mongooseDB.disconnect();
        console.log("✅ Disconnected from MongoDB");
    }
});

async function configUserAddition(){
    try{
        const data = {username: "mock", password: "mocK$1111", role: "USER"};
        global.userTestData = data;
        if (mongooseDB.connection.readyState === 1) {
            const userModule = await import("../../users/userservice/user-model.mjs");

            const userSchema = userModule.default.schema;
            const User = mongooseDB.model('User', userSchema);
            const user = new User({
                username: data.username,
                password: bcrypt.hashSync(data.password, 10),
                role: data.role,
                createdAt: Date.now()
            });
            let wasAddedAlready = await User.findOne({username: data.username});
            if (wasAddedAlready) {
                console.log("⚠️ User already exists, skipping creation.");
                return;
            }
            await user.save();
            global.userTestData = {
                ...data,
                _id: user._id,
                createdAt: user.createdAt,
                __v: user.__v
            }; //To inject the _id value
            console.log("✅ User created:", global.userTestData);
            return;
        } else {
            throw new Error("Failed to establish MongoDB connection, state: " + mongooseDB.connection.readyState);
        }
    } catch (err) {
        console.error("⚠️ Error:", err);
        throw err;
    }
}

async function configGameInfoAddition(){
    try{


        const data = [{
            user_id: global.userTestData.username,
            subject: "science",
            points_gain: 1400,
            number_of_questions: 10,
            number_correct_answers: 10,
            total_time: 50
        }, {
            user_id: global.userTestData.username,
            subject: "science",
            points_gain: 1400,
            number_of_questions: 10,
            number_correct_answers: 10,
            total_time: 40
        }];
        global.gameInfoTestData = data;
        if (mongooseDB.connection.readyState === 1) {

            const userSchema = require("../../gameservice/game-result-model.js").schema;
            const GameInfo = mongooseDB.model('GameInfo', userSchema);

            let gamesAddedAlready = await GameInfo.find(
                { user_id: global.userTestData.username
                })
            console.log("🗣️ Games already added: ", gamesAddedAlready.length);
            if (gamesAddedAlready.length == 2) {
                console.log("⚠️ Game information already exists, skipping creation.");
                return;
            } else if (gamesAddedAlready.length > 2) {
                throw Error("❌ Too many game information records, information was duplicated!.");

            }
            const game1 = new GameInfo(data[0]);
            const game2 = new GameInfo(data[1]);

            await game1.save();
            await game2.save();
            global.gameInfoTestData = [game1, game2]; //To inject the _id values
            console.log("✅ Game information saved!:", global.gameInfoTestData);
            return;
        } else {
            throw new Error("Failed to establish MongoDB connection, state: " + mongooseDB.connection.readyState);
        }

    } catch (err) {
        console.error("⚠️ Error:", err);
        throw err;
    }
}
