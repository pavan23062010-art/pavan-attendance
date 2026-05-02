import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area,
} from "recharts";

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════
interface UserAccount {
  id: string;
  username: string;
  password: string;
  role: "admin" | "teacher";
  displayName: string;
  assignedClass: number | null;   // null = all classes (admin)
  assignedSection: string | null; // null = all sections
}

interface Student {
  id: string;
  name: string;
  rollNo: string;
  class: number;
  section: string;
}

interface MonthRecord {
  key: string; // `${class}-${section}-${month}`
  month: string;
  class: number;
  section: string;
  workingDays: number;
  present: Record<string, number>;
}

// ══════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════
const CLASSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SECTIONS = ["A", "B", "C"];
const ACADEMIC_MONTHS = [
  "Jul-2026","Aug-2026","Sep-2026","Oct-2026","Nov-2026","Dec-2026",
  "Jan-2027","Feb-2027","Mar-2027","Apr-2027","May-2027","Jun-2027",
];
const MONTH_LABELS = ["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"];
const WORKING_DAYS = [25,26,24,25,22,20,26,24,27,25,26,24];
const PIE_COLORS = ["#4e73df","#1cc88a","#f6c23e","#e74a3b","#36b9cc","#858796"];

const LS_USERS = "sa_users";
const LS_STUDENTS = "sa_students";
const LS_RECORDS = "sa_records";

// ══════════════════════════════════════════════════════════════════
// SEED DATA
// ══════════════════════════════════════════════════════════════════
const FIRST_NAMES = ["Aarav","Priya","Rahul","Sneha","Arjun","Kavya","Rohan","Divya","Kiran","Meera",
  "Vikram","Ananya","Siddharth","Pooja","Aditya","Riya","Nikhil","Shreya","Ayaan","Naina"];
const LAST_NAMES = ["Sharma","Patel","Reddy","Kumar","Singh","Nair","Rao","Gupta","Joshi","Mehta"];

function genName(seed: number) {
  return `${FIRST_NAMES[seed % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(seed / FIRST_NAMES.length) % LAST_NAMES.length]}`;
}

function generateStudents(): Student[] {
  const students: Student[] = [];
  let globalIdx = 0;
  CLASSES.forEach(cls => {
    SECTIONS.forEach(sec => {
      for (let i = 0; i < 5; i++) {
        const roll = String(globalIdx + 1).padStart(3, "0");
        students.push({
          id: `s${globalIdx}`,
          name: genName(globalIdx),
          rollNo: roll,
          class: cls,
          section: sec,
        });
        globalIdx++;
      }
    });
  });
  return students;
}

function generateRecords(students: Student[]): MonthRecord[] {
  const records: MonthRecord[] = [];
  CLASSES.forEach(cls => {
    SECTIONS.forEach(sec => {
      const classStudents = students.filter(s => s.class === cls && s.section === sec);
      ACADEMIC_MONTHS.forEach((month, mi) => {
        const wd = WORKING_DAYS[mi];
        const present: Record<string, number> = {};
        classStudents.forEach((s, si) => {
          const pct = 70 + ((si * 7 + cls * 3 + mi * 2) % 28);
          present[s.id] = Math.round(wd * (pct / 100));
        });
        records.push({ key: `${cls}-${sec}-${month}`, month, class: cls, section: sec, workingDays: wd, present });
      });
    });
  });
  return records;
}

const SEED_STUDENTS = generateStudents();
const SEED_RECORDS = generateRecords(SEED_STUDENTS);

const DEFAULT_USERS: UserAccount[] = [
  { id: "u0", username: "admin",    password: "admin123",  role: "admin",   displayName: "Pavan (Admin)", assignedClass: null, assignedSection: null },
  { id: "u1", username: "teacher1", password: "teach1",   role: "teacher", displayName: "Ms. Priya",     assignedClass: 1,    assignedSection: "A" },
  { id: "u2", username: "teacher2", password: "teach2",   role: "teacher", displayName: "Mr. Rahul",     assignedClass: 2,    assignedSection: "B" },
  { id: "u3", username: "teacher3", password: "teach3",   role: "teacher", displayName: "Ms. Sneha",     assignedClass: 5,    assignedSection: "C" },
  { id: "u4", username: "teacher4", password: "teach4",   role: "teacher", displayName: "Mr. Arjun",     assignedClass: 10,   assignedSection: "A" },
];

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════
function pct(p: number, t: number) { return t === 0 ? 0 : Math.round((p / t) * 100); }
function gc(p: number) { return p >= 85 ? "#1cc88a" : p >= 75 ? "#f6c23e" : "#e74a3b"; }
function uid() { return Math.random().toString(36).slice(2, 9); }

