// =============================================
// roiCalc.js (ROI/Math Logic)
// =============================================
// - All functions related to annualized return, stock movement, cap/uncap logic

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

function getAnnualizedDividend(dividends) {
    if (!Array.isArray(dividends) || dividends.length === 0) return 0;
    const lastDiv = parseFloat(dividends[0].dividend) || 0;
    const freq = getDividendFrequency(dividends);
    return lastDiv * freq;
}

export function calculateAllRows(table, optionData, dividendData, profile) {
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const results = [];
    console.log('calculateAllRows: # of rows:', rows.length);

    // Underlying price from the top of the Yahoo page (profile.price)
    const price = typeof profile?.price === "number" ? profile.price : 0;

    // Annualized dividend per share, inferred from FMP history
    const annualizedDividend = getAnnualizedDividend(dividendData);

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
            { pct: -0.10, label: '-10%' },
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
            const dividendYield = annualizedDividend * 100; // annualized for 100 shares
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
