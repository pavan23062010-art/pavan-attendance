import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface UserAccount {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: "admin" | "teacher";
  assignedClass?: number;
  assignedSection?: string;
}

export interface Student {
  id: string;
  name: string;
  rollNo: string;
  class: number;
  section: string;
  parentMobile?: string;
}

export interface MonthRecord {
  key: string;
  month: string;
  class: number;
  section: string;
  workingDays: number;
  daily: Record<string, Record<string, "P" | "A">>;
}

export interface SchoolInfo {
  nameLine1: string;
  nameLine2: string;
  location: string;
  academicYear: string;
  madeBy: string;
  primaryColor: string;
  accentColor: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
export const ACADEMIC_MONTHS = [
  "2026-July","2026-August","2026-September","2026-October","2026-November","2026-December",
  "2027-January","2027-February","2027-March","2027-April","2027-May","2027-June",
];
export const MONTH_LABELS = ["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"];
export const WORKING_DAYS_PER_MONTH = [31,31,30,31,30,31,31,28,31,30,31,30];
export const SECTIONS = ["A","B","C"];
export const DEFAULT_CLASSES = [1,2,3,4,5,6,7,8,9,10];

// ─── Utilities ────────────────────────────────────────────────────────────────
export const presentCount = (rec: MonthRecord, studentId: string): number =>
  Object.values(rec.daily[studentId] ?? {}).filter(v => v === "P").length;

export const pct = (p: number, total: number): number =>
  total === 0 ? 0 : Math.round((p / total) * 100);

export const gc = (p: number): string => {
  if (p >= 85) return "#1cc88a";
  if (p >= 75) return "#f6c23e";
  return "#e74a3b";
};

const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

// ─── Defaults / Seeds ─────────────────────────────────────────────────────────
const DEFAULT_SCHOOL: SchoolInfo = {
  nameLine1: "PAVAN GROUP OF",
  nameLine2: "SCHOOLS",
  location: "Vinukonda",
  academicYear: "2026 – 2027",
  madeBy: "Pavan",
  primaryColor: "#4e73df",
  accentColor: "#1cc88a",
};

const DEFAULT_USERS: UserAccount[] = [
  { id: "u1", username: "admin", password: "admin123", displayName: "Admin", role: "admin" },
  { id: "u2", username: "teacher1", password: "teach1", displayName: "Teacher 1", role: "teacher", assignedClass: 1, assignedSection: "A" },
  { id: "u3", username: "teacher2", password: "teach2", displayName: "Teacher 2", role: "teacher", assignedClass: 1, assignedSection: "B" },
  { id: "u4", username: "teacher3", password: "teach3", displayName: "Teacher 3", role: "teacher", assignedClass: 2, assignedSection: "A" },
  { id: "u5", username: "teacher4", password: "teach4", displayName: "Teacher 4", role: "teacher", assignedClass: 2, assignedSection: "B" },
];

const SEED_STUDENTS: Student[] = [
  { id: "s1",  name: "Ravi Kumar",   rollNo: "1A001", class: 1, section: "A", parentMobile: "9848012345" },
  { id: "s2",  name: "Sita Devi",    rollNo: "1A002", class: 1, section: "A", parentMobile: "9848023456" },
  { id: "s3",  name: "Arun Babu",    rollNo: "1A003", class: 1, section: "A" },
  { id: "s4",  name: "Lakshmi P",    rollNo: "1A004", class: 1, section: "A", parentMobile: "9848034567" },
  { id: "s5",  name: "Venkat Rao",   rollNo: "1A005", class: 1, section: "A", parentMobile: "9848045678" },
  { id: "s6",  name: "Priya Reddy",  rollNo: "1B001", class: 1, section: "B", parentMobile: "9848056789" },
  { id: "s7",  name: "Kiran Kumar",  rollNo: "1B002", class: 1, section: "B" },
  { id: "s8",  name: "Divya Sri",    rollNo: "1B003", class: 1, section: "B", parentMobile: "9848067890" },
  { id: "s9",  name: "Suresh M",     rollNo: "1B004", class: 1, section: "B", parentMobile: "9848078901" },
  { id: "s10", name: "Amith Raju",   rollNo: "2A001", class: 2, section: "A", parentMobile: "9848089012" },
  { id: "s11", name: "Bindu Priya",  rollNo: "2A002", class: 2, section: "A" },
  { id: "s12", name: "Charan Deep",  rollNo: "2A003", class: 2, section: "A", parentMobile: "9848090123" },
];

const generateSeedRecords = (): MonthRecord[] => {
  const recs: MonthRecord[] = [];
  DEFAULT_CLASSES.forEach(cls => {
    SECTIONS.forEach(sec => {
      ACADEMIC_MONTHS.forEach((month, mi) => {
        recs.push({ key: `${cls}-${sec}-${month}`, month, class: cls, section: sec, workingDays: WORKING_DAYS_PER_MONTH[mi], daily: {} });
      });
    });
  });
  return recs;
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const LS_USERS = "mob_sa_users";
const LS_STUDENTS = "mob_sa_students";
const LS_RECORDS = "mob_sa_records";
const LS_CLASSES = "mob_sa_classes";
const LS_SCHOOL = "mob_sa_school";
const LS_CURRENT_USER = "mob_sa_current_user";

// ─── Context Interface ────────────────────────────────────────────────────────
interface AppContextType {
  loaded: boolean;
  users: UserAccount[];
  students: Student[];
  records: MonthRecord[];
  classes: number[];
  school: SchoolInfo;
  currentUser: UserAccount | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addStudent: (data: Omit<Student, "id">) => void;
  removeStudent: (id: string) => void;
  updateAttendance: (key: string, studentId: string, day: number, status: "P" | "A") => void;
  markAllForDay: (key: string, studentIds: string[], day: number, status: "P" | "A") => void;
  setWorkingDays: (key: string, days: number) => void;
  updateUsers: (u: UserAccount[]) => void;
  updateSchool: (s: SchoolInfo) => void;
  addClass: (cls: number) => void;
  removeClass: (cls: number) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [users, setUsers] = useState<UserAccount[]>(DEFAULT_USERS);
  const [students, setStudents] = useState<Student[]>(SEED_STUDENTS);
  const [records, setRecords] = useState<MonthRecord[]>(generateSeedRecords);
  const [classes, setClasses] = useState<number[]>(DEFAULT_CLASSES);
  const [school, setSchool] = useState<SchoolInfo>(DEFAULT_SCHOOL);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  // Load from storage
  useEffect(() => {
    (async () => {
      try {
        const [u, s, r, c, sc, cu] = await Promise.all([
          AsyncStorage.getItem(LS_USERS),
          AsyncStorage.getItem(LS_STUDENTS),
          AsyncStorage.getItem(LS_RECORDS),
          AsyncStorage.getItem(LS_CLASSES),
          AsyncStorage.getItem(LS_SCHOOL),
          AsyncStorage.getItem(LS_CURRENT_USER),
        ]);
        if (u) setUsers(JSON.parse(u));
        if (s) setStudents(JSON.parse(s));
        if (r) setRecords(JSON.parse(r));
        if (c) setClasses(JSON.parse(c));
        if (sc) setSchool(JSON.parse(sc));
        if (cu) setCurrentUser(JSON.parse(cu));
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  // Save on change (only after load)
  useEffect(() => { if (loaded) AsyncStorage.setItem(LS_USERS, JSON.stringify(users)); }, [users, loaded]);
  useEffect(() => { if (loaded) AsyncStorage.setItem(LS_STUDENTS, JSON.stringify(students)); }, [students, loaded]);
  useEffect(() => { if (loaded) AsyncStorage.setItem(LS_RECORDS, JSON.stringify(records)); }, [records, loaded]);
  useEffect(() => { if (loaded) AsyncStorage.setItem(LS_CLASSES, JSON.stringify(classes)); }, [classes, loaded]);
  useEffect(() => { if (loaded) AsyncStorage.setItem(LS_SCHOOL, JSON.stringify(school)); }, [school, loaded]);
  useEffect(() => { if (loaded) AsyncStorage.setItem(LS_CURRENT_USER, JSON.stringify(currentUser)); }, [currentUser, loaded]);

  const login = useCallback((username: string, password: string): boolean => {
    const found = users.find(u => u.username === username && u.password === password);
    if (found) { setCurrentUser(found); return true; }
    return false;
  }, [users]);

  const logout = useCallback(() => setCurrentUser(null), []);

  const addStudent = useCallback((data: Omit<Student, "id">) => {
    const s: Student = { ...data, id: genId() };
    setStudents(p => [...p, s]);
    setRecords(p => p.map(r =>
      r.class === s.class && r.section === s.section
        ? { ...r, daily: { ...r.daily, [s.id]: {} } }
        : r
    ));
  }, []);

  const removeStudent = useCallback((id: string) => {
    setStudents(p => p.filter(s => s.id !== id));
  }, []);

  const updateAttendance = useCallback((key: string, studentId: string, day: number, status: "P" | "A") => {
    setRecords(p => p.map(r => {
      if (r.key !== key) return r;
      return {
        ...r,
        daily: {
          ...r.daily,
          [studentId]: { ...(r.daily[studentId] ?? {}), [String(day)]: status },
        },
      };
    }));
  }, []);

  const markAllForDay = useCallback((key: string, studentIds: string[], day: number, status: "P" | "A") => {
    setRecords(p => p.map(r => {
      if (r.key !== key) return r;
      const daily = { ...r.daily };
      studentIds.forEach(sid => {
        daily[sid] = { ...(daily[sid] ?? {}), [String(day)]: status };
      });
      return { ...r, daily };
    }));
  }, []);

  const setWorkingDays = useCallback((key: string, days: number) => {
    setRecords(p => p.map(r => r.key === key ? { ...r, workingDays: days } : r));
  }, []);

  const updateUsers = useCallback((u: UserAccount[]) => {
    setUsers(u);
    setCurrentUser(prev => prev ? (u.find(x => x.id === prev.id) ?? prev) : null);
  }, []);

  const updateSchool = useCallback((s: SchoolInfo) => setSchool(s), []);

  const addClass = useCallback((cls: number) => {
    setClasses(p => [...p, cls].sort((a, b) => a - b));
    const newRecs: MonthRecord[] = [];
    ACADEMIC_MONTHS.forEach((month, mi) => {
      SECTIONS.forEach(sec => {
        newRecs.push({ key: `${cls}-${sec}-${month}`, month, class: cls, section: sec, workingDays: WORKING_DAYS_PER_MONTH[mi], daily: {} });
      });
    });
    setRecords(p => [...p, ...newRecs]);
  }, []);

  const removeClass = useCallback((cls: number) => {
    setClasses(p => p.filter(c => c !== cls));
  }, []);

  return (
    <AppContext.Provider value={{
      loaded, users, students, records, classes, school, currentUser,
      login, logout, addStudent, removeStudent, updateAttendance, markAllForDay,
      setWorkingDays, updateUsers, updateSchool, addClass, removeClass,
    }}>
      {children}
    </AppContext.Provider>
  );
}
