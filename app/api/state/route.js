import { NextResponse } from "next/server";
import { getLatest, getHistory } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A live signal is only "active" for this long. After it, the dashboard falls
// back to "No signal" instead of showing a stale/ghost setup indefinitely.
const SIGNAL_TTL_MS = 90 * 60 * 1000; // 90 minutes

function fresh(sig) {
  if (!sig) return null;
  const ts = sig.receivedAt ? Date.parse(sig.receivedAt) : (sig.id || 0);
  if (!ts || isNaN(ts)) return sig; // no timestamp -> don't hide it
  return Date.now() - ts <= SIGNAL_TTL_MS ? sig : null;
}

export async function GET() {
  const latest = fresh(await getLatest());
  const history = await getHistory();
  return NextResponse.json({ latest, history });
}
