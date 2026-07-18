import { NextResponse } from "next/server";
import { listJournal, addJournal, updateJournal, deleteJournal, seedIfEmpty } from "../../../lib/journal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEED = [
  {
    source: "manual", model: "Manual", pair: "NQ1!", direction: "LONG", session: "NY_AM",
    sweptLevel: "London low", rr: 2, taken: true, outcome: "win", rResult: 2,
    tradedAt: "2026-07-17", notes: "Own read — took the 1:2. Verify entry/SL/TP.",
  },
  {
    source: "manual", model: "Manual", pair: "NQ1!", direction: "LONG", session: "NY_AM",
    sweptLevel: "London low", rr: 2, taken: true, outcome: "win", rResult: 2,
    tradedAt: "2026-07-17", notes: "With friend — 1:2 win off own read.",
  },
  {
    source: "tool", model: "Phase 4", pair: "ES1!", direction: "LONG", session: "NY_PM",
    sweptLevel: "swing low", entry: 7513.75, sl: 7508.25, tp: 7524.75, rr: 2,
    taken: true, outcome: "loss", rResult: -1, tradedAt: "2026-07-17",
    notes: "Tool-fired. Internal SMT did not hold — stopped, price went short.",
  },
];

export async function GET() {
  await seedIfEmpty(SEED);
  const trades = await listJournal();
  return NextResponse.json({ trades });
}
export async function POST(req) {
  const body = await req.json();
  const entry = await addJournal(body);
  return NextResponse.json({ ok: true, entry });
}
export async function PATCH(req) {
  const { id, patch } = await req.json();
  const entry = await updateJournal(id, patch || {});
  return NextResponse.json({ ok: true, entry });
}
export async function DELETE(req) {
  const { id } = await req.json();
  await deleteJournal(id);
  return NextResponse.json({ ok: true });
}
