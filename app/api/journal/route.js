import { NextResponse } from "next/server";
import { listAccounts, recentTrades, topstepConfigured } from "../../../lib/topstep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/topstep            -> { configured, accounts }
// GET /api/topstep?accountId=X&days=60 -> { configured, trades }
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const days = Number(searchParams.get("days") || 60);

  if (!topstepConfigured()) {
    return NextResponse.json({ configured: false, accounts: [], trades: [] });
  }
  if (accountId) {
    const r = await recentTrades(Number(accountId), days);
    return NextResponse.json(r);
  }
  const r = await listAccounts();
  return NextResponse.json(r);
}
