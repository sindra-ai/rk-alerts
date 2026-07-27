"use client";
import { useEffect, useRef, useState } from "react";

/* ==================================================================
 * rkfx.trade — Liquid Glass rebuild
 *
 * Kept:  the live setup, the risk buffer, the signal feed.
 * Cut:   equity curve, win/loss calendar, session P&L, strategy panel.
 *        All of it duplicates Compass / TradeSea.
 *
 * The glass needs something to refract, so the background is a fixed
 * mesh of amber and indigo blooms over near-black. Every panel is the
 * same material at the same blur — depth comes from layering and the
 * specular top edge, not from stacked drop shadows.
 * ================================================================== */

const STEP_KEYS = ["sweep", "pdaTap", "extSMT", "intSMT", "entryModel", "target"];

const GLASS =
  "relative bg-white/[0.055] backdrop-blur-2xl backdrop-saturate-150 " +
  "border border-white/[0.09] " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_20px_50px_-20px_rgba(0,0,0,0.85)]";

function Spec({ radius = "rounded-t-[28px]" }) {
  return (
    <div
      aria-hidden
      className={"pointer-events-none absolute inset-x-0 top-0 h-px " + radius}
      style={{
        background:
          "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.45) 22%,rgba(255,255,255,0.18) 55%,transparent 88%)",
      }}
    />
  );
}

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

const fmt = (n, d = 2) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (n) =>
  (n < 0 ? "-$" : "$") + Math.abs(Number(n)).toLocaleString(undefined, { maximumFractionDigits: 0 });

/* ================================================================= */

export default function Page() {
  const [live, setLive] = useState(null);
  const [history, setHistory] = useState([]);
  const [accts, setAccts] = useState({ configured: false, accounts: [] });
  const [acct, setAcct] = useState(null);
  const [risk, setRisk] = useState(200);
  const lastId = useRef(null);

  useEffect(() => {
    try {
      const r = localStorage.getItem("rk-risk");
      if (r) setRisk(Number(r));
    } catch {}
  }, []);
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
        .catch(() => ({ configured: false, accounts: [] }));
      setAccts(a);
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
    <div className="relative min-h-screen w-full overflow-x-hidden font-figtree text-white">
      <Ambient />
      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-4 pb-16 pt-4 sm:px-6 md:pt-6">
        <TopBar accts={accts} acct={acct} setAcct={setAcct} />

        <div className="mt-4 grid grid-cols-1 gap-4 md:mt-6 md:gap-5 lg:grid-cols-[1.55fr_1fr]">
          <SetupCard live={live} risk={risk} />
          <RiskCard acct={acct} mll={mll} risk={risk} setRisk={setRiskPersist} live={live} />
        </div>

        <Feed history={history} />
      </div>
    </div>
  );
}

