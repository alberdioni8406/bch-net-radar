const { blockchainProviders } = require('../lib/providers');
const { envelope, sendJson } = require('../lib/utils/envelope');

function computeIntervals(blocks) {
  // blocks expected newest-first
  const sorted = [...blocks].sort((a, b) => b.height - a.height);
  const intervals = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const t1 = sorted[i].timestamp ? new Date(sorted[i].timestamp).getTime() : null;
    const t2 = sorted[i + 1].timestamp ? new Date(sorted[i + 1].timestamp).getTime() : null;
    if (t1 && t2) intervals.push((t1 - t2) / 1000);
  }
  if (intervals.length === 0) return null;
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return {
    latestIntervalSeconds: intervals[0] ?? null,
    averageIntervalSeconds: Math.round(avg),
    sampleSize: intervals.length,
  };
}

module.exports = async (req, res) => {
  const limit = Math.min(parseInt(req.query?.limit, 10) || 20, 100);
  const result = await blockchainProviders.getBlocks(limit);

  if (!result.data) {
    return sendJson(res, 200, envelope(null));
  }

  const intervals = computeIntervals(result.data);
  sendJson(res, 200, envelope({ blocks: result.data, intervals }, { source: result.source }));
};
