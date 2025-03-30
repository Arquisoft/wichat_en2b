const puppeteer = require('puppeteer');
const { defineFeature, loadFeature }=require('jest-cucumber');
const setDefaultOptions = require('expect-puppeteer').setDefaultOptions
const feature = loadFeature('./e2e/features/register-form.feature');
const mongoose = require('mongoose');
const User = require('../../../users/userservice/user-model'); //Import the users model
const { click, writeIntoInput } = require('../test-functions')

let page;
let browser;

defineFeature(feature, test => {
  
  beforeAll(async () => {
    browser = process.env.GITHUB_ACTIONS
      ? await puppeteer.launch({headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox']})
      : await puppeteer.launch({ headless: false, slowMo: 50 });
    page = await browser.newPage();
    //Way of setting up the timeout
    //setDefaultOptions({ timeout: 30000 })
    await mongoose.connect(process.env.MONGODB_URI);
    jest.setTimeout(30000)
    await page
      .goto("http://localhost:3000", {
        waitUntil: "networkidle0",
      })
      .catch(() => {});
  });

  afterEach(async () => {
 //   await User.deleteMany({});
    await page.goto("http://localhost:3000", {
      waitUntil: "networkidle0",
    });
  });

  afterAll(async ()=>{
    await mongoose.connection.close();
    browser.close();
  })

  test('The user is not registered in the site', ({given,when,then}) => {
    
    let username= "pablo";
    let password= "pabloasw";

    given('An unregistered user', async () => {
      await click(page, "a[href='/addUser']")
    });

    when('I fill the data in the form and press submit', async () => {
      await writeIntoInput(page,'input[name="username"]', username);
      await writeIntoInput(page,'input[name="password"]', password);
      await writeIntoInput(page,'input[name="confirmPassword"]', password);
      await click(page,'form > button');
    });

    then('A confirmation message should be shown in the screen', async () => {
      await expect(page).toMatchElement("h2", { text: "Welcome to WIChat" });
    });
  }, 10000)

  test('The user is already registered in the site', ({given,when,then}) => {

    let username= "test";
    let password= "pabloasw";

    given('An already registered user', async () => {
      await click(page, "a[href='/addUser']")
      await writeIntoInput(page,'input[name="username"]', username);
      await writeIntoInput(page,'input[name="password"]', password);
      await writeIntoInput(page,'input[name="confirmPassword"]', password);
      await click(page,'form > button');
      await click(page, "a[href='/addUser']")
    });

    when('I fill the register data in the form and press submit', async () => {
      await writeIntoInput(page,'input[name="username"]', username);
      await writeIntoInput(page,'input[name="password"]', password);
      await writeIntoInput(page,'input[name="confirmPassword"]', password);
      await click(page,'form > button');
    });

    then('A error message should inform me that the account is already registered', async () => {
      await expect(page).toMatchElement('#username-helper-text', { text: "Username already exists" });
    });
  }, 50000);

});