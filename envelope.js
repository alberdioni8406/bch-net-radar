function envelope(data, { source, status = 'fresh', ageSeconds = 0 } = {}) {
  return {
    data,
    source: source || null,
    timestamp: new Date().toISOString(),
    ageSeconds,
    status: data === null ? 'unavailable' : status,
  };
}

function sendJson(res, statusCode, body) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=15');
  res.status(statusCode).json(body);
}

module.exports = { envelope, sendJson };
