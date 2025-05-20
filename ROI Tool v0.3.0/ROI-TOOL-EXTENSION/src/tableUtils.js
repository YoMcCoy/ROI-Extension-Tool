// =============================================
// tableUtils.js (Table Finder/Injector)
// =============================================
// - Finds Yahoo options "Calls" table only (never Puts), injects ROI columns, removes old ROI columns if needed

import { createModal, closeModal } from './modal.js';

// Only finds the "Calls" options table
export function findOptionTable() {
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
export function injectROITable(table, results, ticker = '') {
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
            th.style.background = '#FFF9E5';
            th.style.color = '#222';
            th.style.fontWeight = 'bold';
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
            td.style.textAlign = 'right';
            td.className = 'roi-cell';
            td.style.cursor = 'pointer';

            // Pass single scenario and ticker to modal on click
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
export function cleanupOldTables() {
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
