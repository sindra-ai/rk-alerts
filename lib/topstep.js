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
  const raw = await res.text().catch(() => "");
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
  if (!data || data.success === false || !data.token) {
    throw new Error(`TopStep auth failed: ${data?.errorMessage || res.status}`);
  }
  _token = data.token;
  _tokenAt = Date.now();
  return _token;
}

async function safeJson(res) {
  // TopStep occasionally returns an empty body; res.json() would throw
  // "Unexpected end of JSON input". Parse defensively instead.
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function authed(path, body) {
  let token = await getToken();
  let res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "text/plain", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body || {}),
  });
  let data = res.ok ? await safeJson(res) : null;

  // Retry once if unauthorized OR the body came back empty/unparseable
  // (a stale token often yields an empty body rather than a clean 401).
  if (res.status === 401 || data == null) {
    _token = null;
    token = await getToken();
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "text/plain", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body || {}),
    });
    data = await safeJson(res);
  }
  return data || {};
}

// List the user's linked accounts (all evals). Returns [{id, name, balance, ...}].
export async function listAccounts() {
  if (!configured()) return { configured: false, accounts: [] };
  try {
    const data = await authed("/api/Account/search", { onlyActiveAccounts: true });
    const all = (data?.accounts || []).map((a) => ({
      id: a.id,
      name: a.name,
      balance: a.balance,
      canTrade: a.canTrade,
      simulated: a.simulated,
    }));
    // keep only the whitelisted accounts (match digits anywhere in id or name)
    const KEEP = ["60374087", "80064800", "41657198", "69658236", "88630208"];
    const hay = (a) => `${a.id} ${a.name || ""}`.toLowerCase();
    const picked = all.filter((a) => KEEP.some((s) => hay(a).includes(s)));
    const accounts = picked.length ? picked : all;
    return { configured: true, accounts };
  } catch (e) {
    return { configured: true, error: e.message, accounts: [] };
  }
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Pair half-turns into closed round-trips (FIFO per contract) and compute NET P&L.
// netPnl = profitAndLoss - (entryFee + exitFee) - (entryCommission + exitCommission)
// Entry legs (pnl == null) feed a per-contract FIFO queue; exit legs consume matching
// size (proportional for partial fills) and absorb the entry leg's fees + commissions.
export function pairLegs(raw) {
  const legs = (raw || [])
    .filter((l) => !l.voided)
    .sort((a, b) => new Date(a.time) - new Date(b.time));
  const queues = {}; // contract -> [{ size, fee, comm }] of open entry legs
  const closed = [];
  for (const l of legs) {
    const c = l.contract || "?";
    const q = (queues[c] = queues[c] || []);
    if (l.pnl == null) {
      // ENTRY half-turn -> queue its remaining size + this leg's fee/commission
      q.push({ size: l.size || 0, fee: l.fees || 0, comm: l.commissions || 0 });
      continue;
    }
    // EXIT half-turn -> consume matching size from the FIFO queue
    let need = l.size || 0;
    let entryFee = 0;
    let entryComm = 0;
    while (need > 1e-9 && q.length) {
      const e = q[0];
      const take = Math.min(need, e.size);
      const frac = e.size > 0 ? take / e.size : 1;
      const fPart = e.fee * frac;
      const cPart = e.comm * frac;
      entryFee += fPart;
      entryComm += cPart;
      e.fee -= fPart;
      e.comm -= cPart;
      e.size -= take;
      need -= take;
      if (e.size <= 1e-9) q.shift();
    }
    const exitFee = l.fees || 0;
    const exitComm = l.commissions || 0;
    const gross = Number(l.pnl) || 0;
    const netPnl = round2(gross - (entryFee + exitFee) - (entryComm + exitComm));
    closed.push({
      id: l.id,
      contract: c,
      time: l.time,
      exitedAt: l.time,
      enteredAt: l.time,
      price: l.price,
      size: l.size,
      side: l.side,
      voided: false,
      gross: round2(gross),
      fees: round2(entryFee + exitFee),
      commissions: round2(entryComm + exitComm),
      pnl: netPnl, // NET — all dashboard stats compute on this
    });
  }
  return closed;
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
      contract: t.contractId || t.contractName || t.contractGroupName,
      time: t.creationTimestamp || t.enteredAt || t.createdAt,
      price: t.price ?? t.entryPrice,
      pnl: t.profitAndLoss ?? null,           // null on ENTRY half-turn; number on EXIT half-turn
      fees: Number(t.fees) || 0,              // this leg only
      commissions: Number(t.commissions ?? t.commission) || 0, // this leg only
      size: Number(t.size ?? t.lots) || 0,
      side: t.side ?? t.action,
      voided: !!t.voided,
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
  // Pair across the whole collected window (a round-trip can straddle 30-day pages).
  return { configured: true, trades: pairLegs(out) };
}

export { configured as topstepConfigured };
