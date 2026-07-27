"use client";
import { useEffect, useRef, useState } from "react";

/* ==================================================================
 * rkfx.trade — Liquid Glass
 *
 * Light and dark are both first-class. Everything below uses Tailwind
 * dark: variants against the .dark class on the root, which matches
 * darkMode:"class" in tailwind.config.js.
 * ================================================================== */

const STEP_KEYS = ["sweep", "pdaTap", "extSMT", "intSMT", "entryModel", "target"];

/* One material, two tunings. Depth comes from the specular top edge
   and the blur, not from stacked shadows. */
const GLASS =
  "relative backdrop-blur-2xl backdrop-saturate-150 border " +
  "bg-white/55 border-black/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_18px_44px_-24px_rgba(15,20,35,0.30)] " +
  "dark:bg-white/[0.055] dark:border-white/[0.09] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_20px_50px_-20px_rgba(0,0,0,0.85)]";

function Spec({ radius = "rounded-t-[28px]" }) {
  return (
    <div
      aria-hidden
      className={
        "pointer-events-none absolute inset-x-0 top-0 h-px opacity-70 dark:opacity-100 " + radius
      }
      style={{
        background:
          "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.45) 22%,rgba(255,255,255,0.18) 55%,transparent 88%)",
      }}
    />
  );
}

/* ---- contracts ---- */
const CONTRACTS = {
  MNQ: { pt: 2, label: "MNQ" },
  NQ: { pt: 20, label: "NQ" },
  MES: { pt: 5, label: "MES" },
  ES: { pt: 50, label: "ES" },
};
function specOf(sym = "") {
  const s = sym.toUpperCase();
  if (s.includes("MNQ")) return CONTRACTS.MNQ;
  if (s.includes("MES")) return CONTRACTS.MES;
  if (s.includes("NQ")) return CONTRACTS.NQ;
  if (s.includes("ES")) return CONTRACTS.ES;
  return null;
}
function mllOf(name = "") {
  const n = name.toUpperCase();
  if (n.includes("150K")) return 4500;
  if (n.includes("100K")) return 3000;
  return 2000;
}

/* ---- killzones, UK time. Gaps between them are deliberate. ---- */
const SESSIONS = [
  { key: "ASIA", label: "Asia", start: 0, end: 6, draws: "Source of liquidity for London" },
  { key: "LONDON", label: "London", start: 7, end: 10, draws: "Draws on the previous Asia high/low" },
  { key: "NY_AM", label: "NY AM", start: 13.5, end: 17, draws: "Draws on the previous London high/low" },
  { key: "NY_PM", label: "NY PM", start: 18, end: 21.5, draws: "Draws on the previous NY AM high/low" },
];

function ukHours(d = new Date()) {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  return (
    Number(p.find((x) => x.type === "hour").value) +
    Number(p.find((x) => x.type === "minute").value) / 60
  );
}

function activeSession(now = new Date()) {
  const h = ukHours(now);
  for (const s of SESSIONS) if (h >= s.start && h < s.end) return { s, live: true };
  let best = SESSIONS[0];
  let gap = 99;
  for (const s of SESSIONS) {
    let g = h - s.end;
    if (g < 0) g += 24;
    if (g < gap) {
      gap = g;
      best = s;
    }
  }
  return { s: best, live: false };
}

function nextSession(now = new Date()) {
  const h = ukHours(now);
  let best = SESSIONS[0];
  let gap = 99;
  for (const s of SESSIONS) {
    let g = s.start - h;
    if (g <= 0) g += 24;
    if (g < gap) {
      gap = g;
      best = s;
    }
  }
  return best;
}

function sessionStart(s, now = new Date()) {
  const h = ukHours(now);
  const d = new Date(now);
  d.setSeconds(0, 0);
  const back = s.start <= h ? h - s.start : 24 - s.start + h;
  return d.getTime() - back * 3600 * 1000;
}

const hhmm = (v) =>
  String(Math.floor(v)).padStart(2, "0") + ":" + String(Math.round((v % 1) * 60)).padStart(2, "0");
const fmt = (n, d = 2) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (n) =>
  (n < 0 ? "-$" : "$") + Math.abs(Number(n)).toLocaleString(undefined, { maximumFractionDigits: 0 });

