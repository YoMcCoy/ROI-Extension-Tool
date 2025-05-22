// =============================================
// api.js (API Fetchers/Helpers)
// =============================================
// - Handles all API requests to Yahoo/FMP/etc. for stock profile, options, and dividends
// - Returns parsed data for use in calculations

// Fetches the stock profile from FinancialModelingPrep API
export async function fetchStockProfile(ticker) {
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
export async function fetchOptionChain() {
    // For v0.2.4, we pull directly from the Yahoo table, so this is a placeholder
    // Later, could be updated for direct API access or scraping.
    return null;
}

// Fetches dividend data from FMP historical-price-full endpoint
export async function fetchDividends(ticker) {
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
