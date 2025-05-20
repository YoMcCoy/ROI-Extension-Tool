// =============================================
// modal.js (Modal UI Builder/Controller)
// =============================================

let modalEl = null;

// Now createModal takes a single scenario object and optional ticker string
export function createModal(scenario, ticker = '') {
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
    modalEl.style.minWidth = '300px';
    modalEl.style.fontFamily = 'inherit';
    modalEl.style.whiteSpace = 'pre-line'; // keep newlines

    // Title with scenario label and optional ticker
    const title = document.createElement('h3');
    title.textContent = `ROI Breakdown @ ${scenario.scenario}` + (ticker ? ` (${ticker})` : '');
    title.style.margin = '0 0 16px 0';
    modalEl.appendChild(title);

    // Create content text block
    const content = document.createElement('div');
    content.style.fontSize = '14px';
    content.style.lineHeight = '1.4';

    // Format stock movement description for call-away cap
    const capped = scenario.stockMovement < 0 ? ' (Called away, capped at strike)' : ' (Not called away)';
    const stockMovementDisplay = scenario.stockMovement.toFixed(2) + capped;

    // Construct full content string with values and labels
    content.textContent =
        `Strike Price: $${scenario.costBasis / 100}\n` +
        `Call Income: $${scenario.callOptionIncome.toFixed(2)}\n` +
        `Dividend Income: $${scenario.dividendYield.toFixed(2)}\n` +
        `Cost Basis: $${scenario.costBasis.toFixed(2)}\n` +
        `Stock Movement: ${stockMovementDisplay}\n` +
        `ROI: ${scenario.roiPercent.toFixed(2)}%`;

    modalEl.appendChild(content);

    // Close button
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

// updateModal updated to match
export function updateModal(scenario, ticker = '') {
    if (!modalEl) return;
    createModal(scenario, ticker);
}

export function closeModal() {
    if (modalEl && modalEl.parentNode) {
        modalEl.parentNode.removeChild(modalEl);
        modalEl = null;
    }
}
