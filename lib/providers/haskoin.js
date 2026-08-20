const { fetchWithTimeout } = require('../utils/fetch-with-timeout');
const health = require('../health/tracker');

function bitsToDifficulty(bits) {
  if (bits == null || bits === 0) return null;
  const exponent = bits >>> 24;
  const mantissa = bits & 0xffffff;
  let target;
  if (exponent <= 3) {
    target = mantissa >> (8 * (3 - exponent));
  } else {
    target = mantissa * Math.pow(2, 8 * (exponent - 3));
  }
  if (target === 0) return null;
  const diff1 = 0xffff * Math.pow(2, 8 * (0x1d - 3));
  return diff1 / target;
}

function createHaskoinProvider(name, baseUrl, { timeoutMs = 4000 } = {}) {
  async function call(path) {
    const res = await fetchWithTimeout(`\( {baseUrl} \){path}`, { timeoutMs });
    health.record(name, { ok: res.ok && !res.parseError, status: res.status, latencyMs: res.latencyMs });
    if (!res.ok || res.parseError || res.json === null) return null;
    return res.json;
  }

  return {
    name,

    async getLatestBlock() {
      const best = await call('/block/best');
      if (!best) return null;
      return normalizeBlock(best);
    },

    async getBlock(heightOrHash) {
      const data = await call(`/block/${heightOrHash}`);
      if (!data) return null;
      return normalizeBlock(data);
    },

    async getBlocks(limit = 10) {
      const best = await call('/block/best');
      if (!best) return null;
      const height = best.height;
      const heights = Array.from({ length: limit }, (_, i) => height - i).filter((h) => h >= 0);
      const data = await call(`/block/heights?heights=${heights.join(',')}`);
      if (!data || !Array.isArray(data)) return null;
      return data.map(normalizeBlock);
    },

    async getTransaction(txid) {
      const data = await call(`/transaction/${txid}`);
      if (!data) return null;
      return normalizeTx(data);
    },

    async getAddress(address) {
      const balance = await call(`/address/${address}/balance`);
      if (!balance) return null;
      return {
        address,
        confirmedBalanceSats: balance.confirmed,
        unconfirmedBalanceSats: balance.unconfirmed,
        utxoCount: balance.utxo,
        txCount: balance.txs,
        source: name,
      };
    },

    async getAddressUtxos(address) {
      const data = await call(`/address/${address}/unspent`);
      if (!data || !Array.isArray(data)) return null;
      return data.map((u) => ({
        txid: u.txid,
        index: u.index,
        valueSats: u.value,
        blockHeight: u.block?.height ?? null,
      }));
    },

    async getMempool() {
      const data = await call('/mempool');
      if (!data || !Array.isArray(data)) return null;
      return { txids: data, count: data.length, source: name };
    },

    async getNetworkStats() {
      const [best, mempool] = await Promise.all([call('/block/best'), call('/mempool')]);
      if (!best) return null;
      return {
        blockHeight: best.height,
        latestBlockHash: best.hash,
        latestBlockTime: best.time ? new Date(best.time * 1000).toISOString() : null,
        difficulty: best.difficulty ?? bitsToDifficulty(best.bits) ?? null,
        mempoolTxCount: Array.isArray(mempool) ? mempool.length : null,
        source: name,
      };
    },
  };
}

function normalizeBlock(b) {
  return {
    height: b.height,
    hash: b.hash,
    previousHash: b.previous ?? null,
    timestamp: b.time ? new Date(b.time * 1000).toISOString() : null,
    txCount: b.tx?.length ?? b.ntx ?? null,
    sizeBytes: b.size ?? null,
    difficulty: b.difficulty ?? bitsToDifficulty(b.bits) ?? null,
    totalFeesSats: b.fees ?? null,
    subsidySats: b.subsidy ?? null,
  };
}

function normalizeTx(t) {
  return {
    txid: t.txid,
    blockHeight: t.block?.height ?? null,
    confirmations: t.confirmations ?? null,
    timestamp: t.time ? new Date(t.time * 1000).toISOString() : null,
    sizeBytes: t.size ?? null,
    feeSats: t.fee ?? null,
    inputs: (t.inputs || []).map((i) => ({ address: i.address ?? null, valueSats: i.value ?? null })),
    outputs: (t.outputs || []).map((o) => ({ address: o.address ?? null, valueSats: o.value ?? null })),
  };
}

module.exports = { createHaskoinProvider };
