// TopStep (ProjectX Gateway) READ-ONLY client.
// Auth = API key + username -> JWT (valid 24h). We only READ: accounts + trades.
// No order placement anywhere. Creds come from Vercel env vars, never hard-coded.

const BASE = "https://api.topstepx.com";

let _token = null;
let _tokenAt = 0;
let _loggedSample = false; // one-time raw-trade log so we can confirm field names

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

// Read a commission value from a raw ProjectX trade, tolerating field-name variants.
// If ProjectX folds commission into fees (or omits it), this returns 0 and the log
// below will tell us which key actually carries it.
function readCommission(t) {
  const v =
    t.commission ??
    t.commissionCost ??
    t.commissions ??
    t.totalCommission ??
    t.commissionFee ??
    0;
  return Number(v) || 0;
}
function readFee(t) {
  const v = t.fees ?? t.fee ?? t.totalFees ?? 0;
  return Number(v) || 0;
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
    const raw = data?.trades || data?.data || [];

    // ONE-TIME diagnostic: dump a full raw trade so we can confirm the exact
    // commission / pnl field names. Remove once verified. Look for it in Vercel logs.
    if (!_loggedSample && raw.length) {
      _loggedSample = true;
      try {
        console.log("RAW_TRADE_SAMPLE", JSON.stringify(raw[0], null, 2));
      } catch {}
    }

    const trades = raw.map((t) => ({
      id: t.id,
      contract: t.contractId || t.contractName || t.contractGroupName,
      tradeDay: t.tradeDay || (t.creationTimestamp || "").slice(0, 10),
      time: t.creationTimestamp || t.enteredAt || t.createdAt,
      enteredAt: t.creationTimestamp || t.enteredAt,
      exitedAt: t.creationTimestamp || t.exitedAt, // round-trip P&L is stamped on the closing half-turn
      price: t.price ?? t.entryPrice,
      pnl: t.profitAndLoss ?? t.pnl, // null = half-turn (entry leg); real value = closed round-trip
      fees: readFee(t),              // per half-turn fee (this leg only)
      commission: readCommission(t), // per half-turn commission (this leg only)
      size: t.size ?? t.lots,
      side: t.side ?? t.action, // 0/1 buy, 1/2 sell depending on env
      voided: t.voided,
    }));
    return { configured: true, trades };
  } catch (e) {
    return { configured: true, error: e.message, trades: [] };
  }
}

// Pair each closing (exit) half-turn with its opening (entry) half-turn(s) so we can
// charge the FULL round-turn cost (both legs' fees + commissions) against the trade's P&L.
//
// ProjectX returns each round-trip as two rows:
//   entry leg  -> pnl == null, carries one leg's fee+commission
//   exit  leg  -> pnl != null, carries the P&L and the other leg's fee+commission
// The UI only shows rows with pnl != null, so without this the entry leg's cost is lost.
//
// Method: walk trades oldest->newest, per contract keep a FIFO queue of open entry legs
// (with remaining size). When an exit leg lands, consume matching size from the queue and
// add the proportional entry-leg cost. Result is written back onto each exit trade as:
//   roundFee, roundCommission, netPnl (= pnl - roundFee - roundCommission).
function attachRoundTurnCosts(trades) {
  const byContract = new Map(); // contract -> FIFO queue of open entry legs

  // oldest first so entries are seen before their exits
  const ordered = [...trades].sort(
    (a, b) => new Date(a.time || 0) - new Date(b.time || 0)
  );

  for (const t of ordered) {
    const key = t.contract || "?";
    if (!byContract.has(key)) byContract.set(key, []);
    const q = byContract.get(key);
    const size = Math.abs(Number(t.size) || 0) || 1;

    if (t.pnl == null) {
      // entry (opening) half-turn — remember its cost, keyed by size
      q.push({
        fee: Number(t.fees) || 0,
        commission: Number(t.commission) || 0,
        size,        // original size
        left: size,  // remaining size to be matched
      });
      continue;
    }

    // exit (closing) half-turn — start with this leg's own cost, then pull the entry side
    let need = size;
    let feeAcc = Number(t.fees) || 0;
    let commAcc = Number(t.commission) || 0;

    while (need > 0 && q.length) {
      const e = q[0];
      const take = Math.min(need, e.left);
      const frac = e.size ? take / e.size : 1;
      feeAcc += e.fee * frac;
      commAcc += e.commission * frac;
      e.left -= take;
      need -= take;
      if (e.left <= 1e-9) q.shift();
    }

    const roundFee = round2(feeAcc);
    const roundCommission = round2(commAcc);
    t.roundFee = roundFee;
    t.roundCommission = roundCommission;
    t.netPnl = round2(Number(t.pnl) - roundFee - roundCommission);
  }

  return trades;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

// Pull up to `days` of trades, paging in 30-day windows (API limit),
// then attach full round-turn costs + netPnl.
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
  attachRoundTurnCosts(out);
  return { configured: true, trades: out };
}

export { configured as topstepConfigured };
