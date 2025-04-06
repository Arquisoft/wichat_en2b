const puppeteer = require('puppeteer');
const {defineFeature, loadFeature} = require('jest-cucumber');

const feature = loadFeature('./e2e/features/register-form.feature');

const {click, writeIntoInput, goToInitialPage} = require('../test-functions')
const {expect} = require("expect-puppeteer");


let page;
let browser;

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

    test('The user is not registered in the site', ({given, when, then}) => {

        let username = "pablo";
        let password = "pabloasw";

        given('An unregistered user', async () => {
            await click(page, "a[href='/addUser']")
        });

        when('I fill the data in the form and press submit', async () => {
            await writeIntoInput(page, '#username', username);
            await writeIntoInput(page, '#password', password);
            await writeIntoInput(page, '#confirmPassword', password);
            await click(page, 'form > button');
        });

        then('A confirmation message should be shown in the screen', async () => {
            await page.waitForSelector('#name-page');
            await expect(page).toMatchElement("#name-page", {text: "WiChat"});
        });
    }, 15000)

    test('The user is already registered in the site', ({given, when, then}) => {

        given('An already registered user', async () => {
            await click(page, "a[href='/addUser']")
        });

        when('I fill the register data in the form and press submit', async () => {
            await writeIntoInput(page, '#username', global.userTestData.username);
            await writeIntoInput(page, '#password', global.userTestData.password);
            await writeIntoInput(page, '#confirmPassword', global.userTestData.password);
            await click(page, 'form > button');
        });

        then('A error message should inform me that the account is already registered', async () => {

            await page.waitForSelector('#error-username', {visible: true, timeout: 10000});
            const errorText = await page.$eval('#error-username', el => el.textContent.trim());
            console.log("⚠️ Error text to check:", errorText);
            expect(errorText).toBe("Username already exists");

        });
    }, 20000);

});