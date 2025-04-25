const puppeteer = require('puppeteer');
const {defineFeature, loadFeature} = require('jest-cucumber');
const setDefaultOptions = require('expect-puppeteer').setDefaultOptions
const feature = loadFeature('./e2e/features/user-statistics.feature');
const {click, login, goToInitialPage} = require('../test-functions')
const {expect} = require("expect-puppeteer");

let page;
let browser;
let userData;

defineFeature(feature, test => {

    beforeEach(async () => {
        browser = process.env.GITHUB_ACTIONS
            ? await puppeteer.launch({headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox']})
            : await puppeteer.launch({headless: false, slowMo: 50});
        page = await browser.newPage();

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
    })

    test('The user wants to see the Profile statistics', ({given, when, then}) => {

        given('I am logged in', async () => {
            await login(page, global.userTestData.username, global.userTestData.password);
        });

        when('I navigate to the "Statistics" section', async () => {
            await click(page, "#tab-statistics");

            await page.waitForSelector('#title-quiz-statistics', {visible: true, timeout: 10000});
            const text = await page.$eval('#title-quiz-statistics', el => el.textContent.trim());
            console.log("🥒 Text obtained: ", text, "Expected: ", "Quiz Statistics");
            expect(text).toBe("Quiz Statistics");
        });

        then('I should see a list of games I have played, including passed and failed questions, times, and scores', async () => {
            await page.waitForSelector('#total-score > div', {visible: true, timeout: 10000});

            console.log("🥒 Game Info Test Data: ", global.gameInfoTestData);

            const tScore = await page.$eval('#total-score > div span.value', el => el.textContent.trim());
            const totalPoints = global.gameInfoTestData.reduce((sum, data) => sum + data.points_gain, 0) || undefined;
            console.log("🥒 Score text obtained: ", tScore, "Expected: ", totalPoints);
            expect(tScore).toBe(""+totalPoints+" points");

            const tQuestions = await page.$eval('#total-questions > div', el => el.textContent.trim());
            const totalQ = global.gameInfoTestData.reduce((sum, data) => sum + data.number_of_questions, 0) || undefined;
            console.log("🥒 Number of Questions text obtained: ", tQuestions, "Expected: ", totalQ);
            expect(tQuestions).toBe(""+totalQ);

        });
    }, 20000);
});