"use client";
import { useEffect, useMemo, useRef, useState } from "react";

const STEP_KEYS = ["sweep","pdaTap","extSMT","intSMT","entryModel","target"];
const MODELS = ["Manual","Phase 4","Phase 3","Phase 2"];
const MODEL_DESC = {"Manual":"Manual Discretionary","Phase 4":"Phase 4 Algo","Phase 3":"Phase 3 Breakout","Phase 2":"Phase 2 Mean-Rev"};
const SESSIONS = ["LONDON","NY_AM","NY_PM","ASIA"];
const SESS_LABEL = {LONDON:"London",NY_AM:"NY AM",NY_PM:"NY PM",ASIA:"Asia"};
const SESS_FULL = {LONDON:"London",NY_AM:"New York",NY_PM:"New York",ASIA:"Asia"};
const DESK_NAV = [["dashboard","Dashboard"],["journal","Trade Journal"],["analytics","Analytics"],["calendar","Economic Calendar"]];
const MOB_NAV = [["dashboard","Dashboard","grid"],["journal","Journal","book"],["analytics","Analytics","chart"],["calendar","Calendar","cal"],["settings","Settings","gear"]];

const Ico = {
  grid:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  book:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2z"/><path d="M12 6.5v13"/></svg>,
  chart:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>,
  cal:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>,
  gear:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>,
  search:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>,
  sun:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>,
  moon:(p)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>,
  up:(p)=><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M2 11l4-4 3 3 5-5M10 5h4v4"/></svg>,
  down:(p)=><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M2 5l4 4 3-3 5 5M10 11h4V7"/></svg>,
  pct:(p)=><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M13 3L3 13"/><circle cx="5" cy="5" r="1.6"/><circle cx="11" cy="11" r="1.6"/></svg>,
  act:(p)=><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><path d="M2 8h3l2 5 3-10 2 5h2"/></svg>,
  trash:(p)=><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><path d="M2.5 4h11M6 4V2.5h4V4M4 4l.6 9a1 1 0 0 0 1 1h4.8a1 1 0 0 0 1-1L12 4M6.5 7v4M9.5 7v4"/></svg>,
};

function Logo({dark,className}){
  const [err,setErr]=useState(false);
  const src=dark?"/logo-white.png":"/logo-black.png";
  if(!err)return <img src={src} className={className+" object-contain"} alt="RKFX" onError={()=>setErr(true)}/>;
  const fg=dark?"#FFFFFF":"#0D111E";
  return (<svg viewBox="0 0 132 34" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="4" width="26" height="26" rx="7" fill="url(#lg)"/>
    <path d="M9 24V10h5.6c2.7 0 4.4 1.5 4.4 3.9 0 1.8-1 3-2.6 3.5L20 24h-3.3l-2.6-3.3h-1.8V24H9zm3.3-6h2.1c1 0 1.7-.5 1.7-1.4s-.7-1.4-1.7-1.4h-2.1V18z" fill="#0D111E"/>
    <text x="34" y="23" fontFamily="Outfit,sans-serif" fontSize="18" fontWeight="800" fill={fg}>RKFX</text>
    <text x="92" y="23" fontFamily="Outfit,sans-serif" fontSize="18" fontWeight="800" fill="#E28D13">.trade</text>
    <defs><linearGradient id="lg" x1="1" y1="4" x2="27" y2="30"><stop stopColor="#F2A922"/><stop offset="1" stopColor="#E28D13"/></linearGradient></defs>
  </svg>);
}
function Avatar({className}){
  const [err,setErr]=useState(false);
  if(!err)return <img src="/avatar.png" className={className+" rounded-full object-cover"} alt="" onError={()=>setErr(true)}/>;
  return <div className={className+" rounded-full bg-gradient-to-br from-amber-400 to-emerald-500 grid place-items-center text-[11px] font-bold text-black font-outfit"}>RK</div>;
}
const api = {
  journal:()=>fetch("/api/journal",{cache:"no-store"}).then(r=>r.json()).then(d=>d.trades||[]),
  jadd:(e)=>fetch("/api/journal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)}),
  jpatch:(id,patch)=>fetch("/api/journal",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,patch})}),
  jdel:(id)=>fetch("/api/journal",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})}),
  accounts:()=>fetch("/api/topstep",{cache:"no-store"}).then(r=>r.json()).catch(()=>({configured:false,accounts:[]})),
  trades:(id)=>fetch(`/api/topstep?accountId=${id}&days=90`,{cache:"no-store"}).then(r=>r.json()).catch(()=>({trades:[]})),
};

export default function Page(){
  const [dark,setDark]=useState(true);
  const [view,setView]=useState("dashboard");
  const [query,setQuery]=useState("");
  const [journal,setJournal]=useState([]);
  const [live,setLive]=useState(null);
  const [accts,setAccts]=useState({configured:false,accounts:[]});
  const [acct,setAcct]=useState(null);
  const [tsTrades,setTsTrades]=useState([]);
  const lastId=useRef(null);

  useEffect(()=>{try{const t=localStorage.getItem("rk-theme");if(t)setDark(t==="dark");}catch{}},[]);
  const toggle=()=>setDark(d=>{const n=!d;try{localStorage.setItem("rk-theme",n?"dark":"light");}catch{}return n;});
  const loadJ=async()=>setJournal(await api.journal());
  useEffect(()=>{loadJ();},[]);
  useEffect(()=>{(async()=>{const a=await api.accounts();setAccts(a);if(a.accounts&&a.accounts.length)setAcct(a.accounts[0]);})();},[]);
  useEffect(()=>{if(!acct)return;api.trades(acct.id).then(r=>setTsTrades(r.trades||[]));},[acct]);
  useEffect(()=>{let al=true;const poll=async()=>{try{const d=await fetch("/api/state",{cache:"no-store"}).then(r=>r.json());if(!al)return;setLive(d.latest||null);if(d.latest&&d.latest.id!==lastId.current){if(lastId.current!==null&&"Notification"in window&&Notification.permission==="granted")new Notification(`RK ${d.latest.grade||"A"}★ ${d.latest.direction||""} ${d.latest.symbol||d.latest.strongPair||""}`,{body:d.latest.session||""});lastId.current=d.latest.id;}}catch{}};poll();const t=setInterval(poll,4000);return()=>{al=false;clearInterval(t);};},[]);

  const ts=useMemo(()=>analyzeTs(tsTrades,acct),[tsTrades,acct]);
  const jstats=useMemo(()=>analyzeJournal(journal),[journal]);

  const bg=dark
    ? "radial-gradient(circle at 87% 12%,rgba(249,115,22,0.10),transparent 50%),radial-gradient(900px 620px at -10% 115%,rgba(245,158,11,0.06),transparent 60%),radial-gradient(820px 600px at 110% 100%,rgba(16,185,129,0.06),transparent 60%),#0F0F14"
    : "radial-gradient(circle at 87% 12%,rgba(254,202,202,0.30),transparent 45%),radial-gradient(900px 600px at 3% 106%,rgba(253,230,138,0.28),transparent 50%),#F7F5F2";

  return (<div className={dark?"dark":""}>
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden font-figtree" style={{background:bg,backgroundAttachment:"fixed"}}>
      <TopBar dark={dark} toggle={toggle} view={view} setView={setView} accts={accts} acct={acct} setAcct={setAcct} query={query} setQuery={setQuery}/>
      <div className="w-full max-w-[1920px] mx-auto px-5 md:px-10 pt-4 md:pt-8 pb-24 md:pb-10 flex flex-col gap-5 md:gap-6">
        {view==="dashboard" && <Dashboard ts={ts} jstats={jstats} live={live} acct={acct}/>}
        {view==="journal" && <Journal trades={journal} stats={jstats} reload={loadJ} query={query}/>}
        {(view==="analytics"||view==="calendar"||view==="settings") && <ComingSoon view={view}/>}
      </div>
      <MobileNav view={view} setView={setView}/>
    </div>
  </div>);
}

