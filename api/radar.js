const { blockchainProviders, marketProviders, getHealthSnapshot } = require('../lib/providers');
const { sendJson } = require('../lib/utils/envelope');

const GLOBAL_TIMEOUT_MS = 9000; // stay well under Vercel's default function limit

function withGlobalTimeout(promise, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), GLOBAL_TIMEOUT_MS)),
  ]);
}

module.exports = async (req, res) => {
  const startedAt = Date.now();

  const [network, blocksResult, mempool, marketConsensus, consensus] = await Promise.all([
    withGlobalTimeout(blockchainProviders.getNetworkStats(), { data: null, source: null }),
    withGlobalTimeout(blockchainProviders.getBlocks(10), { data: null, source: null }),
    withGlobalTimeout(blockchainProviders.getMempool(), { data: null, source: null }),
    withGlobalTimeout(marketProviders.getMarketConsensus(), { price: null }),
    withGlobalTimeout(blockchainProviders.getLatestBlockConsensus(), { consensus: 'unavailable', results: {} }),
  ]);

  const payload = {
    network: network.data
      ? {
          ...network.data,
          consensus: consensus.consensus || 'unavailable',
          status: 'fresh',
          source: network.source,
        }
      : { status: 'unavailable' },
    latestBlock: blocksResult.data?.[0]
      ? { ...blocksResult.data[0], status: 'fresh', source: blocksResult.source }
      : { status: 'unavailable' },
    blocks: blocksResult.data || [],
    mempool: mempool.data
      ? { unconfirmedTxCount: mempool.data.count, status: 'fresh', source: mempool.source }
      : { status: 'unavailable' },
    market: marketConsensus.price
      ? {
          ...marketConsensus.price,
          spreadPct: marketConsensus.spreadPct,
          flag: marketConsensus.flag,
          status: 'fresh',
        }
      : { status: 'unavailable' },
    providers: getHealthSnapshot(),
    updatedAt: new Date().toISOString(),
    generationMs: Date.now() - startedAt,
  };

  sendJson(res, 200, payload);
};
