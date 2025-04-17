const puppeteer = require('puppeteer');
const {defineFeature, loadFeature} = require('jest-cucumber');

const feature = loadFeature('./e2e/features/game-question-answering.feature');

const {click, accessQuiz, login, goToInitialPage} = require('../test-functions')
const {expect} = require("expect-puppeteer");

let page;
let browser;

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
            } else if (url.includes('/question/validate')) {
                let body;
                try {
                    body = JSON.parse(request.postData());
                } catch (e) {
                    console.error('Error parsing request body:', e);
                    request.abort();
                    return;
                }
                const {question_id, selected_answer} = body;
                const question = global.mockQuestions.find(q => q.question_id === question_id);
                console.log('Question_id:', question_id, 'Selected answer', selected_answer)
                console.log('Correct:', question.answers.includes(selected_answer), 'Correct answer:', question.answers[0])
                if (!question) {
                    request.respond({
                        status: 404,
                        contentType: 'application/json',
                        body: JSON.stringify({error: 'Question not found'})
                    });
                } else {
                    const isCorrect = selected_answer === question.answers[0];
                    request.respond({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            isCorrect,
                            correctAnswer: isCorrect ? null : question.answers[0]
                        })
                    });
                }
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

    test('The user answers a question correctly', ({given, when, then}) => {

        given('I am on the first question of a quiz', async () => {
            await login(page, global.userTestData.username, global.userTestData.password);
            await accessQuiz(page, ".start-button:first-of-type");

            // Ensure the first question is loaded
            await page.waitForSelector('#title-question', {visible: true, timeout: 10000});

            const title = await page.$eval('#title-question', el => el.textContent.trim());

            expect(title).toBe("Which Country does this flag belong to?");
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

    test('The user answers a question incorrectly', ({given, when, then}) => {

        given('I am on the first question of a game', async () => {
            await login(page, global.userTestData.username, global.userTestData.password);
            await accessQuiz(page, ".start-button:first-of-type");

            // Ensure the first question is loaded
            await page.waitForSelector('#title-question', {visible: true, timeout: 10000});

            const title = await page.$eval('#title-question', el => el.textContent.trim());

            expect(title).toBe("Which Country does this flag belong to?");
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