/* ============ TOP BAR ============ */
function TopBar({dark,toggle,view,setView,accts,acct,setAcct,query,setQuery}){
  const [open,setOpen]=useState(false);
  const acctLabel=acct?`${acct.name} (${acct.id})`:"No account";
  const onSearch=(v)=>{setQuery(v);if(v&&view!=="journal")setView("journal");};
  return (<>
    {/* DESKTOP */}
    <div className="hidden md:flex sticky top-0 z-30 self-stretch px-8 py-4 bg-white/40 dark:bg-neutral-900/60 border-b border-white/20 dark:border-amber-500/20 backdrop-blur-lg justify-between items-center">
      <div className="flex items-center gap-5">
        <Logo dark={dark} className="h-11 w-auto"/>
        <div className="px-4 py-2 bg-black/5 dark:bg-white/10 rounded-[100px] outline outline-1 outline-transparent dark:outline-white/10 flex items-center gap-2">
          <Ico.search width="14" height="14" className="text-zinc-600 dark:text-zinc-400"/>
          <input value={query} onChange={e=>onSearch(e.target.value)} placeholder="Search setups..." className="bg-transparent outline-none text-xs font-figtree text-gray-900 dark:text-white placeholder:text-zinc-400 w-40"/>
          {query&&<button onClick={()=>setQuery("")} className="text-zinc-400 text-xs leading-none">×</button>}
        </div>
      </div>
      <div className="p-1 bg-black/0 dark:bg-white/5 rounded-[100px] outline outline-1 outline-offset-[-1px] outline-black/5 dark:outline-white/10 flex items-center gap-2">
        {DESK_NAV.map(([k,label])=>(
          <button key={k} onClick={()=>setView(k)} className={"px-4 py-2.5 rounded-[100px] transition "+(view===k?"bg-gradient-to-br from-amber-400 to-amber-500 shadow-[0px_4px_12px_0px_rgba(242,169,34,0.25)]":"")}>
            <span className={"text-sm font-outfit "+(view===k?"text-white font-semibold":"text-zinc-600 dark:text-zinc-600 font-medium")}>{label}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <button onClick={()=>setOpen(o=>!o)} className="px-4 py-2 bg-amber-500/10 rounded-[100px] outline outline-1 outline-offset-[-1px] outline-amber-500/20 flex items-center gap-2 max-w-[220px]">
            <span className="text-amber-500 text-xs font-bold font-figtree truncate">{acctLabel}</span>
            <span className="text-amber-500 text-[10px]">▾</span>
          </button>
          {open&&accts.accounts&&accts.accounts.length>0&&(
            <div className="absolute top-11 right-0 min-w-[240px] p-1.5 rounded-xl bg-white dark:bg-gray-900 outline outline-1 outline-black/10 dark:outline-white/10 shadow-xl z-40">
              {accts.accounts.map(a=>(<button key={a.id} onClick={()=>{setAcct(a);setOpen(false);}} className="block w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/5">{a.name} ({a.id})</button>))}
            </div>
          )}
        </div>
        <button onClick={toggle} className="h-8 w-8 p-2 bg-black/5 dark:bg-white/5 rounded-[100px] outline outline-1 outline-offset-[-1px] outline-black/10 dark:outline-white/10 grid place-items-center text-gray-700 dark:text-white/70" aria-label="theme">
          {dark?<Ico.moon width="15" height="15"/>:<Ico.sun width="15" height="15"/>}
        </button>
        <div className="flex items-center gap-2.5">
          <Avatar className="size-9"/>
          <div className="flex flex-col">
            <span className="text-gray-900 dark:text-white text-xs font-semibold font-outfit">Rohit Kalyana</span>
            <span className="text-zinc-400 text-xs font-figtree">Futures Trader</span>
          </div>
        </div>
      </div>
    </div>
    {/* MOBILE top */}
    <div className="md:hidden sticky top-0 z-30 flex flex-col">
      <div className="px-5 py-3 flex justify-between items-center backdrop-blur-lg bg-white/30 dark:bg-neutral-900/50 border-b border-white/10 dark:border-amber-500/15">
        <Logo dark={dark} className="h-8 w-auto"/>
        <div className="flex items-center gap-2.5">
          <button onClick={toggle} className="p-1.5 bg-black/5 dark:bg-white/5 rounded-[100px] grid place-items-center text-gray-900 dark:text-white" aria-label="theme">
            {dark?<Ico.moon width="16" height="16"/>:<Ico.sun width="16" height="16"/>}
          </button>
          <Avatar className="size-7"/>
        </div>
      </div>
      <div className="px-5 py-1.5 backdrop-blur-lg bg-white/20 dark:bg-neutral-900/40">
        <button onClick={()=>setOpen(o=>!o)} className="px-2.5 py-1 bg-amber-500/10 rounded-[100px] outline outline-[0.5px] outline-offset-[-0.5px] outline-amber-500 flex items-center gap-1.5">
          <span className="text-amber-500 text-xs font-bold font-figtree">{acctLabel}</span><span className="text-amber-500 text-[9px]">▾</span>
        </button>
        {open&&accts.accounts&&accts.accounts.length>0&&(
          <div className="mt-1.5 p-1.5 rounded-xl bg-white dark:bg-gray-900 outline outline-1 outline-black/10 dark:outline-white/10 shadow-xl">
            {accts.accounts.map(a=>(<button key={a.id} onClick={()=>{setAcct(a);setOpen(false);}} className="block w-full text-left px-3 py-2 rounded-lg text-xs text-gray-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/5">{a.name} ({a.id})</button>))}
          </div>
        )}
      </div>
    </div>
  </>);
}
function MobileNav({view,setView}){
  return (<div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-white/5 flex flex-col">
    <div className="px-2 py-2.5 flex justify-between items-center">
      {MOB_NAV.map(([k,label,ic])=>{const I=Ico[ic];const on=view===k;return(
        <button key={k} onClick={()=>setView(k)} className="w-16 flex flex-col items-center gap-1">
          <I width="20" height="20" className={on?"text-amber-500":"text-zinc-400"}/>
          <span className={"text-[10px] font-outfit "+(on?"text-amber-500 font-semibold":"text-zinc-400")}>{label}</span>
        </button>);})}
    </div>
    <div className="py-2 flex justify-center"><div className="w-28 h-[5px] bg-zinc-400 rounded-[100px]"/></div>
  </div>);
}

/* ============ shared class tokens ============ */
const CARD="bg-white/70 dark:bg-gray-900/75 rounded-3xl outline outline-1 outline-offset-[-1px] outline-black/10 dark:outline-white/5 backdrop-blur-xl shadow-[0px_8px_24px_0px_rgba(11,12,16,0.06)] dark:shadow-none";
const CARD2="bg-white/70 dark:bg-gray-900/75 rounded-2xl outline outline-1 outline-offset-[-1px] outline-gray-200 dark:outline-white/5";
const HEAD="text-gray-900 dark:text-white";
const MUT="text-zinc-600 dark:text-slate-400";
const FAINT="text-zinc-400";
const WIN="text-green-700 dark:text-emerald-500";
const LOSS="text-red-600 dark:text-rose-500";

/* ============ DASHBOARD ============ */
function Dashboard({ts,jstats,live,acct}){
  const now=new Date();
  const dateStr=now.toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})+" • "+now.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  return (<>
    <div className="flex justify-between items-end gap-3 md:pb-2">
      <div className={"text-2xl md:text-3xl font-bold font-outfit "+HEAD}>Overview</div>
      <div className="px-2.5 md:px-4 py-1 md:py-2 bg-white/60 dark:bg-gray-900/75 rounded-lg md:rounded-xl outline outline-1 outline-offset-[-1px] outline-gray-200 dark:outline-white/5">
        <span className={"text-xs font-figtree "+MUT}>{dateStr}</span>
      </div>
    </div>
    <div className="flex flex-col lg:flex-row items-stretch gap-5 md:gap-6">
      <EquityCard acct={acct} ts={ts}/>
      <LiveSignal live={live}/>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-5">
      <Kpi label="Average Win" mlabel="Avg Win" value={ts.avgWin!=null?"+"+money(ts.avgWin):"—"} icon="up" tone="win"/>
      <Kpi label="Average Loss" mlabel="Avg Loss" value={ts.avgLoss!=null?money(ts.avgLoss):"—"} icon="down" tone="loss"/>
      <Kpi label="Win Rate (%)" mlabel="Win Rate" value={ts.decided?`${(ts.winRate*100).toFixed(1)}%`:"—"} icon="pct"/>
      <Kpi label="Risk Reward Ratio" mlabel="Risk Reward" value={ts.rr!=null?`+${ts.rr.toFixed(2)}R`:"—"} icon="act"/>
    </div>
    <div className="flex flex-col lg:flex-row items-stretch gap-5 md:gap-6">
      <StrategyCard groups={jstats.groups}/>
      <SessionCard rows={ts.sessions} empty={!ts.decided}/>
    </div>
    <CalendarCard days={ts.calendar}/>
  </>);
}

function EquityCard({acct,ts}){
  const [range,setRange]=useState("1W");
  const bal=acct?acct.balance:null;
  return (<div className={"flex-1 p-4 md:p-7 flex flex-col gap-4 md:gap-5 "+CARD2+" md:rounded-3xl"}>
    <div className="flex justify-between items-center gap-3">
      <div className="flex flex-col gap-0.5 md:gap-1">
        <span className={"text-xs font-medium font-figtree "+MUT}>Total Account Balance</span>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={"text-xl md:text-4xl font-bold font-outfit "+HEAD}>{bal!=null?money(bal):"—"}</span>
          {ts.pnlPct!=null&&(<span className={"px-2.5 py-1 rounded-[100px] text-xs font-semibold font-outfit inline-flex items-center gap-1 "+(ts.pnlPct>=0?"bg-green-700/10 dark:bg-emerald-500/10 "+WIN:"bg-red-600/10 dark:bg-rose-500/10 "+LOSS)}>{ts.pnlPct>=0?"▲ +":"▼ "}{ts.pnlPct.toFixed(1)}%</span>)}
        </div>
      </div>
      <div className="p-1 bg-gray-100 dark:bg-gray-900/70 rounded-[100px] flex gap-0.5 md:gap-1 flex-shrink-0">
        {["1D","1W","1M","ALL"].map((r,i)=>(<button key={r} onClick={()=>setRange(r)} className={"px-2 md:px-3 py-1 md:py-1.5 rounded-[100px] text-[10px] md:text-xs font-semibold font-outfit "+(range===r?"bg-amber-400 dark:bg-amber-500 text-white dark:text-black":MUT)+(i===0?" hidden md:block":"")}>{r}</button>))}
      </div>
    </div>
    <Equity series={ts.equity}/>
    <div className="h-px bg-black/5 dark:bg-white/5"/>
    <div className="flex flex-col gap-1.5 md:gap-2">
      <div className="flex justify-between items-center">
        <span className={"text-xs font-figtree "+MUT}>Max Drawdown Allocation</span>
        <span className={"text-xs font-semibold font-figtree "+(ts.netPnl>=0?WIN:LOSS)}>{ts.decided?`${money(ts.netPnl)} net P&L`:"—"}</span>
      </div>
      <div className="h-2 bg-black/5 dark:bg-gray-900/70 rounded-[100px] overflow-hidden"><div className="h-full bg-amber-400 dark:bg-amber-500" style={{width:ts.decided?`${Math.min(100,Math.max(6,Math.abs(ts.netPnl)/50))}%`:"0%"}}/></div>
    </div>
  </div>);
}

function LiveSignal({live}){
  const done=live?STEP_KEYS.filter(k=>live.steps?.[k]).length:0;const pct=Math.round((done/6)*100);
  return (<div className={"flex-1 p-4 md:p-7 flex flex-col gap-3 md:gap-6 bg-white/70 dark:bg-gray-900/75 rounded-2xl md:rounded-3xl outline outline-1 outline-offset-[-1px] outline-black/10 dark:outline-amber-500/20 backdrop-blur-xl shadow-[0px_8px_24px_0px_rgba(11,12,16,0.06)] dark:shadow-[0px_8px_24px_0px_rgba(245,166,35,0.07)]"}>
    <div className="flex justify-between items-center">
      <span className="px-2 md:px-3 py-1 md:py-1.5 bg-green-700/10 dark:bg-emerald-500/10 rounded-[100px] outline outline-1 outline-offset-[-1px] outline-green-700/20 dark:outline-emerald-500/20 text-[10px] md:text-xs font-semibold font-outfit uppercase text-green-700 dark:text-emerald-500">Active Setup</span>
      <span className="text-amber-500 text-xs md:text-base font-bold font-figtree">{live?.receivedAt?new Date(live.receivedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"—"}</span>
    </div>
    {live?(<>
      <div className="flex flex-col gap-1 md:gap-1.5">
        <span className={"text-2xl md:text-3xl font-extrabold font-outfit "+HEAD}>{live.direction||"WATCHING"} {live.symbol||live.strongPair||""}</span>
        <span className={"text-xs md:text-sm font-figtree leading-5 "+MUT}>{live.sweptLevel?`Swept ${live.sweptLevel} — bullish displacement on setup`:"Monitoring for a setup."}</span>
      </div>
      {live.entry!=null&&(<div className="flex flex-col gap-2 md:gap-3">
        <div className="flex gap-2 md:gap-3"><Tile l="Entry Level" v={live.entry}/><Tile l="Stop Loss" v={live.sl} c={LOSS}/></div>
        <div className="flex gap-2 md:gap-3"><Tile l="Target" v={live.tp} c={WIN}/><Tile l="Risk:Reward" v={live.rr?`${live.rr} : 1`:"—"} c="text-amber-500"/></div>
      </div>)}
      <div className="flex flex-col gap-1.5 md:gap-2">
        <div className="flex gap-1">{STEP_KEYS.map(k=><div key={k} className={"flex-1 h-1 md:h-1.5 rounded-[100px] "+(live.steps?.[k]?"bg-amber-500":"bg-black/10 dark:bg-white/10")}/>)}</div>
        <span className={"text-[10px] md:text-xs font-figtree "+FAINT}>Progress to profit target ({pct}%)</span>
      </div>
    </>):(<div className="flex flex-col gap-1.5 py-4"><span className={"text-2xl md:text-3xl font-extrabold font-outfit "+FAINT}>No signal</span><span className={"text-sm font-figtree "+MUT}>Waiting on the TradingView feed.</span></div>)}
  </div>);
}
function Tile({l,v,c}){return <div className="flex-1 p-2 md:p-3 rounded-lg md:rounded-xl bg-black/0 dark:bg-gray-900/70 outline outline-1 outline-offset-[-1px] outline-black/5 dark:outline-white/5 flex flex-col gap-0.5 md:gap-1"><span className={"text-[10px] md:text-xs font-figtree "+FAINT}>{l}</span><span className={"text-xs md:text-sm font-bold md:font-semibold font-outfit md:font-figtree "+(c||HEAD)}>{v}</span></div>;}

function Kpi({label,mlabel,value,icon,tone}){
  const I=Ico[icon];const vc=tone==="win"?WIN:tone==="loss"?LOSS:HEAD;
  return (<div className={"p-3 md:p-5 flex flex-col gap-2 md:gap-3 "+CARD2+" md:rounded-3xl md:outline-black/10 md:dark:outline-white/5"}>
    <div className="flex justify-between items-center">
      <span className={"text-xs font-medium font-figtree "+MUT}><span className="md:hidden">{mlabel}</span><span className="hidden md:inline">{label}</span></span>
      <span className="hidden md:inline-flex p-1.5 bg-black/5 dark:bg-gray-900/70 rounded-lg text-amber-500"><I width="16" height="16"/></span>
    </div>
    <span className={"text-lg md:text-3xl font-bold font-outfit md:font-figtree "+vc}>{value}</span>
  </div>);
}

function StrategyCard({groups}){
  const TAG={"Manual":"bg-amber-500 text-white dark:text-black","Phase 4":"bg-green-700 dark:bg-emerald-500 text-white","Phase 3":"bg-red-600 dark:bg-rose-500 text-white","Phase 2":"bg-purple-800 text-white"};
  return (<div className={"flex-1 p-4 md:p-7 flex flex-col gap-3 md:gap-5 "+CARD2+" md:rounded-3xl md:outline-black/10 md:dark:outline-white/5"}>
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-0.5">
      <span className={"text-lg font-bold md:font-semibold font-outfit "+HEAD}>Performance by Strategy</span>
      <span className={"text-xs font-figtree "+MUT}>Active Models</span>
    </div>
    <div className="flex flex-col gap-2.5 md:gap-4 md:pt-3">
      {groups.length===0&&<div className={"text-sm font-figtree py-4 self-center "+FAINT}>No journal trades logged yet</div>}
      {groups.map(g=>{const pct=g.decided?Math.round((g.wins/g.decided)*100):0;return(
        <div key={g.model} className="pb-2 md:pb-3 border-b border-black/5 dark:border-white/5 flex justify-between items-center">
          {/* mobile: descriptive name */}
          <div className="md:hidden flex flex-col gap-0.5">
            <span className={"text-xs font-semibold font-outfit "+HEAD}>{MODEL_DESC[g.model]||g.model}</span>
            <span className={"text-xs font-figtree "+FAINT}>{g.wins+g.losses} trades • WR: {g.decided?pct:"—"}%</span>
          </div>
          {/* desktop: tag + wr */}
          <div className="hidden md:flex items-center gap-3">
            <span className={"px-2.5 py-1 rounded-md text-xs font-bold font-outfit "+(TAG[g.model]||"bg-amber-500 text-white")}>{g.model}</span>
            <span className={"text-sm font-medium font-figtree "+HEAD}>{g.decided?pct:"—"}% Win Rate</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className={"hidden md:inline text-xs font-figtree "+MUT}>{g.wins+g.losses} Trades</span>
            <span className={"text-sm font-bold md:font-semibold font-outfit md:font-figtree "+(g.totalR>=0?WIN:LOSS)}>{g.totalR>0?"+":""}{g.totalR.toFixed(1)}R</span>
          </div>
        </div>);})}
    </div>
  </div>);
}
function SessionCard({rows,empty}){
  const max=Math.max(1,...rows.map(r=>Math.abs(r.pnl)));
  return (<div className={"flex-1 p-4 md:p-5 flex flex-col gap-3 md:gap-4 "+CARD2+" md:rounded-3xl md:outline-black/10 md:dark:outline-white/5"}>
    <span className={"text-lg font-bold md:font-semibold font-outfit "+HEAD}>Session PnL</span>
    <div className="flex flex-col gap-2.5 md:gap-3">
      {empty&&<div className={"text-sm font-figtree py-4 self-center "+FAINT}>No closed trades on this account</div>}
      {!empty&&rows.map(r=>(<div key={r.session} className="flex flex-col gap-1 md:gap-1.5">
        <div className="flex justify-between items-start"><span className={"text-xs font-figtree "+MUT}>{SESS_LABEL[r.session]}</span><span className={"text-xs md:text-sm font-bold md:font-semibold font-outfit md:font-figtree "+(r.pnl>=0?WIN:LOSS)}>{r.pnl>=0?"+":""}{money(r.pnl)}</span></div>
        <div className="h-1.5 bg-black/5 dark:bg-gray-900/70 rounded-[100px] overflow-hidden"><div className={"h-full "+(r.pnl>=0?"bg-green-700 dark:bg-emerald-500":"bg-red-600 dark:bg-rose-500")} style={{width:`${(Math.abs(r.pnl)/max)*100}%`}}/></div>
      </div>))}
    </div>
  </div>);
}
function CalendarCard({days}){
  const weeks=[];for(let w=0;w<8;w++){const col=[];for(let d=0;d<7;d++)col.push(days[w*7+d]||{pnl:null});weeks.push(col);}
  const cell=(x)=>x&&x.pnl!=null?(x.pnl>0?"bg-green-700 dark:bg-emerald-500":x.pnl<0?"bg-red-600 dark:bg-rose-500":"bg-black/5 dark:bg-white/5"):"bg-black/5 dark:bg-white/5";
  const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  return (<div className={"p-4 md:p-7 flex flex-col gap-3 md:gap-5 "+CARD2+" md:rounded-3xl md:outline-black/10 md:dark:outline-white/5"}>
    <div className="flex justify-between items-start md:items-center gap-2">
      <div className="flex flex-col gap-1"><span className={"text-lg font-bold md:font-semibold font-outfit "+HEAD}>Win/Loss Calendar Intensity</span><span className={"text-xs font-figtree "+MUT}>Daily performance history across the current session cycle</span></div>
      <div className="hidden md:flex items-center gap-3"><span className={"text-xs font-figtree "+FAINT}>Loss</span><div className="size-3.5 bg-red-600 dark:bg-rose-500 rounded-[3px]"/><div className="size-3.5 bg-green-500 dark:bg-emerald-500 rounded-[3px]"/><span className={"text-xs font-figtree "+FAINT}>Win</span></div>
    </div>
    <div className="flex gap-2 md:gap-4 md:pt-3 overflow-x-auto">
      <div className="flex flex-col gap-1.5 md:gap-2 pt-[22px] md:pt-[27px] flex-shrink-0">{DAYS.map(d=><div key={d} className={"h-4 md:h-5 flex items-center text-[10px] md:text-xs font-figtree w-6 "+FAINT}>{d}</div>)}</div>
      <div className="flex-1 flex gap-1.5 md:gap-3 min-w-[300px]">
        {weeks.map((wk,i)=>{const f=wk[0]&&wk[0].date;const lbl=f?new Date(f+"T00:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"short"}):`W${i+1}`;return(<div key={i} className="flex-1 flex flex-col gap-1.5 md:gap-2"><span className={"text-center text-[10px] md:text-xs font-figtree "+FAINT}>{lbl}</span>{wk.map((c,j)=><div key={j} className={"h-4 md:h-5 rounded-[3px] md:rounded-sm "+cell(c)} title={c&&c.date?`${c.date}${c.pnl!=null?" "+money(c.pnl):""}`:""}/>)}</div>);})}
      </div>
    </div>
    <div className="md:hidden flex justify-center items-center gap-2"><span className={"text-xs font-figtree "+FAINT}>Loss</span><div className="size-2.5 bg-red-600 dark:bg-rose-500 rounded-xs"/><div className="size-2.5 bg-black/5 dark:bg-white/5 rounded-xs"/><div className="size-2.5 bg-green-700 dark:bg-emerald-500 rounded-xs"/><span className={"text-xs font-figtree "+FAINT}>Win</span></div>
  </div>);
}
function Equity({series}){
  if(!series||series.length<2)return <div className={"h-24 md:h-36 flex items-center justify-center text-sm font-figtree "+FAINT}>Not enough closed trades yet</div>;
  const W=680,H=144,p=6;const min=Math.min(0,...series),max=Math.max(0,...series);const rng=max-min||1;
  const x=i=>p+(i/(series.length-1))*(W-p*2);const y=v=>p+(1-(v-min)/rng)*(H-p*2);
  const line=series.map((v,i)=>`${i===0?"M":"L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area=`${line} L${x(series.length-1).toFixed(1)},${H-p} L${x(0).toFixed(1)},${H-p} Z`;
  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24 md:h-36" preserveAspectRatio="none"><defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E28D13" stopOpacity="0.22"/><stop offset="100%" stopColor="#E28D13" stopOpacity="0"/></linearGradient></defs><path d={area} fill="url(#eg)"/><path d={line} fill="none" stroke="#E28D13" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/></svg>;
}

/* ============ JOURNAL ============ */
const emptyForm={pair:"NQ1!",direction:"LONG",session:"NY_AM",entry:"",sl:"",tp:"",rr:2,outcome:"open",rResult:""};
function Journal({trades,stats,reload,query}){
  const [filter,setFilter]=useState("All");const [period,setPeriod]=useState("Daily");const [adding,setAdding]=useState(false);const [form,setForm]=useState(emptyForm);
  const filts=["All Trades","Wins","Losses","Breakeven"];
  const mfilts=["All Trades","Wins","Losses","Breakeven"];
  const q=(query||"").trim().toLowerCase();
  const filtered=trades.filter(t=>{
    if(q){const hay=`${t.pair||""} ${m} ${t.direction||""} ${SESS_FULL[t.session]||t.session||""} ${t.outcome||""}`.toLowerCase();if(!hay.includes(q))return false;}
    if(filter==="All"||filter==="All Trades")return true;if(filter==="Wins")return t.outcome==="win";if(filter==="Losses")return t.outcome==="loss";if(filter==="Breakeven"||filter==="BE")return t.outcome==="be";return true;});
  const setOutcome=async(t,o)=>{let r=t.rResult;if(o==="win"&&(r==null||r===""))r=t.rr||2;if(o==="loss")r=-1;if(o==="be")r=0;await api.jpatch(t.id,{outcome:o,rResult:r,taken:true});reload();};
  const delTrade=async(t)=>{if(!window.confirm(`Delete this ${t.pair||"trade"} ${t.direction||""} trade? This can't be undone.`))return;await api.jdel(t.id);reload();};
  const submit=async()=>{await api.jadd({...form,source:"manual",taken:form.outcome!=="open",entry:num(form.entry),sl:num(form.sl),tp:num(form.tp),rr:num(form.rr),rResult:num(form.rResult),tradedAt:new Date().toISOString().slice(0,10)});setForm(emptyForm);setAdding(false);reload();};
  return (<>
    <div className="flex justify-between items-end gap-3 md:pb-2">
      <span className={"text-2xl md:text-3xl font-bold font-outfit "+HEAD}>Trade Journal</span>
      <div className="p-[3px] md:p-0 bg-black/5 md:bg-transparent dark:bg-white/5 md:dark:bg-transparent rounded-[100px] flex items-center gap-1 md:gap-2">
        {["Daily","Weekly","Monthly","Yearly"].map((p,i)=>(<button key={p} onClick={()=>setPeriod(p)} className={"px-2 md:px-4 py-1 md:py-2 rounded-[100px] text-xs font-outfit "+(i>2?"hidden md:block ":"")+(period===p?"bg-gradient-to-br from-amber-400 to-amber-500 md:shadow-[0px_4px_8px_0px_rgba(242,169,34,0.25)] text-white font-semibold":"md:bg-black/5 md:dark:bg-white/5 md:outline md:outline-1 md:outline-offset-[-1px] md:outline-black/5 md:dark:outline-white/5 "+HEAD+" font-normal md:font-medium")}>{p}</button>))}
      </div>
    </div>
    {/* desktop filter bar */}
    <div className={"hidden md:flex p-3 gap-3 flex-wrap "+CARD2}>
      {filts.map(f=>(<button key={f} onClick={()=>setFilter(f)} className={"px-4 py-2 rounded-[100px] text-xs font-outfit "+(filter===f?"bg-gradient-to-br from-amber-400 to-amber-500 shadow-[0px_4px_8px_0px_rgba(242,169,34,0.25)] text-white font-semibold":"bg-black/5 dark:bg-white/5 outline outline-1 outline-offset-[-1px] outline-black/5 dark:outline-white/5 "+HEAD+" font-medium")}>{f}</button>))}
    </div>
    {/* mobile filter pills */}
    <div className="md:hidden flex gap-1.5 flex-wrap">
      {mfilts.map(f=>(<button key={f} onClick={()=>setFilter(f)} className={"px-3 py-1.5 rounded-[100px] text-xs font-outfit "+(filter===f?"bg-amber-500 text-white font-semibold":"bg-black/5 dark:bg-white/5 outline outline-1 outline-offset-[-1px] outline-gray-200 dark:outline-white/5 "+HEAD)}>{f}</button>))}
    </div>
    {/* stat cards */}
    <div className={"grid grid-cols-3 md:grid-cols-4 gap-4 p-3 md:p-5 "+CARD2}>
      <JK l="Total Trades" v={stats.total} amber/>
      <JK l="Win Rate" v={stats.decided?`${Math.round((stats.wins/stats.decided)*100)}%`:"—"} amber/>
      <JK l="Net R" v={`${stats.totalR>0?"+":""}${stats.totalR.toFixed(1)}R`} tone={stats.totalR>=0?"win":"loss"}/>
      <JK l="Avg R / Trade" v={stats.decided?`${stats.avgR>0?"+":""}${stats.avgR.toFixed(2)}R`:"—"} amber cls="hidden md:flex"/>
    </div>
    {/* desktop table */}
    <div className={"hidden md:block p-6 "+CARD2+" md:rounded-3xl md:outline-black/10 md:dark:outline-white/5"}>
      <div className="px-4 py-3 bg-black/5 dark:bg-white/5 rounded-xl flex items-center">
        {["Date w-28","Direction w-24","Pair w-20","Session w-28","Entry w-28 tr","Stop w-28 tr","Target w-28 tr","R Result w-24 tr","Status flex-1 tc"].map(h=>{const[t,w,al]=h.split(" ");return <div key={h} className={`${w} ${al==="tr"?"text-right":al==="tc"?"text-center":""} text-xs font-semibold font-outfit uppercase ${MUT}`}>{t}</div>;})}
      </div>
      <div className="flex flex-col gap-0.5 pt-2">
        {filtered.length===0?<div className={"text-sm font-figtree py-6 text-center "+FAINT}>No trades logged yet</div>:filtered.map((t,i)=><JRowDesk key={t.id} t={t} i={i} setOutcome={setOutcome} del={delTrade}/>)}
      </div>
    </div>
    {/* mobile cards */}
    <div className="md:hidden flex flex-col gap-2.5">
      {filtered.length===0?<div className={"text-sm font-figtree py-6 text-center "+FAINT}>No trades logged yet</div>:filtered.map(t=><JCardMob key={t.id} t={t} setOutcome={setOutcome} del={delTrade}/>)}
    </div>
    <button onClick={()=>setAdding(a=>!a)} className="fixed bottom-24 md:bottom-10 right-5 md:right-10 size-12 md:size-14 rounded-[30px] bg-gradient-to-br from-amber-500 to-amber-600 text-white grid place-items-center shadow-[0px_10px_20px_0px_rgba(245,166,35,0.33)] z-40 text-2xl">{adding?"×":"+"}</button>
    {adding&&<AddModal form={form} setForm={setForm} submit={submit} close={()=>setAdding(false)}/>}
  </>);
}
function JK({l,v,amber,tone,cls}){const c=tone==="win"?WIN:tone==="loss"?LOSS:amber?"text-amber-500":HEAD;return <div className={"flex flex-col gap-0.5 md:gap-1 "+(cls||"flex")}><span className={"text-[10px] md:text-xs font-normal font-figtree "+FAINT+" md:"+MUT}>{l}</span><span className={"text-base md:text-2xl font-bold font-outfit "+c}>{v}</span></div>;}
function JRowDesk({t,i,setOutcome,del}){
  const oc=t.outcome;const dc=t.direction==="SHORT"?LOSS:WIN;const ocC=oc==="win"?WIN:oc==="loss"?LOSS:FAINT;
  return (<div className={"px-4 py-3.5 rounded-lg flex items-center "+(i%2?"bg-black/5 dark:bg-white/5":"")}>
    <div className={"w-28 text-xs font-figtree "+MUT}>{t.tradedAt||""}</div>
    <div className="w-24"><span className={"px-2.5 py-1 rounded-[100px] text-xs font-bold font-outfit outline outline-1 outline-offset-[-1px] "+(t.direction==="SHORT"?"bg-red-600/10 dark:bg-rose-500/10 outline-red-600/20 dark:outline-rose-500/25 "+LOSS:"bg-green-700/10 dark:bg-emerald-500/10 outline-green-700/20 dark:outline-emerald-500/25 "+WIN)}>{t.direction}</span></div>
    <div className={"w-20 text-sm font-semibold font-outfit "+HEAD}>{(t.pair||"").replace("1!","")}</div>
    <div className="w-28"><span className={"px-2.5 py-1 rounded-[100px] text-xs font-figtree bg-black/5 dark:bg-white/5 "+MUT}>{SESS_FULL[t.session]||t.session}</span></div>
    <div className={"w-28 text-right text-xs font-figtree "+MUT}>{t.entry??"—"}</div>
    <div className={"w-28 text-right text-xs font-figtree "+LOSS}>{t.sl??"—"}</div>
    <div className={"w-28 text-right text-xs font-figtree "+WIN}>{t.tp??"—"}</div>
    <div className={"w-24 text-right text-xs font-bold font-figtree "+ocC}>{oc==="win"?`+${t.rResult??""}R`:oc==="loss"?`${t.rResult??-1}R`:oc==="be"?"0.0R":"—"}</div>
    <div className="flex-1 flex justify-center items-center gap-2">{oc==="open"?<span className="flex gap-1">{["win","loss","be"].map(o=><button key={o} onClick={()=>setOutcome(t,o)} className="text-[10px] w-6 h-6 rounded bg-black/5 dark:bg-white/5 text-zinc-500 hover:text-amber-500">{o==="win"?"W":o==="loss"?"L":"BE"}</button>)}</span>:<span className={"text-xs font-semibold font-outfit "+ocC}>{oc==="win"?"W":oc==="loss"?"L":"BE"}</span>}<button onClick={()=>del(t)} title="Delete trade" className="w-6 h-6 grid place-items-center rounded text-zinc-400 hover:text-red-600 dark:hover:text-rose-500 hover:bg-black/5 dark:hover:bg-white/5"><Ico.trash width="14" height="14"/></button></div>
  </div>);
}
function JCardMob({t,setOutcome,del}){
  const dc=t.direction==="SHORT"?LOSS:WIN;const oc=t.outcome;const ocC=oc==="win"?WIN:oc==="loss"?LOSS:FAINT;
  const [dx,setDx]=useState(0);const [drag,setDrag]=useState(false);const start=useRef(0);
  const onStart=e=>{start.current=e.touches[0].clientX;setDrag(true);};
  const onMove=e=>{const d=e.touches[0].clientX-start.current;setDx(Math.max(Math.min(d,0),-96));};
  const onEnd=()=>{setDrag(false);setDx(dx<=-56?-84:0);};
  return (<div className="relative overflow-hidden rounded-2xl bg-rose-500">
    <button onClick={()=>del(t)} title="Delete" className="absolute right-0 top-0 bottom-0 w-[84px] bg-rose-500 text-white flex flex-col items-center justify-center gap-1"><Ico.trash width="18" height="18"/><span className="text-[10px] font-semibold font-outfit">Delete</span></button>
    <div onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} style={{transform:`translateX(${dx}px)`,transition:drag?"none":"transform .18s ease"}} className="relative z-10 p-3 flex flex-col gap-2.5 rounded-2xl bg-white dark:bg-gray-900 outline outline-1 outline-offset-[-1px] outline-gray-200 dark:outline-white/5">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-1.5"><span className={"text-base font-bold font-outfit "+HEAD}>{(t.pair||"").replace("1!","")}</span></div>
      <div className="flex items-center gap-2"><span className={"text-xs font-figtree "+FAINT}>{t.tradedAt||""}</span><button onClick={()=>del(t)} title="Delete" className="w-6 h-6 grid place-items-center rounded text-zinc-400 hover:text-rose-500 bg-black/5 dark:bg-white/5"><Ico.trash width="13" height="13"/></button></div>
    </div>
    <div className="flex justify-between items-center">
      <span className="flex items-center gap-1"><span className={"size-1.5 rounded-[100px] "+(t.direction==="SHORT"?"bg-red-600 dark:bg-rose-500":"bg-green-700 dark:bg-emerald-500")}/><span className={"text-xs font-semibold font-outfit "+dc}>{t.direction}</span></span>
      <span className={"text-xs font-figtree "+MUT}>Entry: {t.entry??"—"}</span>
      {oc==="open"?<span className="flex gap-1">{["win","loss","be"].map(o=><button key={o} onClick={()=>setOutcome(t,o)} className="text-[10px] w-6 h-6 rounded bg-black/5 dark:bg-white/5 text-zinc-500">{o==="win"?"W":o==="loss"?"L":"BE"}</button>)}</span>:<span className={"text-sm font-bold font-outfit "+ocC}>{oc==="win"?`+${t.rResult??""}R`:oc==="loss"?`${t.rResult??-1}R`:"0R"}</span>}
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      <span className={"text-xs font-figtree "+FAINT}>Stop: {t.sl??"—"}</span><span className={"text-xs "+FAINT}>•</span><span className={"text-xs font-figtree "+FAINT}>Target: {t.tp??"—"}</span>
      <span className={"px-1.5 py-0.5 rounded-sm text-[9px] font-outfit bg-black/5 dark:bg-white/5 "+MUT}>{SESS_LABEL[t.session]||t.session}</span>
    </div>
    </div>
  </div>);
}
function AddModal({form,setForm,submit,close}){
  const set=k=>e=>setForm({...form,[k]:e.target.value});
  const inp="self-stretch px-3.5 py-2.5 bg-black/0 dark:bg-white/5 rounded-lg outline outline-1 outline-offset-[-1px] outline-black/5 dark:outline-white/10 text-gray-900 dark:text-white text-sm font-figtree w-full";
  const lab="text-zinc-600 dark:text-slate-400 text-xs font-semibold font-outfit uppercase";
  return (<div className="fixed inset-0 z-50 flex items-center md:items-center justify-center bg-gray-950/40 dark:bg-gray-950/60 p-4" onClick={close}>
    <div onClick={e=>e.stopPropagation()} className="w-full max-w-[520px] p-5 md:p-8 bg-white dark:bg-gray-900 rounded-3xl shadow-[0px_16px_32px_0px_rgba(0,0,0,0.12)] dark:shadow-[0px_16px_32px_0px_rgba(0,0,0,0.4)] outline outline-1 outline-transparent dark:outline-white/5 flex flex-col gap-5 md:gap-6 max-h-[90vh] overflow-auto">
      <div className="flex justify-between items-center"><span className={"text-xl font-bold font-outfit "+HEAD}>Add New Trade</span><button onClick={close} className="p-2 rounded-[100px] bg-black/0 dark:bg-white/5 text-zinc-600 dark:text-white text-lg leading-none">×</button></div>
      <div className="flex flex-col gap-4 md:gap-5">
        <div className="flex flex-col gap-1.5"><span className={lab}>Direction</span>
          <div className="p-1 bg-black/0 dark:bg-white/5 rounded-[10px] flex gap-1">
            {["LONG","SHORT"].map(d=><button key={d} onClick={()=>setForm({...form,direction:d})} className={"flex-1 py-2.5 rounded-lg text-xs font-semibold font-outfit "+(form.direction===d?(d==="LONG"?"bg-green-700 dark:bg-emerald-500/20 text-white dark:text-emerald-500 dark:outline dark:outline-1 dark:outline-emerald-500/25":"bg-red-600 dark:bg-rose-500/20 text-white dark:text-rose-500"):"text-zinc-600 dark:text-slate-400 font-medium")}>{d}</button>)}
          </div>
        </div>
        <div className="flex gap-3 md:gap-4">
          <label className="flex-1 flex flex-col gap-1.5"><span className={lab}>Pair / Asset</span><select className={inp} value={form.pair} onChange={set("pair")}><option>NQ1!</option><option>ES1!</option></select></label>
          <label className="flex-1 flex flex-col gap-1.5"><span className={lab}>Session</span><select className={inp} value={form.session} onChange={set("session")}>{SESSIONS.map(s=><option key={s} value={s}>{SESS_LABEL[s]}</option>)}</select></label>
        </div>
        <div className="flex gap-3"><label className="flex-1 flex flex-col gap-1.5"><span className={lab}>Entry</span><input className={inp} value={form.entry} onChange={set("entry")} placeholder="0.00"/></label><label className="flex-1 flex flex-col gap-1.5"><span className={lab}>Stop</span><input className={inp} value={form.sl} onChange={set("sl")} placeholder="0.00"/></label><label className="flex-1 flex flex-col gap-1.5"><span className={lab}>Target</span><input className={inp} value={form.tp} onChange={set("tp")} placeholder="0.00"/></label></div>
        <div className="flex gap-3"><label className="flex-1 flex flex-col gap-1.5"><span className={lab}>Outcome</span><select className={inp} value={form.outcome} onChange={set("outcome")}><option value="open">open</option><option value="win">win</option><option value="loss">loss</option><option value="be">breakeven</option></select></label><label className="flex-1 flex flex-col gap-1.5"><span className={lab}>R Result</span><input className={inp} value={form.rResult} onChange={set("rResult")} placeholder="2 / -1"/></label></div>
      </div>
      <button onClick={submit} className="py-3.5 bg-gradient-to-br from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-600 rounded-xl shadow-[0px_4px_12px_0px_rgba(242,169,34,0.20)] text-white text-base font-bold font-outfit">Add Trade</button>
    </div>
  </div>);
}

/* ============ COMING SOON ============ */
function ComingSoon({view}){
  const map={analytics:["Advanced Analytics Module","Advanced Analytics","We're polishing the final modules of our advanced analytics tools. Prepare to elevate your trade intelligence. Stay tuned!"],calendar:["Economic Calendar Module","Economic Calendar","We're polishing the final modules of our economic calendar tools. Prepare to elevate your trade intelligence. Stay tuned!"],settings:["App Settings Module","App Settings","Customize risk tolerances, session alert thresholds, and sync API keys with your brokers."]};
  const [eyebrow,title,desc]=map[view];
  return (<div className="flex-1 flex flex-col justify-center items-center py-16 md:py-28">
    <div className="w-full max-w-[620px] p-8 md:p-16 bg-white/70 dark:bg-gray-900/75 rounded-[20px] md:rounded-[32px] outline outline-1 outline-offset-[-1px] outline-gray-200 dark:outline-white/5 backdrop-blur-xl flex flex-col items-center gap-6 md:gap-8 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.03)] dark:shadow-[0px_16px_40px_0px_rgba(0,0,0,0.25)]">
      <div className="size-20 md:size-24 bg-amber-500/5 dark:bg-amber-500/10 rounded-[50px] outline outline-[1.5px] outline-offset-[-1.5px] outline-amber-500/10 dark:outline-amber-500/25 grid place-items-center">
        <div className="size-14 md:size-16 rounded-[36px] outline outline-[1.5px] outline-offset-[-1.5px] outline-amber-500 grid place-items-center text-amber-500"><Ico.chart width="26" height="26"/></div>
      </div>
      <div className="flex flex-col items-center gap-3 md:gap-4">
        <span className="px-3.5 py-1.5 bg-amber-500/10 rounded-[100px] text-amber-400 dark:text-amber-500 text-xs font-bold font-outfit uppercase">{eyebrow}</span>
        <span className={"text-3xl md:text-5xl font-extrabold font-outfit text-center "+HEAD}>Coming Soon</span>
        <span className={"text-sm md:text-base font-figtree leading-6 text-center "+MUT}>{desc}</span>
      </div>
      <div className="w-28 h-px bg-gray-200 dark:bg-white/5"/>
      <button className="px-6 py-3 bg-gray-900 dark:bg-white rounded-[100px] shadow-[0px_4px_12px_0px_rgba(0,0,0,0.12)] text-white dark:text-neutral-900 text-sm font-semibold font-outfit">Notify Me When Live</button>
    </div>
  </div>);
}

/* ============ analytics helpers ============ */
function sessOf(iso){if(!iso)return null;const d=new Date(new Date(iso).toLocaleString("en-US",{timeZone:"Europe/London"}));const h=d.getHours()+d.getMinutes()/60;if(h>=7&&h<10)return"LONDON";if(h>=13.5&&h<17)return"NY_AM";if(h>=18&&h<21.5)return"NY_PM";if(h>=0&&h<6)return"ASIA";return null;}
function ymd(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function ctDay(iso){if(!iso)return null;return ymd(new Date(new Date(iso).toLocaleString("en-US",{timeZone:"America/Chicago"})));}
function analyzeTs(trades,acct){
  const closed=trades.filter(t=>t.pnl!=null&&!t.voided);
  const sm={};SESSIONS.forEach(s=>sm[s]={session:s,pnl:0,n:0});
  let wins=0,losses=0,winSum=0,lossSum=0,net=0;const dm={};const sorted=[...closed].sort((a,b)=>new Date(a.time||a.exitedAt||a.enteredAt)-new Date(b.time||b.exitedAt||b.enteredAt));const eq=[];let run=0;
  for(const t of sorted){const p=Number(t.pnl);net+=p;run+=p;eq.push(run);if(p>0){wins++;winSum+=p;}else if(p<0){losses++;lossSum+=p;}const se=sessOf(t.time||t.exitedAt||t.enteredAt);if(se&&sm[se]){sm[se].pnl+=p;sm[se].n++;}const day=ctDay(t.time||t.exitedAt||t.enteredAt);if(day)dm[day]=(dm[day]||0)+p;}
  const decided=wins+losses;
  const cal=[];const WEEKS=8;
  const nowCT=new Date(new Date().toLocaleString("en-US",{timeZone:"America/Chicago"}));
  const dow=(nowCT.getDay()+6)%7; // 0=Mon .. 6=Sun
  const monThis=new Date(nowCT);monThis.setDate(nowCT.getDate()-dow);monThis.setHours(0,0,0,0);
  for(let w=0;w<WEEKS;w++){const wkMon=new Date(monThis);wkMon.setDate(monThis.getDate()-(WEEKS-1-w)*7);
    for(let d=0;d<7;d++){const day=new Date(wkMon);day.setDate(wkMon.getDate()+d);const k=ymd(day);const future=day>nowCT;cal.push({date:k,pnl:future?null:(dm[k]??null),future});}}
  const avgWin=wins?winSum/wins:null;const avgLoss=losses?lossSum/losses:null;
  return {decided,winRate:decided?wins/decided:0,avgWin,avgLoss,rr:(avgWin!=null&&avgLoss)?avgWin/Math.abs(avgLoss):null,netPnl:closed.length?net:null,pnlPct:(acct&&acct.balance)?(net/acct.balance)*100:null,sessions:SESSIONS.map(s=>sm[s]),calendar:cal,equity:eq};
}
function analyzeJournal(trades){
  const gm={};let wins=0,losses=0,decided=0,totalR=0;
  for(const t of trades){const m=t.model||(t.source==="manual"?"Manual":"—");gm[m]=gm[m]||{model:m,wins:0,losses:0,decided:0,totalR:0};const g=gm[m];let r=0,dec=false;if(t.outcome==="win"){r=Number(t.rResult)||0;wins++;g.wins++;dec=true;}else if(t.outcome==="loss"){r=Number(t.rResult)||-1;losses++;g.losses++;dec=true;}else if(t.outcome==="be"){r=0;dec=true;}if(dec){decided++;g.decided++;totalR+=r;g.totalR+=r;}}
  const order=m=>{const i=MODELS.indexOf(m);return i<0?9:i;};
  return {groups:Object.values(gm).sort((a,b)=>order(a.model)-order(b.model)),wins,losses,decided,total:trades.length,totalR,avgR:decided?totalR/decided:0};
}
function num(v){if(v===""||v==null)return null;const n=Number(v);return isNaN(n)?null:n;}
function money(v){if(v==null)return"—";const n=Number(v);return (n<0?"-$":"$")+Math.abs(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
