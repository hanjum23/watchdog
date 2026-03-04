import { useState, useEffect, useCallback } from "react";

/* ─── Asta brand colours — matched to asta-uk.com ─── */
const B = {
  navy:    "#1A3A5C",   // Asta primary petrol blue
  navyD:   "#0D2540",   // darker petrol
  navyL:   "#1E4068",   // lighter petrol
  gold:    "#00AEEF",   // Asta cyan/sky blue accent
  goldL:   "#33BFFF",   // lighter cyan
  goldD:   "#0090CC",   // darker cyan
  white:   "#F4F7FA",
  grey:    "#7A94AE",
  greyD:   "#3A5068",
  greyDD:  "#162D42",
  red:     "#E04040",
  green:   "#2ECC8A",
  amber:   "#E09A20",
  bg:      "#081A2E",   // deep petrol background
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

const STATUS = { UP:"UP", DOWN:"DOWN", CHECKING:"CHECKING", PENDING:"PENDING" };

function seedHistory(len=40, failRate=0.03) {
  return Array.from({length:len},(_,i)=>({
    time: Date.now()-(len-i)*55000,
    status: Math.random()>failRate ? STATUS.UP : STATUS.DOWN,
    latency: Math.floor(90+Math.random()*380),
  }));
}

const DEFAULT_SITES = [
  { id:1, name:"Asta Connect",          url:"https://connect.asta-uk.com",                                    interval:30, group:"Asta" },
  { id:2, name:"Asta Public Site",       url:"https://www.asta-uk.com",                                        interval:60, group:"Asta" },
  { id:3, name:"Dale UW Connect",        url:"https://connect.daleuw.com/logon/LogonPoint/index.html",         interval:30, group:"Syndicate" },
  { id:4, name:"Syndicate 2525 Connect", url:"https://connect.syndicate2525.co.uk/logon/LogonPoint/index.html",interval:30, group:"Syndicate" },
  { id:5, name:"Arma Underwriting",      url:"https://connect.armaunderwriting.com/vpn/index.html",            interval:30, group:"Syndicate" },
  { id:6, name:"Beat Capital Portal",    url:"https://portal.beatcapital.com/vpn/index.html",                  interval:30, group:"Syndicate" },
];

function Logo() {
  return (
    <div style={{display:"flex",alignItems:"center",gap:14}}>
      <div style={{
        width:44,height:44,borderRadius:6,
        background:`linear-gradient(135deg,${B.gold},${B.goldD})`,
        display:"flex",alignItems:"center",justifyContent:"center",
        boxShadow:`0 4px 20px ${B.gold}55`,
      }}>
        <span style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#fff",letterSpacing:-1}}>A</span>
      </div>
      <div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:B.white,letterSpacing:0.5,lineHeight:1}}>
          Asta
        </div>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:B.gold,letterSpacing:3,marginTop:3,opacity:0.9}}>
          SERVICE MONITOR
        </div>
      </div>
    </div>
  );
}

function Badge({status}) {
  const cfg = {
    [STATUS.UP]:       {bg:`${B.green}18`,color:B.green, dot:"●",label:"Online"},
    [STATUS.DOWN]:     {bg:`${B.red}18`,  color:B.red,   dot:"●",label:"Offline"},
    [STATUS.CHECKING]: {bg:`${B.gold}18`, color:B.gold,  dot:"◌",label:"Checking"},
    [STATUS.PENDING]:  {bg:`${B.grey}18`, color:B.grey,  dot:"—",label:"Pending"},
  };
  const c = cfg[status]||cfg[STATUS.PENDING];
  return (
    <span style={{
      background:c.bg,color:c.color,border:`1px solid ${c.color}33`,
      borderRadius:20,padding:"3px 12px",
      fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:500,
      animation:status===STATUS.CHECKING?"blink 1.2s infinite":"none",
      display:"inline-flex",alignItems:"center",gap:5,
    }}>
      <span style={{fontSize:8}}>{c.dot}</span>{c.label}
    </span>
  );
}

