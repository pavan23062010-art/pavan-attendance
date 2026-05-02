import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Student {
  id: string;
  name: string;
  rollNo: string;
  section: string;
}

interface MonthRecord {
  month: string;        // "Jul-2026"
  workingDays: number;
  present: Record<string, number>; // studentId → days present
}

// ─── Constants ───────────────────────────────────────────────────────────────
const ACADEMIC_MONTHS = [
  "Jul-2026","Aug-2026","Sep-2026","Oct-2026","Nov-2026","Dec-2026",
  "Jan-2027","Feb-2027","Mar-2027","Apr-2027","May-2027","Jun-2027",
];
const MONTH_LABELS = ["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"];

const PIE_COLORS = ["#4e73df","#1cc88a","#f6c23e","#e74a3b","#36b9cc","#858796"];

const SECTIONS = ["A","B","C"];

// ─── Seed data ────────────────────────────────────────────────────────────────
const INIT_STUDENTS: Student[] = [
  { id:"s1", name:"Alice Johnson",    rollNo:"001", section:"A" },
  { id:"s2", name:"Bob Smith",        rollNo:"002", section:"A" },
  { id:"s3", name:"Clara Davis",      rollNo:"003", section:"B" },
  { id:"s4", name:"Daniel Lee",       rollNo:"004", section:"B" },
  { id:"s5", name:"Eva Martinez",     rollNo:"005", section:"A" },
  { id:"s6", name:"Frank Wilson",     rollNo:"006", section:"C" },
  { id:"s7", name:"Grace Patel",      rollNo:"007", section:"C" },
  { id:"s8", name:"Henry Chen",       rollNo:"008", section:"B" },
];

function seedPresent(wd: number, pct: number) {
  return Math.round(wd * (pct / 100));
}

const INIT_RECORDS: MonthRecord[] = ACADEMIC_MONTHS.map((month, mi) => {
  const wd = [25,26,24,25,22,20,26,24,27,25,26,24][mi];
  return {
    month,
    workingDays: wd,
    present: {
      s1: seedPresent(wd, 95), s2: seedPresent(wd, 70),
      s3: seedPresent(wd, 88), s4: seedPresent(wd, 45),
      s5: seedPresent(wd, 98), s6: seedPresent(wd, 78),
      s7: seedPresent(wd, 62), s8: seedPresent(wd, 85),
    },
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pct(present: number, total: number) {
  if (total === 0) return 0;
  return Math.round((present / total) * 100);
}

function gradeColor(p: number) {
  if (p >= 85) return "#1cc88a";
  if (p >= 75) return "#f6c23e";
  return "#e74a3b";
}

function avatar(name: string, bg?: string) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ background: bg ?? "linear-gradient(135deg,#4e73df,#1cc88a)" }}
    >
      {name.charAt(0)}
    </div>
  );
}

// ─── Floating particle ────────────────────────────────────────────────────────
function Particle({ index }: { index: number }) {
  const size = 6 + (index % 4) * 4;
  const startX = (index * 137.5) % 100;
  const duration = 8 + (index % 5) * 2;
  const delay = (index * 0.7) % 6;
  const colors = ["#4e73df33","#1cc88a33","#f6c23e33","#e74a3b22","#36b9cc33"];
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ width: size, height: size, left: `${startX}%`, background: colors[index % colors.length] }}
      initial={{ y: "110vh", opacity: 0 }}
      animate={{ y: "-10vh", opacity: [0, 0.8, 0.8, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
    />
  );
}

// ─── Animated typing text ─────────────────────────────────────────────────────
function TypewriterText({ text, className }: { text: string; className?: string }) {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);
  useEffect(() => {
    idx.current = 0;
    setDisplayed("");
    const iv = setInterval(() => {
      if (idx.current < text.length) {
        setDisplayed(text.slice(0, idx.current + 1));
        idx.current++;
      } else {
        clearInterval(iv);
      }
    }, 60);
    return () => clearInterval(iv);
  }, [text]);
  return <span className={className}>{displayed}<span className="animate-pulse">|</span></span>;
}

