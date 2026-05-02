import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ACADEMIC_MONTHS, MONTH_LABELS, SECTIONS, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function AttendanceScreen() {
  const { students, records, currentUser, classes, updateAttendance, markAllForDay, setWorkingDays, school } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : 60;

  const isTeacher = currentUser?.role === "teacher";
  const [selClass, setSelClass] = useState(isTeacher ? (currentUser?.assignedClass ?? classes[0] ?? 1) : (classes[0] ?? 1));
  const [selSec, setSelSec] = useState(isTeacher ? (currentUser?.assignedSection ?? "A") : "A");
  const [selMonthIdx, setSelMonthIdx] = useState(0);
  const [selDay, setSelDay] = useState(1);

  const selMonth = ACADEMIC_MONTHS[selMonthIdx];
  const rec = useMemo(() => records.find(r => r.class === selClass && r.section === selSec && r.month === selMonth), [records, selClass, selSec, selMonth]);
  const wd = rec?.workingDays ?? 0;
  const clsStu = useMemo(() => students.filter(s => s.class === selClass && s.section === selSec), [students, selClass, selSec]);

  const getStatus = (sid: string): "P" | "A" => rec?.daily[sid]?.[String(selDay)] ?? "A";

  const toggle = (sid: string) => {
    if (!rec) return;
    const cur = getStatus(sid);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateAttendance(rec.key, sid, selDay, cur === "P" ? "A" : "P");
  };

  const markAll = (status: "P" | "A") => {
    if (!rec) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markAllForDay(rec.key, clsStu.map(s => s.id), selDay, status);
  };

  const presentToday = clsStu.filter(s => getStatus(s.id) === "P").length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[school.primaryColor, "#1a3aaa"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.headerTitle}>Daily Attendance</Text>
        <Text style={styles.headerSub}>Class {selClass} – Sec {selSec} · {MONTH_LABELS[selMonthIdx]} Day {selDay}</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: bottomPad + 16 }} showsVerticalScrollIndicator={false}>
        {/* Class / Section pickers (admin only) */}
        {!isTeacher && (
          <View style={[styles.pickerBox, { backgroundColor: colors.card }]}>
            <View style={styles.pickerRow}>
              <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>CLASS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {classes.map(c => (
                  <TouchableOpacity key={c} onPress={() => { setSelClass(c); setSelDay(1); }}
                    style={[styles.pill, { backgroundColor: selClass === c ? colors.primary : colors.muted }]}>
                    <Text style={[styles.pillText, { color: selClass === c ? "#fff" : colors.mutedForeground }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.pickerRow}>
              <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>SEC</Text>
              {SECTIONS.map(s => (
                <TouchableOpacity key={s} onPress={() => { setSelSec(s); setSelDay(1); }}
                  style={[styles.pill, { backgroundColor: selSec === s ? colors.secondary : colors.muted }]}>
                  <Text style={[styles.pillText, { color: selSec === s ? "#fff" : colors.mutedForeground }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Month picker */}
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {MONTH_LABELS.map((ml, mi) => (
              <TouchableOpacity key={mi} onPress={() => { setSelMonthIdx(mi); setSelDay(1); }}
                style={[styles.monthPill, { backgroundColor: selMonthIdx === mi ? colors.primary : colors.muted }]}>
                <Text style={[styles.monthPillText, { color: selMonthIdx === mi ? "#fff" : colors.mutedForeground }]}>{ml}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Day stepper */}
        <View style={[styles.dayStepRow, { marginHorizontal: 16, backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => setSelDay(d => Math.max(1, d - 1))} style={styles.dayArrow}>
            <Feather name="chevron-left" size={22} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={[styles.dayNum, { color: colors.foreground }]}>Day {selDay}</Text>
            <Text style={[styles.dayMax, { color: colors.mutedForeground }]}>of {wd} working days</Text>
          </View>
          <TouchableOpacity onPress={() => setSelDay(d => Math.min(wd, d + 1))} style={styles.dayArrow}>
            <Feather name="chevron-right" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Working days adjuster */}
        <View style={[styles.wdRow, { marginHorizontal: 16, backgroundColor: colors.card }]}>
          <Text style={[styles.wdLabel, { color: colors.mutedForeground }]}>Working days:</Text>
          <TouchableOpacity onPress={() => rec && setWorkingDays(rec.key, Math.max(1, wd - 1))} style={styles.wdBtn}>
            <Feather name="minus" size={16} color={colors.destructive} />
          </TouchableOpacity>
          <Text style={[styles.wdNum, { color: colors.foreground }]}>{wd}</Text>
          <TouchableOpacity onPress={() => rec && setWorkingDays(rec.key, Math.min(31, wd + 1))} style={styles.wdBtn}>
            <Feather name="plus" size={16} color={colors.secondary} />
          </TouchableOpacity>
        </View>

        {/* Mark all row */}
        <View style={styles.markAllRow}>
          <TouchableOpacity onPress={() => markAll("P")} style={[styles.markAllBtn, { backgroundColor: "#dcfce7" }]}>
            <Feather name="check" size={14} color="#16a34a" />
            <Text style={[styles.markAllText, { color: "#16a34a" }]}>All Present</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => markAll("A")} style={[styles.markAllBtn, { backgroundColor: "#fee2e2" }]}>
            <Feather name="x" size={14} color="#dc2626" />
            <Text style={[styles.markAllText, { color: "#dc2626" }]}>All Absent</Text>
          </TouchableOpacity>
          <View style={[styles.presentCount, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.presentCountText, { color: colors.primary }]}>{presentToday}/{clsStu.length} P</Text>
          </View>
        </View>

        {/* Student list */}
        {clsStu.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="users" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No students in this class</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            {clsStu.map((s, i) => {
              const status = getStatus(s.id);
              const isPresent = status === "P";
              return (
                <TouchableOpacity key={s.id} onPress={() => toggle(s.id)}
                  style={[styles.stuRow, { backgroundColor: colors.card, borderLeftColor: isPresent ? colors.secondary : colors.destructive }]}>
                  <View style={[styles.stuAvatar, { backgroundColor: (isPresent ? colors.secondary : colors.destructive) + "20" }]}>
                    <Text style={[styles.stuAvatarText, { color: isPresent ? colors.secondary : colors.destructive }]}>{s.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stuName, { color: colors.foreground }]}>{s.name}</Text>
                    <Text style={[styles.stuRoll, { color: colors.mutedForeground }]}>{s.rollNo}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: isPresent ? "#dcfce7" : "#fee2e2" }]}>
                    <Text style={[styles.statusText, { color: isPresent ? "#16a34a" : "#dc2626" }]}>{status}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 },
  scroll: { flex: 1 },
  pickerBox: { marginHorizontal: 16, marginTop: 16, marginBottom: 8, borderRadius: 16, padding: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  pickerRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  pickerLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, width: 36 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 6 },
  pillText: { fontSize: 12, fontWeight: "700" },
  monthPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginRight: 8 },
  monthPillText: { fontSize: 12, fontWeight: "700" },
  dayStepRow: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 12, marginBottom: 8, marginTop: 8, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  dayArrow: { padding: 8 },
  dayNum: { fontSize: 20, fontWeight: "800" },
  dayMax: { fontSize: 11, marginTop: 2 },
  wdRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  wdLabel: { flex: 1, fontSize: 13, fontWeight: "600" },
  wdBtn: { padding: 8 },
  wdNum: { fontSize: 18, fontWeight: "800", marginHorizontal: 8 },
  markAllRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  markAllBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  markAllText: { fontSize: 12, fontWeight: "700" },
  presentCount: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginLeft: "auto" },
  presentCountText: { fontSize: 12, fontWeight: "800" },
  emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14 },
  stuRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 12, marginBottom: 8, borderLeftWidth: 4, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  stuAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", marginRight: 12 },
  stuAvatarText: { fontSize: 15, fontWeight: "700" },
  stuName: { fontSize: 14, fontWeight: "600" },
  stuRoll: { fontSize: 11, marginTop: 1 },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 14, fontWeight: "800" },
});
