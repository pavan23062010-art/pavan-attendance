import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Path, Polygon, RadialGradient, Rect, Stop } from "react-native-svg";

import { ACADEMIC_MONTHS, MONTH_LABELS, SECTIONS, gc, pct, presentCount, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { buildClassReportHTML, buildSchoolSummaryHTML } from "@/utils/pdfReport";

// ─── Utilities ────────────────────────────────────────────────────────────────
const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const getInitialMonthIdx = (): number => {
  const now = new Date();
  const MNAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const target = `${now.getFullYear()}-${MNAMES[now.getMonth()]}`;
  const idx = ACADEMIC_MONTHS.indexOf(target);
  if (idx === -1) return now.getFullYear() < 2026 ? 0 : ACADEMIC_MONTHS.length - 1;
  return idx;
};

const TODAY_DAY = new Date().getDate();

// ─── Small School Logo ────────────────────────────────────────────────────────
function SchoolLogoSmall({ size = 52 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <RadialGradient id="sbg" cx="40%" cy="35%" r="70%">
          <Stop offset="0%" stopColor="#3a5fd9" />
          <Stop offset="100%" stopColor="#1a3aaa" />
        </RadialGradient>
      </Defs>
      <Circle cx="60" cy="60" r="58" fill="url(#sbg)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <Rect x="18" y="82" width="84" height="6" rx="3" fill="#f6c23e" />
      <Rect x="25" y="88" width="6" height="18" rx="2" fill="#e0a800" />
      <Rect x="89" y="88" width="6" height="18" rx="2" fill="#e0a800" />
      <Rect x="34" y="50" width="52" height="34" rx="4" fill="#0d1b3e" stroke="#4e73df" strokeWidth="1.5" />
      <Rect x="40" y="56" width="12" height="10" rx="1" fill="#4e73df" opacity="0.7" />
      <Rect x="54" y="56" width="12" height="10" rx="1" fill="#4e73df" opacity="0.7" />
      <Rect x="68" y="56" width="12" height="10" rx="1" fill="#4e73df" opacity="0.7" />
      <Rect x="47" y="68" width="26" height="16" rx="2" fill="#1cc88a" opacity="0.9" />
      <Path d="M60 10 L75 30 L45 30 Z" fill="#f6c23e" />
      <Circle cx="60" cy="10" r="5" fill="#f6c23e" />
      <Polygon points="30,50 60,30 90,50" fill="#1a3680" stroke="#4e73df" strokeWidth="1" />
    </Svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ClassPicker({ selClass, selSec, setClass, setSec, classes, locked }: {
  selClass: number; selSec: string; setClass: (c: number) => void; setSec: (s: string) => void;
  classes: number[]; locked: boolean;
}) {
  const colors = useColors();
  if (locked) {
    return (
      <View style={styles.lockedRow}>
        <View style={[styles.lockedBadge, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.lockedText, { color: colors.primary }]}>Class {selClass} – Section {selSec}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.pickerBox, { backgroundColor: colors.card }]}>
      <View style={styles.pickerRow}>
        <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>CLASS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {classes.map(c => (
            <TouchableOpacity key={c} onPress={() => setClass(c)}
              style={[styles.pill, { backgroundColor: selClass === c ? colors.primary : colors.muted }]}>
              <Text style={[styles.pillText, { color: selClass === c ? "#fff" : colors.mutedForeground }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.pickerRow}>
        <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>SEC</Text>
        {SECTIONS.map(s => (
          <TouchableOpacity key={s} onPress={() => setSec(s)}
            style={[styles.pill, { backgroundColor: selSec === s ? colors.secondary : colors.muted }]}>
            <Text style={[styles.pillText, { color: selSec === s ? "#fff" : colors.mutedForeground }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

// ─── Admin-only: Today's Daily Attendance ─────────────────────────────────────
function TodaySection({ students, records, classes, school }: { students: any[]; records: any[]; classes: number[]; school: any }) {
  const colors = useColors();
  const [monthIdx, setMonthIdx] = useState(getInitialMonthIdx());
  const [day, setDay] = useState(Math.min(TODAY_DAY, 31));

  const todayMonth = ACADEMIC_MONTHS[monthIdx];
  const recForDay = useMemo(() => {
    let present = 0, absent = 0, unmarked = 0;
    students.forEach(s => {
      const rec = records.find((r: any) => r.class === s.class && r.section === s.section && r.month === todayMonth);
      if (rec) {
        const status = rec.daily[s.id]?.[String(day)];
        if (status === "P") present++;
        else if (status === "A") absent++;
        else unmarked++;
      } else {
        unmarked++;
      }
    });
    const total = students.length;
    const marked = present + absent;
    return { present, absent, unmarked, total, marked, pctPresent: pct(present, total) };
  }, [students, records, todayMonth, day]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>Today's Attendance</Text>

      {/* Month + Day picker */}
      <View style={{ marginBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
          {MONTH_LABELS.map((ml, mi) => (
            <TouchableOpacity key={mi} onPress={() => setMonthIdx(mi)}
              style={[styles.monthPill, { backgroundColor: monthIdx === mi ? school.primaryColor : colors.muted }]}>
              <Text style={[styles.monthPillText, { color: monthIdx === mi ? "#fff" : colors.mutedForeground }]}>{ml}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.dayStepRow}>
          <TouchableOpacity onPress={() => setDay(d => Math.max(1, d - 1))} style={styles.dayArrowBtn}>
            <Text style={[styles.dayArrowText, { color: colors.primary }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.dayLabel, { color: colors.foreground }]}>Day {day}</Text>
          <TouchableOpacity onPress={() => setDay(d => Math.min(31, d + 1))} style={styles.dayArrowBtn}>
            <Text style={[styles.dayArrowText, { color: colors.primary }]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.todayStatsRow}>
        <View style={[styles.todayStat, { backgroundColor: "#dcfce7" }]}>
          <Text style={[styles.todayStatNum, { color: "#16a34a" }]}>{recForDay.present}</Text>
          <Text style={[styles.todayStatLabel, { color: "#16a34a" }]}>Present</Text>
        </View>
        <View style={[styles.todayStat, { backgroundColor: "#fee2e2" }]}>
          <Text style={[styles.todayStatNum, { color: "#dc2626" }]}>{recForDay.absent}</Text>
          <Text style={[styles.todayStatLabel, { color: "#dc2626" }]}>Absent</Text>
        </View>
        <View style={[styles.todayStat, { backgroundColor: "#eff6ff" }]}>
          <Text style={[styles.todayStatNum, { color: "#3b82f6" }]}>{recForDay.unmarked}</Text>
          <Text style={[styles.todayStatLabel, { color: "#3b82f6" }]}>Unmarked</Text>
        </View>
        <View style={[styles.todayStat, { backgroundColor: colors.primary + "15" }]}>
          <Text style={[styles.todayStatNum, { color: colors.primary }]}>{recForDay.pctPresent}%</Text>
          <Text style={[styles.todayStatLabel, { color: colors.primary }]}>Rate</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${recForDay.pctPresent}%`, backgroundColor: recForDay.pctPresent >= 75 ? "#1cc88a" : "#e74a3b" }]} />
      </View>
      <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
        {recForDay.marked}/{recForDay.total} students marked · {MONTH_LABELS[monthIdx]} Day {day}
      </Text>
    </View>
  );
}

// ─── Admin-only: Class-wise Strength ─────────────────────────────────────────
function ClassStrengthSection({ students, records, classes }: { students: any[]; records: any[]; classes: number[] }) {
  const colors = useColors();
  const [monthIdx, setMonthIdx] = useState(getInitialMonthIdx());
  const [day, setDay] = useState(Math.min(TODAY_DAY, 31));
  const todayMonth = ACADEMIC_MONTHS[monthIdx];

  const classData = useMemo(() => classes.map(cls => {
    const clsStu = students.filter((s: any) => s.class === cls);
    let present = 0, absent = 0, unmarked = 0;
    clsStu.forEach((s: any) => {
      const rec = records.find((r: any) => r.class === cls && r.section === s.section && r.month === todayMonth);
      const status = rec?.daily[s.id]?.[String(day)];
      if (status === "P") present++;
      else if (status === "A") absent++;
      else unmarked++;
    });
    return { cls, total: clsStu.length, present, absent, unmarked };
  }), [classes, students, records, todayMonth, day]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>Class-wise Strength</Text>

      <View style={{ marginBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
          {MONTH_LABELS.map((ml, mi) => (
            <TouchableOpacity key={mi} onPress={() => setMonthIdx(mi)}
              style={[styles.monthPill, { backgroundColor: monthIdx === mi ? colors.primary : colors.muted }]}>
              <Text style={[styles.monthPillText, { color: monthIdx === mi ? "#fff" : colors.mutedForeground }]}>{ml}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.dayStepRow}>
          <TouchableOpacity onPress={() => setDay(d => Math.max(1, d - 1))} style={styles.dayArrowBtn}>
            <Text style={[styles.dayArrowText, { color: colors.primary }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.dayLabel, { color: colors.foreground }]}>Day {day}</Text>
          <TouchableOpacity onPress={() => setDay(d => Math.min(31, d + 1))} style={styles.dayArrowBtn}>
            <Text style={[styles.dayArrowText, { color: colors.primary }]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Table header */}
      <View style={[styles.tableHeaderRow, { backgroundColor: colors.primary }]}>
        <Text style={[styles.tcls, styles.th]}>Class</Text>
        <Text style={[styles.tnum, styles.th]}>Total</Text>
        <Text style={[styles.tnum, styles.th]}>P</Text>
        <Text style={[styles.tnum, styles.th]}>A</Text>
        <Text style={[styles.tnum, styles.th]}>%</Text>
      </View>

      {classData.map((row, i) => {
        const p = pct(row.present, row.total);
        return (
          <View key={row.cls} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? colors.card : colors.background }]}>
            <View style={styles.tcls}>
              <View style={[styles.clsBadge, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.clsBadgeText, { color: colors.primary }]}>{row.cls}</Text>
              </View>
            </View>
            <Text style={[styles.tnum, styles.cellText, { color: colors.foreground }]}>{row.total}</Text>
            <Text style={[styles.tnum, styles.cellText, { color: "#16a34a", fontWeight: "800" }]}>{row.present}</Text>
            <Text style={[styles.tnum, styles.cellText, { color: "#dc2626", fontWeight: "800" }]}>{row.absent}</Text>
            <Text style={[styles.tnum, styles.cellText, { color: gc(p), fontWeight: "800" }]}>{row.total > 0 ? `${p}%` : "—"}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Admin-only: School-wide Annual Summary ───────────────────────────────────
function SchoolYearSummary({ students, records, school }: { students: any[]; records: any[]; school: any }) {
  const colors = useColors();
  const stats = useMemo(() => {
    let totalPresent = 0, totalPossible = 0;
    students.forEach(s => {
      records.filter((r: any) => r.class === s.class && r.section === s.section).forEach((r: any) => {
        totalPossible += r.workingDays;
        totalPresent += presentCount(r, s.id);
      });
    });
    const totalEnrolled = students.length;
    const totalWD = records.reduce((a: number, r: any) => a + r.workingDays, 0) / Math.max(1, records.length);
    const overall = pct(totalPresent, totalPossible);
    const regular = students.filter(s => {
      const tp = records.filter((r: any) => r.class === s.class && r.section === s.section)
        .reduce((a: number, r: any) => a + presentCount(r, s.id), 0);
      const wd = records.filter((r: any) => r.class === s.class && r.section === s.section)
        .reduce((a: number, r: any) => a + r.workingDays, 0);
      return pct(tp, wd) >= 75;
    }).length;
    return { totalEnrolled, totalPresent, totalPossible, overall, regular, irregular: totalEnrolled - regular };
  }, [students, records]);

  return (
    <LinearGradient colors={[school.primaryColor, "#1a3aaa"]} style={[styles.card, styles.summaryCard]}>
      <Text style={styles.summaryTitle}>School Final Attendance</Text>
      <Text style={styles.summarySubtitle}>AY {school.academicYear} · All Classes</Text>

      <View style={styles.summaryBigRow}>
        <View style={styles.summaryBigStat}>
          <Text style={styles.summaryBigNum}>{stats.totalEnrolled}</Text>
          <Text style={styles.summaryBigLabel}>Enrolled</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryBigStat}>
          <Text style={[styles.summaryBigNum, { fontSize: 28 }]}>{stats.overall}%</Text>
          <Text style={styles.summaryBigLabel}>Overall Avg</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryBigStat}>
          <Text style={styles.summaryBigNum}>{stats.regular}</Text>
          <Text style={styles.summaryBigLabel}>Regular</Text>
        </View>
      </View>

      <View style={styles.summaryProgressTrack}>
        <View style={[styles.summaryProgressFill, { width: `${stats.overall}%` }]} />
      </View>

      <View style={styles.summaryRow2}>
        <View style={styles.summarySmallStat}>
          <Text style={styles.summarySmallNum}>{stats.totalPresent}</Text>
          <Text style={styles.summarySmallLabel}>Total Present Days</Text>
        </View>
        <View style={styles.summarySmallStat}>
          <Text style={[styles.summarySmallNum, { color: "#fca5a5" }]}>{stats.irregular}</Text>
          <Text style={styles.summarySmallLabel}>Irregular Students</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

// ─── Admin-only: Export PDF Panel ────────────────────────────────────────────
function ExportPDFPanel({ students, records, classes, school }: { students: any[]; records: any[]; classes: number[]; school: any }) {
  const colors = useColors();
  const [exportType, setExportType] = useState<"class" | "school">("class");
  const [selClass, setSelClass] = useState<number>(classes[0] ?? 1);
  const [selSec, setSelSec] = useState("A");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const html = exportType === "class"
        ? buildClassReportHTML(school, selClass, selSec, students, records)
        : buildSchoolSummaryHTML(school, students, records, classes);

      if (Platform.OS === "web") {
        const w = window.open("", "_blank");
        if (w) { w.document.write(html); w.document.close(); w.print(); }
        else Alert.alert("Blocked", "Please allow pop-ups and try again.");
        setLoading(false);
        return;
      }

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
      } else {
        await Print.printAsync({ uri });
      }
    } catch (e: any) {
      Alert.alert("Export Failed", e?.message ?? "Could not generate PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 }}>
        <Feather name="file-text" size={16} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 0 }]}>Export PDF Report</Text>
      </View>

      {/* Report type toggle */}
      <View style={[styles.exportToggle, { backgroundColor: colors.muted }]}>
        <TouchableOpacity onPress={() => setExportType("class")}
          style={[styles.exportToggleOpt, exportType === "class" && { backgroundColor: colors.primary }]}>
          <Feather name="users" size={13} color={exportType === "class" ? "#fff" : colors.mutedForeground} />
          <Text style={[styles.exportToggleText, { color: exportType === "class" ? "#fff" : colors.mutedForeground }]}>Class Report</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExportType("school")}
          style={[styles.exportToggleOpt, exportType === "school" && { backgroundColor: colors.secondary }]}>
          <Feather name="bar-chart-2" size={13} color={exportType === "school" ? "#fff" : colors.mutedForeground} />
          <Text style={[styles.exportToggleText, { color: exportType === "school" ? "#fff" : colors.mutedForeground }]}>School Summary</Text>
        </TouchableOpacity>
      </View>

      {/* Class + Section picker (only for class report) */}
      {exportType === "class" && (
        <View style={{ marginTop: 10 }}>
          <Text style={[styles.exportPickerLabel, { color: colors.mutedForeground }]}>CLASS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {classes.map(c => (
              <TouchableOpacity key={c} onPress={() => setSelClass(c)}
                style={[styles.pill, { backgroundColor: selClass === c ? colors.primary : colors.muted, marginRight: 6 }]}>
                <Text style={[styles.pillText, { color: selClass === c ? "#fff" : colors.mutedForeground }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={[styles.exportPickerLabel, { color: colors.mutedForeground }]}>SECTION</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {SECTIONS.map(s => (
              <TouchableOpacity key={s} onPress={() => setSelSec(s)}
                style={[styles.pill, { backgroundColor: selSec === s ? colors.secondary : colors.muted }]}>
                <Text style={[styles.pillText, { color: selSec === s ? "#fff" : colors.mutedForeground }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {exportType === "school" && (
        <View style={[styles.exportInfoBox, { backgroundColor: colors.secondary + "15" }]}>
          <Feather name="info" size={12} color={colors.secondary} />
          <Text style={[styles.exportInfoText, { color: colors.secondary }]}>
            Generates a full-year summary for all {classes.length} classes with section-wise breakdown
          </Text>
        </View>
      )}

      <TouchableOpacity onPress={handleExport} disabled={loading} style={[styles.exportBtn, { opacity: loading ? 0.7 : 1 }]}>
        <LinearGradient
          colors={exportType === "class" ? [colors.primary, "#1a3aaa"] : [colors.secondary, "#0d9469"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.exportBtnGrad}>
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Feather name="download" size={16} color="#fff" />}
          <Text style={styles.exportBtnText}>
            {loading ? "Generating PDF…" : exportType === "class" ? `Export Class ${selClass}${selSec} PDF` : "Export School Summary PDF"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { students, records, classes, currentUser, school } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : 60;

  const isAdmin = currentUser?.role === "admin";
  const isTeacher = !isAdmin;
  const [selClass, setSelClass] = useState(isTeacher ? (currentUser?.assignedClass ?? classes[0] ?? 1) : (classes[0] ?? 1));
  const [selSec, setSelSec] = useState(isTeacher ? (currentUser?.assignedSection ?? "A") : "A");

  const clsStu = useMemo(() => students.filter(s => s.class === selClass && s.section === selSec), [students, selClass, selSec]);
  const clsRec = useMemo(() => records.filter(r => r.class === selClass && r.section === selSec), [records, selClass, selSec]);
  const totalWD = useMemo(() => clsRec.reduce((a, r) => a + r.workingDays, 0), [clsRec]);
  const avgPct = useMemo(() => {
    let tp = 0, tposs = 0;
    clsStu.forEach(s => clsRec.forEach(r => { tp += presentCount(r, s.id); tposs += r.workingDays; }));
    return pct(tp, tposs);
  }, [clsStu, clsRec]);
  const lowCount = useMemo(() =>
    clsStu.filter(s => { const tp = clsRec.reduce((a, r) => a + presentCount(r, s.id), 0); return pct(tp, totalWD) < 75; }).length,
    [clsStu, clsRec, totalWD]);
  const monthlyBars = useMemo(() => ACADEMIC_MONTHS.map((month, mi) => {
    const rec = clsRec.find(r => r.month === month);
    const wd = rec?.workingDays ?? 0;
    const avgP = clsStu.length === 0 ? 0 : Math.round(clsStu.reduce((a, s) => a + (rec ? presentCount(rec, s.id) : 0), 0) / clsStu.length);
    return { label: MONTH_LABELS[mi], wd, avgP, pct: pct(avgP, wd) };
  }), [clsRec, clsStu]);
  const atRisk = useMemo(() => clsStu.filter(s => {
    const tp = clsRec.reduce((a, r) => a + presentCount(r, s.id), 0);
    return pct(tp, totalWD) < 75;
  }).map(s => {
    const tp = clsRec.reduce((a, r) => a + presentCount(r, s.id), 0);
    return { ...s, pct: pct(tp, totalWD) };
  }), [clsStu, clsRec, totalWD]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={[school.primaryColor, "#1a3aaa"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerInner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerGreeting}>{getGreeting()}, {currentUser?.displayName ?? "there"} 👋</Text>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSub}>{school.nameLine1} {school.nameLine2} · AY {school.academicYear}</Text>
          </View>
          {isAdmin && <SchoolLogoSmall size={60} />}
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad + 16, paddingHorizontal: 16, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}>

        {/* ── ADMIN-ONLY SECTIONS ── */}
        {isAdmin && (
          <>
            <TodaySection students={students} records={records} classes={classes} school={school} />
            <ClassStrengthSection students={students} records={records} classes={classes} />
            <SchoolYearSummary students={students} records={records} school={school} />
            <ExportPDFPanel students={students} records={records} classes={classes} school={school} />
            <View style={[styles.dividerRow, { borderColor: colors.border }]}>
              <Text style={[styles.dividerLabel, { color: colors.mutedForeground, backgroundColor: colors.background }]}>Class View</Text>
            </View>
          </>
        )}

        {/* ── CLASS PICKER ── */}
        <ClassPicker selClass={selClass} selSec={selSec} setClass={setSelClass} setSec={setSelSec} classes={classes} locked={isTeacher} />

        {/* ── STATS CARDS ── */}
        <View style={styles.statsGrid}>
          <StatCard label="Students" value={clsStu.length} sub="Enrolled" color={colors.primary} />
          <StatCard label="Avg Attendance" value={`${avgPct}%`} sub="Full year" color={colors.secondary} />
          <StatCard label="Working Days" value={totalWD} sub="Full year" color="#f6c23e" />
          <StatCard label="Below 75%" value={lowCount} sub="At risk" color={colors.destructive} />
        </View>

        {/* ── MONTHLY TREND ── */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Monthly Trend</Text>
          {monthlyBars.map(b => (
            <View key={b.label} style={styles.barRow}>
              <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{b.label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${b.pct}%`, backgroundColor: b.pct >= 75 ? colors.secondary : colors.destructive }]} />
              </View>
              <Text style={[styles.barPct, { color: gc(b.pct) }]}>{b.pct}%</Text>
            </View>
          ))}
        </View>

        {/* ── AT RISK ── */}
        {atRisk.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>⚠ At Risk (Below 75%)</Text>
            {atRisk.map(s => (
              <View key={s.id} style={styles.riskRow}>
                <View style={[styles.avatar, { backgroundColor: colors.destructive + "20" }]}>
                  <Text style={[styles.avatarText, { color: colors.destructive }]}>{s.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.riskName, { color: colors.foreground }]}>{s.name}</Text>
                  <Text style={[styles.riskRoll, { color: colors.mutedForeground }]}>{s.rollNo}</Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: colors.destructive + "20" }]}>
                  <Text style={[styles.riskBadgeText, { color: colors.destructive }]}>{s.pct}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerInner: { flexDirection: "row", alignItems: "center" },
  headerGreeting: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "500", marginBottom: 2 },
  headerTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 },
  scroll: { flex: 1 },
  lockedRow: { marginBottom: 12 },
  lockedBadge: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  lockedText: { fontSize: 13, fontWeight: "700" },
  pickerBox: { borderRadius: 16, padding: 12, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  pickerRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  pickerLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, width: 36 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 6 },
  pillText: { fontSize: 12, fontWeight: "700" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, minWidth: "45%", backgroundColor: "#fff", borderRadius: 16, padding: 14, borderLeftWidth: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  statValue: { fontSize: 22, fontWeight: "800", color: "#1a1a2e" },
  statLabel: { fontSize: 11, fontWeight: "700", color: "#64748b", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  statSub: { fontSize: 10, color: "#94a3b8", marginTop: 1 },
  card: { borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: "800", marginBottom: 12 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  barLabel: { width: 32, fontSize: 11, fontWeight: "600" },
  barTrack: { flex: 1, height: 8, backgroundColor: "#e2e8f0", borderRadius: 4, marginHorizontal: 8, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  barPct: { width: 38, fontSize: 11, fontWeight: "700", textAlign: "right" },
  riskRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginRight: 10 },
  avatarText: { fontSize: 14, fontWeight: "700" },
  riskName: { fontSize: 13, fontWeight: "600" },
  riskRoll: { fontSize: 11 },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  riskBadgeText: { fontSize: 12, fontWeight: "800" },
  dividerRow: { borderTopWidth: 1, marginVertical: 12, alignItems: "center" },
  dividerLabel: { marginTop: -9, paddingHorizontal: 10, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  // Today section
  monthPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 8 },
  monthPillText: { fontSize: 11, fontWeight: "700" },
  dayStepRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  dayArrowBtn: { paddingHorizontal: 12, paddingVertical: 4 },
  dayArrowText: { fontSize: 24, fontWeight: "700", lineHeight: 28 },
  dayLabel: { fontSize: 15, fontWeight: "700", minWidth: 60, textAlign: "center" },
  todayStatsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  todayStat: { flex: 1, borderRadius: 12, padding: 10, alignItems: "center" },
  todayStatNum: { fontSize: 20, fontWeight: "900" },
  todayStatLabel: { fontSize: 10, fontWeight: "700", marginTop: 2 },
  progressTrack: { height: 8, backgroundColor: "#e2e8f0", borderRadius: 4, overflow: "hidden", marginBottom: 6 },
  progressFill: { height: "100%", borderRadius: 4 },
  progressLabel: { fontSize: 11, textAlign: "center" },
  // Class strength table
  tableHeaderRow: { flexDirection: "row", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 4, marginBottom: 4 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9, paddingHorizontal: 4 },
  tcls: { flex: 1.2, alignItems: "flex-start" },
  tnum: { flex: 1, textAlign: "center" },
  th: { color: "#fff", fontSize: 11, fontWeight: "700", textAlign: "center" },
  cellText: { fontSize: 13 },
  clsBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  clsBadgeText: { fontSize: 12, fontWeight: "800" },
  // Export PDF panel
  exportToggle: { flexDirection: "row", borderRadius: 12, padding: 4, marginBottom: 4 },
  exportToggleOpt: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10 },
  exportToggleText: { fontSize: 12, fontWeight: "700" },
  exportPickerLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 6, marginTop: 4 },
  exportInfoBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, padding: 10, marginTop: 10 },
  exportInfoText: { flex: 1, fontSize: 11, fontWeight: "600" },
  exportBtn: { borderRadius: 14, overflow: "hidden", marginTop: 12 },
  exportBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13 },
  exportBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  // Summary card
  summaryCard: { padding: 20 },
  summaryTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  summarySubtitle: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 16 },
  summaryBigRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  summaryBigStat: { flex: 1, alignItems: "center" },
  summaryBigNum: { color: "#fff", fontSize: 26, fontWeight: "900" },
  summaryBigLabel: { color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 2 },
  summaryDivider: { width: 1, height: 40, backgroundColor: "rgba(255,255,255,0.2)" },
  summaryProgressTrack: { height: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 4, overflow: "hidden", marginBottom: 14 },
  summaryProgressFill: { height: "100%", borderRadius: 4, backgroundColor: "#1cc88a" },
  summaryRow2: { flexDirection: "row", gap: 16 },
  summarySmallStat: { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 10, alignItems: "center" },
  summarySmallNum: { color: "#fff", fontSize: 18, fontWeight: "800" },
  summarySmallLabel: { color: "rgba(255,255,255,0.65)", fontSize: 10, marginTop: 2, textAlign: "center" },
});
