# BCH Radar

Bitcoin Cash network observatory. Multi-provider by design — never depends on
Haskoin alone.

## Architecture

```
Frontend (public/index.html)
   ↓
api/*.js  (12 Vercel serverless functions, hard cap)
   ↓
lib/providers  (provider abstraction + fallback chains)
   ↓
lib/providers/{haskoin,blockchair,threexpl,paytaca-bcmr,coinpaprika,coingecko,fx}.js
   ↓
lib/health + lib/cache
```

## API routes (12/12)

`network` · `blocks` · `block/[height]` · `transactions` · `tx/[txid]` ·
`address` · `mempool` · `mining` · `cash-tokens` · `market` · `providers` ·
`radar` (aggregated dashboard endpoint)

## Haskoin status

The original `api.haskoin.com/bch` instance is kept as the **first** entry
in every blockchain fallback chain (`lib/providers/index.js`). It is
currently resyncing and will fail health checks until it recovers — no code
change is needed when it comes back; it will simply start winning the
fallback race again.

The blockchain.info-hosted mirror (`HASKOIN_MIRROR_URL`, defaults to
`https://api.blockchain.info/hashkoin-store/bch`) is the second entry,
serving as the active source in the meantime.

## No fake data

Every route returns `{ data, source, timestamp, ageSeconds, status }`. If a
metric can't be retrieved from any provider, `data` is `null` and the
frontend renders "unavailable" — never a placeholder number.

## Setup

```bash
npm install -g vercel
vercel dev
```

All core providers work with zero API keys. See `.env.example` for optional
keys that raise rate limits.

## Not yet wired (do before calling this "done")

- Live verification of every provider endpoint against current real
  responses (this scaffold was built from provider documentation — the
  code has never made a real network call yet; test against Vercel/local
  dev before trusting it)
- Mining pool distribution (MiningPoolStats/2Miners/Minerstat — none
  integrated yet, `mining` panel currently only covers difficulty-derived
  hashrate + last-block subsidy/fees)
- CashTokens *activity* feed (BCMR gives metadata by category; token
  transaction/activity tracking needs a Fulcrum or 3xpl indexer query,
  not yet built)
- Charts (frontend currently tables + hero metrics only)
- Historical block-size/fee time series beyond the last ~144 blocks
