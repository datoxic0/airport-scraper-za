import { state } from './state.js';
import { ui, logger, updateStats, renderRow } from './ui.js';
import { fetchWithRetry } from './network.js';
import { parseListingPage, parseDetailPage } from './parser.js';
import { saveState } from './storage.js';
import { CONCURRENCY_DEFAULT, STORAGE_KEY } from './config.js';

let concurrencyLimit = CONCURRENCY_DEFAULT;

export function setConcurrency(val) {
    if (val > 0 && val <= 50) concurrencyLimit = val;
}

async function processBatch(urls) {
    for (let i = 0; i < urls.length; i += concurrencyLimit) {
        if (!state.active) break;
        
        const chunk = urls.slice(i, i + concurrencyLimit);
        const promises = chunk.map(target => 
            fetchWithRetry(target.url)
                .then(html => parseDetailPage(html, target.url))
                .then(data => {
                    if (data.ident === '?') data.ident = target.ident;
                    return data;
                })
                .catch(err => {
                    logger(`Failed ${target.ident}: ${err.message}`, 'error');
                    state.errors++;
                    return null;
                })
        );
        
        const chunkResults = await Promise.all(promises);
        
        chunkResults.forEach(res => {
            if (res) {
                state.airports.push(res);
                state.detailsScanned++;
                renderRow(res);
            }
        });

        updateStats();
        saveState();
        
        // Increased delay to be kinder to proxies
        const delay = 500 + Math.random() * 1000;
        await new Promise(r => setTimeout(r, delay));
    }
}

export function terminate() {
    state.active = false;
    ui.btnStart.disabled = false;
    ui.btnStop.disabled = true;
    ui.app.classList.remove('scanning');
    ui.status.textContent = "STANDBY";
    ui.status.style.color = "var(--terminal-dim)";
    ui.indicator.textContent = "OFFLINE";
    
    if (state.airports.length > 0) {
        ui.btnCsv.disabled = false;
        ui.btnJson.disabled = false;
        logger(`OPERATION COMPLETE. ${state.airports.length} RECORDS SECURED.`, "success");
    }
}

export async function executeSequence() {
    if (state.active) return;
    
    const targetInput = ui.inputUrl.value.trim();
    if (!targetInput) {
        logger("ERROR: NO TARGET URL SPECIFIED", "error");
        return;
    }

    const inputC = parseInt(ui.inputConcurrency.value, 10);
    setConcurrency(inputC);

    state.active = true;
    state.airports = []; 
    state.processedCodes.clear();
    ui.table.innerHTML = ''; 
    localStorage.removeItem(STORAGE_KEY); 

    state.pagesScanned = 0;
    state.detailsScanned = 0;
    state.errors = 0;
    state.currentUrl = targetInput;
    
    ui.btnStart.disabled = true;
    ui.btnStop.disabled = false;
    ui.btnCsv.disabled = true;
    ui.btnJson.disabled = true;
    ui.app.classList.add('scanning');
    ui.status.textContent = "ACTIVE";
    ui.status.style.color = "var(--terminal-green)";
    ui.indicator.textContent = "SCANNING";
    
    logger(`INITIALIZING DEEP CRAWL SEQUENCE ON: ${targetInput}`, "info");
    logger(`CONCURRENCY: ${concurrencyLimit} THREADS`, "info");
    updateStats();
    
    try {
        while (state.currentUrl && state.active) {
            logger(`TARGETING SECTOR: ${state.currentUrl}`, "info");
            
            const html = await fetchWithRetry(state.currentUrl);
            const result = parseListingPage(html, state.currentUrl);
            
            logger(`SECTOR MAPPED. ${result.targets.length} TARGETS FOUND. EXECUTING DEEP SCAN...`, "info");
            state.pagesScanned++;
            
            if (result.targets.length > 0) {
                await processBatch(result.targets);
            } else {
                logger("NO TARGETS IN SECTOR", "warn");
            }
            
            state.currentUrl = result.next;
            updateStats();
            
            if (state.currentUrl) {
                await new Promise(r => setTimeout(r, 1000));
            } else {
                logger("END OF SECTOR REACHED. MISSION COMPLETE.", "success");
            }
        }
    } catch (criticalError) {
        logger(`CRITICAL FAILURE: ${criticalError.message}`, "error");
    } finally {
        terminate();
    }
}

