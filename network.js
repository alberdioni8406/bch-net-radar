const { blockchainProviders } = require('../lib/providers');
const { envelope, sendJson } = require('../lib/utils/envelope');

module.exports = async (req, res) => {
  const [stats, consensus] = await Promise.all([
    blockchainProviders.getNetworkStats(),
    blockchainProviders.getLatestBlockConsensus(),
  ]);

  sendJson(res, 200, envelope(
    stats.data ? { ...stats.data, consensus: consensus.consensus, consensusResults: consensus.results } : null,
    { source: stats.source }
  ));
};
