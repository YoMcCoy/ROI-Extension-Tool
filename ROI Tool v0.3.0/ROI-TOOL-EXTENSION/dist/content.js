(function () {
    'use strict';

    // =============================================
    // api.js (API Fetchers/Helpers)
    // =============================================
    // - Handles all API requests to Yahoo/FMP/etc. for stock profile, options, and dividends
    // - Returns parsed data for use in calculations

    // Fetches the stock profile from FinancialModelingPrep API
    async function fetchStockProfile(ticker) {
        const url = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=ikX94injkmsxIDLYLNQwzD3Vxyr3qfSJ`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) return data[0];
            return null;
        } catch (err) {
            console.error('API: Failed to fetch stock profile', err);
            return null;
        }
    }

    // Fetches option chain data from Yahoo (uses DOM for now)
    async function fetchOptionChain() {
        // For v0.2.4, we pull directly from the Yahoo table, so this is a placeholder
        // Later, could be updated for direct API access or scraping.
        return null;
    }

    // Fetches dividend data from FMP historical-price-full endpoint
    async function fetchDividends(ticker) {
        const url = `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=ikX94injkmsxIDLYLNQwzD3Vxyr3qfSJ`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data && Array.isArray(data.historical)) return data.historical;
            return [];
        } catch (err) {
            console.error('API: Failed to fetch dividends', err);
            return [];
        }
    }

    // =============================================
    // roiCalc.js (ROI/Math Logic)
    // =============================================
    // - All functions related to annualized return, stock movement, cap/uncap logic

    function calculateROI(
        price,          // per share
        callPremium,    // per share (option prices always per share, but 1 contract = 100 shares)
        dividend,       // per share (annualized or prorated for the period)
        strike,
        expiry,
        daysToExpiry,
        { cap = true } = {}
    ) {
        const SHARES_PER_CONTRACT = 100;
        const scenarios = [
            { pct: -0.1, label: '-10%' },
            { pct: 0.00, label: '0%' },
            { pct: 0.10, label: '+10%' }
        ];

        return scenarios.map(({ pct, label }) => {
            // Stock price movement
            let endPrice = price * (1 + pct);
            if (cap && endPrice > strike) endPrice = strike;

            // All values below are now for 1 contract (100 shares)
            const costBasis = price * SHARES_PER_CONTRACT;
            const dividendYield = dividend * SHARES_PER_CONTRACT;             // Total dividend received (over the period, per 100 shares)
            const stockMovement = (endPrice - price) * SHARES_PER_CONTRACT;   // Dollar gain/loss from price movement on 100 shares
            const callOptionIncome = callPremium * SHARES_PER_CONTRACT;       // Total call premium received (for 1 contract)

            // ROI Calculation as per new formula (all per-contract values)
            const roi = (dividendYield + stockMovement + callOptionIncome) / costBasis;

            // For continuity, return all components
            return {
                scenario: label,
                dividendYield,
                stockMovement,
                callOptionIncome,
                costBasis,
                roiPercent: typeof roi === "number" && isFinite(roi) ? roi * 100 : 0
            };
        });
    }

    // Patch: now returns array of objects, each with a 'scenarios' array.
    function calculateAllRows(table, optionData, dividendData, profile) {
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        const results = [];
        console.log('calculateAllRows: # of rows:', rows.length);

        rows.forEach((row, idx) => {
            // In production, extract real values from each row here
            // The following demo values are still per share and will be scaled in calculateROI:
            const price = 100;
            const callPremium = 2;
            const dividend = 1;
            const strike = 105;

            // Pass all variables into updated ROI calculation
            const scenarios = calculateROI(price, callPremium, dividend, strike);

            results.push({ scenarios });

            // Debug log for each row injected
            console.log(`Row ${idx}: scenarios=`, scenarios);
        });

        console.log('Final results array:', results);
        return results;
    }

    // =============================================
    // modal.js (Modal UI Builder/Controller)
    // =============================================

    let modalEl = null;

    // Now createModal takes a `scenarios` array, not the full results array!
    function createModal(scenarios) {
        closeModal();

        modalEl = document.createElement('div');
        modalEl.className = 'roi-tool-modal';
        modalEl.style.position = 'fixed';
        modalEl.style.top = '32px';
        modalEl.style.right = '32px';
        modalEl.style.background = '#fff';
        modalEl.style.border = '2px solid #222';
        modalEl.style.borderRadius = '16px';
        modalEl.style.boxShadow = '0 4px 32px rgba(0,0,0,0.18)';
        modalEl.style.zIndex = 99999;
        modalEl.style.padding = '20px 28px';
        modalEl.style.minWidth = '280px';
        modalEl.style.fontFamily = 'inherit';

        const title = document.createElement('h3');
        title.textContent = 'ROI Breakdown';
        title.style.margin = '0 0 12px 0';
        modalEl.appendChild(title);

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';

        const headerRow = document.createElement('tr');
        ['Scenario', 'Annualized ROI', 'Total Yield'].forEach(txt => {
            const th = document.createElement('th');
            th.textContent = txt;
            th.style.textAlign = 'center';
            th.style.fontWeight = 'bold';
            th.style.padding = '4px';
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        if (scenarios && Array.isArray(scenarios)) {
            scenarios.forEach(scenario => {
                if (!scenario || typeof scenario.annualized !== 'number') return;
                const row = document.createElement('tr');
                let td = document.createElement('td');
                td.textContent = scenario.scenario ?? '';
                td.style.textAlign = 'center';
                row.appendChild(td);
                td = document.createElement('td');
                td.textContent = (typeof scenario.annualized === 'number')
                    ? scenario.annualized.toFixed(2) + '%'
                    : '';
                td.style.textAlign = 'center';
                row.appendChild(td);
                td = document.createElement('td');
                td.textContent = (typeof scenario.totalYield === 'number')
                    ? (scenario.totalYield * 100).toFixed(2) + '%'
                    : '';
                td.style.textAlign = 'center';
                row.appendChild(td);
                table.appendChild(row);
            });
        }
        modalEl.appendChild(table);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.title = 'Close';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '8px';
        closeBtn.style.right = '16px';
        closeBtn.style.border = 'none';
        closeBtn.style.background = 'transparent';
        closeBtn.style.fontSize = '24px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = closeModal;
        modalEl.appendChild(closeBtn);

        document.body.appendChild(modalEl);
    }

    function closeModal() {
        if (modalEl && modalEl.parentNode) {
            modalEl.parentNode.removeChild(modalEl);
            modalEl = null;
        }
    }

    // =============================================
    // tableUtils.js (Table Finder/Injector)
    // =============================================
    // - Finds Yahoo options "Calls" table only (never Puts)
    // - Injects ROI columns after "% Change" column
    // - Removes old ROI columns and modal if needed


    // =====================
    // Finds the "Calls" options table (never "Puts")
    // =====================
    function findOptionTable() {
        // Yahoo renders Calls and Puts tables as sibling sections
        const tables = Array.from(document.querySelectorAll('section table'));
        for (const table of tables) {
            // Try to find "Calls" header above table, up to 2 parent elements up
            let section = table.parentElement;
            let foundCalls = false;
            for (let i = 0; i < 2 && section; i++) {
                if (section.querySelector) {
                    const header = section.querySelector('h2,h3,h4');
                    if (header && /Calls/i.test(header.textContent)) {
                        foundCalls = true;
                        break;
                    }
                }
                section = section.parentElement;
            }
            // Fallback: header row has "Contract Name" or "Strike"
            if (!foundCalls) {
                const headerRow = table.querySelector('thead tr');
                if (headerRow && [...headerRow.cells].some(cell => /Contract Name|Strike/i.test(cell.textContent))) {
                    // Check for text "Calls" in preceding siblings
                    let prev = table.previousElementSibling;
                    while (prev) {
                        if (prev.textContent && /Calls/i.test(prev.textContent)) {
                            foundCalls = true;
                            break;
                        }
                        prev = prev.previousElementSibling;
                    }
                }
            }
            if (foundCalls) return table;
        }
        return null;
    }

    // =====================
    // Inject ROI columns (headers + cells) into the options table.
    // =====================
    function injectROITable(table, results) {
        if (!table || !Array.isArray(results) || !results.length) return;

        // --- ROI headers to match your spec ---
        const roiHeaders = ['ROI -10%', 'ROI 0%', 'ROI 10%'];

        // --- CLEANUP: Remove any existing ROI columns before injecting new ones ---
        cleanupOldTables();

        // --- Add ROI header columns after "% Change" ---
        const headerRow = table.querySelector('thead tr');
        if (headerRow && headerRow.cells.length > 0) {
            // Find the "% Change" column index
            let insertAfterIdx = -1;
            for (let i = 0; i < headerRow.cells.length; i++) {
                if (headerRow.cells[i].textContent.trim() === '% Change') {
                    insertAfterIdx = i;
                    break;
                }
            }
            // Fallback to appending at end if "% Change" not found
            if (insertAfterIdx === -1) insertAfterIdx = headerRow.cells.length - 1;

            // Insert each ROI header after "% Change"
            for (let j = 0; j < roiHeaders.length; j++) {
                const th = document.createElement('th');
                th.textContent = roiHeaders[j];
                th.className = 'roi-header';
                th.style.background = '#FFF9E5';
                th.style.color = '#222';
                th.style.fontWeight = 'bold';
                headerRow.insertBefore(th, headerRow.cells[insertAfterIdx + 1 + j]);
            }
        }

        // --- Add ROI data cells for each row ---
        const bodyRows = table.querySelectorAll('tbody tr');
        bodyRows.forEach((row, i) => {
            const roiResult = results[i];
            // Find the "% Change" column index in this row
            let insertAfterIdx = -1;
            for (let c = 0; c < row.cells.length; c++) {
                const text = row.cells[c].textContent.trim();
                if (headerRow && headerRow.cells[c] && headerRow.cells[c].textContent.trim() === '% Change') {
                    insertAfterIdx = c;
                    break;
                }
                if (text === '% Change') {
                    insertAfterIdx = c;
                    break;
                }
            }
            if (insertAfterIdx === -1) insertAfterIdx = row.cells.length - 1;

            // If no ROI data for this row, inject empty cells for each scenario
            if (!roiResult || !roiResult.scenarios) {
                for (let j = 0; j < roiHeaders.length; j++) {
                    const td = document.createElement('td');
                    td.textContent = '';
                    td.className = 'roi-cell';
                    row.insertBefore(td, row.cells[insertAfterIdx + 1 + j]);
                }
                return;
            }

            // --- Inject a ROI cell for each scenario (-10%, 0%, +10%) ---
            roiResult.scenarios.forEach((scenario, colIdx) => {
                const td = document.createElement('td');
                // Format ROI as XX.XX% or blank if not a number
                let displayValue = '';
                if (typeof scenario.roiPercent === 'number' && isFinite(scenario.roiPercent)) {
                    displayValue = scenario.roiPercent.toFixed(2) + '%';
                }
                td.textContent = displayValue;
                td.style.textAlign = 'right';
                td.className = 'roi-cell';

                // Make cell clickable: opens modal with scenario breakdown for this row
                td.style.cursor = 'pointer';
                td.addEventListener('click', (event) => {
                    closeModal();
                    createModal(roiResult.scenarios);
                    event.stopPropagation();
                });

                row.insertBefore(td, row.cells[insertAfterIdx + 1 + colIdx]);
            });
        });
    }

    // =====================
    // Remove previously injected ROI columns from the table, plus ROI modal
    // =====================
    function cleanupOldTables() {
        // Remove all ROI headers and cells entirely from the DOM
        document.querySelectorAll('.roi-header').forEach(el => {
            el.parentNode && el.parentNode.removeChild(el);
        });
        document.querySelectorAll('.roi-cell').forEach(el => {
            el.parentNode && el.parentNode.removeChild(el);
        });
        // Remove the ROI modal as well (if it exists)
        const modal = document.querySelector('.roi-tool-modal');
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }

    // =============================================
    // logger.js (Debug/Error Logging)
    // =============================================
    // - Handles console logging, easy on/off switch for debug output


    // Wrapper for console.log, adds timestamp and only logs if DEBUG_ENABLED is true
    function debug(...args) {
        const ts = new Date().toISOString().split('T')[1].replace('Z',''); // HH:MM:SS.sss
        console.log(`[ROI DEBUG ${ts}]`, ...args);
    }

    // Wrapper for console.error, always logs
    function error(...args) {
        const ts = new Date().toISOString().split('T')[1].replace('Z','');
        console.error(`[ROI ERROR ${ts}]`, ...args);
    }
    // ============= END LOGGER =============

    // =============================================
    // content.js  (MAIN ENTRY, GLUE CODE)
    // =============================================
    // - Loads on Yahoo Options pages, runs main orchestration logic
    // - Imports all modules, attaches modal, handles startup sequence
    // - MutationObserver keeps ROI columns present after any Yahoo/React re-render
    // - Detects SPA URL/ticker changes so popup & ROI always match current ticker


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

})();
