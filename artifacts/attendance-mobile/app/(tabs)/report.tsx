import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ACADEMIC_MONTHS, MONTH_LABELS, SECTIONS, gc, pct, presentCount, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function ReportScreen() {
  const { students, records, currentUser, classes, school } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : 60;

  const isTeacher = currentUser?.role === "teacher";
  const [selClass, setSelClass] = useState(isTeacher ? (currentUser?.assignedClass ?? classes[0] ?? 1) : (classes[0] ?? 1));
  const [selSec, setSelSec] = useState(isTeacher ? (currentUser?.assignedSection ?? "A") : "A");
  const [selMonthIdx, setSelMonthIdx] = useState(0);

  const selMonth = ACADEMIC_MONTHS[selMonthIdx];
  const rec = useMemo(() => records.find(r => r.class === selClass && r.section === selSec && r.month === selMonth), [records, selClass, selSec, selMonth]);
  const wd = rec?.workingDays ?? 0;
  const clsStu = useMemo(() => students.filter(s => s.class === selClass && s.section === selSec), [students, selClass, selSec]);

  const tableData = useMemo(() =>
    clsStu.map(s => {
      const pr = rec ? presentCount(rec, s.id) : 0;
      const ab = wd - pr;
      const p = pct(pr, wd);
      return { ...s, present: pr, absent: ab, pct: p };
    }).sort((a, b) => b.pct - a.pct),
    [clsStu, rec, wd]);

  const classAvg = useMemo(() => {
    if (tableData.length === 0) return 0;
    return Math.round(tableData.reduce((a, d) => a + d.pct, 0) / tableData.length);
  }, [tableData]);

  const regular = tableData.filter(d => d.pct >= 75).length;
  const irregular = tableData.filter(d => d.pct < 75).length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[school.primaryColor, "#1a3aaa"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.headerTitle}>Monthly Report</Text>
        <Text style={styles.headerSub}>Class {selClass} – Sec {selSec}</Text>
      </LinearGradient>

      <View style={{ flex: 1 }}>
        {/* Filters */}
        <View style={[styles.filterBox, { backgroundColor: colors.card }]}>
          {!isTeacher && (
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>CLASS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {classes.map(c => (
                  <TouchableOpacity key={c} onPress={() => setSelClass(c)}
                    style={[styles.pill, { backgroundColor: selClass === c ? colors.primary : colors.muted }]}>
                    <Text style={[styles.pillText, { color: selClass === c ? "#fff" : colors.mutedForeground }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {!isTeacher && (
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>SEC</Text>
              {SECTIONS.map(s => (
                <TouchableOpacity key={s} onPress={() => setSelSec(s)}
                  style={[styles.pill, { backgroundColor: selSec === s ? colors.secondary : colors.muted }]}>
                  <Text style={[styles.pillText, { color: selSec === s ? "#fff" : colors.mutedForeground }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
            {MONTH_LABELS.map((ml, mi) => (
              <TouchableOpacity key={mi} onPress={() => setSelMonthIdx(mi)}
                style={[styles.monthPill, { backgroundColor: selMonthIdx === mi ? colors.primary : colors.muted }]}>
                <Text style={[styles.monthText, { color: selMonthIdx === mi ? "#fff" : colors.mutedForeground }]}>{ml}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Summary stats */}
        <View style={styles.statsRow}>
          {[
            { label: "Working Days", value: wd, color: colors.primary },
            { label: "Class Avg", value: `${classAvg}%`, color: colors.secondary },
            { label: "Regular", value: regular, color: "#16a34a" },
            { label: "Irregular", value: irregular, color: colors.destructive },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Table header */}
        <View style={[styles.tableHeader, { backgroundColor: colors.primary }]}>
          <Text style={[styles.colName, styles.th]}>Name</Text>
          <Text style={[styles.colNum, styles.th]}>P</Text>
          <Text style={[styles.colNum, styles.th]}>A</Text>
          <Text style={[styles.colNum, styles.th]}>%</Text>
          <Text style={[styles.colStatus, styles.th]}>Status</Text>
        </View>

        <FlatList
          data={tableData}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: bottomPad + 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No students in this class</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const isReg = item.pct >= 75;
            return (
              <View style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? colors.card : colors.background }]}>
                <View style={styles.colName}>
                  <Text style={[styles.stuName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.stuRoll, { color: colors.mutedForeground }]}>{item.rollNo}</Text>
                </View>
                <Text style={[styles.colNum, styles.cell, { color: "#16a34a" }]}>{item.present}</Text>
                <Text style={[styles.colNum, styles.cell, { color: colors.destructive }]}>{item.absent}</Text>
                <Text style={[styles.colNum, styles.cell, { color: gc(item.pct), fontWeight: "800" }]}>{item.pct}%</Text>
                <View style={styles.colStatus}>
                  <View style={[styles.statusBadge, { backgroundColor: isReg ? "#dcfce7" : "#fee2e2" }]}>
                    <Text style={[styles.statusText, { color: isReg ? "#16a34a" : "#dc2626" }]}>
                      {isReg ? "Regular" : "Irregular"}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 },
  filterBox: { paddingHorizontal: 16, paddingVertical: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  filterRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  filterLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, width: 36 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 6 },
  pillText: { fontSize: 12, fontWeight: "700" },
  monthPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 8 },
  monthText: { fontSize: 12, fontWeight: "700" },
  statsRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  statCard: { flex: 1, borderRadius: 12, padding: 10, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  statVal: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2, textAlign: "center" },
  tableHeader: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10 },
  th: { color: "#fff", fontSize: 11, fontWeight: "700" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
  cell: { fontSize: 13, fontWeight: "700" },
  colName: { flex: 2 },
  colNum: { flex: 1, textAlign: "center" },
  colStatus: { flex: 2, alignItems: "flex-end" },
  stuName: { fontSize: 13, fontWeight: "600" },
  stuRoll: { fontSize: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 14 },
});
