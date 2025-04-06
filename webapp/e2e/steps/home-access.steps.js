const puppeteer = require('puppeteer');
const { defineFeature, loadFeature }=require('jest-cucumber');
const setDefaultOptions = require('expect-puppeteer').setDefaultOptions
const feature = loadFeature('./e2e/features/home-access.feature');
const mongoose = require('mongoose');
const User = require('../../../users/userservice/user-model'); //Import the users model
const { click, writeIntoInput, login, goToInitialPage} = require('../test-functions')
const {expect} = require("expect-puppeteer");

let page;
let browser;

defineFeature(feature, test => {
    beforeEach(async () => {
        browser = process.env.GITHUB_ACTIONS
            ? await puppeteer.launch({headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox']})
            : await puppeteer.launch({headless: false, slowMo: 50});
        page = await browser.newPage();
        setDefaultOptions({timeout: 60000});
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

    test('The user has an account in the web', ({given, when, then}) => {

        given('A registered user', async () => {
            console.log('🥒 Registered user to login: ', { 'username': global.userTestData.username, 'password': global.userTestData.password });


        });

        when('I fill the data in the login form', async () => {
            await login(page, global.userTestData.username, global.userTestData.password);
        });

        then('I can see in the home page that the user profile is mine', async () => {
            await click(page, '#navbar-profile-button')
            await page.waitForSelector('#profile-username', {visible: true, timeout: 10000});
            const text = await page.$eval('#profile-username', el => el.textContent.trim());
            console.log("🥒 Text expected in the check:", global.userTestData.username," Text obtained: ", text);
            expect(text).toBe(global.userTestData.username);
        });
    }, 15000);

    test('The user does not have an account in the web', ({given, when, then}) => {
        let username;
        let password;

        given('An unregistered user', async () => {
            username = "nonexistent";
            password = "wrongpass";
        });

        when('I fill the data in the login form', async () => {
            await login(page, username, password);
        });

        then('I can see a message asking me to create an account to access the application', async () => {

            await page.waitForSelector('#error-username', {visible: true, timeout: 10000});
            const errorText = await page.$eval('#error-username', el => el.textContent.trim());
            console.log("⚠️ Error text to check:", errorText);
            expect(errorText).toBe("Login failed");
        }, 20000);
    });
})
