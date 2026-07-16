import { NextResponse } from "next/server";
import { saveSignal } from "../../../lib/store";
import { sendEmail } from "../../../lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TradingView cannot send custom auth headers, so the shared secret rides in
// the URL: .../api/webhook?token=YOUR_TOKEN  (keep that URL private).
export async function POST(req) {
  const token = req.nextUrl.searchParams.get("token");
  if (process.env.WEBHOOK_TOKEN && token !== process.env.WEBHOOK_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // TradingView sends JSON when the alert message is valid JSON; otherwise text.
  let body;
  try {
    body = await req.json();
  } catch {
    const text = await req.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }

  const sig = {
    ...body,
    grade: body.grade || "A",
    id: Date.now(),
    receivedAt: new Date().toISOString(),
  };

  await saveSignal(sig);
  await sendEmail(sig);

  return NextResponse.json({ ok: true, id: sig.id });
}

// Handy for a quick browser check that the endpoint is alive.
export async function GET() {
  return NextResponse.json({ ok: true, service: "rk-alerts webhook" });
}
