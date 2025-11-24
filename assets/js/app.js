/**
 * MILITARY GRADE SCRAPER TOOL
 * REFACTORED ARCHITECTURE: Modular ES6
 * 
 * Logic distributed to ./modules/ directory for maintainability.
 */

import { ui, logger } from './modules/ui.js';
import { state } from './modules/state.js';
import { loadCache, exportCSV, exportJSON } from './modules/storage.js';
import { executeSequence } from './modules/scraper.js';

// -- INITIALIZATION --

// Preset Selection Logic
ui.regionSelect.addEventListener('change', (e) => {
    if (e.target.value !== 'custom') {
        ui.inputUrl.value = e.target.value;
        logger(`TARGET SECTOR ADJUSTED: ${e.target.options[e.target.selectedIndex].text}`, "info");
    }
});

// Sync input back to dropdown if user types manually (optional UI polish)
ui.inputUrl.addEventListener('input', () => {
    ui.regionSelect.value = 'custom';
});

ui.btnStart.addEventListener('click', executeSequence);

ui.btnStop.addEventListener('click', () => {
    logger("USER ABORT TRIGGERED", "warn");
    state.active = false;
});

ui.btnCsv.addEventListener('click', exportCSV);
ui.btnJson.addEventListener('click', exportJSON);

// Check for previous session data
loadCache();

logger("SYSTEM READY. MODULES LOADED. ENTER TARGET COORDINATES.", "info");