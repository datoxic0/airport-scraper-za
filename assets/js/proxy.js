const PROXY_GATEWAYS = [
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, 
];

export class ProxyRotator {
    constructor() {
        this.index = 0;
    }

    get url() {
        return PROXY_GATEWAYS[this.index];
    }

    get name() {
        return `GW-${this.index + 1}`;
    }

    rotate() {
        this.index = (this.index + 1) % PROXY_GATEWAYS.length;
        return this.index;
    }
}