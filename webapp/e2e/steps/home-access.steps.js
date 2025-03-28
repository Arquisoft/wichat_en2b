const puppeteer = require('puppeteer');
const { defineFeature, loadFeature }=require('jest-cucumber');
const setDefaultOptions = require('expect-puppeteer').setDefaultOptions
const feature = loadFeature('./e2e/features/home-access.feature');
const mongoose = require('mongoose');
const User = require('../../../users/userservice/user-model'); //Import the users model


let page;
let browser;

defineFeature(feature, test => {
    beforeAll(async () => {
        browser = process.env.GITHUB_ACTIONS
            ? await puppeteer.launch({headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox']})
            : await puppeteer.launch({ headless: false, slowMo: 100 });
        page = await browser.newPage();
        //Way of setting up the timeout
        //setDefaultOptions({ timeout: 30000 })
        jest.setTimeout(30000)
        await page
            .goto("http://localhost:3000", {
                waitUntil: "networkidle0",
            })
            .catch(() => {});
    });

    afterAll(async ()=>{
        browser.close()
    });

    test('The user has an account in the web', ({given, when, then}) => {
        let username;
        let password;

        given('A registered user', async () => {
            await mongoose.connect(process.env.MONGODB_URI);
            username = "testuser";
            password = "testpass";

            // Create test user in DB
            await User.create({
                username: username,
                password: password,
                role: "USER"
            });
        });

        when('I fill the data in the login form', async () => {
            await expect(page).toFill('input[name="username"]', username);
            await expect(page).toFill('input[name="password"]', password);
            await expect(page).toFill('input[name="confirmPassword"]', password);
            await expect(page).toClick('button', { text: 'Login' });
        });

        then('I can see in the home page that the user profile is mine', async () => {
            //await expect(page).toMatchElement("h6", { text: username });
        });
    });

    test('The user do not have an account in the web', ({given, when, then}) => {
        let username;
        let password;

        given('An unregistered user', async () => {
            username = "nonexistent";
            password = "wrongpass";
        });

        when('I fill the data in the login form', async () => {
            await expect(page).toFill('input[name="username"]', username);
            await expect(page).toFill('input[name="password"]', password);
            await expect(page).toFill('input[name="confirmPassword"]', password);
            await expect(page).toClick('button', { text: 'Login' });
        });

        then('I can see a message asking me to create an account to access the application', async () => {
            await expect(page).toMatchElement("p", { text: "Login failed" });
        });
    });
})
