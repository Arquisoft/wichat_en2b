const puppeteer = require('puppeteer');
const { defineFeature, loadFeature }=require('jest-cucumber');
const setDefaultOptions = require('expect-puppeteer').setDefaultOptions
const feature = loadFeature('./e2e/features/user-statistics.feature');
const mongoose = require('mongoose');
const User = require('../../../users/userservice/user-model'); //Import the users model
const { click, writeIntoInput, addUser, login, goToInitialPage} = require('../test-functions')

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

        userData = addUser(process.env.MONGODB_URI, mongoose, User);
    });

    afterAll(async () => {
        browser.close();
        await mongoose.connection.close();
    })

    test('The user wants to see the Profile statistics', ({given, when, then}) => {

        given('I am logged in', async () => {
            await login(page, userData.username, userData.password);
        });

        when('I navigate to the "Statistics" section', async () => {
            await click(page, "div[role='tablist'] > button:nth-child(2)");
        });

        then('I should see a list of games I have played, including passed and failed questions, times, and scores', async () => {
            await expect(page).toMatchElement("h2", { text: "Statistics" });
        });
    });
});