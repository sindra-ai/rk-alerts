import { NextResponse } from "next/server";
import { getLatest, getHistory } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const latest = await getLatest();
  const history = await getHistory();
  return NextResponse.json({ latest, history });
}
