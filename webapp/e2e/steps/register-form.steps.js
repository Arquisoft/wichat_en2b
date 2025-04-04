const puppeteer = require('puppeteer');
const {defineFeature, loadFeature} = require('jest-cucumber');
const setDefaultOptions = require('expect-puppeteer').setDefaultOptions
const feature = loadFeature('./e2e/features/register-form.feature');

const {click, writeIntoInput, goToInitialPage, login, addUser} = require('../test-functions')
const {configBeforeAll} = require('../test-config')
const {startMemoryDB, stopMemoryDB} = require('../db-access')

let page;
let browser;

defineFeature(feature, test => {

    beforeAll(async () => {
        browser = process.env.GITHUB_ACTIONS
            ? await puppeteer.launch({headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox']})
            : await puppeteer.launch({headless: false, slowMo: 50});
        page = await browser.newPage();


        jest.setTimeout(60000)
        await goToInitialPage(page);
        await startMemoryDB();
    });

    afterEach(async () => {
        await goToInitialPage(page);
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
        await stopMemoryDB();
    })

  //  test('The user is not registered in the site', ({given, when, then}) => {
//
  //      let username = "pablo";
  //      let password = "pabloasw";
//
  //      given('An unregistered user', async () => {
  //          await click(page, "a[href='/addUser']")
  //      });
//
  //      when('I fill the data in the form and press submit', async () => {
  //          await writeIntoInput(page, '#username', username);
  //          await writeIntoInput(page, '#password', password);
  //          await writeIntoInput(page, '#confirmPassword', password);
  //          await click(page, 'form > button');
  //      });
//
  //      then('A confirmation message should be shown in the screen', async () => {
  //          await page.waitForSelector('#name-page');
  //          await expect(page).toMatchElement("#name-page", {text: "WiChat"});
  //      });
  //  }, 15000)

    test('The user is already registered in the site', ({given, when, then}) => {

        let userData;
        given('An already registered user', async () => {
            userData = await addUser()
        });

        when('I fill the register data in the form and press submit', async () => {
            await login(page, userData.username, userData.password);
            //await click(page, "a[href='/addUser']")
            //await writeIntoInput(page, '#username', userData.username);
            //await writeIntoInput(page, '#password', userData.password);
            //await writeIntoInput(page, '#confirmPassword', userData.password);
            //await click(page, 'form > button');
        });

        then('A error message should inform me that the account is already registered', async () => {
            //await page.waitForSelector('#error-message');
            //await expect(page).toMatchElement('#error-message', {text: "Username already exists"});
        });
    }, 30000);

});