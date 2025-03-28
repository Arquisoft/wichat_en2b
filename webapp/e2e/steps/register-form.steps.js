const puppeteer = require('puppeteer');
const { defineFeature, loadFeature }=require('jest-cucumber');
const setDefaultOptions = require('expect-puppeteer').setDefaultOptions
const feature = loadFeature('./e2e/features/register-form.feature');
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

  test('The user is not registered in the site', ({given,when,then}) => {
    
    let username;
    let password;

    given('An unregistered user', async () => {
      username = "pablo"
      password = "pabloasw"
      await expect(page).toClick("a", { text: "Don't have an account? Register here." });
    });

    when('I fill the data in the form and press submit', async () => {
      await expect(page).toFill('input[name="username"]', username);
      await expect(page).toFill('input[name="password"]', password);
      await expect(page).toFill('input[name="confirmPassword"]', password);
      await expect(page).toClick('button', { text: 'Register' })
    });

    then('A confirmation message should be shown in the screen', async () => {
      await expect(page).toMatchElement("h2", { text: "Welcome to WIChat" });
    });
  })

  test('The user is already registered in the site', ({given,when,then}) => {

    let username= "pablo";
    let password= "pabloasw";



    given('An already registered user', async () => {
      await mongoose.connect(process.env.MONGODB_URI);
      await User.create({
        username: username,
        password: password,
        role: 'USER'
      });
      await expect(page).toClick("a", { text: "Don't have an account? Register here." });
    });

    when('I fill the register data in the form and press submit', async () => {
      await expect(page).toFill('input[name="username"]', username);
      await expect(page).toFill('input[name="password"]', password);
      await expect(page).toFill('input[name="confirmPassword"]', password);
      await expect(page).toClick('button', { text: 'Register' })
    });

    then('A error message should inform me that the account is already registered', async () => {
      await expect(page).toMatchElement("*[id='username']", { text: "Username already exists" });
    });
  })

  afterAll(async ()=>{
    browser.close()
  })

});