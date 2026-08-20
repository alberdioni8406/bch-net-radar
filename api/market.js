const { marketProviders } = require('../lib/providers');
const { envelope, sendJson } = require('../lib/utils/envelope');

module.exports = async (req, res) => {
  const [consensus, fx] = await Promise.all([
    marketProviders.getMarketConsensus(),
    marketProviders.getFxRates(),
  ]);

  if (!consensus.price) {
    return sendJson(res, 200, envelope(null));
  }

  const priceUsd = consensus.price.priceUsd;
  const rates = fx.data?.rates || null;

  sendJson(res, 200, envelope(
    {
      ...consensus.price,
      primarySource: consensus.primarySource,
      secondarySource: consensus.secondarySource,
      spreadPct: consensus.spreadPct,
      flag: consensus.flag,
      localPrices: rates
        ? {
            usd: priceUsd,
            eur: rates.EUR ? priceUsd * rates.EUR : null,
            gbp: rates.GBP ? priceUsd * rates.GBP : null,
            mzn: rates.MZN ? priceUsd * rates.MZN : null,
          }
        : { note: 'FX rates unavailable — only USD price shown' },
    },
    { source: consensus.primarySource }
  ));
};
