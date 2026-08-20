const { fetchWithTimeout } = require('../utils/fetch-with-timeout');
const health = require('../health/tracker');

const NAME = '3xpl';
const BASE = 'https://api.3xpl.com/bitcoin-cash';

function authHeaders() {
  const key = process.env.THREEXPL_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : {};
}

async function call(path) {
  const res = await fetchWithTimeout(`${BASE}${path}`, { timeoutMs: 5000, headers: authHeaders() });
  const rateLimited = res.status === 429;
  health.record(NAME, { ok: res.ok && !res.parseError, status: res.status, latencyMs: res.latencyMs, rateLimited });
  if (!res.ok || res.parseError) return null;
  return res.json;
}

const threexplProvider = {
  name: NAME,

  async getLatestBlock() {
    const data = await call('/block');
    const block = data?.data?.block;
    if (!block) return null;
    return {
      height: block.number,
      hash: block.hash,
      timestamp: block.time ?? null,
    };
  },

  async getBlock(height) {
    const data = await call(`/block/${height}`);
    const block = data?.data?.block;
    if (!block) return null;
    return {
      height: block.number,
      hash: block.hash,
      timestamp: block.time ?? null,
      txCount: block.transaction_count ?? null,
    };
  },

  async getAddress(address) {
    const data = await call(`/address/${address}`);
    const a = data?.data?.address;
    if (!a) return null;
    return {
      address,
      confirmedBalanceSats: a.balance ?? null,
      source: NAME,
    };
  },
};

module.exports = threexplProvider;
