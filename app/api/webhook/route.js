import { NextResponse } from "next/server";
import { saveSignal } from "../../../lib/store";
import { sendEmail } from "../../../lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STEP_KEYS = ["sweep", "pdaTap", "extSMT", "intSMT", "entryModel", "target"];

// A signal is only "live-worthy" if it's a genuine complete A* setup:
// all 6 steps true, grade A, a direction, and a numeric entry.
function isCompleteAstar(b) {
  if (!b || typeof b !== "object") return false;
  if ((b.grade || "").toUpperCase() !== "A") return false;
  if (!b.direction) return false;
  if (b.entry == null || isNaN(Number(b.entry))) return false;
  const steps = b.steps || {};
  return STEP_KEYS.every((k) => steps[k] === true);
}

// EMA 9/21 crossover: no steps, no grade — it needs a complete trade
// plan and geometry pointing the right way. A long with the stop above
// entry means the Pine snippet is miscalculating, and it should be
// rejected rather than drawn as a nonsense card.
function isValidEma(b) {
  if (!b || b.strategy !== "ema") return false;
  const { direction, entry, sl, tp } = b;
  if (!direction || entry == null || sl == null || tp == null) return false;
  const e = Number(entry), s = Number(sl), t = Number(tp);
  if ([e, s, t].some(isNaN)) return false;
  return direction.toUpperCase() === "LONG" ? s < e && t > e : s > e && t < e;
}

// TradingView cannot send custom auth headers, so the shared secret rides in
// the URL: .../api/webhook?token=YOUR_TOKEN  (keep that URL private).
export async function POST(req) {
  try {
    return await handle(req);
  } catch (e) {
    // Never 500 at TradingView — it retries and floods the log.
    console.error("[webhook]", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 200 });
  }
}

async function handle(req) {
  const token = req.nextUrl.searchParams.get("token");
  if (process.env.WEBHOOK_TOKEN && token !== process.env.WEBHOOK_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Read the body ONCE. Calling req.json() first consumes the stream, so a
  // following req.text() throws "Body has already been read" — which is an
  // unhandled exception, i.e. a 500 on every plain-text alert.
  let raw = "";
  try {
    raw = await req.text();
  } catch {
    raw = "";
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    body = { raw };
  }

  // Gate: a complete A* setup, or a well-formed EMA crossover. Anything
  // partial or malformed is acknowledged but NOT shown on the dashboard
  // (prevents phantom setups from a premature or misconfigured alert).
  const astar = isCompleteAstar(body);
  const ema = isValidEma(body);

  if (!astar && !ema) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason:
        body?.strategy === "ema"
          ? "EMA signal missing entry/sl/tp, or stop and target are inverted"
          : "not a complete A* setup",
    });
  }

  const rr =
    body.rr ??
    (ema
      ? +(Math.abs(Number(body.tp) - Number(body.entry)) /
          Math.abs(Number(body.entry) - Number(body.sl))).toFixed(1)
      : undefined);

  const sig = {
    ...body,
    strategy: ema ? "ema" : "astar",
    grade: ema ? body.grade || "—" : "A",
    ...(rr != null ? { rr } : {}),
    id: Date.now(),
    receivedAt: new Date().toISOString(),
  };

  await saveSignal(sig);

  // Email stays on A* only — EMA fires far more often and would flood
  // the inbox. Drop the condition if you want both.
  if (astar) await sendEmail(sig);

  return NextResponse.json({ ok: true, id: sig.id, strategy: sig.strategy });
}

// Handy for a quick browser check that the endpoint is alive.
export async function GET() {
  return NextResponse.json({ ok: true, service: "rk-alerts webhook" });
}
