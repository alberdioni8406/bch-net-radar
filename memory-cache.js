/**
 * Simple in-memory TTL cache.
 *
 * IMPORTANT: Vercel serverless functions are stateless between cold starts,
 * so this cache only helps within a warm lambda instance (typically minutes).
 * That's fine here — it exists to avoid hammering providers on bursty
 * traffic within a warm instance, not as a durable store. Every cached
 * value is returned with its age so the frontend can show honest
 * fresh/stale indicators regardless of whether the cache was warm.
 */

const store = new Map();

const TTL = {
  latestBlock: 10_000,
  mempool: 10_000,
  market: 30_000,
  mining: 120_000,
  historical: 15 * 60_000,
  bcmr: 6 * 60 * 60_000,
};

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  const ageMs = Date.now() - entry.storedAt;
  if (ageMs > entry.ttlMs) {
    store.delete(key);
    return null;
  }
  return { value: entry.value, ageMs, ttlMs: entry.ttlMs };
}

function set(key, value, ttlMs) {
  store.set(key, { value, storedAt: Date.now(), ttlMs });
}

// Returns stale data past its TTL for last-resort fallback display,
// distinct from get() which enforces the TTL strictly.
function getStale(key) {
  const entry = store.get(key);
  if (!entry) return null;
  const ageMs = Date.now() - entry.storedAt;
  return { value: entry.value, ageMs, ttlMs: entry.ttlMs };
}

module.exports = { get, set, getStale, TTL };
