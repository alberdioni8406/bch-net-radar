const { fetchWithTimeout } = require('../utils/fetch-with-timeout');
const health = require('../health/tracker');

const NAME = 'coingecko';
const BASE = 'https://api.coingecko.com/api/v3';
const BCH_ID = 'bitcoin-cash';

async function call(path) {
  const res = await fetchWithTimeout(`${BASE}${path}`, { timeoutMs: 4000 });
  const rateLimited = res.status === 429;
  health.record(NAME, { ok: res.ok && !res.parseError, status: res.status, latencyMs: res.latencyMs, rateLimited });
  if (!res.ok || res.parseError) return null;
  return res.json;
}

const coingeckoProvider = {
  name: NAME,

  async getMarketData(vsCurrencies = ['usd', 'eur', 'gbp', 'btc']) {
    const data = await call(
      `/simple/price?ids=${BCH_ID}&vs_currencies=${vsCurrencies.join(',')}&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`
    );
    const d = data?.[BCH_ID];
    if (!d) return null;
    return {
      priceUsd: d.usd ?? null,
      priceEur: d.eur ?? null,
      priceGbp: d.gbp ?? null,
      priceBtc: d.btc ?? null,
      marketCapUsd: d.usd_market_cap ?? null,
      volume24hUsd: d.usd_24h_vol ?? null,
      change24h: d.usd_24h_change ?? null,
      source: NAME,
    };
  },
};

module.exports = coingeckoProvider;
