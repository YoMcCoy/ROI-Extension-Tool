// =============================================
// modal.js (Modal UI Builder/Controller)
// =============================================

let modalEl = null;

// Now createModal takes a `scenarios` array, not the full results array!
export function createModal(scenarios) {
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

export function updateModal(scenarios) {
    if (!modalEl) return;
    createModal(scenarios);
}

export function closeModal() {
    if (modalEl && modalEl.parentNode) {
        modalEl.parentNode.removeChild(modalEl);
        modalEl = null;
    }
}
