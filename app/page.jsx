"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ---------- tokens ---------- */
const C = {
  ink: "#EAF0F7",
  muted: "#8A96A8",
  faint: "#5A6474",
  long: "#34E5A0",
  short: "#FF5C72",
  gold: "#F2C14E",
  violet: "#6E7BFF",
};
const F = {
  display: "'Space Grotesk', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};
const STEPS = [
  ["sweep", "Liquidity sweep"],
  ["pdaTap", "PDA tap"],
  ["extSMT", "External SMT"],
  ["intSMT", "Internal SMT"],
  ["entryModel", "Entry model"],
  ["target", "Target \u2265 1:2"],
];
const MODELS = ["Manual", "Phase 4", "Phase 3", "Phase 2.1", "Phase 2", "Phase 1"];

/* ---------- helpers ---------- */
async function jGet() {
  const r = await fetch("/api/journal", { cache: "no-store" });
  return (await r.json()).trades || [];
}
async function jPost(entry) {
  await fetch("/api/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry) });
}
async function jPatch(id, patch) {
  await fetch("/api/journal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, patch }) });
}
async function jDelete(id) {
  await fetch("/api/journal", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
}

export default function Page() {
  const [tab, setTab] = useState("live");
  return (
    <main style={{ minHeight: "100vh", fontFamily: F.body, color: C.ink, position: "relative", overflowX: "hidden" }}>
      <Style />
      <Ambient />
      <div className="wrap">
        <TopBar tab={tab} setTab={setTab} />
        {tab === "live" ? <Live /> : <Journal />}
        <footer className="foot">Signals are detection aids, not trade instructions. Confirm on your chart before acting. · rkfx.trade</footer>
      </div>
    </main>
  );
}

/* ================= LIVE ================= */
function Live() {
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
        const d = await (await fetch("/api/state", { cache: "no-store" })).json();
        if (!alive) return;
        setConnected(true);
        setLatest(d.latest || null);
        setHistory(d.history || []);
        if (d.latest && d.latest.id !== lastId.current) {
          if (lastId.current !== null && "Notification" in window && Notification.permission === "granted") {
            new Notification(`RK ${d.latest.grade || "A"}\u2605 ${d.latest.direction || ""} ${d.latest.strongPair || d.latest.symbol || ""}`, { body: d.latest.session || "" });
          }
          lastId.current = d.latest.id;
        }
      } catch { if (alive) setConnected(false); }
    };
    poll();
    const t = setInterval(poll, 4000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const dir = latest?.direction;
  const accent = dir === "SHORT" ? C.short : dir === "LONG" ? C.long : C.gold;
  const complete = latest ? STEPS.every(([k]) => latest.steps?.[k]) : false;
  const hasTrade = latest && latest.entry != null && latest.sl != null && latest.tp != null;

  return (
    <>
      <div className="statusline">
        <span className="dot" style={{ background: connected ? C.long : C.short, boxShadow: `0 0 12px ${connected ? C.long : C.short}` }} />
        <span className="mono" style={{ color: C.muted, fontSize: 12 }}>{connected ? "connected" : "reconnecting"}</span>
      </div>

      {/* verdict */}
      <section className="glass hero" style={{ "--glow": accent }}>
        <div className="glow-edge" style={{ background: accent }} />
        {latest ? (
          <>
            <div className="eyebrow">{complete ? `${latest.grade || "A"}\u2605 ready` : "forming"} · {latest.session || "\u2014"}</div>
            <div className={"verdict" + (complete ? " live" : "")} style={{ color: accent }}>
              {dir || "WATCHING"} <span className="pair">{latest.strongPair || latest.symbol || ""}</span>
            </div>
            <div className="sub mono">swept {latest.sweptLevel || "\u2014"}{latest.sweptPrice ? ` · ${latest.sweptPrice}` : ""}</div>
          </>
        ) : (
          <>
            <div className="eyebrow">standing by</div>
            <div className="verdict" style={{ color: C.faint }}>No signal yet</div>
            <div className="sub">Waiting on the first alert from TradingView. Fire a test to confirm the pipe.</div>
          </>
        )}
      </section>

      {hasTrade && (
        <section className="tiles">
          <Tile label="Entry" v={latest.entry} c={C.ink} />
          <Tile label="Stop" v={latest.sl} c={C.short} />
          <Tile label="Target" v={latest.tp} c={C.long} />
          <Tile label="R:R" v={latest.rr ? `1:${latest.rr}` : "\u2014"} c={C.gold} />
          {latest.sizeSuggestion != null && <Tile label="Size" v={latest.sizeSuggestion} c={C.ink} />}
        </section>
      )}

      {/* sequence */}
      <section className="glass ledger">
        {STEPS.map(([k, label], i) => {
          const done = latest?.steps?.[k];
          return (
            <div className="lrow" key={k}>
              <span className="lnum mono">{i + 1}</span>
              <span className={"lbox" + (done ? " on" : "")}>{done ? "\u2713" : ""}</span>
              <span className="llabel" style={{ color: done ? C.ink : C.muted }}>{label}</span>
            </div>
          );
        })}
      </section>

      {notif !== "granted" && (
        <button className="glass ghostbtn" onClick={async () => { if ("Notification" in window) setNotif(await Notification.requestPermission()); }}>
          Turn on desktop alerts
        </button>
      )}

      {history.length > 1 && (
        <section style={{ marginTop: 26 }}>
          <div className="secttl">Recent signals</div>
          <div className="glass reclist">
            {history.slice(0, 8).map((s) => (
              <div className="recrow" key={s.id}>
                <span className="mono" style={{ color: s.direction === "SHORT" ? C.short : C.long, fontWeight: 600 }}>{s.direction} {s.strongPair || s.symbol}</span>
                <span className="mono" style={{ color: C.muted }}>{s.session}</span>
                <span className="mono" style={{ color: C.faint }}>{s.receivedAt ? new Date(s.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Tile({ label, v, c }) {
  return (
    <div className="glass tile">
      <div className="tlabel">{label}</div>
      <div className="tval mono" style={{ color: c }}>{v}</div>
    </div>
  );
}

/* ================= JOURNAL ================= */
const emptyForm = { model: "Manual", pair: "NQ1!", direction: "LONG", session: "NY_AM", sweptLevel: "", entry: "", sl: "", tp: "", rr: 2, outcome: "open", rResult: "", notes: "" };

function Journal() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const refresh = async () => { setTrades(await jGet()); setLoading(false); };
  useEffect(() => { refresh(); }, []);

  const stats = useMemo(() => computeStats(trades), [trades]);
  const filtered = filter === "All" ? trades : trades.filter((t) => (t.model || (t.source === "manual" ? "Manual" : "\u2014")) === filter);

  const setOutcome = async (t, outcome) => {
    let r = t.rResult;
    if (outcome === "win" && (r == null || r === "")) r = t.rr || 2;
    if (outcome === "loss") r = -1;
    if (outcome === "be") r = 0;
    await jPatch(t.id, { outcome, rResult: r, taken: outcome !== "skip" });
    refresh();
  };
  const submit = async () => {
    const e = { ...form, source: form.model === "Manual" ? "manual" : "tool", taken: form.outcome !== "skip",
      entry: num(form.entry), sl: num(form.sl), tp: num(form.tp), rr: num(form.rr), rResult: num(form.rResult),
      tradedAt: new Date().toISOString().slice(0, 10) };
    await jPost(e); setForm(emptyForm); setAdding(false); refresh();
  };

  return (
    <>
      <div className="jhead">
        <div className="secttl" style={{ margin: 0 }}>Performance by model</div>
        <button className="glass addbtn" onClick={() => setAdding((a) => !a)}>{adding ? "Close" : "+ Log trade"}</button>
      </div>

      <div className="edgegrid">
        {stats.groups.length === 0 && <div className="glass empty">No trades logged yet. Log one to start tracking.</div>}
        {stats.groups.map((g) => <EdgeCard key={g.model} g={g} />)}
      </div>

      {adding && <AddForm form={form} setForm={setForm} submit={submit} />}

      <div className="chips">
        {["All", ...stats.groups.map((g) => g.model)].map((m) => (
          <button key={m} className={"chip" + (filter === m ? " on" : "")} onClick={() => setFilter(m)}>{m}</button>
        ))}
      </div>

      {loading ? (
        <div className="glass empty">Loading your journal…</div>
      ) : filtered.length === 0 ? (
        <div className="glass empty">Nothing here yet.</div>
      ) : (
        <div className="tradelist">
          {filtered.map((t) => <TradeRow key={t.id} t={t} setOutcome={setOutcome} onDelete={async () => { await jDelete(t.id); refresh(); }} onR={async (r) => { await jPatch(t.id, { rResult: r }); refresh(); }} />)}
        </div>
      )}
    </>
  );
}

function EdgeCard({ g }) {
  const pct = g.decided ? Math.round((g.wins / g.decided) * 100) : 0;
  const ring = g.decided ? `conic-gradient(${C.long} ${pct * 3.6}deg, rgba(255,255,255,0.08) 0deg)` : "rgba(255,255,255,0.06)";
  const rColor = g.totalR > 0 ? C.long : g.totalR < 0 ? C.short : C.muted;
  return (
    <div className="glass edge">
      <div className="edge-top">
        <div className="ring" style={{ background: ring }}>
          <div className="ring-in">
            <span className="mono pctnum">{g.decided ? pct + "%" : "\u2014"}</span>
            <span className="pctlbl">win rate</span>
          </div>
        </div>
        <div className="edge-meta">
          <div className="edge-model">{g.model}</div>
          <div className="edge-line mono">{g.wins}W · {g.losses}L{g.be ? ` · ${g.be}BE` : ""}</div>
          <div className="edge-r mono" style={{ color: rColor }}>{g.totalR > 0 ? "+" : ""}{g.totalR.toFixed(1)}R</div>
        </div>
      </div>
      <div className="edge-foot mono">{g.total} trade{g.total === 1 ? "" : "s"}{g.open ? ` · ${g.open} open` : ""}</div>
    </div>
  );
}

function TradeRow({ t, setOutcome, onDelete, onR }) {
  const dirC = t.direction === "SHORT" ? C.short : C.long;
  const oc = t.outcome;
  const ocC = oc === "win" ? C.long : oc === "loss" ? C.short : oc === "be" ? C.gold : C.faint;
  return (
    <div className="glass trow">
      <div className="trow-main">
        <div className="tpair">
          <span className="dir mono" style={{ color: dirC }}>{t.direction}</span>
          <span className="sym mono">{t.pair}</span>
        </div>
        <span className="tag">{t.model || (t.source === "manual" ? "Manual" : "\u2014")}</span>
        <span className="mono tmeta">{t.session}{t.sweptLevel ? ` · ${t.sweptLevel}` : ""}</span>
        {t.entry != null && <span className="mono tlvls">{t.entry} → {t.tp}</span>}
        <span className="opill mono" style={{ color: ocC, borderColor: ocC + "55" }}>{oc === "open" ? "open" : oc === "win" ? `+${t.rResult ?? ""}R` : oc === "loss" ? `${t.rResult ?? -1}R` : oc === "be" ? "BE" : oc}</span>
      </div>
      <div className="trow-act">
        <button className="mk w" onClick={() => setOutcome(t, "win")}>W</button>
        <button className="mk l" onClick={() => setOutcome(t, "loss")}>L</button>
        <button className="mk b" onClick={() => setOutcome(t, "be")}>BE</button>
        <input className="rin mono" type="number" step="0.1" placeholder="R" defaultValue={t.rResult ?? ""} onBlur={(e) => e.target.value !== "" && onR(Number(e.target.value))} />
        <button className="mk del" onClick={onDelete}>✕</button>
      </div>
      {t.notes && <div className="tnotes">{t.notes}</div>}
    </div>
  );
}

function AddForm({ form, setForm, submit }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="glass addform">
      <div className="fgrid">
        <Field label="Model"><select value={form.model} onChange={set("model")} className="fin">{MODELS.map((m) => <option key={m}>{m}</option>)}</select></Field>
        <Field label="Pair"><select value={form.pair} onChange={set("pair")} className="fin"><option>NQ1!</option><option>ES1!</option></select></Field>
        <Field label="Direction"><select value={form.direction} onChange={set("direction")} className="fin"><option>LONG</option><option>SHORT</option></select></Field>
        <Field label="Session"><select value={form.session} onChange={set("session")} className="fin"><option>ASIA</option><option>LONDON</option><option>NY_AM</option><option>NY_PM</option></select></Field>
        <Field label="Swept level"><input value={form.sweptLevel} onChange={set("sweptLevel")} className="fin" placeholder="London low" /></Field>
        <Field label="Outcome"><select value={form.outcome} onChange={set("outcome")} className="fin"><option value="open">open</option><option value="win">win</option><option value="loss">loss</option><option value="be">breakeven</option></select></Field>
        <Field label="Entry"><input value={form.entry} onChange={set("entry")} className="fin mono" inputMode="decimal" /></Field>
        <Field label="Stop"><input value={form.sl} onChange={set("sl")} className="fin mono" inputMode="decimal" /></Field>
        <Field label="Target"><input value={form.tp} onChange={set("tp")} className="fin mono" inputMode="decimal" /></Field>
        <Field label="R result"><input value={form.rResult} onChange={set("rResult")} className="fin mono" inputMode="decimal" placeholder="2 / -1" /></Field>
      </div>
      <Field label="Notes"><input value={form.notes} onChange={set("notes")} className="fin" placeholder="What happened" /></Field>
      <button className="savebtn" onClick={submit}>Save trade</button>
    </div>
  );
}
function Field({ label, children }) {
  return <label className="field"><span className="flabel">{label}</span>{children}</label>;
}

/* ---------- stats ---------- */
function computeStats(trades) {
  const map = {};
  for (const t of trades) {
    const m = t.model || (t.source === "manual" ? "Manual" : "\u2014");
    map[m] = map[m] || { model: m, total: 0, wins: 0, losses: 0, be: 0, open: 0, decided: 0, totalR: 0 };
    const g = map[m];
    g.total++;
    if (t.outcome === "win") { g.wins++; g.decided++; g.totalR += Number(t.rResult) || 0; }
    else if (t.outcome === "loss") { g.losses++; g.decided++; g.totalR += Number(t.rResult) || -1; }
    else if (t.outcome === "be") { g.be++; g.decided++; }
    else g.open++;
  }
  const order = (m) => { const i = MODELS.indexOf(m); return i < 0 ? 99 : i; };
  const groups = Object.values(map).sort((a, b) => order(a.model) - order(b.model));
  return { groups };
}
function num(v) { if (v === "" || v == null) return null; const n = Number(v); return isNaN(n) ? null : n; }

/* ================= chrome ================= */
function TopBar({ tab, setTab }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark mono">RK<span style={{ color: C.violet }}>{"\u2605"}</span></span>
        <span className="brandsub">rkfx.trade</span>
      </div>
      <nav className="tabs">
        <button className={"tab" + (tab === "live" ? " on" : "")} onClick={() => setTab("live")}>Live</button>
        <button className={"tab" + (tab === "journal" ? " on" : "")} onClick={() => setTab("journal")}>Journal</button>
      </nav>
    </header>
  );
}
function Ambient() {
  return <div className="ambient" aria-hidden="true" />;
}

/* ================= styles ================= */
function Style() {
  return (
    <style>{`
    *{box-sizing:border-box}
    .wrap{max-width:860px;margin:0 auto;padding:clamp(16px,3.5vw,34px) clamp(14px,3.5vw,28px) 60px;position:relative;z-index:1}
    .mono{font-family:${F.mono}}
    .ambient{position:fixed;inset:0;z-index:0;pointer-events:none;
      background:
        radial-gradient(60% 40% at 78% 8%, rgba(110,123,255,0.16), transparent 70%),
        radial-gradient(50% 45% at 10% 100%, rgba(52,229,160,0.08), transparent 70%),
        radial-gradient(90% 60% at 50% -10%, rgba(255,255,255,0.04), transparent 60%),
        #070A0F;}
    .glass{background:linear-gradient(160deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018));
      border:1px solid rgba(255,255,255,0.08);border-radius:22px;
      backdrop-filter:blur(24px) saturate(140%);-webkit-backdrop-filter:blur(24px) saturate(140%);
      box-shadow:0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 50px -24px rgba(0,0,0,0.9);}

    .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}
    .brand{display:flex;align-items:baseline;gap:10px}
    .mark{font-family:${F.mono};font-weight:700;font-size:20px;letter-spacing:.06em;color:${C.ink}}
    .brandsub{font-family:${F.mono};font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:${C.faint}}
    .tabs{display:flex;gap:6px;padding:5px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07)}
    .tab{font-family:${F.body};font-size:13px;font-weight:600;color:${C.muted};background:transparent;border:0;padding:8px 18px;border-radius:10px;cursor:pointer;transition:.2s}
    .tab.on{color:${C.ink};background:rgba(255,255,255,0.09);box-shadow:0 1px 0 rgba(255,255,255,0.08) inset}
    .tab:focus-visible{outline:2px solid ${C.violet};outline-offset:2px}

    .statusline{display:flex;align-items:center;gap:8px;justify-content:flex-end;margin-bottom:14px}
    .dot{width:8px;height:8px;border-radius:50%}

    .hero{padding:clamp(22px,5vw,34px);position:relative;overflow:hidden;isolation:isolate}
    .hero::after{content:"";position:absolute;inset:-40% -20% auto -20%;height:80%;z-index:-1;
      background:radial-gradient(50% 100% at 50% 0%, var(--glow), transparent 70%);opacity:.16;filter:blur(20px)}
    .glow-edge{position:absolute;top:0;left:0;right:0;height:2px;opacity:.9}
    .eyebrow{font-family:${F.mono};font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${C.muted}}
    .verdict{font-family:${F.display};font-weight:700;font-size:clamp(38px,10vw,64px);line-height:1.02;margin:10px 0 6px;letter-spacing:-.01em}
    .verdict .pair{font-weight:500;opacity:.85}
    .verdict.live{animation:breathe 2.4s ease-in-out infinite}
    .sub{font-size:14px;color:${C.muted}}

    .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:12px;margin-top:14px}
    .tile{padding:16px 14px}
    .tlabel{font-family:${F.mono};font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${C.faint}}
    .tval{font-size:clamp(18px,4vw,22px);font-weight:600;margin-top:6px}

    .ledger{margin-top:16px;padding:8px 10px}
    .lrow{display:flex;align-items:center;gap:14px;padding:13px 12px;border-bottom:1px solid rgba(255,255,255,0.05)}
    .lrow:last-child{border-bottom:0}
    .lnum{font-size:12px;color:${C.faint};width:16px}
    .lbox{width:22px;height:22px;border-radius:7px;display:grid;place-items:center;font-size:13px;color:#07110C;background:transparent;border:1px solid rgba(255,255,255,0.12);transition:.25s}
    .lbox.on{background:${C.long};border-color:transparent;box-shadow:0 0 16px -2px ${C.long}}
    .llabel{font-size:15px;font-weight:500}

    .ghostbtn{margin-top:16px;width:100%;padding:14px;color:${C.ink};font-family:${F.body};font-size:13px;font-weight:600;cursor:pointer;border-radius:16px}
    .ghostbtn:hover{background:linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))}

    .secttl{font-family:${F.mono};font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${C.faint};margin:0 0 12px 2px}
    .reclist{padding:6px 16px}
    .recrow{display:flex;justify-content:space-between;gap:10px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px}
    .recrow:last-child{border-bottom:0}
    .foot{margin-top:40px;font-size:11px;color:${C.faint};line-height:1.6;text-align:center}

    /* journal */
    .jhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:12px;flex-wrap:wrap}
    .addbtn{padding:10px 16px;font-family:${F.body};font-weight:600;font-size:13px;color:${C.ink};cursor:pointer;border-radius:13px}
    .addbtn:hover{background:linear-gradient(160deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03))}
    .edgegrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-bottom:20px}
    .empty{padding:26px;text-align:center;color:${C.muted};font-size:14px}
    .edge{padding:18px}
    .edge-top{display:flex;align-items:center;gap:16px}
    .ring{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;flex-shrink:0}
    .ring-in{width:56px;height:56px;border-radius:50%;background:#0B0F16;display:grid;place-items:center;text-align:center}
    .pctnum{font-size:16px;font-weight:700;color:${C.ink};line-height:1}
    .pctlbl{font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:${C.faint};margin-top:2px}
    .edge-model{font-family:${F.display};font-weight:600;font-size:17px}
    .edge-line{font-size:12px;color:${C.muted};margin-top:3px}
    .edge-r{font-size:20px;font-weight:700;margin-top:4px}
    .edge-foot{font-size:11px;color:${C.faint};margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06)}

    .chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
    .chip{font-family:${F.mono};font-size:12px;color:${C.muted};background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);padding:7px 14px;border-radius:11px;cursor:pointer;transition:.2s}
    .chip.on{color:${C.ink};background:rgba(110,123,255,0.16);border-color:rgba(110,123,255,0.4)}

    .tradelist{display:flex;flex-direction:column;gap:10px}
    .trow{padding:14px 16px}
    .trow-main{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
    .tpair{display:flex;align-items:baseline;gap:7px}
    .dir{font-weight:700;font-size:14px}
    .sym{font-size:13px;color:${C.muted}}
    .tag{font-family:${F.mono};font-size:10px;letter-spacing:.06em;color:${C.violet};background:rgba(110,123,255,0.12);border:1px solid rgba(110,123,255,0.28);padding:3px 8px;border-radius:8px}
    .tmeta{font-size:12px;color:${C.faint}}
    .tlvls{font-size:12px;color:${C.muted}}
    .opill{margin-left:auto;font-size:12px;font-weight:600;padding:4px 10px;border:1px solid;border-radius:9px}
    .trow-act{display:flex;align-items:center;gap:6px;margin-top:12px}
    .mk{font-family:${F.mono};font-size:12px;font-weight:600;width:34px;height:30px;border-radius:9px;cursor:pointer;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);color:${C.muted};transition:.15s}
    .mk.w:hover{color:#07110C;background:${C.long};border-color:transparent}
    .mk.l:hover{color:#fff;background:${C.short};border-color:transparent}
    .mk.b:hover{color:#07110C;background:${C.gold};border-color:transparent}
    .mk.del{margin-left:auto;width:32px}
    .mk.del:hover{color:${C.short};border-color:${C.short}55}
    .rin{width:56px;height:30px;border-radius:9px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);color:${C.ink};padding:0 8px;font-size:12px}
    .tnotes{font-size:12px;color:${C.faint};margin-top:10px;line-height:1.5}

    .addform{padding:18px;margin-bottom:18px}
    .fgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:12px}
    .field{display:flex;flex-direction:column;gap:5px}
    .flabel{font-family:${F.mono};font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:${C.faint}}
    .fin{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:${C.ink};padding:10px 12px;font-family:${F.body};font-size:14px;width:100%}
    .fin:focus{outline:2px solid ${C.violet};outline-offset:1px}
    .savebtn{margin-top:14px;width:100%;padding:13px;border:0;border-radius:13px;font-family:${F.body};font-weight:700;font-size:14px;color:#07110C;background:${C.long};cursor:pointer;box-shadow:0 0 24px -6px ${C.long}}
    .savebtn:hover{filter:brightness(1.06)}

    button:focus-visible,select:focus-visible{outline:2px solid ${C.violet};outline-offset:2px}
    @keyframes breathe{0%,100%{opacity:1}50%{opacity:.62}}
    @media (prefers-reduced-motion: reduce){*{animation:none!important}}
    @media (max-width:560px){
      .topbar{flex-direction:column;gap:14px;align-items:stretch}
      .tabs{justify-content:center}
      .trow-main{gap:8px}
      .opill{margin-left:0}
    }
    `}</style>
  );
}
