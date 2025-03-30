const puppeteer = require('puppeteer');
const { defineFeature, loadFeature }=require('jest-cucumber');
const setDefaultOptions = require('expect-puppeteer').setDefaultOptions
const feature = loadFeature('./e2e/features/game-question-answering.feature');
const mongoose = require('mongoose');
const User = require('../../../users/userservice/user-model'); //Import the users model
const { click, writeIntoInput } = require('../test-functions')

let page;
let browser;

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
    });

    afterAll(async () => {
        browser.close()
    })

    test('The user answers a question correctly', ({given, when, then}) => {

        given('I am on the first question of a quiz', async () => {

        });

        when('I select the correct answer for the question', async () => {

        });

        then('I should see a confirmation message that I answered correctly  and my score should be updated', async () => {

        });
    });

    test('The user answers a question incorrectly', ({given, when, then}) => {

        given('I am on the first question of a game', async () => {

        });

        when('I select an incorrect answer for the question', async () => {

        });

        then('I should see a message indicating the correct answer and my score should not be updated', async () => {

        });
    });
});