// =============================================
// roiCalc.js (ROI/Math Logic)
// =============================================
// - All functions related to annualized return, stock movement, cap/uncap logic

export function calculateROI(price, callPremium, dividend, strike, expiry, daysToExpiry, { cap = true } = {}) {
    const scenarios = [
        { pct: -0.10, label: '-10%' },
        { pct: 0.00, label: '0%' },
        { pct: 0.10, label: '+10%' }
    ];

    return scenarios.map(({ pct, label }) => {
        let endPrice = price * (1 + pct);
        if (cap && endPrice > strike) endPrice = strike;
        const callYield = callPremium / price;
        const divYield = dividend / price;
        const stockYield = (endPrice - price) / price;
        const totalYield = callYield + divYield + stockYield;
        const annualized = totalYield * (365 / daysToExpiry);
        return {
            scenario: label,
            callYield,
            divYield,
            stockYield,
            totalYield,
            annualized: typeof annualized === "number" && isFinite(annualized) ? annualized * 100 : 0
        };
    });
}

// Patch: now returns array of objects, each with a 'scenarios' array.
export function calculateAllRows(table, optionData, dividendData, profile) {
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const results = [];
    console.log('calculateAllRows: # of rows:', rows.length);

    rows.forEach((row, idx) => {
        // In production, extract real values from each row here
        const price = 100;
        const callPremium = 2;
        const dividend = 1;
        const strike = 105;
        const expiry = new Date();
        const daysToExpiry = 30;
        const scenarios = calculateROI(price, callPremium, dividend, strike, expiry, daysToExpiry);
        results.push({ scenarios });

        // Debug log for each row injected
        console.log(`Row ${idx}: scenarios=`, scenarios);
    });

    console.log('Final results array:', results);
    return results;
}

