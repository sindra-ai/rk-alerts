"use client";
import { useEffect, useMemo, useRef, useState } from "react";

const F = { d: "'Poppins',system-ui,sans-serif", b: "'Inter',system-ui,sans-serif" };
const STEP_KEYS = ["sweep","pdaTap","extSMT","intSMT","entryModel","target"];
const MODELS = ["Phase 4","Phase 3","Phase 2","Manual"];
const SESSIONS = ["LONDON","NY_AM","NY_PM","ASIA"];

/* icons */
const Ico = {
  grid:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  book:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2z"/><path d="M12 6.5v13"/></svg>,
  chart:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>,
  cal:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>,
  gear:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>,
  sun:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>,
  moon:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>,
  search:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>,
  plus:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>,
  arrow:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M9 7h8v8"/></svg>,
};
const NAV = [["dashboard","Dashboard","grid","Dashboard"],["journal","Trade Journal","book","Journal"],["analytics","Analytics","chart","Analytics"],["calendar","Economic Calendar","cal","Calendar"],["settings","Account Settings","gear","Account"]];

const api = {
  journal:()=>fetch("/api/journal",{cache:"no-store"}).then(r=>r.json()).then(d=>d.trades||[]),
  jadd:(e)=>fetch("/api/journal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)}),
  jpatch:(id,patch)=>fetch("/api/journal",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,patch})}),
  jdel:(id)=>fetch("/api/journal",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})}),
  accounts:()=>fetch("/api/topstep",{cache:"no-store"}).then(r=>r.json()).catch(()=>({configured:false,accounts:[]})),
  trades:(id)=>fetch(`/api/topstep?accountId=${id}&days=90`,{cache:"no-store"}).then(r=>r.json()).catch(()=>({trades:[]})),
};

export default function Page(){
  const [theme,setTheme]=useState("dark");
  const [view,setView]=useState("dashboard");
  const [journal,setJournal]=useState([]);
  const [live,setLive]=useState(null);
  const [history,setHistory]=useState([]);
  const [accts,setAccts]=useState({configured:false,accounts:[]});
  const [acct,setAcct]=useState(null);
  const [tsTrades,setTsTrades]=useState([]);
  const [loadingTrades,setLoadingTrades]=useState(false);
  const lastId=useRef(null);

  useEffect(()=>{try{const t=localStorage.getItem("rk-theme");if(t)setTheme(t);}catch{}},[]);
  const toggleTheme=()=>setTheme(t=>{const n=t==="dark"?"light":"dark";try{localStorage.setItem("rk-theme",n);}catch{}return n;});

  const loadJ=async()=>setJournal(await api.journal());
  useEffect(()=>{loadJ();},[]);
  useEffect(()=>{(async()=>{const a=await api.accounts();setAccts(a);if(a.accounts&&a.accounts.length)setAcct(a.accounts[0]);})();},[]);
  useEffect(()=>{if(!acct)return;setLoadingTrades(true);api.trades(acct.id).then(r=>{setTsTrades(r.trades||[]);setLoadingTrades(false);});},[acct]);
  useEffect(()=>{let al=true;const poll=async()=>{try{const d=await fetch("/api/state",{cache:"no-store"}).then(r=>r.json());if(!al)return;setLive(d.latest||null);setHistory(d.history||[]);if(d.latest&&d.latest.id!==lastId.current){if(lastId.current!==null&&"Notification"in window&&Notification.permission==="granted")new Notification(`RK ${d.latest.grade||"A"}★ ${d.latest.direction||""} ${d.latest.strongPair||d.latest.symbol||""}`,{body:d.latest.session||""});lastId.current=d.latest.id;}}catch{}};poll();const t=setInterval(poll,4000);return()=>{al=false;clearInterval(t);};},[]);

  const ts=useMemo(()=>analyzeTs(tsTrades,acct),[tsTrades,acct]);
  const jstats=useMemo(()=>analyzeJournal(journal),[journal]);

  return (
    <div className="app" data-theme={theme}>
      <Style/>
      <Sidebar view={view} setView={setView}/>
      <div className="main">
        <TopBar theme={theme} toggleTheme={toggleTheme} accts={accts} acct={acct} setAcct={setAcct} view={view}/>
        <div className="content">
          {view==="dashboard" && <Dashboard ts={ts} jstats={jstats} live={live} history={history} acct={acct} accts={accts} loading={loadingTrades}/>}
          {view==="journal" && <Journal trades={journal} stats={jstats} reload={loadJ}/>}
          {(view==="analytics"||view==="calendar"||view==="settings") && <ComingSoon view={view}/>}
        </div>
      </div>
    </div>
  );
}

/* ===== DASHBOARD ===== */
function Dashboard({ts,jstats,live,history,acct,accts,loading}){
  return (<>
    <div className="grid-r1">
      <BalanceCard acct={acct} ts={ts}/>
      <EvalCard acct={acct} accts={accts}/>
    </div>
    <div className="grid-kpi">
      <Kpi label="Average Win" value={ts.avgWin!=null?money(ts.avgWin):"—"} grad="teal"/>
      <Kpi label="Average Loss" value={ts.avgLoss!=null?money(ts.avgLoss):"—"}/>
      <Kpi label="Win Rate" value={ts.decided?`${Math.round(ts.winRate*100)}%`:"—"} grad="violet"/>
      <Kpi label="Risk Reward" value={ts.rr!=null?`${ts.rr.toFixed(1)}:1`:"—"}/>
    </div>
    <div className="grid-r3">
      <ActiveSetup live={live}/>
      <StrategyCard groups={jstats.groups}/>
    </div>
    <div className="grid-r4">
      <SessionCard rows={ts.sessions} empty={!ts.decided}/>
      <AlertHistory history={history}/>
      <HeatCard days={ts.calendar}/>
    </div>
  </>);
}

