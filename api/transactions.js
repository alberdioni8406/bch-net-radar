const { blockchainProviders } = require('../lib/providers');
const { envelope, sendJson } = require('../lib/utils/envelope');

module.exports = async (req, res) => {
  // Derived from the last ~144 blocks (~24h at 10min average) rather than
  // trusting a single provider's pre-aggregated "24h" statistic, per the
  // "calculate from raw data ourselves where possible" principle.
  const result = await blockchainProviders.getBlocks(144);

  if (!result.data || result.data.length === 0) {
    return sendJson(res, 200, envelope(null));
  }

  const blocks = result.data;
  const txCounts = blocks.map((b) => b.txCount).filter((n) => typeof n === 'number');
  const fees = blocks.map((b) => b.totalFeesSats).filter((n) => typeof n === 'number');

  if (txCounts.length === 0) {
    return sendJson(res, 200, envelope({ note: 'tx counts unavailable from current provider response' }, { source: result.source }));
  }

  const totalTx = txCounts.reduce((a, b) => a + b, 0);
  const avgTxPerBlock = totalTx / txCounts.length;
  const sortedTx = [...txCounts].sort((a, b) => a - b);
  const medianTxPerBlock = sortedTx[Math.floor(sortedTx.length / 2)];

  const payload = {
    sampleBlocks: txCounts.length,
    totalTxInSample: totalTx,
    averageTxPerBlock: Math.round(avgTxPerBlock * 100) / 100,
    medianTxPerBlock,
    totalFeesSatsInSample: fees.length ? fees.reduce((a, b) => a + b, 0) : null,
    averageFeeSatsPerBlock: fees.length ? Math.round(fees.reduce((a, b) => a + b, 0) / fees.length) : null,
  };

  sendJson(res, 200, envelope(payload, { source: result.source }));
};
