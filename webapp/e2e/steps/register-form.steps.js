const puppeteer = require('puppeteer');
const { defineFeature, loadFeature }=require('jest-cucumber');
const setDefaultOptions = require('expect-puppeteer').setDefaultOptions
const feature = loadFeature('./e2e/features/register-form.feature');
const mongoose = require('mongoose');
const User = require('../../../users/userservice/user-model'); //Import the users model
const { click, writeIntoInput, goToInitialPage, login, addUser } = require('../test-functions')

let page;
let browser;

defineFeature(feature, test => {
  
  beforeAll(async () => {
    browser = process.env.GITHUB_ACTIONS
      ? await puppeteer.launch({headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox']})
      : await puppeteer.launch({ headless: false, slowMo: 50 });
    page = await browser.newPage();

    await mongoose.connect(process.env.MONGODB_URI);
    await mongoose.connection.asPromise();
    console.log("✅ MongoDB en memoria listo para los tests");

    jest.setTimeout(60000)
    await goToInitialPage(page);
  });

  afterEach(async () => {
    await goToInitialPage(page);
  });

  afterAll(async ()=>{
    if (browser) {
      await browser.close();
    }
    await mongoose.connection.close();
    await global.mongoserver.stop();
    console.log("🛑 MongoDB detenido y conexión cerrada");
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
      await login(page, "pablo", "pabloasw")
      await expect(page).toMatchElement("h2", { text: "Welcome to WIChat" });
    });
  }, 15000)

  test('The user is already registered in the site', ({given,when,then}) => {

    let userData;
    given('An already registered user', async () => {
      userData = await addUser(process.env.MONGODB_URI, mongoose, User)
    });

    when('I fill the register data in the form and press submit', async () => {
      await click(page, "a[href='/addUser']")
      await writeIntoInput(page,'input[name="username"]', userData.username);
      await writeIntoInput(page,'input[name="password"]', userData.password);
      await writeIntoInput(page,'input[name="confirmPassword"]', userData.password);
      await click(page,'form > button');
    });

    then('A error message should inform me that the account is already registered', async () => {
      await expect(page).toMatchElement('#username-helper-text', { text: "Username already exists" });
    });
  }, 30000);

});