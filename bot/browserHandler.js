const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CHUNITHM_NET_URL = 'https://new.chunithm-net.com/';
const PLAYER_DATA_URL = 'https://new.chunithm-net.com/chuni-mobile/html/mobile/home/playerData/';

class BrowserHandler {
    constructor() {
        this.browser = null;
    }

    async launchBrowser() {
        if (!this.browser) {
            console.log("Launching browser...");
            this.browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
        return this.browser;
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    async generateScoreImage(segaId, password) {
        if (!this.browser) await this.launchBrowser();

        const context = await this.browser.createIncognitoBrowserContext();
        const page = await context.newPage();

        try {
            console.log(`[${segaId}] Navigating to login page...`);
            await page.goto(CHUNITHM_NET_URL, { waitUntil: 'networkidle2' });

            if (page.url().includes('home')) {
                console.log(`[${segaId}] Already logged in.`);
            } else {
                const btn = await page.$('a[href*="login"], button[class*="login"]');
                if (btn) {
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle0' }),
                        btn.click()
                    ]);
                }

                try {
                    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
                } catch (e) {
                    throw new Error("Could not find login form.");
                }

                await page.type('input[type="text"]', segaId);
                await page.type('input[type="password"]', password);

                const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
                if (submitBtn) {
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle0' }),
                        submitBtn.click()
                    ]);
                } else {
                    throw new Error("Submit button not found on login page.");
                }
            }

            if (!page.url().includes('home')) {
                throw new Error("Login failed. URL does not contain 'home' after login.");
            }

            console.log(`[${segaId}] Accessing player data...`);
            await page.goto(PLAYER_DATA_URL, { waitUntil: 'networkidle2' });

            console.log(`[${segaId}] Injecting generator script...`);

            const mainJsPath = path.join(__dirname, '..', 'main.js');
            let mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

            // Replace askForSettings invocation
            mainJsContent = mainJsContent.replace(
                /const\s+\{\s*delay,\s*scanMode,\s*frameMode,\s*bestConstThreshold,\s*newConstThreshold,\s*includeNewInBest\s*\}\s*=\s*await\s+askForSettings\(\);/,
                'const { delay, scanMode, frameMode, bestConstThreshold, newConstThreshold, includeNewInBest } = await window.mockAskForSettings();'
            );

            // Replace showGeneratedImages invocation
            mainJsContent = mainJsContent.replace(
                /showGeneratedImages\(listDataUrl,\s*graphDataUrl\);/,
                'window.generatedResult = { list: listDataUrl, graph: graphDataUrl };'
            );

            // Also replace createOverlay logic or handle it via injecting a div beforehand.

            await page.evaluate(() => {
                window.mockAskForSettings = async () => {
                    return {
                        delay: 1000,
                        scanMode: 'paid', // Use 'paid' for speed
                        frameMode: 'withNew',
                        bestConstThreshold: 0,
                        newConstThreshold: 0,
                        includeNewInBest: true
                    };
                };

                if (!document.getElementById('overlay')) {
                    const o = document.createElement('div');
                    o.id = 'overlay';
                    document.body.appendChild(o);
                }
            });

            // Need to wrap mainJsContent in an IIFE because we read the file raw.
            // But wait, the file itself is an IIFE: (async function () { ... })(); at top level.
            // So executing it works.
            // But if indentation or newlines are messed up, verify content.
            // We assume safe execution.

            await page.evaluate(mainJsContent);

            console.log(`[${segaId}] Waiting for generation (can take 1-2 mins)...`);
            try {
                await page.waitForFunction(() => window.generatedResult, { timeout: 180000 });
            } catch (e) {
                throw new Error("Generation timed out.");
            }

            const result = await page.evaluate(() => window.generatedResult);

            console.log(`[${segaId}] Generation successful!`);
            return result;

        } catch (e) {
            console.error(`[${segaId}] Error during generation:`, e);
            throw e;
        } finally {
            if (context) await context.close();
        }
    }
}

module.exports = new BrowserHandler();
