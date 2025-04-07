const puppeteer = require('puppeteer');
const { defineFeature, loadFeature }=require('jest-cucumber');

const feature = loadFeature('./e2e/features/game-question-answering.feature');

const { click, accessQuiz, login, goToInitialPage} = require('../test-functions')
const {expect} = require("expect-puppeteer");

let page;
let browser;

defineFeature(feature, test => {

    beforeEach(async () => {
        browser = process.env.GITHUB_ACTIONS
            ? await puppeteer.launch({headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']})
            : await puppeteer.launch({headless: false, slowMo: 50, args: ['--disable-web-security']});
        page = await browser.newPage();

        await page.setRequestInterception(true);

        page.on('request', (request) => {
            const url = request.url();
            if (url.includes('/game/')) {
                request.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(global.mockQuestions)  // Use the mock data defined in setup.js
                });
            } else {
                request.continue();
            }
        });

        await goToInitialPage(page);
    });

    afterEach(async () => {
        if (browser) {
            await browser.close();
        }
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('The user answers a question correctly', ({ given, when, then }) => {

        given('I am on the first question of a quiz', async () => {
            await login(page, global.userTestData.username, global.userTestData.password);
            await accessQuiz(page, "#quiz-category-science");

            // Ensure the first question is loaded
            await page.waitForSelector('#title-question', {visible: true, timeout: 10000});

            const title = await page.$eval('#title-question', el => el.textContent.trim());

            expect(title).toBe("What's the discipline shown in the image?");
        });

        when('I select the correct answer for the question', async () => {
            await click(page, '#option-0');
        });

        then('I should see a confirmation message that I answered correctly and my score should be updated', async () => {

            await page.waitForSelector('#message-success', {visible: true, timeout: 10000});

            const msg = await page.$eval('#message-success', el => el.textContent.trim());

            expect(msg).toBe("Great job! You got it right!");
        });
    }, 30000);

    test('The user answers a question incorrectly', ({ given, when, then }) => {

        given('I am on the first question of a game', async () => {
            await login(page, global.userTestData.username, global.userTestData.password);
            await accessQuiz(page, "#quiz-category-science");

            // Ensure the first question is loaded
            await page.waitForSelector('#title-question', {visible: true, timeout: 10000});

            const title = await page.$eval('#title-question', el => el.textContent.trim());

            expect(title).toBe("What's the discipline shown in the image?");
        });

        when('I select an incorrect answer for the question', async () => {
            await click(page, '#option-3');
        });

        then('I should see a message indicating the correct answer and my score should not be updated', async () => {

            await page.waitForSelector('#message-fail', {visible: true, timeout: 10000});

            const msg = await page.$eval('#message-fail', el => el.textContent.trim());

            expect(msg).toBe("Oops! You didn\'t guess this one.");
        });
    }, 30000);
});