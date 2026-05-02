import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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

  // Compute absent students who have a parent mobile number
  const absentWithMobile = useMemo(() =>
    clsStu.filter(s => getStatus(s.id) === "A" && s.parentMobile),
    [clsStu, rec, selDay]
  );

  const notifyAllAbsent = () => {
    if (absentWithMobile.length === 0) {
      Alert.alert("No Numbers Available", "None of the absent students have a parent mobile number. Please add numbers in the Students tab.");
      return;
    }

    const numbers = absentWithMobile.map(s => `+91${s.parentMobile}`).join(",");
    const names = absentWithMobile.map(s => `${s.name} (${s.rollNo})`).join(", ");
    const msg =
      `Dear Parents, the following student(s) were ABSENT on Day ${selDay}, ${MONTH_LABELS[selMonthIdx]} at PAVAN GROUP OF SCHOOLS, Vinukonda: ${names}. Please ensure regular attendance. - School Administration`;

    const url = Platform.OS === "ios"
      ? `sms:${absentWithMobile[0].parentMobile}&body=${encodeURIComponent(msg)}`
      : `sms:${numbers}?body=${encodeURIComponent(msg)}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported || Platform.OS === "web") {
        if (Platform.OS === "web") {
          Alert.alert(
            `Notify ${absentWithMobile.length} Parent(s)`,
            `Absent students:\n${names}\n\nParent numbers:\n${absentWithMobile.map(s => `+91${s.parentMobile}`).join("\n")}`,
            [{ text: "Close" }]
          );
        } else {
          Linking.openURL(url);
        }
      } else {
        Alert.alert("Cannot Open SMS", "Please manually notify the following parents:\n\n" +
          absentWithMobile.map(s => `${s.name}: +91${s.parentMobile}`).join("\n"));
      }
    });
  };

  const notifySingle = (studentId: string) => {
    const s = clsStu.find(x => x.id === studentId);
    if (!s?.parentMobile) return;
    const msg =
      `Dear Parent, your ward ${s.name} (Roll: ${s.rollNo}) of Class ${selClass}${selSec} was ABSENT on Day ${selDay}, ${MONTH_LABELS[selMonthIdx]} at PAVAN GROUP OF SCHOOLS, Vinukonda. Please ensure regular attendance. - School Administration`;

    const url = Platform.OS === "ios"
      ? `sms:${s.parentMobile}&body=${encodeURIComponent(msg)}`
      : `sms:+91${s.parentMobile}?body=${encodeURIComponent(msg)}`;

    if (Platform.OS === "web") {
      Alert.alert(`Send SMS to parent of ${s.name}`, `To: +91${s.parentMobile}\n\n${msg}`, [{ text: "Close" }]);
    } else {
      Linking.openURL(url).catch(() =>
        Alert.alert("Cannot open SMS", `Please message: +91${s.parentMobile}`)
      );
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[school.primaryColor, "#1a3aaa"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Daily Attendance</Text>
            <Text style={styles.headerSub}>Class {selClass} – Sec {selSec} · {MONTH_LABELS[selMonthIdx]} Day {selDay}</Text>
          </View>
          {absentWithMobile.length > 0 && (
            <TouchableOpacity onPress={notifyAllAbsent} style={styles.headerNotifyBtn}>
              <Feather name="bell" size={14} color="#fff" />
              <Text style={styles.headerNotifyText}>Notify {absentWithMobile.length}</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: bottomPad + 80 }} showsVerticalScrollIndicator={false}>
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
            {clsStu.map(s => {
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
                    {s.parentMobile && (
                      <Text style={[styles.stuMobile, { color: colors.mutedForeground }]}>
                        <Feather name="phone" size={10} color={colors.mutedForeground} /> +91 {s.parentMobile}
                      </Text>
                    )}
                  </View>
                  <View style={styles.stuRight}>
                    <View style={[styles.statusBadge, { backgroundColor: isPresent ? "#dcfce7" : "#fee2e2" }]}>
                      <Text style={[styles.statusText, { color: isPresent ? "#16a34a" : "#dc2626" }]}>{status}</Text>
                    </View>
                    {!isPresent && s.parentMobile && (
                      <TouchableOpacity
                        onPress={e => { e.stopPropagation?.(); notifySingle(s.id); }}
                        style={[styles.smsBtn, { backgroundColor: "#fff7ed" }]}
                      >
                        <Feather name="message-square" size={14} color="#ea580c" />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Notify Absent Parents floating banner */}
      {absentWithMobile.length > 0 && (
        <TouchableOpacity onPress={notifyAllAbsent}
          style={[styles.notifyBanner, { bottom: bottomPad + 12, backgroundColor: "#ea580c" }]}>
          <LinearGradient colors={["#f97316", "#ea580c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.notifyBannerGrad}>
            <Feather name="message-square" size={18} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.notifyBannerTitle}>Notify Absent Parents</Text>
              <Text style={styles.notifyBannerSub}>{absentWithMobile.length} parent{absentWithMobile.length > 1 ? "s" : ""} with registered number</Text>
            </View>
            <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 },
  headerNotifyBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ea580c", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  headerNotifyText: { color: "#fff", fontSize: 12, fontWeight: "700" },
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
  stuMobile: { fontSize: 10, marginTop: 2 },
  stuRight: { alignItems: "center", gap: 6 },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 14, fontWeight: "800" },
  smsBtn: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  // Notify banner
  notifyBanner: { position: "absolute", left: 16, right: 16, borderRadius: 16, overflow: "hidden", shadowColor: "#ea580c", shadowOpacity: 0.5, shadowRadius: 12, elevation: 10 },
  notifyBannerGrad: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  notifyBannerTitle: { color: "#fff", fontSize: 14, fontWeight: "800" },
  notifyBannerSub: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 1 },
});
