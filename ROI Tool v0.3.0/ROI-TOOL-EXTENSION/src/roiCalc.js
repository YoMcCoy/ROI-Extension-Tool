// =============================================
// roiCalc.js (ROI/Math Logic)
// =============================================
// - All functions related to annualized return, stock movement, cap/uncap logic

// Calculates all ROI scenario rows using real data from the table and API
export function calculateAllRows(table, optionData, dividendData, profile) {
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
            { pct: -0.10, label: '-10%' },
            { pct: 0.00, label: '0%' },
            { pct: 0.10, label: '+10%' }
        ].map(({ pct, label }) => {
            let endPrice = price * (1 + pct);
            let stockMovement;
            // Cap stock movement at strike if called away
            if (endPrice > strike) {
                stockMovement = (strike - price) * 100;
            } else {
                stockMovement = (endPrice - price) * 100;
            }
            const callOptionIncome = callPremium * 100;
            const costBasis = price * 100;
            const dividendYield = dividend * 100;
            const roi = (dividendYield + stockMovement + callOptionIncome) / costBasis;
            return {
                scenario: label,
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
