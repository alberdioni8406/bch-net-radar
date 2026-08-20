const { createHaskoinProvider } = require('./haskoin');
const blockchair = require('./blockchair');
const threexpl = require('./threexpl');
const paytacaBcmr = require('./paytaca-bcmr');
const coinpaprika = require('./coinpaprika');
const coingecko = require('./coingecko');
const fx = require('./fx');
const health = require('../health/tracker');

// Original Haskoin instance — kept first in the chain at all times.
// While it's resyncing it will simply fail health checks and the chain
// falls through; the moment it's healthy again it resumes serving traffic
// with zero code changes.
const haskoinOriginal = createHaskoinProvider('haskoin', 'https://api.haskoin.com/bch');

// Maintainer-provided blockchain.info mirror — stopgap while the original
// resyncs. Same API shape (Haskoin Store), same normalization.
const haskoinMirror = createHaskoinProvider(
  'haskoin-mirror',
  process.env.HASKOIN_MIRROR_URL || 'https://api.blockchain.info/haskoin-store/bch'
);

/**
 * Runs an ordered list of provider calls, returning the first non-null
 * result. Every attempt is made regardless of earlier provider health
 * state (health is informational, not a hard circuit-breaker at this
 * scale) — cheap enough given per-call timeouts, and avoids permanently
 * skipping a provider that has since recovered.
 */
async function withFallback(attempts) {
  for (const attempt of attempts) {
    try {
      const result = await attempt.fn();
      if (result !== null && result !== undefined) {
        return { data: result, source: attempt.name };
      }
    } catch (err) {
      // Adapter methods are expected to catch internally and return null;
      // this is a last-resort guard against an unexpected throw.
      continue;
    }
  }
  return { data: null, source: null };
}

const blockchainProviders = {
  async getLatestBlock() {
    return withFallback([
      { name: 'haskoin', fn: () => haskoinOriginal.getLatestBlock() },
      { name: 'haskoin-mirror', fn: () => haskoinMirror.getLatestBlock() },
      { name: '3xpl', fn: () => threexpl.getLatestBlock() },
      { name: 'blockchair', fn: () => blockchair.getLatestBlock() },
    ]);
  },

  async getBlock(heightOrHash) {
    return withFallback([
      { name: 'haskoin', fn: () => haskoinOriginal.getBlock(heightOrHash) },
      { name: 'haskoin-mirror', fn: () => haskoinMirror.getBlock(heightOrHash) },
      { name: '3xpl', fn: () => threexpl.getBlock(heightOrHash) },
      { name: 'blockchair', fn: () => blockchair.getBlock(heightOrHash) },
    ]);
  },

  async getBlocks(limit) {
    return withFallback([
      { name: 'haskoin', fn: () => haskoinOriginal.getBlocks(limit) },
      { name: 'haskoin-mirror', fn: () => haskoinMirror.getBlocks(limit) },
    ]);
  },

  async getTransaction(txid) {
    return withFallback([
      { name: 'haskoin', fn: () => haskoinOriginal.getTransaction(txid) },
      { name: 'haskoin-mirror', fn: () => haskoinMirror.getTransaction(txid) },
      { name: 'blockchair', fn: () => blockchair.getTransaction(txid) },
    ]);
  },

  async getAddress(address) {
    return withFallback([
      { name: 'haskoin', fn: () => haskoinOriginal.getAddress(address) },
      { name: 'haskoin-mirror', fn: () => haskoinMirror.getAddress(address) },
      { name: '3xpl', fn: () => threexpl.getAddress(address) },
      { name: 'blockchair', fn: () => blockchair.getAddress(address) },
    ]);
  },

  async getAddressUtxos(address) {
    return withFallback([
      { name: 'haskoin', fn: () => haskoinOriginal.getAddressUtxos(address) },
      { name: 'haskoin-mirror', fn: () => haskoinMirror.getAddressUtxos(address) },
    ]);
  },

  async getMempool() {
    return withFallback([
      { name: 'haskoin', fn: () => haskoinOriginal.getMempool() },
      { name: 'haskoin-mirror', fn: () => haskoinMirror.getMempool() },
    ]);
  },

  async getNetworkStats() {
    return withFallback([
      { name: 'haskoin', fn: () => haskoinOriginal.getNetworkStats() },
      { name: 'haskoin-mirror', fn: () => haskoinMirror.getNetworkStats() },
      { name: 'blockchair', fn: () => blockchair.getNetworkStats() },
    ]);
  },

  /**
   * Fetches the latest block from every independent source that responds
   * so callers can cross-check and flag disagreement rather than silently
   * trusting a single provider. Does not itself pick a winner.
   */
  async getLatestBlockConsensus() {
    const [haskoinRes, mirrorRes, threexplRes, blockchairRes] = await Promise.allSettled([
      haskoinOriginal.getLatestBlock(),
      haskoinMirror.getLatestBlock(),
      threexpl.getLatestBlock(),
      blockchair.getLatestBlock(),
    ]);

    const results = {
      haskoin: haskoinRes.status === 'fulfilled' ? haskoinRes.value : null,
      'haskoin-mirror': mirrorRes.status === 'fulfilled' ? mirrorRes.value : null,
      '3xpl': threexplRes.status === 'fulfilled' ? threexplRes.value : null,
      blockchair: blockchairRes.status === 'fulfilled' ? blockchairRes.value : null,
    };

    const heights = Object.values(results)
      .filter(Boolean)
      .map((b) => b.height);
    const agree = heights.length > 0 && heights.every((h) => Math.abs(h - heights[0]) <= 1);

    return { results, consensus: heights.length > 0 ? (agree ? 'verified' : 'disagreement') : 'unavailable' };
  },
};

const marketProviders = {
  async getPrimaryMarketData() {
    return withFallback([{ name: 'coinpaprika', fn: () => coinpaprika.getMarketData() }]);
  },

  async getSecondaryMarketData() {
    return withFallback([{ name: 'coingecko', fn: () => coingecko.getMarketData() }]);
  },

  /**
   * Combines primary + secondary market sources, flagging a spread warning
   * if they disagree by more than 2%. Never silently averages away a
   * meaningful discrepancy.
   */
  async getMarketConsensus() {
    const [primary, secondary] = await Promise.all([
      this.getPrimaryMarketData(),
      this.getSecondaryMarketData(),
    ]);

    if (!primary.data) {
      return { price: secondary.data, primarySource: null, secondarySource: secondary.source, spreadPct: null, flag: secondary.data ? 'primary_unavailable' : 'unavailable' };
    }

    let spreadPct = null;
    let flag = 'ok';
    if (secondary.data?.priceUsd) {
      spreadPct = Math.abs(primary.data.priceUsd - secondary.data.priceUsd) / primary.data.priceUsd * 100;
      if (spreadPct > 2) flag = 'discrepancy';
    } else {
      flag = 'secondary_unavailable';
    }

    return {
      price: primary.data,
      primarySource: primary.source,
      secondarySource: secondary.source,
      spreadPct,
      flag,
    };
  },

  async getFxRates() {
    return withFallback([{ name: 'fx', fn: () => fx.getRates('USD', ['EUR', 'GBP', 'MZN']) }]);
  },
};

const tokenProviders = {
  async getTokenMetadata(category) {
    return withFallback([{ name: 'paytaca-bcmr', fn: () => paytacaBcmr.getTokenMetadata(category) }]);
  },
};

function getHealthSnapshot() {
  return health.getAll();
}

module.exports = { blockchainProviders, marketProviders, tokenProviders, getHealthSnapshot };
