/**
 * StockScreener Pro — Cloudflare Worker
 * Proxies Yahoo Finance API to add CORS headers so the app can call it from any browser.
 *
 * DEPLOY INSTRUCTIONS (free, takes 3 minutes):
 * 1. Go to https://workers.cloudflare.com  →  Sign up free (no credit card)
 * 2. Click "Create a Worker"
 * 3. Delete all the example code and paste this entire file
 * 4. Click "Save and Deploy"
 * 5. Copy the worker URL  (e.g. https://stock-proxy.yourname.workers.dev)
 * 6. Paste that URL into the app's Settings → Proxy URL field
 *
 * Free tier limits: 100,000 requests/day — far more than needed.
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

async function handleRequest(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'quote';

  try {
    let data;
    if (type === 'history') {
      data = await fetchHistory(url);
    } else {
      data = await fetchQuotes(url);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}

async function fetchQuotes(url) {
  const symbols = url.searchParams.get('symbols') || url.searchParams.get('symbol') || 'AAPL';
  const fields = [
    'regularMarketPrice', 'regularMarketChange', 'regularMarketChangePercent',
    'regularMarketVolume', 'marketCap', 'fiftyTwoWeekHigh', 'fiftyTwoWeekLow',
    'trailingPE', 'epsTrailingTwelveMonths', 'shortName', 'longName',
    'sector', 'industry', 'currency', 'exchange', 'fullExchangeName',
    'beta', 'trailingAnnualDividendYield', 'priceToBook',
    'forwardPE', 'regularMarketOpen', 'regularMarketDayHigh', 'regularMarketDayLow',
  ].join(',');

  const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=${fields}&lang=en-US&region=US&corsDomain=finance.yahoo.com`;

  const r = await fetch(yahooUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://finance.yahoo.com',
    },
  });

  if (!r.ok) throw new Error(`Yahoo Finance HTTP ${r.status}`);
  return r.json();
}

async function fetchHistory(url) {
  const symbol = url.searchParams.get('symbol') || 'AAPL';
  const range  = url.searchParams.get('range')  || '6mo';  // 1mo 3mo 6mo 1y 2y
  const interval = range === '1mo' ? '1d' : '1d';

  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&events=history&includePrePost=false`;

  const r = await fetch(yahooUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Referer': 'https://finance.yahoo.com',
    },
  });

  if (!r.ok) throw new Error(`Yahoo Finance history HTTP ${r.status}`);
  return r.json();
}