function BalanceCard({acct,ts}){
  const [range,setRange]=useState("1W");
  const bal=acct?acct.balance:null;
  return (<div className="card balcard">
    <div className="cardtop">
      <div>
        <div className="lbl">Total Account Balance</div>
        <div className="balrow">
          <span className="balnum">{bal!=null?money(bal):"—"}</span>
          {ts.netPnl!=null&&<span className={"pill "+(ts.netPnl>=0?"g":"r")}>{ts.netPnl>=0?"+":""}{ts.pnlPct!=null?ts.pnlPct.toFixed(1):"0.0"}%</span>}
        </div>
      </div>
      <div className="rangetabs">{["1D","1W","1M","ALL"].map(r=><button key={r} className={"rt"+(range===r?" on":"")} onClick={()=>setRange(r)}>{r}</button>)}</div>
    </div>
    <Equity series={ts.equity}/>
    <div className="ddrow"><span className="ddlbl">Max Drawdown Allocation</span><span className="ddval">{ts.decided?`${money(ts.netPnl)} net P&L`:"—"}</span></div>
    <div className="ddbar"><div className="ddfill" style={{width:ts.decided?`${Math.min(100,Math.abs(ts.netPnl)/50)}%`:"0%",background:ts.netPnl>=0?"var(--teal)":"var(--red)"}}/></div>
  </div>);
}
function EvalCard({acct,accts}){
  const on=accts.configured&&acct;
  return (<div className="card evalcard">
    <div className="ctitle">Evaluation Targets</div>
    {on?(<>
      <div className="evalgrid">
        <EvalItem l="Account Balance" v={money(acct.balance)} teal/>
        <EvalItem l="Status" v={acct.canTrade===false?"Locked":"Active"}/>
        <EvalItem l="Account" v={`${acct.name}`}/>
        <EvalItem l="Type" v={acct.simulated?"Evaluation":"Funded"}/>
      </div>
      <div className="statuspill"><span className="edot"/>{acct.name} · live via TopStep API</div>
    </>):(
      <div className="empty"><p>Connect your TopStep API key to pull live balance, eval targets & trades.</p><p className="emptysub">Set TOPSTEP_API_KEY + TOPSTEP_USERNAME in Vercel (Production), then redeploy.</p></div>
    )}
  </div>);
}
function EvalItem({l,v,teal}){return <div className="evalitem"><div className="el">{l}</div><div className={"ev"+(teal?" teal":"")}>{v}</div></div>;}
function Kpi({label,value,grad}){return <div className={"card kpi"+(grad?` grad-${grad}`:"")}><div className="kl">{label}</div><div className="kv">{value}</div></div>;}

function ActiveSetup({live}){
  const dir=live?.direction;const c=dir==="SHORT"?"var(--red)":"var(--teal)";
  const done=live?STEP_KEYS.filter(k=>live.steps?.[k]).length:0;
  return (<div className="card setup" style={{"--c":c}}>
    <div className="setuptop"><span className="badge">ACTIVE SETUP</span><span className="ago">{live?.receivedAt?timeAgo(live.receivedAt):"—"}</span></div>
    {live?(<>
      <div className="setupdir" style={{color:c}}>{dir||"WATCHING"} {live.strongPair||live.symbol||""}{live.entry!=null?` @ ${live.entry}`:""}</div>
      <div className="setupctx">{live.sweptLevel?`Swept ${live.sweptLevel} — displacement detected.`:"Monitoring for a setup."}</div>
      {live.entry!=null&&<div className="params4"><Prm l="Entry" v={live.entry}/><Prm l="Stop" v={live.sl}/><Prm l="Target" v={live.tp}/><Prm l="R:R Ratio" v={live.rr?`${live.rr}:1`:"—"}/></div>}
      <div className="stepwrap"><div className="seq">{STEP_KEYS.map(k=><span key={k} className={"sq"+(live.steps?.[k]?" on":"")}/>)}</div><div className="seqlbl">Current State: {done>=6?"A★ ready — all confirmations":done>=1?`Stage ${done}/6`:"waiting for sweep"}.</div></div>
    </>):(<div className="setupempty"><div className="setupdir" style={{color:"var(--faint)"}}>No signal</div><div className="setupctx">Waiting on the TradingView feed.</div></div>)}
  </div>);
}
function Prm({l,v}){return <div className="prm"><div className="pl">{l}</div><div className="pv">{v}</div></div>;}

