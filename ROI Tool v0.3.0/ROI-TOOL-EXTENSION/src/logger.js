// =============================================
// logger.js (Debug/Error Logging)
// =============================================
// - Handles console logging, easy on/off switch for debug output

const DEBUG_ENABLED = true; // Set to false to silence debug logs

// Wrapper for console.log, adds timestamp and only logs if DEBUG_ENABLED is true
export function debug(...args) {
    if (!DEBUG_ENABLED) return;
    const ts = new Date().toISOString().split('T')[1].replace('Z',''); // HH:MM:SS.sss
    console.log(`[ROI DEBUG ${ts}]`, ...args);
}

// Wrapper for console.error, always logs
export function error(...args) {
    const ts = new Date().toISOString().split('T')[1].replace('Z','');
    console.error(`[ROI ERROR ${ts}]`, ...args);
}
// ============= END LOGGER =============
