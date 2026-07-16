"use client";

import { useEffect, useRef, useState } from "react";

const C = {
  bg: "#0A0C10",
  panel: "#12161C",
  line: "#1E242E",
  text: "#E6EAF0",
  muted: "#7A8494",
  dim: "#4B5563",
  long: "#3ECF8E",
  short: "#F0616D",
  watch: "#E0A82E",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const STEPS = [
  ["sweep", "Liquidity sweep"],
  ["pdaTap", "PDA tap"],
  ["extSMT", "External SMT"],
];

export default function Page() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [notif, setNotif] = useState("default");
  const lastId = useRef(null);

  useEffect(() => {
    if ("Notification" in window) setNotif(Notification.permission);
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch("/api/state", { cache: "no-store" });
        const d = await r.json();
        if (!alive) return;
        setConnected(true);
        setLatest(d.latest || null);
        setHistory(d.history || []);
        if (d.latest && d.latest.id !== lastId.current) {
          if (lastId.current !== null) fireDesktop(d.latest);
          lastId.current = d.latest.id;
        }
      } catch {
        if (alive) setConnected(false);
      }
    };
    poll();
    const t = setInterval(poll, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  function fireDesktop(sig) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const dir = sig.direction || "Setup";
    const pair = sig.strongPair || sig.symbol || "";
    new Notification(`RK ${sig.grade || "A"}\u2605 ${dir} ${pair}`, {
      body: `Swept ${sig.sweptLevel || "\u2014"} \u00b7 ${sig.session || ""}`,
    });
  }

  async function askNotif() {
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setNotif(p);
  }

  const dir = latest?.direction;
  const accent = dir === "SHORT" ? C.short : dir === "LONG" ? C.long : C.watch;
  const complete = latest ? STEPS.every(([k]) => latest.steps?.[k]) : false;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: C.sans,
        padding: "clamp(16px, 4vw, 40px)",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}
        *{box-sizing:border-box} a{color:inherit}
        @media (prefers-reduced-motion: reduce){.pulse{animation:none!important}}`}</style>

      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: C.mono, fontSize: 13, letterSpacing: ".22em", color: C.muted }}>
            RK&nbsp;A&#9733;
          </div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>NQ / ES setup monitor</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: C.mono, fontSize: 12, color: C.muted }}>
          <span style={{ width: 8, height: 8, borderRadius: 8, background: connected ? C.long : C.short }} />
          {connected ? "connected" : "offline"}
        </div>
      </header>

      {/* Verdict card — the hero */}
      <section
        style={{
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 16,
          padding: "clamp(20px, 5vw, 32px)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, borderTop: `2px solid ${accent}`, opacity: 0.9 }} />
        {latest ? (
          <>
            <div style={{ fontFamily: C.mono, fontSize: 12, letterSpacing: ".14em", color: C.muted, textTransform: "uppercase" }}>
              {complete ? "Setup ready" : "Forming"}{" \u00b7 "}{latest.session || "\u2014"}
            </div>
            <div
              className={complete ? "pulse" : ""}
              style={{
                fontFamily: C.mono,
                fontSize: "clamp(34px, 9vw, 56px)",
                fontWeight: 700,
                lineHeight: 1.05,
                color: accent,
                margin: "8px 0 4px",
                animation: complete ? "pulse 1.8s ease-in-out infinite" : "none",
              }}
            >
              {dir || "WATCHING"} {latest.strongPair || latest.symbol || ""}
            </div>
            <div style={{ fontFamily: C.mono, fontSize: 14, color: C.muted }}>
              swept {latest.sweptLevel || "\u2014"}
              {latest.sweptPrice ? ` @ ${latest.sweptPrice}` : ""}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: C.mono, fontSize: 12, letterSpacing: ".14em", color: C.muted, textTransform: "uppercase" }}>
              Standing by
            </div>
            <div style={{ fontFamily: C.mono, fontSize: "clamp(28px, 7vw, 44px)", fontWeight: 700, color: C.dim, margin: "8px 0 4px" }}>
              No signal yet
            </div>
            <div style={{ fontSize: 14, color: C.muted }}>
              Waiting for the first alert from TradingView. Fire a test alert to confirm the connection.
            </div>
          </>
        )}
      </section>

      {/* Step ledger */}
      <section style={{ marginTop: 20 }}>
        {STEPS.map(([key, label], i) => {
          const done = latest?.steps?.[key];
          return (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                background: C.panel,
                border: `1px solid ${C.line}`,
                borderTop: i === 0 ? `1px solid ${C.line}` : "none",
                borderRadius: i === 0 ? "12px 12px 0 0" : i === STEPS.length - 1 ? "0 0 12px 12px" : 0,
              }}
            >
              <span style={{ fontFamily: C.mono, fontSize: 12, color: C.dim, width: 18 }}>{i + 1}</span>
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 13,
                  color: done ? C.bg : C.dim,
                  background: done ? C.long : "transparent",
                  border: done ? "none" : `1px solid ${C.line}`,
                }}
              >
                {done ? "\u2714" : ""}
              </span>
              <span style={{ fontSize: 15, color: done ? C.text : C.muted }}>{label}</span>
            </div>
          );
        })}
      </section>

      {/* Notification permission */}
      {notif !== "granted" && (
        <button
          onClick={askNotif}
          style={{
            marginTop: 18,
            width: "100%",
            padding: "12px 16px",
            background: "transparent",
            color: C.text,
            border: `1px solid ${C.line}`,
            borderRadius: 10,
            fontFamily: C.mono,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Turn on desktop notifications
        </button>
      )}

      {/* Recent */}
      {history.length > 1 && (
        <section style={{ marginTop: 28 }}>
          <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: ".16em", color: C.dim, textTransform: "uppercase", marginBottom: 10 }}>
            Recent
          </div>
          {history.slice(0, 8).map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: C.mono,
                fontSize: 13,
                padding: "8px 0",
                borderBottom: `1px solid ${C.line}`,
                color: C.muted,
              }}
            >
              <span style={{ color: s.direction === "SHORT" ? C.short : C.long }}>
                {s.direction} {s.strongPair || s.symbol}
              </span>
              <span>{s.session}</span>
              <span style={{ color: C.dim }}>
                {s.receivedAt ? new Date(s.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
              </span>
            </div>
          ))}
        </section>
      )}

      <footer style={{ marginTop: 32, fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
        Signals are detection aids, not trade instructions. Confirm on your chart before acting.
      </footer>
    </main>
  );
}
