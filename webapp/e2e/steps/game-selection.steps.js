const puppeteer = require('puppeteer');
const {defineFeature, loadFeature} = require('jest-cucumber');

const feature = loadFeature('./e2e/features/game-selection.feature');
const {login, accessQuiz, goToInitialPage} = require('../test-functions')

let page;
let browser;
let userData;

defineFeature(feature, test => {

    beforeEach(async () => {
        browser = process.env.GITHUB_ACTIONS
            ? await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
            })
            : await puppeteer.launch({headless: false, slowMo: 50, args: ['--disable-web-security']});
        page = await browser.newPage();

        await page.setRequestInterception(true);

        page.on('request', (request) => {
            const url = request.url();
            if (url.endsWith('/quiz')) {
                request.respond({
                    contentType: 'application/json',
                    body: JSON.stringify(
                        global.mockCategory
                    )
                });
            } else if (url.endsWith('quiz/Geography')) {
                request.respond({
                    contentType: 'application/json',
                    body: JSON.stringify(global.mockCategory)
                });
            } else if (url.includes('/game/')) {
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

    test('The user selects a subject for the quiz and starts playing', ({given, when, then}) => {

        given('I am logged in', async () => {
            await login(page, global.userTestData.username, global.userTestData.password);
        });

        when('I choose a subject from the available list', async () => {
            await accessQuiz(page, ".start-button:first-of-type");
        });

        then('I should see questions related to the selected subject', async () => {

            await page.waitForSelector('#quiz-timer', {visible: true, timeout: 10000});

            const timerText = await page.$eval('#quiz-timer', el => el.textContent.trim());

            expect(timerText.substring(0, 10)).toBe("Time left:");
        });
    }, 30000);
});