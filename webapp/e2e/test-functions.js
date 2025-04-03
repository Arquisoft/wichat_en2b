const bcrypt = require('bcrypt')
const User = require('../../users/userservice/user-model')
const mongoose = require('mongoose')

/**
 * Clicks on an element with the given selector
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for the element
 */
async function click(page, selector) {
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (element === null) {
                throw Error("The selector did not match any element");
            }
            element.click();
        }, selector)
    ]);
}

/**
 * Writes text into an input element
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for the input
 * @param {string} text - Text to write
 */
async function writeIntoInput(page, selector, text) {
    await page.waitForSelector(selector);
    await page.type(selector, text);
}

async function addUser(userToAdd) {
    let data = userToAdd || { username: "mock", password: "123456", role: "USER" };
    let user;

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error("❌ MongoDB URI is not defined in the environment variables.");
    }

    const usersCollection = global.db.collection('users');

    try {
        const existingUser = await usersCollection.findOne({ username: data.username });
        if (existingUser) {
            throw new Error('❌ Username already exists');
        }

        user = {
            username: data.username,
            password: bcrypt.hashSync(data.password, 10),
            role: data.role,
            createdAt: Date.now(),
            secret: "test",
        };

        // Insertar el documento usando MongoClient
        await usersCollection.insertOne(user);
        console.log("✅ User created:", user);

        mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 30000,
        });

        // Ahora, usar Mongoose para buscar este usuario
        const mongooseUser = await User.findOne({ username: data.username });
        if (mongooseUser) {
            console.log("✅ User found using Mongoose:", mongooseUser);
        } else {
            console.log("❌ User not found using Mongoose");
        }

    } catch (err) {
        console.error("⚠️ Error creating the user 'mock'", err);
    }

    if (!user) {
        throw new Error("❌ Error when finding or creating the user.");
    }

    return data;
}


async function login(page, username, password){
    await writeIntoInput(page,'#username', username);
    await writeIntoInput(page,'#password', password);
    await click(page,'form > button');
}

async function accessQuiz(page, expect, quizSelector=null){
    await click(page, quizSelector?quizSelector:"a[href='/quiz/category/1']");
    await expect(page).toMatchElement("* > header > div > a", { text: "Back to Dashboard"});
    await click(page, "#__next > div > div > button:first-child");
}

async function goToInitialPage(page){
    await page
        .goto("http://localhost:3000/login", {
            waitUntil: "networkidle0",
        })
        .catch(() => {});
}

module.exports = {
    click,
    writeIntoInput,
    addUser,
    login,
    accessQuiz,
    goToInitialPage
}