// ─── Login page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    setTimeout(() => {
      if (user === "admin" && pass === "1234") {
        onLogin();
      } else {
        setLoading(false);
        setErr("Invalid credentials. Use admin / 1234");
      }
    }, 1200);
  }

  const particles = Array.from({ length: 18 }, (_, i) => i);

  return (
    <div
      className="min-h-screen flex overflow-hidden relative"
      style={{
        fontFamily: "'Poppins', sans-serif",
        background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      }}
    >
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map(i => <Particle key={i} index={i} />)}
      </div>

      {/* Glowing orbs */}
      <motion.div
        className="absolute w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, #4e73df44 0%, transparent 70%)", top: "-10%", left: "-5%" }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, #1cc88a33 0%, transparent 70%)", bottom: "-5%", right: "5%" }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Left panel */}
      <motion.div
        className="hidden md:flex flex-1 flex-col items-center justify-center px-16 relative z-10"
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      >
        {/* School icon */}
        <motion.div
          className="mb-8"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1, delay: 0.2, type: "spring", stiffness: 120 }}
        >
          <div
            className="w-28 h-28 rounded-3xl flex items-center justify-center text-5xl shadow-2xl"
            style={{
              background: "linear-gradient(135deg,#4e73df,#1cc88a)",
              boxShadow: "0 0 60px #4e73df66, 0 0 120px #1cc88a33",
            }}
          >
            🎓
          </div>
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <p className="text-white/50 text-sm font-medium tracking-[0.3em] uppercase mb-3">Welcome to</p>
          <h1
            className="text-4xl font-black text-white mb-3 leading-tight"
            style={{ textShadow: "0 0 40px #4e73df99" }}
          >
            SCHOOL
          </h1>
          <h1
            className="text-4xl font-black mb-4 leading-tight"
            style={{
              background: "linear-gradient(90deg, #4e73df, #1cc88a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ATTENDANCE
          </h1>
          <p className="text-white/40 text-sm">
            <TypewriterText text="Academic Year 2026 – 2027" />
          </p>
        </motion.div>

        {/* Stat pills */}
        <motion.div
          className="flex gap-4 mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          {[
            { icon: "👨‍🎓", label: "Students", value: "8+" },
            { icon: "📅", label: "Months", value: "12" },
            { icon: "📊", label: "Reports", value: "Live" },
          ].map(s => (
            <motion.div
              key={s.label}
              whileHover={{ scale: 1.05, y: -4 }}
              className="flex flex-col items-center px-5 py-3 rounded-2xl text-center"
              style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <span className="text-xl mb-1">{s.icon}</span>
              <span className="text-white font-bold text-lg">{s.value}</span>
              <span className="text-white/40 text-xs">{s.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Made by */}
        <motion.p
          className="absolute bottom-6 text-white/25 text-xs tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
        >
          Made by <span className="text-white/50 font-semibold">Pavan</span>
        </motion.p>
      </motion.div>

      {/* Divider */}
      <div className="hidden md:block w-px self-stretch my-16" style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.15), transparent)" }} />

      {/* Right panel — login form */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-10 relative z-10"
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      >
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {/* Card */}
          <div
            className="rounded-3xl p-8"
            style={{
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
            }}
          >
            <div className="mb-7">
              <h2 className="text-white text-2xl font-bold">Sign In</h2>
              <p className="text-white/40 text-sm mt-1">Access your attendance portal</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Username */}
              <motion.div animate={{ y: focusedField === "user" ? -2 : 0 }} transition={{ duration: 0.2 }}>
                <label className="block text-xs font-semibold text-white/50 mb-2 tracking-widest uppercase">Username</label>
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: `1.5px solid ${focusedField === "user" ? "#4e73df" : "rgba(255,255,255,0.1)"}`,
                    boxShadow: focusedField === "user" ? "0 0 0 3px #4e73df22" : "none",
                  }}
                >
                  <span className="text-white/40 text-sm">👤</span>
                  <input
                    value={user}
                    onChange={e => setUser(e.target.value)}
                    onFocus={() => setFocusedField("user")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter username"
                    className="flex-1 bg-transparent text-white text-sm placeholder-white/25 focus:outline-none"
                  />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div animate={{ y: focusedField === "pass" ? -2 : 0 }} transition={{ duration: 0.2 }}>
                <label className="block text-xs font-semibold text-white/50 mb-2 tracking-widest uppercase">Password</label>
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: `1.5px solid ${focusedField === "pass" ? "#1cc88a" : "rgba(255,255,255,0.1)"}`,
                    boxShadow: focusedField === "pass" ? "0 0 0 3px #1cc88a22" : "none",
                  }}
                >
                  <span className="text-white/40 text-sm">🔒</span>
                  <input
                    type={showPass ? "text" : "password"}
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                    onFocus={() => setFocusedField("pass")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter password"
                    className="flex-1 bg-transparent text-white text-sm placeholder-white/25 focus:outline-none"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="text-white/30 hover:text-white/60 transition-colors text-sm">
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </motion.div>

              {/* Error */}
              <AnimatePresence>
                {err && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs"
                    style={{ background: "#e74a3b22", border: "1px solid #e74a3b44", color: "#ff6b6b" }}
                  >
                    <span>⚠️</span> {err}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px #4e73df66" }}
                whileTap={{ scale: 0.97 }}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm relative overflow-hidden"
                style={{ background: "linear-gradient(135deg,#4e73df,#1cc88a)" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In <span>→</span>
                  </span>
                )}
                {/* Shimmer */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)" }}
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                />
              </motion.button>

              <p className="text-center text-white/20 text-xs mt-2">
                Demo: <span className="text-white/40 font-mono">admin</span> / <span className="text-white/40 font-mono">1234</span>
              </p>
            </form>
          </div>

          {/* Made by — mobile */}
          <motion.p
            className="text-center text-white/20 text-xs mt-6 tracking-widest uppercase md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            Made by <span className="text-white/40 font-semibold">Pavan</span>
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const NAV = [
  { id:"dashboard", icon:"🏠", label:"Dashboard" },
  { id:"monthly",   icon:"📅", label:"Monthly Report" },
  { id:"charts",    icon:"📊", label:"Analytics" },
  { id:"students",  icon:"👨‍🎓", label:"Students" },
  { id:"mark",      icon:"✅", label:"Mark Attendance" },
];

function Sidebar({ active, onNav, onLogout }: { active: string; onNav: (id: string) => void; onLogout: () => void }) {
  return (
    <div className="flex flex-col h-full py-6 px-3"
      style={{ background: "linear-gradient(180deg,#4e73df 0%,#224abe 100%)" }}>
      <div className="text-center mb-8">
        <div className="text-2xl font-bold text-white">📊</div>
        <p className="text-white/80 text-xs mt-1">SmartAttend</p>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV.map(n => (
          <button key={n.id} onClick={() => onNav(n.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: active === n.id ? "rgba(255,255,255,0.2)" : "transparent",
              color: active === n.id ? "white" : "rgba(255,255,255,0.6)",
            }}>
            <span>{n.icon}</span>
            <span className="text-left">{n.label}</span>
          </button>
        ))}
      </nav>
      <button onClick={onLogout}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all">
        <span>🚪</span><span>Logout</span>
      </button>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }: { label: string; value: string | number; sub?: string; color: string; icon: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4" style={{ borderColor: color }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <span className="text-3xl opacity-30">{icon}</span>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ students, records }: { students: Student[]; records: MonthRecord[] }) {
  const totalWD = records.reduce((a, r) => a + r.workingDays, 0);

  const overallPct = useMemo(() => {
    let totalP = 0, totalPoss = 0;
    students.forEach(s => {
      records.forEach(r => {
        totalP += r.present[s.id] ?? 0;
        totalPoss += r.workingDays;
      });
    });
    return pct(totalP, totalPoss);
  }, [students, records]);

  const lowCount = useMemo(() => {
    return students.filter(s => {
      const tp = records.reduce((a, r) => a + (r.present[s.id] ?? 0), 0);
      return pct(tp, totalWD) < 75;
    }).length;
  }, [students, records, totalWD]);

  const monthBarData = records.map((r, i) => {
    const avgP = students.reduce((a, s) => a + (r.present[s.id] ?? 0), 0) / (students.length || 1);
    return {
      name: MONTH_LABELS[i],
      "Working Days": r.workingDays,
      "Avg Present": Math.round(avgP),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-sm text-gray-500">Academic Year 2026–2027 Overview</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Students" value={students.length} icon="👨‍🎓" color="#4e73df" sub="Enrolled" />
        <StatCard label="Working Days" value={totalWD} icon="📅" color="#1cc88a" sub="Full year" />
        <StatCard label="Avg Attendance" value={`${overallPct}%`} icon="✅" color="#f6c23e" sub="All students" />
        <StatCard label="Low Attendance" value={lowCount} icon="⚠️" color="#e74a3b" sub="Below 75%" />
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4">Monthly Overview — Working Days vs Avg Present</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthBarData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Working Days" fill="#c5cef5" radius={[4,4,0,0]} />
            <Bar dataKey="Avg Present" fill="#4e73df" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row: top performers */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-3">Student Attendance Snapshot</h3>
        <div className="space-y-3">
          {students.map(s => {
            const tp = records.reduce((a, r) => a + (r.present[s.id] ?? 0), 0);
            const p = pct(tp, totalWD);
            return (
              <div key={s.id} className="flex items-center gap-3">
                {avatar(s.name)}
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{s.name}</span>
                    <span className="text-sm font-bold" style={{ color: gradeColor(p) }}>{p}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${p}%`, background: gradeColor(p) }} />
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

// ─── Monthly Report ───────────────────────────────────────────────────────────
function MonthlyReport({ students, records }: { students: Student[]; records: MonthRecord[] }) {
  const [selMonth, setSelMonth] = useState(ACADEMIC_MONTHS[0]);
  const record = records.find(r => r.month === selMonth)!;

  const tableData = students.map(s => {
    const p = record.present[s.id] ?? 0;
    const percentage = pct(p, record.workingDays);
    return { ...s, present: p, absent: record.workingDays - p, percentage };
  }).sort((a, b) => b.percentage - a.percentage);

  const avgPct = Math.round(tableData.reduce((a, d) => a + d.percentage, 0) / (tableData.length || 1));

  const barData = tableData.map(d => ({
    name: d.name.split(" ")[0],
    Present: d.present,
    Absent: d.absent,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Monthly Report</h2>
          <p className="text-sm text-gray-500">Detailed attendance by month</p>
        </div>
        <select
          value={selMonth} onChange={e => setSelMonth(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30"
        >
          {ACADEMIC_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Working Days", value: record.workingDays, color: "#4e73df" },
          { label: "Class Avg", value: `${avgPct}%`, color: "#1cc88a" },
          { label: "Below 75%", value: tableData.filter(d => d.percentage < 75).length, color: "#e74a3b" },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-xl font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4">Present vs Absent — {selMonth}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Present" fill="#1cc88a" radius={[4,4,0,0]} stackId="a" />
            <Bar dataKey="Absent" fill="#e74a3b" radius={[4,4,0,0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700">Student-wise Report — {selMonth}</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Rank","Roll No","Name","Section","Present","Absent","Working Days","%","Status"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((d, i) => (
              <tr key={d.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 text-gray-400 font-medium">#{i + 1}</td>
                <td className="px-4 py-3 text-gray-600">{d.rollNo}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {avatar(d.name)}
                    <span className="font-medium text-gray-800">{d.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">Sec {d.section}</span>
                </td>
                <td className="px-4 py-3 font-semibold text-green-600">{d.present}</td>
                <td className="px-4 py-3 font-semibold text-red-500">{d.absent}</td>
                <td className="px-4 py-3 text-gray-500">{record.workingDays}</td>
                <td className="px-4 py-3">
                  <span className="font-bold" style={{ color: gradeColor(d.percentage) }}>{d.percentage}%</span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      background: d.percentage >= 75 ? "#dcfce7" : "#fee2e2",
                      color: d.percentage >= 75 ? "#16a34a" : "#dc2626",
                    }}>
                    {d.percentage >= 75 ? "Regular" : "Irregular"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function Analytics({ students, records }: { students: Student[]; records: MonthRecord[] }) {
  const totalWD = records.reduce((a, r) => a + r.workingDays, 0);

  // Pie: present vs absent (overall)
  const totalPresent = students.reduce((a, s) =>
    a + records.reduce((b, r) => b + (r.present[s.id] ?? 0), 0), 0);
  const totalPossible = students.length * totalWD;
  const totalAbsent = totalPossible - totalPresent;
  const pieData = [
    { name: "Present", value: totalPresent },
    { name: "Absent", value: totalAbsent },
  ];

  // Pie: attendance category
  const catData = [
    { name: "≥90% (Excellent)", value: students.filter(s => { const tp = records.reduce((a, r) => a + (r.present[s.id] ?? 0), 0); return pct(tp, totalWD) >= 90; }).length },
    { name: "75–89% (Good)", value: students.filter(s => { const tp = records.reduce((a, r) => a + (r.present[s.id] ?? 0), 0); const p = pct(tp, totalWD); return p >= 75 && p < 90; }).length },
    { name: "<75% (At Risk)", value: students.filter(s => { const tp = records.reduce((a, r) => a + (r.present[s.id] ?? 0), 0); return pct(tp, totalWD) < 75; }).length },
  ];

  // Line: monthly avg attendance %
  const lineData = records.map((r, i) => {
    const avg = students.reduce((a, s) => a + pct(r.present[s.id] ?? 0, r.workingDays), 0) / (students.length || 1);
    return { name: MONTH_LABELS[i], "Avg %": Math.round(avg) };
  });

  // Area chart: cumulative present days
  let cumPresent = 0, cumPossible = 0;
  const areaData = records.map((r, i) => {
    cumPresent += students.reduce((a, s) => a + (r.present[s.id] ?? 0), 0);
    cumPossible += r.workingDays * students.length;
    return {
      name: MONTH_LABELS[i],
      "Cumulative %": Math.round((cumPresent / cumPossible) * 100),
    };
  });

  // Radar: per-student overall %
  const radarData = students.map(s => {
    const tp = records.reduce((a, r) => a + (r.present[s.id] ?? 0), 0);
    return { name: s.name.split(" ")[0], value: pct(tp, totalWD) };
  });

  // Section bar
  const sectionData = SECTIONS.map(sec => {
    const ss = students.filter(s => s.section === sec);
    if (!ss.length) return { section: `Sec ${sec}`, avg: 0 };
    const avg = ss.reduce((a, s) => {
      const tp = records.reduce((b, r) => b + (r.present[s.id] ?? 0), 0);
      return a + pct(tp, totalWD);
    }, 0) / ss.length;
    return { section: `Sec ${sec}`, avg: Math.round(avg) };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Analytics</h2>
        <p className="text-sm text-gray-500">Full-year charts — Academic Year 2026–2027</p>
      </div>

      {/* Row 1: two pie charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Overall Present vs Absent</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {pieData.map((_, i) => <Cell key={i} fill={["#4e73df","#e74a3b"][i]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Students by Attendance Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={catData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                {catData.map((_, i) => <Cell key={i} fill={["#1cc88a","#f6c23e","#e74a3b"][i]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: line + area */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Monthly Avg Attendance %</h3>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={lineData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Line type="monotone" dataKey="Avg %" stroke="#4e73df" strokeWidth={2.5} dot={{ fill: "#4e73df", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Cumulative Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={areaData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1cc88a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1cc88a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Area type="monotone" dataKey="Cumulative %" stroke="#1cc88a" strokeWidth={2.5} fill="url(#cumGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: radar + section bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Student Attendance Radar</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={80}>
              <PolarGrid stroke="#eee" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar name="Attendance %" dataKey="value" stroke="#4e73df" fill="#4e73df" fillOpacity={0.25} />
              <Tooltip formatter={(v: number) => `${v}%`} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Section-wise Avg Attendance</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sectionData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="section" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="avg" name="Avg %" radius={[6, 6, 0, 0]}>
                {sectionData.map((d, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Students tab ─────────────────────────────────────────────────────────────
function StudentsTab({ students, records, onAdd, onRemove }: {
  students: Student[];
  records: MonthRecord[];
  onAdd: (s: Student) => void;
  onRemove: (id: string) => void;
}) {
  const totalWD = records.reduce((a, r) => a + r.workingDays, 0);
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [sec, setSec] = useState("A");
  const [search, setSearch] = useState("");

  function add() {
    if (!name.trim() || !roll.trim()) return;
    onAdd({
      id: Math.random().toString(36).slice(2),
      name: name.trim(),
      rollNo: roll.trim(),
      section: sec,
    });
    setName(""); setRoll("");
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNo.includes(search)
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Students</h2>
        <p className="text-sm text-gray-500">{students.length} enrolled</p>
      </div>

      {/* Add form */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-3">Add New Student</h3>
        <div className="flex gap-3">
          <input value={roll} onChange={e => setRoll(e.target.value)} placeholder="Roll No"
            className="w-24 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30" />
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30" />
          <select value={sec} onChange={e => setSec(e.target.value)}
            className="w-20 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
            {SECTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={add}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
            style={{ background: "linear-gradient(135deg,#4e73df,#1cc88a)" }}>
            Add
          </button>
        </div>
      </div>

      {/* Search + table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search by name or roll..."
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30" />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Roll","Name","Section","Total Present","Total Absent","Attendance %","Status",""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const tp = records.reduce((a, r) => a + (r.present[s.id] ?? 0), 0);
              const p = pct(tp, totalWD);
              return (
                <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-500">{s.rollNo}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">{avatar(s.name)}<span className="font-medium text-gray-800">{s.name}</span></div>
                  </td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">Sec {s.section}</span></td>
                  <td className="px-4 py-3 text-green-600 font-semibold">{tp}</td>
                  <td className="px-4 py-3 text-red-500 font-semibold">{totalWD - tp}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden w-16">
                        <div className="h-2 rounded-full" style={{ width: `${p}%`, background: gradeColor(p) }} />
                      </div>
                      <span className="font-bold text-sm" style={{ color: gradeColor(p) }}>{p}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: p >= 75 ? "#dcfce7" : "#fee2e2", color: p >= 75 ? "#16a34a" : "#dc2626" }}>
                      {p >= 75 ? "Regular" : "Irregular"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onRemove(s.id)} className="text-gray-300 hover:text-red-400 text-lg font-bold transition-colors">×</button>
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

// ─── Mark Attendance ──────────────────────────────────────────────────────────
function MarkAttendance({ students, onSave }: {
  students: Student[];
  onSave: (month: string, wd: number, present: Record<string, number>) => void;
}) {
  const [month, setMonth] = useState(ACADEMIC_MONTHS[0]);
  const [wd, setWd] = useState(25);
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);

  function toggle(id: string, days: number) {
    setMarks(prev => ({ ...prev, [id]: days }));
  }

  function save() {
    onSave(month, wd, marks);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const markedCount = Object.keys(marks).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Mark Attendance</h2>
        <p className="text-sm text-gray-500">Enter days present per student for a month</p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex gap-4 mb-5">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Month</label>
            <select value={month} onChange={e => setMonth(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              {ACADEMIC_MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Working Days</label>
            <input type="number" value={wd} onChange={e => setWd(Number(e.target.value))} min={1} max={31}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
          </div>
        </div>

        <div className="space-y-3">
          {students.map(s => {
            const val = marks[s.id] ?? "";
            return (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                {avatar(s.name)}
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{s.name}</div>
                  <div className="text-xs text-gray-400">Roll {s.rollNo} · Sec {s.section}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={wd} value={val}
                    onChange={e => toggle(s.id, Math.min(wd, Math.max(0, Number(e.target.value))))}
                    placeholder="Days"
                    className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#4e73df]/30"
                  />
                  <span className="text-xs text-gray-400">/ {wd}</span>
                  {val !== "" && (
                    <span className="text-xs font-bold" style={{ color: gradeColor(pct(Number(val), wd)) }}>
                      {pct(Number(val), wd)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={save} disabled={markedCount === 0}
          className="w-full mt-5 py-3 rounded-xl text-white font-semibold text-sm transition-all"
          style={{ background: markedCount === 0 ? "#ccc" : saved ? "#1cc88a" : "linear-gradient(135deg,#4e73df,#1cc88a)" }}>
          {saved ? "✓ Saved!" : `Save ${month} Attendance (${markedCount} students)`}
        </button>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export function AttendanceApp() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [students, setStudents] = useState<Student[]>(INIT_STUDENTS);
  const [records, setRecords] = useState<MonthRecord[]>(INIT_RECORDS);

  if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />;

  function addStudent(s: Student) {
    setStudents(prev => [...prev, s]);
    setRecords(prev => prev.map(r => ({ ...r, present: { ...r.present, [s.id]: 0 } })));
  }

  function removeStudent(id: string) {
    setStudents(prev => prev.filter(s => s.id !== id));
  }

  function saveAttendance(month: string, wd: number, present: Record<string, number>) {
    setRecords(prev => prev.map(r =>
      r.month === month ? { ...r, workingDays: wd, present: { ...r.present, ...present } } : r
    ));
  }

  const pageContent: Record<string, React.ReactNode> = {
    dashboard: <Dashboard students={students} records={records} />,
    monthly: <MonthlyReport students={students} records={records} />,
    charts: <Analytics students={students} records={records} />,
    students: <StudentsTab students={students} records={records} onAdd={addStudent} onRemove={removeStudent} />,
    mark: <MarkAttendance students={students} onSave={saveAttendance} />,
  };

  return (
    <div className="flex h-screen bg-[#eef2f7] overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Sidebar */}
      <div className="w-52 shrink-0 shadow-xl">
        <Sidebar active={page} onNav={setPage} onLogout={() => setLoggedIn(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-5xl">
          {pageContent[page]}
        </div>
      </div>
    </div>
  );
}
