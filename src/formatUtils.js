// =============================================
// formatUtils.js (Formatting, Emoji, Money)
// =============================================
// - Formats dollar/percent amounts, adds emoji for visual clarity

// Format a number as USD currency (e.g., $1,234.56)
export function formatMoney(num) {
    // Uses built-in Intl API for US currency formatting
    return num == null ? '' : num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

// Format a number as a percentage (e.g., 5.50%)
export function formatPercent(num) {
    // Handles null/undefined gracefully
    return num == null ? '' : num.toFixed(2) + '%';
}

// Return an emoji based on value type (e.g., 'call', 'dividend', etc.)
export function getEmojiForType(type) {
    // You can extend this mapping to cover all value types you display
    switch(type) {
        case 'call': return '📞';
        case 'dividend': return '💸';
        case 'stock': return '📈';
        case 'roi': return '🔁';
        case 'yield': return '💹';
        default: return 'ℹ️';
    }
}
// ============= END FORMAT UTILS =============
