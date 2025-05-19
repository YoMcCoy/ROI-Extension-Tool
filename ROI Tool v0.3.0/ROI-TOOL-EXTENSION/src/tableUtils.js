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
        roiHeaders.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            th.className = 'roi-header';
            th.style.background = '#FFF9E5';
            th.style.color = '#222';
            th.style.fontWeight = 'bold';
            headerRow.appendChild(th);
        });
    }

    // --- Add data cells ---
    const bodyRows = table.querySelectorAll('tbody tr');
    bodyRows.forEach((row, i) => {
        const roiResult = results[i];
        if (!roiResult || !roiResult.scenarios) {
            roiHeaders.forEach(() => {
                const td = document.createElement('td');
                td.textContent = '';
                row.appendChild(td);
            });
            return;
        }
        // Add a cell for each scenario (-10%, 0%, +10%)
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

            row.appendChild(td);
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