function Ambient() {
  return (
    <div aria-hidden className="fixed inset-0 z-0">
      <div className="absolute inset-0 bg-[#07070A]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(720px 520px at 88% -6%, rgba(242,169,34,0.20), transparent 62%)," +
            "radial-gradient(680px 560px at -8% 104%, rgba(76,58,180,0.20), transparent 60%)," +
            "radial-gradient(520px 420px at 42% 48%, rgba(16,185,129,0.07), transparent 65%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.15] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}

function TopBar({ accts, acct, setAcct }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState("");
  useEffect(() => {
    const tick = () =>
      setNow(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={GLASS + " flex items-center gap-3 rounded-[22px] px-3 py-2.5 sm:px-4"}>
      <Spec radius="rounded-t-[22px]" />
      <Logo className="h-7 w-auto sm:h-8" />
      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex max-w-[190px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-left transition hover:bg-white/[0.11]"
          >
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#F2A922]" />
            <span className="truncate font-outfit text-[11px] font-semibold sm:text-xs">
              {acct ? acct.name : accts.configured ? "No account" : "Not linked"}
            </span>
          </button>
          {open && accts.accounts && accts.accounts.length > 0 && (
            <div className={GLASS + " absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-[18px] p-1"}>
              <Spec radius="rounded-t-[18px]" />
              {accts.accounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setAcct(a);
                    setOpen(false);
                  }}
                  className={
                    "flex w-full items-center justify-between rounded-[13px] px-3 py-2.5 text-left transition hover:bg-white/[0.08] " +
                    (acct && acct.id === a.id ? "bg-white/[0.07]" : "")
                  }
                >
                  <span className="truncate font-outfit text-xs font-medium">{a.name}</span>
                  <span className="ml-2 font-outfit text-[11px] tabular-nums text-white/50">
                    {a.balance != null ? money(a.balance) : "\u2014"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="hidden rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 font-outfit text-[11px] tabular-nums text-white/55 sm:block">
          {now}
        </span>
      </div>
    </div>
  );
}

function Logo({ className }) {
  const [err, setErr] = useState(false);
  if (!err)
    return (
      <img
        src="/logo-white.png"
        className={className + " object-contain"}
        alt="RKFX"
        onError={() => setErr(true)}
      />
    );
  return <span className="font-outfit text-base font-extrabold tracking-[0.2em]">RKFX</span>;
}

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
              <p className="mt-2 text-[13px] leading-relaxed text-white/45">
                {isEma
                  ? "Crossover confirmed" + (live.tf ? " on " + live.tf : "") + " \u2014 enter at the open."
                  : live.sweptLevel
                  ? "Swept " + live.sweptLevel + " \u2014 displacement on setup."
                  : "Monitoring for a setup."}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="font-outfit text-sm font-semibold tabular-nums text-[#F2A922]">
                {live.receivedAt
                  ? new Date(live.receivedAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "\u2014"}
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-white/30">fired</div>
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
                      ? "border-white/10 bg-white/[0.04]"
                      : "border-[#F0435C]/30 bg-[#F0435C]/[0.07]")
                  }
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">Max size</div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span
                        className="font-outfit text-[26px] font-extrabold leading-none tabular-nums"
                        style={{ color: size >= 1 ? "#fff" : "#F0435C" }}
                      >
                        {size}
                      </span>
                      <span className="font-outfit text-xs text-white/45">{spec.label}</span>
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="font-outfit text-sm font-semibold tabular-nums">
                      {money(perContract)}
                    </div>
                    <div className="mt-0.5 text-[10px] text-white/35">per contract</div>
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
                      (live.steps && live.steps[k] ? "bg-[#F2A922]" : "bg-white/10")
                    }
                  />
                ))}
              </div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/30">
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
    { p: posOf(be), label: "Breakeven", v: be, c: "#F2A922", dashed: true, note: "+1R" },
    { p: posOf(entry), label: "Entry", v: entry, c: "#FFFFFF", strong: true },
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
      <div className="relative w-[3px] flex-shrink-0 rounded-full bg-white/10">
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
              className="w-2.5 flex-shrink-0"
              style={{
                borderTop: "1px " + (r.dashed ? "dashed" : "solid") + " " + r.c,
                opacity: r.strong ? 0.9 : 0.7,
              }}
            />
            <span
              className={
                "font-outfit tabular-nums tracking-tight " +
                (r.strong
                  ? "text-[19px] font-extrabold sm:text-[21px]"
                  : "text-[15px] font-semibold sm:text-base")
              }
              style={{ color: r.c }}
            >
              {fmt(r.v)}
            </span>
            <span className="text-[9.5px] uppercase tracking-[0.18em] text-white/30">{r.label}</span>
            {r.note && (
              <span className="ml-auto text-[9.5px] tracking-[0.1em] text-[#F2A922]/80">{r.note}</span>
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
        <span className="absolute inset-0 rounded-full border border-white/[0.12]" />
        <span className="absolute inset-0 animate-ping rounded-full border border-[#F2A922]/25 [animation-duration:3.2s]" />
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F2A922]/60" />
      </div>
      <h2 className="font-outfit text-2xl font-extrabold tracking-tight text-white/85">Standing by</h2>
      <p className="mt-1.5 max-w-[240px] text-[13px] leading-relaxed text-white/35">
        The next confirmed setup appears here with its levels and size.
      </p>
    </div>
  );
}

function RiskCard({ acct, mll, risk, setRisk, live }) {
  const survives = risk ? Math.floor(mll / risk) : 0;
  const pct = Math.min(100, (risk / mll) * 100);
  const hot = survives < 4;

  return (
    <section className={GLASS + " flex flex-col overflow-hidden rounded-[28px] p-5 sm:p-6"}>
      <Spec />
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Risk per trade</div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-outfit text-[40px] font-extrabold leading-none tracking-tight tabular-nums">
          {money(risk)}
        </span>
        <span className="text-xs text-white/35">of {money(mll)}</span>
      </div>

      <input
        type="range"
        min={50}
        max={Math.round(mll / 3)}
        step={25}
        value={risk}
        onChange={(e) => setRisk(Number(e.target.value))}
        className="mt-4 w-full accent-[#F2A922]"
        aria-label="Risk per trade"
      />

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
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
          (hot ? "border-[#F0435C]/30 bg-[#F0435C]/[0.07]" : "border-white/10 bg-white/[0.04]")
        }
      >
        <div className="flex items-baseline gap-2">
          <span
            className="font-outfit text-2xl font-extrabold tabular-nums"
            style={{ color: hot ? "#F0435C" : "#fff" }}
          >
            {survives}
          </span>
          <span className="text-xs text-white/45">losing trades before the account is gone</span>
        </div>
        {hot && (
          <p className="mt-1.5 text-[11px] leading-snug text-[#F0435C]/85">
            Under four is fragile. A normal losing streak ends this account.
          </p>
        )}
      </div>

      <div className="mt-auto space-y-2 pt-5">
        <Line k="Account" v={acct ? acct.name : "Not linked"} />
        <Line k="Balance" v={acct && acct.balance != null ? money(acct.balance) : "\u2014"} />
        <Line k="Loss limit" v={money(mll)} />
        <Line k="Flat by" v="21:10 UK" hint={live ? "setup live" : undefined} />
      </div>
    </section>
  );
}

