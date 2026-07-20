import { Resend } from "resend";

// Sends the alert email. No-ops (with a log) if RESEND_API_KEY isn't set,
// so a missing key never crashes the webhook.
export async function sendEmail(sig) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL;
  if (!key || !to) {
    console.error("[email] missing RESEND_API_KEY or ALERT_EMAIL — skipping send");
    return;
  }
  const from = process.env.ALERT_FROM || "RK Alerts <onboarding@resend.dev>";
  const resend = new Resend(key);

  const dir = sig.direction || "";
  const pair = sig.symbol || sig.strongPair || "";
  const grade = sig.grade ? `${sig.grade}\u2605` : "Setup";
  const subject = `${grade} \u2014 ${dir} ${pair} \u2014 ${sig.session || ""}`.replace(/\s+/g, " ").trim();

  const steps = sig.steps || {};
  const row = (label, done) =>
    `<tr><td style="padding:4px 12px 4px 0;color:${done ? "#3ECF8E" : "#5B6472"}">${done ? "\u2714" : "\u25CB"}</td><td style="padding:4px 0;color:#C7CEDA">${label}</td></tr>`;

  const html = `
  <div style="font-family:ui-monospace,Menlo,monospace;background:#0E1116;color:#E6EAF0;padding:24px;border-radius:12px;max-width:460px">
    <div style="font-size:12px;letter-spacing:.14em;color:#7A8494;text-transform:uppercase">RK A&#42; \u2014 ${sig.session || "signal"}</div>
    <div style="font-size:26px;font-weight:700;margin:6px 0 2px;color:${dir === "SHORT" ? "#F0616D" : "#3ECF8E"}">${dir} ${pair}</div>
    <div style="font-size:13px;color:#9AA4B2;margin-bottom:16px">Swept ${sig.sweptLevel || "\u2014"}${sig.sweptPrice ? " @ " + sig.sweptPrice : ""}</div>
    <table style="font-size:14px;border-collapse:collapse">
      ${row("Liquidity sweep", steps.sweep)}
      ${row("PDA tap", steps.pdaTap)}
      ${row("External SMT", steps.extSMT)}
    </table>
    <div style="font-size:11px;color:#5B6472;margin-top:18px">Detected ${sig.receivedAt || ""}. Confirm on your chart before acting \u2014 this is a signal, not a trade instruction.</div>
  </div>`;

  try {
    await resend.emails.send({ from, to, subject, html });
    console.log("[email] sent:", subject);
  } catch (e) {
    console.error("[email] send failed:", e.message);
  }
}
