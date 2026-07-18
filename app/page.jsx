"use client";
import { useEffect, useMemo, useRef, useState } from "react";

const F = { d: "'Space Grotesk',system-ui,sans-serif", b: "'Inter',system-ui,sans-serif", m: "'JetBrains Mono',ui-monospace,monospace" };
const STEPS = [["sweep","Sweep"],["pdaTap","PDA tap"],["extSMT","Ext SMT"],["intSMT","Int SMT"],["entryModel","Entry"],["target","Target"]];
const MODELS = ["Manual","Phase 4","Phase 3","Phase 2"];
const SESSIONS = ["LONDON","NY_AM","NY_PM","ASIA"];
const NAV = [["dashboard","Dashboard","▦"],["journal","Trade Journal","▤"],["analytics","Analytics","▥"],["calendar","Economic Calendar","▣"],["settings","Account Settings","◉"]];

const j = {
  get: () => fetch("/api/journal",{cache:"no-store"}).then(r=>r.json()).then(d=>d.trades||[]),
  add: (e)=>fetch("/api/journal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)}),
  patch: (id,patch)=>fetch("/api/journal",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,patch})}),
  del: (id)=>fetch("/api/journal",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})}),
};
const ts = {
  accounts: ()=>fetch("/api/topstep",{cache:"no-store"}).then(r=>r.json()).catch(()=>({configured:false,accounts:[]})),
};

export default function Page(){
  const [theme,setTheme]=useState("dark");
  const [view,setView]=useState("dashboard");
  const [trades,setTrades]=useState([]);
  const [live,setLive]=useState(null);
  const [history,setHistory]=useState([]);
  const [accts,setAccts]=useState({configured:false,accounts:[]});
  const [acct,setAcct]=useState(null);
  const lastId=useRef(null);

  useEffect(()=>{try{const t=localStorage.getItem("rk-theme");if(t)setTheme(t);}catch{}},[]);
  const toggleTheme=()=>setTheme(t=>{const n=t==="dark"?"light":"dark";try{localStorage.setItem("rk-theme",n);}catch{}return n;});

  const loadJ=async()=>setTrades(await j.get());
  useEffect(()=>{loadJ();},[]);
  useEffect(()=>{(async()=>{const a=await ts.accounts();setAccts(a);if(a.accounts&&a.accounts.length)setAcct(a.accounts[0]);})();},[]);
  useEffect(()=>{let al=true;const poll=async()=>{try{const d=await fetch("/api/state",{cache:"no-store"}).then(r=>r.json());if(!al)return;setLive(d.latest||null);setHistory(d.history||[]);if(d.latest&&d.latest.id!==lastId.current){if(lastId.current!==null&&"Notification"in window&&Notification.permission==="granted")new Notification(`RK ${d.latest.grade||"A"}★ ${d.latest.direction||""} ${d.latest.strongPair||d.latest.symbol||""}`,{body:d.latest.session||""});lastId.current=d.latest.id;}}catch{}};poll();const t=setInterval(poll,4000);return()=>{al=false;clearInterval(t);};},[]);

  const stats=useMemo(()=>analyze(trades),[trades]);

  return (
    <div className="app" data-theme={theme}>
      <Style/>
      <Sidebar view={view} setView={setView}/>
      <div className="main">
        <TopBar theme={theme} toggleTheme={toggleTheme} accts={accts} acct={acct} setAcct={setAcct}/>
        <div className="content">
          {view==="dashboard" && <Dashboard stats={stats} live={live} history={history} acct={acct} accts={accts}/>}
          {view==="journal" && <Journal trades={trades} stats={stats} reload={loadJ}/>}
          {(view==="analytics"||view==="calendar"||view==="settings") && <ComingSoon view={view}/>}
        </div>
      </div>
    </div>
  );
}

/* ============ DASHBOARD ============ */
function Dashboard({stats,live,history,acct,accts}){
  return (<>
    <div className="row2">
      <BalanceCard acct={acct} accts={accts} stats={stats}/>
      <EvalCard acct={acct} accts={accts}/>
    </div>
    <div className="kpi4">
      <Kpi label="Average Win" value={stats.avgWin!=null?`$${stats.avgWin.toFixed(2)}`:"—"} grad="teal"/>
      <Kpi label="Average Loss" value={stats.avgLoss!=null?`-$${Math.abs(stats.avgLoss).toFixed(2)}`:"—"} tone="red"/>
      <Kpi label="Win Rate" value={stats.decided?`${Math.round((stats.wins/stats.decided)*100)}%`:"—"} grad="violet"/>
      <Kpi label="Risk Reward" value={stats.avgRR!=null?`${stats.avgRR.toFixed(1)}:1`:"—"}/>
    </div>
    <div className="row2b">
      <ActiveSetup live={live}/>
      <StrategyCard groups={stats.groups}/>
    </div>
    <div className="row3">
      <SessionCard rows={stats.sessions}/>
      <AlertHistory history={history}/>
      <HeatCard days={stats.calendar}/>
    </div>
  </>);
}