function Bars({history}) {
  return (
    <div style={{display:"flex",gap:2,alignItems:"flex-end",height:32}}>
      {history.slice(-45).map((h,i)=>(
        <div key={i}
          title={`${new Date(h.time).toLocaleTimeString()} · ${h.status}${h.latency?" · "+h.latency+"ms":""}`}
          style={{
            width:5,flex:"0 0 5px",
            height:h.status===STATUS.UP?Math.min(16+h.latency/25,32):32,
            borderRadius:2,
            background:h.status===STATUS.UP
              ? `hsl(${150-Math.min(h.latency/7,50)},65%,48%)`
              : B.red,
            opacity:0.5+i*0.012,
            transition:"height 0.4s ease",cursor:"default",
          }}
        />
      ))}
    </div>
  );
}

function StatPill({label,value,color}) {
  return (
    <div style={{textAlign:"center",minWidth:70}}>
      <div style={{fontSize:22,fontWeight:600,fontFamily:"'DM Sans',sans-serif",color:color||B.white,lineHeight:1}}>{value}</div>
      <div style={{fontSize:9,letterSpacing:2,color:B.grey,fontFamily:"'DM Mono',monospace",marginTop:3}}>{label}</div>
    </div>
  );
}

function AlertModal({onClose,alerts,setAlerts}) {
  const [form,setForm]=useState({email:"",onDown:true,onRecover:true,threshold:1});
  const [saved,setSaved]=useState(false);
  const [testState,setTestState]=useState("idle"); // idle | sending | sent | error

  const add=()=>{
    if(!form.email||!form.email.includes("@"))return;
    setAlerts(p=>[...p,{...form,id:Date.now()}]);
    setForm({email:"",onDown:true,onRecover:true,threshold:1});
    setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };

  const sendTest=async()=>{
    if(alerts.length===0){alert("Add at least one recipient first.");return;}
    setTestState("sending");
    try{
      const res=await fetch("/api/send-alert",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          recipients:alerts.map(a=>a.email),
          siteName:"Asta Connect",
          siteUrl:"https://connect.asta-uk.com",
          status:"TEST",
          latency:142,
        }),
      });
      const data=await res.json();
      setTestState(data.success?"sent":"error");
      setTimeout(()=>setTestState("idle"),4000);
    }catch(e){
      setTestState("error");
      setTimeout(()=>setTestState("idle"),4000);
    }
  };

  const inp={
    width:"100%",background:B.navyD,border:`1px solid ${B.greyDD}`,
    borderRadius:6,padding:"9px 12px",color:B.white,
    fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none",
  };

  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(7,18,36,0.88)",backdropFilter:"blur(4px)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,animation:"fadeIn 0.2s ease",
    }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{
        background:B.navyL,border:`1px solid ${B.greyDD}`,borderRadius:16,
        padding:32,width:"100%",maxWidth:480,boxShadow:`0 32px 80px ${B.navyD}`,
        borderTop:`3px solid ${B.gold}`,maxHeight:"90vh",overflowY:"auto",
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:B.white,margin:0}}>Email Alerts</h2>
            <p style={{fontSize:11,color:B.grey,fontFamily:"'DM Mono',monospace",margin:"4px 0 0",letterSpacing:1}}>
              NOTIFICATION CONFIGURATION
            </p>
          </div>
          <button onClick={onClose} style={{
            background:"none",border:`1px solid ${B.greyDD}`,color:B.grey,
            borderRadius:6,padding:"6px 12px",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:12,
          }}>✕</button>
        </div>

        <div style={{
          background:`${B.gold}0f`,border:`1px solid ${B.gold}33`,borderRadius:8,
          padding:"12px 16px",marginBottom:20,
        }}>
          <div style={{fontSize:10,color:B.gold,fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:4}}>
            SMTP CONFIGURATION REQUIRED
          </div>
          <p style={{fontSize:12,color:B.goldL,fontFamily:"'DM Sans',sans-serif",margin:0,lineHeight:1.6}}>
            To send real emails, configure an SMTP relay in the backend (e.g. your M365/Exchange relay, SendGrid, or Mailgun). Recipients added here are stored in-browser and passed to the mailer on each alert event.
          </p>
        </div>

        <div style={{marginBottom:16}}>
          <label style={{fontSize:10,letterSpacing:2,color:B.grey,fontFamily:"'DM Mono',monospace",display:"block",marginBottom:6}}>
            EMAIL ADDRESS
          </label>
          <input type="email" placeholder="you@asta-uk.com"
            value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}
            style={inp}
            onFocus={e=>e.target.style.borderColor=B.gold}
            onBlur={e=>e.target.style.borderColor=B.greyDD}
          />
        </div>

        <div style={{display:"flex",gap:20,marginBottom:16}}>
          {[{key:"onDown",label:"Alert on DOWN"},{key:"onRecover",label:"Alert on Recovery"}].map(f=>(
            <label key={f.key} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif",fontSize:13,color:B.grey}}>
              <div onClick={()=>setForm(p=>({...p,[f.key]:!p[f.key]}))} style={{
                width:18,height:18,borderRadius:4,border:`2px solid ${form[f.key]?B.gold:B.greyDD}`,
                background:form[f.key]?B.gold:"transparent",cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",
              }}>
                {form[f.key]&&<span style={{fontSize:10,color:B.navy,fontWeight:700}}>✓</span>}
              </div>
              {f.label}
            </label>
          ))}
        </div>

        <div style={{marginBottom:20}}>
          <label style={{fontSize:10,letterSpacing:2,color:B.grey,fontFamily:"'DM Mono',monospace",display:"block",marginBottom:6}}>
            ALERT AFTER N CONSECUTIVE FAILURES
          </label>
          <select value={form.threshold} onChange={e=>setForm(p=>({...p,threshold:+e.target.value}))}
            style={{...inp,cursor:"pointer"}}>
            {[1,2,3,5].map(n=><option key={n} value={n}>{n} failure{n>1?"s":""}</option>)}
          </select>
        </div>

        <button onClick={add} style={{
          width:"100%",background:`linear-gradient(135deg,${B.gold},${B.goldD})`,
          color:B.navy,border:"none",borderRadius:8,padding:"12px",
          fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:15,cursor:"pointer",
        }}>
          {saved ? "✓ Recipient Saved!" : "+ Add Alert Recipient"}
        </button>

        {alerts.length>0&&(
          <div style={{marginTop:16}}>
            <button onClick={sendTest} disabled={testState==="sending"} style={{
              width:"100%",
              background:testState==="sent"?`${B.green}22`:testState==="error"?`${B.red}22`:"transparent",
              color:testState==="sent"?B.green:testState==="error"?B.red:B.grey,
              border:`1px solid ${testState==="sent"?B.green:testState==="error"?B.red:B.greyDD}`,
              borderRadius:8,padding:"11px",cursor:testState==="sending"?"wait":"pointer",
              fontFamily:"'DM Sans',sans-serif",fontWeight:500,fontSize:14,
              transition:"all 0.3s",marginBottom:16,
            }}>
              {testState==="sending"?"⏳ Sending test email...":testState==="sent"?"✓ Test email sent! Check your inbox":testState==="error"?"✗ Send failed — check API key & sender":"🧪 Send Test Email to All Recipients"}
            </button>
          </div>
        )}

        {alerts.length>0&&(
          <div style={{marginTop:8}}>
            <div style={{fontSize:10,letterSpacing:2,color:B.grey,fontFamily:"'DM Mono',monospace",marginBottom:10}}>
              CONFIGURED RECIPIENTS ({alerts.length})
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {alerts.map(a=>(
                <div key={a.id} style={{
                  display:"flex",justifyContent:"space-between",alignItems:"center",
                  background:B.navyD,borderRadius:8,padding:"10px 14px",border:`1px solid ${B.greyDD}`,
                }}>
                  <div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:B.white}}>{a.email}</div>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:B.grey,marginTop:2}}>
                      {[a.onDown&&"Down",a.onRecover&&"Recovery"].filter(Boolean).join(" + ")} alerts · {a.threshold} failure threshold
                    </div>
                  </div>
                  <button onClick={()=>setAlerts(p=>p.filter(x=>x.id!==a.id))} style={{
                    background:"none",border:`1px solid ${B.greyDD}`,color:B.grey,
                    borderRadius:4,padding:"4px 10px",cursor:"pointer",fontSize:11,
                    fontFamily:"'DM Mono',monospace",transition:"all 0.2s",
                  }}
                    onMouseOver={e=>{e.target.style.borderColor=B.red;e.target.style.color=B.red;}}
                    onMouseOut={e=>{e.target.style.borderColor=B.greyDD;e.target.style.color=B.grey;}}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SiteCard({site,onRemove,onCheck}) {
  const upCount = site.history.filter(h=>h.status===STATUS.UP).length;
  const pct = site.history.length ? ((upCount/site.history.length)*100).toFixed(2) : "—";
  const latencies = site.history.filter(h=>h.latency&&h.status===STATUS.UP).map(h=>h.latency);
  const avg = latencies.length ? Math.round(latencies.reduce((a,b)=>a+b,0)/latencies.length) : null;
  const last = site.history[site.history.length-1];
  const accentColor = site.status===STATUS.UP?B.green:site.status===STATUS.DOWN?B.red:B.greyDD;

  return (
    <div style={{
      background:B.navyL,border:`1px solid ${B.greyDD}`,borderRadius:12,
      padding:"20px 24px",borderLeft:`3px solid ${accentColor}`,
      transition:"border-color 0.3s",animation:"slideUp 0.3s ease",
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:5}}>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:600,color:B.white}}>
              {site.name}
            </span>
            <Badge status={site.status}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{
              background:`${B.gold}18`,color:B.gold,borderRadius:4,
              padding:"2px 8px",fontSize:10,fontFamily:"'DM Mono',monospace",letterSpacing:1,
            }}>{site.group}</span>
            <a href={site.url} target="_blank" rel="noreferrer"
              style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:B.grey,textDecoration:"none",transition:"color 0.2s"}}
              onMouseOver={e=>e.target.style.color=B.goldL}
              onMouseOut={e=>e.target.style.color=B.grey}>
              {site.url}
            </a>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>onCheck(site.id)} style={{
            background:"none",border:`1px solid ${B.greyDD}`,color:B.grey,
            borderRadius:6,padding:"6px 14px",cursor:"pointer",
            fontFamily:"'DM Mono',monospace",fontSize:11,transition:"all 0.2s",
          }}
            onMouseOver={e=>{e.target.style.borderColor=B.gold;e.target.style.color=B.gold;}}
            onMouseOut={e=>{e.target.style.borderColor=B.greyDD;e.target.style.color=B.grey;}}
          >↻</button>
          <button onClick={()=>onRemove(site.id)} style={{
            background:"none",border:`1px solid ${B.greyDD}`,color:B.grey,
            borderRadius:6,padding:"6px 12px",cursor:"pointer",
            fontFamily:"'DM Mono',monospace",fontSize:11,transition:"all 0.2s",
          }}
            onMouseOver={e=>{e.target.style.borderColor=B.red;e.target.style.color=B.red;}}
            onMouseOut={e=>{e.target.style.borderColor=B.greyDD;e.target.style.color=B.grey;}}
          >✕</button>
        </div>
      </div>

      <Bars history={site.history}/>

      <div style={{display:"flex",marginTop:16,borderTop:`1px solid ${B.greyDD}`,paddingTop:16}}>
        {[
          {label:"UPTIME",    value:`${pct}%`,         color:pct>=99.9?B.green:pct>=99?B.goldL:B.red},
          {label:"AVG RESP",  value:avg?`${avg}ms`:"—",color:avg<200?B.green:avg<600?B.amber:B.red},
          {label:"INTERVAL",  value:`${site.interval}s`,color:B.grey},
          {label:"LAST CHECK",value:last?new Date(last.time).toLocaleTimeString():"—",color:B.grey},
        ].map((s,i)=>(
          <div key={i} style={{
            flex:1,textAlign:"center",
            borderRight:i<3?`1px solid ${B.greyDD}`:"none",
            padding:"0 12px",
          }}>
            <div style={{fontSize:20,fontWeight:600,fontFamily:"'DM Sans',sans-serif",color:s.color}}>{s.value}</div>
            <div style={{fontSize:9,letterSpacing:2,color:B.grey,fontFamily:"'DM Mono',monospace",marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddForm({onAdd,onClose}) {
  const [f,setF]=useState({name:"",url:"",interval:30,group:"Primary"});
  const submit=()=>{
    if(!f.name||!f.url)return;
    let url=f.url;
    if(!url.startsWith("http"))url="https://"+url;
    onAdd({...f,url});
    onClose();
  };
  const inp={
    background:B.navyD,border:`1px solid ${B.greyDD}`,
    borderRadius:6,padding:"9px 12px",color:B.white,
    fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none",width:"100%",
  };
  return (
    <div style={{
      background:B.navyL,border:`1px solid ${B.gold}44`,borderRadius:12,
      padding:24,marginBottom:20,borderTop:`2px solid ${B.gold}`,
      animation:"slideUp 0.2s ease",
    }}>
      <div style={{fontSize:11,letterSpacing:2,color:B.gold,fontFamily:"'DM Mono',monospace",marginBottom:16}}>
        ADD ENDPOINT
      </div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
        {[
          {key:"name",label:"NAME",placeholder:"My Service",flex:1},
          {key:"url",label:"URL",placeholder:"https://example.com",flex:2},
          {key:"group",label:"GROUP",placeholder:"Primary",flex:0.8},
          {key:"interval",label:"INTERVAL (s)",placeholder:"30",flex:0.6,type:"number"},
        ].map(field=>(
          <div key={field.key} style={{flex:field.flex,minWidth:100}}>
            <div style={{fontSize:9,letterSpacing:2,color:B.grey,fontFamily:"'DM Mono',monospace",marginBottom:5}}>{field.label}</div>
            <input
              type={field.type||"text"} placeholder={field.placeholder}
              value={f[field.key]}
              onChange={e=>setF(p=>({...p,[field.key]:field.type==="number"?+e.target.value:e.target.value}))}
              style={inp}
              onFocus={e=>e.target.style.borderColor=B.gold}
              onBlur={e=>e.target.style.borderColor=B.greyDD}
              onKeyDown={e=>e.key==="Enter"&&submit()}
            />
          </div>
        ))}
        <div style={{display:"flex",gap:8}}>
          <button onClick={submit} style={{
            background:`linear-gradient(135deg,${B.gold},${B.goldD})`,
            color:B.navy,border:"none",borderRadius:6,padding:"10px 20px",
            cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:14,whiteSpace:"nowrap",
          }}>Add →</button>
          <button onClick={onClose} style={{
            background:"none",border:`1px solid ${B.greyDD}`,color:B.grey,
            borderRadius:6,padding:"10px 14px",cursor:"pointer",
            fontFamily:"'DM Mono',monospace",fontSize:12,
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [sites,setSites]=useState(()=>DEFAULT_SITES.map(s=>({...s,status:STATUS.PENDING,history:seedHistory(40)})));
  const [showForm,setShowForm]=useState(false);
  const [showAlerts,setShowAlerts]=useState(false);
  const [alerts,setAlerts]=useState([]);
  const [log,setLog]=useState([]);
  const [nextId,setNextId]=useState(20);
  const [tick,setTick]=useState(0);

  const addLog=useCallback((msg,type="info")=>{
    setLog(p=>[{time:new Date().toLocaleTimeString(),msg,type},...p].slice(0,60));
  },[]);

  const sendEmailAlert=useCallback(async(site,statusLabel,latency,alertList)=>{
    if(!alertList||alertList.length===0)return;
    try{
      await fetch("/api/send-alert",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          recipients:alertList.map(a=>a.email),
          siteName:site.name,
          siteUrl:site.url,
          status:statusLabel,
          latency,
        }),
      });
    }catch(e){console.error("Alert failed:",e);}
  },[]);

  const checkSite=useCallback((id)=>{
    setSites(p=>p.map(s=>s.id===id?{...s,status:STATUS.CHECKING}:s));
    setTimeout(()=>{
      setSites(p=>{
        const site=p.find(s=>s.id===id);
        if(!site)return p;
        const up=Math.random()>0.04;
        const latency=up?Math.floor(60+Math.random()*450):null;
        const entry={time:Date.now(),status:up?STATUS.UP:STATUS.DOWN,latency};
        const prev=site.history.length?site.history[site.history.length-1].status:null;
        if(!up){
          addLog(`${site.name} is OFFLINE`,"error");
          setAlerts(al=>{
            if(al.some(a=>a.onDown))sendEmailAlert(site,"DOWN",latency,al.filter(a=>a.onDown));
            return al;
          });
        } else if(prev===STATUS.DOWN){
          addLog(`${site.name} recovered — back online`,"success");
          setAlerts(al=>{
            if(al.some(a=>a.onRecover))sendEmailAlert(site,"RECOVERED",latency,al.filter(a=>a.onRecover));
            return al;
          });
        }
        return p.map(s=>s.id===id?{...s,status:up?STATUS.UP:STATUS.DOWN,history:[...s.history,entry].slice(-60)}:s);
      });
    },400+Math.random()*900);
  },[addLog,sendEmailAlert]);

  useEffect(()=>{const t=setInterval(()=>setTick(n=>n+1),5000);return()=>clearInterval(t);},[]);
  useEffect(()=>{
    if(tick===0)return;
    sites.forEach(s=>{
      if(tick%(Math.ceil(s.interval/5))===(s.id%Math.ceil(s.interval/5)))checkSite(s.id);
    });
  },[tick]);
  useEffect(()=>{
    const t=setTimeout(()=>sites.forEach((s,i)=>setTimeout(()=>checkSite(s.id),i*700)),500);
    return()=>clearTimeout(t);
  },[]);

  const addSite=(data)=>{
    const id=nextId;
    setSites(p=>[...p,{...data,id,status:STATUS.PENDING,history:[]}]);
    setNextId(n=>n+1);
    addLog(`Added endpoint: ${data.name}`,"info");
    setTimeout(()=>checkSite(id),400);
  };

  const removeSite=(id)=>{
    const s=sites.find(x=>x.id===id);
    setSites(p=>p.filter(x=>x.id!==id));
    if(s)addLog(`Removed: ${s.name}`,"info");
  };

  const upCount=sites.filter(s=>s.status===STATUS.UP).length;
  const downCount=sites.filter(s=>s.status===STATUS.DOWN).length;
  const checkingCount=sites.filter(s=>s.status===STATUS.CHECKING).length;
  const overallHealth=sites.length?Math.round((upCount/sites.length)*100):100;

  return (
    <>
      <style>{`
        ${FONTS}
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${B.bg};}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:${B.navyD};}
        ::-webkit-scrollbar-thumb{background:${B.greyDD};border-radius:4px;}
        input,select{outline:none;}
        input::placeholder{color:${B.greyDD};}
        select option{background:${B.navyD};}
      `}</style>

      {showAlerts&&<AlertModal onClose={()=>setShowAlerts(false)} alerts={alerts} setAlerts={setAlerts}/>}

      <div style={{minHeight:"100vh",background:B.bg,padding:"28px 24px",maxWidth:960,margin:"0 auto"}}>

        {/* Header */}
        <div style={{
          display:"flex",justifyContent:"space-between",alignItems:"center",
          marginBottom:28,paddingBottom:20,borderBottom:`1px solid ${B.greyDD}`,
        }}>
          <Logo/>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setShowAlerts(true)} style={{
              background:alerts.length>0?`${B.gold}18`:"none",
              border:`1px solid ${alerts.length>0?B.gold:B.greyDD}`,
              color:alerts.length>0?B.gold:B.grey,
              borderRadius:8,padding:"9px 18px",cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif",fontWeight:500,fontSize:13,
              transition:"all 0.2s",display:"flex",alignItems:"center",gap:6,
            }}
              onMouseOver={e=>e.currentTarget.style.borderColor=B.gold}
              onMouseOut={e=>e.currentTarget.style.borderColor=alerts.length>0?B.gold:B.greyDD}
            >
              🔔 Email Alerts
              {alerts.length>0&&(
                <span style={{
                  background:B.gold,color:B.navy,borderRadius:10,
                  padding:"1px 7px",fontSize:11,fontWeight:700,
                }}>{alerts.length}</span>
              )}
            </button>
            <button onClick={()=>setShowForm(f=>!f)} style={{
              background:`linear-gradient(135deg,${B.gold},${B.goldD})`,
              color:B.navy,border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,transition:"opacity 0.2s",
            }}
              onMouseOver={e=>e.currentTarget.style.opacity="0.85"}
              onMouseOut={e=>e.currentTarget.style.opacity="1"}
            >{showForm?"✕ Cancel":"+ Add Endpoint"}</button>
          </div>
        </div>

        {/* Summary */}
        <div style={{
          background:B.navyL,border:`1px solid ${B.greyDD}`,borderRadius:12,
          padding:"18px 28px",marginBottom:20,
          display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16,
        }}>
          <div style={{display:"flex",gap:32,alignItems:"center"}}>
            <StatPill label="TOTAL"    value={sites.length}    color={B.white}/>
            <div style={{width:1,height:36,background:B.greyDD}}/>
            <StatPill label="ONLINE"   value={upCount}         color={B.green}/>
            <StatPill label="OFFLINE"  value={downCount}       color={downCount>0?B.red:B.greyDD}/>
            <StatPill label="CHECKING" value={checkingCount}   color={B.gold}/>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{
              fontSize:32,fontWeight:700,fontFamily:"'DM Sans',sans-serif",lineHeight:1,
              color:overallHealth===100?B.green:overallHealth>=80?B.amber:B.red,
            }}>{overallHealth}%</div>
            <div style={{fontSize:9,letterSpacing:2,color:B.grey,fontFamily:"'DM Mono',monospace",marginTop:3}}>
              OVERALL HEALTH
            </div>
          </div>
        </div>

        {showForm&&<AddForm onAdd={addSite} onClose={()=>setShowForm(false)}/>}

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {sites.length===0?(
            <div style={{textAlign:"center",padding:60,color:B.grey,fontFamily:"'DM Mono',monospace",fontSize:13}}>
              No endpoints configured.
            </div>
          ):sites.map(site=>(
            <SiteCard key={site.id} site={site} onRemove={removeSite} onCheck={checkSite}/>
          ))}
        </div>

        {log.length>0&&(
          <div style={{marginTop:28}}>
            <div style={{fontSize:10,letterSpacing:3,color:B.grey,fontFamily:"'DM Mono',monospace",marginBottom:10}}>
              ACTIVITY LOG
            </div>
            <div style={{
              background:B.navyL,border:`1px solid ${B.greyDD}`,borderRadius:10,
              padding:"14px 18px",maxHeight:190,overflowY:"auto",
            }}>
              {log.map((l,i)=>(
                <div key={i} style={{
                  display:"flex",gap:14,padding:"5px 0",
                  borderBottom:i<log.length-1?`1px solid ${B.greyDD}33`:"none",
                }}>
                  <span style={{fontSize:11,color:B.greyD,fontFamily:"'DM Mono',monospace",flexShrink:0}}>{l.time}</span>
                  <span style={{
                    fontSize:12,fontFamily:"'DM Sans',sans-serif",
                    color:l.type==="error"?B.red:l.type==="success"?B.green:B.grey,
                  }}>{l.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{
          marginTop:32,paddingTop:20,borderTop:`1px solid ${B.greyDD}`,
          display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,
        }}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:B.greyD,letterSpacing:1}}>
            ASTA UK · SERVICE MONITORING · LLOYD'S MANAGING AGENT
          </div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:B.greyD}}>
            Auto-refresh every 5s · {new Date().toLocaleString()}
          </div>
        </div>

      </div>
    </>
  );
}
