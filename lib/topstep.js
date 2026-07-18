// TopStep (ProjectX Gateway) READ-ONLY client.
// Auth = API key + username -> JWT (valid 24h). We only READ: accounts + trades.
// No order placement anywhere. Creds come from Vercel env vars, never hard-coded.

const BASE = "https://api.topstepx.com";

let _token = null;
let _tokenAt = 0;

function configured() {
  return !!(process.env.TOPSTEP_API_KEY && process.env.TOPSTEP_USERNAME);
}

async function getToken() {
  // reuse token for 23h
  if (_token && Date.now() - _tokenAt < 23 * 3600 * 1000) return _token;
  const res = await fetch(`${BASE}/api/Auth/loginKey`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "text/plain" },
    body: JSON.stringify({ userName: process.env.TOPSTEP_USERNAME, apiKey: process.env.TOPSTEP_API_KEY }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data || data.success === false || !data.token) {
    throw new Error(`TopStep auth failed: ${data?.errorMessage || res.status}`);
  }
  _token = data.token;
  _tokenAt = Date.now();
  return _token;
}

async function authed(path, body) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "text/plain", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body || {}),
  });
  if (res.status === 401) {
    // token expired mid-flight — clear and retry once
    _token = null;
    const t2 = await getToken();
    const r2 = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "text/plain", Authorization: `Bearer ${t2}` },
      body: JSON.stringify(body || {}),
    });
    return r2.json();
  }
  return res.json();
}

// List the user's linked accounts (all evals). Returns [{id, name, balance, ...}].
export async function listAccounts() {
  if (!configured()) return { configured: false, accounts: [] };
  try {
    const data = await authed("/api/Account/search", { onlyActiveAccounts: true });
    const accounts = (data?.accounts || []).map((a) => ({
      id: a.id,
      name: a.name,
      balance: a.balance,
      canTrade: a.canTrade,
      simulated: a.simulated,
    }));
    return { configured: true, accounts };
  } catch (e) {
    return { configured: true, error: e.message, accounts: [] };
  }
}

// Search trades for one account within a date range (API max 30 days per call).
export async function searchTrades(accountId, fromISO, toISO) {
  if (!configured()) return { configured: false, trades: [] };
  try {
    const data = await authed("/api/Trade/search", {
      accountId,
      startTimestamp: fromISO,
      endTimestamp: toISO,
    });
    const trades = (data?.trades || data?.data || []).map((t) => ({
      id: t.id,
      contract: t.contractName || t.contractGroupName,
      tradeDay: t.tradeDay,
      enteredAt: t.enteredAt || t.createdAt,
      exitedAt: t.exitedAt,
      entryPrice: t.entryPrice ?? t.price,
      exitPrice: t.exitPrice,
      pnl: t.pnl,
      fees: t.fees,
      lots: t.lots,
      action: t.action, // 1 buy / 2 sell (per docs)
    }));
    return { configured: true, trades };
  } catch (e) {
    return { configured: true, error: e.message, trades: [] };
  }
}

// Pull up to `days` of trades, paging in 30-day windows (API limit).
export async function recentTrades(accountId, days = 60) {
  if (!configured()) return { configured: false, trades: [] };
  const now = new Date();
  const out = [];
  let end = new Date(now);
  let remaining = days;
  let guard = 0;
  while (remaining > 0 && guard < 6) {
    const span = Math.min(30, remaining);
    const start = new Date(end);
    start.setDate(start.getDate() - span);
    const r = await searchTrades(accountId, start.toISOString(), end.toISOString());
    if (r.error) return r;
    out.push(...(r.trades || []));
    end = start;
    remaining -= span;
    guard++;
  }
  return { configured: true, trades: out };
}

export { configured as topstepConfigured };
