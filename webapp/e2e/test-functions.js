/**
 * Clicks on an element with the given selector
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for the element
 */
async function click(page, selector) {
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (element === null) {
                throw Error("The selector did not match any element");
            }
            element.click();
        }, selector)
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

async function connectToDatabase(mongoUri, mongoose) {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    }
    await mongoose.connection.asPromise(); //Wait as promise
}

async function addUser(mongoUri, mongoose, User) {
    let data = { username: "mock", password: "123456", role: "USER" };

    await connectToDatabase(mongoUri, mongoose);

    let retries = 2;
    let user = null;

    while (retries > 0) {
        try {
            user = await User.findOne({ username: data.username }).exec();
            if (user) break; // Si el usuario existe, salimos del bucle

            // Si no existe, intentamos crearlo
            user = await User.create(data);
            console.log("✅ Usuario creado:", user);
            break;
        } catch (err) {
            console.error("⚠️ Error en la operación, reintentando...", err);
            await new Promise(resolve => setTimeout(resolve, 250));
            retries--;
        }
    }
    if (!user) {
        throw new Error("❌ No se pudo crear ni encontrar el usuario después de varios intentos.");
    }
    return user;
}



async function login(page, username, password){
    await writeIntoInput(page,'input[name="username"]', username);
    await writeIntoInput(page,'input[name="password"]', password);
    await click(page,'form > button');
}

async function accessQuiz(page, expect){
    await click(page, "a[href='/quiz/category/1']");
    await expect(page).toMatchElement("* > header > div > a", { text: "Back to Dashboard"});
    await click(page, "#__next > div > div > button:first-child");
}

async function goToInitialPage(page){
    await page
        .goto("http://localhost:3000", {
            waitUntil: "networkidle0",
        })
        .catch(() => {});
}

module.exports = {
    click,
    writeIntoInput,
    addUser,
    login,
    accessQuiz,
    goToInitialPage
}