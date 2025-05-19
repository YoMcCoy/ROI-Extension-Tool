// =============================================
// tableUtils.js (Table Finder/Injector)
// =============================================
// - Finds Yahoo options "Calls" table only (never Puts), injects ROI columns, removes old ROI columns if needed

import { createModal, closeModal } from './modal.js';

// Only finds the "Calls" options table
export function findOptionTable() {
    // Yahoo renders Calls and Puts tables as sibling sections
    const tables = Array.from(document.querySelectorAll('section table'));
    for (const table of tables) {
        // Try to find "Calls" header above table, up to 2 parent elements up
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
        // Fallback: header row has "Contract Name" or "Strike"
        if (!foundCalls) {
            const headerRow = table.querySelector('thead tr');
            if (headerRow && [...headerRow.cells].some(cell => /Contract Name|Strike/i.test(cell.textContent))) {
                // Check for text "Calls" in preceding siblings
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
export function injectROITable(table, results) {
    if (!table || !Array.isArray(results) || !results.length) return;

    // ROI headers to match your spec
    const roiHeaders = ['ROI -10%', 'ROI 0%', 'ROI 10%'];

    // --- Add headers ---
    const headerRow = table.querySelector('thead tr');
    if (headerRow && headerRow.cells.length > 0) {
        // Find the "% Change" column index (so we can insert ROI columns after it)
        let insertAfterIdx = -1;
        for (let i = 0; i < headerRow.cells.length; i++) {
            if (headerRow.cells[i].textContent.trim() === '% Change') {
                insertAfterIdx = i;
                break;
            }
        }

        // Fallback to appending at end if "% Change" is not found
        if (insertAfterIdx === -1) insertAfterIdx = headerRow.cells.length - 1;

        // Insert ROI header cells after "% Change"
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

    // --- Add data cells ---
    const bodyRows = table.querySelectorAll('tbody tr');
    bodyRows.forEach((row, i) => {
        const roiResult = results[i];
        // Find the "% Change" column index in this row, to insert ROI cells after it
        let insertAfterIdx = -1;
        for (let c = 0; c < row.cells.length; c++) {
            const text = row.cells[c].textContent.trim();
            // Try to match by column header order
            if (headerRow && headerRow.cells[c] && headerRow.cells[c].textContent.trim() === '% Change') {
                insertAfterIdx = c;
                break;
            }
            // Fallback: look for "% Change" in row (edge case)
            if (text === '% Change') {
                insertAfterIdx = c;
                break;
            }
        }
        if (insertAfterIdx === -1) insertAfterIdx = row.cells.length - 1;

        // If no ROI data for this row, insert empty cells
        if (!roiResult || !roiResult.scenarios) {
            for (let j = 0; j < roiHeaders.length; j++) {
                const td = document.createElement('td');
                td.textContent = '';
                row.insertBefore(td, row.cells[insertAfterIdx + 1 + j]);
            }
            return;
        }

        // Insert a cell for each scenario (-10%, 0%, +10%)
        roiResult.scenarios.forEach((scenario, colIdx) => {
            const td = document.createElement('td');
            td.textContent = (typeof scenario.annualized === 'number')
                ? scenario.annualized.toFixed(2) + '%'
                : '';
            td.style.textAlign = 'right';
            td.className = 'roi-cell';

            // Make cell clickable and open modal with scenarios for this row
            td.style.cursor = 'pointer';
            td.addEventListener('click', (event) => {
                closeModal();
                createModal(roiResult.scenarios);
                event.stopPropagation();
            });
            row.insertBefore(td, row.cells[insertAfterIdx + 1 + colIdx]);
        });
    });
}

// Remove previously injected ROI columns from the table.
export function cleanupOldTables() {
    // Remove all ROI headers and cells entirely from the DOM
    document.querySelectorAll('.roi-header').forEach(el => {
        el.parentNode && el.parentNode.removeChild(el);
    });
    document.querySelectorAll('.roi-cell').forEach(el => {
        el.parentNode && el.parentNode.removeChild(el);
    });
    // Remove the ROI modal as well (if it exists)
    const modal = document.querySelector('.roi-tool-modal');
    if (modal && modal.parentNode) {
        modal.parentNode.removeChild(modal);
    }
}
