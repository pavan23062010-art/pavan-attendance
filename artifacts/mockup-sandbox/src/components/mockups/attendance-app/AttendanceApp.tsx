import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area,
} from "recharts";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════
interface UserAccount {
  id: string; username: string; password: string;
  role: "admin" | "teacher"; displayName: string;
  assignedClass: number | null; assignedSection: string | null;
}
interface Student {
  id: string; name: string; rollNo: string; class: number; section: string;
}
// daily: studentId → day (1‑based string "1","2",...) → "P"|"A"|"H" (H=holiday/skip)
interface MonthRecord {
  key: string; month: string; class: number; section: string;
  workingDays: number;
  daily: Record<string, Record<string, "P" | "A">>;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════
const CLASSES = [1,2,3,4,5,6,7,8,9,10];
const SECTIONS = ["A","B","C"];
const ACADEMIC_MONTHS = [
  "Jul-2026","Aug-2026","Sep-2026","Oct-2026","Nov-2026","Dec-2026",
  "Jan-2027","Feb-2027","Mar-2027","Apr-2027","May-2027","Jun-2027",
];
const MONTH_LABELS = ["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"];
const WORKING_DAYS_PER_MONTH = [25,26,24,25,22,20,26,24,27,25,26,24];
const PIE_COLORS = ["#4e73df","#1cc88a","#f6c23e","#e74a3b","#36b9cc"];

const LS_USERS    = "sa2_users";
const LS_STUDENTS = "sa2_students";
const LS_RECORDS  = "sa2_records";

// ══════════════════════════════════════════════════════════════════════════════
// SEED DATA
// ══════════════════════════════════════════════════════════════════════════════
const FIRST = ["Aarav","Priya","Rahul","Sneha","Arjun","Kavya","Rohan","Divya","Kiran","Meera",
               "Vikram","Ananya","Siddharth","Pooja","Aditya","Riya","Nikhil","Shreya","Ayaan","Naina"];
const LAST  = ["Sharma","Patel","Reddy","Kumar","Singh","Nair","Rao","Gupta","Joshi","Mehta"];
function genName(seed: number){ return `${FIRST[seed%FIRST.length]} ${LAST[Math.floor(seed/FIRST.length)%LAST.length]}`; }

function generateStudents(): Student[] {
  const out: Student[] = []; let gi = 0;
  CLASSES.forEach(cls => SECTIONS.forEach(sec => {
    for(let i=0;i<5;i++){
      out.push({ id:`s${gi}`, name:genName(gi), rollNo:String(gi+1).padStart(3,"0"), class:cls, section:sec });
      gi++;
    }
  }));
  return out;
}

function deterministicPct(studentIdx: number, cls: number, mi: number){
  return 68 + ((studentIdx * 7 + cls * 3 + mi * 2) % 30);
}

function generateDailyRecords(students: Student[]): MonthRecord[] {
  const out: MonthRecord[] = [];
  CLASSES.forEach(cls => SECTIONS.forEach(sec => {
    const stu = students.filter(s => s.class===cls && s.section===sec);
    ACADEMIC_MONTHS.forEach((month, mi) => {
      const wd = WORKING_DAYS_PER_MONTH[mi];
      const daily: Record<string, Record<string, "P"|"A">> = {};
      stu.forEach((s, si) => {
        const target = deterministicPct(si, cls, mi);
        daily[s.id] = {};
        for(let d=1; d<=wd; d++){
          const seed = (si * 31 + d * 13 + cls * 7 + mi * 5) % 100;
          daily[s.id][String(d)] = seed < target ? "P" : "A";
        }
      });
      out.push({ key:`${cls}-${sec}-${month}`, month, class:cls, section:sec, workingDays:wd, daily });
    });
  }));
  return out;
}

const SEED_STUDENTS = generateStudents();
const SEED_RECORDS  = generateDailyRecords(SEED_STUDENTS);

const DEFAULT_USERS: UserAccount[] = [
  { id:"u0", username:"admin",    password:"admin123", role:"admin",   displayName:"Pavan (Admin)",  assignedClass:null, assignedSection:null },
  { id:"u1", username:"teacher1", password:"teach1",   role:"teacher", displayName:"Ms. Priya",      assignedClass:1,    assignedSection:"A" },
  { id:"u2", username:"teacher2", password:"teach2",   role:"teacher", displayName:"Mr. Rahul",      assignedClass:2,    assignedSection:"B" },
  { id:"u3", username:"teacher3", password:"teach3",   role:"teacher", displayName:"Ms. Sneha",      assignedClass:5,    assignedSection:"C" },
  { id:"u4", username:"teacher4", password:"teach4",   role:"teacher", displayName:"Mr. Arjun",      assignedClass:10,   assignedSection:"A" },
];

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════
function pct(p: number, t: number){ return t===0 ? 0 : Math.round((p/t)*100); }
function gc(p: number){ return p>=85 ? "#1cc88a" : p>=75 ? "#f6c23e" : "#e74a3b"; }
function uid(){ return Math.random().toString(36).slice(2,9); }

function presentCount(rec: MonthRecord, sid: string){
  if(!rec.daily[sid]) return 0;
  return Object.values(rec.daily[sid]).filter(v=>v==="P").length;
}

function useLS<T>(key: string, fallback: T): [T, (v: T|((p:T)=>T))=>void] {
  const [val,setVal] = useState<T>(()=>{
    try{ const s=localStorage.getItem(key); return s?JSON.parse(s):fallback; } catch{ return fallback; }
  });
  const set = (v: T|((p:T)=>T)) => setVal(prev=>{
    const next = typeof v==="function" ? (v as (p:T)=>T)(prev) : v;
    try{ localStorage.setItem(key,JSON.stringify(next)); } catch{}
    return next;
  });
  return [val,set];
}

function Badge({ label, color }: { label: string; color: string }){
  const map: Record<string,string> = { green:"#dcfce7:#16a34a", yellow:"#fef9c3:#ca8a04", red:"#fee2e2:#dc2626", blue:"#dbeafe:#2563eb", purple:"#f3e8ff:#7c3aed" };
  const [bg,fg] = (map[color]??"#e5e7eb:#374151").split(":");
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{background:bg,color:fg}}>{label}</span>;
}

