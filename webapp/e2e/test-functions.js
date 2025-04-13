
/**
 * Clicks on an element with the given selector
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for the element
 */
async function click(page, selector) {
    await Promise.all([
        await page.waitForSelector(selector),
        await page.click(selector)
    ]);
}

/**
 * Writes text into an input element
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for the input
 * @param {string} text - Text to write
 */
async function writeIntoInput(page, selector, text) {
    await page.waitForSelector(selector);
    await page.type(selector, text);
}

async function login(page, username, password) {
    await writeIntoInput(page, '#username', username);
    await writeIntoInput(page, '#password', password);
    await click(page, 'form > button');
}

/**
 * Accesses the quiz section of the application
 * @param page The puppeteer page object
 * @param quizSelector Optional selector for the quiz link
 * @returns {Promise<void>}
 */
async function accessQuiz(page, quizSelector ) {
    await click(page, quizSelector);

    await page.waitForSelector("#btn-start-quiz:first-of-type", {visible: true, timeout: 10000});
    await click(page, "#btn-start-quiz:first-of-type");
}

async function goToInitialPage(page) {
    await page
        .goto("http://localhost:3000/login", {
            waitUntil: "networkidle0",
        })
        .catch(() => {
        });
}

module.exports = {
    click,
    writeIntoInput,
    login,
    accessQuiz,
    goToInitialPage
}