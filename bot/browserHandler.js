const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CHUNITHM_NET_URL = 'https://new.chunithm-net.com/';
const PLAYER_DATA_URL = 'https://new.chunithm-net.com/chuni-mobile/html/mobile/home/playerData/';

const resolveTimeoutValue = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveGenerationTimeouts = () => {
    const baseTimeoutMs = resolveTimeoutValue(process.env.BOT_GENERATION_TIMEOUT_MS, 180000);
    const freeTimeoutMs = resolveTimeoutValue(process.env.BOT_GENERATION_TIMEOUT_FREE_MS, 900000);
    return { baseTimeoutMs, freeTimeoutMs };
};

class BrowserHandler {
    constructor() {
        this.browser = null;
    }

    async launchBrowser() {
        if (!this.browser) {
            console.log("Launching browser...");
            const { baseTimeoutMs, freeTimeoutMs } = resolveGenerationTimeouts();
            const protocolTimeoutEnvRaw = process.env.BOT_PROTOCOL_TIMEOUT_MS;
            let protocolTimeout;
            if (protocolTimeoutEnvRaw !== undefined) {
                protocolTimeout = resolveTimeoutValue(protocolTimeoutEnvRaw, 180000);
            } else {
                if (baseTimeoutMs === 0 || freeTimeoutMs === 0) {
                    protocolTimeout = 0;
                } else {
                    protocolTimeout = Math.max(180000, baseTimeoutMs, freeTimeoutMs);
                }
            }
            this.browser = await puppeteer.launch({
                headless: "new",
                protocolTimeout,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled'
                ]
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

    async generateScoreImage(segaId, password, options = {}) {
        const {
            hideScore = false,
            scanMode = null,
            bestConstThreshold = null,
            newConstThreshold = null,
            bestOnly = false
        } = options;
        if (!this.browser) await this.launchBrowser();

        const context = await this.browser.createBrowserContext();
        const page = await context.newPage();

        // Forward browser console logs to node console
        page.on('console', msg => {
            const type = msg.type().toUpperCase();
            if (type === 'ERROR' || type === 'WARNING' || msg.text().includes('[CHUNITHM]')) {
                console.log(`[Browser ${type}] ${msg.text()}`);
            }
        });

        // Catch unhandled errors in the page context
        page.on('pageerror', err => {
            console.error(`[Browser PAGE ERROR] ${err.toString()}`);
        });

        // Use a mobile User-Agent and viewport to mimic actual usage
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
        await page.setViewport({ width: 375, height: 812, isMobile: true });

        // Add typical headers to reduce bot detection
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br'
        });

        try {
            let isStandardCourse = null;
            console.log(`[${segaId}] Navigating to login page...`);
            await page.goto(CHUNITHM_NET_URL, { waitUntil: 'networkidle2' });

            // Step 1: Debug snapshot after loading top page
            console.log(`[${segaId}] Step 1: Loaded top page. URL: ${page.url()}`);

            if (page.url().includes('home')) {
                console.log(`[${segaId}] Already logged in.`);
            } else {
                // Check if login form is already present on the page
                const loginFormPresent = await page.$('input[name="segaId"]');

                if (loginFormPresent) {
                    console.log(`[${segaId}] Login form found directly on current page. Skipping navigation.`);
                } else {
                    // Try to find the login button by text or specific class to navigate to login page
                    const loginLink = await page.evaluate(() => {
                        // Look specifically for the login button on the top page
                        const anchors = Array.from(document.querySelectorAll('a'));
                        // Check for common link text or classes for the login button
                        // Exclude "forgot password" links which might contain "login" in href
                        let loginAnchor = anchors.find(a => {
                            const text = a.innerText.toLowerCase();
                            const href = a.href.toLowerCase();
                            if (text.includes('忘れた') || text.includes('forgot') || text.includes('remind')) return false;

                            return text.includes('ログイン') ||
                                text.includes('login') ||
                                (href.includes('login') && !href.includes('remind'));
                        });

                        if (loginAnchor) return { href: loginAnchor.href, text: loginAnchor.innerText };

                        // Fallback: look for button elements
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const loginBtn = buttons.find(b =>
                            b.innerText.includes('ログイン') ||
                            b.innerText.includes('login') ||
                            b.className.includes('login')
                        );

                        return loginBtn ? { isButton: true, text: loginBtn.innerText } : null;
                    });

                    if (loginLink) {
                        if (loginLink.href && loginLink.href.startsWith('http')) {
                            console.log(`[${segaId}] Found login link: ${loginLink.text} (${loginLink.href}). Navigating directly...`);
                            await page.goto(loginLink.href, { waitUntil: 'networkidle0' });
                        } else if (loginLink.isButton) {
                            console.log(`[${segaId}] Found login button: ${loginLink.text}. Clicking...`);
                            const btn = await page.waitForXPath(`//button[contains(text(), '${loginLink.text}')]`);
                            await Promise.all([
                                page.waitForNavigation({ waitUntil: 'networkidle0' }),
                                btn.click()
                            ]);
                        } else {
                            // Fallback to click if it's js or relative
                            const btn = await page.$('a[href*="login"], button[class*="login"]');
                            if (btn) {
                                console.log(`[${segaId}] Clicking login button (fallback)...`);
                                await Promise.all([
                                    page.waitForNavigation({ waitUntil: 'networkidle0' }),
                                    btn.click()
                                ]);
                            }
                        }
                    } else {
                        console.log(`[${segaId}] Login button/link not found. Proceeding to check for form directly. URL: ${page.url()}`);
                    }
                }

                // Step 2: Debug snapshot before looking for form

                console.log(`[${segaId}] Step 2: On potential login page. URL: ${page.url()}`);

                try {
                    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
                } catch (e) {
                    console.log(`Current URL: ${page.url()}`);
                    await page.screenshot({ path: 'login_error.png' });
                    const html = await page.content();
                    fs.writeFileSync('login_error.html', html);
                    throw new Error("Could not find login form. Current URL: " + page.url());
                }

                await page.type('input[type="text"]', segaId);
                await page.type('input[type="password"]', password);

                const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
                if (submitBtn) {
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle0' }),
                        submitBtn.click()
                    ]);

                    // Step 3: Debug snapshot after login submission
                    console.log(`[${segaId}] Step 3: Submitted login form. URL: ${page.url()}`);
                } else {
                    throw new Error("Submit button not found on login page.");
                }
            }

            // Handle Aime List / Course Selection Page
            if (page.url().includes('aimeList')) {
                console.log(`[${segaId}] on Aime list page. Checking course status...`);

                // Check for standard course text inside the specific block
                const courseBlock = await page.$('.aime_charge_course_block');
                const courseText = courseBlock ? await page.evaluate(el => el.innerText, courseBlock) : "";

                if (courseText.includes('スタンダードコース') || courseText.includes('Standard Course')) {
                    console.log(`[${segaId}] Standard course confirmed.`);
                    isStandardCourse = true;
                } else {
                    console.log(`[${segaId}] Warning: Standard course NOT detected. Text: ${courseText}`);
                    // You might want to throw here if standard course is strictly required, 
                    // but sometimes users might just want free features if possible. 
                    // For this specific tool, let's proceed but warn.
                    isStandardCourse = false;
                }

                const selectBtn = await page.$('.btn_select_aime');
                if (selectBtn) {
                    console.log(`[${segaId}] Found Aime select button. Clicking...`);
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle0' }),
                        selectBtn.click()
                    ]);
                    console.log(`[${segaId}] Aime selected. New URL: ${page.url()}`);
                } else {
                    throw new Error("Aime select button not found on aimeList page.");
                }
            }

            if (!page.url().includes('home')) {
                // Determine failure reason
                const content = await page.content();
                if (content.includes('エラー')) {
                    // Try to extract error code or message
                    const errorMsg = await page.evaluate(() => {
                        const p = document.querySelector('.block.text_l p');
                        return p ? p.innerText : 'Unknown error';
                    });
                    throw new Error(`Login failed with site error: ${errorMsg}`);
                }

                console.log(`Current URL: ${page.url()}`);
                await page.screenshot({ path: 'login_error_final.png' });
                fs.writeFileSync('login_error_final.html', content);

                throw new Error("Login failed. URL does not contain 'home' after login/selection.");
            }

            console.log(`[${segaId}] Accessing player data...`);
            await page.goto(PLAYER_DATA_URL, { waitUntil: 'networkidle2' });

            console.log(`[${segaId}] Injecting generator script...`);

            const mainJsPath = path.join(__dirname, '..', 'main.js');
            let mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

            // Replace askForSettings invocation with a robust pattern
            if (mainJsContent.includes('await askForSettings();')) {
                mainJsContent = mainJsContent.replace(
                    'await askForSettings();',
                    'await window.mockAskForSettings();'
                );
            } else {
                // Fallback regex if spacing differs slightly
                mainJsContent = mainJsContent.replace(
                    /await\s+askForSettings\(\);/g,
                    'await window.mockAskForSettings();'
                );
            }

            // Replace showGeneratedImages invocation
            mainJsContent = mainJsContent.replace(
                /showGeneratedImages\(listDataUrl,\s*graphDataUrl\);/,
                'window.generatedResult = { list: listDataUrl, graph: graphDataUrl };'
            );

            // Capture any showError calls so we can fail fast instead of timing out.
            mainJsContent = mainJsContent.replace(
                /showError\(([^)]+)\);/g,
                'window.generatedError = $1; showError($1);'
            );

            // Verify replacements to prevent timeout debugging nightmares
            if (!mainJsContent.includes('window.mockAskForSettings')) {
                throw new Error("Failed to inject 'window.mockAskForSettings' into main.js content.");
            }
            if (!mainJsContent.includes('window.generatedResult')) {
                throw new Error("Failed to inject 'window.generatedResult' setter into main.js content.");
            }

            // Also replace createOverlay logic or handle it via injecting a div beforehand.

            const effectiveScanMode = (scanMode === 'free' || scanMode === 'paid')
                ? scanMode
                : (isStandardCourse === false ? 'free' : 'paid');

            const delayMsRaw = Number(process.env.BOT_DELAY_MS ?? '1000');
            const delaySeconds = Number.isFinite(delayMsRaw)
                ? Math.max(0, delayMsRaw / 1000)
                : 1;

            await page.evaluate((settings) => {
                window.__hideScore = Boolean(settings.hideScore);
                window.generatedResult = null;
                window.generatedError = null;
                window.mockAskForSettings = async () => {
                    return {
                        delay: settings.delaySeconds,
                        scanMode: settings.scanMode,
                        frameMode: settings.frameMode,
                        bestConstThreshold: settings.bestConstThreshold,
                        newConstThreshold: settings.newConstThreshold,
                        includeNewInBest: settings.includeNewInBest
                    };
                };

                if (!document.getElementById('overlay')) {
                    const o = document.createElement('div');
                    o.id = 'overlay';
                    document.body.appendChild(o);
                }
            }, {
                hideScore,
                delaySeconds,
                scanMode: effectiveScanMode,
                frameMode: bestOnly ? 'bestOnly' : 'withNew',
                bestConstThreshold: Number.isFinite(bestConstThreshold) ? bestConstThreshold : 14.5,
                newConstThreshold: Number.isFinite(newConstThreshold) ? newConstThreshold : 13.5,
                includeNewInBest: !bestOnly
            });

            // We need to inject the function carefully.
            // mainJsContent is a raw string of source code which starts with (async function(){ ... })()
            // Using page.evaluate(string) works, but might timeout if execution takes too long,
            // OR if the string is too large or complex for devtools protocol in one go?
            // "Runtime.evaluate timed out" usually means the script evaluation exceeded the protocol timeout.

            // We need to inject the function carefully.
            // mainJsContent is a raw string of source code which starts with (async function(){ ... })()
            // We'll use addScriptTag.

            console.log(`[${segaId}] Evaluating main script...`);

            try {
                await page.addScriptTag({ content: mainJsContent });
            } catch (e) {
                console.error(`[${segaId}] Script injection failed: ${e.message}`);
                throw e;
            }

            const { baseTimeoutMs, freeTimeoutMs } = resolveGenerationTimeouts();
            const generationTimeoutMs = (effectiveScanMode === 'free')
                ? (freeTimeoutMs === 0 ? 0 : freeTimeoutMs)
                : baseTimeoutMs;

            const waitStart = Date.now();
            page.setDefaultTimeout(generationTimeoutMs === 0 ? 0 : generationTimeoutMs);
            page.setDefaultNavigationTimeout(generationTimeoutMs === 0 ? 0 : generationTimeoutMs);

            console.log(`[${segaId}] Waiting for generation (mode=${effectiveScanMode}, timeoutMs=${generationTimeoutMs})...`);
            try {
                await page.waitForFunction(
                    () => window.generatedResult || window.generatedError,
                    { timeout: generationTimeoutMs }
                );
            } catch (e) {
                const elapsedMs = Date.now() - waitStart;
                if (e && e.name === 'TimeoutError') {
                    throw new Error(`Generation timed out after ${elapsedMs}ms.`);
                }
                throw new Error(`Generation failed after ${elapsedMs}ms: ${e?.message || e}`);
            }

            const { result, error } = await page.evaluate(() => ({
                result: window.generatedResult,
                error: window.generatedError
            }));
            if (error) {
                throw new Error(`Generation failed: ${error}`);
            }

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
