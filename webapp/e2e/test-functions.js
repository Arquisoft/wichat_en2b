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
    login,
    accessQuiz,
    goToInitialPage
}