function useLS<T>(key: string, fallback: T): [T, (v: T | ((p: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
  });
  const set = (v: T | ((p: T) => T)) => {
    setVal(prev => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return [val, set];
}

function Avatar({ name, size = 8, bg }: { name: string; size?: number; bg?: string }) {
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
      style={{ background: bg ?? "linear-gradient(135deg,#4e73df,#1cc88a)", fontSize: size * 2 }}>
      {name.charAt(0)}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  const map: Record<string, string> = { green: "#dcfce7:#16a34a", yellow: "#fef9c3:#ca8a04", red: "#fee2e2:#dc2626", blue: "#dbeafe:#2563eb" };
  const [bg, fg] = (map[color] ?? "#e5e7eb:#374151").split(":");
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: bg, color: fg }}>{label}</span>;
}

// ══════════════════════════════════════════════════════════════════
// PARTICLES + TYPEWRITER (Login)
// ══════════════════════════════════════════════════════════════════
function Particle({ index }: { index: number }) {
  const size = 6 + (index % 4) * 4;
  const startX = (index * 137.5) % 100;
  const duration = 8 + (index % 5) * 2;
  const delay = (index * 0.7) % 6;
  const colors = ["#4e73df33","#1cc88a33","#f6c23e33","#e74a3b22","#36b9cc33"];
  return (
    <motion.div className="absolute rounded-full pointer-events-none"
      style={{ width: size, height: size, left: `${startX}%`, background: colors[index % colors.length] }}
      initial={{ y: "110vh", opacity: 0 }}
      animate={{ y: "-10vh", opacity: [0, 0.8, 0.8, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }} />
  );
}

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);
  useEffect(() => {
    idx.current = 0; setDisplayed("");
    const iv = setInterval(() => {
      if (idx.current < text.length) { setDisplayed(text.slice(0, ++idx.current)); }
      else clearInterval(iv);
    }, 60);
    return () => clearInterval(iv);
  }, [text]);
  return <span>{displayed}<span className="animate-pulse">|</span></span>;
}

// ══════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════════════════════════════
function LoginPage({ users, onLogin }: { users: UserAccount[]; onLogin: (u: UserAccount) => void }) {
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setLoading(true);
    setTimeout(() => {
      const found = users.find(u => u.username === username && u.password === pass);
      if (found) { onLogin(found); }
      else { setLoading(false); setErr("Invalid username or password."); }
    }, 1100);
  }

  return (
    <div className="min-h-screen flex overflow-hidden relative"
      style={{ fontFamily: "'Poppins', sans-serif", background: "linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)" }}>
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 18 }, (_, i) => <Particle key={i} index={i} />)}
      </div>
      <motion.div className="absolute w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,#4e73df44 0%,transparent 70%)", top: "-10%", left: "-5%" }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 6, repeat: Infinity }} />
      <motion.div className="absolute w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,#1cc88a33 0%,transparent 70%)", bottom: "-5%", right: "5%" }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 8, repeat: Infinity, delay: 2 }} />

      {/* Left panel */}
      <motion.div className="hidden md:flex flex-1 flex-col items-center justify-center px-14 relative z-10"
        initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9 }}>
        <motion.div className="w-28 h-28 rounded-3xl flex items-center justify-center text-5xl shadow-2xl mb-8"
          style={{ background: "linear-gradient(135deg,#4e73df,#1cc88a)", boxShadow: "0 0 60px #4e73df66,0 0 120px #1cc88a33" }}
          initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1, delay: 0.2, type: "spring", stiffness: 120 }}>
          🎓
        </motion.div>
        <motion.div className="text-center" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <p className="text-white/50 text-sm font-medium tracking-[0.3em] uppercase mb-2">Welcome to</p>
          <h1 className="text-4xl font-black text-white mb-1" style={{ textShadow: "0 0 40px #4e73df99" }}>SCHOOL</h1>
          <h1 className="text-4xl font-black mb-4" style={{ background: "linear-gradient(90deg,#4e73df,#1cc88a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ATTENDANCE
          </h1>
          <p className="text-white/40 text-sm"><TypewriterText text="Academic Year 2026 – 2027" /></p>
        </motion.div>
        <motion.div className="flex gap-4 mt-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
          {[{ icon:"🏫", label:"Classes", value:"10" }, { icon:"📚", label:"Sections", value:"A,B,C" }, { icon:"👨‍🏫", label:"Teachers", value:`${users.filter(u=>u.role==="teacher").length}` }].map(s => (
            <motion.div key={s.label} whileHover={{ scale: 1.05, y: -4 }}
              className="flex flex-col items-center px-5 py-3 rounded-2xl text-center"
              style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span className="text-xl mb-1">{s.icon}</span>
              <span className="text-white font-bold">{s.value}</span>
              <span className="text-white/40 text-xs">{s.label}</span>
            </motion.div>
          ))}
        </motion.div>
        <motion.p className="absolute bottom-6 text-white/25 text-xs tracking-widest uppercase" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
          Made by <span className="text-white/50 font-semibold">Pavan</span>
        </motion.p>
      </motion.div>

      <div className="hidden md:block w-px self-stretch my-16" style={{ background: "linear-gradient(to bottom,transparent,rgba(255,255,255,0.15),transparent)" }} />

      {/* Right panel */}
      <motion.div className="flex-1 flex flex-col items-center justify-center px-10 relative z-10"
        initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9 }}>
        <motion.div className="w-full max-w-sm" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
            <div className="mb-7">
              <h2 className="text-white text-2xl font-bold">Sign In</h2>
              <p className="text-white/40 text-sm mt-1">Access your attendance portal</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-5">
              {[
                { key: "user", label: "Username", icon: "👤", value: username, set: setUsername, type: "text", placeholder: "Enter username" },
                { key: "pass", label: "Password", icon: "🔒", value: pass, set: setPass, type: showPass ? "text" : "password", placeholder: "Enter password" },
              ].map(f => (
                <motion.div key={f.key} animate={{ y: focused === f.key ? -2 : 0 }} transition={{ duration: 0.2 }}>
                  <label className="block text-xs font-semibold text-white/50 mb-2 tracking-widest uppercase">{f.label}</label>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                    style={{ background: "rgba(255,255,255,0.07)", border: `1.5px solid ${focused === f.key ? (f.key === "user" ? "#4e73df" : "#1cc88a") : "rgba(255,255,255,0.1)"}`, boxShadow: focused === f.key ? `0 0 0 3px ${f.key === "user" ? "#4e73df22" : "#1cc88a22"}` : "none" }}>
                    <span className="text-white/40 text-sm">{f.icon}</span>
                    <input value={f.value} onChange={e => f.set(e.target.value)} type={f.type} placeholder={f.placeholder}
                      onFocus={() => setFocused(f.key)} onBlur={() => setFocused(null)}
                      className="flex-1 bg-transparent text-white text-sm placeholder-white/25 focus:outline-none" />
                    {f.key === "pass" && (
                      <button type="button" onClick={() => setShowPass(v => !v)} className="text-white/30 hover:text-white/60 text-sm">{showPass ? "🙈" : "👁️"}</button>
                    )}
                  </div>
                </motion.div>
              ))}
              <AnimatePresence>
                {err && (
                  <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs" style={{ background: "#e74a3b22", border: "1px solid #e74a3b44", color: "#ff6b6b" }}>
                    ⚠️ {err}
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button type="submit" whileHover={{ scale: 1.02, boxShadow: "0 0 30px #4e73df66" }} whileTap={{ scale: 0.97 }}
                disabled={loading} className="w-full py-3.5 rounded-2xl text-white font-bold text-sm relative overflow-hidden"
                style={{ background: "linear-gradient(135deg,#4e73df,#1cc88a)" }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    Authenticating...
                  </span>
                ) : <span>Sign In →</span>}
                <motion.div className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)" }}
                  animate={{ x: ["-100%","200%"] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }} />
              </motion.button>
            </form>
          </div>
          <p className="text-center text-white/20 text-xs mt-5 tracking-widest uppercase">Made by <span className="text-white/40 font-semibold">Pavan</span></p>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════════════════════
