const puppeteer = require('puppeteer');
const { defineFeature, loadFeature }=require('jest-cucumber');
const setDefaultOptions = require('expect-puppeteer').setDefaultOptions
const feature = loadFeature('./e2e/features/user-statistics.feature');
const mongoose = require('mongoose');
const User = require('../../../users/userservice/user-model'); //Import the users model
const { click, writeIntoInput, addUser } = require('../test-functions')

let page;
let browser;
let userData;

defineFeature(feature, test => {

    beforeAll(async () => {
        browser = process.env.GITHUB_ACTIONS
            ? await puppeteer.launch({headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox']})
            : await puppeteer.launch({headless: false, slowMo: 50});
        page = await browser.newPage();
        //Way of setting up the timeout
        //setDefaultOptions({ timeout: 30000 })
        jest.setTimeout(30000)
        await page
            .goto("http://localhost:3000", {
                waitUntil: "networkidle0",
            })
            .catch(() => {
            });

        userData = addUser(process.env.MONGODB_URI, mongoose, User);
    });

    afterAll(async () => {
        browser.close()
    })

    test('The user wants to see the Profile statistics', ({given, when, then}) => {

        given('I am logged in', async () => {
            await writeIntoInput(page,'input[name="username"]', username);
            await writeIntoInput(page,'input[name="password"]', password);

            await click(page,'form > button');
        });

        when('I navigate to the "Statistics" section', async () => {
            await click(page, "div[role='tablist'] > button:nth-child(2)");
        });

        then('I should see a list of games I have played, including passed and failed questions, times, and scores', async () => {

        });
    });
});