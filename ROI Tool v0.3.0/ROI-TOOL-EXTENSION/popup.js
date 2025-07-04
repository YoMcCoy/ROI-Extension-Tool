// ROI Tool Popup - Shows FMP summary data only
document.addEventListener('DOMContentLoaded', () => {
    const contentDiv = document.getElementById('popup-content');
    chrome.storage.local.get(['lastStockSummary'], (data) => {
        const summary = data.lastStockSummary;
        if (!summary) {
            contentDiv.textContent = 'No stock data found. Open a Yahoo options page!';
            return;
        }
        contentDiv.innerHTML = `
      <div class="data-block"><span class="data-label">Stock Ticker:</span> ${summary.ticker}</div>
      <div class="data-block"><span class="data-label">Price:</span> $${summary.price}</div>
      <div class="data-block"><span class="data-label">Annualized Dividend:</span> $${summary.dividend}</div>
      <div style="margin-top:1em; font-size:90%; color:#777;">(Source: FMP API)<br>Open a Yahoo options page and click an ROI cell for a full breakdown.</div>
    `;
    });
});