// ══════════════════════════════════════════════════════════════════════════════
// DOC DOWNLOAD
// ══════════════════════════════════════════════════════════════════════════════
function downloadDoc(students: Student[], rec: MonthRecord, cls: number, sec: string){
  const wd = rec.workingDays;
  const days = Array.from({length:wd},(_,i)=>i+1);
  const clsStu = students.filter(s=>s.class===cls && s.section===sec);

  const rows = clsStu.map((s,i)=>{
    const pr = presentCount(rec, s.id);
    const ab = wd - pr;
    const p  = pct(pr, wd);
    const dayCells = days.map(d=>{
      const v = rec.daily[s.id]?.[String(d)] ?? "A";
      const bg = v==="P" ? "#c6efce" : "#ffc7ce";
      const fg = v==="P" ? "#276221" : "#9c0006";
      return `<td style="border:1px solid #ccc;text-align:center;background:${bg};color:${fg};font-weight:bold;padding:3px 5px;font-size:10px;">${v}</td>`;
    }).join("");
    const statusBg = p>=75?"#c6efce":"#ffc7ce";
    const statusFg = p>=75?"#276221":"#9c0006";
    return `<tr style="background:${i%2===0?"#f9f9f9":"#ffffff"}">
      <td style="border:1px solid #ccc;padding:4px 8px;font-weight:bold;text-align:center;">${i+1}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;">${s.rollNo}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;font-weight:500;">${s.name}</td>
      ${dayCells}
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center;font-weight:bold;color:#276221;">${pr}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center;font-weight:bold;color:#9c0006;">${ab}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center;font-weight:bold;">${p}%</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center;background:${statusBg};color:${statusFg};font-weight:bold;">${p>=75?"Regular":"Irregular"}</td>
    </tr>`;
  }).join("");

  const dayHeaders = days.map(d=>`<th style="border:1px solid #ccc;padding:3px 5px;background:#2f5496;color:white;font-size:10px;min-width:22px;">${d}</th>`).join("");

  const totalPres = clsStu.reduce((a,s)=>a+presentCount(rec,s.id),0);
  const totalPoss = clsStu.length * wd;
  const classAvg  = pct(totalPres, totalPoss);
  const below75   = clsStu.filter(s=>pct(presentCount(rec,s.id),wd)<75).length;

  const html = `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>Attendance Report</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; margin: 20px; font-size: 11px; color: #222; }
    h1 { text-align:center; color:#1f3864; font-size:18px; margin:0; }
    h2 { text-align:center; color:#2f5496; font-size:14px; margin:4px 0; }
    .meta { text-align:center; color:#555; font-size:11px; margin-bottom:14px; }
    table { border-collapse:collapse; width:100%; font-size:10px; }
    th { background:#2f5496; color:white; border:1px solid #ccc; padding:5px 7px; text-align:center; }
    .summary { margin-top:16px; display:flex; gap:20px; }
    .sum-box { border:1px solid #ccc; border-radius:4px; padding:8px 16px; text-align:center; background:#f0f4ff; }
    .sum-val { font-size:20px; font-weight:bold; color:#2f5496; }
    .sum-lbl { font-size:10px; color:#666; }
    .footer { margin-top:30px; font-size:10px; color:#888; text-align:right; }
  </style>
</head>
<body>
  <h1>🎓 SCHOOL ATTENDANCE REPORT</h1>
  <h2>Class ${cls} – Section ${sec} &nbsp;|&nbsp; ${rec.month}</h2>
  <p class="meta">Academic Year 2026–2027 &nbsp;|&nbsp; Working Days: ${wd} &nbsp;|&nbsp; Total Students: ${clsStu.length} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString()}</p>

  <div class="summary">
    <div class="sum-box"><div class="sum-val">${clsStu.length}</div><div class="sum-lbl">Students</div></div>
    <div class="sum-box"><div class="sum-val">${wd}</div><div class="sum-lbl">Working Days</div></div>
    <div class="sum-box"><div class="sum-val">${classAvg}%</div><div class="sum-lbl">Class Avg</div></div>
    <div class="sum-box"><div class="sum-val" style="color:#9c0006;">${below75}</div><div class="sum-lbl">Below 75%</div></div>
    <div class="sum-box"><div class="sum-val" style="color:#276221;">${clsStu.length-below75}</div><div class="sum-lbl">Regular</div></div>
  </div>

  <br/>
  <table>
    <thead>
      <tr>
        <th style="min-width:30px;">#</th>
        <th style="min-width:50px;">Roll</th>
        <th style="min-width:130px;text-align:left;">Student Name</th>
        ${dayHeaders}
        <th style="background:#1a5276;min-width:40px;">P</th>
        <th style="background:#7b241c;min-width:40px;">A</th>
        <th style="background:#1a5276;min-width:45px;">%</th>
        <th style="min-width:70px;">Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    Made by Pavan &nbsp;|&nbsp; School Attendance System &nbsp;|&nbsp; Academic Year 2026–2027
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "application/msword" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `Attendance_Class${cls}_Sec${sec}_${rec.month}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN — particles + animated form
// ══════════════════════════════════════════════════════════════════════════════
function Particle({ index }: { index: number }){
  const size=6+(index%4)*4; const startX=(index*137.5)%100;
  const duration=8+(index%5)*2; const delay=(index*0.7)%6;
  const colors=["#4e73df33","#1cc88a33","#f6c23e33","#e74a3b22","#36b9cc33"];
  return(
    <motion.div className="absolute rounded-full pointer-events-none"
      style={{width:size,height:size,left:`${startX}%`,background:colors[index%colors.length]}}
      initial={{y:"110vh",opacity:0}} animate={{y:"-10vh",opacity:[0,0.8,0.8,0]}}
      transition={{duration,delay,repeat:Infinity,ease:"linear"}}/>
  );
}
function TypewriterText({ text }: { text: string }){
  const [d,setD]=useState(""); const idx=useRef(0);
  useEffect(()=>{ idx.current=0; setD("");
    const iv=setInterval(()=>{ if(idx.current<text.length) setD(text.slice(0,++idx.current)); else clearInterval(iv); },60);
    return()=>clearInterval(iv);
  },[text]);
  return <span>{d}<span className="animate-pulse">|</span></span>;
}

function LoginPage({ users, onLogin }: { users: UserAccount[]; onLogin:(u:UserAccount)=>void }){
  const [username,setUsername]=useState(""); const [pass,setPass]=useState("");
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const [showPass,setShowPass]=useState(false); const [focused,setFocused]=useState<string|null>(null);

  function handleLogin(e: React.FormEvent){ e.preventDefault(); setErr(""); setLoading(true);
    setTimeout(()=>{ const found=users.find(u=>u.username===username&&u.password===pass);
      if(found) onLogin(found); else { setLoading(false); setErr("Invalid username or password."); }
    },1100);
  }
  return(
    <div className="min-h-screen flex overflow-hidden relative"
      style={{fontFamily:"'Poppins',sans-serif",background:"linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)"}}>
      <div className="absolute inset-0 overflow-hidden">{Array.from({length:18},(_,i)=><Particle key={i} index={i}/>)}</div>
      <motion.div className="absolute w-96 h-96 rounded-full pointer-events-none"
        style={{background:"radial-gradient(circle,#4e73df44 0%,transparent 70%)",top:"-10%",left:"-5%"}}
        animate={{scale:[1,1.15,1],opacity:[0.5,0.8,0.5]}} transition={{duration:6,repeat:Infinity}}/>
      <motion.div className="absolute w-80 h-80 rounded-full pointer-events-none"
        style={{background:"radial-gradient(circle,#1cc88a33 0%,transparent 70%)",bottom:"-5%",right:"5%"}}
        animate={{scale:[1,1.2,1],opacity:[0.4,0.7,0.4]}} transition={{duration:8,repeat:Infinity,delay:2}}/>
      {/* Left */}
      <motion.div className="hidden md:flex flex-1 flex-col items-center justify-center px-14 relative z-10"
        initial={{opacity:0,x:-60}} animate={{opacity:1,x:0}} transition={{duration:0.9}}>
        <motion.div className="w-28 h-28 rounded-3xl flex items-center justify-center text-5xl shadow-2xl mb-8"
          style={{background:"linear-gradient(135deg,#4e73df,#1cc88a)",boxShadow:"0 0 60px #4e73df66,0 0 120px #1cc88a33"}}
          initial={{scale:0,rotate:-180}} animate={{scale:1,rotate:0}}
          transition={{duration:1,delay:0.2,type:"spring",stiffness:120}}>🎓</motion.div>
        <motion.div className="text-center" initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{delay:0.5}}>
          <p className="text-white/50 text-sm font-medium tracking-[0.3em] uppercase mb-2">Welcome to</p>
          <h1 className="text-4xl font-black text-white mb-1" style={{textShadow:"0 0 40px #4e73df99"}}>SCHOOL</h1>
          <h1 className="text-4xl font-black mb-4" style={{background:"linear-gradient(90deg,#4e73df,#1cc88a)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>ATTENDANCE</h1>
          <p className="text-white/40 text-sm"><TypewriterText text="Academic Year 2026 – 2027"/></p>
        </motion.div>
        <motion.div className="flex gap-4 mt-10" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:1}}>
          {[{icon:"🏫",label:"Classes",value:"10"},{icon:"📚",label:"Sections",value:"A,B,C"},{icon:"📋",label:"Daily",value:"Track"}].map(s=>(
            <motion.div key={s.label} whileHover={{scale:1.05,y:-4}}
              className="flex flex-col items-center px-5 py-3 rounded-2xl text-center"
              style={{background:"rgba(255,255,255,0.07)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.1)"}}>
              <span className="text-xl mb-1">{s.icon}</span>
              <span className="text-white font-bold">{s.value}</span>
              <span className="text-white/40 text-xs">{s.label}</span>
            </motion.div>
          ))}
        </motion.div>
        <motion.p className="absolute bottom-6 text-white/25 text-xs tracking-widest uppercase"
          initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.8}}>
          Made by <span className="text-white/50 font-semibold">Pavan</span>
        </motion.p>
      </motion.div>
      <div className="hidden md:block w-px self-stretch my-16" style={{background:"linear-gradient(to bottom,transparent,rgba(255,255,255,0.15),transparent)"}}/>
      {/* Right */}
      <motion.div className="flex-1 flex flex-col items-center justify-center px-10 relative z-10"
        initial={{opacity:0,x:60}} animate={{opacity:1,x:0}} transition={{duration:0.9}}>
        <motion.div className="w-full max-w-sm" initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} transition={{delay:0.3}}>
          <div className="rounded-3xl p-8" style={{background:"rgba(255,255,255,0.06)",backdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,0.12)",boxShadow:"0 24px 80px rgba(0,0,0,0.5)"}}>
            <div className="mb-7"><h2 className="text-white text-2xl font-bold">Sign In</h2><p className="text-white/40 text-sm mt-1">Daily attendance portal</p></div>
            <form onSubmit={handleLogin} className="space-y-5">
              {[{key:"user",label:"Username",icon:"👤",value:username,set:setUsername,type:"text",ph:"Enter username"},
                {key:"pass",label:"Password",icon:"🔒",value:pass,set:setPass,type:showPass?"text":"password",ph:"Enter password"}].map(f=>(
                <motion.div key={f.key} animate={{y:focused===f.key?-2:0}} transition={{duration:0.2}}>
                  <label className="block text-xs font-semibold text-white/50 mb-2 tracking-widest uppercase">{f.label}</label>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                    style={{background:"rgba(255,255,255,0.07)",border:`1.5px solid ${focused===f.key?(f.key==="user"?"#4e73df":"#1cc88a"):"rgba(255,255,255,0.1)"}`,boxShadow:focused===f.key?`0 0 0 3px ${f.key==="user"?"#4e73df22":"#1cc88a22"}`:"none"}}>
                    <span className="text-white/40 text-sm">{f.icon}</span>
                    <input value={f.value} onChange={e=>f.set(e.target.value)} type={f.type} placeholder={f.ph}
                      onFocus={()=>setFocused(f.key)} onBlur={()=>setFocused(null)}
                      className="flex-1 bg-transparent text-white text-sm placeholder-white/25 focus:outline-none"/>
                    {f.key==="pass"&&<button type="button" onClick={()=>setShowPass(v=>!v)} className="text-white/30 hover:text-white/60 text-sm">{showPass?"🙈":"👁️"}</button>}
                  </div>
                </motion.div>
              ))}
              <AnimatePresence>{err&&<motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs" style={{background:"#e74a3b22",border:"1px solid #e74a3b44",color:"#ff6b6b"}}>
                ⚠️ {err}</motion.div>}</AnimatePresence>
              <motion.button type="submit" whileHover={{scale:1.02,boxShadow:"0 0 30px #4e73df66"}} whileTap={{scale:0.97}}
                disabled={loading} className="w-full py-3.5 rounded-2xl text-white font-bold text-sm relative overflow-hidden"
                style={{background:"linear-gradient(135deg,#4e73df,#1cc88a)"}}>
                {loading?<span className="flex items-center justify-center gap-2"><motion.span animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}} className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/>Authenticating...</span>:<span>Sign In →</span>}
                <motion.div className="absolute inset-0 pointer-events-none" style={{background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)"}} animate={{x:["-100%","200%"]}} transition={{duration:2.5,repeat:Infinity,repeatDelay:1}}/>
              </motion.button>
            </form>
          </div>
          <p className="text-center text-white/20 text-xs mt-5 tracking-widest uppercase">Made by <span className="text-white/40 font-semibold">Pavan</span></p>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════════════════════════════════
const NAV_ADMIN   = [{id:"dashboard",icon:"🏠",label:"Dashboard"},{id:"daily",icon:"📋",label:"Daily Attendance"},{id:"monthly",icon:"📅",label:"Monthly Report"},{id:"analytics",icon:"📊",label:"Analytics"},{id:"students",icon:"👨‍🎓",label:"Students"},{id:"users",icon:"👥",label:"Manage Users"},{id:"settings",icon:"⚙️",label:"Settings"}];
const NAV_TEACHER = [{id:"dashboard",icon:"🏠",label:"Dashboard"},{id:"daily",icon:"📋",label:"Daily Attendance"},{id:"monthly",icon:"📅",label:"Monthly Report"},{id:"analytics",icon:"📊",label:"Analytics"},{id:"students",icon:"👨‍🎓",label:"Students"},{id:"settings",icon:"⚙️",label:"Settings"}];

function Sidebar({ active,onNav,onLogout,user }: { active:string; onNav:(id:string)=>void; onLogout:()=>void; user:UserAccount }){
  const nav = user.role==="admin" ? NAV_ADMIN : NAV_TEACHER;
  return(
    <div className="flex flex-col h-full py-4 px-3" style={{background:"linear-gradient(180deg,#4e73df 0%,#224abe 100%)"}}>
      <div className="text-center mb-4 px-2">
        <div className="text-2xl font-bold text-white mb-1">🎓</div>
        <p className="text-white/90 text-xs font-semibold">School Attendance</p>
        <div className="mt-3 px-3 py-2 rounded-xl" style={{background:"rgba(255,255,255,0.12)"}}>
          <p className="text-white text-xs font-semibold truncate">{user.displayName}</p>
          <p className="text-white/50 text-xs capitalize">{user.role}{user.role==="teacher"&&user.assignedClass?` · Cl ${user.assignedClass}${user.assignedSection}`:""}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {nav.map(n=>(
          <button key={n.id} onClick={()=>onNav(n.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{background:active===n.id?"rgba(255,255,255,0.2)":"transparent",color:active===n.id?"white":"rgba(255,255,255,0.6)"}}>
            <span className="text-base">{n.icon}</span><span className="text-left leading-tight">{n.label}</span>
          </button>
        ))}
      </nav>
      <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all mt-2">
        🚪 Logout
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CLASS FILTER BAR
// ══════════════════════════════════════════════════════════════════════════════
function ClassFilter({ selClass,selSec,setClass,setSec,user }: { selClass:number; selSec:string; setClass:(v:number)=>void; setSec:(v:string)=>void; user:UserAccount }){
  if(user.role==="teacher") return(
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Class</span>
      <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 text-sm font-semibold">{user.assignedClass}</span>
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-2">Section</span>
      <span className="px-3 py-1.5 rounded-xl bg-green-50 text-green-600 text-sm font-semibold">{user.assignedSection}</span>
    </div>
  );
  return(
    <div className="flex flex-wrap items-center gap-3 mb-4 bg-white rounded-2xl p-3 shadow-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Class</span>
        <div className="flex gap-1 flex-wrap">{CLASSES.map(c=>(
          <button key={c} onClick={()=>setClass(c)} className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            style={{background:selClass===c?"#4e73df":"#f0f2f8",color:selClass===c?"white":"#555"}}>
            {c}
          </button>
        ))}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Section</span>
        {SECTIONS.map(s=>(
          <button key={s} onClick={()=>setSec(s)} className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            style={{background:selSec===s?"#1cc88a":"#f0f2f8",color:selSec===s?"white":"#555"}}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label,value,sub,color,icon }: { label:string; value:string|number; sub?:string; color:string; icon:string }){
  return(
    <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4" style={{borderColor:color}}>
      <div className="flex items-start justify-between">
        <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        {sub&&<p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>
        <span className="text-3xl opacity-20">{icon}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function Dashboard({ students,records,selClass,selSec }: { students:Student[]; records:MonthRecord[]; selClass:number; selSec:string }){
  const clsStu = students.filter(s=>s.class===selClass&&s.section===selSec);
  const clsRec = records.filter(r=>r.class===selClass&&r.section===selSec);
  const totalWD = clsRec.reduce((a,r)=>a+r.workingDays,0);
  const avgPct  = useMemo(()=>{
    let tp=0,tposs=0;
    clsStu.forEach(s=>clsRec.forEach(r=>{tp+=presentCount(r,s.id);tposs+=r.workingDays;}));
    return pct(tp,tposs);
  },[clsStu,clsRec]);
  const lowCount = clsStu.filter(s=>{ const tp=clsRec.reduce((a,r)=>a+presentCount(r,s.id),0); return pct(tp,totalWD)<75; }).length;
  const barData  = clsRec.map((r,i)=>({
    name:MONTH_LABELS[ACADEMIC_MONTHS.indexOf(r.month)],
    "Working Days":r.workingDays,
    "Avg Present":Math.round(clsStu.reduce((a,s)=>a+presentCount(r,s.id),0)/(clsStu.length||1)),
  }));
  return(
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-sm text-gray-500">Class {selClass} – Section {selSec} · AY 2026–2027</p></div>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Students" value={clsStu.length} icon="👨‍🎓" color="#4e73df" sub="Enrolled"/>
        <StatCard label="Working Days" value={totalWD} icon="📅" color="#1cc88a" sub="Full year"/>
        <StatCard label="Avg Attendance" value={`${avgPct}%`} icon="✅" color="#f6c23e" sub="All students"/>
        <StatCard label="Below 75%" value={lowCount} icon="⚠️" color="#e74a3b" sub="At risk"/>
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm">Monthly Overview</h3>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={barData} margin={{top:4,right:16,bottom:4,left:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/>
            <Tooltip/><Legend wrapperStyle={{fontSize:12}}/>
            <Bar dataKey="Working Days" fill="#c5cef5" radius={[4,4,0,0]}/>
            <Bar dataKey="Avg Present" fill="#4e73df" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">Full Year — Student Snapshot</h3>
        <div className="space-y-3">
          {clsStu.map(s=>{ const tp=clsRec.reduce((a,r)=>a+presentCount(r,s.id),0); const p=pct(tp,totalWD); return(
            <div key={s.id} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{background:"linear-gradient(135deg,#4e73df,#1cc88a)"}}>{s.name.charAt(0)}</div>
              <div className="flex-1"><div className="flex justify-between mb-1"><span className="text-sm font-medium text-gray-700">{s.name}</span><span className="text-sm font-bold" style={{color:gc(p)}}>{p}%</span></div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-2 rounded-full" style={{width:`${p}%`,background:gc(p)}}/></div></div>
            </div>
          );})}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DAILY ATTENDANCE — day-by-day grid mark & view
// ══════════════════════════════════════════════════════════════════════════════
function DailyAttendance({ students,records,selClass,selSec,onUpdate }: {
  students:Student[]; records:MonthRecord[]; selClass:number; selSec:string;
  onUpdate:(key:string,daily:Record<string,Record<string,"P"|"A">>)=>void;
}){
  const [selMonth,setSelMonth]=useState(ACADEMIC_MONTHS[0]);
  const clsStu = students.filter(s=>s.class===selClass&&s.section===selSec);
  const rec = records.find(r=>r.class===selClass&&r.section===selSec&&r.month===selMonth);
  const [localDaily,setLocalDaily]=useState<Record<string,Record<string,"P"|"A">>>(()=>rec?.daily??{});
  const [saved,setSaved]=useState(false);

  useEffect(()=>{ setLocalDaily(rec?.daily??{}); },[selMonth,selClass,selSec]);

  const wd = rec?.workingDays ?? 25;
  const days = Array.from({length:wd},(_,i)=>i+1);

  function toggle(sid: string, day: number){
    setLocalDaily(prev=>{
      const cur = prev[sid]?.[String(day)] ?? "A";
      return {...prev,[sid]:{...prev[sid],[String(day)]:cur==="P"?"A":"P"}};
    });
  }

  function markAll(day: number, status: "P"|"A"){
    setLocalDaily(prev=>{
      const next={...prev};
      clsStu.forEach(s=>{ next[s.id]={...next[s.id],[String(day)]:status}; });
      return next;
    });
  }

  function save(){
    if(!rec) return;
    onUpdate(rec.key, localDaily);
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  }

  return(
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-xl font-bold text-gray-800">Daily Attendance</h2>
          <p className="text-sm text-gray-500">Class {selClass} – Sec {selSec} · mark day-by-day</p></div>
        <div className="flex gap-3 items-center">
          <select value={selMonth} onChange={e=>setSelMonth(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30">
            {ACADEMIC_MONTHS.map(m=><option key={m}>{m}</option>)}
          </select>
          <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={save}
            className="px-5 py-2 rounded-xl text-white text-sm font-semibold"
            style={{background:saved?"#1cc88a":"linear-gradient(135deg,#4e73df,#1cc88a)"}}>
            {saved?"✓ Saved!":"Save"}
          </motion.button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold" style={{background:"#1cc88a"}}>P</span> Present</span>
        <span className="flex items-center gap-1"><span className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold" style={{background:"#e74a3b"}}>A</span> Absent</span>
        <span className="text-gray-400">Click a cell to toggle · Click day header to mark all</span>
      </div>

      {/* Scrollable grid */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-xs" style={{minWidth: wd*32 + 220}}>
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 z-10 bg-gray-50 px-3 py-3 text-left font-semibold text-gray-600 min-w-[180px] border-b border-gray-200">Student</th>
                {days.map(d=>(
                  <th key={d} className="px-1 py-2 text-center border-b border-gray-200 min-w-[30px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-gray-600 font-semibold">{d}</span>
                      <div className="flex gap-0.5 justify-center">
                        <button onClick={()=>markAll(d,"P")} title="All Present" className="w-3 h-3 rounded-sm text-white flex items-center justify-center" style={{background:"#1cc88a",fontSize:7}}>P</button>
                        <button onClick={()=>markAll(d,"A")} title="All Absent" className="w-3 h-3 rounded-sm text-white flex items-center justify-center" style={{background:"#e74a3b",fontSize:7}}>A</button>
                      </div>
                    </div>
                  </th>
                ))}
                <th className="px-2 py-3 text-center border-b border-gray-200 min-w-[40px] text-green-600">P</th>
                <th className="px-2 py-3 text-center border-b border-gray-200 min-w-[40px] text-red-500">A</th>
                <th className="px-2 py-3 text-center border-b border-gray-200 min-w-[45px]">%</th>
              </tr>
            </thead>
            <tbody>
              {clsStu.map((s,i)=>{
                const stuDaily = localDaily[s.id] ?? {};
                const pr = days.filter(d=>stuDaily[String(d)]==="P").length;
                const ab = wd - pr; const p = pct(pr,wd);
                return(
                  <tr key={s.id} className="border-b border-gray-50" style={{background:i%2===0?"#fafafa":"white"}}>
                    <td className="sticky left-0 z-10 px-3 py-2 border-r border-gray-100 font-medium text-gray-800" style={{background:i%2===0?"#fafafa":"white"}}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold" style={{background:"linear-gradient(135deg,#4e73df,#1cc88a)",fontSize:10}}>{s.name.charAt(0)}</div>
                        <div><div className="text-xs font-semibold">{s.name}</div><div className="text-xs text-gray-400">Roll {s.rollNo}</div></div>
                      </div>
                    </td>
                    {days.map(d=>{
                      const v = stuDaily[String(d)] ?? "A";
                      return(
                        <td key={d} className="px-1 py-1.5 text-center">
                          <button onClick={()=>toggle(s.id,d)}
                            className="w-6 h-6 rounded font-bold text-white transition-all hover:scale-110"
                            style={{background:v==="P"?"#1cc88a":"#e74a3b",fontSize:10}}>
                            {v}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center font-bold text-green-600">{pr}</td>
                    <td className="px-2 py-2 text-center font-bold text-red-500">{ab}</td>
                    <td className="px-2 py-2 text-center font-bold" style={{color:gc(p)}}>{p}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MONTHLY REPORT — summary table + DOC download
// ══════════════════════════════════════════════════════════════════════════════
function MonthlyReport({ students,records,selClass,selSec }: { students:Student[]; records:MonthRecord[]; selClass:number; selSec:string }){
  const [selMonth,setSelMonth]=useState(ACADEMIC_MONTHS[0]);
  const clsStu = students.filter(s=>s.class===selClass&&s.section===selSec);
  const rec = records.find(r=>r.class===selClass&&r.section===selSec&&r.month===selMonth);
  const wd = rec?.workingDays??0;
  const days = Array.from({length:wd},(_,i)=>i+1);

  const tableData = clsStu.map(s=>{
    const pr = rec ? presentCount(rec,s.id) : 0;
    return {...s, present:pr, absent:wd-pr, percentage:pct(pr,wd)};
  }).sort((a,b)=>b.percentage-a.percentage);

  const avgPct = Math.round(tableData.reduce((a,d)=>a+d.percentage,0)/(tableData.length||1));
  const barData = tableData.map(d=>({name:d.name.split(" ")[0],Present:d.present,Absent:d.absent}));

  return(
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-xl font-bold text-gray-800">Monthly Report</h2>
          <p className="text-sm text-gray-500">Class {selClass} – Sec {selSec}</p></div>
        <div className="flex gap-3 items-center">
          <select value={selMonth} onChange={e=>setSelMonth(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30">
            {ACADEMIC_MONTHS.map(m=><option key={m}>{m}</option>)}
          </select>
          {rec&&(
            <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}}
              onClick={()=>downloadDoc(students,rec,selClass,selSec)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-md"
              style={{background:"linear-gradient(135deg,#1a5276,#2e86c1)"}}>
              📄 Download DOC
            </motion.button>
          )}
        </div>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-4 gap-3">
        {[{label:"Working Days",value:wd,color:"#4e73df"},{label:"Class Avg",value:`${avgPct}%`,color:"#1cc88a"},{label:"Regular (≥75%)",value:tableData.filter(d=>d.percentage>=75).length,color:"#1cc88a"},{label:"Irregular (<75%)",value:tableData.filter(d=>d.percentage<75).length,color:"#e74a3b"}].map(c=>(
          <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-xl font-bold" style={{color:c.color}}>{c.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm">Present vs Absent — {selMonth}</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={barData} margin={{top:4,right:16,bottom:4,left:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="name" tick={{fontSize:10}}/><YAxis tick={{fontSize:11}}/>
            <Tooltip/><Legend wrapperStyle={{fontSize:12}}/>
            <Bar dataKey="Present" fill="#1cc88a" radius={[4,4,0,0]} stackId="a"/>
            <Bar dataKey="Absent" fill="#e74a3b" radius={[4,4,0,0]} stackId="a"/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Day-wise grid (read-only) */}
      {rec && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 text-sm">Day-wise Attendance Grid — {selMonth}</h3>
            <span className="text-xs text-gray-400">P = Present &nbsp;|&nbsp; A = Absent</span>
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs" style={{minWidth:wd*28+240}}>
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 bg-gray-50 px-3 py-2.5 text-left font-semibold text-gray-600 min-w-[50px] border-b border-gray-200">#</th>
                  <th className="sticky left-[50px] bg-gray-50 px-3 py-2.5 text-left font-semibold text-gray-600 min-w-[150px] border-b border-gray-200">Name</th>
                  {days.map(d=><th key={d} className="px-1 py-2.5 text-center border-b border-gray-200 min-w-[26px] text-gray-500 font-semibold">{d}</th>)}
                  <th className="px-2 py-2.5 text-center border-b border-gray-200 min-w-[36px] text-green-600 font-semibold">P</th>
                  <th className="px-2 py-2.5 text-center border-b border-gray-200 min-w-[36px] text-red-500 font-semibold">A</th>
                  <th className="px-2 py-2.5 text-center border-b border-gray-200 min-w-[45px] font-semibold">%</th>
                  <th className="px-3 py-2.5 text-center border-b border-gray-200 min-w-[70px] font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((s,i)=>(
                  <tr key={s.id} className="border-b border-gray-50" style={{background:i%2===0?"#fafafa":"white"}}>
                    <td className="sticky left-0 px-3 py-2 text-gray-400 font-medium border-r border-gray-100" style={{background:i%2===0?"#fafafa":"white"}}>#{i+1}</td>
                    <td className="sticky left-[50px] px-3 py-2 font-medium text-gray-800 border-r border-gray-100" style={{background:i%2===0?"#fafafa":"white"}}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold" style={{background:"linear-gradient(135deg,#4e73df,#1cc88a)",fontSize:9}}>{s.name.charAt(0)}</div>
                        {s.name}
                      </div>
                    </td>
                    {days.map(d=>{ const v=rec.daily[s.id]?.[String(d)]??"A";
                      return <td key={d} className="px-1 py-2 text-center font-bold" style={{color:v==="P"?"#16a34a":"#dc2626"}}>{v}</td>;
                    })}
                    <td className="px-2 py-2 text-center font-bold text-green-600">{s.present}</td>
                    <td className="px-2 py-2 text-center font-bold text-red-500">{s.absent}</td>
                    <td className="px-2 py-2 text-center font-bold" style={{color:gc(s.percentage)}}>{s.percentage}%</td>
                    <td className="px-3 py-2 text-center"><Badge label={s.percentage>=75?"Regular":"Irregular"} color={s.percentage>=75?"green":"red"}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student cards summary */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm">Student Summary — {selMonth}</h3>
        <div className="grid grid-cols-2 gap-3">
          {tableData.map((s,i)=>{
            const p=s.percentage;
            return(
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl" style={{background:i%2===0?"#f8f9fc":"#fafbff"}}>
                <div className="text-sm font-bold text-gray-400 w-5">#{i+1}</div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{background:"linear-gradient(135deg,#4e73df,#1cc88a)",fontSize:13}}>{s.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-800 truncate">{s.name}</span>
                    <span className="text-sm font-bold ml-2" style={{color:gc(p)}}>{p}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-1.5 rounded-full" style={{width:`${p}%`,background:gc(p)}}/>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{s.present}/{wd} days</span>
                  </div>
                </div>
                <Badge label={p>=75?"✓":"⚠"} color={p>=75?"green":"red"}/>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════
function Analytics({ students,records,selClass,selSec }: { students:Student[]; records:MonthRecord[]; selClass:number; selSec:string }){
  const clsStu = students.filter(s=>s.class===selClass&&s.section===selSec);
  const clsRec = records.filter(r=>r.class===selClass&&r.section===selSec);
  const totalWD= clsRec.reduce((a,r)=>a+r.workingDays,0);
  const getP   = (s: Student)=>{ const tp=clsRec.reduce((a,r)=>a+presentCount(r,s.id),0); return pct(tp,totalWD); };
  const totalPr= clsStu.reduce((a,s)=>a+clsRec.reduce((b,r)=>b+presentCount(r,s.id),0),0);
  const totalPo= clsStu.length*totalWD;
  const pieData= [{name:"Present",value:totalPr},{name:"Absent",value:totalPo-totalPr}];
  const catData= [{name:"≥90% Excellent",value:clsStu.filter(s=>getP(s)>=90).length},{name:"75–89% Good",value:clsStu.filter(s=>{const p=getP(s);return p>=75&&p<90;}).length},{name:"<75% At Risk",value:clsStu.filter(s=>getP(s)<75).length}];
  const lineData= clsRec.map((r,i)=>({name:MONTH_LABELS[ACADEMIC_MONTHS.indexOf(r.month)],"Avg %":clsStu.length?Math.round(clsStu.reduce((a,s)=>a+pct(presentCount(r,s.id),r.workingDays),0)/clsStu.length):0}));
  let cum=0,cumP=0;
  const areaData=clsRec.map((r,i)=>{ cum+=clsStu.reduce((a,s)=>a+presentCount(r,s.id),0); cumP+=r.workingDays*clsStu.length; return {name:MONTH_LABELS[ACADEMIC_MONTHS.indexOf(r.month)],"Cumulative %":Math.round((cum/(cumP||1))*100)}; });
  return(
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-gray-800">Analytics</h2><p className="text-sm text-gray-500">Class {selClass} – Sec {selSec} · Full year</p></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Overall Present vs Absent</h3>
          <ResponsiveContainer width="100%" height={200}><PieChart>
            <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
              {pieData.map((_,i)=><Cell key={i} fill={["#4e73df","#e74a3b"][i]}/>)}
            </Pie><Tooltip formatter={(v:number)=>v.toLocaleString()}/>
          </PieChart></ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Students by Category</h3>
          <ResponsiveContainer width="100%" height={200}><PieChart>
            <Pie data={catData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
              {catData.map((_,i)=><Cell key={i} fill={["#1cc88a","#f6c23e","#e74a3b"][i]}/>)}
            </Pie><Tooltip/><Legend wrapperStyle={{fontSize:11}}/>
          </PieChart></ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Monthly Avg %</h3>
          <ResponsiveContainer width="100%" height={180}><LineChart data={lineData} margin={{top:4,right:16,bottom:4,left:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="name" tick={{fontSize:10}}/><YAxis domain={[0,100]} tick={{fontSize:10}} unit="%"/>
            <Tooltip formatter={(v:number)=>`${v}%`}/>
            <Line type="monotone" dataKey="Avg %" stroke="#4e73df" strokeWidth={2.5} dot={{fill:"#4e73df",r:4}}/>
          </LineChart></ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Cumulative Trend</h3>
          <ResponsiveContainer width="100%" height={180}><AreaChart data={areaData} margin={{top:4,right:16,bottom:4,left:0}}>
            <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1cc88a" stopOpacity={0.3}/><stop offset="95%" stopColor="#1cc88a" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="name" tick={{fontSize:10}}/><YAxis domain={[60,100]} tick={{fontSize:10}} unit="%"/>
            <Tooltip formatter={(v:number)=>`${v}%`}/>
            <Area type="monotone" dataKey="Cumulative %" stroke="#1cc88a" strokeWidth={2.5} fill="url(#cg)"/>
          </AreaChart></ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADD STUDENT MODAL
// ══════════════════════════════════════════════════════════════════════════════
function AddStudentModal({ onAdd, onClose, defaultClass, defaultSection, user }: {
  onAdd:(s:Student)=>void; onClose:()=>void;
  defaultClass:number; defaultSection:string; user:UserAccount;
}){
  const [name,setName]       = useState("");
  const [roll,setRoll]       = useState("");
  const [cls,setCls]         = useState(defaultClass);
  const [sec,setSec]         = useState(defaultSection);
  const [err,setErr]         = useState("");
  const [done,setDone]       = useState(false);
  const [added,setAdded]     = useState<{name:string;cls:number;sec:string}[]>([]);
  const nameRef              = useRef<HTMLInputElement>(null);

  useEffect(()=>{ nameRef.current?.focus(); },[]);

  function submit(e: React.FormEvent){ e.preventDefault(); setErr("");
    if(!name.trim()){ setErr("Student name is required."); return; }
    if(!roll.trim()){ setErr("Roll number is required."); return; }
    onAdd({ id:uid(), name:name.trim(), rollNo:roll.trim(), class:cls, section:sec });
    setAdded(p=>[...p,{name:name.trim(),cls,sec}]);
    setDone(true); setName(""); setRoll("");
    setTimeout(()=>setDone(false),1500);
    nameRef.current?.focus();
  }

  const isTeacher = user.role==="teacher";

  return(
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
        <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}
          initial={{opacity:0}} animate={{opacity:1}}/>
        <motion.div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          initial={{opacity:0,scale:0.9,y:20}} animate={{opacity:1,scale:1,y:0}}
          exit={{opacity:0,scale:0.9,y:20}} transition={{type:"spring",stiffness:300,damping:30}}>
          {/* Header */}
          <div className="px-6 pt-6 pb-4" style={{background:"linear-gradient(135deg,#4e73df,#1cc88a)"}}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white text-lg font-bold">Add New Student</h2>
                <p className="text-white/70 text-xs mt-0.5">Fill in the details below</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition-all">×</button>
            </div>
          </div>

          <form onSubmit={submit} className="p-6 space-y-4">
            {/* Class + Section row — editable only for admin */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Class</label>
                {isTeacher
                  ? <div className="px-3 py-2.5 rounded-xl bg-blue-50 text-blue-600 text-sm font-semibold">Class {user.assignedClass}</div>
                  : <select value={cls} onChange={e=>setCls(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30">
                      {CLASSES.map(c=><option key={c} value={c}>Class {c}</option>)}
                    </select>
                }
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Section</label>
                {isTeacher
                  ? <div className="px-3 py-2.5 rounded-xl bg-green-50 text-green-600 text-sm font-semibold">Section {user.assignedSection}</div>
                  : <div className="flex gap-1.5">
                      {SECTIONS.map(s=>(
                        <button key={s} type="button" onClick={()=>setSec(s)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                          style={{background:sec===s?"linear-gradient(135deg,#1cc88a,#0fa878)":"#f0f2f8",color:sec===s?"white":"#777"}}>
                          {s}
                        </button>
                      ))}
                    </div>
                }
              </div>
            </div>

            {/* Roll No */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Roll Number</label>
              <input value={roll} onChange={e=>setRoll(e.target.value)} placeholder="e.g. 001"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30"/>
            </div>

            {/* Student Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Full Name</label>
              <input ref={nameRef} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Priya Sharma"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30"/>
            </div>

            {/* Preview avatar */}
            {name.trim() && (
              <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{background:"#f0f4ff"}}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{background:"linear-gradient(135deg,#4e73df,#1cc88a)"}}>{name.trim().charAt(0)}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{name.trim()}</p>
                  <p className="text-xs text-gray-400">Class {isTeacher?user.assignedClass:cls} – Section {isTeacher?user.assignedSection:sec}{roll.trim()&&` · Roll ${roll.trim()}`}</p>
                </div>
              </motion.div>
            )}

            {err && <p className="text-xs text-red-500 flex items-center gap-1">⚠️ {err}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">
                Done
              </button>
              <motion.button type="submit" whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold relative overflow-hidden"
                style={{background:done?"#1cc88a":"linear-gradient(135deg,#4e73df,#1cc88a)"}}>
                {done ? "✓ Added!" : "+ Add Student"}
              </motion.button>
            </div>

            {/* Recently added list */}
            {added.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Added this session</p>
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  {[...added].reverse().map((a,i)=>(
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="text-green-500 font-bold">✓</span>
                      <span className="font-medium">{a.name}</span>
                      <span className="text-gray-400">— Class {a.cls}{a.sec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STUDENTS TAB
// ══════════════════════════════════════════════════════════════════════════════
function StudentsTab({ students,records,selClass,selSec,onAdd,onRemove,user }: { students:Student[]; records:MonthRecord[]; selClass:number; selSec:string; onAdd:(s:Student)=>void; onRemove:(id:string)=>void; user:UserAccount }){
  const clsRec   = records.filter(r=>r.class===selClass&&r.section===selSec);
  const totalWD  = clsRec.reduce((a,r)=>a+r.workingDays,0);
  const clsStu   = students.filter(s=>s.class===selClass&&s.section===selSec);
  const [search,setSearch] = useState("");
  const [showModal,setShowModal] = useState(false);
  const [confirmDel,setConfirmDel] = useState<string|null>(null);

  const filtered = clsStu.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())||s.rollNo.includes(search));

  // Stat tiles
  const below75  = clsStu.filter(s=>{ const tp=clsRec.reduce((a,r)=>a+presentCount(r,s.id),0); return pct(tp,totalWD)<75; }).length;
  const avgP     = clsStu.length ? Math.round(clsStu.reduce((a,s)=>{ const tp=clsRec.reduce((b,r)=>b+presentCount(r,s.id),0); return a+pct(tp,totalWD); },0)/clsStu.length) : 0;

  return(
    <div className="space-y-5">
      {showModal && <AddStudentModal onAdd={onAdd} onClose={()=>setShowModal(false)} defaultClass={selClass} defaultSection={selSec} user={user}/>}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-800">Students</h2>
          <p className="text-sm text-gray-500">Class {selClass} – Section {selSec} · {clsStu.length} enrolled</p></div>
        <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={()=>setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
          style={{background:"linear-gradient(135deg,#4e73df,#1cc88a)"}}>
          <span className="text-base font-bold">+</span> Add Student
        </motion.button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center border-l-4 border-[#4e73df]">
          <div className="text-2xl font-bold text-[#4e73df]">{clsStu.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">Total Students</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center border-l-4 border-[#1cc88a]">
          <div className="text-2xl font-bold text-[#1cc88a]">{avgP}%</div>
          <div className="text-xs text-gray-400 mt-0.5">Class Avg</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center border-l-4 border-[#e74a3b]">
          <div className="text-2xl font-bold text-[#e74a3b]">{below75}</div>
          <div className="text-xs text-gray-400 mt-0.5">Below 75%</div>
        </div>
      </div>

      {/* Search + table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="🔍 Search by name or roll number…"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30"/>
          <span className="text-xs text-gray-400 shrink-0">{filtered.length} of {clsStu.length}</span>
        </div>
        {filtered.length === 0
          ? <div className="py-16 text-center">
              <div className="text-5xl mb-3">👨‍🎓</div>
              <p className="text-gray-400 font-medium">{clsStu.length===0?"No students enrolled yet.":"No students match your search."}</p>
              {clsStu.length===0&&<button onClick={()=>setShowModal(true)} className="mt-4 px-5 py-2 rounded-xl text-white text-sm font-semibold" style={{background:"linear-gradient(135deg,#4e73df,#1cc88a)"}}>+ Add First Student</button>}
            </div>
          : <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{["#","Roll","Name","Total Present","Absent","Att. %","Status",""].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((s,i)=>{ const tp=clsRec.reduce((a,r)=>a+presentCount(r,s.id),0); const p=pct(tp,totalWD);
                  return(<tr key={s.id} className="border-t border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-2.5 text-gray-400 font-medium">#{i+1}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-500 text-xs">{s.rollNo}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{background:"linear-gradient(135deg,#4e73df,#1cc88a)"}}>{s.name.charAt(0)}</div>
                        <div><p className="font-semibold text-gray-800">{s.name}</p><p className="text-xs text-gray-400">Class {s.class}{s.section}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-green-600 font-bold">{tp}</td>
                    <td className="px-4 py-2.5 text-red-500 font-bold">{totalWD-tp}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-2 rounded-full transition-all" style={{width:`${p}%`,background:gc(p)}}/></div>
                        <span className="font-bold text-xs" style={{color:gc(p)}}>{p}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><Badge label={p>=75?"Regular":"Irregular"} color={p>=75?"green":"red"}/></td>
                    <td className="px-4 py-2.5">
                      {confirmDel===s.id
                        ? <div className="flex items-center gap-1">
                            <button onClick={()=>{onRemove(s.id);setConfirmDel(null);}} className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold">Delete</button>
                            <button onClick={()=>setConfirmDel(null)} className="px-2 py-1 rounded-lg bg-gray-100 text-gray-500 text-xs">Cancel</button>
                          </div>
                        : <button onClick={()=>setConfirmDel(s.id)} className="text-gray-300 hover:text-red-400 text-lg font-bold transition-colors">×</button>
                      }
                    </td>
                  </tr>);
                })}
              </tbody>
            </table>
        }
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MANAGE USERS
// ══════════════════════════════════════════════════════════════════════════════
function ManageUsers({ users,currentUser,onUpdate }: { users:UserAccount[]; currentUser:UserAccount; onUpdate:(u:UserAccount[])=>void }){
  const [form,setForm]=useState({username:"",password:"",displayName:"",role:"teacher" as "admin"|"teacher",assignedClass:1,assignedSection:"A"});
  const [msg,setMsg]=useState<{text:string;ok:boolean}|null>(null);
  function addUser(){
    if(!form.username.trim()||!form.password.trim()||!form.displayName.trim()){setMsg({text:"All fields required.",ok:false});return;}
    if(users.find(u=>u.username===form.username)){setMsg({text:"Username already exists.",ok:false});return;}
    const newUser:UserAccount={id:uid(),...form,assignedClass:form.role==="admin"?null:form.assignedClass,assignedSection:form.role==="admin"?null:form.assignedSection};
    onUpdate([...users,newUser]); setForm({username:"",password:"",displayName:"",role:"teacher",assignedClass:1,assignedSection:"A"});
    setMsg({text:"User created!",ok:true}); setTimeout(()=>setMsg(null),2500);
  }
  function deleteUser(id:string){ if(id===currentUser.id){setMsg({text:"Cannot delete your own account.",ok:false});return;} onUpdate(users.filter(u=>u.id!==id)); }
  const [editPassMap,setEditPassMap]=useState<Record<string,string>>({});
  function changePassword(id:string){ const np=editPassMap[id]; if(!np?.trim()) return; onUpdate(users.map(u=>u.id===id?{...u,password:np}:u)); setEditPassMap(p=>({...p,[id]:""})); setMsg({text:"Password updated!",ok:true}); setTimeout(()=>setMsg(null),2000); }
  return(
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-gray-800">Manage Users</h2><p className="text-sm text-gray-500">Create and manage teacher/admin accounts</p></div>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm">Create New Account</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[{label:"Display Name",val:form.displayName,set:(v:string)=>setForm(f=>({...f,displayName:v})),ph:"Ms. Priya Sharma"},{label:"Username",val:form.username,set:(v:string)=>setForm(f=>({...f,username:v})),ph:"teacher5"},{label:"Password",val:form.password,set:(v:string)=>setForm(f=>({...f,password:v})),ph:"••••••"}].map(f=>(
            <div key={f.label}>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">{f.label}</label>
              <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30"/>
            </div>
          ))}
          <div><label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Role</label>
            <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value as "admin"|"teacher"}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              <option value="teacher">Teacher</option><option value="admin">Admin</option>
            </select>
          </div>
          {form.role==="teacher"&&<>
            <div><label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Assigned Class</label>
              <select value={form.assignedClass} onChange={e=>setForm(f=>({...f,assignedClass:Number(e.target.value)}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {CLASSES.map(c=><option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Section</label>
              <select value={form.assignedSection??""} onChange={e=>setForm(f=>({...f,assignedSection:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {SECTIONS.map(s=><option key={s}>Section {s}</option>)}
              </select>
            </div>
          </>}
        </div>
        <AnimatePresence>{msg&&<motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="px-4 py-2.5 rounded-xl text-xs mb-3" style={{background:msg.ok?"#dcfce7":"#fee2e2",color:msg.ok?"#16a34a":"#dc2626"}}>{msg.ok?"✓ ":"⚠️ "}{msg.text}</motion.div>}</AnimatePresence>
        <button onClick={addUser} className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold" style={{background:"linear-gradient(135deg,#4e73df,#1cc88a)"}}>+ Create Account</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-700 text-sm">All Accounts ({users.length})</h3></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>{["User","Username","Role","Assigned To","Change Password",""].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>{users.map(u=>(
            <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50/50">
              <td className="px-4 py-2.5"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{background:u.role==="admin"?"linear-gradient(135deg,#f6c23e,#e74a3b)":"linear-gradient(135deg,#4e73df,#1cc88a)"}}>{u.displayName.charAt(0)}</div><span className="font-medium text-gray-800">{u.displayName}</span></div></td>
              <td className="px-4 py-2.5 font-mono text-gray-600">{u.username}</td>
              <td className="px-4 py-2.5"><Badge label={u.role} color={u.role==="admin"?"yellow":"blue"}/></td>
              <td className="px-4 py-2.5 text-gray-500">{u.role==="admin"?"All Classes":`Class ${u.assignedClass} – Sec ${u.assignedSection}`}</td>
              <td className="px-4 py-2.5"><div className="flex items-center gap-2">
                <input value={editPassMap[u.id]??""} onChange={e=>setEditPassMap(p=>({...p,[u.id]:e.target.value}))} placeholder="New password" className="w-32 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none"/>
                <button onClick={()=>changePassword(u.id)} className="px-2 py-1.5 rounded-lg text-white text-xs" style={{background:"#4e73df"}}>Set</button>
              </div></td>
              <td className="px-4 py-2.5">{u.id!==currentUser.id&&<button onClick={()=>deleteUser(u.id)} className="text-gray-300 hover:text-red-400 text-lg font-bold">×</button>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════════════════════════════
function Settings({ currentUser,users,onUpdate }: { currentUser:UserAccount; users:UserAccount[]; onUpdate:(u:UserAccount[])=>void }){
  const [oldPass,setOldPass]=useState(""); const [newPass,setNewPass]=useState(""); const [confirm,setConfirm]=useState("");
  const [dispName,setDispName]=useState(currentUser.displayName);
  const [msg,setMsg]=useState<{text:string;ok:boolean}|null>(null);
  function changePass(e:React.FormEvent){ e.preventDefault();
    if(oldPass!==currentUser.password){setMsg({text:"Current password incorrect.",ok:false});return;}
    if(newPass.length<4){setMsg({text:"Min 4 characters.",ok:false});return;}
    if(newPass!==confirm){setMsg({text:"Passwords do not match.",ok:false});return;}
    onUpdate(users.map(u=>u.id===currentUser.id?{...u,password:newPass}:u));
    setMsg({text:"Password changed!",ok:true}); setOldPass(""); setNewPass(""); setConfirm(""); setTimeout(()=>setMsg(null),3000);
  }
  function updateName(e:React.FormEvent){ e.preventDefault(); if(!dispName.trim()) return;
    onUpdate(users.map(u=>u.id===currentUser.id?{...u,displayName:dispName.trim()}:u));
    setMsg({text:"Name updated!",ok:true}); setTimeout(()=>setMsg(null),2000);
  }
  return(
    <div className="space-y-5 max-w-lg">
      <div><h2 className="text-xl font-bold text-gray-800">Settings</h2><p className="text-sm text-gray-500">Manage your account</p></div>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold" style={{background:currentUser.role==="admin"?"linear-gradient(135deg,#f6c23e,#e74a3b)":"linear-gradient(135deg,#4e73df,#1cc88a)"}}>{currentUser.displayName.charAt(0)}</div>
          <div><p className="font-bold text-gray-800">{currentUser.displayName}</p><p className="text-sm text-gray-500">{currentUser.username} · <span className="capitalize">{currentUser.role}</span></p>{currentUser.role==="teacher"&&<p className="text-xs text-blue-500">Class {currentUser.assignedClass} – Section {currentUser.assignedSection}</p>}</div>
        </div>
        <form onSubmit={updateName}>
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Display Name</label>
          <div className="flex gap-3"><input value={dispName} onChange={e=>setDispName(e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30"/>
          <button type="submit" className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold" style={{background:"linear-gradient(135deg,#4e73df,#1cc88a)"}}>Update</button></div>
        </form>
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm">Change Password</h3>
        <form onSubmit={changePass} className="space-y-3">
          {[{label:"Current Password",val:oldPass,set:setOldPass},{label:"New Password",val:newPass,set:setNewPass},{label:"Confirm New Password",val:confirm,set:setConfirm}].map(f=>(
            <div key={f.label}><label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">{f.label}</label>
            <input type="password" value={f.val} onChange={e=>f.set(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30"/></div>
          ))}
          <AnimatePresence>{msg&&<motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="px-4 py-3 rounded-xl text-sm" style={{background:msg.ok?"#dcfce7":"#fee2e2",color:msg.ok?"#16a34a":"#dc2626"}}>{msg.ok?"✓ ":"⚠️ "}{msg.text}</motion.div>}</AnimatePresence>
          <button type="submit" className="w-full py-3 rounded-xl text-white font-semibold text-sm" style={{background:"linear-gradient(135deg,#4e73df,#1cc88a)"}}>Change Password</button>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════════════════
export function AttendanceApp(){
  const [users,setUsers]       = useLS<UserAccount[]>(LS_USERS, DEFAULT_USERS);
  const [students,setStudents] = useLS<Student[]>(LS_STUDENTS, SEED_STUDENTS);
  const [records,setRecords]   = useLS<MonthRecord[]>(LS_RECORDS, SEED_RECORDS);
  const [currentUser,setCurrentUser] = useState<UserAccount|null>(null);
  const [page,setPage]         = useState("dashboard");
  const [selClass,setSelClass] = useState(1);
  const [selSec,setSelSec]     = useState("A");
  const [showAddModal,setShowAddModal] = useState(false);

  function handleLogin(u: UserAccount){
    setCurrentUser(u);
    if(u.role==="teacher"&&u.assignedClass){ setSelClass(u.assignedClass); setSelSec(u.assignedSection??"A"); }
  }
  if(!currentUser) return <LoginPage users={users} onLogin={handleLogin}/>;

  const eClass = currentUser.role==="teacher" ? (currentUser.assignedClass??selClass) : selClass;
  const eSec   = currentUser.role==="teacher" ? (currentUser.assignedSection??selSec) : selSec;

  function addStudent(s: Student){ setStudents(p=>[...p,s]); setRecords(p=>p.map(r=>r.class===s.class&&r.section===s.section?{...r,daily:{...r.daily,[s.id]:{}}}:r)); }
  function removeStudent(id: string){ setStudents(p=>p.filter(s=>s.id!==id)); }
  function updateDailyRecord(key: string, daily: Record<string,Record<string,"P"|"A">>){ setRecords(p=>p.map(r=>r.key===key?{...r,daily}:r)); }

  const shared = { students, records, selClass:eClass, selSec:eSec };
  const showFilter = currentUser.role==="admin" && !["users","settings"].includes(page);

  const pages: Record<string,React.ReactNode> = {
    dashboard: <Dashboard {...shared}/>,
    daily:     <DailyAttendance {...shared} onUpdate={updateDailyRecord}/>,
    monthly:   <MonthlyReport {...shared}/>,
    analytics: <Analytics {...shared}/>,
    students:  <StudentsTab {...shared} onAdd={addStudent} onRemove={removeStudent} user={currentUser}/>,
    users:     <ManageUsers users={users} currentUser={currentUser} onUpdate={setUsers}/>,
    settings:  <Settings currentUser={currentUser} users={users} onUpdate={u=>{ setUsers(u); setCurrentUser(u.find(x=>x.id===currentUser.id)??currentUser); }}/>,
  };

  return(
    <div className="flex h-screen bg-[#eef2f7] overflow-hidden" style={{fontFamily:"'Poppins',sans-serif"}}>
      {/* Global Add Student Modal */}
      {showAddModal && (
        <AddStudentModal
          onAdd={addStudent}
          onClose={()=>setShowAddModal(false)}
          defaultClass={eClass}
          defaultSection={eSec}
          user={currentUser}
        />
      )}

      <div className="w-52 shrink-0 shadow-xl"><Sidebar active={page} onNav={setPage} onLogout={()=>setCurrentUser(null)} user={currentUser}/></div>
      <div className="flex-1 overflow-y-auto relative">
        <div className="p-6 max-w-5xl">
          {showFilter&&<ClassFilter selClass={eClass} selSec={eSec} setClass={setSelClass} setSec={setSelSec} user={currentUser}/>}
          {pages[page]}
        </div>

        {/* Floating "+ Add Student" button — visible on all pages except users/settings */}
        {!["users","settings"].includes(page) && (
          <motion.button
            onClick={()=>setShowAddModal(true)}
            whileHover={{scale:1.06, boxShadow:"0 8px 30px rgba(78,115,223,0.45)"}}
            whileTap={{scale:0.94}}
            className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold text-sm shadow-xl"
            style={{background:"linear-gradient(135deg,#4e73df,#1cc88a)", zIndex:40}}
            initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.3}}>
            <span className="text-lg font-bold leading-none">+</span>
            Add Student
          </motion.button>
        )}
      </div>
    </div>
  );
}
