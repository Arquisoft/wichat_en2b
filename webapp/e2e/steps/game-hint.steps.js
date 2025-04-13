const puppeteer = require('puppeteer');
const { defineFeature, loadFeature }=require('jest-cucumber');

const feature = loadFeature('./e2e/features/game-hint.feature');

const { login, click, accessQuiz, goToInitialPage, writeIntoInput} = require('../test-functions')
const {expect} = require("expect-puppeteer");

let page;
let browser;

defineFeature(feature, test => {

    beforeEach(async () => {
        browser = process.env.GITHUB_ACTIONS
            ? await puppeteer.launch({headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']})
            : await puppeteer.launch({headless: false, slowMo: 50,  args: ['--disable-web-security'] });
        page = await browser.newPage();

        await page.setRequestInterception(true);

        page.on('request', (request) => {
            const url = request.url();
            if (url.includes('/askllm')) {
                request.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ content: "Hint: The answer is related to the image" })
                });
            } else if (url.endsWith('/quiz')) {
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
            }
            else {
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

    test('The user interacts with the hint chat asking for help', ({ given, when, then }) => {

        given('I am on the first question of a quiz', async () => {
            await login(page, global.userTestData.username, global.userTestData.password);
            await accessQuiz(page, ".start-button:first-of-type");
        });

        when('I ask for a hint about the question', async () => {
            await page.waitForSelector('#chatbot-open-button', {visible: true, timeout: 10000});
            await click(page, '#chatbot-open-button');
            await writeIntoInput(page, '#chatbot-input', 'Give me a hint');
            await click(page, '#chatbot-send-button');
        });

        then('I should receive a hint related to the image and question without mentioning the answers provided', async () => {
            await page.waitForSelector('*[data-state="message-0-llm"]', {visible: true, timeout: 10000});
            const hintText = await page.$eval('*[data-state="message-2-llm"]', el => el.textContent.trim());
            console.log("🥒 Hint text obtained: ", hintText);
            expect(hintText).toContain("Hint: The answer is related to the image");
        });
    }, 60000);
});