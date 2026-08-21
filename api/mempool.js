const { blockchainProviders } = require('../lib/providers');
const { envelope, sendJson } = require('../lib/utils/envelope');

module.exports = async (req, res) => {
  const detail = await blockchainProviders.getMempoolDetail();

  if (detail.unconfirmedTxCount === null && detail.sizeBytes === null) {
    return sendJson(res, 200, envelope(null));
  }

  sendJson(res, 200, envelope(
    {
      unconfirmedTxCount: detail.unconfirmedTxCount,
      sizeBytes: detail.sizeBytes,
      suggestedFeeSatPerByte: detail.suggestedFeeSatPerByte,
      feeDistribution: 'per-tier distribution unavailable from current providers — suggested fee rate above is the closest real signal',
      countSource: detail.countSource,
      statsSource: detail.statsSource,
    },
    { source: detail.countSource || detail.statsSource }
  ));
};
