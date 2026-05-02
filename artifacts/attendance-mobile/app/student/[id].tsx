import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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

import {
  ACADEMIC_MONTHS,
  MONTH_LABELS,
  MonthRecord,
  pct,
  presentCount,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { buildStudentReportHTML } from "@/utils/pdfReport";

const DAYS_IN_MONTH = [31, 31, 30, 31, 30, 31, 31, 28, 31, 30, 31, 30];

function AttendanceCalendar({
  record,
  workingDays,
}: {
  record: MonthRecord | undefined;
  workingDays: number;
}) {
  const colors = useColors();
  if (!record) {
    return (
      <Text style={[calStyles.empty, { color: colors.mutedForeground }]}>
        No attendance record for this month.
      </Text>
    );
  }
  const days = Array.from({ length: workingDays }, (_, i) => i + 1);
  return (
    <View style={calStyles.grid}>
      {days.map((d) => {
        const studentData = record.daily;
        const allStatuses = Object.values(studentData);
        const dayStatus = Object.values(record.daily).reduce<string | null>(
          (found, _rec) => found,
          null
        );
        const rawStatus = (record.daily as any).__studentId
          ? undefined
          : undefined;
        const status = (() => {
          for (const [, dayMap] of Object.entries(record.daily)) {
            const s = (dayMap as any)[String(d)];
            if (s) return s;
          }
          return null;
        })();
        return (
          <View
            key={d}
            style={[
              calStyles.dayCell,
              {
                backgroundColor:
                  status === "P"
                    ? "#dcfce7"
                    : status === "A"
                    ? "#fee2e2"
                    : colors.muted,
              },
            ]}
          >
            <Text
              style={[
                calStyles.dayNum,
                {
                  color:
                    status === "P"
                      ? "#16a34a"
                      : status === "A"
                      ? "#dc2626"
                      : colors.mutedForeground,
                  fontWeight: status ? "800" : "400",
                },
              ]}
            >
              {d}
            </Text>
            {status && (
              <Text
                style={[
                  calStyles.dayStatus,
                  { color: status === "P" ? "#16a34a" : "#dc2626" },
                ]}
              >
                {status}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function StudentCalendar({
  record,
  studentId,
  workingDays,
}: {
  record: MonthRecord | undefined;
  studentId: string;
  workingDays: number;
}) {
  const colors = useColors();
  if (!record) {
    return (
      <Text style={[calStyles.empty, { color: colors.mutedForeground }]}>
        No record for this month.
      </Text>
    );
  }
  const days = Array.from({ length: workingDays }, (_, i) => i + 1);
  const dayMap = record.daily[studentId] ?? {};
  return (
    <View style={calStyles.grid}>
      {days.map((d) => {
        const status = dayMap[String(d)];
        return (
          <View
            key={d}
            style={[
              calStyles.dayCell,
              {
                backgroundColor:
                  status === "P"
                    ? "#dcfce7"
                    : status === "A"
                    ? "#fee2e2"
                    : colors.muted,
              },
            ]}
          >
            <Text
              style={[
                calStyles.dayNum,
                {
                  color:
                    status === "P"
                      ? "#16a34a"
                      : status === "A"
                      ? "#dc2626"
                      : colors.mutedForeground,
                  fontWeight: status ? "800" : "400",
                },
              ]}
            >
              {d}
            </Text>
            {status && (
              <Text
                style={[
                  calStyles.dayStatus,
                  { color: status === "P" ? "#16a34a" : "#dc2626" },
                ]}
              >
                {status}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { students, records, school, currentUser } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const student = useMemo(
    () => students.find((s) => s.id === id),
    [students, id]
  );
  const stuRecs = useMemo(
    () =>
      student
        ? records.filter(
            (r) => r.class === student.class && r.section === student.section
          )
        : [],
    [records, student]
  );

  const [selMonthIdx, setSelMonthIdx] = useState(0);
  const [exporting, setExporting] = useState(false);

  const monthStats = useMemo(
    () =>
      ACADEMIC_MONTHS.map((month, mi) => {
        const rec = stuRecs.find((r) => r.month === month);
        const wd = rec?.workingDays ?? DAYS_IN_MONTH[mi];
        const p = rec ? presentCount(rec, id!) : 0;
        const a = rec ? Object.values(rec.daily[id!] ?? {}).filter((v) => v === "A").length : 0;
        const u = wd - p - a;
        return { month, label: MONTH_LABELS[mi], wd, p, a, u, pct: pct(p, wd), rec };
      }),
    [stuRecs, id]
  );

  const totalWD = useMemo(
    () => stuRecs.reduce((acc, r) => acc + r.workingDays, 0),
    [stuRecs]
  );
  const totalPresent = useMemo(
    () => stuRecs.reduce((acc, r) => acc + presentCount(r, id!), 0),
    [stuRecs, id]
  );
  const totalAbsent = useMemo(
    () =>
      stuRecs.reduce(
        (acc, r) =>
          acc +
          Object.values(r.daily[id!] ?? {}).filter((v) => v === "A").length,
        0
      ),
    [stuRecs, id]
  );
  const overallPct = pct(totalPresent, totalWD);
  const statusColor =
    overallPct >= 85 ? "#16a34a" : overallPct >= 75 ? "#f59e0b" : "#dc2626";
  const statusLabel =
    overallPct >= 85 ? "Regular" : overallPct >= 75 ? "Borderline" : "At Risk";

  const selectedMonth = monthStats[selMonthIdx];

  const handleCall = () => {
    if (!student?.parentMobile) return;
    Linking.openURL(`tel:+91${student.parentMobile}`).catch(() =>
      Alert.alert("Cannot open dialer")
    );
  };

  const handleSMS = () => {
    if (!student?.parentMobile || !student) return;
    const msg = `Dear Parent, this is regarding ${student.name}'s attendance at ${school.nameLine1} ${school.nameLine2}. Current attendance: ${overallPct}%. Please contact us for more information.`;
    Linking.openURL(
      `sms:+91${student.parentMobile}${Platform.OS === "ios" ? "&" : "?"}body=${encodeURIComponent(msg)}`
    ).catch(() => Alert.alert("Cannot open SMS"));
  };

  const handleExportPDF = async () => {
    if (!student) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExporting(true);
    try {
      const html = buildStudentReportHTML(school, student, stuRecs, id!);
      if (Platform.OS === "web") {
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(html);
          w.document.close();
          w.print();
        } else {
          Alert.alert("Blocked", "Please allow pop-ups and try again.");
        }
        return;
      }
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
        });
      } else {
        await Print.printAsync({ uri });
      }
    } catch (e: any) {
      Alert.alert("Export Failed", e?.message ?? "Could not generate PDF.");
    } finally {
      setExporting(false);
    }
  };

  if (!student) {
    return (
      <View
        style={[
          styles.root,
          { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: colors.mutedForeground }}>Student not found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[school.primaryColor, "#1a3aaa"]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerLabel}>Student Profile</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.profileRow}>
          <View style={styles.bigAvatar}>
            <Text style={styles.bigAvatarText}>
              {student.name.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stuName}>{student.name}</Text>
            <Text style={styles.stuMeta}>
              Roll: {student.rollNo} · Class {student.class}
              {student.section}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColor + "25" },
              ]}
            >
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
          <View style={styles.bigPctCircle}>
            <Text style={[styles.bigPct, { color: statusColor }]}>
              {overallPct}%
            </Text>
            <Text style={styles.bigPctLabel}>Overall</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Summary cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: "#dcfce7" }]}>
            <Text style={[styles.statNum, { color: "#16a34a" }]}>
              {totalPresent}
            </Text>
            <Text style={[styles.statLbl, { color: "#16a34a" }]}>Present</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: "#fee2e2" }]}>
            <Text style={[styles.statNum, { color: "#dc2626" }]}>
              {totalAbsent}
            </Text>
            <Text style={[styles.statLbl, { color: "#dc2626" }]}>Absent</Text>
          </View>
          <View
            style={[
              styles.statBox,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <Text style={[styles.statNum, { color: colors.primary }]}>
              {totalWD}
            </Text>
            <Text style={[styles.statLbl, { color: colors.primary }]}>
              Working Days
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View
          style={[styles.progressCard, { backgroundColor: colors.card }]}
        >
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressTitle, { color: colors.foreground }]}>
              Attendance Progress
            </Text>
            <Text style={[styles.progressPct, { color: statusColor }]}>
              {overallPct}%
            </Text>
          </View>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: colors.muted },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${overallPct}%` as any, backgroundColor: statusColor },
              ]}
            />
          </View>
          <View style={styles.thresholdRow}>
            <Text style={[styles.thresholdLabel, { color: colors.mutedForeground }]}>
              0%
            </Text>
            <Text style={[styles.thresholdLabel, { color: "#f59e0b" }]}>
              75% ←required
            </Text>
            <Text style={[styles.thresholdLabel, { color: colors.mutedForeground }]}>
              100%
            </Text>
          </View>
        </View>

        {/* Parent contact (if available) */}
        {student.parentMobile && (
          <View
            style={[styles.parentCard, { backgroundColor: colors.card }]}
          >
            <View style={styles.parentLeft}>
              <Feather
                name="user"
                size={14}
                color={colors.mutedForeground}
              />
              <View style={{ marginLeft: 10 }}>
                <Text
                  style={[styles.parentTitle, { color: colors.foreground }]}
                >
                  Parent Contact
                </Text>
                <Text
                  style={[styles.parentNum, { color: colors.mutedForeground }]}
                >
                  +91 {student.parentMobile}
                </Text>
              </View>
            </View>
            <View style={styles.parentBtns}>
              <TouchableOpacity
                onPress={handleSMS}
                style={[
                  styles.parentBtn,
                  { backgroundColor: colors.secondary + "20" },
                ]}
              >
                <Feather
                  name="message-square"
                  size={16}
                  color={colors.secondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCall}
                style={[
                  styles.parentBtn,
                  { backgroundColor: colors.primary + "20" },
                ]}
              >
                <Feather
                  name="phone-call"
                  size={16}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Monthly breakdown table */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Month-by-Month Breakdown
          </Text>
          <View
            style={[
              styles.tableHead,
              { backgroundColor: school.primaryColor },
            ]}
          >
            <Text style={[styles.tc1, styles.th]}>Month</Text>
            <Text style={[styles.tNum, styles.th]}>WD</Text>
            <Text style={[styles.tNum, styles.th]}>P</Text>
            <Text style={[styles.tNum, styles.th]}>A</Text>
            <Text style={[styles.tNum, styles.th]}>%</Text>
          </View>
          {monthStats.map((m, i) => {
            const bg = i % 2 === 0 ? colors.card : colors.background;
            const isSelected = i === selMonthIdx;
            return (
              <TouchableOpacity
                key={m.month}
                onPress={() => {
                  setSelMonthIdx(i);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.tableRow,
                  {
                    backgroundColor: isSelected
                      ? school.primaryColor + "18"
                      : bg,
                    borderLeftWidth: isSelected ? 3 : 0,
                    borderLeftColor: school.primaryColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tc1,
                    styles.td,
                    {
                      color: colors.foreground,
                      fontWeight: isSelected ? "800" : "500",
                    },
                  ]}
                >
                  {m.label}
                </Text>
                <Text
                  style={[
                    styles.tNum,
                    styles.td,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {m.wd}
                </Text>
                <Text
                  style={[
                    styles.tNum,
                    styles.td,
                    { color: "#16a34a", fontWeight: "700" },
                  ]}
                >
                  {m.p}
                </Text>
                <Text
                  style={[
                    styles.tNum,
                    styles.td,
                    { color: "#dc2626", fontWeight: "700" },
                  ]}
                >
                  {m.a}
                </Text>
                <Text
                  style={[
                    styles.tNum,
                    styles.td,
                    {
                      color:
                        m.pct >= 85
                          ? "#16a34a"
                          : m.pct >= 75
                          ? "#f59e0b"
                          : "#dc2626",
                      fontWeight: "800",
                    },
                  ]}
                >
                  {m.wd > 0 ? `${m.pct}%` : "—"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected month calendar */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.calHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {selectedMonth.label} — Day-by-Day
            </Text>
            <View style={styles.calLegend}>
              <View style={[styles.legDot, { backgroundColor: "#dcfce7" }]} />
              <Text style={[styles.legText, { color: colors.mutedForeground }]}>
                P
              </Text>
              <View
                style={[
                  styles.legDot,
                  { backgroundColor: "#fee2e2", marginLeft: 8 },
                ]}
              />
              <Text style={[styles.legText, { color: colors.mutedForeground }]}>
                A
              </Text>
            </View>
          </View>
          <StudentCalendar
            record={selectedMonth.rec}
            studentId={id!}
            workingDays={selectedMonth.wd}
          />
          {selectedMonth.rec && (
            <View style={styles.calSummary}>
              <Text
                style={[
                  styles.calSummaryText,
                  { color: colors.mutedForeground },
                ]}
              >
                {selectedMonth.p} present · {selectedMonth.a} absent ·{" "}
                {selectedMonth.u} unmarked out of {selectedMonth.wd} working
                days
              </Text>
            </View>
          )}
        </View>

        {/* Export PDF button */}
        <TouchableOpacity
          onPress={handleExportPDF}
          disabled={exporting}
          style={[styles.exportBtn, { opacity: exporting ? 0.7 : 1 }]}
        >
          <LinearGradient
            colors={[school.primaryColor, school.accentColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.exportBtnGrad}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="file-text" size={18} color="#fff" />
            )}
            <Text style={styles.exportBtnText}>
              {exporting ? "Generating PDF…" : "Export Report Card PDF"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const calStyles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNum: { fontSize: 11 },
  dayStatus: { fontSize: 8, fontWeight: "900", marginTop: 1 },
  empty: { fontSize: 13, textAlign: "center", paddingVertical: 20 },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 22 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  bigAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  bigAvatarText: { color: "#fff", fontSize: 24, fontWeight: "900" },
  stuName: { color: "#fff", fontSize: 18, fontWeight: "800" },
  stuMeta: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "800" },
  bigPctCircle: { alignItems: "center" },
  bigPct: { fontSize: 26, fontWeight: "900" },
  bigPctLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statBox: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  statNum: { fontSize: 22, fontWeight: "900" },
  statLbl: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  progressCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressTitle: { fontSize: 13, fontWeight: "700" },
  progressPct: { fontSize: 16, fontWeight: "900" },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: { height: "100%", borderRadius: 5 },
  thresholdRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  thresholdLabel: { fontSize: 10 },
  parentCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  parentLeft: { flex: 1, flexDirection: "row", alignItems: "center" },
  parentTitle: { fontSize: 13, fontWeight: "700" },
  parentNum: { fontSize: 12, marginTop: 2 },
  parentBtns: { flexDirection: "row", gap: 8 },
  parentBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", marginBottom: 12 },
  tableHead: {
    flexDirection: "row",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  tc1: { flex: 1.4 },
  tNum: { flex: 1, textAlign: "center" },
  th: { color: "#fff", fontSize: 11, fontWeight: "700", textAlign: "center" },
  td: { fontSize: 12 },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calLegend: { flexDirection: "row", alignItems: "center" },
  legDot: { width: 14, height: 14, borderRadius: 4 },
  legText: { fontSize: 10, fontWeight: "700", marginLeft: 3 },
  calSummary: { marginTop: 12 },
  calSummaryText: { fontSize: 11, textAlign: "center" },
  exportBtn: { borderRadius: 16, overflow: "hidden", marginTop: 4 },
  exportBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  exportBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
