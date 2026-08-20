const { blockchainProviders } = require('../../lib/providers');
const { envelope, sendJson } = require('../../lib/utils/envelope');

module.exports = async (req, res) => {
  const { txid } = req.query;
  if (!txid) return sendJson(res, 400, envelope(null));

  const result = await blockchainProviders.getTransaction(txid);
  sendJson(res, result.data ? 200 : 404, envelope(result.data, { source: result.source }));
};