function BalanceCard({acct,accts,stats}){
  const [range,setRange]=useState("1W");
  const bal=acct?acct.balance:null;
  return (
    <div className="card balcard">
      <div className="cardtop">
        <div>
          <div className="lbl">Total Account Balance</div>
          <div className="balrow">
            <span className="balnum">{bal!=null?`$${Number(bal).toLocaleString(undefined,{minimumFractionDigits:2})}`:"—"}</span>
            {stats.netPnl!=null&&<span className={"pill "+(stats.netPnl>=0?"g":"r")}>{stats.netPnl>=0?"+":""}{stats.pnlPct?stats.pnlPct.toFixed(1):"0.0"}%</span>}
          </div>
        </div>
        <div className="rangetabs">{["1D","1W","1M","ALL"].map(r=><button key={r} className={"rt"+(range===r?" on":"")} onClick={()=>setRange(r)}>{r}</button>)}</div>
      </div>
      <Equity series={stats.equity$}/>
      <div className="ddrow"><span className="ddlbl">Max Drawdown Allocation</span><span className="ddval">{acct?"—":"connect TopStep"}</span></div>
      <div className="ddbar"><div className="ddfill" style={{width:"55%"}}/></div>
    </div>
  );
}
function EvalCard({acct,accts}){
  const on=accts.configured&&acct;
  return (
    <div className="card evalcard">
      <div className="ctitle">Evaluation Targets</div>
      {on?(
        <div className="evalgrid">
          <EvalItem l="Minimum Trading Days" v="—" teal/>
          <EvalItem l="Profit Target" v="—"/>
          <EvalItem l="Initial Balance/Loss" v="—"/>
          <EvalItem l="Max Payout" v="—"/>
          <div className="evalstatus"><span className="edot"/>Active — live data via API</div>
        </div>
      ):(
        <div className="empty">
          <p>Connect your TopStep API key to pull live balance, eval targets & trades for all your accounts.</p>
          <p className="emptysub">Add TOPSTEP_API_KEY + TOPSTEP_USERNAME in Vercel, then redeploy.</p>
        </div>
      )}
    </div>
  );
}
function EvalItem({l,v,teal}){return <div className="evalitem"><div className="el">{l}</div><div className={"ev"+(teal?" teal":"")}>{v}</div></div>;}

function Kpi({label,value,tone,grad}){
  return <div className={"card kpi"+(grad?` grad-${grad}`:"")}><div className="kl">{label}</div><div className={"kv"+(tone==="red"?" red":"")}>{value}</div></div>;
}

function ActiveSetup({live}){
  const dir=live?.direction;const c=dir==="SHORT"?"var(--red)":"var(--teal)";
  const done=live?STEPS.filter(([k])=>live.steps?.[k]).length:0;
  return (
    <div className="card setup" style={{"--c":c}}>
      <div className="setuptop">
        <span className="badge">ACTIVE SETUP</span>
        <span className="ago">{live?.receivedAt?timeAgo(live.receivedAt):"—"}</span>
      </div>
      {live?(<>
        <div className="setupdir" style={{color:c}}>{dir||"WATCHING"} {live.strongPair||live.symbol||""}{live.entry!=null?` @ ${live.entry}`:""}</div>
        <div className="setupctx">{live.sweptLevel?`Swept ${live.sweptLevel} — displacement detected.`:"Monitoring for setup."}</div>
        {live.entry!=null&&<div className="params4">
          <Prm l="Entry" v={live.entry}/><Prm l="Stop" v={live.sl}/><Prm l="Target" v={live.tp}/><Prm l="R:R Ratio" v={live.rr?`${live.rr}:1`:"—"}/>
        </div>}
        <div className="seq">{STEPS.map(([k],i)=><span key={k} className={"sq"+(live.steps?.[k]?" on":"")}/>)}</div>
        <div className="seqlbl">Current State: {done>=6?"A★ ready":done>=1?`Stage ${done}/6`:"waiting"}.</div>
      </>):(
        <div className="setupempty"><div className="setupdir" style={{color:"var(--faint)"}}>No signal</div><div className="setupctx">Waiting on the TradingView feed.</div></div>
      )}
    </div>
  );
}
function Prm({l,v}){return <div className="prm"><div className="pl">{l}</div><div className="pv">{v}</div></div>;}

