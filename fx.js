const { fetchWithTimeout } = require('../utils/fetch-with-timeout');
const health = require('../health/tracker');

const NAME = 'fx';
// exchangerate.host is a free, keyless FX API with broad currency coverage
// including MZN, which most ECB-based free FX APIs (e.g. Frankfurter) omit.
const BASE = 'https://api.exchangerate.host';

async function call(path) {
  const res = await fetchWithTimeout(`${BASE}${path}`, { timeoutMs: 4000 });
  health.record(NAME, { ok: res.ok && !res.parseError, status: res.status, latencyMs: res.latencyMs });
  if (!res.ok || res.parseError) return null;
  return res.json;
}

const fxProvider = {
  name: NAME,

  async getRates(base = 'USD', symbols = ['EUR', 'GBP', 'MZN']) {
    const data = await call(`/latest?base=${base}&symbols=${symbols.join(',')}`);
    if (!data?.rates) return null;
    return { base, rates: data.rates, source: NAME };
  },
};

module.exports = fxProvider;
