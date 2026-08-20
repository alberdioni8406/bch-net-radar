const { fetchWithTimeout } = require('../utils/fetch-with-timeout');
const health = require('../health/tracker');

const NAME = 'paytaca-bcmr';
const BASE = 'https://bcmr.paytaca.com/api';

async function call(path) {
  const res = await fetchWithTimeout(`${BASE}${path}`, { timeoutMs: 5000 });
  health.record(NAME, { ok: res.ok && !res.parseError, status: res.status, latencyMs: res.latencyMs });
  if (!res.ok || res.parseError) return null;
  return res.json;
}

const paytacaBcmrProvider = {
  name: NAME,

  async getTokenMetadata(category) {
    const data = await call(`/tokens/${category}/`);
    if (!data) return null;
    return {
      category,
      name: data.name ?? null,
      description: data.description ?? null,
      symbol: data.token?.symbol ?? null,
      decimals: data.token?.decimals ?? null,
      iconUrl: data.uris?.icon ?? null,
      isNft: Boolean(data.token?.nfts),
      source: NAME,
    };
  },

  async searchRegistries(query) {
    const data = await call(`/registries/search/?q=${encodeURIComponent(query)}`);
    if (!data || !Array.isArray(data.results)) return null;
    return data.results;
  },
};

module.exports = paytacaBcmrProvider;
