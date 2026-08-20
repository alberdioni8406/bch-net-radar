/**
 * fetchWithTimeout — wraps fetch() with a hard timeout and JSON parsing.
 * Never throws on HTTP error status; instead returns a normalized result
 * object so callers can classify failures without try/catch sprawl.
 */
async function fetchWithTimeout(url, { timeoutMs = 4000, headers = {}, method = 'GET' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const res = await fetch(url, { method, headers, signal: controller.signal });
    const latencyMs = Date.now() - startedAt;
    const text = await res.text();

    let json = null;
    let parseError = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (e) {
      parseError = e.message;
    }

    return {
      ok: res.ok,
      status: res.status,
      latencyMs,
      json,
      parseError,
      raw: parseError ? text.slice(0, 500) : null,
    };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const isAbort = err.name === 'AbortError';
    return {
      ok: false,
      status: isAbort ? 408 : 0,
      latencyMs,
      json: null,
      parseError: isAbort ? 'timeout' : err.message,
      raw: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchWithTimeout };
