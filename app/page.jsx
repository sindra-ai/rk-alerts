"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const F = {
  display: "'Space Grotesk', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};
const STEPS = [
  ["sweep", "Liquidity sweep"], ["pdaTap", "PDA tap"], ["extSMT", "External SMT"],
  ["intSMT", "Internal SMT"], ["entryModel", "Entry model"], ["target", "Target \u2265 1:2"],
];
const MODELS = ["Manual", "Phase 4", "Phase 3", "Phase 2.1", "Phase 2", "Phase 1"];
const SESSIONS = ["LONDON", "NY_AM", "NY_PM", "ASIA"];

const api = {
  journal: () => fetch("/api/journal", { cache: "no-store" }).then((r) => r.json()).then((d) => d.trades || []),
  add: (e) => fetch("/api/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(e) }),
  patch: (id, patch) => fetch("/api/journal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, patch }) }),
  del: (id) => fetch("/api/journal", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }),
  state: () => fetch("/api/state", { cache: "no-store" }).then((r) => r.json()),
};

export default function Page() {
  const [theme, setTheme] = useState("dark");
  const [view, setView] = useState("overview");
  const [trades, setTrades] = useState([]);
  const [live, setLive] = useState(null);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const lastId = useRef(null);

  useEffect(() => {
    try { const t = localStorage.getItem("rk-theme"); if (t) setTheme(t); } catch {}
  }, []);
  const toggleTheme = () => setTheme((t) => { const n = t === "dark" ? "light" : "dark"; try { localStorage.setItem("rk-theme", n); } catch {} return n; });

  const loadJournal = async () => setTrades(await api.journal());
  useEffect(() => { loadJournal(); }, []);
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const d = await api.state(); if (!alive) return;
        setConnected(true); setLive(d.latest || null); setHistory(d.history || []);
        if (d.latest && d.latest.id !== lastId.current) {
          if (lastId.current !== null && "Notification" in window && Notification.permission === "granted")
            new Notification(`RK ${d.latest.grade || "A"}\u2605 ${d.latest.direction || ""} ${d.latest.strongPair || d.latest.symbol || ""}`, { body: d.latest.session || "" });
          lastId.current = d.latest.id;
        }
      } catch { if (alive) setConnected(false); }
    };
    poll(); const t = setInterval(poll, 4000); return () => { alive = false; clearInterval(t); };
  }, []);

  const stats = useMemo(() => analyze(trades), [trades]);

  return (
    <div className="app" data-theme={theme}>
      <Style />
      <div className="ambient" aria-hidden />
      <Sidebar view={view} setView={setView} />
      <div className="mainarea">
        <TopBar theme={theme} toggleTheme={toggleTheme} connected={connected} view={view} setView={setView} />
        <div className="content">
          {view === "overview"
            ? <Overview stats={stats} live={live} history={history} />
            : <Journal trades={trades} stats={stats} reload={loadJournal} />}
        </div>
      </div>
    </div>
  );
}

/* ===================== OVERVIEW ===================== */
function Overview({ stats, live, history }) {
  return (
    <>
      <div className="tilerow">
        <StatTile label="Net R" value={`${stats.totalR > 0 ? "+" : ""}${stats.totalR.toFixed(1)}R`} tone={stats.totalR >= 0 ? "up" : "down"} sub={`${stats.decided} closed`} />
        <StatTile label="Win rate" value={stats.decided ? `${Math.round((stats.wins / stats.decided) * 100)}%` : "\u2014"} tone="accent" sub={`${stats.wins}W · ${stats.losses}L`} />
        <StatTile label="Trades" value={`${stats.total}`} tone="neutral" sub={`${stats.open} open`} />
        <StatTile label="Best streak" value={`${stats.bestStreak}`} tone="up" sub="consecutive wins" />
        <StatTile label="Avg R / trade" value={stats.decided ? `${stats.avgR > 0 ? "+" : ""}${stats.avgR.toFixed(2)}` : "\u2014"} tone={stats.avgR >= 0 ? "up" : "down"} sub="expectancy" />
      </div>

      <div className="grid2">
        <LivePanel live={live} />
        <EquityPanel series={stats.equity} totalR={stats.totalR} />
      </div>

      <div className="grid3">
        <ModelPanel groups={stats.groups} />
        <SessionPanel rows={stats.sessions} />
        <FeedPanel history={history} />
      </div>

      <CalendarPanel days={stats.calendar} />
    </>
  );
}

function StatTile({ label, value, sub, tone }) {
  const c = tone === "up" ? "var(--long)" : tone === "down" ? "var(--short)" : tone === "accent" ? "var(--violet)" : "var(--ink)";
  return (
    <div className="card tile">
      <div className="tlabel">{label}</div>
      <div className="tval mono" style={{ color: c }}>{value}</div>
      <div className="tsub mono">{sub}</div>
    </div>
  );
}

function LivePanel({ live }) {
  const dir = live?.direction;
  const accent = dir === "SHORT" ? "var(--short)" : dir === "LONG" ? "var(--long)" : "var(--gold)";
  const complete = live ? STEPS.every(([k]) => live.steps?.[k]) : false;
  return (
    <div className="card live" style={{ "--acc": accent }}>
      <div className="glow" />
      <div className="cardhead"><span className="ctitle">Live signal</span><span className="mono cnote">{live?.session || "\u2014"}</span></div>
      {live ? (
        <>
          <div className={"bigdir" + (complete ? " pulse" : "")} style={{ color: accent }}>{dir || "WATCHING"} <span className="pairtag">{live.strongPair || live.symbol}</span></div>
          <div className="mono swept">swept {live.sweptLevel || "\u2014"}</div>
          {live.entry != null && (
            <div className="livetiles">
              <MiniTile l="Entry" v={live.entry} />
              <MiniTile l="Stop" v={live.sl} c="var(--short)" />
              <MiniTile l="Target" v={live.tp} c="var(--long)" />
              <MiniTile l="R:R" v={live.rr ? `1:${live.rr}` : "\u2014"} c="var(--gold)" />
            </div>
          )}
          <div className="seqbar">
            {STEPS.map(([k], i) => <span key={k} className={"seg" + (live.steps?.[k] ? " on" : "")} title={STEPS[i][1]} />)}
          </div>
        </>
      ) : (
        <div className="emptylive"><div className="bigdir" style={{ color: "var(--faint)" }}>No signal</div><div className="swept">Waiting on TradingView.</div></div>
      )}
    </div>
  );
}
function MiniTile({ l, v, c }) { return <div className="minitile"><span className="ml mono">{l}</span><span className="mv mono" style={{ color: c || "var(--ink)" }}>{v}</span></div>; }

function EquityPanel({ series, totalR }) {
  return (
    <div className="card">
      <div className="cardhead"><span className="ctitle">Cumulative R</span><span className="mono" style={{ color: totalR >= 0 ? "var(--long)" : "var(--short)", fontWeight: 700 }}>{totalR > 0 ? "+" : ""}{totalR.toFixed(1)}R</span></div>
      <Sparkline series={series} />
    </div>
  );
}
function Sparkline({ series }) {
  if (!series || series.length < 2) return <div className="chartempty mono">Not enough closed trades yet</div>;
  const W = 520, H = 150, pad = 8;
  const min = Math.min(0, ...series), max = Math.max(0, ...series);
  const rng = max - min || 1;
  const x = (i) => pad + (i / (series.length - 1)) * (W - pad * 2);
  const y = (v) => pad + (1 - (v - min) / rng) * (H - pad * 2);
  const line = series.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(series.length - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`;
  const up = series[series.length - 1] >= 0;
  const col = up ? "var(--long)" : "var(--short)";
  const zero = y(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="spark" preserveAspectRatio="none">
      <defs><linearGradient id="eq" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity="0.28" /><stop offset="100%" stopColor={col} stopOpacity="0" /></linearGradient></defs>
      <line x1="0" y1={zero} x2={W} y2={zero} stroke="var(--line)" strokeWidth="1" strokeDasharray="3 4" />
      <path d={area} fill="url(#eq)" />
      <path d={line} fill="none" stroke={col} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ModelPanel({ groups }) {
  return (
    <div className="card">
      <div className="cardhead"><span className="ctitle">By model</span><span className="mono cnote">edge</span></div>
      <div className="modellist">
        {groups.length === 0 && <div className="chartempty mono">No trades logged</div>}
        {groups.map((g) => {
          const pct = g.decided ? Math.round((g.wins / g.decided) * 100) : 0;
          return (
            <div className="modelrow" key={g.model}>
              <div className="ring" style={{ background: g.decided ? `conic-gradient(var(--long) ${pct * 3.6}deg, var(--ringtrack) 0deg)` : "var(--ringtrack)" }}>
                <div className="ringin mono">{g.decided ? pct : "\u2014"}</div>
              </div>
              <div className="modelmeta">
                <div className="mname">{g.model}</div>
                <div className="mmeta mono">{g.wins}W · {g.losses}L</div>
              </div>
              <div className="mr mono" style={{ color: g.totalR > 0 ? "var(--long)" : g.totalR < 0 ? "var(--short)" : "var(--muted)" }}>{g.totalR > 0 ? "+" : ""}{g.totalR.toFixed(1)}R</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SessionPanel({ rows }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.totalR)));
  return (
    <div className="card">
      <div className="cardhead"><span className="ctitle">By session</span><span className="mono cnote">R</span></div>
      <div className="sesslist">
        {rows.every((r) => r.total === 0) && <div className="chartempty mono">No trades logged</div>}
        {rows.filter((r) => r.total > 0).map((r) => (
          <div className="sessrow" key={r.session}>
            <span className="sname mono">{r.session.replace("_", " ")}</span>
            <div className="sbarwrap">
              <div className="sbar" style={{ width: `${(Math.abs(r.totalR) / max) * 100}%`, background: r.totalR >= 0 ? "var(--long)" : "var(--short)" }} />
            </div>
            <span className="sval mono" style={{ color: r.totalR >= 0 ? "var(--long)" : "var(--short)" }}>{r.totalR > 0 ? "+" : ""}{r.totalR.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedPanel({ history }) {
  return (
    <div className="card">
      <div className="cardhead"><span className="ctitle">Recent signals</span><span className="mono cnote">live</span></div>
      <div className="feed">
        {(!history || history.length === 0) && <div className="chartempty mono">No signals yet</div>}
        {(history || []).slice(0, 6).map((s) => (
          <div className="feedrow" key={s.id}>
            <span className="mono" style={{ color: s.direction === "SHORT" ? "var(--short)" : "var(--long)", fontWeight: 600 }}>{s.direction} {s.strongPair || s.symbol}</span>
            <span className="mono fmeta">{s.session}</span>
            <span className="mono ftime">{s.receivedAt ? new Date(s.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarPanel({ days }) {
  return (
    <div className="card">
      <div className="cardhead"><span className="ctitle">Trade calendar</span><span className="mono cnote">last 8 weeks · net R / day</span></div>
      <div className="cal">
        {days.map((d, i) => {
          const t = d.r;
          const bg = t == null ? "var(--ringtrack)" : t > 0 ? `rgba(22,199,132,${Math.min(0.85, 0.25 + Math.abs(t) * 0.2)})` : t < 0 ? `rgba(240,67,92,${Math.min(0.85, 0.25 + Math.abs(t) * 0.2)})` : "var(--ringtrack)";
          return <div key={i} className="calcell" style={{ background: bg }} title={d.date + (t != null ? ` · ${t > 0 ? "+" : ""}${t}R` : "")} />;
        })}
      </div>
      <div className="callegend mono"><span>less</span><span className="lgcell" style={{ background: "rgba(240,67,92,0.6)" }} /><span className="lgcell" style={{ background: "var(--ringtrack)" }} /><span className="lgcell" style={{ background: "rgba(22,199,132,0.6)" }} /><span>more</span></div>
    </div>
  );
}

/* ===================== JOURNAL ===================== */
const emptyForm = { model: "Manual", pair: "NQ1!", direction: "LONG", session: "NY_AM", sweptLevel: "", entry: "", sl: "", tp: "", rr: 2, outcome: "open", rResult: "", notes: "" };
function Journal({ trades, stats, reload }) {
  const [filter, setFilter] = useState("All");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const filtered = filter === "All" ? trades : trades.filter((t) => (t.model || (t.source === "manual" ? "Manual" : "\u2014")) === filter);
  const setOutcome = async (t, outcome) => {
    let r = t.rResult; if (outcome === "win" && (r == null || r === "")) r = t.rr || 2; if (outcome === "loss") r = -1; if (outcome === "be") r = 0;
    await api.patch(t.id, { outcome, rResult: r, taken: true }); reload();
  };
  const submit = async () => {
    await api.add({ ...form, source: form.model === "Manual" ? "manual" : "tool", taken: form.outcome !== "open",
      entry: num(form.entry), sl: num(form.sl), tp: num(form.tp), rr: num(form.rr), rResult: num(form.rResult), tradedAt: new Date().toISOString().slice(0, 10) });
    setForm(emptyForm); setAdding(false); reload();
  };
  return (
    <>
      <div className="jhead"><span className="ctitle" style={{ fontSize: 16 }}>Trade journal</span><button className="primary" onClick={() => setAdding((a) => !a)}>{adding ? "Close" : "+ Log trade"}</button></div>
      {adding && <AddForm form={form} setForm={setForm} submit={submit} />}
      <div className="chips">
        {["All", ...stats.groups.map((g) => g.model)].map((m) => <button key={m} className={"chip" + (filter === m ? " on" : "")} onClick={() => setFilter(m)}>{m}</button>)}
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? <div className="chartempty mono" style={{ padding: 30 }}>No trades</div> :
          filtered.map((t) => <TradeRow key={t.id} t={t} setOutcome={setOutcome} onDelete={async () => { await api.del(t.id); reload(); }} onR={async (r) => { await api.patch(t.id, { rResult: r }); reload(); }} />)}
      </div>
    </>
  );
}
function TradeRow({ t, setOutcome, onDelete, onR }) {
  const dirC = t.direction === "SHORT" ? "var(--short)" : "var(--long)";
  const oc = t.outcome; const ocC = oc === "win" ? "var(--long)" : oc === "loss" ? "var(--short)" : oc === "be" ? "var(--gold)" : "var(--faint)";
  return (
    <div className="jrow">
      <div className="jrowmain">
        <span className="dir mono" style={{ color: dirC }}>{t.direction}</span>
        <span className="sym mono">{t.pair}</span>
        <span className="tag">{t.model || (t.source === "manual" ? "Manual" : "\u2014")}</span>
        <span className="mono jmeta">{t.session}{t.sweptLevel ? ` · ${t.sweptLevel}` : ""}</span>
        {t.entry != null && <span className="mono jlv">{t.entry}\u2192{t.tp}</span>}
        <span className="opill mono" style={{ color: ocC, borderColor: `color-mix(in srgb, ${ocC} 40%, transparent)` }}>{oc === "open" ? "open" : oc === "win" ? `+${t.rResult ?? ""}R` : oc === "loss" ? `${t.rResult ?? -1}R` : "BE"}</span>
      </div>
      <div className="jact">
        <button className="mk w" onClick={() => setOutcome(t, "win")}>W</button>
        <button className="mk l" onClick={() => setOutcome(t, "loss")}>L</button>
        <button className="mk b" onClick={() => setOutcome(t, "be")}>BE</button>
        <input className="rin mono" type="number" step="0.1" placeholder="R" defaultValue={t.rResult ?? ""} onBlur={(e) => e.target.value !== "" && onR(Number(e.target.value))} />
        <button className="mk del" onClick={onDelete}>{"\u2715"}</button>
      </div>
      {t.notes && <div className="jnotes">{t.notes}</div>}
    </div>
  );
}
function AddForm({ form, setForm, submit }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="card addform">
      <div className="fgrid">
        <Field l="Model"><select className="fin" value={form.model} onChange={set("model")}>{MODELS.map((m) => <option key={m}>{m}</option>)}</select></Field>
        <Field l="Pair"><select className="fin" value={form.pair} onChange={set("pair")}><option>NQ1!</option><option>ES1!</option></select></Field>
        <Field l="Direction"><select className="fin" value={form.direction} onChange={set("direction")}><option>LONG</option><option>SHORT</option></select></Field>
        <Field l="Session"><select className="fin" value={form.session} onChange={set("session")}>{SESSIONS.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field l="Swept level"><input className="fin" value={form.sweptLevel} onChange={set("sweptLevel")} placeholder="London low" /></Field>
        <Field l="Outcome"><select className="fin" value={form.outcome} onChange={set("outcome")}><option value="open">open</option><option value="win">win</option><option value="loss">loss</option><option value="be">breakeven</option></select></Field>
        <Field l="Entry"><input className="fin mono" value={form.entry} onChange={set("entry")} inputMode="decimal" /></Field>
        <Field l="Stop"><input className="fin mono" value={form.sl} onChange={set("sl")} inputMode="decimal" /></Field>
        <Field l="Target"><input className="fin mono" value={form.tp} onChange={set("tp")} inputMode="decimal" /></Field>
        <Field l="R result"><input className="fin mono" value={form.rResult} onChange={set("rResult")} inputMode="decimal" placeholder="2 / -1" /></Field>
      </div>
      <Field l="Notes"><input className="fin" value={form.notes} onChange={set("notes")} placeholder="What happened" /></Field>
      <button className="primary save" onClick={submit}>Save trade</button>
    </div>
  );
}
function Field({ l, children }) { return <label className="field"><span className="flabel">{l}</span>{children}</label>; }

/* ===================== chrome ===================== */
function Sidebar({ view, setView }) {
  const items = [["overview", "Overview", "\u25A0"], ["journal", "Journal", "\u2261"]];
  return (
    <aside className="sidebar">
      <div className="logo"><span className="mono logomark">RK<span style={{ color: "var(--violet)" }}>{"\u2605"}</span></span></div>
      <nav className="nav">
        {items.map(([k, label, ic]) => (
          <button key={k} className={"navitem" + (view === k ? " on" : "")} onClick={() => setView(k)}><span className="navic">{ic}</span><span className="navlabel">{label}</span></button>
        ))}
      </nav>
      <div className="sidefoot mono">rkfx.trade</div>
    </aside>
  );
}
function TopBar({ theme, toggleTheme, connected, view, setView }) {
  const sess = currentSession();
  return (
    <header className="topbar">
      <div className="tbleft">
        <h1 className="pagetitle">{view === "overview" ? "Dashboard" : "Journal"}</h1>
        <span className={"sesspill mono" + (sess === "Closed" ? " closed" : "")}>{sess === "Closed" ? "Market quiet" : sess + " open"}</span>
      </div>
      <div className="tbright">
        <span className="conn mono"><span className="cdot" style={{ background: connected ? "var(--long)" : "var(--short)" }} />{connected ? "live" : "offline"}</span>
        <div className="segtabs">
          <button className={"segtab" + (view === "overview" ? " on" : "")} onClick={() => setView("overview")}>Overview</button>
          <button className={"segtab" + (view === "journal" ? " on" : "")} onClick={() => setView("journal")}>Journal</button>
        </div>
        <button className="themebtn" onClick={toggleTheme} aria-label="Toggle theme">{theme === "dark" ? "\u2600" : "\u263D"}</button>
      </div>
    </header>
  );
}

/* ===================== analytics ===================== */
function analyze(trades) {
  const groupsMap = {}; const sessMap = {}; SESSIONS.forEach((s) => (sessMap[s] = { session: s, total: 0, wins: 0, losses: 0, totalR: 0 }));
  let wins = 0, losses = 0, decided = 0, open = 0, totalR = 0, bestStreak = 0, cur = 0;
  const equity = []; let run = 0;
  const dayMap = {};
  const sorted = [...trades].sort((a, b) => (a.tradedAt || a.createdAt || "").localeCompare(b.tradedAt || b.createdAt || ""));
  for (const t of sorted) {
    const m = t.model || (t.source === "manual" ? "Manual" : "\u2014");
    groupsMap[m] = groupsMap[m] || { model: m, total: 0, wins: 0, losses: 0, decided: 0, totalR: 0 };
    const g = groupsMap[m]; g.total++;
    const s = sessMap[t.session]; if (s) s.total++;
    let r = 0, isDecided = false;
    if (t.outcome === "win") { r = Number(t.rResult) || 0; wins++; g.wins++; isDecided = true; }
    else if (t.outcome === "loss") { r = Number(t.rResult) || -1; losses++; g.losses++; isDecided = true; }
    else if (t.outcome === "be") { r = 0; isDecided = true; }
    else { open++; }
    if (isDecided) {
      decided++; g.decided++; totalR += r; g.totalR += r; run += r; equity.push(run);
      if (s) { s.totalR += r; if (t.outcome === "win") s.wins++; if (t.outcome === "loss") s.losses++; }
      if (t.outcome === "win") { cur++; bestStreak = Math.max(bestStreak, cur); } else if (t.outcome === "loss") cur = 0;
      const day = (t.tradedAt || (t.createdAt || "").slice(0, 10));
      if (day) dayMap[day] = (dayMap[day] || 0) + r;
    }
  }
  const order = (m) => { const i = MODELS.indexOf(m); return i < 0 ? 99 : i; };
  const groups = Object.values(groupsMap).sort((a, b) => order(a.model) - order(b.model));
  const sessions = SESSIONS.map((s) => sessMap[s]);
  // calendar: last 56 days
  const calendar = []; const today = new Date();
  for (let i = 55; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); const key = d.toISOString().slice(0, 10); calendar.push({ date: key, r: dayMap[key] ?? null }); }
  return { groups, sessions, wins, losses, decided, open, total: trades.length, totalR, avgR: decided ? totalR / decided : 0, bestStreak, equity, calendar };
}
function num(v) { if (v === "" || v == null) return null; const n = Number(v); return isNaN(n) ? null : n; }
function currentSession() {
  const now = new Date(); const uk = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
  const h = uk.getHours() + uk.getMinutes() / 60; const dow = uk.getDay();
  if (dow === 0 || dow === 6) return "Closed";
  if (h >= 7 && h < 10) return "London"; if (h >= 13.5 && h < 17) return "NY AM"; if (h >= 18 && h < 21.5) return "NY PM"; if (h >= 0 && h < 6) return "Asia";
  return "Closed";
}

/* ===================== styles ===================== */
function Style() {
  return (
    <style>{`
    *{box-sizing:border-box}
    .app{min-height:100vh;font-family:${F.body};position:relative;display:flex}
    .app[data-theme="dark"]{
      --bg1:#0A0E17;--bg2:#0B111C;--card-bg:linear-gradient(160deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02));
      --card-border:rgba(255,255,255,0.08);--card-shadow:0 20px 50px -28px rgba(0,0,0,0.9);
      --ink:#EAF0F7;--muted:#8A96A8;--faint:#5A6474;--line:rgba(255,255,255,0.09);--ringtrack:rgba(255,255,255,0.08);
      --side:rgba(255,255,255,0.03);--glow1:rgba(110,123,255,0.16);--glow2:rgba(22,199,132,0.08);
    }
    .app[data-theme="light"]{
      --bg1:#EEF1F8;--bg2:#F6F8FC;--card-bg:linear-gradient(160deg,rgba(255,255,255,0.9),rgba(255,255,255,0.72));
      --card-border:rgba(18,32,60,0.09);--card-shadow:0 18px 40px -26px rgba(30,45,80,0.35);
      --ink:#0F1826;--muted:#5A6678;--faint:#93A0B4;--line:rgba(18,32,60,0.09);--ringtrack:rgba(18,32,60,0.08);
      --side:rgba(255,255,255,0.6);--glow1:rgba(110,123,255,0.14);--glow2:rgba(22,199,132,0.08);
    }
    --long:#16C784;--short:#F0435C;--violet:#6E7BFF;--gold:#F2B33D;
    .app{--long:#16C784;--short:#F0435C;--violet:#6E7BFF;--gold:#F2B33D;color:var(--ink)}
    .mono{font-family:${F.mono}}
    .ambient{position:fixed;inset:0;z-index:0;pointer-events:none;
      background:radial-gradient(55% 40% at 82% 0%,var(--glow1),transparent 70%),radial-gradient(45% 40% at 0% 100%,var(--glow2),transparent 70%),linear-gradient(180deg,var(--bg2),var(--bg1))}

    .sidebar{position:sticky;top:0;height:100vh;width:78px;flex-shrink:0;z-index:2;display:flex;flex-direction:column;align-items:center;padding:22px 0;gap:26px;background:var(--side);border-right:1px solid var(--line);backdrop-filter:blur(20px)}
    .logomark{font-weight:700;font-size:19px;letter-spacing:.04em}
    .nav{display:flex;flex-direction:column;gap:8px;width:100%;align-items:center;flex:1}
    .navitem{width:52px;height:52px;border-radius:15px;border:1px solid transparent;background:transparent;color:var(--muted);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;transition:.2s;font-family:${F.body}}
    .navitem:hover{background:var(--card-bg);color:var(--ink)}
    .navitem.on{background:linear-gradient(150deg,rgba(110,123,255,0.22),rgba(110,123,255,0.08));border-color:rgba(110,123,255,0.35);color:var(--ink)}
    .navic{font-size:15px}.navlabel{font-size:9px;letter-spacing:.04em}
    .sidefoot{font-size:8px;letter-spacing:.2em;color:var(--faint);writing-mode:vertical-rl;transform:rotate(180deg)}

    .mainarea{flex:1;min-width:0;position:relative;z-index:1}
    .topbar{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px clamp(16px,3vw,30px);backdrop-filter:blur(16px);background:linear-gradient(180deg,var(--bg2),transparent);border-bottom:1px solid var(--line);flex-wrap:wrap}
    .tbleft{display:flex;align-items:center;gap:14px}
    .pagetitle{font-family:${F.display};font-size:clamp(20px,3vw,26px);font-weight:700;margin:0;letter-spacing:-.01em}
    .sesspill{font-size:11px;color:var(--long);background:color-mix(in srgb,var(--long) 14%,transparent);border:1px solid color-mix(in srgb,var(--long) 30%,transparent);padding:5px 11px;border-radius:20px}
    .sesspill.closed{color:var(--muted);background:var(--ringtrack);border-color:var(--line)}
    .tbright{display:flex;align-items:center;gap:12px}
    .conn{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)}
    .cdot{width:7px;height:7px;border-radius:50%}
    .segtabs,.segtab{font-family:${F.body}}
    .segtabs{display:flex;gap:4px;padding:4px;border-radius:12px;background:var(--ringtrack);border:1px solid var(--line)}
    .segtab{font-size:13px;font-weight:600;color:var(--muted);background:transparent;border:0;padding:7px 15px;border-radius:9px;cursor:pointer}
    .segtab.on{color:var(--ink);background:var(--card-bg);box-shadow:0 1px 0 rgba(255,255,255,0.06) inset}
    .themebtn{width:38px;height:38px;border-radius:11px;border:1px solid var(--line);background:var(--card-bg);color:var(--ink);cursor:pointer;font-size:15px}

    .content{padding:clamp(16px,3vw,28px);display:flex;flex-direction:column;gap:16px;max-width:1240px}
    .card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:20px;box-shadow:var(--card-shadow);backdrop-filter:blur(22px);padding:20px}
    .cardhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
    .ctitle{font-family:${F.display};font-weight:600;font-size:14px;letter-spacing:.01em}
    .cnote{font-size:11px;color:var(--faint);letter-spacing:.08em;text-transform:uppercase}
    .chartempty{color:var(--muted);font-size:13px;padding:20px 0;text-align:center}

    .tilerow{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px}
    .tile{padding:18px}
    .tlabel{font-size:11px;color:var(--muted);font-weight:500}
    .tval{font-size:26px;font-weight:700;margin:8px 0 4px;letter-spacing:-.01em}
    .tsub{font-size:11px;color:var(--faint)}

    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}

    .live{position:relative;overflow:hidden}
    .live .glow{position:absolute;inset:-50% 0 auto 0;height:70%;background:radial-gradient(50% 100% at 50% 0%,var(--acc),transparent 70%);opacity:.14;filter:blur(24px);pointer-events:none}
    .bigdir{font-family:${F.display};font-weight:700;font-size:clamp(28px,5vw,40px);line-height:1.05;margin:6px 0}
    .bigdir.pulse{animation:breathe 2.4s ease-in-out infinite}
    .pairtag{font-weight:500;opacity:.8;font-size:.7em}
    .swept{font-size:13px;color:var(--muted)}
    .livetiles{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0 12px}
    .minitile{background:var(--ringtrack);border-radius:12px;padding:10px 8px;display:flex;flex-direction:column;gap:3px}
    .ml{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
    .mv{font-size:15px;font-weight:600}
    .seqbar{display:flex;gap:5px;margin-top:14px}
    .seg{flex:1;height:6px;border-radius:4px;background:var(--ringtrack);transition:.3s}
    .seg.on{background:var(--acc);box-shadow:0 0 12px -2px var(--acc)}
    .emptylive{padding:8px 0}

    .spark{width:100%;height:150px;display:block}
    .modellist{display:flex;flex-direction:column;gap:14px}
    .modelrow{display:flex;align-items:center;gap:13px}
    .ring{width:44px;height:44px;border-radius:50%;flex-shrink:0;display:grid;place-items:center}
    .ringin{width:32px;height:32px;border-radius:50%;background:var(--card-solid,var(--bg1));display:grid;place-items:center;font-size:12px;font-weight:700;color:var(--ink);background:var(--bg1)}
    .app[data-theme="light"] .ringin{background:#fff}
    .modelmeta{flex:1;min-width:0}
    .mname{font-weight:600;font-size:14px}
    .mmeta{font-size:11px;color:var(--muted);margin-top:2px}
    .mr{font-size:15px;font-weight:700}

    .sesslist{display:flex;flex-direction:column;gap:14px}
    .sessrow{display:flex;align-items:center;gap:12px}
    .sname{font-size:12px;color:var(--muted);width:64px;flex-shrink:0}
    .sbarwrap{flex:1;height:8px;background:var(--ringtrack);border-radius:6px;overflow:hidden}
    .sbar{height:100%;border-radius:6px;transition:width .4s}
    .sval{font-size:13px;font-weight:600;width:42px;text-align:right}

    .feed{display:flex;flex-direction:column}
    .feedrow{display:flex;justify-content:space-between;gap:8px;padding:10px 0;border-bottom:1px solid var(--line);font-size:12px}
    .feedrow:last-child{border-bottom:0}
    .fmeta{color:var(--muted)}.ftime{color:var(--faint)}

    .cal{display:grid;grid-template-columns:repeat(28,1fr);grid-auto-flow:row;gap:5px;margin-top:4px}
    .calcell{aspect-ratio:1;border-radius:4px;border:1px solid var(--line)}
    .callegend{display:flex;align-items:center;gap:5px;justify-content:flex-end;margin-top:12px;font-size:10px;color:var(--faint)}
    .lgcell{width:12px;height:12px;border-radius:3px;display:inline-block;border:1px solid var(--line)}

    .jhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
    .primary{font-family:${F.body};font-weight:600;font-size:13px;color:#fff;background:linear-gradient(135deg,#6E7BFF,#9B8CFF);border:0;padding:10px 18px;border-radius:12px;cursor:pointer;box-shadow:0 8px 20px -8px rgba(110,123,255,0.6)}
    .primary:hover{filter:brightness(1.05)}
    .chips{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0}
    .chip{font-family:${F.mono};font-size:12px;color:var(--muted);background:var(--ringtrack);border:1px solid var(--line);padding:7px 14px;border-radius:11px;cursor:pointer}
    .chip.on{color:var(--ink);background:color-mix(in srgb,var(--violet) 16%,transparent);border-color:color-mix(in srgb,var(--violet) 40%,transparent)}

    .jrow{padding:14px 18px;border-bottom:1px solid var(--line)}
    .jrow:last-child{border-bottom:0}
    .jrowmain{display:flex;align-items:center;gap:11px;flex-wrap:wrap}
    .dir{font-weight:700;font-size:14px}.sym{font-size:13px;color:var(--muted)}
    .tag{font-family:${F.mono};font-size:10px;color:var(--violet);background:color-mix(in srgb,var(--violet) 12%,transparent);border:1px solid color-mix(in srgb,var(--violet) 28%,transparent);padding:3px 8px;border-radius:8px}
    .jmeta{font-size:12px;color:var(--faint)}.jlv{font-size:12px;color:var(--muted)}
    .opill{margin-left:auto;font-size:12px;font-weight:600;padding:4px 10px;border:1px solid;border-radius:9px}
    .jact{display:flex;align-items:center;gap:6px;margin-top:11px}
    .mk{font-family:${F.mono};font-size:12px;font-weight:600;height:30px;min-width:34px;padding:0 8px;border-radius:9px;cursor:pointer;background:var(--ringtrack);border:1px solid var(--line);color:var(--muted)}
    .mk.w:hover{color:#04140D;background:var(--long);border-color:transparent}
    .mk.l:hover{color:#fff;background:var(--short);border-color:transparent}
    .mk.b:hover{color:#1a1205;background:var(--gold);border-color:transparent}
    .mk.del{margin-left:auto}.mk.del:hover{color:var(--short);border-color:color-mix(in srgb,var(--short) 40%,transparent)}
    .rin{width:56px;height:30px;border-radius:9px;background:var(--ringtrack);border:1px solid var(--line);color:var(--ink);padding:0 8px;font-size:12px}
    .jnotes{font-size:12px;color:var(--faint);margin-top:9px}

    .addform{margin-bottom:4px}
    .fgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:12px}
    .field{display:flex;flex-direction:column;gap:5px}
    .flabel{font-family:${F.mono};font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
    .fin{background:var(--ringtrack);border:1px solid var(--line);border-radius:10px;color:var(--ink);padding:10px 12px;font-family:${F.body};font-size:14px;width:100%}
    .fin:focus{outline:2px solid var(--violet);outline-offset:1px}
    .save{margin-top:14px;width:100%}

    button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid var(--violet);outline-offset:2px}
    @keyframes breathe{0%,100%{opacity:1}50%{opacity:.6}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}}
    @media (max-width:1000px){.grid2,.grid3{grid-template-columns:1fr}.cal{grid-template-columns:repeat(14,1fr)}}
    @media (max-width:640px){
      .sidebar{position:fixed;bottom:0;top:auto;left:0;right:0;width:100%;height:64px;flex-direction:row;padding:0;gap:0;border-right:0;border-top:1px solid var(--line);justify-content:space-around}
      .sidebar .logo,.sidefoot{display:none}
      .nav{flex-direction:row;flex:0;gap:16px}
      .navitem{width:60px;height:48px;border-radius:12px}
      .mainarea{padding-bottom:70px}
      .segtabs{display:none}
      .tbright{gap:8px}
    }
    `}</style>
  );
}