function StrategyCard({groups}){
  return (<div className="card"><div className="ctitle">Performance by Strategy</div><div className="strat">
    {groups.length===0&&<div className="empty2">No journal trades logged yet</div>}
    {groups.map(g=>{const pct=g.decided?Math.round((g.wins/g.decided)*100):0;return(<div className="stratrow" key={g.model}>
      <div className="ring"><span className="ringn">{g.decided?pct:"—"}%</span></div>
      <div className="stratmeta"><div className="sname">{g.model}</div><div className="swl">{g.wins}W - {g.losses}L</div></div>
      <span className={"rpill "+(g.totalR>=0?"g":"r")}>{g.totalR>0?"+":""}{g.totalR.toFixed(1)}R</span>
    </div>);})}
  </div></div>);
}
function SessionCard({rows,empty}){
  const max=Math.max(1,...rows.map(r=>Math.abs(r.pnl)));
  return (<div className="card"><div className="ctitle">Session P&L</div><div className="sess">
    {empty&&<div className="empty2">No closed trades on this account</div>}
    {!empty&&rows.map(r=>(<div className="sessrow" key={r.session}><div className="sesshead"><span className="sn">{r.session.replace("_"," ")}</span><span className={"sv "+(r.pnl>=0?"g":"r")}>{r.pnl>=0?"+":""}{money(r.pnl)}</span></div><div className="sbar"><div className="sfill" style={{width:`${(Math.abs(r.pnl)/max)*100}%`,background:r.pnl>=0?"var(--teal)":"var(--red)"}}/></div></div>))}
  </div></div>);
}
function AlertHistory({history}){
  return (<div className="card"><div className="ctitle">Recent Alert History</div><div className="alist">
    {(!history||history.length===0)&&<div className="empty2">No signals yet</div>}
    {(history||[]).slice(0,6).map(s=>(<div className="arow" key={s.id}><span className="adot" style={{background:s.direction==="SHORT"?"var(--red)":"var(--teal)"}}/><span className="asym">{s.strongPair||s.symbol}</span><span className="adir">{s.direction}</span><span className="atag">{(s.session||"").replace("_"," ")}</span><span className="atime">{s.receivedAt?timeAgo(s.receivedAt):""}</span></div>))}
  </div></div>);
}
function HeatCard({days}){
  return (<div className="card"><div className="ctitle">Weekly Outcome Heatmap</div>
    <div className="heat">{days.slice(-40).map((d,i)=>{const t=d.pnl;const bg=t==null?"var(--track)":t>0?"var(--teal)":t<0?"var(--red)":"var(--track)";return <div key={i} className="hc" style={{background:bg,opacity:t==null?1:0.75}} title={d.date+(t!=null?` ${money(t)}`:"")}/>;})}</div>
    <div className="hleg"><span className="hd" style={{background:"var(--teal)"}}/>Win Day<span className="hd hd2" style={{background:"var(--red)"}}/>Loss Day</div>
  </div>);
}
function Equity({series}){
  if(!series||series.length<2)return <div className="chartempty">Not enough closed trades yet</div>;
  const W=680,H=140,p=6;const min=Math.min(0,...series),max=Math.max(0,...series);const rng=max-min||1;
  const x=i=>p+(i/(series.length-1))*(W-p*2);const y=v=>p+(1-(v-min)/rng)*(H-p*2);
  const line=series.map((v,i)=>`${i===0?"M":"L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area=`${line} L${x(series.length-1).toFixed(1)},${H-p} L${x(0).toFixed(1)},${H-p} Z`;const up=series[series.length-1]>=0;const col=up?"var(--teal)":"var(--red)";
  return <svg viewBox={`0 0 ${W} ${H}`} className="eq" preserveAspectRatio="none"><defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity="0.22"/><stop offset="100%" stopColor={col} stopOpacity="0"/></linearGradient></defs><path d={area} fill="url(#eg)"/><path d={line} fill="none" stroke={col} strokeWidth="2.5" strokeLinejoin="round"/></svg>;
}

/* ===== JOURNAL ===== */
const emptyForm={model:"Phase 4",pair:"NQ1!",direction:"LONG",session:"NY_AM",sweptLevel:"",entry:"",sl:"",tp:"",rr:2,outcome:"open",rResult:"",notes:""};
function Journal({trades,stats,reload}){
  const [filter,setFilter]=useState("All");const [adding,setAdding]=useState(false);const [form,setForm]=useState(emptyForm);
  const filts=["All","Manual","Phase 4","Phase 3","Phase 2","Wins","Losses","BE"];
  const filtered=trades.filter(t=>{const m=t.model||(t.source==="manual"?"Manual":"—");if(filter==="All")return true;if(filter==="Wins")return t.outcome==="win";if(filter==="Losses")return t.outcome==="loss";if(filter==="BE")return t.outcome==="be";return m===filter;});
  const setOutcome=async(t,o)=>{let r=t.rResult;if(o==="win"&&(r==null||r===""))r=t.rr||2;if(o==="loss")r=-1;if(o==="be")r=0;await api.jpatch(t.id,{outcome:o,rResult:r,taken:true});reload();};
  const submit=async()=>{await api.jadd({...form,source:form.model==="Manual"?"manual":"tool",taken:form.outcome!=="open",entry:num(form.entry),sl:num(form.sl),tp:num(form.tp),rr:num(form.rr),rResult:num(form.rResult),tradedAt:new Date().toISOString().slice(0,10)});setForm(emptyForm);setAdding(false);reload();};
  return (<>
    <div className="jfilts">{filts.map(f=><button key={f} className={"jf"+(filter===f?" on":"")} onClick={()=>setFilter(f)}>{f}</button>)}</div>
    <div className="card jkpi"><K l="Total Trades" v={stats.total}/><K l="Win Rate" v={stats.decided?`${Math.round((stats.wins/stats.decided)*100)}%`:"—"}/><K l="Net R" v={`${stats.totalR>0?"+":""}${stats.totalR.toFixed(2)}R`} teal/><K l="Avg R" v={stats.decided?`${stats.avgR>0?"+":""}${stats.avgR.toFixed(2)}R`:"—"}/></div>
    <div className="card jtablecard"><div className="jtable">
      <div className="jhrow"><span>DATE</span><span>DIR</span><span>PAIR</span><span>MODEL</span><span>SESSION</span><span>ENTRY</span><span>STOP</span><span>TARGET</span><span>R</span><span>ST</span></div>
      {filtered.length===0?<div className="empty2" style={{padding:24}}>No trades</div>:filtered.map(t=><JRow key={t.id} t={t} setOutcome={setOutcome} onDel={async()=>{await api.jdel(t.id);reload();}}/>)}
    </div></div>
    <button className="fab" onClick={()=>setAdding(a=>!a)}>{adding?<span style={{fontSize:22}}>×</span>:<Ico.plus width="22" height="22"/>}</button>
    {adding&&<AddForm form={form} setForm={setForm} submit={submit} close={()=>setAdding(false)}/>}
  </>);
}
function K({l,v,teal}){return <div className="jk"><div className="jkl">{l}</div><div className={"jkv"+(teal?" teal":"")}>{v}</div></div>;}
function JRow({t,setOutcome,onDel}){
  const dc=t.direction==="SHORT"?"var(--red)":"var(--teal)";const oc=t.outcome;const ocC=oc==="win"?"var(--green)":oc==="loss"?"var(--red)":"var(--faint)";
  return (<div className="jr">
    <span className="jd">{t.tradedAt||""}</span>
    <span className="dtag" style={{color:dc,borderColor:`color-mix(in srgb,${dc} 40%,transparent)`}}>{t.direction}</span>
    <span>{(t.pair||"").replace("1!","")}</span>
    <span className="mtag">{t.model||(t.source==="manual"?"Manual":"—")}</span>
    <span className="jmut">{(t.session||"").replace("_"," ")}</span>
    <span>{t.entry??"—"}</span><span className="jmut">{t.sl??"—"}</span><span className="jmut">{t.tp??"—"}</span>
    <span style={{color:ocC,fontWeight:700}}>{oc==="win"?`+${t.rResult??""}R`:oc==="loss"?`${t.rResult??-1}R`:oc==="be"?"0.00R":"—"}</span>
    <span className="stcell">{oc==="open"?<span className="mkg"><button onClick={()=>setOutcome(t,"win")}>W</button><button onClick={()=>setOutcome(t,"loss")}>L</button><button onClick={()=>setOutcome(t,"be")}>BE</button></span>:<><span className="stdot" style={{background:ocC}}/>{oc==="win"?"W":oc==="loss"?"L":"BE"}</>}</span>
  </div>);
}
function AddForm({form,setForm,submit,close}){
  const set=k=>e=>setForm({...form,[k]:e.target.value});
  return (<div className="addform"><div className="addhead"><span className="ctitle" style={{margin:0}}>Log New Trade</span><button className="addx" onClick={close}>×</button></div>
    <div className="fg">
      <Fld l="Model"><select className="fin" value={form.model} onChange={set("model")}>{MODELS.map(m=><option key={m}>{m}</option>)}</select></Fld>
      <Fld l="Asset"><select className="fin" value={form.pair} onChange={set("pair")}><option>NQ1!</option><option>ES1!</option></select></Fld>
      <Fld l="Direction"><select className="fin" value={form.direction} onChange={set("direction")}><option>LONG</option><option>SHORT</option></select></Fld>
      <Fld l="Session"><select className="fin" value={form.session} onChange={set("session")}>{SESSIONS.map(s=><option key={s}>{s}</option>)}</select></Fld>
      <Fld l="Entry"><input className="fin" value={form.entry} onChange={set("entry")} inputMode="decimal"/></Fld>
      <Fld l="Stop"><input className="fin" value={form.sl} onChange={set("sl")} inputMode="decimal"/></Fld>
      <Fld l="Target"><input className="fin" value={form.tp} onChange={set("tp")} inputMode="decimal"/></Fld>
      <Fld l="Outcome"><select className="fin" value={form.outcome} onChange={set("outcome")}><option value="open">open</option><option value="win">win</option><option value="loss">loss</option><option value="be">breakeven</option></select></Fld>
    </div>
    <Fld l="R result"><input className="fin" value={form.rResult} onChange={set("rResult")} placeholder="2 / -1"/></Fld>
    <Fld l="Notes"><input className="fin" value={form.notes} onChange={set("notes")} placeholder="Swept London low..."/></Fld>
    <button className="submit" onClick={submit}>Submit to Journal</button>
  </div>);
}
function Fld({l,children}){return <label className="fld"><span className="fl">{l}</span>{children}</label>;}
function ComingSoon({view}){
  const t=view==="analytics"?["Analytics","Advanced trading analytics, performance insights, and custom trade metrics are on the way."]:view==="calendar"?["Economic Calendar","Stay ahead of the macro cycle with real-time global economic events and high-impact data."]:["Account Settings","Manage your API keys, accounts, and preferences here soon."];
  return (<div className="cs"><div className="csicon"><Ico.chart width="24" height="24"/></div><div className="cseyebrow">{t[0].toUpperCase()}</div><div className="cstitle">Coming Soon</div><div className="cssub">{t[1]}</div><button className="submit" style={{maxWidth:280}}>Notify Me</button></div>);
}

/* ===== chrome ===== */
function Sidebar({view,setView}){
  return (<aside className="sidebar"><div className="logo"><img src="/logo-white.png" alt="RKFX" className="logoimg logo-dark"/><img src="/logo-black.png" alt="RKFX" className="logoimg logo-light"/></div>
    <nav className="nav">{NAV.map(([k,label,ic,short])=>{const I=Ico[ic];return <button key={k} className={"navitem"+(view===k?" on":"")} onClick={()=>setView(k)}><span className="navic"><I width="20" height="20"/></span><span className="navlabel">{label}</span><span className="navlabel-sm">{short||label}</span></button>;})}</nav>
    <div className="feedstat"><span className="fsdot"/>Feed Connected</div>
  </aside>);
}
function TopBar({theme,toggleTheme,accts,acct,setAcct,view}){
  const [open,setOpen]=useState(false);
  return (<header className="topbar"><div className="topinner">
    <div className="search"><Ico.search width="17" height="17"/><input placeholder="Search parameters..." className="searchin"/></div>
    <div className="tbr">
      <button className="iconbtn" onClick={toggleTheme} aria-label="theme">{theme==="dark"?<Ico.moon width="17" height="17"/>:<Ico.sun width="17" height="17"/>}</button>
      <div className="acctwrap">
        <button className="acctbtn" onClick={()=>setOpen(o=>!o)}>{acct?`${acct.name} (${acct.id})`:"No account"} ▾</button>
        {open&&accts.accounts&&accts.accounts.length>0&&<div className="acctmenu">{accts.accounts.map(a=><button key={a.id} className="acctopt" onClick={()=>{setAcct(a);setOpen(false);}}>{a.name} ({a.id})</button>)}</div>}
      </div>
      <div className="profile"><div className="pname">Rohit Kalyana</div><div className="prole">Futures Trader</div></div>
      <div className="avatar">RK</div>
    </div>
  </div></header>);
}

/* ===== analytics ===== */
function sessOf(iso){if(!iso)return null;const d=new Date(new Date(iso).toLocaleString("en-US",{timeZone:"Europe/London"}));const h=d.getHours()+d.getMinutes()/60;if(h>=7&&h<10)return"LONDON";if(h>=13.5&&h<17)return"NY_AM";if(h>=18&&h<21.5)return"NY_PM";if(h>=0&&h<6)return"ASIA";return null;}
function analyzeTs(trades,acct){
  const closed=trades.filter(t=>t.pnl!=null&&t.exitedAt);
  const sm={};SESSIONS.forEach(s=>sm[s]={session:s,pnl:0,n:0});
  let wins=0,losses=0,winSum=0,lossSum=0,net=0;const dm={};const sorted=[...closed].sort((a,b)=>new Date(a.exitedAt||a.enteredAt)-new Date(b.exitedAt||b.enteredAt));const eq=[];let run=0;
  for(const t of sorted){const p=Number(t.pnl);net+=p;run+=p;eq.push(run);if(p>0){wins++;winSum+=p;}else if(p<0){losses++;lossSum+=p;}const se=sessOf(t.exitedAt||t.enteredAt);if(se&&sm[se]){sm[se].pnl+=p;sm[se].n++;}const day=(t.exitedAt||t.enteredAt||"").slice(0,10);if(day)dm[day]=(dm[day]||0)+p;}
  const decided=wins+losses;
  const cal=[];const today=new Date();for(let i=55;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const k=d.toISOString().slice(0,10);cal.push({date:k,pnl:dm[k]??null});}
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
function timeAgo(iso){const s=Math.floor((Date.now()-new Date(iso))/1000);if(s<60)return"just now";if(s<3600)return`${Math.floor(s/60)}m ago`;if(s<86400)return`${Math.floor(s/3600)}h ago`;return`${Math.floor(s/86400)}d ago`;}

/* ===== styles ===== */
function Style(){return <style>{`
*{box-sizing:border-box}
.app{min-height:100vh;display:flex;font-family:${F.b}}
.app[data-theme="dark"]{--bg:#060A12;--side:rgba(9,13,22,0.85);--card:rgba(12,19,34,0.8);--cardb:rgba(255,255,255,0.08);--ink:#FFFFFF;--muted:#8f9cae;--faint:#52637a;--line:rgba(255,255,255,0.08);--track:rgba(255,255,255,0.05);--input:rgba(255,255,255,0.03);--menu:#0d1420}
.app[data-theme="light"]{--bg:#EEF1F6;--side:#FFFFFF;--card:#FFFFFF;--cardb:rgba(16,24,40,0.09);--ink:#0F1826;--muted:#5A6678;--faint:#94A0B2;--line:rgba(16,24,40,0.08);--track:rgba(16,24,40,0.05);--input:rgba(16,24,40,0.03);--menu:#ffffff}
.app{--teal:#00e5bf;--green:#16c784;--red:#f0435c;--violet:#7F56D9;--maxw:2000px;color:var(--ink);background:var(--bg)}
.sidebar{position:sticky;top:0;height:100vh;width:clamp(210px,15vw,248px);flex-shrink:0;background:var(--side);border-right:1px solid var(--line);backdrop-filter:blur(20px);display:flex;flex-direction:column;padding:26px 16px;gap:28px;z-index:20}
.logo{display:flex;align-items:center;padding:0 8px 4px}
.logoimg{height:52px;width:auto;display:block}
.logo-light{display:none}
.app[data-theme="light"] .logo-dark{display:none}
.app[data-theme="light"] .logo-light{display:block}
.nav{display:flex;flex-direction:column;gap:4px;flex:1}
.navitem{display:flex;align-items:center;gap:13px;padding:12px 14px;border-radius:12px;border:0;background:transparent;color:var(--muted);cursor:pointer;font-family:${F.b};font-size:14px;font-weight:500;transition:.15s;text-align:left}
.navitem:hover{background:var(--card);color:var(--ink)}
.navitem.on{background:color-mix(in srgb,var(--teal) 12%,transparent);color:var(--teal);font-weight:600}
.navic{display:flex;align-items:center;justify-content:center;width:20px;flex-shrink:0}
.navlabel-sm{display:none}
.feedstat{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);padding:0 10px}
.fsdot{width:7px;height:7px;border-radius:50%;background:var(--teal);box-shadow:0 0 8px var(--teal)}
.main{flex:1;min-width:0;display:flex;flex-direction:column}
.topbar{position:sticky;top:0;z-index:15;background:color-mix(in srgb,var(--bg) 82%,transparent);backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}
.topinner{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px clamp(18px,2.5vw,36px);max-width:var(--maxw);margin-inline:auto}
.search{display:flex;align-items:center;gap:9px;background:var(--input);border:1px solid var(--line);border-radius:12px;padding:9px 14px;width:clamp(180px,26vw,340px);color:var(--faint)}
.searchin{background:transparent;border:0;outline:0;color:var(--ink);font-family:${F.b};font-size:13px;width:100%}
.tbr{display:flex;align-items:center;gap:clamp(10px,1.2vw,16px)}
.iconbtn{width:38px;height:38px;border-radius:11px;border:1px solid var(--line);background:var(--card);color:var(--teal);cursor:pointer;display:grid;place-items:center}
.acctwrap{position:relative}
.acctbtn{background:color-mix(in srgb,var(--teal) 8%,transparent);border:1px solid color-mix(in srgb,var(--teal) 35%,transparent);color:var(--teal);border-radius:20px;padding:9px 16px;font-family:${F.b};font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
.acctmenu{position:absolute;top:46px;right:0;background:var(--menu);border:1px solid var(--cardb);border-radius:12px;padding:6px;min-width:210px;box-shadow:0 16px 40px rgba(0,0,0,0.55);z-index:30}
.acctopt{display:block;width:100%;text-align:left;background:transparent;border:0;color:var(--ink);padding:10px 12px;border-radius:8px;cursor:pointer;font-size:13px}
.acctopt:hover{background:var(--track)}
.profile{text-align:right}
.pname{font-family:${F.d};font-size:13px;font-weight:600}.prole{font-size:11px;color:var(--muted)}
.avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--teal),var(--violet));display:grid;place-items:center;font-family:${F.d};font-weight:700;font-size:13px;color:#04140D;flex-shrink:0}
.content{padding:clamp(18px,2vw,30px) clamp(18px,2.5vw,36px) 70px;display:flex;flex-direction:column;gap:clamp(16px,1.6vw,24px);width:100%;max-width:var(--maxw);margin-inline:auto}
.card{background:var(--card);border:1px solid var(--cardb);border-radius:16px;padding:clamp(18px,1.5vw,24px);backdrop-filter:blur(7px)}
.ctitle{font-family:${F.d};font-weight:600;font-size:16px;margin-bottom:16px;color:var(--ink)}
.lbl,.kl,.el,.pl,.jkl,.fl{font-family:${F.d};font-size:12px;letter-spacing:.02em;text-transform:uppercase;color:var(--muted);font-weight:500}
.chartempty,.empty2{color:var(--muted);font-size:13px;text-align:center;padding:22px 0}
.grid-r1{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(280px,1fr);gap:clamp(16px,1.5vw,24px)}
.grid-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(14px,1.3vw,20px)}
.grid-r3{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(340px,1fr);gap:clamp(16px,1.5vw,24px)}
.grid-r4{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(16px,1.5vw,24px)}
.balcard{display:flex;flex-direction:column;gap:16px}
.cardtop{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.balrow{display:flex;align-items:baseline;gap:12px;margin-top:8px;flex-wrap:wrap}
.balnum{font-family:${F.b};font-weight:700;font-size:clamp(24px,2.2vw,30px)}
.pill{font-family:${F.b};font-size:12px;font-weight:600;padding:3px 9px;border-radius:5px}
.pill.g{color:var(--green);background:rgba(22,199,132,0.13)}.pill.r{color:var(--red);background:rgba(240,67,92,0.13)}
.rangetabs{display:flex;gap:2px;background:var(--track);border-radius:8px;padding:4px;flex-shrink:0}
.rt{font-family:${F.b};font-size:12px;font-weight:600;color:var(--muted);background:transparent;border:0;padding:5px 11px;border-radius:6px;cursor:pointer}
.rt.on{background:var(--teal);color:#04140D}
.eq{width:100%;height:clamp(120px,11vw,150px);display:block}
.ddrow{display:flex;justify-content:space-between;font-size:13px;gap:8px}.ddlbl{color:var(--muted)}.ddval{color:var(--ink);font-weight:600}
.ddbar{height:8px;background:var(--track);border-radius:100px;overflow:hidden}.ddfill{height:100%;border-radius:100px}
.evalcard{display:flex;flex-direction:column;gap:18px}
.evalgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.evalitem .el{margin-bottom:5px}.ev{font-family:${F.b};font-weight:700;font-size:16px}.ev.teal{color:var(--teal)}
.statuspill{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--ink);background:var(--input);border-radius:8px;padding:12px;margin-top:auto}
.edot{width:8px;height:8px;border-radius:50%;background:var(--teal);flex-shrink:0}
.empty{color:var(--muted);font-size:13px;line-height:1.6}.emptysub{color:var(--faint);font-size:11px;margin-top:8px}
.kpi{display:flex;flex-direction:column;gap:8px;min-width:0}
.kv{font-family:${F.b};font-weight:700;font-size:clamp(20px,1.8vw,24px)}
.grad-teal{background:linear-gradient(180deg,rgba(0,229,191,0.16),#0c1322);border-color:rgba(0,229,191,0.33)}
.grad-violet{background:linear-gradient(180deg,rgba(127,86,217,0.16),#0c1322);border-color:rgba(127,86,217,0.33)}
.app[data-theme="light"] .grad-teal{background:linear-gradient(180deg,rgba(0,229,191,0.14),#fff)}
.app[data-theme="light"] .grad-violet{background:linear-gradient(180deg,rgba(127,86,217,0.12),#fff)}
.setup{border:1.5px solid rgba(0,229,191,0.33);box-shadow:0 4px 15px rgba(0,229,191,0.12);display:flex;flex-direction:column;gap:18px}
.setuptop{display:flex;justify-content:space-between;align-items:center}
.badge{font-family:${F.b};font-weight:700;font-size:11px;color:var(--teal);background:rgba(0,229,191,0.08);padding:5px 10px;border-radius:6px}
.ago{font-size:12px;color:var(--muted)}
.setupdir{font-family:${F.d};font-weight:700;font-size:clamp(24px,2.4vw,32px)}
.setupctx{font-size:14px;color:var(--muted);margin-top:-8px}
.params4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.prm{background:var(--input);border-radius:8px;padding:12px;min-width:0}.pl{margin-bottom:5px}.pv{font-family:${F.b};font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis}
.stepwrap{display:flex;flex-direction:column;gap:8px}
.seq{display:flex;gap:4px}.sq{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,0.06)}.sq.on{background:var(--teal)}
.app[data-theme="light"] .sq{background:rgba(16,24,40,0.08)}
.seqlbl{font-size:12px;color:var(--muted)}
.strat{display:flex;flex-direction:column;gap:14px}
.stratrow{display:flex;align-items:center;gap:12px}
.ring{width:36px;height:36px;border-radius:50%;background:rgba(0,229,191,0.08);border:2px solid rgba(0,229,191,0.2);display:grid;place-items:center;flex-shrink:0}
.ringn{font-family:${F.b};font-weight:700;font-size:10px;color:var(--teal)}
.stratmeta{flex:1;min-width:0}.sname{font-family:${F.d};font-weight:600;font-size:14px}.swl{font-size:12px;color:var(--muted)}
.rpill{font-family:${F.b};font-weight:700;font-size:13px;padding:4px 10px;border-radius:6px}
.rpill.g{color:var(--green);background:rgba(22,199,132,0.13)}.rpill.r{color:var(--red);background:rgba(240,67,92,0.13)}
.sess{display:flex;flex-direction:column;gap:14px}
.sessrow{display:flex;flex-direction:column;gap:6px}
.sesshead{display:flex;justify-content:space-between;font-size:13px}.sn{color:var(--muted)}.sv{font-weight:700}.sv.g{color:var(--green)}.sv.r{color:var(--red)}
.sbar{height:6px;background:var(--track);border-radius:100px;overflow:hidden}.sfill{height:100%;border-radius:100px}
.alist{display:flex;flex-direction:column;gap:10px}
.arow{display:flex;align-items:center;gap:8px;font-size:13px}
.adot{width:6px;height:6px;border-radius:50%;flex-shrink:0}.asym{font-family:${F.d};font-weight:600}.adir{color:var(--faint);font-size:11px}.atag{margin-left:auto;font-size:10px;color:var(--muted);background:var(--input);padding:2px 6px;border-radius:4px}.atime{font-size:12px;color:var(--faint);min-width:52px;text-align:right}
.heat{display:grid;grid-template-columns:repeat(8,1fr);gap:6px}
.hc{aspect-ratio:1;border-radius:4px}
.hleg{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);margin-top:14px}
.hd{width:8px;height:8px;border-radius:2px}.hd2{margin-left:8px}
.jfilts{display:flex;gap:8px;flex-wrap:wrap}
.jf{font-family:${F.b};font-size:13px;font-weight:500;color:var(--muted);background:var(--card);border:1px solid var(--line);padding:9px 16px;border-radius:20px;cursor:pointer}
.jf.on{color:var(--teal);border-color:color-mix(in srgb,var(--teal) 45%,transparent);background:color-mix(in srgb,var(--teal) 10%,transparent)}
.jkpi{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(16px,2vw,24px);padding:20px 24px}
.jk .jkl{margin-bottom:6px}.jkv{font-family:${F.b};font-weight:700;font-size:24px}.jkv.teal{color:var(--teal)}
.jtablecard{padding:6px 8px;overflow-x:auto}
.jtable{min-width:760px}
.jhrow,.jr{display:grid;grid-template-columns:1fr 0.7fr 0.5fr 0.9fr 0.8fr 0.9fr 0.9fr 0.9fr 0.7fr 0.8fr;align-items:center;gap:8px;padding:13px 16px}
.jhrow{font-size:10px;letter-spacing:.05em;color:var(--faint);font-weight:600;font-family:${F.d}}
.jr{border-top:1px solid var(--line);font-size:13px}
.jd{font-size:12px;color:var(--muted)}.jmut{color:var(--muted)}
.dtag{font-size:11px;font-weight:700;border:1px solid;border-radius:5px;padding:2px 7px;text-align:center;justify-self:start}
.mtag{font-size:10px;color:var(--violet);background:color-mix(in srgb,var(--violet) 14%,transparent);border-radius:5px;padding:3px 7px;justify-self:start;white-space:nowrap}
.stcell{display:flex;align-items:center;gap:6px;font-size:12px}
.stdot{width:7px;height:7px;border-radius:50%}
.mkg{display:flex;gap:3px}.mkg button{font-size:10px;width:24px;height:24px;border-radius:6px;background:var(--track);border:1px solid var(--line);color:var(--muted);cursor:pointer}
.mkg button:hover{color:var(--teal);border-color:var(--teal)}
.fab{position:fixed;bottom:28px;right:28px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--teal),color-mix(in srgb,var(--teal) 60%,var(--violet)));border:0;color:#04140D;cursor:pointer;box-shadow:0 10px 30px -6px color-mix(in srgb,var(--teal) 60%,transparent);z-index:30;display:grid;place-items:center}
.addform{position:fixed;bottom:96px;right:28px;width:380px;max-width:calc(100vw - 40px);z-index:30;max-height:76vh;overflow:auto;background:var(--card);border:1px solid var(--cardb);border-radius:16px;padding:20px;box-shadow:0 24px 60px rgba(0,0,0,0.5);backdrop-filter:blur(24px)}
.addhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.addx{background:transparent;border:0;color:var(--muted);font-size:22px;cursor:pointer;line-height:1}
.fg{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.fld{display:flex;flex-direction:column;gap:6px;margin-top:12px}
.fin{background:var(--input);border:1px solid var(--line);border-radius:9px;color:var(--ink);padding:10px 12px;font-family:${F.b};font-size:14px;width:100%;height:40px}
.fin:focus{outline:2px solid var(--teal);outline-offset:1px}
select.fin{appearance:none;cursor:pointer}
.submit{margin-top:16px;width:100%;padding:12px;border:0;border-radius:11px;background:linear-gradient(135deg,var(--teal),color-mix(in srgb,var(--teal) 60%,var(--violet)));color:#04140D;font-family:${F.d};font-weight:600;font-size:14px;cursor:pointer}
.cs{max-width:520px;margin:60px auto;text-align:center;background:var(--card);border:1px solid var(--cardb);border-radius:20px;padding:44px 36px;display:flex;flex-direction:column;align-items:center;gap:10px}
.csicon{width:56px;height:56px;border-radius:50%;background:color-mix(in srgb,var(--teal) 12%,transparent);display:grid;place-items:center;color:var(--teal);margin-bottom:6px}
.cseyebrow{font-family:${F.b};font-size:11px;letter-spacing:.14em;color:var(--teal);font-weight:600}
.cstitle{font-family:${F.d};font-weight:700;font-size:30px}
.cssub{font-size:14px;color:var(--muted);line-height:1.6;margin-bottom:8px}
button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
@media(max-width:1200px){.grid-r1,.grid-r3{grid-template-columns:1fr}.grid-kpi{grid-template-columns:repeat(2,1fr)}.grid-r4{grid-template-columns:1fr}.heat{grid-template-columns:repeat(10,1fr)}}
@media(max-width:720px){
.sidebar{position:fixed;bottom:0;top:auto;left:0;right:0;width:100%;height:64px;flex-direction:row;padding:0 4px;border-right:0;border-top:1px solid var(--line);gap:0;backdrop-filter:blur(24px)}
.logo,.feedstat{display:none}
.nav{flex-direction:row;justify-content:space-around;width:100%;gap:0}
.navitem{flex-direction:column;gap:3px;padding:6px 2px;flex:1;min-width:0;justify-content:center;text-align:center}
.navlabel{display:none}
.navlabel-sm{display:block;font-size:10px;line-height:1;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.navitem.on{background:transparent;color:var(--teal)}
.main{padding-bottom:76px}
.topinner{padding:12px 14px;gap:8px}
.search{flex:1;min-width:0;width:auto}
.tbr{gap:8px;flex-shrink:0;min-width:0}
.acctwrap{min-width:0}
.acctbtn{max-width:132px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:8px 12px}
.profile{display:none}
.grid-kpi{grid-template-columns:repeat(2,1fr)}
.params4{grid-template-columns:1fr 1fr}
.heat{grid-template-columns:repeat(7,1fr)}
.jkpi{grid-template-columns:1fr 1fr}
.addform{right:12px;left:12px;bottom:80px;width:auto}
.fg{grid-template-columns:1fr}
}
`}</style>;}