function StrategyCard({groups}){
  return (
    <div className="card">
      <div className="ctitle">Performance by Strategy</div>
      <div className="strat">
        {groups.length===0&&<div className="empty2">No trades logged yet</div>}
        {groups.map(g=>{const pct=g.decided?Math.round((g.wins/g.decided)*100):0;return(
          <div className="stratrow" key={g.model}>
            <div className="donut" style={{background:g.decided?`conic-gradient(var(--teal) ${pct*3.6}deg, var(--track) 0)`:"var(--track)"}}><div className="donutin">{g.decided?pct:"—"}</div></div>
            <div className="stratmeta"><div className="sname">{g.model}</div><div className="swl">{g.wins}W - {g.losses}L</div></div>
            <span className={"rpill "+(g.totalR>=0?"g":"r")}>{g.totalR>0?"+":""}{g.totalR.toFixed(1)}R</span>
          </div>);})}
      </div>
    </div>
  );
}
function SessionCard({rows}){
  const max=Math.max(1,...rows.map(r=>Math.abs(r.totalR)));
  return (<div className="card"><div className="ctitle">Session PnL (R Value)</div><div className="sess">
    {rows.every(r=>r.total===0)&&<div className="empty2">No trades logged</div>}
    {rows.filter(r=>r.total>0).map(r=>(<div className="sessrow" key={r.session}><span className="sn">{r.session.replace("_"," ")}</span><div className="sbar"><div className="sfill" style={{width:`${(Math.abs(r.totalR)/max)*100}%`,background:r.totalR>=0?"var(--teal)":"var(--red)"}}/></div><span className={"sv "+(r.totalR>=0?"g":"r")}>{r.totalR>0?"+":""}{r.totalR.toFixed(1)}R</span></div>))}
  </div></div>);
}
function AlertHistory({history}){
  return (<div className="card"><div className="ctitle">Recent Alert History</div><div className="alist">
    {(!history||history.length===0)&&<div className="empty2">No signals yet</div>}
    {(history||[]).slice(0,6).map(s=>(<div className="arow" key={s.id}><span className="adot" style={{background:s.direction==="SHORT"?"var(--red)":"var(--teal)"}}/><span className="asym">{s.strongPair||s.symbol}</span><span className="adir">{s.direction}</span><span className="asess">{s.session}</span><span className="atime">{s.receivedAt?timeAgo(s.receivedAt):""}</span></div>))}
  </div></div>);
}
function HeatCard({days}){
  return (<div className="card"><div className="ctitle">Weekly Outcome Heatmap</div>
    <div className="heat">{days.slice(-40).map((d,i)=>{const t=d.r;const bg=t==null?"var(--track)":t>0?"var(--teal)":t<0?"var(--red)":"var(--track)";return <div key={i} className="hc" style={{background:bg,opacity:t==null?1:0.55+Math.min(0.45,Math.abs(t)*0.15)}} title={d.date+(t!=null?` ${t>0?"+":""}${t}R`:"")}/>;})}</div>
    <div className="hleg"><span className="hd" style={{background:"var(--teal)"}}/>Win Day<span className="hd" style={{background:"var(--red)"}}/>Loss Day</div>
  </div>);
}
function Equity({series}){
  if(!series||series.length<2)return <div className="chartempty">Not enough closed trades yet</div>;
  const W=680,H=150,p=10;const min=Math.min(0,...series),max=Math.max(0,...series);const rng=max-min||1;
  const x=i=>p+(i/(series.length-1))*(W-p*2);const y=v=>p+(1-(v-min)/rng)*(H-p*2);
  const line=series.map((v,i)=>`${i===0?"M":"L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area=`${line} L${x(series.length-1).toFixed(1)},${H-p} L${x(0).toFixed(1)},${H-p} Z`;const up=series[series.length-1]>=series[0];const col=up?"var(--teal)":"var(--red)";
  return <svg viewBox={`0 0 ${W} ${H}`} className="eq" preserveAspectRatio="none"><defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity="0.22"/><stop offset="100%" stopColor={col} stopOpacity="0"/></linearGradient></defs><path d={area} fill="url(#eg)"/><path d={line} fill="none" stroke={col} strokeWidth="2.5" strokeLinejoin="round"/></svg>;
}

/* ============ JOURNAL ============ */
const emptyForm={model:"Phase 4",pair:"NQ1!",direction:"LONG",session:"NY_AM",sweptLevel:"",entry:"",sl:"",tp:"",rr:2,outcome:"open",rResult:"",notes:""};
function Journal({trades,stats,reload}){
  const [filter,setFilter]=useState("All");const [adding,setAdding]=useState(false);const [form,setForm]=useState(emptyForm);
  const filts=["All","Manual","Phase 4","Phase 3","Phase 2","Wins","Losses","BE"];
  const filtered=trades.filter(t=>{const m=t.model||(t.source==="manual"?"Manual":"—");if(filter==="All")return true;if(filter==="Wins")return t.outcome==="win";if(filter==="Losses")return t.outcome==="loss";if(filter==="BE")return t.outcome==="be";return m===filter;});
  const setOutcome=async(t,o)=>{let r=t.rResult;if(o==="win"&&(r==null||r===""))r=t.rr||2;if(o==="loss")r=-1;if(o==="be")r=0;await j.patch(t.id,{outcome:o,rResult:r,taken:true});reload();};
  const submit=async()=>{await j.add({...form,source:form.model==="Manual"?"manual":"tool",taken:form.outcome!=="open",entry:num(form.entry),sl:num(form.sl),tp:num(form.tp),rr:num(form.rr),rResult:num(form.rResult),tradedAt:new Date().toISOString().slice(0,10)});setForm(emptyForm);setAdding(false);reload();};
  return (<>
    <div className="jfilts">{filts.map(f=><button key={f} className={"jf"+(filter===f?" on":"")} onClick={()=>setFilter(f)}>{f}</button>)}</div>
    <div className="card jkpi"><K l="Total Trades" v={stats.total}/><K l="Win Rate" v={stats.decided?`${Math.round((stats.wins/stats.decided)*100)}%`:"—"}/><K l="Net R" v={`${stats.totalR>0?"+":""}${stats.totalR.toFixed(2)}R`} teal/><K l="Avg R" v={stats.decided?`${stats.avgR>0?"+":""}${stats.avgR.toFixed(2)}R`:"—"}/></div>
    <div className="card jtable">
      <div className="jhrow"><span>DATE</span><span>DIR</span><span>PAIR</span><span>MODEL</span><span>SESSION</span><span>ENTRY</span><span>STOP</span><span>TARGET</span><span>R</span><span>ST</span></div>
      {filtered.length===0?<div className="empty2" style={{padding:24}}>No trades</div>:filtered.map(t=><JRow key={t.id} t={t} setOutcome={setOutcome} onDel={async()=>{await j.del(t.id);reload();}}/>)}
    </div>
    <button className="fab" onClick={()=>setAdding(a=>!a)}>{adding?"×":"+"}</button>
    {adding&&<AddForm form={form} setForm={setForm} submit={submit}/>}
  </>);
}
function K({l,v,teal}){return <div className="jk"><div className="jkl">{l}</div><div className={"jkv"+(teal?" teal":"")}>{v}</div></div>;}
function JRow({t,setOutcome,onDel}){
  const dc=t.direction==="SHORT"?"var(--red)":"var(--teal)";const oc=t.outcome;const ocC=oc==="win"?"var(--teal)":oc==="loss"?"var(--red)":oc==="be"?"var(--faint)":"var(--faint)";
  return (<div className="jr">
    <span className="mono jd">{t.tradedAt||""}</span>
    <span className="dtag" style={{color:dc,borderColor:`color-mix(in srgb,${dc} 40%,transparent)`}}>{t.direction}</span>
    <span className="mono">{(t.pair||"").replace("1!","")}</span>
    <span className="mtag">{t.model||(t.source==="manual"?"Manual":"—")}</span>
    <span className="mono jmut">{t.session}</span>
    <span className="mono">{t.entry??"—"}</span><span className="mono jmut">{t.sl??"—"}</span><span className="mono jmut">{t.tp??"—"}</span>
    <span className="mono" style={{color:ocC,fontWeight:700}}>{oc==="win"?`+${t.rResult??""}R`:oc==="loss"?`${t.rResult??-1}R`:oc==="be"?"0.00R":"—"}</span>
    <span className="stcell"><span className="stdot" style={{background:ocC}}/>{oc==="win"?"W":oc==="loss"?"L":oc==="be"?"BE":<span className="mkg"><button onClick={()=>setOutcome(t,"win")}>W</button><button onClick={()=>setOutcome(t,"loss")}>L</button><button onClick={()=>setOutcome(t,"be")}>BE</button></span>}</span>
  </div>);
}
function AddForm({form,setForm,submit}){
  const set=k=>e=>setForm({...form,[k]:e.target.value});
  return (<div className="card addform"><div className="ctitle">Log New Trade</div><div className="fg">
    <Fld l="Model"><select className="fin" value={form.model} onChange={set("model")}>{MODELS.map(m=><option key={m}>{m}</option>)}</select></Fld>
    <Fld l="Asset"><select className="fin" value={form.pair} onChange={set("pair")}><option>NQ1!</option><option>ES1!</option></select></Fld>
    <Fld l="Direction"><select className="fin" value={form.direction} onChange={set("direction")}><option>LONG</option><option>SHORT</option></select></Fld>
    <Fld l="Session"><select className="fin" value={form.session} onChange={set("session")}>{SESSIONS.map(s=><option key={s}>{s}</option>)}</select></Fld>
    <Fld l="Entry"><input className="fin mono" value={form.entry} onChange={set("entry")} inputMode="decimal"/></Fld>
    <Fld l="Stop"><input className="fin mono" value={form.sl} onChange={set("sl")} inputMode="decimal"/></Fld>
    <Fld l="Target"><input className="fin mono" value={form.tp} onChange={set("tp")} inputMode="decimal"/></Fld>
    <Fld l="Outcome"><select className="fin" value={form.outcome} onChange={set("outcome")}><option value="open">open</option><option value="win">win</option><option value="loss">loss</option><option value="be">breakeven</option></select></Fld>
    <Fld l="R result"><input className="fin mono" value={form.rResult} onChange={set("rResult")} placeholder="2 / -1"/></Fld>
  </div><Fld l="Notes"><input className="fin" value={form.notes} onChange={set("notes")} placeholder="Swept London low..."/></Fld><button className="submit" onClick={submit}>Submit to Journal</button></div>);
}
function Fld({l,children}){return <label className="fld"><span className="fl">{l}</span>{children}</label>;}

function ComingSoon({view}){
  const t=view==="analytics"?["Analytics","Advanced trading analytics, performance insights, and custom trade metrics are on the way."]:view==="calendar"?["Economic Calendar","Stay ahead of the macro cycle with real-time global economic events and high-impact data."]:["Account Settings","Manage your API keys, accounts, and preferences here soon."];
  return (<div className="cs"><div className="csicon">◪</div><div className="cseyebrow">{t[0].toUpperCase()}</div><div className="cstitle">Coming Soon</div><div className="cssub">{t[1]}</div><button className="submit" style={{maxWidth:280}}>Notify Me</button></div>);
}

/* ============ chrome ============ */
function Sidebar({view,setView}){
  return (<aside className="sidebar"><div className="logo"><img src="/logo-white.png" alt="RKFX" className="logoimg logo-dark"/><img src="/logo-black.png" alt="RKFX" className="logoimg logo-light"/></div>
    <nav className="nav">{NAV.map(([k,label,ic])=><button key={k} className={"navitem"+(view===k?" on":"")} onClick={()=>setView(k)}><span className="navic">{ic}</span><span className="navlabel">{label}</span></button>)}</nav>
    <div className="feedstat"><span className="fsdot"/>Feed Connected</div>
  </aside>);
}
function TopBar({theme,toggleTheme,accts,acct,setAcct}){
  const [open,setOpen]=useState(false);
  return (<header className="topbar">
    <div className="search"><span className="si">⌕</span><input placeholder="Search parameters..." className="searchin"/></div>
    <div className="tbr">
      <button className="themebtn" onClick={toggleTheme}>{theme==="dark"?"◐":"☀"}</button>
      <div className="acctwrap">
        <button className="acctbtn" onClick={()=>setOpen(o=>!o)}>{acct?`${acct.name} (${acct.id})`:"No account"} ▾</button>
        {open&&accts.accounts&&accts.accounts.length>0&&<div className="acctmenu">{accts.accounts.map(a=><button key={a.id} className="acctopt" onClick={()=>{setAcct(a);setOpen(false);}}>{a.name} ({a.id})</button>)}</div>}
      </div>
      <div className="profile"><div className="pname">Rohit Kalyana</div><div className="prole">Futures Trader</div></div>
      <div className="avatar">RK</div>
    </div>
  </header>);
}

/* ============ analytics ============ */
function analyze(trades){
  const gm={},sm={};SESSIONS.forEach(s=>sm[s]={session:s,total:0,wins:0,losses:0,totalR:0});
  let wins=0,losses=0,decided=0,open=0,totalR=0,best=0,cur=0,winSum=0,winN=0,lossSum=0,lossN=0,rrSum=0,rrN=0,pnl=0;
  const eq=[],eq$=[];let run=0,run$=0;const dm={};
  const sorted=[...trades].sort((a,b)=>(a.tradedAt||a.createdAt||"").localeCompare(b.tradedAt||b.createdAt||""));
  for(const t of sorted){const m=t.model||(t.source==="manual"?"Manual":"—");gm[m]=gm[m]||{model:m,total:0,wins:0,losses:0,decided:0,totalR:0};const g=gm[m];g.total++;const s=sm[t.session];if(s)s.total++;
    let r=0,dec=false;if(t.outcome==="win"){r=Number(t.rResult)||0;wins++;g.wins++;dec=true;winSum+=r;winN++;}else if(t.outcome==="loss"){r=Number(t.rResult)||-1;losses++;g.losses++;dec=true;lossSum+=r;lossN++;}else if(t.outcome==="be"){r=0;dec=true;}else open++;
    if(t.rr){rrSum+=Number(t.rr);rrN++;}
    if(dec){decided++;g.decided++;totalR+=r;g.totalR+=r;run+=r;eq.push(run);run$+=r*100;eq$.push(run$);if(s){s.totalR+=r;if(t.outcome==="win")s.wins++;if(t.outcome==="loss")s.losses++;}if(t.outcome==="win"){cur++;best=Math.max(best,cur);}else if(t.outcome==="loss")cur=0;const day=t.tradedAt||(t.createdAt||"").slice(0,10);if(day)dm[day]=(dm[day]||0)+r;}
  }
  const order=m=>{const i=MODELS.indexOf(m);return i<0?9:i;};
  const groups=Object.values(gm).sort((a,b)=>order(a.model)-order(b.model));
  const sessions=SESSIONS.map(s=>sm[s]);
  const cal=[];const today=new Date();for(let i=55;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const k=d.toISOString().slice(0,10);cal.push({date:k,r:dm[k]??null});}
  return {groups,sessions,wins,losses,decided,open,total:trades.length,totalR,avgR:decided?totalR/decided:0,bestStreak:best,equity:eq,equity$:eq$,calendar:cal,avgWin:winN?winSum*100/winN:null,avgLoss:lossN?lossSum*100/lossN:null,avgRR:rrN?rrSum/rrN:null,netPnl:decided?run$:null,pnlPct:null};
}
function num(v){if(v===""||v==null)return null;const n=Number(v);return isNaN(n)?null:n;}
function timeAgo(iso){const s=Math.floor((Date.now()-new Date(iso))/1000);if(s<60)return"just now";if(s<3600)return`${Math.floor(s/60)}m ago`;if(s<86400)return`${Math.floor(s/3600)}h ago`;return`${Math.floor(s/86400)}d ago`;}

/* ============ styles ============ */
function Style(){return <style>{`
*{box-sizing:border-box}
.app{min-height:100vh;display:flex;font-family:${F.b}}
.app[data-theme="dark"]{--bg:#080B11;--side:rgba(11,15,22,0.7);--card:rgba(255,255,255,0.028);--cardb:rgba(255,255,255,0.065);--ink:#EAF0F7;--muted:#8A96A8;--faint:#556070;--line:rgba(255,255,255,0.06);--track:rgba(255,255,255,0.07);--input:rgba(255,255,255,0.04)}
.app[data-theme="light"]{--bg:#EDF0F6;--side:#FFFFFF;--card:#FFFFFF;--cardb:rgba(16,24,40,0.08);--ink:#0F1826;--muted:#5A6678;--faint:#94A0B2;--line:rgba(16,24,40,0.07);--track:rgba(16,24,40,0.06);--input:rgba(16,24,40,0.03)}
.app{--teal:#16E0A3;--red:#F0435C;--violet:#6E7BFF;color:var(--ink);background:var(--bg)}
.mono{font-family:${F.m}}
.sidebar{position:sticky;top:0;height:100vh;width:230px;flex-shrink:0;background:var(--side);border-right:1px solid var(--line);backdrop-filter:blur(20px);display:flex;flex-direction:column;padding:26px 16px;gap:30px;z-index:5}
.logo{display:flex;align-items:center;gap:10px;padding:0 8px}
.logomark{font-family:${F.d};font-weight:700;font-size:26px;color:var(--ink);line-height:1}
.lk{color:var(--teal)}
.logotext{font-family:${F.d};font-weight:700;font-size:18px;letter-spacing:.22em;color:var(--ink)}
.logoimg{height:38px;width:auto;display:block}
.logo-light{display:none}
.app[data-theme="light"] .logo-dark{display:none}
.app[data-theme="light"] .logo-light{display:block}
.nav{display:flex;flex-direction:column;gap:4px;flex:1}
.navitem{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:12px;border:0;background:transparent;color:var(--muted);cursor:pointer;font-family:${F.b};font-size:14px;font-weight:500;transition:.15s;text-align:left}
.navitem:hover{background:var(--card);color:var(--ink)}
.navitem.on{background:color-mix(in srgb,var(--teal) 12%,transparent);color:var(--teal);font-weight:600}
.navic{font-size:15px;width:18px}
.feedstat{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);padding:0 10px}
.fsdot{width:7px;height:7px;border-radius:50%;background:var(--teal);box-shadow:0 0 8px var(--teal)}
.main{flex:1;min-width:0}
.topbar{position:sticky;top:0;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 28px;background:color-mix(in srgb,var(--bg) 85%,transparent);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.search{display:flex;align-items:center;gap:8px;background:var(--input);border:1px solid var(--line);border-radius:12px;padding:9px 14px;width:320px;max-width:38vw}
.si{color:var(--faint)}
.searchin{background:transparent;border:0;outline:0;color:var(--ink);font-family:${F.b};font-size:13px;width:100%}
.tbr{display:flex;align-items:center;gap:14px}
.themebtn{width:38px;height:38px;border-radius:11px;border:1px solid var(--line);background:var(--card);color:var(--teal);cursor:pointer;font-size:15px}
.acctwrap{position:relative}
.acctbtn{background:color-mix(in srgb,var(--teal) 8%,transparent);border:1px solid color-mix(in srgb,var(--teal) 35%,transparent);color:var(--teal);border-radius:20px;padding:8px 16px;font-family:${F.b};font-size:13px;font-weight:600;cursor:pointer}
.acctmenu{position:absolute;top:44px;right:0;background:var(--card);border:1px solid var(--cardb);border-radius:12px;padding:6px;min-width:200px;box-shadow:0 12px 30px rgba(0,0,0,0.3);backdrop-filter:blur(20px)}
.acctopt{display:block;width:100%;text-align:left;background:transparent;border:0;color:var(--ink);padding:9px 12px;border-radius:8px;cursor:pointer;font-size:13px}
.acctopt:hover{background:var(--track)}
.profile{text-align:right}
.pname{font-size:13px;font-weight:600}.prole{font-size:11px;color:var(--muted)}
.avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--teal),var(--violet));display:grid;place-items:center;font-family:${F.m};font-weight:700;font-size:12px;color:#04140D}
.content{padding:26px 28px 60px;display:flex;flex-direction:column;gap:22px;max-width:1300px}
.card{background:var(--card);border:1px solid var(--cardb);border-radius:18px;padding:22px;box-shadow:0 8px 30px -18px rgba(0,0,0,0.6)}
.ctitle{font-family:${F.d};font-weight:600;font-size:16px;margin-bottom:16px}
.lbl,.kl,.el,.pl,.jkl,.fl{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600}
.chartempty,.empty2{color:var(--muted);font-size:13px;text-align:center;padding:24px 0}
.row2{display:grid;grid-template-columns:1.6fr 1fr;gap:22px}
.balcard{display:flex;flex-direction:column;gap:14px}
.cardtop{display:flex;justify-content:space-between;align-items:flex-start}
.balrow{display:flex;align-items:baseline;gap:12px;margin-top:8px}
.balnum{font-family:${F.d};font-weight:700;font-size:34px}
.pill{font-family:${F.m};font-size:12px;font-weight:700;padding:3px 9px;border-radius:8px}
.pill.g{color:var(--teal);background:color-mix(in srgb,var(--teal) 14%,transparent)}
.pill.r{color:var(--red);background:color-mix(in srgb,var(--red) 14%,transparent)}
.rangetabs{display:flex;gap:2px;background:var(--track);border-radius:10px;padding:3px}
.rt{font-family:${F.b};font-size:12px;font-weight:600;color:var(--muted);background:transparent;border:0;padding:6px 12px;border-radius:8px;cursor:pointer}
.rt.on{background:color-mix(in srgb,var(--teal) 90%,transparent);color:#04140D}
.eq{width:100%;height:150px;display:block}
.ddrow{display:flex;justify-content:space-between;font-size:12px}.ddlbl{color:var(--muted)}.ddval{color:var(--red);font-family:${F.m};font-weight:600}
.ddbar{height:8px;background:var(--track);border-radius:6px;overflow:hidden}.ddfill{height:100%;background:var(--red);border-radius:6px}
.evalcard{display:flex;flex-direction:column}
.evalgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.evalitem .el{margin-bottom:5px}.ev{font-family:${F.d};font-weight:600;font-size:16px}.ev.teal{color:var(--teal)}
.evalstatus{grid-column:1/-1;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:12px;margin-top:4px}
.edot{width:7px;height:7px;border-radius:50%;background:var(--teal)}
.empty{color:var(--muted);font-size:13px;line-height:1.6}.emptysub{color:var(--faint);font-size:11px;margin-top:8px}
.kpi4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.kpi{display:flex;flex-direction:column;gap:8px}
.kv{font-family:${F.d};font-weight:700;font-size:26px}.kv.red{color:var(--red)}
.grad-teal{background:linear-gradient(150deg,color-mix(in srgb,var(--teal) 16%,var(--card)),var(--card))}
.grad-teal .kv{color:var(--teal)}
.grad-violet{background:linear-gradient(150deg,color-mix(in srgb,var(--violet) 20%,var(--card)),var(--card))}
.row2b{display:grid;grid-template-columns:1.4fr 1fr;gap:22px}
.setup{border-color:color-mix(in srgb,var(--c) 55%,transparent);position:relative;overflow:hidden}
.setup::after{content:"";position:absolute;inset:-40% 0 auto 0;height:70%;background:radial-gradient(50% 100% at 30% 0%,var(--c),transparent 70%);opacity:.08}
.setuptop{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.badge{font-family:${F.d};font-weight:700;font-size:11px;color:var(--teal);background:color-mix(in srgb,var(--teal) 12%,transparent);padding:5px 9px;border-radius:6px}
.ago{font-family:${F.m};font-size:12px;color:var(--muted)}
.setupdir{font-family:${F.d};font-weight:700;font-size:30px;margin-bottom:6px}
.setupctx{font-size:13px;color:var(--muted);margin-bottom:16px}
.params4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
.prm{background:var(--input);border-radius:9px;padding:11px}.pl{margin-bottom:5px}.pv{font-family:${F.m};font-weight:700;font-size:14px}
.seq{display:flex;gap:5px;margin-bottom:8px}
.sq{flex:1;height:6px;border-radius:3px;background:var(--track)}.sq.on{background:var(--teal)}
.seqlbl{font-size:12px;color:var(--muted)}
.strat,.sess,.alist{display:flex;flex-direction:column;gap:6px}
.stratrow{display:flex;align-items:center;gap:12px;padding:8px 0}
.donut{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;flex-shrink:0}
.donutin{width:30px;height:30px;border-radius:50%;background:var(--card);display:grid;place-items:center;font-family:${F.m};font-weight:700;font-size:11px}
.app[data-theme="dark"] .donutin{background:#0C1119}
.stratmeta{flex:1}.sname{font-weight:600;font-size:14px}.swl{font-size:11px;color:var(--muted)}
.rpill{font-family:${F.m};font-weight:700;font-size:12px;padding:4px 9px;border-radius:7px}
.rpill.g{color:var(--teal);background:color-mix(in srgb,var(--teal) 12%,transparent)}.rpill.r{color:var(--red);background:color-mix(in srgb,var(--red) 12%,transparent)}
.row3{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.sessrow{display:flex;align-items:center;gap:12px;padding:6px 0}
.sn{font-size:13px;width:64px;color:var(--ink)}
.sbar{flex:1;height:8px;background:var(--track);border-radius:6px;overflow:hidden}.sfill{height:100%;border-radius:6px}
.sv{font-family:${F.m};font-weight:700;font-size:13px;width:52px;text-align:right}.sv.g{color:var(--teal)}.sv.r{color:var(--red)}
.arow{display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--line);font-size:13px}
.arow:last-child{border-bottom:0}
.adot{width:7px;height:7px;border-radius:50%;flex-shrink:0}.asym{font-weight:600}.adir{color:var(--muted);font-size:11px}.asess{margin-left:auto;font-family:${F.m};font-size:11px;color:var(--muted)}.atime{font-family:${F.m};font-size:11px;color:var(--faint);width:56px;text-align:right}
.heat{display:grid;grid-template-columns:repeat(10,1fr);gap:5px}
.hc{aspect-ratio:1;border-radius:5px;border:1px solid var(--line)}
.hleg{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);margin-top:12px}
.hd{width:11px;height:11px;border-radius:3px;display:inline-block}.hd:nth-of-type(2){margin-left:10px}
.jfilts{display:flex;gap:8px;flex-wrap:wrap}
.jf{font-family:${F.b};font-size:13px;font-weight:500;color:var(--muted);background:var(--card);border:1px solid var(--line);padding:9px 16px;border-radius:20px;cursor:pointer}
.jf.on{color:var(--teal);border-color:color-mix(in srgb,var(--teal) 45%,transparent);background:color-mix(in srgb,var(--teal) 10%,transparent)}
.jkpi{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;padding:20px 24px}
.jk .jkl{margin-bottom:6px}.jkv{font-family:${F.d};font-weight:700;font-size:24px}.jkv.teal{color:var(--teal)}
.jtable{padding:6px 8px}
.jhrow,.jr{display:grid;grid-template-columns:1fr 0.7fr 0.5fr 0.8fr 0.8fr 0.9fr 0.9fr 0.9fr 0.7fr 0.7fr;align-items:center;gap:8px;padding:12px 16px}
.jhrow{font-size:10px;letter-spacing:.06em;color:var(--faint);font-weight:600}
.jr{border-top:1px solid var(--line);font-size:13px}
.jd{font-size:12px;color:var(--muted)}.jmut{color:var(--muted)}
.dtag{font-family:${F.m};font-size:11px;font-weight:700;border:1px solid;border-radius:6px;padding:2px 7px;text-align:center;justify-self:start}
.mtag{font-family:${F.m};font-size:10px;color:var(--violet);background:color-mix(in srgb,var(--violet) 12%,transparent);border-radius:6px;padding:3px 7px;justify-self:start}
.stcell{display:flex;align-items:center;gap:6px;font-family:${F.m};font-size:12px}
.stdot{width:7px;height:7px;border-radius:50%}
.mkg{display:flex;gap:3px}.mkg button{font-family:${F.m};font-size:10px;width:22px;height:22px;border-radius:6px;background:var(--track);border:1px solid var(--line);color:var(--muted);cursor:pointer}
.fab{position:fixed;bottom:28px;right:28px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--teal),color-mix(in srgb,var(--teal) 70%,var(--violet)));border:0;color:#04140D;font-size:26px;cursor:pointer;box-shadow:0 10px 30px -6px color-mix(in srgb,var(--teal) 60%,transparent);z-index:10}
.addform{position:fixed;bottom:96px;right:28px;width:360px;max-width:calc(100vw - 40px);z-index:10;max-height:70vh;overflow:auto}
.fg{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.fld{display:flex;flex-direction:column;gap:5px;margin-top:12px}.fld:first-child{margin-top:0}
.fin{background:var(--input);border:1px solid var(--line);border-radius:9px;color:var(--ink);padding:9px 11px;font-family:${F.b};font-size:13px;width:100%}
.fin:focus{outline:2px solid var(--teal);outline-offset:1px}
.submit{margin-top:16px;width:100%;padding:12px;border:0;border-radius:11px;background:linear-gradient(135deg,var(--teal),color-mix(in srgb,var(--teal) 65%,var(--violet)));color:#04140D;font-family:${F.b};font-weight:700;font-size:14px;cursor:pointer}
.cs{max-width:520px;margin:60px auto;text-align:center;background:var(--card);border:1px solid var(--cardb);border-radius:20px;padding:44px 36px;display:flex;flex-direction:column;align-items:center;gap:10px}
.csicon{width:56px;height:56px;border-radius:50%;background:color-mix(in srgb,var(--teal) 12%,transparent);display:grid;place-items:center;color:var(--teal);font-size:22px;margin-bottom:6px}
.cseyebrow{font-family:${F.m};font-size:11px;letter-spacing:.14em;color:var(--teal)}
.cstitle{font-family:${F.d};font-weight:700;font-size:30px}
.cssub{font-size:14px;color:var(--muted);line-height:1.6;margin-bottom:8px}
@media(max-width:1080px){.row2,.row2b,.row3,.kpi4,.jkpi{grid-template-columns:1fr}.heat{grid-template-columns:repeat(10,1fr)}}
@media(max-width:720px){
.sidebar{position:fixed;bottom:0;top:auto;left:0;right:0;width:100%;height:62px;flex-direction:row;padding:0;border-right:0;border-top:1px solid var(--line);gap:0;z-index:20}
.logo,.feedstat{display:none}.nav{flex-direction:row;justify-content:space-around;width:100%}
.navitem{flex-direction:column;gap:3px;padding:8px;font-size:9px}.navlabel{font-size:9px}
.main{padding-bottom:70px}.search{width:100%;max-width:none}.profile{display:none}
.jhrow{display:none}.jr{grid-template-columns:1fr 1fr;gap:6px}
}
button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
`}</style>;}
