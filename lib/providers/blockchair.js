const { fetchWithTimeout } = require('../utils/fetch-with-timeout');
const health = require('../health/tracker');

const NAME = 'blockchair';
const BASE = 'https://api.blockchair.com/bitcoin-cash';

function apiKeySuffix() {
  const key = process.env.BLOCKCHAIR_API_KEY;
  return key ? `${key.includes('?') ? '&' : '?'}key=${key}` : '';
}

async function call(path) {
  const url = `${BASE}${path}${apiKeySuffix()}`;
  const res = await fetchWithTimeout(url, { timeoutMs: 5000 });
  const rateLimited = res.status === 402 || res.status === 429;
  health.record(NAME, { ok: res.ok && !res.parseError, status: res.status, latencyMs: res.latencyMs, rateLimited });
  if (!res.ok || res.parseError) return null;
  return res.json;
}

const blockchairProvider = {
  name: NAME,

  // Used only for cross-checking the current tip, not as a primary poll target.
  async getLatestBlock() {
    const data = await call('/stats');
    if (!data?.data) return null;
    const d = data.data;
    return {
      height: d.best_block_height,
      hash: d.best_block_hash,
      timestamp: d.best_block_time ?? null,
    };
  },

  async getBlock(heightOrHash) {
    const data = await call(`/dashboards/block/${heightOrHash}`);
    const key = Object.keys(data?.data || {})[0];
    if (!key) return null;
    const b = data.data[key].block;
    return {
      height: b.id,
      hash: b.hash,
      previousHash: null,
      timestamp: b.time,
      txCount: b.transaction_count,
      sizeBytes: b.size,
      difficulty: b.difficulty,
    };
  },

  async getTransaction(txid) {
    const data = await call(`/dashboards/transaction/${txid}`);
    const tx = data?.data?.[txid]?.transaction;
    if (!tx) return null;
    return {
      txid: tx.hash,
      blockHeight: tx.block_id,
      timestamp: tx.time,
      sizeBytes: tx.size,
      feeSats: tx.fee,
    };
  },

  async getAddress(address) {
    const data = await call(`/dashboards/address/${address}`);
    const a = data?.data?.[address]?.address;
    if (!a) return null;
    return {
      address,
      confirmedBalanceSats: a.balance,
      txCount: a.transaction_count,
      source: NAME,
    };
  },

  async getNetworkStats() {
    const data = await call('/stats');
    if (!data?.data) return null;
    const d = data.data;
    return {
      blockHeight: d.best_block_height,
      latestBlockHash: d.best_block_hash,
      difficulty: d.difficulty ?? null,
      hashrate: d.hashrate_24h ?? null,
      mempoolTxCount: d.mempool_transactions ?? null,
      source: NAME,
    };
  },

  // Haskoin's /mempool only returns txids — no size or fee info. Blockchair's
  // /stats carries an actual mempool byte size and a suggested fee rate, so
  // this is a genuinely independent, more informative source for the
  // mempool panel rather than a duplicate of the tx-count-only view.
  async getMempoolStats() {
    const data = await call('/stats');
    if (!data?.data) return null;
    const d = data.data;
    return {
      txCount: d.mempool_transactions ?? null,
      sizeBytes: d.mempool_size ?? null,
      suggestedFeeSatPerByte: d.suggested_transaction_fee_per_byte_sat ?? null,
      source: NAME,
    };
  },
};

module.exports = blockchairProvider;