/* ================================================================= */

export default function Page() {
  const [dark, setDark] = useState(true);
  const [live, setLive] = useState(null);
  const [history, setHistory] = useState([]);
  const [acct, setAcct] = useState(null);
  const [risk, setRisk] = useState(200);
  const lastId = useRef(null);

  useEffect(() => {
    try {
      const t = localStorage.getItem("rk-theme");
      if (t) setDark(t === "dark");
      const r = localStorage.getItem("rk-risk");
      if (r) setRisk(Number(r));
    } catch {}
  }, []);

  const toggleTheme = () =>
    setDark((d) => {
      const n = !d;
      try {
        localStorage.setItem("rk-theme", n ? "dark" : "light");
      } catch {}
      return n;
    });

  const setRiskPersist = (v) => {
    setRisk(v);
    try {
      localStorage.setItem("rk-risk", String(v));
    } catch {}
  };

  useEffect(() => {
    (async () => {
      const a = await fetch("/api/topstep", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({ accounts: [] }));
      if (a.accounts && a.accounts.length) setAcct(a.accounts[0]);
    })();
  }, []);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const d = await fetch("/api/state", { cache: "no-store" }).then((r) => r.json());
        if (!alive) return;
        setLive(d.latest || null);
        setHistory(d.history || []);
        if (d.latest && d.latest.id !== lastId.current) {
          if (
            lastId.current !== null &&
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            new Notification(`${d.latest.direction || ""} ${d.latest.symbol || ""}`.trim(), {
              body: d.latest.strategy === "ema" ? "EMA 9/21 crossover" : "RK A\u2605 setup",
            });
          }
          lastId.current = d.latest.id;
        }
      } catch {}
    };
    poll();
    const t = setInterval(poll, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const mll = acct ? mllOf(acct.name) : 2000;

  return (
    <div className={dark ? "dark" : ""}>
      <div className="relative min-h-screen w-full overflow-x-hidden font-figtree text-[#0D111E] dark:text-white">
        <Ambient />
        <div className="relative z-10 mx-auto w-full max-w-[1180px] px-4 pb-16 pt-6 sm:px-6 md:pt-8">
          <Header dark={dark} />

          <div className="mt-6 grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-[1.55fr_1fr]">
            <SetupCard live={live} risk={risk} />
            <RiskCard mll={mll} risk={risk} setRisk={setRiskPersist} dark={dark} toggleTheme={toggleTheme} />
          </div>

          <Feed history={history} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- background ---------------- */
function Ambient() {
  return (
    <div aria-hidden className="fixed inset-0 z-0">
      <div className="absolute inset-0 bg-[#EFEEF1] dark:bg-[#07070A]" />
      <div
        className="absolute inset-0 opacity-70 dark:opacity-100"
        style={{
          background:
            "radial-gradient(720px 520px at 88% -6%, rgba(242,169,34,0.22), transparent 62%)," +
            "radial-gradient(680px 560px at -8% 104%, rgba(76,58,180,0.16), transparent 60%)," +
            "radial-gradient(520px 420px at 42% 48%, rgba(16,185,129,0.08), transparent 65%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.10] mix-blend-overlay dark:opacity-[0.15]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}

/* ---------------- header: bare logo + theme toggle ---------------- */
function Header({ dark }) {
  return (
    <header className="flex items-center justify-center py-1">
      <Logo dark={dark} className="h-12 w-auto sm:h-[60px]" />
    </header>
  );
}

function Logo({ dark, className }) {
  const [err, setErr] = useState(false);
  const src = dark ? "/logo-white.png" : "/logo-black.png";
  if (!err)
    return (
      <img
        key={src}
        src={src}
        className={className + " object-contain"}
        alt="RKFX"
        onError={() => setErr(true)}
      />
    );
  return <span className="font-outfit text-xl font-extrabold tracking-[0.22em]">RKFX</span>;
}

/* ---------------- setup ---------------- */
function SetupCard({ live, risk }) {
  const isEma = live && live.strategy === "ema";
  const hasPlan = live && live.entry != null && live.sl != null && live.tp != null;
  const entry = Number(live && live.entry);
  const sl = Number(live && live.sl);
  const tp = Number(live && live.tp);
  const isLong = ((live && live.direction) || "").toUpperCase() === "LONG";

  const riskPts = hasPlan ? Math.abs(entry - sl) : 0;
  const rewardPts = hasPlan ? Math.abs(tp - entry) : 0;
  const be = isLong ? entry + riskPts : entry - riskPts;

  const spec = specOf((live && (live.symbol || live.strongPair)) || "");
  const perContract = spec && riskPts ? riskPts * spec.pt : null;
  const size = perContract ? Math.floor(risk / perContract) : null;

  const tone = isLong ? "#10B981" : "#F0435C";
  const hi = isLong ? tp : sl;
  const lo = isLong ? sl : tp;
  const posOf = (v) => ((hi - v) / (hi - lo)) * 100;

  return (
    <section className={GLASS + " overflow-hidden rounded-[28px] p-5 sm:p-7"}>
      <Spec />
      {!live ? (
        <Empty />
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                <Chip tone={tone} solid>
                  {live.direction || "WATCHING"}
                </Chip>
                <Chip>{isEma ? "EMA 9/21" : "RK A\u2605"}</Chip>
                {live.session && <Chip muted>{String(live.session).replace("_", " ")}</Chip>}
              </div>
              <h1 className="font-outfit text-[30px] font-extrabold leading-none tracking-tight sm:text-[38px]">
                {live.symbol || live.strongPair || "\u2014"}
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-black/45 dark:text-white/45">
                {isEma
                  ? "Crossover confirmed" +
                    (live.tf ? " on " + live.tf : "") +
                    " \u2014 enter at the open."
                  : live.sweptLevel
                  ? "Swept " + live.sweptLevel + " \u2014 displacement on setup."
                  : "Monitoring for a setup."}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="font-outfit text-sm font-semibold tabular-nums text-[#C77A0F] dark:text-[#F2A922]">
                {live.receivedAt
                  ? new Date(live.receivedAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Europe/London",
                    })
                  : "\u2014"}
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-black/30 dark:text-white/30">
                fired
              </div>
            </div>
          </div>

          {hasPlan && (
            <>
              <Ladder posOf={posOf} entry={entry} be={be} sl={sl} tp={tp} isLong={isLong} tone={tone} />

              <div className="mt-5 grid grid-cols-3 gap-2">
                <Stat label="Risk" value={fmt(riskPts)} unit="pts" />
                <Stat label="Reward" value={fmt(rewardPts)} unit="pts" tone="#10B981" />
                <Stat
                  label="R:R"
                  value={live.rr ? String(live.rr) : fmt(rewardPts / riskPts, 1)}
                  unit=": 1"
                  tone="#F2A922"
                />
              </div>

              {spec && perContract && (
                <div
                  className={
                    "mt-2 flex items-center gap-4 rounded-[20px] border px-4 py-3.5 " +
                    (size >= 1
                      ? "border-black/[0.07] bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.04]"
                      : "border-[#F0435C]/30 bg-[#F0435C]/[0.07]")
                  }
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-black/35 dark:text-white/35">
                      Max size
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span
                        className={
                          "font-outfit text-[26px] font-extrabold leading-none tabular-nums " +
                          (size >= 1 ? "" : "text-[#F0435C]")
                        }
                      >
                        {size}
                      </span>
                      <span className="font-outfit text-xs text-black/45 dark:text-white/45">
                        {spec.label}
                      </span>
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="font-outfit text-sm font-semibold tabular-nums">
                      {money(perContract)}
                    </div>
                    <div className="mt-0.5 text-[10px] text-black/35 dark:text-white/35">
                      per contract
                    </div>
                  </div>
                  {size < 1 && (
                    <div className="max-w-[104px] text-right text-[10px] leading-snug text-[#F0435C]">
                      Stop too wide &mdash; drop to micros
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!isEma && (
            <div className="mt-5">
              <div className="flex gap-1">
                {STEP_KEYS.map((k) => (
                  <div
                    key={k}
                    className={
                      "h-1 flex-1 rounded-full transition " +
                      (live.steps && live.steps[k]
                        ? "bg-[#E28D13] dark:bg-[#F2A922]"
                        : "bg-black/10 dark:bg-white/10")
                    }
                  />
                ))}
              </div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-black/30 dark:text-white/30">
                {STEP_KEYS.filter((k) => live.steps && live.steps[k]).length} of 6 confirmed
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Ladder({ posOf, entry, be, sl, tp, isLong, tone }) {
  const rungs = [
    {
      p: posOf(isLong ? tp : sl),
      label: isLong ? "Target" : "Stop",
      v: isLong ? tp : sl,
      c: isLong ? "#10B981" : "#F0435C",
    },
    { p: posOf(be), label: "Breakeven", v: be, c: "#E28D13", dashed: true, note: "+1R" },
    { p: posOf(entry), label: "Entry", v: entry, strong: true },
    {
      p: posOf(isLong ? sl : tp),
      label: isLong ? "Stop" : "Target",
      v: isLong ? sl : tp,
      c: isLong ? "#F0435C" : "#10B981",
    },
  ];
  const from = Math.min(posOf(entry), posOf(tp));
  const height = Math.abs(posOf(tp) - posOf(entry));

  return (
    <div className="mt-6 flex gap-4">
      <div className="relative w-[3px] flex-shrink-0 rounded-full bg-black/10 dark:bg-white/10">
        <div
          className="absolute -left-px -right-px rounded-full"
          style={{
            top: from + "%",
            height: height + "%",
            background: "linear-gradient(180deg," + tone + "00," + tone + "cc," + tone + "00)",
            boxShadow: "0 0 18px " + tone + "55",
          }}
        />
      </div>
      <div className="relative min-h-[186px] flex-1 sm:min-h-[206px]">
        {rungs.map((r) => (
          <div
            key={r.label}
            className="absolute inset-x-0 flex -translate-y-1/2 items-center gap-2.5"
            style={{ top: r.p + "%" }}
          >
            <div
              className={"w-2.5 flex-shrink-0 " + (r.strong ? "border-current" : "")}
              style={{
                borderTop: "1px " + (r.dashed ? "dashed" : "solid") + " " + (r.c || "currentColor"),
                opacity: r.strong ? 0.85 : 0.7,
              }}
            />
            <span
              className={
                "font-outfit tabular-nums tracking-tight " +
                (r.strong
                  ? "text-[19px] font-extrabold sm:text-[21px]"
                  : "text-[15px] font-semibold sm:text-base")
              }
              style={r.c ? { color: r.c } : undefined}
            >
              {fmt(r.v)}
            </span>
            <span className="text-[9.5px] uppercase tracking-[0.18em] text-black/35 dark:text-white/30">
              {r.label}
            </span>
            {r.note && (
              <span className="ml-auto text-[9.5px] tracking-[0.1em] text-[#C77A0F] dark:text-[#F2A922]/80">
                {r.note}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center py-10 text-center">
      <div className="relative mb-5 h-11 w-11">
        <span className="absolute inset-0 rounded-full border border-black/10 dark:border-white/[0.12]" />
        <span className="absolute inset-0 animate-ping rounded-full border border-[#F2A922]/25 [animation-duration:3.2s]" />
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E28D13]/70 dark:bg-[#F2A922]/60" />
      </div>
      <h2 className="font-outfit text-2xl font-extrabold tracking-tight text-black/80 dark:text-white/85">
        Standing by
      </h2>
      <p className="mt-1.5 max-w-[240px] text-[13px] leading-relaxed text-black/40 dark:text-white/35">
        The next confirmed setup appears here with its levels and size.
      </p>
    </div>
  );
}

/* ---------------- risk ---------------- */
function RiskCard({ mll, risk, setRisk, dark, toggleTheme }) {
  const survives = risk ? Math.floor(mll / risk) : 0;
  const pct = Math.min(100, (risk / mll) * 100);
  const hot = survives < 4;

  /* The inverse of the sizing panel, and the number that's actually
     useful BEFORE a signal arrives: how wide a stop this budget buys
     on one contract of each instrument. */
  const stops = [
    ["MNQ", 2],
    ["NQ", 20],
    ["MES", 5],
    ["ES", 50],
  ].map(([k, pt]) => [k, risk / pt]);

  return (
    <section className={GLASS + " flex flex-col overflow-hidden rounded-[28px] p-5 sm:p-6"}>
      <Spec />
      <div className="flex items-start justify-between">
        <div className="text-[10px] uppercase tracking-[0.18em] text-black/35 dark:text-white/35">
          Risk per trade
        </div>
        <button
          onClick={toggleTheme}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          className="-mr-1 -mt-1 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-black/[0.07] bg-black/[0.02] text-black/50 transition hover:bg-black/[0.05] dark:border-white/[0.09] dark:bg-white/[0.05] dark:text-white/60 dark:hover:bg-white/[0.10]"
        >
          {dark ? (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
            </svg>
          )}
        </button>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-outfit text-[40px] font-extrabold leading-none tracking-tight tabular-nums">
          {money(risk)}
        </span>
        <span className="text-xs text-black/35 dark:text-white/35">of {money(mll)}</span>
      </div>

      <input
        type="range"
        min={50}
        max={Math.round(mll / 3)}
        step={25}
        value={risk}
        onChange={(e) => setRisk(Number(e.target.value))}
        className="mt-4 w-full accent-[#E28D13] dark:accent-[#F2A922]"
        aria-label="Risk per trade"
      />

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.08]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: pct + "%",
            background: hot
              ? "linear-gradient(90deg,#F2A922,#F0435C)"
              : "linear-gradient(90deg,#F2A922,#E28D13)",
          }}
        />
      </div>

      <div
        className={
          "mt-4 rounded-[18px] border px-4 py-3 " +
          (hot
            ? "border-[#F0435C]/30 bg-[#F0435C]/[0.07]"
            : "border-black/[0.07] bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.04]")
        }
      >
        <div className="flex items-baseline gap-2">
          <span
            className={
              "font-outfit text-2xl font-extrabold tabular-nums " + (hot ? "text-[#F0435C]" : "")
            }
          >
            {survives}
          </span>
          <span className="text-xs text-black/45 dark:text-white/45">
            losing trades before the account is gone
          </span>
        </div>
        {hot && (
          <p className="mt-1.5 text-[11px] leading-snug text-[#D32F2F] dark:text-[#F0435C]/85">
            Under four is fragile. A normal losing streak ends this account.
          </p>
        )}
      </div>

      <div className="mt-5">
        <div className="mb-2.5 text-[10px] uppercase tracking-[0.18em] text-black/35 dark:text-white/35">
          Widest stop &middot; 1 contract
        </div>
        <div className="grid grid-cols-2 gap-2">
          {stops.map(([k, pts]) => (
            <div
              key={k}
              className="flex items-baseline justify-between rounded-[14px] border border-black/[0.07] bg-black/[0.02] px-3 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.035]"
            >
              <span className="font-outfit text-[11px] font-semibold text-black/50 dark:text-white/50">
                {k}
              </span>
              <span className="font-outfit text-[15px] font-extrabold tabular-nums">
                {pts >= 10 ? Math.round(pts) : pts.toFixed(1)}
                <span className="ml-0.5 text-[10px] font-medium text-black/35 dark:text-white/35">
                  pts
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- feed ---------------- */
function Feed({ history }) {
  const [now, setNow] = useState(() => new Date());
  const [pick, setPick] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const { s: current, live } = activeSession(now);
  const active = pick ? SESSIONS.find((s) => s.key === pick) || current : current;
  const from = sessionStart(active, now);
  const upcoming = nextSession(now);

  const counts = {};
  for (const s of SESSIONS) {
    const f = sessionStart(s, now);
    counts[s.key] = (history || []).filter((x) => {
      const t = x.receivedAt ? Date.parse(x.receivedAt) : x.id;
      return t >= f;
    }).length;
  }

  const rows = (history || [])
    .filter((s) => {
      const t = s.receivedAt ? Date.parse(s.receivedAt) : s.id;
      return t >= from;
    })
    .slice(0, 20);

  return (
    <section className={GLASS + " mt-4 overflow-hidden rounded-[28px] p-5 sm:p-6 md:mt-5"}>
      <Spec />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-outfit text-base font-bold tracking-tight">Signal feed</h2>
        <span className="text-[10px] uppercase tracking-[0.16em] text-black/30 dark:text-white/30">
          {live && active.key === current.key
            ? "clears at " + hhmm(active.end) + " UK"
            : upcoming.label + " opens " + hhmm(upcoming.start) + " UK"}
        </span>
      </div>

      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-0.5">
        {SESSIONS.map((s) => {
          const on = s.key === active.key;
          const isNow = s.key === current.key && live;
          return (
            <button
              key={s.key}
              onClick={() => setPick(s.key)}
              className={
                "flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-outfit text-[11px] font-semibold transition " +
                (on
                  ? "border-[#F2A922]/40 bg-[#F2A922]/15 text-[#C77A0F] dark:text-[#F2A922]"
                  : "border-black/[0.07] bg-black/[0.02] text-black/45 hover:bg-black/[0.05] dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/45 dark:hover:bg-white/[0.07]")
              }
            >
              {isNow && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#F2A922] shadow-[0_0_7px_#F2A922]" />
              )}
              {s.label}
              <span className="tabular-nums opacity-60">{counts[s.key]}</span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-black/35 dark:text-white/30">
          Nothing fired in {active.label}.
        </p>
      ) : (
        <div className="-mx-1">
          {rows.map((s, i) => {
            const long = (s.direction || "").toUpperCase() === "LONG";
            const c = long ? "#10B981" : "#F0435C";
            const r =
              s.entry != null && s.sl != null && s.tp != null && Number(s.entry) !== Number(s.sl)
                ? Math.abs(s.tp - s.entry) / Math.abs(s.entry - s.sl)
                : null;
            return (
              <div
                key={s.id || i}
                className="flex items-center gap-3 rounded-[15px] px-3 py-2.5 transition hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
              >
                <span
                  className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{ background: c, boxShadow: "0 0 8px " + c }}
                />
                <span
                  className="w-[46px] flex-shrink-0 font-outfit text-[11px] font-bold uppercase"
                  style={{ color: c }}
                >
                  {s.direction || "\u2014"}
                </span>
                <span className="min-w-0 flex-1 truncate font-outfit text-[13px] font-semibold">
                  {s.symbol || s.strongPair || "\u2014"}
                </span>
                <span className="hidden font-outfit text-[11px] tabular-nums text-black/45 dark:text-white/45 sm:block">
                  {s.entry != null ? fmt(s.entry) : "\u2014"}
                </span>
                <span className="w-[52px] flex-shrink-0 text-right font-outfit text-[11px] tabular-nums text-black/45 dark:text-white/45">
                  {r ? r.toFixed(1) + "R" : "\u2014"}
                </span>
                <span className="w-[46px] flex-shrink-0 text-right text-[10px] uppercase tracking-wider text-black/30 dark:text-white/25">
                  {s.strategy === "ema" ? "EMA" : "A\u2605"}
                </span>
                <span className="w-[42px] flex-shrink-0 text-right font-outfit text-[11px] tabular-nums text-black/30 dark:text-white/30">
                  {s.receivedAt
                    ? new Date(s.receivedAt).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Europe/London",
                      })
                    : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ---------------- small pieces ---------------- */
function Chip({ children, tone, solid, muted }) {
  if (solid)
    return (
      <span
        className="rounded-full px-2.5 py-1 font-outfit text-[10px] font-bold uppercase tracking-[0.1em]"
        style={{ background: tone + "22", color: tone, boxShadow: "inset 0 0 0 1px " + tone + "44" }}
      >
        {children}
      </span>
    );
  return (
    <span
      className={
        "rounded-full border px-2.5 py-1 font-outfit text-[10px] font-semibold uppercase tracking-[0.1em] " +
        (muted
          ? "border-black/[0.07] bg-black/[0.02] text-black/40 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/40"
          : "border-[#F2A922]/30 bg-[#F2A922]/12 text-[#C77A0F] dark:text-[#F2A922]")
      }
    >
      {children}
    </span>
  );
}

function Stat({ label, value, unit, tone }) {
  return (
    <div className="rounded-[18px] border border-black/[0.07] bg-black/[0.02] px-3 py-3 dark:border-white/[0.08] dark:bg-white/[0.035]">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-black/35 dark:text-white/30">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span
          className="font-outfit text-[19px] font-extrabold leading-none tabular-nums"
          style={tone ? { color: tone } : undefined}
        >
          {value}
        </span>
        <span className="text-[10px] text-black/30 dark:text-white/30">{unit}</span>
      </div>
    </div>
  );
}
