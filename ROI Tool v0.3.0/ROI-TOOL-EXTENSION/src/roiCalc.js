// =============================================
// roiCalc.js (ROI/Math Logic)
// =============================================
// - All functions related to annualized return, stock movement, cap/uncap logic

export function calculateROI(
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
        { pct: -0.10, label: '-10%' },
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
export function calculateAllRows(table, optionData, dividendData, profile) {
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
        const expiry = new Date();
        const daysToExpiry = 30;

        // Pass all variables into updated ROI calculation
        const scenarios = calculateROI(price, callPremium, dividend, strike, expiry, daysToExpiry);

        results.push({ scenarios });

        // Debug log for each row injected
        console.log(`Row ${idx}: scenarios=`, scenarios);
    });

    console.log('Final results array:', results);
    return results;
}