const { tokenProviders } = require('../lib/providers');
const { envelope, sendJson } = require('../lib/utils/envelope');

module.exports = async (req, res) => {
  const category = req.query?.category;
  if (!category) {
    return sendJson(res, 200, envelope(
      { note: 'Pass ?category=<token-category-id> to look up CashToken metadata via the BCMR registry.' }
    ));
  }

  const result = await tokenProviders.getTokenMetadata(category);
  sendJson(res, result.data ? 200 : 404, envelope(result.data, { source: result.source }));
};
