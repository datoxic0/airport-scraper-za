import { state } from './state.js';
import { STORAGE_KEY } from './config.js';
import { logger, renderRow, updateStats, ui } from './ui.js';

export function saveState() {
    if (state.airports.length > 0) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.airports));
        } catch (e) {
            console.warn("Cache quota exceeded");
        }
    }
}

export function loadCache() {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
        try {
            const data = JSON.parse(cached);
            if (Array.isArray(data) && data.length > 0) {
                logger(`CACHE DETECTED. ${data.length} RECORDS RESTORED.`, 'success');
                state.airports = data;
                state.airports.forEach(ap => {
                    state.processedCodes.add(ap.ident);
                    renderRow(ap);
                });
                updateStats();
                ui.btnCsv.disabled = false;
                ui.btnJson.disabled = false;
            }
        } catch (e) {
            logger("CACHE CORRUPTED. PURGING.", 'error');
            localStorage.removeItem(STORAGE_KEY);
        }
    }
}

export function exportCSV() {
    const headers = ["IDENT", "IATA", "NAME", "TYPE", "REGION", "MUNICIPALITY", "ELEVATION_FT", "LAT", "LON", "URL"];
    const rows = [headers.join(',')];

    state.airports.forEach(ap => {
        const row = [
            ap.ident,
            ap.iata,
            `"${ap.name.replace(/"/g, '""')}"`,
            ap.type,
            ap.region,
            `"${ap.municipality.replace(/"/g, '""')}"`,
            ap.elevation_ft,
            ap.lat,
            ap.lon,
            ap.url
        ];
        rows.push(row.join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AIRPORTS_INTEL_${Date.now()}.csv`;
    a.click();
}

export function exportJSON() {
    const str = JSON.stringify(state.airports, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AIRPORTS_INTEL_${Date.now()}.json`;
    a.click();
}