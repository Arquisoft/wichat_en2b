/**
 * Navigates to a page by clicking on a link with the given selector
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for the link
 */
async function click(page, selector) {
    await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        element ? element.click() : null;
        if (element === null){
            throw Error("The selector did not match any element")
        }
    }, selector);
}

async function writeIntoInput(page, selector, text) {
    await page.evaluate((sel, text) => {
        const element = document.querySelector(sel);
        if (element != null){
            element.value = text;
        }
        if (element === null){
            throw Error("The selector did not match any element")
        }
    }, selector, text);
}

module.exports = {
    click,
    writeIntoInput
}