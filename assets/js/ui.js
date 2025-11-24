import { state } from './state.js';

export const ui = {
    get log() { return document.getElementById('log-display'); },
    get table() { return document.querySelector('#results-table tbody'); },
    get btnStart() { return document.getElementById('btn-start'); },
    get btnStop() { return document.getElementById('btn-stop'); },
    get btnCsv() { return document.getElementById('btn-csv'); },
    get btnJson() { return document.getElementById('btn-json'); },
    get inputUrl() { return document.getElementById('target-url'); },
    get regionSelect() { return document.getElementById('region-select'); },
    get inputConcurrency() { return document.getElementById('concurrency'); },
    get stats() {
        return {
            get airports() { return document.getElementById('count-airports'); },
            get pages() { return document.getElementById('count-pages'); },
            get errors() { return document.getElementById('count-errors'); },
            get proxy() { return document.getElementById('current-proxy'); }
        };
    },
    get app() { return document.getElementById('app-container'); },
    get status() { return document.getElementById('system-status'); },
    get indicator() { return document.getElementById('scan-indicator'); }
};

export function logger(msg, type = 'info') {
    const line = document.createElement('div');
    line.className = `log-line log-${type}`;
    const ts = new Date().toISOString().split('T')[1].split('.')[0];
    line.textContent = `[${ts}] ${msg}`;
    ui.log.appendChild(line);
    ui.log.scrollTop = ui.log.scrollHeight;
}

export function updateStats() {
    ui.stats.airports.textContent = state.airports.length;
    ui.stats.pages.textContent = `${state.pagesScanned} PG | ${state.detailsScanned} DET`;
    ui.stats.errors.textContent = state.errors;
    ui.stats.proxy.textContent = state.proxy.name;
}

export function renderRow(data) {
    const tr = document.createElement('tr');

    // Formatting helpers
    const fmtC = (val) => val || '<span style="color:#444">--</span>';
    const fmtLoc = (val) => val && val !== 'Unknown' ? val : '<span style="color:#444">?</span>';

    tr.innerHTML = `
        <td class="code-cell"><a href="${data.url}" target="_blank" style="color:var(--primary);text-decoration:none">${data.ident}</a></td>
        <td class="code-cell" style="color:var(--terminal-green)">${fmtC(data.iata)}</td>
        <td style="color:#fff; font-weight:bold; overflow:hidden; text-overflow:ellipsis; max-width:200px;" title="${data.name}">${data.name}</td>
        <td style="text-transform:capitalize; color:#aaa">${data.type ? data.type.replace(/_/g, ' ') : 'Unknown'}</td>
        <td>${fmtLoc(data.region)}</td>
        <td>${fmtLoc(data.municipality)}</td>
        <td style="text-align:right; font-family:monospace">${data.elevation_ft ? data.elevation_ft + ' ft' : fmtC(null)}</td>
        <td style="font-family: monospace; font-size: 0.75em; color:#888;">
            ${data.lat && data.lon ? `${parseFloat(data.lat).toFixed(4)}, ${parseFloat(data.lon).toFixed(4)}` : fmtC(null)}
        </td>
    `;
    ui.table.insertBefore(tr, ui.table.firstChild);
}