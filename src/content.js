// =============================================
// content.js  (MAIN ENTRY, GLUE CODE) v0.4.1+url-polling+popup-fix+options-only+annualized-dividends+popup-detail
// =============================================

import { fetchStockProfile, fetchOptionChain, fetchDividends } from './api.js';
import { calculateAllRows } from './roiCalc.js';
import { injectROITable, findOptionTable, cleanupOldTables } from './tableUtils.js';
import { debug, error } from './logger.js';

// Helper to extract ticker from the current Yahoo URL
function getTickerFromUrl() {
    const match = window.location.pathname.match(/\/quote\/([^/]+)/);
    return match ? match[1].toUpperCase() : null;
}

// --- Dividend frequency helpers ---
function getDividendFrequency(dividends) {
    if (!Array.isArray(dividends) || dividends.length < 2) return 1;
    const date1 = new Date(dividends[0].date);
    const date2 = new Date(dividends[1].date);
    const days = Math.abs((date1 - date2) / (1000 * 60 * 60 * 24));
    if (days > 340) return 1;    // annual
    if (days > 160) return 2;    // biannual
    if (days > 60) return 4;    // quarterly
    if (days > 20) return 12;   // monthly
    return 1;
}
function getDividendFrequencyLabel(dividends) {
    if (!Array.isArray(dividends) || dividends.length < 2) return 'annual';
    const date1 = new Date(dividends[0].date);
    const date2 = new Date(dividends[1].date);
    const days = Math.abs((date1 - date2) / (1000 * 60 * 60 * 24));
    if (days > 340) return 'annual';
    if (days > 160) return 'biannual';
    if (days > 60) return 'quarterly';
    if (days > 20) return 'monthly';
    return 'annual';
}
function getAnnualizedDividend(dividends) {
    if (!Array.isArray(dividends) || dividends.length === 0) return 0;
    const lastDiv = parseFloat(dividends[0].dividend) || 0;
    const freq = getDividendFrequency(dividends);
    return lastDiv * freq;
}

// Waits for the Calls options table to appear, up to maxAttempts * delay ms
async function waitForOptionTable(maxAttempts = 60, delay = 500) {
    for (let i = 0; i < maxAttempts; i++) {
        const table = findOptionTable();
        if (table) return table;
        if (i % 6 === 0) debug(`Still waiting for Calls table... (${i * delay / 1000}s)`);
        await new Promise(res => setTimeout(res, delay));
    }
    return null;
}

function observeForTableChanges(ticker, cachedResults) {
    let lastInjectedTable = null;
    let mutationDebounce = null;

    const observer = new MutationObserver(() => {
        if (mutationDebounce) clearTimeout(mutationDebounce);
        mutationDebounce = setTimeout(() => {
            const table = findOptionTable();
            if (!table || table === lastInjectedTable) return;
            debug('MutationObserver: Table found, reinjecting ROI columns');
            injectROITable(table, cachedResults, ticker);
            lastInjectedTable = table;
        }, 150);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    return observer;
}

function observeSPARouteChanges(onChange) {
    let lastUrl = location.pathname + location.search;
    setInterval(() => {
        const newUrl = location.pathname + location.search;
        if (newUrl !== lastUrl) {
            lastUrl = newUrl;
            debug('SPA route/url changed, re-running main()');
            onChange();
        }
    }, 600);

    // Patch pushState to trigger callback
    const origPushState = history.pushState;
    history.pushState = function (...args) {
        origPushState.apply(this, args);
        onChange();
    };
    window.addEventListener('popstate', onChange);
}

// Main orchestration logic
let lastTicker = null;
let lastExpiration = null;
let lastResults = null;
let observer = null;

async function main(force = false) {
    const ticker = getTickerFromUrl();
    if (!ticker) return;

    const select = document.querySelector('select[name="expirationDate"]');
    const expiration = select ? select.value : null;

    if (!force && ticker === lastTicker && expiration === lastExpiration) {
        debug('No ticker/expiration change, skipping main()');
        return;
    }
    lastTicker = ticker;
    lastExpiration = expiration;

    debug(`Running ROI Tool main() for ${ticker} (expiration: ${expiration})`);

    try {
        const [profile, optionChain, dividends] = await Promise.all([
            fetchStockProfile(ticker),
            fetchOptionChain(ticker),
            fetchDividends(ticker)
        ]);

        // --- PATCH: Always update the popup data, now with annualized dividend and details ---
        const annualizedDividend = getAnnualizedDividend(dividends);
        const frequencyLabel = getDividendFrequencyLabel(dividends);
        const mostRecentDiv = (Array.isArray(dividends) && dividends.length > 0) ? parseFloat(dividends[0].dividend) : null;

        chrome.storage.local.set({
            lastStockSummary: {
                ticker,
                price: profile?.price ?? null,
                dividend: annualizedDividend,
                frequency: frequencyLabel,
                lastDiv: mostRecentDiv
            }
        }, () => {
            chrome.runtime.sendMessage({ type: 'stockDataUpdated' });
        });

        if (/\/quote\/[^/]+\/options/.test(window.location.pathname)) {
            const table = await waitForOptionTable();
            if (!table) {
                error('No Calls table found after waiting');
                return;
            }

            lastResults = calculateAllRows(
                table,
                optionChain ? optionChain.calls : null,
                dividends,
                profile
            );

            injectROITable(table, lastResults, ticker);

            if (observer) observer.disconnect();
            observer = observeForTableChanges(ticker, lastResults);

            if (select) {
                select.addEventListener('change', () => setTimeout(() => main(true), 200));
            }
        } else {
            debug('Not on options page—skipping ROI table injection.');
        }

    } catch (err) {
        error('ROI Tool main() error:', err);
    }
}

debug('ROI Tool v0.4.1 initializing...');
observeSPARouteChanges(() => main(true));
main(true);

let currentTickerForPoll = getTickerFromUrl();
setInterval(() => {
    const tickerNow = getTickerFromUrl();
    if (tickerNow && tickerNow !== currentTickerForPoll) {
        debug('Ticker polling: Ticker changed from', currentTickerForPoll, 'to', tickerNow);
        currentTickerForPoll = tickerNow;
        main(true);
    }
}, 350);