function Line({ k, v, hint }) {
  return (
    <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 first:border-0 first:pt-0">
      <span className="text-[11px] text-white/35">{k}</span>
      <span className="flex items-center gap-2 font-outfit text-[12px] font-medium tabular-nums text-white/80">
        {hint && (
          <span className="rounded-full bg-[#F2A922]/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#F2A922]">
            {hint}
          </span>
        )}
        {v}
      </span>
    </div>
  );
}

function Feed({ history }) {
  const rows = (history || []).slice(0, 12);
  return (
    <section className={GLASS + " mt-4 overflow-hidden rounded-[28px] p-5 sm:p-6 md:mt-5"}>
      <Spec />
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-outfit text-base font-bold tracking-tight">Signal feed</h2>
        <span className="text-[10px] uppercase tracking-[0.16em] text-white/30">
          every fire, taken or not
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-white/30">
          Nothing yet. Signals land here the moment TradingView fires.
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
                className="flex items-center gap-3 rounded-[15px] px-3 py-2.5 transition hover:bg-white/[0.05]"
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
                <span className="hidden font-outfit text-[11px] tabular-nums text-white/45 sm:block">
                  {s.entry != null ? fmt(s.entry) : "\u2014"}
                </span>
                <span className="w-[52px] flex-shrink-0 text-right font-outfit text-[11px] tabular-nums text-white/45">
                  {r ? r.toFixed(1) + "R" : "\u2014"}
                </span>
                <span className="w-[46px] flex-shrink-0 text-right text-[10px] uppercase tracking-wider text-white/25">
                  {s.strategy === "ema" ? "EMA" : "A\u2605"}
                </span>
                <span className="w-[42px] flex-shrink-0 text-right font-outfit text-[11px] tabular-nums text-white/30">
                  {s.receivedAt
                    ? new Date(s.receivedAt).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
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
          ? "border-white/[0.08] bg-white/[0.03] text-white/40"
          : "border-[#F2A922]/25 bg-[#F2A922]/10 text-[#F2A922]")
      }
    >
      {children}
    </span>
  );
}

function Stat({ label, value, unit, tone }) {
  return (
    <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.035] px-3 py-3">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-white/30">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span
          className="font-outfit text-[19px] font-extrabold leading-none tabular-nums"
          style={{ color: tone || "#fff" }}
        >
          {value}
        </span>
        <span className="text-[10px] text-white/30">{unit}</span>
      </div>
    </div>
  );
}
