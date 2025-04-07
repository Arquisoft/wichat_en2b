const puppeteer = require('puppeteer');
const { defineFeature, loadFeature }=require('jest-cucumber');

const feature = loadFeature('./e2e/features/game-selection.feature');
const { login, accessQuiz, goToInitialPage} = require('../test-functions')

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

    test('The user selects a subject for the quiz and starts playing', ({given, when, then}) => {

        given('I am logged in', async () => {
            await login(page, global.userTestData.username, global.userTestData.password);
        });

        when('I choose a subject from the available list', async () => {
            await accessQuiz(page, "#quiz-category-science");
        });

        then('I should see questions related to the selected subject', async () => {

            await page.waitForSelector('#quiz-timer', {visible: true, timeout: 10000});

            const timerText = await page.$eval('quiz-timer', el => el.textContent.trim());

            expect(timerText.substring(0, 10)).toBe("Time left:");
        });
    }, 30000);
});