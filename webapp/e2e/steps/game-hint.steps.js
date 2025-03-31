const puppeteer = require('puppeteer');
const { defineFeature, loadFeature }=require('jest-cucumber');
const setDefaultOptions = require('expect-puppeteer').setDefaultOptions
const feature = loadFeature('./e2e/features/game-hint.feature');
const mongoose = require('mongoose');
const User = require('../../../users/userservice/user-model'); //Import the users model
const { click, addUser, login, accessQuiz, goToInitialPage, writeIntoInput} = require('../test-functions')
const {expect} = require("expect-puppeteer");

let page;
let browser;
let userData;

defineFeature(feature, test => {

    beforeAll(async () => {
        browser = process.env.GITHUB_ACTIONS
            ? await puppeteer.launch({headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox']})
            : await puppeteer.launch({headless: false, slowMo: 50});
        page = await browser.newPage();

        jest.setTimeout(30000)
        userData = addUser(process.env.MONGODB_URI, mongoose, User);
        await goToInitialPage(page);
        await login(page, userData.username, userData.password)

        // Intercept the network request for LLM hints
        await page.setRequestInterception(true);
        page.on('request', request => {
            if (request.url().includes('/askllm')) {
                request.respond({
                    content: 'application/json',
                    body: JSON.stringify({ content: "This is a hint from the LLM." })
                });
            } else {
                request.continue();
            }
        });
    });

    afterAll(async () => {
        browser.close();
        mongoose.connection.close();
    })

    test('The user interacts with the hint chat asking for help', ({ given, when, then }) => {

        given('I am on the first question of a quiz', async () => {
            await accessQuiz(page, expect);
        });

        when('I ask for a hint about the question', async () => {
            await click(page, '.chatButton'); // Open the chat
            await writeIntoInput(page, '.inputField', 'Give me a hint');
            await click(page, '.sendButton');
        });

        then('I should receive a hint related to the image and question without mentioning the answers provided', async () => {
            await expect(page).toMatchElement('.llmMessage', {text: 'This is a hint from the LLM.'});
        });
    });
});