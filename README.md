# BCH Radar

**Bitcoin Cash network observatory** — multi-provider by design, no single point of failure.

Live: [https://bch-net-radar.vercel.app](https://bch-net-radar.vercel.app)

---

## What it does

BCH Radar aggregates real-time Bitcoin Cash network data from multiple independent sources with automatic fallbacks. If one provider goes down or lags, the system keeps serving data from the others.

Current live features:
- Network stats (block height, difficulty, estimated hashrate, mempool)
- Recent blocks + charts (block interval, transactions per block, block size)
- Market data (price + cross-checks)
- Address lookup (read-only)
- Provider health monitoring
- Consensus verification across sources

---

## Architecture

```
Frontend (index.html)
        ↓
api/*.js          ← Vercel serverless functions (maxDuration 10s)
        ↓
lib/providers/    ← Provider abstraction + fallback chains
        ↓
  haskoin.js          (original api.haskoin.com)
  haskoin-mirror      (blockchain.info Haskoin Store)
  blockchair.js
  threexpl.js
  paytaca-bcmr.js
  coinpaprika.js
  coingecko.js
  fx.js
        ↓
lib/health + lib/memory-cache + lib/utils
```

### API routes

| Route              | Description                          |
|--------------------|--------------------------------------|
| `/api/radar`       | Aggregated dashboard endpoint (main) |
| `/api/network`     | Network stats                        |
| `/api/blocks`      | Recent blocks                        |
| `/api/block`       | Single block by height/hash          |
| `/api/mempool`     | Mempool stats                        |
| `/api/mining`      | Difficulty + hashrate estimates      |
| `/api/market`      | Price data                           |
| `/api/address`     | Address lookup                       |
| `/api/transactions`| Transactions                         |
| `/api/txid`        | Single transaction                   |
| `/api/cash-tokens` | CashTokens metadata (BCMR)           |
| `/api/providers`   | Provider health snapshot             |

---

## Data sources & fallbacks

**Blockchain data** (in priority order):
1. Original Haskoin (`api.haskoin.com/bch`) — preferred when healthy
2. Haskoin mirror (`api.blockchain.info/hashkoin-store/bch`) — currently primary
3. 3xpl
4. Blockchair

**Market data**:
- CoinPaprika (primary)
- CoinGecko (cross-check)
- FX rates

**CashTokens**:
- Paytaca BCMR

Every response includes the actual source used. If no provider can answer, the frontend shows `unavailable` — never fabricated numbers.

---

## Design principles

- **No fake data** — if a metric cannot be retrieved, it is explicitly `null` / unavailable
- **Multi-provider by default** — never depends on a single API
- **Consensus awareness** — the `/api/radar` endpoint can report agreement across sources
- **Zero required API keys** for core functionality
- **Transparent health** — the UI shows which providers are responding and their latency

---

## Local development

```bash
npm install -g vercel
vercel dev
```

Optional environment variables (see `.env.example`):

```bash
HASKOIN_MIRROR_URL=          # defaults to blockchain.info mirror
BLOCKCHAIR_API_KEY=          # raises free-tier limits
THREEXPL_API_KEY=            # raises free-tier limits
```

---

## Current status (early public beta)

**Working now**
- Live multi-source network dashboard
- Charts (block interval, txs/block, size)
- Price + cross-checks
- Address lookup
- Provider health panel
- Fallback chains

**Still planned / partial**
- Mining pool distribution
- Full CashTokens activity feed (beyond metadata)
- Longer historical time series
- More polish and edge-case hardening

Feedback and pull requests are very welcome.

---

## Support

BCH Radar is independent community infrastructure.

`bitcoincash:qrtv37u522gz8a5lezfqk5vukly93cu7gc8tn09040`
```