import { NextResponse } from "next/server";
import { listJournal, addJournal, updateJournal, deleteJournal, clearJournal } from "../../../lib/journal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Journal starts empty and only ever contains trades you add. No auto-seed.
export async function GET() {
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
  const { id, all } = await req.json();
  if (all) {
    await clearJournal();
    return NextResponse.json({ ok: true, cleared: true });
  }
  await deleteJournal(id);
  return NextResponse.json({ ok: true });
}
