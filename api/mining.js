const { blockchainProviders, marketProviders } = require('../lib/providers');
const { envelope, sendJson } = require('../lib/utils/envelope');

const TARGET_BLOCK_SECONDS = 600;

// hashrate estimate (H/s) from difficulty, using the standard SHA256
// relation: hashrate = difficulty * 2^32 / target_block_time.
// This is a network-wide estimate, not a measured value — labeled as such.
function estimateHashrate(difficulty) {
  if (!difficulty) return null;
  return (difficulty * Math.pow(2, 32)) / TARGET_BLOCK_SECONDS;
}

module.exports = async (req, res) => {
  const [latest, market] = await Promise.all([
    blockchainProviders.getLatestBlock(),
    marketProviders.getPrimaryMarketData(),
  ]);

  if (!latest.data) {
    return sendJson(res, 200, envelope(null));
  }

  const b = latest.data;
  const hashrateEstimate = estimateHashrate(b.difficulty);

  sendJson(res, 200, envelope(
    {
      blockHeight: b.height,
      difficulty: b.difficulty,
      estimatedHashrateHs: hashrateEstimate,
      estimatedHashrateLabel: hashrateEstimate
        ? `${(hashrateEstimate / 1e18).toFixed(2)} EH/s (estimated from difficulty)`
        : null,
      lastBlockSubsidySats: b.subsidySats ?? null,
      lastBlockFeesSats: b.totalFeesSats ?? null,
      bchPriceUsd: market.data?.priceUsd ?? null,
      note: 'Hashrate is estimated from difficulty, not directly measured. Cross-check pool-share data is not yet wired to a live provider — profitability calculations should be treated as estimates.',
    },
    { source: latest.source }
  ));
};
