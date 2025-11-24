import { ProxyRotator } from './proxy.js';

export const state = {
    active: false,
    airports: [],
    pagesScanned: 0,
    detailsScanned: 0,
    errors: 0,
    currentUrl: '',
    processedCodes: new Set(), // Deduplication
    proxy: new ProxyRotator()
};

