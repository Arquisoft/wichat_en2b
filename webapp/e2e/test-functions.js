const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
if (mongoose.models.User) {
    delete mongoose.models.User;
    delete mongoose.modelSchemas.User;
}
// Registra el modelo de nuevo
const User = require('../../users/userservice/user-model')

/**
 * Clicks on an element with the given selector
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for the element
 */
async function click(page, selector) {
    await Promise.all([
        page.waitForNavigation({waitUntil: 'networkidle0'}),
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
    const data = userToAdd || {username: "mock", password: "123456", role: "USER"};

    try {
        // Verifica el estado actual de la conexión
        if (mongoose.connection.readyState !== 1) {
            // Intenta conectar
            await mongoose.connect(process.env.MONGODB_URI, {
                dbName: 'userdb',
                bufferCommands: true,
                socketTimeoutMS: 30000,
                connectTimeoutMS: 30000
            });
            console.log("✅ Connected to MongoMemoryServer using URI:", process.env.MONGODB_URI);
        } else {
            console.log("✅ Already connected to MongoMemoryServer");
        }

        // Verifica que realmente estás conectado
        console.log("Connection state after connect attempt:", mongoose.connection.readyState);
        // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting

        // Continúa con la creación del usuario solo si estás conectado
        if (mongoose.connection.readyState === 1) {
            const user = new User({
                username: data.username,
                password: bcrypt.hashSync(data.password, 10),
                role: data.role,
                createdAt: Date.now(),
                secret: "test",
            });

            let savedData = await user.save();
            console.log("✅ User created:", user);
            return savedData;
        } else {
            throw new Error("Failed to establish MongoDB connection, state: " + mongoose.connection.readyState);
        }
    } catch (err) {
        console.error("⚠️ Error:", err);
        throw err;
    }
}

async function login(page, username, password) {
    await writeIntoInput(page, '#username', username);
    await writeIntoInput(page, '#password', password);
    await click(page, 'form > button');
}

async function accessQuiz(page, expect, quizSelector = null) {
    await click(page, quizSelector ? quizSelector : "a[href='/quiz/category/1']");
    await expect(page).toMatchElement("* > header > div > a", {text: "Back to Dashboard"});
    await click(page, "#__next > div > div > button:first-child");
}

async function goToInitialPage(page) {
    await page
        .goto("http://localhost:3000/login", {
            waitUntil: "networkidle0",
        })
        .catch(() => {
        });
}

module.exports = {
    click,
    writeIntoInput,
    addUser,
    login,
    accessQuiz,
    goToInitialPage
}