const { fetchWithTimeout } = require('../utils/fetch-with-timeout');
const health = require('../health/tracker');

const NAME = 'coinpaprika';
const BASE = 'https://api.coinpaprika.com/v1';
const BCH_ID = 'bch-bitcoin-cash';

async function call(path) {
  const res = await fetchWithTimeout(`${BASE}${path}`, { timeoutMs: 4000 });
  const rateLimited = res.status === 429;
  health.record(NAME, { ok: res.ok && !res.parseError, status: res.status, latencyMs: res.latencyMs, rateLimited });
  if (!res.ok || res.parseError) return null;
  return res.json;
}

const coinpaprikaProvider = {
  name: NAME,

  async getMarketData() {
    const data = await call(`/tickers/${BCH_ID}`);
    if (!data) return null;
    const usd = data.quotes?.USD;
    if (!usd) return null;
    return {
      priceUsd: usd.price,
      marketCapUsd: usd.market_cap,
      volume24hUsd: usd.volume_24h,
      change1h: usd.percent_change_1h,
      change24h: usd.percent_change_24h,
      change7d: usd.percent_change_7d,
      change30d: usd.percent_change_30d,
      athUsd: usd.ath_price,
      circulatingSupply: data.circulating_supply,
      totalSupply: data.total_supply,
      updatedAt: data.last_updated,
      source: NAME,
    };
  },
};

module.exports = coinpaprikaProvider;
