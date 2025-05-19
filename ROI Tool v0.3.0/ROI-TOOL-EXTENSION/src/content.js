// =============================================
// content.js  (MAIN ENTRY, GLUE CODE)
// =============================================
// - Loads on Yahoo Options pages, runs main orchestration logic
// - Imports all modules, attaches modal, handles startup sequence
// - MutationObserver keeps ROI columns present after any Yahoo/React re-render
// - Detects SPA URL/ticker changes so popup & ROI always match current ticker

import { fetchStockProfile, fetchOptionChain, fetchDividends } from './api.js';
import { calculateROI, calculateAllRows } from './roiCalc.js';
import { injectROITable, findOptionTable, cleanupOldTables } from './tableUtils.js';
import { debug, error } from './logger.js';

// Helper to extract ticker from the current Yahoo URL
function getTickerFromUrl() {
    const match = window.location.pathname.match(/\/quote\/([^/]+)/);
    return match ? match[1].toUpperCase() : null;
}

// Waits for the Calls options table to appear, up to maxAttempts * delay ms
async function waitForOptionTable(maxAttempts = 12, delay = 500) {
    for (let i = 0; i < maxAttempts; i++) {
        const table = findOptionTable();
        if (table) return table;
        await new Promise(res => setTimeout(res, delay));
    }
    return null;
}

// Watches for DOM changes and reinjects ROI columns if Yahoo redraws the table
function observeForTableChanges(ticker, cachedResults) {
    let lastInjectedTable = null;

    const observer = new MutationObserver(() => {
        const table = findOptionTable();
        if (!table || table === lastInjectedTable) return;
        debug('MutationObserver: Table found, reinjecting ROI columns');
        // CLEANUP before injecting to prevent duplicates
        cleanupOldTables();
        injectROITable(table, cachedResults);
        lastInjectedTable = table;
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// MAIN LOGIC: Named async function so we can call/re-run on SPA URL changes
async function main() {
    debug('ROI TOOL: Starting main execution');
    try {
        cleanupOldTables();

        // Wait for the Calls option table to appear
        const table = await waitForOptionTable();
        debug('Table found:', table);

        if (!table) {
            error('ROI TOOL: No options table found!');
            return;
        }

        // Extract ticker symbol from URL
        const ticker = getTickerFromUrl();
        debug('Extracted ticker:', ticker);

        if (!ticker) {
            error('ROI TOOL: Could not determine ticker from URL!');
            return;
        }

        // Fetch profile, option chain, and dividend data (API helpers) with ticker
        const [profile, optionData, dividendData] = await Promise.all([
            fetchStockProfile(ticker),
            fetchOptionChain(),
            fetchDividends(ticker)
        ]);

        debug('API results:', { profile, optionData, dividendData });

        // Calculate all rows (ROI calcs + formatting)
        const results = calculateAllRows(table, optionData, dividendData, profile);

        debug('ROI results array:', results);

        // CLEANUP before injecting to prevent duplicates
        cleanupOldTables();
        injectROITable(table, results);
        debug('injectROITable called');

        // === POPUP SUMMARY STORAGE LOGIC (historical endpoint, forward annualized) ===
        let annualDiv = 'N/A';
        if (Array.isArray(dividendData) && dividendData.length > 0) {
            // Use the most recent cash dividend (first entry), multiply by 4
            const mostRecent = dividendData[0];
            let lastDivNum = Number(mostRecent.dividend);
            if (!isNaN(lastDivNum) && lastDivNum > 0) {
                annualDiv = (lastDivNum * 4).toFixed(2);
            }
        }
        // If annualDiv is still 'N/A', fallback to profile.lastDiv (less reliable)
        if ((annualDiv === 'N/A' || Number(annualDiv) === 0) && profile && typeof profile.lastDiv === 'number' && profile.lastDiv > 0) {
            annualDiv = profile.lastDiv.toFixed(2);
        }

        chrome.storage.local.set({
            lastROIResults: results,
            lastStockSummary: {
                ticker,
                price: profile?.price ?? 'N/A',
                dividend: annualDiv
            }
        });

        // Notify popup (and any listeners) that data is updated
        chrome.runtime.sendMessage({ type: 'stockDataUpdated' });

        // Enable MutationObserver to keep columns persistent after Yahoo redraws
        observeForTableChanges(ticker, results);

    } catch (err) {
        error('ROI TOOL: Main execution error:', err);
    }
}

// Run immediately on page load
main();

// ============= URL Change Watcher (SPA/React detection) =============

// Store last processed ticker
let lastTicker = getTickerFromUrl();

// Watch for Yahoo SPA navigation/ticker change; rerun main() if it changes
function watchForUrlChangeAndRerun() {
    setInterval(() => {
        const currentTicker = getTickerFromUrl();
        if (currentTicker !== lastTicker) {
            lastTicker = currentTicker;
            debug('Detected ticker/url change, re-running main logic');
            main();
        }
    }, 1000); // check every second (can lower to 500ms for even snappier updates)
}

watchForUrlChangeAndRerun();

// ============= END OF MAIN ENTRY POINT =============
