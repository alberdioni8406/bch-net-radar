const { blockchainProviders } = require('../lib/providers');
const { envelope, sendJson } = require('../lib/utils/envelope');

module.exports = async (req, res) => {
  const result = await blockchainProviders.getMempool();

  if (!result.data) {
    return sendJson(res, 200, envelope(null));
  }

  // Haskoin's /mempool only exposes txids, not fee-rate breakdowns —
  // we surface exactly that and label the rest honestly rather than
  // inventing a fee-distribution chart with no backing data.
  sendJson(res, 200, envelope(
    {
      unconfirmedTxCount: result.data.count,
      feeDistribution: 'unavailable from current providers',
    },
    { source: result.source }
  ));
};
