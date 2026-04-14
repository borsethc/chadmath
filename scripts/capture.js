const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
    console.log("Launching headless browser...");
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Set viewport to 6.5" Apple standard (iPhone 13 Pro Max)
    await page.setViewport({ width: 1284, height: 2778, deviceScaleFactor: 1 });
    
    console.log("Navigating to ChadMath Production...");
    await page.goto('https://chadmath-production-887b.up.railway.app/', { waitUntil: 'networkidle0' });

    const dir = path.join(__dirname, '../screenshots');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    // Screenshot 1: Login Screen
    console.log("Capturing 1: Login Screen...");
    await page.screenshot({ path: path.join(dir, '1_Login.png') });

    // Login
    console.log("Logging in as APPLE_DEMO...");
    await page.type('#studentId', 'APPLE_DEMO');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to render
    await page.waitForSelector('h2', { timeout: 10000 });
    // Additional wait for any animations and heatmap rendering
    await new Promise(r => setTimeout(r, 2000));

    // Screenshot 2: Student Dashboard
    console.log("Capturing 2: Student Dashboard...");
    await page.screenshot({ path: path.join(dir, '2_Dashboard.png') });

    // Open Settings Menu or Game mode
    // Let's capture the Settings Modal if it exists by clicking the Settings button
    try {
        const settingsBtn = await page.$('button.flex.items-center.justify-center.w-12.h-12'); // Lucide Settings icon usually has this
        if (settingsBtn) {
            await settingsBtn.click();
            await new Promise(r => setTimeout(r, 1000));
            console.log("Capturing 3: Settings Menu...");
            await page.screenshot({ path: path.join(dir, '3_Settings.png') });
            
            // Close Settings
            await page.keyboard.press('Escape');
            await new Promise(r => setTimeout(r, 1000));
        }

        // Start a Practice session (Assuming first element that resembles a mode block is clickable and starts a game)
        console.log("Starting a Practice Session...");
        // Look for the "Start Engine" or specific factor button
        const startBtnArr = await page.$$('button');
        let startBtn = null;
        for (const btn of startBtnArr) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text && (text.includes('Start') || text.includes('Practice Factor'))) {
                startBtn = btn;
                break;
            }
        }
        
        if (startBtn) {
            await startBtn.click();
            await new Promise(r => setTimeout(r, 2500)); // wait for countdown

            console.log("Capturing 4: Gameplay...");
            await page.screenshot({ path: path.join(dir, '4_Gameplay.png') });
        } else {
            // Find a heatmap square to click focus mode
            await page.click('.grid.grid-cols-2 > button');
            await new Promise(r => setTimeout(r, 2500));
            console.log("Capturing 4: Gameplay...");
            await page.screenshot({ path: path.join(dir, '4_Gameplay.png') });
        }


    } catch (e) {
        console.log("Notice: Could not automatically navigate to game screen", e.message);
    }

    await browser.close();
    console.log("All screenshots captured and saved to /screenshots!");
})();
