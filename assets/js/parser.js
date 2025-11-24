import { state } from './state.js';

export function parseListingPage(html, baseUrl) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const targets = [];

    const links = Array.from(doc.querySelectorAll('a[href^="/airports/"]'));

    links.forEach(link => {
        const href = link.getAttribute('href');
        const match = href.match(/^\/airports\/([A-Z0-9-]+)\/$/i);
        if (!match) return;

        const ident = match[1];
        if (state.processedCodes.has(ident)) return;
        state.processedCodes.add(ident);

        targets.push({
            ident: ident,
            url: `https://ourairports.com${href}`
        });
    });

    let nextUrl = null;
    const nextLink = doc.querySelector('a[rel="next"]') || 
                     Array.from(doc.querySelectorAll('a')).find(a => a.textContent.includes('Next'));

    if (nextLink) {
        const href = nextLink.getAttribute('href');
        if (href) {
            if (href.startsWith('?')) {
                const urlObj = new URL(baseUrl);
                nextUrl = `${urlObj.origin}${urlObj.pathname}${href}`;
            } else if (!href.startsWith('http')) {
                nextUrl = new URL(href, "https://ourairports.com").href;
            } else {
                nextUrl = href;
            }
        }
    }

    return { targets, next: nextUrl };
}

export function parseDetailPage(html, url) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const textContent = doc.body.textContent.replace(/\s+/g, ' ');

    const data = {
        ident: '?',
        iata: '',
        name: 'Unknown',
        type: 'Unknown',
        municipality: 'Unknown',
        region: '',
        elevation_ft: '',
        lat: '',
        lon: '',
        url: url
    };

    // STRATEGY 1: Structured Data (JSON-LD)
    try {
        const script = doc.querySelector('script[type="application/ld+json"]');
        if (script && script.textContent) {
            const json = JSON.parse(script.textContent);
            data.name = json.name || data.name;
            data.ident = json.icaoCode || data.ident;
            data.iata = json.iataCode || data.iata;

            if (json.geo) {
                data.lat = json.geo.latitude;
                data.lon = json.geo.longitude;
            }
            if (json.address) {
                data.municipality = json.address.addressLocality || data.municipality;
                data.region = json.address.addressRegion || data.region;
            }
            if (json.description) {
                 data.type = json.description.split(' in ')[0];
            }
        }
    } catch(e) {}

    // STRATEGY 2: Visual Table/Definition Parsing
    const findLabelValue = (regex) => {
        const elements = Array.from(doc.querySelectorAll('dt, th, span, b, strong, td'));
        const labelEl = elements.find(el => regex.test(el.textContent));
        if (labelEl) {
            let next = labelEl.nextElementSibling;
            if (next && (next.tagName === 'DD' || next.tagName === 'TD')) {
                return next.textContent.trim();
            }
        }
        return null;
    };

    // STRATEGY 3: Regex
    const findTextRegex = (regex) => {
        const match = textContent.match(regex);
        return match ? match[1].trim() : null;
    }

    // Execution
    if (!data.iata) {
        data.iata = findLabelValue(/IATA code/i) || findTextRegex(/IATA code\s+([A-Z0-9]{3})/i) || '';
    }

    const extractedIdent = findLabelValue(/ICAO code/i) || findTextRegex(/ICAO code\s+([A-Z0-9]{4})/i);
    if (extractedIdent) data.ident = extractedIdent;

    if (data.type === 'Unknown') {
        const rawType = findLabelValue(/Facility type/i) || findTextRegex(/Facility type\s+([A-Za-z_ ]+)/i);
        if (rawType) data.type = rawType;
    }

    if (!data.lat) {
        // Regex fix: Ensure hyphen is escaped or placed safely to avoid 'Range out of order' errors
        const coordRaw = findLabelValue(/Coordinates/i) || findTextRegex(/Coordinates\s+([0-9.,\-]+)/i);
        if (coordRaw) {
            const parts = coordRaw.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
            if (parts) {
                data.lat = parts[1];
                data.lon = parts[2];
            }
        }
    }

    if (!data.elevation_ft) {
        const elevRaw = findLabelValue(/Field elevation/i) || findTextRegex(/Field elevation\s+(\d+)\s*ft/i);
        if (elevRaw) {
            const ft = elevRaw.match(/(\d+)\s*ft/) || elevRaw.match(/^(\d+)/);
            if (ft) data.elevation_ft = ft[1];
        }
    }

    if (data.municipality === 'Unknown' || !data.region) {
        const locRaw = findLabelValue(/Location/i);
        if (locRaw) {
            const parts = locRaw.split(',').map(s => s.trim());
            if (parts[0]) data.municipality = parts[0];
            if (parts[1]) data.region = parts[1];
        }
    }

    if (data.name === 'Unknown') {
        const h1 = doc.querySelector('h1');
        if (h1) data.name = h1.textContent.split('(')[0].trim();
    }

    return data;
}