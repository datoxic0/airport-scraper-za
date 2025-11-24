import { state } from './state.js';
import { logger, updateStats } from './ui.js';
import { MAX_RETRIES } from './config.js';

export async function fetchWithRetry(targetUrl) {
    let attempts = 0;

    while (attempts < MAX_RETRIES && state.active) {
        const proxyFn = state.proxy.url;
        const fetchUrl = proxyFn(targetUrl);

        try {
            // Only log on first attempt or significant retry
            if (attempts === 0) logger(`Requesting: ${targetUrl.slice(-20)}`, 'info');

            // Add timeout signal
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 15000); // 15s timeout

            const response = await fetch(fetchUrl, { signal: controller.signal });
            clearTimeout(id);

            let text = '';
            if (fetchUrl.includes('api.allorigins.win/get')) {
                const json = await response.json();
                text = json.contents;
            } else {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                text = await response.text();
            }

            if (!text || text.length < 50) throw new Error("Empty/Invalid response");

            return text;

        } catch (err) {
            attempts++;
            const isLast = attempts === MAX_RETRIES;
            const logType = isLast ? 'error' : 'warn';
            
            let errMsg = err.name === 'AbortError' ? 'Timeout' : err.message;
            logger(`Attempt ${attempts}/${MAX_RETRIES} Failed: ${errMsg} [${state.proxy.name}]`, logType);
            
            state.proxy.rotate();
            updateStats();
            
            // Exponential backoff
            await new Promise(r => setTimeout(r, 1000 * attempts));
        }
    }
    throw new Error("Target unreachable after max retries");
}