const puppeteer = require('puppeteer');
const { defineFeature, loadFeature }=require('jest-cucumber');
const setDefaultOptions = require('expect-puppeteer').setDefaultOptions
const feature = loadFeature('./e2e/features/game-selection.feature');
const mongoose = require('mongoose');
const User = require('../../../users/userservice/user-model'); //Import the users model
const { addUser, login, accessQuiz, goToInitialPage} = require('../test-functions')

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
        await goToInitialPage(page);

        userData = await addUser(process.env.MONGODB_URI, mongoose, User);
    });

    afterAll(async () => {
        browser.close()
        await mongoose.connection.close();
    })

    test('The user selects a subject for the quiz and starts playing', ({given, when, then}) => {

        given('I am logged in', async () => {
            await login(page, userData.username, userData.password);
        });

        when('I choose a subject from the available list', async () => {
            await accessQuiz(page);
        });

        then('I should see questions related to the selected subject', async () => {
            await expect(page)
                .toMatchElement("div.timer-container.MuiBox-root.css-0 > p",
                    {text: /Time left: \d+s/}
                    );
        });
    });
});