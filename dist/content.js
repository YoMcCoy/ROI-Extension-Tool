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

    function calculateAllRows(table, optionData, dividendData, profile) {
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        const results = [];
        console.log('calculateAllRows: # of rows:', rows.length);

        // Underlying price from the top of the Yahoo page (profile.price)
        const price = typeof profile?.price === "number" ? profile.price : 0;

        // Dividend per share from FMP API, use first entry if available
        let dividend = 0;
        if (Array.isArray(dividendData) && dividendData.length > 0) {
            dividend = parseFloat(dividendData[0]?.dividend) || 0;
        }

        rows.forEach((row, idx) => {
            // --- Extract from table row cells ---
            const cells = row.querySelectorAll('td');
            // [0]=Contract Name, [1]=Last Trade, [2]=Strike, [3]=Last Price, [4]=Bid, [5]=Ask
            const strike = parseFloat(cells[2]?.textContent.replace(/[^0-9.]/g, '')) || 0;
            const bid = parseFloat(cells[4]?.textContent.replace(/[^0-9.]/g, '')) || 0;
            const ask = parseFloat(cells[5]?.textContent.replace(/[^0-9.]/g, '')) || 0;
            const callPremium = (bid + ask) / 2 || 0;

            // --- Build ROI scenarios for each stock movement case ---
            const scenarios = [
                { pct: -0.1, label: '-10%' },
                { pct: 0.00, label: '0%' },
                { pct: 0.10, label: '+10%' }
            ].map(({ pct, label }) => {
                let endPrice = price * (1 + pct);
                let stockMovement;
                if (endPrice > strike) {
                    stockMovement = (strike - price) * 100;
                } else {
                    stockMovement = (endPrice - price) * 100;
                }
                const callOptionIncome = callPremium * 100;
                const costBasis = price * 100;
                const dividendYield = dividend * 100 * 4; // Annualized for 4 quarters
                const roi = (dividendYield + stockMovement + callOptionIncome) / costBasis;
                return {
                    scenario: label,
                    strike,
                    endPrice, // <-- Added for modal logic
                    dividendYield,
                    stockMovement,
                    callOptionIncome,
                    costBasis,
                    roiPercent: typeof roi === "number" && isFinite(roi) ? roi * 100 : 0
                };
            });

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

    // Helper: Load modal position from storage or use default
    async function loadPosition() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['modalPosition'], (result) => {
                resolve(result.modalPosition || { top: '32px', left: '32px' });
            });
        });
    }

    // Helper: Save modal position to storage
    function savePosition(top, left) {
        chrome.storage.local.set({ modalPosition: { top, left } });
    }

    // Add drag event listeners only to drag handle (header bar)
    function addDragListeners(dragHandle, modal) {
        let dragData = {
            dragging: false,
            offsetX: 0,
            offsetY: 0,
        };

        dragHandle.addEventListener('mousedown', (e) => {
            dragData.dragging = true;
            const rect = modal.getBoundingClientRect();
            dragData.offsetX = e.clientX - rect.left;
            dragData.offsetY = e.clientY - rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragData.dragging || !modal) return;
            let newLeft = e.clientX - dragData.offsetX;
            let newTop = e.clientY - dragData.offsetY;

            // Clamp modal inside viewport
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const modalRect = modal.getBoundingClientRect();
            if (newLeft < 0) newLeft = 0;
            if (newTop < 0) newTop = 0;
            if (newLeft + modalRect.width > vw) newLeft = vw - modalRect.width;
            if (newTop + modalRect.height > vh) newTop = vh - modalRect.height;

            modal.style.left = newLeft + 'px';
            modal.style.top = newTop + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (dragData.dragging && modal) {
                dragData.dragging = false;
                // Save position on drag end
                savePosition(modal.style.top, modal.style.left);
            }
        });
    }

    // Create modal, async so we can await position load
    async function createModal(scenario, ticker = '') {
        closeModal();

        modalEl = document.createElement('div');
        modalEl.className = 'roi-tool-modal';
        modalEl.style.position = 'fixed';

        // Load last position or default
        const pos = await loadPosition();
        modalEl.style.top = pos.top;
        modalEl.style.left = pos.left;

        // Clean Modern Card style for full modal container
        modalEl.style.background = 'linear-gradient(145deg, #ffffff, #e6e6e6)';
        modalEl.style.border = '1px solid #ccc';
        modalEl.style.borderRadius = '12px';
        modalEl.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
        modalEl.style.zIndex = 99999;
        modalEl.style.padding = '0'; // Padding will be inside header/content separately
        modalEl.style.minWidth = '320px';
        modalEl.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        modalEl.style.color = '#222';
        modalEl.style.userSelect = 'none'; // Prevent text selection on drag outside content

        // Header bar (only draggable part)
        const headerBar = document.createElement('div');
        headerBar.style.background = '#d0d7e8'; // subtle blue-gray shading
        headerBar.style.padding = '12px 16px';
        headerBar.style.borderTopLeftRadius = '12px';
        headerBar.style.borderTopRightRadius = '12px';
        headerBar.style.cursor = 'move';
        headerBar.style.fontWeight = '700';
        headerBar.style.fontSize = '16px';
        headerBar.style.color = '#004085';
        headerBar.textContent = `ROI Breakdown @ ${scenario.scenario}` + (ticker ? ` (${ticker})` : '');
        modalEl.appendChild(headerBar);

        // Content container
        const content = document.createElement('div');
        content.style.padding = '20px 32px';
        content.style.fontSize = '15px';
        content.style.lineHeight = '1.5';
        content.style.color = '#333';
        content.style.userSelect = 'text'; // Allow text selection in content

        // --- NEW: Correct called away logic using endPrice and strike
        let calledText = '';
        if (scenario.endPrice > scenario.strike) {
            calledText = ' (Called away, capped at strike)';
        } else if (scenario.endPrice === scenario.strike) {
            calledText = ' (Called away, at strike)';
        } else {
            calledText = ' (Not called away)';
        }
        const movementValue = scenario.stockMovement.toFixed(2);
        const stockMovementDisplay =
            (movementValue.startsWith('-') ? '-' : '') +
            '$' +
            movementValue.replace('-', '') +
            calledText;

        // Net Entry Price calculation
        const netEntryPrice = (scenario.costBasis / 100) - (scenario.callOptionIncome / 100);

        [
            `Stock Price: $${(scenario.costBasis / 100).toFixed(2)}`,
            `Net Entry Price: $${netEntryPrice.toFixed(2)}`,
            `Strike Price: $${scenario.strike?.toFixed(2) ?? 'N/A'}`,
        ].forEach(text => {
            const div = document.createElement('div');
            div.textContent = text;
            content.appendChild(div);
        });

        // Spacer div for extra space
        const spacer = document.createElement('div');
        spacer.style.height = '12px'; // adjust as needed
        content.appendChild(spacer);

        [
            `Call Income: $${scenario.callOptionIncome.toFixed(2)}`,
            `Dividend Income: $${scenario.dividendYield.toFixed(2)}`,
            `Stock Movement: ${stockMovementDisplay}`,
            `Cost Basis: $${scenario.costBasis.toFixed(2)}`
        ].forEach(text => {
            const div = document.createElement('div');
            div.textContent = text;
            content.appendChild(div);
        });

        // ROI line with color and emphasis
        const roiDiv = document.createElement('div');
        roiDiv.style.marginTop = '12px';
        roiDiv.style.fontWeight = 'bold';
        roiDiv.style.fontSize = '18px';
        roiDiv.textContent = `ROI: ${scenario.roiPercent.toFixed(2)}%`;
        if (scenario.roiPercent > 0) {
            roiDiv.style.color = 'green';
        } else if (scenario.roiPercent < 0) {
            roiDiv.style.color = 'red';
        } else {
            roiDiv.style.color = 'black';
        }
        content.appendChild(roiDiv);

        modalEl.appendChild(content);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.title = 'Close';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '0px';
        closeBtn.style.right = '16px';
        closeBtn.style.border = 'none';
        closeBtn.style.background = 'transparent';
        closeBtn.style.fontSize = '28px';
        closeBtn.style.fontWeight = 'bold';
        closeBtn.style.color = '#004085';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.userSelect = 'none';
        closeBtn.onmouseenter = () => (closeBtn.style.color = '#c82333');
        closeBtn.onmouseleave = () => (closeBtn.style.color = '#004085');
        closeBtn.onclick = closeModal;
        modalEl.appendChild(closeBtn);

        document.body.appendChild(modalEl);

        // Add drag listeners ONLY to header bar
        addDragListeners(headerBar, modalEl);
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
    // - Finds Yahoo options "Calls" table only (never Puts), injects ROI columns, removes old ROI columns if needed


    // Only finds the "Calls" options table
    function findOptionTable() {
        const tables = Array.from(document.querySelectorAll('section table'));
        for (const table of tables) {
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
            if (!foundCalls) {
                const headerRow = table.querySelector('thead tr');
                if (headerRow && [...headerRow.cells].some(cell => /Contract Name|Strike/i.test(cell.textContent))) {
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

    // Inject ROI columns (headers + cells) into the options table.
    // Accepts optional ticker string for modal display
    function injectROITable(table, results, ticker = '') {
        if (!table || !Array.isArray(results) || !results.length) return;

        // Cleanup any old ROI columns/modal
        cleanupOldTables();

        const roiHeaders = ['ROI -10%', 'ROI 0%', 'ROI 10%'];

        const headerRow = table.querySelector('thead tr');
        if (headerRow && headerRow.cells.length > 0) {
            let insertAfterIdx = -1;
            for (let i = 0; i < headerRow.cells.length; i++) {
                if (headerRow.cells[i].textContent.trim() === '% Change') {
                    insertAfterIdx = i;
                    break;
                }
            }
            if (insertAfterIdx === -1) insertAfterIdx = headerRow.cells.length - 1;
            for (let j = 0; j < roiHeaders.length; j++) {
                const th = document.createElement('th');
                th.textContent = roiHeaders[j];
                th.className = 'roi-header';
                // All headers use the same green translucent background
                th.style.background = 'rgba(30, 255, 49, 0.1)';
                th.style.color = '#222';
                th.style.fontWeight = 'bold';
                th.style.padding = '8px 18px';
                th.style.textAlign = 'center';
                headerRow.insertBefore(th, headerRow.cells[insertAfterIdx + 1 + j]);
            }
        }

        const bodyRows = table.querySelectorAll('tbody tr');
        bodyRows.forEach((row, i) => {
            const roiResult = results[i];
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

            if (!roiResult || !roiResult.scenarios) {
                for (let j = 0; j < roiHeaders.length; j++) {
                    const td = document.createElement('td');
                    td.textContent = '';
                    td.className = 'roi-cell';
                    td.style.padding = '8px 18px';
                    td.style.textAlign = 'center';
                    row.insertBefore(td, row.cells[insertAfterIdx + 1 + j]);
                }
                return;
            }

            roiResult.scenarios.forEach((scenario, colIdx) => {
                const td = document.createElement('td');
                let displayValue = '';
                if (typeof scenario.roiPercent === 'number' && isFinite(scenario.roiPercent)) {
                    displayValue = scenario.roiPercent.toFixed(2) + '%';
                }
                td.textContent = displayValue;
                td.style.textAlign = 'center';
                td.className = 'roi-cell';
                td.style.cursor = 'pointer';
                td.style.padding = '8px 18px';

                // Color coding: green for positive, red for negative
                if (scenario.roiPercent > 0) {
                    td.style.color = 'green';
                } else if (scenario.roiPercent < 0) {
                    td.style.color = 'red';
                } else {
                    td.style.color = '#222';
                }

                // Shade 0% column (cell backgrounds remain as you had them)
                if (colIdx === 1) {
                    td.style.background = 'rgba(212, 255, 210, 0.3)';
                }

                td.addEventListener('click', (event) => {
                    closeModal();
                    createModal(scenario, ticker);
                    event.stopPropagation();
                });

                row.insertBefore(td, row.cells[insertAfterIdx + 1 + colIdx]);
            });
        });
    }

    // Remove previously injected ROI columns from the table, plus ROI modal
    function cleanupOldTables() {
        document.querySelectorAll('.roi-header').forEach(el => {
            el.parentNode && el.parentNode.removeChild(el);
        });
        document.querySelectorAll('.roi-cell').forEach(el => {
            el.parentNode && el.parentNode.removeChild(el);
        });
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
            injectROITable(table, results, ticker);
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
