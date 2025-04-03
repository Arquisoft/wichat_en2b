const puppeteer = require('puppeteer');
const { defineFeature, loadFeature }=require('jest-cucumber');
const setDefaultOptions = require('expect-puppeteer').setDefaultOptions
const feature = loadFeature('./e2e/features/game-question-answering.feature');
const mongoose = require('mongoose');
const User = require('../../../users/userservice/user-model'); //Import the users model
const { click, accessQuiz, login, addUser, goToInitialPage} = require('../test-functions')
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
        await goToInitialPage(page);
        userData = addUser(process.env.MONGODB_URI, mongoose, User);

        // Intercept the network request for questions
        await page.setRequestInterception(true);
        page.on('request', request => {
            if (request.url().includes('/game/')) {
                request.respond({
                    content: 'application/json',
                    body: JSON.stringify([
                        {
                            question: 'What is the capital of the image?',
                            answers: ['Paris', 'London', 'Berlin', 'Madrid'],
                            right_answer: 'Paris',
                            image_name: '/images/paris.jpg'
                        },
                        {
                            question: 'What is the capital of the image?',
                            answers: ['Paris', 'London', 'Berlin', 'Madrid'],
                            right_answer: 'London',
                            image_name: '/images/london.jpg'
                        }
                    ])
                });
            } else {
                request.continue();
            }
        });
    });

    beforeEach(async () =>{
        //TODO include logout call?
        await goToInitialPage(page);
        await login(page, userData.username, userData.password)
        await accessQuiz(page, expect);
    });

    afterAll(async () => {
        browser.close();
        await mongoose.connection.close();
    });

    test('The user answers a question correctly', ({ given, when, then }) => {

        given('I am on the first question of a quiz', async () => {
            // Ensure the first question is loaded
            await expect(page).toMatchElement('h2.question-title', { text: 'What is the capital of France?' });
        });

        when('I select the correct answer for the question', async () => {
            await click(page, 'button.quiz-option', { text: 'Paris' });
        });

        then('I should see a confirmation message that I answered correctly and my score should be updated', async () => {
            await expect(page).toMatchElement('.alert-box', { text: 'Great job! You got it right!' });
        });
    });

    test('The user answers a question incorrectly', ({ given, when, then }) => {

        given('I am on the first question of a game', async () => {
            // Ensure the first question is loaded
            await expect(page).toMatchElement('h2.question-title', { text: 'What is the capital of France?' });
        });

        when('I select an incorrect answer for the question', async () => {
            await click(page, 'button.quiz-option', { text: 'London' });
        });

        then('I should see a message indicating the correct answer and my score should not be updated', async () => {
            await expect(page).toMatchElement('.alert-box', { text: 'Oops! You didn\'t guess this one.' });
        });
    });
});