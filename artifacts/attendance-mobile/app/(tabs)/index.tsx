import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ACADEMIC_MONTHS, MONTH_LABELS, SECTIONS, gc, pct, presentCount, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

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
    <View style={styles.pickerBox}>
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

export default function DashboardScreen() {
  const { students, records, classes, currentUser, school } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : 60;

  const isTeacher = currentUser?.role === "teacher";
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
      <LinearGradient colors={[school.primaryColor, "#1a3aaa"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.headerGreeting}>Hi, {currentUser?.displayName ?? "there"} 👋</Text>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSub}>{school.nameLine1} {school.nameLine2} · AY {school.academicYear}</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: bottomPad + 16, paddingHorizontal: 16, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}>
        <ClassPicker selClass={selClass} selSec={selSec} setClass={setSelClass} setSec={setSelSec} classes={classes} locked={isTeacher} />

        <View style={styles.statsGrid}>
          <StatCard label="Students" value={clsStu.length} sub="Enrolled" color={colors.primary} />
          <StatCard label="Avg Attendance" value={`${avgPct}%`} sub="Full year" color={colors.secondary} />
          <StatCard label="Working Days" value={totalWD} sub="Full year" color="#f6c23e" />
          <StatCard label="Below 75%" value={lowCount} sub="At risk" color={colors.destructive} />
        </View>

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
  headerGreeting: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "500", marginBottom: 2 },
  headerTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 },
  scroll: { flex: 1 },
  lockedRow: { marginBottom: 12 },
  lockedBadge: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  lockedText: { fontSize: 13, fontWeight: "700" },
  pickerBox: { backgroundColor: "#fff", borderRadius: 16, padding: 12, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
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
  cardTitle: { fontSize: 13, fontWeight: "700", marginBottom: 12 },
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
});