const NAV_ADMIN   = [{ id:"dashboard",icon:"🏠",label:"Dashboard"},{ id:"monthly",icon:"📅",label:"Monthly Report"},{ id:"analytics",icon:"📊",label:"Analytics"},{ id:"students",icon:"👨‍🎓",label:"Students"},{ id:"mark",icon:"✅",label:"Mark Attendance"},{ id:"users",icon:"👥",label:"Manage Users"},{ id:"settings",icon:"⚙️",label:"Settings"}];
const NAV_TEACHER = [{ id:"dashboard",icon:"🏠",label:"Dashboard"},{ id:"monthly",icon:"📅",label:"Monthly Report"},{ id:"analytics",icon:"📊",label:"Analytics"},{ id:"students",icon:"👨‍🎓",label:"Students"},{ id:"mark",icon:"✅",label:"Mark Attendance"},{ id:"settings",icon:"⚙️",label:"Settings"}];

function Sidebar({ active, onNav, onLogout, user }: { active: string; onNav: (id: string) => void; onLogout: () => void; user: UserAccount }) {
  const nav = user.role === "admin" ? NAV_ADMIN : NAV_TEACHER;
  return (
    <div className="flex flex-col h-full py-5 px-3" style={{ background: "linear-gradient(180deg,#4e73df 0%,#224abe 100%)" }}>
      <div className="text-center mb-5 px-2">
        <div className="text-2xl font-bold text-white mb-1">🎓</div>
        <p className="text-white/90 text-xs font-semibold">School Attendance</p>
        <div className="mt-3 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
          <p className="text-white text-xs font-semibold truncate">{user.displayName}</p>
          <p className="text-white/50 text-xs capitalize">{user.role}{user.role === "teacher" && user.assignedClass ? ` · Cl ${user.assignedClass}${user.assignedSection}` : ""}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5">
        {nav.map(n => (
          <button key={n.id} onClick={() => onNav(n.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: active === n.id ? "rgba(255,255,255,0.2)" : "transparent", color: active === n.id ? "white" : "rgba(255,255,255,0.6)" }}>
            <span className="text-base">{n.icon}</span><span className="text-left">{n.label}</span>
          </button>
        ))}
      </nav>
      <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all">
        🚪 Logout
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CLASS / SECTION FILTER BAR
// ══════════════════════════════════════════════════════════════════
function ClassFilter({ selClass, selSec, setClass, setSec, user }: {
  selClass: number; selSec: string; setClass: (v: number) => void; setSec: (v: string) => void; user: UserAccount;
}) {
  if (user.role === "teacher") {
    return (
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Class</span>
        <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 text-sm font-semibold">{user.assignedClass}</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-2">Section</span>
        <span className="px-3 py-1.5 rounded-xl bg-green-50 text-green-600 text-sm font-semibold">{user.assignedSection}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Class</span>
        <div className="flex gap-1 flex-wrap">
          {CLASSES.map(c => (
            <button key={c} onClick={() => setClass(c)}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{ background: selClass === c ? "#4e73df" : "#f0f2f8", color: selClass === c ? "white" : "#555" }}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Section</span>
        {SECTIONS.map(s => (
          <button key={s} onClick={() => setSec(s)}
            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            style={{ background: selSec === s ? "#1cc88a" : "#f0f2f8", color: selSec === s ? "white" : "#555" }}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// STAT CARD
// ══════════════════════════════════════════════════════════════════
function StatCard({ label, value, sub, color, icon }: { label: string; value: string | number; sub?: string; color: string; icon: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4" style={{ borderColor: color }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <span className="text-3xl opacity-20">{icon}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════
function Dashboard({ students, records, selClass, selSec }: { students: Student[]; records: MonthRecord[]; selClass: number; selSec: string }) {
  const clsStu = students.filter(s => s.class === selClass && s.section === selSec);
  const clsRec = records.filter(r => r.class === selClass && r.section === selSec);
  const totalWD = clsRec.reduce((a, r) => a + r.workingDays, 0);

  const avgPct = useMemo(() => {
    let tp = 0, tposs = 0;
    clsStu.forEach(s => clsRec.forEach(r => { tp += r.present[s.id] ?? 0; tposs += r.workingDays; }));
    return pct(tp, tposs);
  }, [clsStu, clsRec]);

  const lowCount = clsStu.filter(s => { const tp = clsRec.reduce((a, r) => a + (r.present[s.id] ?? 0), 0); return pct(tp, totalWD) < 75; }).length;

  const barData = clsRec.map((r, i) => {
    const avg = clsStu.reduce((a, s) => a + (r.present[s.id] ?? 0), 0) / (clsStu.length || 1);
    return { name: MONTH_LABELS[ACADEMIC_MONTHS.indexOf(r.month)], "Working Days": r.workingDays, "Avg Present": Math.round(avg) };
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-sm text-gray-500">Class {selClass} – Section {selSec} · Academic Year 2026–2027</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Students" value={clsStu.length} icon="👨‍🎓" color="#4e73df" sub="Enrolled" />
        <StatCard label="Working Days" value={totalWD} icon="📅" color="#1cc88a" sub="Full year" />
        <StatCard label="Avg Attendance" value={`${avgPct}%`} icon="✅" color="#f6c23e" sub="All students" />
        <StatCard label="Below 75%" value={lowCount} icon="⚠️" color="#e74a3b" sub="At risk" />
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm">Monthly Working Days vs Avg Present</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Working Days" fill="#c5cef5" radius={[4,4,0,0]} />
            <Bar dataKey="Avg Present" fill="#4e73df" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">Student Snapshot</h3>
        <div className="space-y-3">
          {clsStu.map(s => {
            const tp = clsRec.reduce((a, r) => a + (r.present[s.id] ?? 0), 0);
            const p = pct(tp, totalWD);
            return (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#4e73df,#1cc88a)" }}>{s.name.charAt(0)}</div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{s.name}</span>
                    <span className="text-sm font-bold" style={{ color: gc(p) }}>{p}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-2 rounded-full" style={{ width: `${p}%`, background: gc(p) }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MONTHLY REPORT
// ══════════════════════════════════════════════════════════════════
function MonthlyReport({ students, records, selClass, selSec }: { students: Student[]; records: MonthRecord[]; selClass: number; selSec: string }) {
  const [selMonth, setSelMonth] = useState(ACADEMIC_MONTHS[0]);
  const clsStu = students.filter(s => s.class === selClass && s.section === selSec);
  const rec = records.find(r => r.class === selClass && r.section === selSec && r.month === selMonth);
  const wd = rec?.workingDays ?? 0;

  const tableData = clsStu.map(s => {
    const pr = rec?.present[s.id] ?? 0;
    return { ...s, present: pr, absent: wd - pr, percentage: pct(pr, wd) };
  }).sort((a, b) => b.percentage - a.percentage);

  const avgPct = Math.round(tableData.reduce((a, d) => a + d.percentage, 0) / (tableData.length || 1));
  const barData = tableData.map(d => ({ name: d.name.split(" ")[0], Present: d.present, Absent: d.absent }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Monthly Report</h2>
          <p className="text-sm text-gray-500">Class {selClass} – Sec {selSec}</p>
        </div>
        <select value={selMonth} onChange={e => setSelMonth(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30">
          {ACADEMIC_MONTHS.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[{ label:"Working Days", value:wd, color:"#4e73df" }, { label:"Class Avg", value:`${avgPct}%`, color:"#1cc88a" }, { label:"Below 75%", value:tableData.filter(d=>d.percentage<75).length, color:"#e74a3b" }].map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-xl font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm">Present vs Absent — {selMonth}</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={barData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
            <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Present" fill="#1cc88a" radius={[4,4,0,0]} stackId="a" />
            <Bar dataKey="Absent" fill="#e74a3b" radius={[4,4,0,0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700 text-sm">Student Report — {selMonth}</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>{["#","Roll","Name","Present","Absent","WD","%","Status"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {tableData.map((d, i) => (
              <tr key={d.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 text-gray-400 font-medium">#{i+1}</td>
                <td className="px-4 py-2.5 text-gray-500">{d.rollNo}</td>
                <td className="px-4 py-2.5"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#4e73df,#1cc88a)" }}>{d.name.charAt(0)}</div>{d.name}</div></td>
                <td className="px-4 py-2.5 text-green-600 font-semibold">{d.present}</td>
                <td className="px-4 py-2.5 text-red-500 font-semibold">{d.absent}</td>
                <td className="px-4 py-2.5 text-gray-500">{wd}</td>
                <td className="px-4 py-2.5"><span className="font-bold" style={{ color: gc(d.percentage) }}>{d.percentage}%</span></td>
                <td className="px-4 py-2.5"><Badge label={d.percentage>=75?"Regular":"Irregular"} color={d.percentage>=75?"green":"red"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════════════
function Analytics({ students, records, selClass, selSec }: { students: Student[]; records: MonthRecord[]; selClass: number; selSec: string }) {
  const clsStu = students.filter(s => s.class === selClass && s.section === selSec);
  const clsRec = records.filter(r => r.class === selClass && r.section === selSec);
  const totalWD = clsRec.reduce((a, r) => a + r.workingDays, 0);

  const getP = (s: Student) => { const tp = clsRec.reduce((a, r) => a + (r.present[s.id] ?? 0), 0); return pct(tp, totalWD); };
  const totalPresent = clsStu.reduce((a, s) => a + clsRec.reduce((b, r) => b + (r.present[s.id] ?? 0), 0), 0);
  const totalPoss = clsStu.length * totalWD;

  const pieData = [{ name:"Present", value: totalPresent }, { name:"Absent", value: totalPoss - totalPresent }];
  const catData = [
    { name:"≥90% Excellent", value: clsStu.filter(s => getP(s) >= 90).length },
    { name:"75–89% Good",    value: clsStu.filter(s => { const p=getP(s); return p>=75&&p<90; }).length },
    { name:"<75% At Risk",   value: clsStu.filter(s => getP(s) < 75).length },
  ];
  const lineData = clsRec.map((r, i) => ({
    name: MONTH_LABELS[ACADEMIC_MONTHS.indexOf(r.month)],
    "Avg %": clsStu.length ? Math.round(clsStu.reduce((a, s) => a + pct(r.present[s.id]??0, r.workingDays), 0) / clsStu.length) : 0,
  }));
  let cum=0, cumP=0;
  const areaData = clsRec.map((r, i) => {
    cum += clsStu.reduce((a, s) => a + (r.present[s.id]??0), 0);
    cumP += r.workingDays * clsStu.length;
    return { name: MONTH_LABELS[ACADEMIC_MONTHS.indexOf(r.month)], "Cumulative %": Math.round((cum/(cumP||1))*100) };
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Analytics</h2>
        <p className="text-sm text-gray-500">Class {selClass} – Sec {selSec} · Full year charts</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Overall Present vs Absent</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {pieData.map((_, i) => <Cell key={i} fill={["#4e73df","#e74a3b"][i]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Students by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={catData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                {catData.map((_, i) => <Cell key={i} fill={["#1cc88a","#f6c23e","#e74a3b"][i]} />)}
              </Pie>
              <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Monthly Avg Attendance %</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={lineData} margin={{ top:4,right:16,bottom:4,left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize:10 }} /><YAxis domain={[0,100]} tick={{ fontSize:10 }} unit="%" />
              <Tooltip formatter={(v:number) => `${v}%`} />
              <Line type="monotone" dataKey="Avg %" stroke="#4e73df" strokeWidth={2.5} dot={{ fill:"#4e73df",r:4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Cumulative Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={areaData} margin={{ top:4,right:16,bottom:4,left:0 }}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1cc88a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1cc88a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize:10 }} /><YAxis domain={[60,100]} tick={{ fontSize:10 }} unit="%" />
              <Tooltip formatter={(v:number) => `${v}%`} />
              <Area type="monotone" dataKey="Cumulative %" stroke="#1cc88a" strokeWidth={2.5} fill="url(#cg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// STUDENTS TAB
// ══════════════════════════════════════════════════════════════════
function StudentsTab({ students, records, selClass, selSec, onAdd, onRemove, user }: {
  students: Student[]; records: MonthRecord[]; selClass: number; selSec: string;
  onAdd: (s: Student) => void; onRemove: (id: string) => void; user: UserAccount;
}) {
  const clsRec = records.filter(r => r.class === selClass && r.section === selSec);
  const totalWD = clsRec.reduce((a, r) => a + r.workingDays, 0);
  const clsStu = students.filter(s => s.class === selClass && s.section === selSec);
  const [name, setName] = useState(""); const [roll, setRoll] = useState(""); const [search, setSearch] = useState("");

  function add() {
    if (!name.trim() || !roll.trim()) return;
    onAdd({ id: uid(), name: name.trim(), rollNo: roll.trim(), class: selClass, section: selSec });
    setName(""); setRoll("");
  }

  const filtered = clsStu.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.rollNo.includes(search));

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-gray-800">Students</h2><p className="text-sm text-gray-500">Class {selClass} – Section {selSec} · {clsStu.length} enrolled</p></div>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">Add Student</h3>
        <div className="flex gap-3">
          <input value={roll} onChange={e=>setRoll(e.target.value)} placeholder="Roll No" className="w-24 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30" />
          <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Full Name" className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30" />
          <button onClick={add} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: "linear-gradient(135deg,#4e73df,#1cc88a)" }}>Add</button>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex gap-3">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search by name or roll..." className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30" />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>{["Roll","Name","Total Present","Absent","Attendance %","Status",""].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(s => {
              const tp = clsRec.reduce((a, r) => a + (r.present[s.id]??0), 0);
              const p = pct(tp, totalWD);
              return (
                <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-500">{s.rollNo}</td>
                  <td className="px-4 py-2.5"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#4e73df,#1cc88a)" }}>{s.name.charAt(0)}</div>{s.name}</div></td>
                  <td className="px-4 py-2.5 text-green-600 font-semibold">{tp}</td>
                  <td className="px-4 py-2.5 text-red-500 font-semibold">{totalWD-tp}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-2 rounded-full" style={{ width:`${p}%`, background: gc(p) }} /></div>
                      <span className="font-bold" style={{ color: gc(p) }}>{p}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5"><Badge label={p>=75?"Regular":"Irregular"} color={p>=75?"green":"red"} /></td>
                  <td className="px-4 py-2.5"><button onClick={()=>onRemove(s.id)} className="text-gray-300 hover:text-red-400 text-lg font-bold">×</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MARK ATTENDANCE
// ══════════════════════════════════════════════════════════════════
function MarkAttendance({ students, records, selClass, selSec, onSave }: {
  students: Student[]; records: MonthRecord[]; selClass: number; selSec: string;
  onSave: (cls: number, sec: string, month: string, wd: number, present: Record<string, number>) => void;
}) {
  const [month, setMonth] = useState(ACADEMIC_MONTHS[0]);
  const [wd, setWd] = useState(25);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const clsStu = students.filter(s => s.class === selClass && s.section === selSec);

  function save() {
    const present: Record<string, number> = {};
    Object.entries(marks).forEach(([k, v]) => { present[k] = Math.min(wd, Math.max(0, Number(v) || 0)); });
    onSave(selClass, selSec, month, wd, present);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-gray-800">Mark Attendance</h2><p className="text-sm text-gray-500">Class {selClass} – Section {selSec}</p></div>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex gap-4 mb-5">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Month</label>
            <select value={month} onChange={e=>setMonth(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              {ACADEMIC_MONTHS.map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Working Days</label>
            <input type="number" value={wd} onChange={e=>setWd(Number(e.target.value))} min={1} max={31} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
          </div>
        </div>
        <div className="space-y-2">
          {clsStu.map(s => {
            const val = marks[s.id] ?? "";
            const numVal = Number(val);
            return (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#4e73df,#1cc88a)" }}>{s.name.charAt(0)}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{s.name}</div>
                  <div className="text-xs text-gray-400">Roll {s.rollNo}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={wd} value={val} placeholder="Days"
                    onChange={e=>setMarks(p=>({...p,[s.id]:e.target.value}))}
                    className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30" />
                  <span className="text-xs text-gray-400">/ {wd}</span>
                  {val !== "" && <span className="text-xs font-bold w-10 text-right" style={{ color: gc(pct(numVal,wd)) }}>{pct(numVal,wd)}%</span>}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={save} disabled={Object.keys(marks).length===0}
          className="w-full mt-5 py-3 rounded-xl text-white font-semibold text-sm"
          style={{ background: Object.keys(marks).length===0?"#ccc": saved?"#1cc88a":"linear-gradient(135deg,#4e73df,#1cc88a)" }}>
          {saved ? "✓ Saved!" : `Save Attendance for ${month}`}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MANAGE USERS (Admin only)
// ══════════════════════════════════════════════════════════════════
function ManageUsers({ users, currentUser, onUpdate }: { users: UserAccount[]; currentUser: UserAccount; onUpdate: (u: UserAccount[]) => void }) {
  const [form, setForm] = useState({ username:"", password:"", displayName:"", role:"teacher" as "admin"|"teacher", assignedClass:1, assignedSection:"A" });
  const [err, setErr] = useState("");
  const [succ, setSucc] = useState("");

  function addUser() {
    if (!form.username.trim() || !form.password.trim() || !form.displayName.trim()) { setErr("All fields are required."); return; }
    if (users.find(u => u.username === form.username)) { setErr("Username already exists."); return; }
    const newUser: UserAccount = { id: uid(), ...form, assignedClass: form.role==="admin"?null:form.assignedClass, assignedSection: form.role==="admin"?null:form.assignedSection };
    onUpdate([...users, newUser]);
    setForm({ username:"", password:"", displayName:"", role:"teacher", assignedClass:1, assignedSection:"A" });
    setErr(""); setSucc("User created!"); setTimeout(()=>setSucc(""),2000);
  }

  function deleteUser(id: string) {
    if (id === currentUser.id) { setErr("Cannot delete your own account."); return; }
    onUpdate(users.filter(u => u.id !== id));
  }

  function changePassword(id: string, newPass: string) {
    if (!newPass.trim()) return;
    onUpdate(users.map(u => u.id===id ? {...u, password:newPass} : u));
    setSucc("Password updated!"); setTimeout(()=>setSucc(""),2000);
  }

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-gray-800">Manage Users</h2><p className="text-sm text-gray-500">Create and manage teacher accounts</p></div>

      {/* Add user form */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm">Create New Account</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Display Name</label>
            <input value={form.displayName} onChange={e=>setForm(f=>({...f,displayName:e.target.value}))} placeholder="Ms. Priya Sharma"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Role</label>
            <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value as "admin"|"teacher"}))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              <option value="teacher">Teacher</option><option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Username</label>
            <input value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} placeholder="teacher5"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Password</label>
            <input value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="••••••"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30" />
          </div>
          {form.role === "teacher" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Assigned Class</label>
                <select value={form.assignedClass} onChange={e=>setForm(f=>({...f,assignedClass:Number(e.target.value)}))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                  {CLASSES.map(c=><option key={c} value={c}>Class {c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Assigned Section</label>
                <select value={form.assignedSection ?? "A"} onChange={e=>setForm(f=>({...f,assignedSection:e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                  {SECTIONS.map(s=><option key={s}>Section {s}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
        {err && <p className="text-xs text-red-500 mb-2">{err}</p>}
        {succ && <p className="text-xs text-green-600 mb-2">{succ}</p>}
        <button onClick={addUser} className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background:"linear-gradient(135deg,#4e73df,#1cc88a)" }}>
          + Create Account
        </button>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-700 text-sm">All Accounts ({users.length})</h3></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>{["User","Username","Role","Assigned To","Password",""].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {users.map(u => {
              const [editPass, setEditPass] = useState("");
              return (
                <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: u.role==="admin"?"linear-gradient(135deg,#f6c23e,#e74a3b)":"linear-gradient(135deg,#4e73df,#1cc88a)" }}>{u.displayName.charAt(0)}</div><span className="font-medium text-gray-800">{u.displayName}</span></div></td>
                  <td className="px-4 py-2.5 font-mono text-gray-600">{u.username}</td>
                  <td className="px-4 py-2.5"><Badge label={u.role} color={u.role==="admin"?"yellow":"blue"} /></td>
                  <td className="px-4 py-2.5 text-gray-500">{u.role==="admin"?"All Classes":`Class ${u.assignedClass} – Sec ${u.assignedSection}`}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <input value={editPass} onChange={e=>setEditPass(e.target.value)} placeholder="New password" className="w-32 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                      <button onClick={()=>{changePassword(u.id,editPass);setEditPass("");}} className="px-2 py-1.5 rounded-lg text-white text-xs" style={{ background:"#4e73df" }}>Set</button>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {u.id !== currentUser.id && <button onClick={()=>deleteUser(u.id)} className="text-gray-300 hover:text-red-400 text-lg font-bold">×</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════════════════
function Settings({ currentUser, users, onUpdate }: { currentUser: UserAccount; users: UserAccount[]; onUpdate: (u: UserAccount[]) => void }) {
  const [oldPass, setOldPass] = useState(""); const [newPass, setNewPass] = useState(""); const [confirm, setConfirm] = useState("");
  const [dispName, setDispName] = useState(currentUser.displayName);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function changePass(e: React.FormEvent) {
    e.preventDefault();
    if (oldPass !== currentUser.password) { setMsg({ text:"Current password is incorrect.", ok:false }); return; }
    if (newPass.length < 4) { setMsg({ text:"New password must be at least 4 characters.", ok:false }); return; }
    if (newPass !== confirm) { setMsg({ text:"Passwords do not match.", ok:false }); return; }
    onUpdate(users.map(u => u.id===currentUser.id ? {...u,password:newPass} : u));
    setMsg({ text:"Password changed successfully!", ok:true });
    setOldPass(""); setNewPass(""); setConfirm("");
    setTimeout(()=>setMsg(null),3000);
  }

  function updateName(e: React.FormEvent) {
    e.preventDefault();
    if (!dispName.trim()) return;
    onUpdate(users.map(u => u.id===currentUser.id ? {...u,displayName:dispName.trim()} : u));
    setMsg({ text:"Display name updated!", ok:true }); setTimeout(()=>setMsg(null),2000);
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div><h2 className="text-xl font-bold text-gray-800">Settings</h2><p className="text-sm text-gray-500">Manage your account</p></div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
            style={{ background: currentUser.role==="admin"?"linear-gradient(135deg,#f6c23e,#e74a3b)":"linear-gradient(135deg,#4e73df,#1cc88a)" }}>
            {currentUser.displayName.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-gray-800">{currentUser.displayName}</p>
            <p className="text-sm text-gray-500">{currentUser.username} · <span className="capitalize">{currentUser.role}</span></p>
            {currentUser.role === "teacher" && <p className="text-xs text-blue-500">Class {currentUser.assignedClass} – Section {currentUser.assignedSection}</p>}
          </div>
        </div>

        <form onSubmit={updateName} className="mb-1">
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Display Name</label>
          <div className="flex gap-3">
            <input value={dispName} onChange={e=>setDispName(e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30" />
            <button type="submit" className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background:"linear-gradient(135deg,#4e73df,#1cc88a)" }}>Update</button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm">Change Password</h3>
        <form onSubmit={changePass} className="space-y-3">
          {[
            { label:"Current Password", val:oldPass, set:setOldPass },
            { label:"New Password", val:newPass, set:setNewPass },
            { label:"Confirm New Password", val:confirm, set:setConfirm },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">{f.label}</label>
              <input type="password" value={f.val} onChange={e=>f.set(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30" />
            </div>
          ))}
          <AnimatePresence>
            {msg && (
              <motion.div initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                className="px-4 py-3 rounded-xl text-sm" style={{ background: msg.ok?"#dcfce7":"#fee2e2", color: msg.ok?"#16a34a":"#dc2626" }}>
                {msg.ok?"✓ ":"⚠️ "}{msg.text}
              </motion.div>
            )}
          </AnimatePresence>
          <button type="submit" className="w-full py-3 rounded-xl text-white font-semibold text-sm" style={{ background:"linear-gradient(135deg,#4e73df,#1cc88a)" }}>
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════
export function AttendanceApp() {
  const [users, setUsers] = useLS<UserAccount[]>(LS_USERS, DEFAULT_USERS);
  const [students, setStudents] = useLS<Student[]>(LS_STUDENTS, SEED_STUDENTS);
  const [records, setRecords] = useLS<MonthRecord[]>(LS_RECORDS, SEED_RECORDS);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [page, setPage] = useState("dashboard");

  // Class/section state — teachers are locked to their assignment
  const [selClass, setSelClass] = useState(1);
  const [selSec, setSelSec] = useState("A");

  function handleLogin(u: UserAccount) {
    setCurrentUser(u);
    if (u.role === "teacher" && u.assignedClass) {
      setSelClass(u.assignedClass);
      setSelSec(u.assignedSection ?? "A");
    }
  }

  if (!currentUser) return <LoginPage users={users} onLogin={handleLogin} />;

  const effectiveClass = currentUser.role === "teacher" ? (currentUser.assignedClass ?? selClass) : selClass;
  const effectiveSec = currentUser.role === "teacher" ? (currentUser.assignedSection ?? selSec) : selSec;

  function addStudent(s: Student) {
    setStudents(p => [...p, s]);
    setRecords(p => p.map(r => r.class===s.class&&r.section===s.section ? {...r,present:{...r.present,[s.id]:0}} : r));
  }
  function removeStudent(id: string) { setStudents(p => p.filter(s => s.id !== id)); }
  function saveAttendance(cls: number, sec: string, month: string, wd: number, present: Record<string,number>) {
    const key = `${cls}-${sec}-${month}`;
    setRecords(p => p.map(r => r.key===key ? {...r,workingDays:wd,present:{...r.present,...present}} : r));
  }

  const sharedProps = { students, records, selClass: effectiveClass, selSec: effectiveSec };

  const pages: Record<string, React.ReactNode> = {
    dashboard: <Dashboard {...sharedProps} />,
    monthly: <MonthlyReport {...sharedProps} />,
    analytics: <Analytics {...sharedProps} />,
    students: <StudentsTab {...sharedProps} user={currentUser} onAdd={addStudent} onRemove={removeStudent} />,
    mark: <MarkAttendance {...sharedProps} onSave={saveAttendance} />,
    users: <ManageUsers users={users} currentUser={currentUser} onUpdate={setUsers} />,
    settings: <Settings currentUser={currentUser} users={users} onUpdate={u => { setUsers(u); setCurrentUser(u.find(x=>x.id===currentUser.id)??currentUser); }} />,
  };

  return (
    <div className="flex h-screen bg-[#eef2f7] overflow-hidden" style={{ fontFamily:"'Poppins', sans-serif" }}>
      <div className="w-52 shrink-0 shadow-xl">
        <Sidebar active={page} onNav={setPage} onLogout={() => setCurrentUser(null)} user={currentUser} />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-5xl">
          {currentUser.role === "admin" && page !== "users" && page !== "settings" && (
            <ClassFilter selClass={effectiveClass} selSec={effectiveSec} setClass={setSelClass} setSec={setSelSec} user={currentUser} />
          )}
          {pages[page]}
        </div>
      </div>
    </div>
  );
}
