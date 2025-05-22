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
export async function createModal(scenario, ticker = '') {
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
