const { blockchainProviders } = require('../lib/providers');
const { envelope, sendJson } = require('../lib/utils/envelope');

// Very loose CashAddr / legacy sanity check — real validation happens
// provider-side; this just blocks obviously malformed input before it
// reaches an external API (basic SSRF/abuse hygiene).
const ADDRESS_RE = /^(bitcoincash:)?[a-zA-Z0-9]{25,80}$/;

module.exports = async (req, res) => {
  const address = req.query?.addr;
  if (!address || !ADDRESS_RE.test(address)) {
    return sendJson(res, 400, envelope(null));
  }

  const [balance, utxos] = await Promise.all([
    blockchainProviders.getAddress(address),
    blockchainProviders.getAddressUtxos(address),
  ]);

  if (!balance.data) {
    return sendJson(res, 404, envelope(null));
  }

  sendJson(res, 200, envelope(
    { ...balance.data, utxos: utxos.data || [] },
    { source: balance.source }
  ));
};
