const { getHealthSnapshot } = require('../lib/providers');
const { sendJson } = require('../lib/utils/envelope');

module.exports = async (req, res) => {
  // Note: within a single warm lambda instance only — a cold start resets
  // this. Real historical uptime would need a durable store, deliberately
  // avoided per the "no database unless necessary" principle.
  const snapshot = getHealthSnapshot();
  sendJson(res, 200, { providers: snapshot, updatedAt: new Date().toISOString() });
};
