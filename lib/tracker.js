/**
 * Tracks per-provider health within a warm lambda instance.
 * Statuses: operational | degraded | unavailable | rate_limited | stale | not_configured
 */

const state = new Map();

function record(providerName, { ok, status, latencyMs, rateLimited = false }) {
  const prev = state.get(providerName) || {
    failureCount: 0,
    lastSuccess: null,
    lastFailure: null,
    lastLatencyMs: null,
  };

  const now = new Date().toISOString();

  if (ok) {
    state.set(providerName, {
      ...prev,
      failureCount: 0,
      lastSuccess: now,
      lastLatencyMs: latencyMs,
      status: 'operational',
    });
  } else {
    state.set(providerName, {
      ...prev,
      failureCount: prev.failureCount + 1,
      lastFailure: now,
      lastLatencyMs: latencyMs,
      status: rateLimited ? 'rate_limited' : (status === 408 ? 'degraded' : 'unavailable'),
    });
  }
}

function markNotConfigured(providerName) {
  state.set(providerName, {
    failureCount: 0,
    lastSuccess: null,
    lastFailure: null,
    lastLatencyMs: null,
    status: 'not_configured',
  });
}

function getAll() {
  const out = {};
  for (const [name, info] of state.entries()) {
    out[name] = info;
  }
  return out;
}

function get(providerName) {
  return state.get(providerName) || { status: 'unavailable', failureCount: 0 };
}

module.exports = { record, markNotConfigured, getAll, get };
