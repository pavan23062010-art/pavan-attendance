import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { Alert, FlatList, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SECTIONS, Student, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function AddStudentModal({ visible, onClose, defaultClass, defaultSection, classes }: {
  visible: boolean; onClose: () => void; defaultClass: number; defaultSection: string; classes: number[];
}) {
  const { addStudent } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [cls, setCls] = useState(defaultClass);
  const [sec, setSec] = useState(defaultSection);
  const [error, setError] = useState("");

  const reset = () => { setName(""); setRollNo(""); setError(""); };

  const handleAdd = () => {
    if (!name.trim()) { setError("Name is required."); return; }
    if (!rollNo.trim()) { setError("Roll number is required."); return; }
    addStudent({ name: name.trim(), rollNo: rollNo.trim(), class: cls, section: sec });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { reset(); onClose(); }}>
      <View style={[styles.modalRoot, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 67 : insets.top + 16 }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Student</Text>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Feather name="x" size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>FULL NAME</Text>
          <TextInput style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="e.g. Ravi Kumar" placeholderTextColor={colors.mutedForeground}
            value={name} onChangeText={t => { setName(t); setError(""); }} />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ROLL NUMBER</Text>
          <TextInput style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="e.g. 1A006" placeholderTextColor={colors.mutedForeground}
            value={rollNo} onChangeText={t => { setRollNo(t); setError(""); }} autoCapitalize="characters" />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>CLASS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {classes.map(c => (
              <TouchableOpacity key={c} onPress={() => setCls(c)}
                style={[styles.pill, { backgroundColor: cls === c ? colors.primary : colors.muted, marginRight: 8 }]}>
                <Text style={[styles.pillText, { color: cls === c ? "#fff" : colors.mutedForeground }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>SECTION</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
            {SECTIONS.map(s => (
              <TouchableOpacity key={s} onPress={() => setSec(s)}
                style={[styles.pill, { backgroundColor: sec === s ? colors.secondary : colors.muted }]}>
                <Text style={[styles.pillText, { color: sec === s ? "#fff" : colors.mutedForeground }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15" }]}>
              <Text style={[styles.errorText, { color: colors.destructive }]}>⚠ {error}</Text>
            </View>
          )}

          <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
            <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtnGrad}>
              <Text style={styles.addBtnText}>Add Student</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function StudentsScreen() {
  const { students, currentUser, classes, removeStudent, school } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : 60;

  const isTeacher = currentUser?.role === "teacher";
  const [selClass, setSelClass] = useState(isTeacher ? (currentUser?.assignedClass ?? classes[0] ?? 1) : (classes[0] ?? 1));
  const [selSec, setSelSec] = useState(isTeacher ? (currentUser?.assignedSection ?? "A") : "A");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const clsStu = useMemo(() =>
    students.filter(s => s.class === selClass && s.section === selSec && (
      !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()) || s.rollNo.toLowerCase().includes(search.toLowerCase())
    )),
    [students, selClass, selSec, search]);

  const handleDelete = (s: Student) => {
    Alert.alert("Remove Student", `Remove ${s.name} from the class?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => { removeStudent(s.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[school.primaryColor, "#1a3aaa"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.headerTitle}>Students</Text>
        <Text style={styles.headerSub}>{clsStu.length} in Class {selClass} – Sec {selSec}</Text>
      </LinearGradient>

      {/* Filters */}
      {!isTeacher && (
        <View style={[styles.filterBox, { backgroundColor: colors.card }]}>
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
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>SEC</Text>
            {SECTIONS.map(s => (
              <TouchableOpacity key={s} onPress={() => setSelSec(s)}
                style={[styles.pill, { backgroundColor: selSec === s ? colors.secondary : colors.muted }]}>
                <Text style={[styles.pillText, { color: selSec === s ? "#fff" : colors.mutedForeground }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search by name or roll no..." placeholderTextColor={colors.mutedForeground}
          value={search} onChangeText={setSearch} />
        {!!search && <TouchableOpacity onPress={() => setSearch("")}><Feather name="x" size={16} color={colors.mutedForeground} /></TouchableOpacity>}
      </View>

      <FlatList
        data={clsStu}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 80 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="users" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No students found</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={[styles.stuCard, { backgroundColor: colors.card }]}>
            <View style={[styles.stuAvatar, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.stuAvatarText, { color: colors.primary }]}>{item.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stuName, { color: colors.foreground }]}>{item.name}</Text>
              <Text style={[styles.stuMeta, { color: colors.mutedForeground }]}>Roll: {item.rollNo} · Class {item.class}{item.section}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
              <Feather name="trash-2" size={18} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* FAB */}
      <TouchableOpacity onPress={() => setShowModal(true)}
        style={[styles.fab, { bottom: bottomPad + 16 }]}>
        <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGrad}>
          <Feather name="user-plus" size={22} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <AddStudentModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        defaultClass={selClass}
        defaultSection={selSec}
        classes={classes}
      />
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
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, margin: 16, marginBottom: 4, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput: { flex: 1, fontSize: 14 },
  stuCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  stuAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginRight: 12 },
  stuAvatarText: { fontSize: 17, fontWeight: "700" },
  stuName: { fontSize: 14, fontWeight: "700" },
  stuMeta: { fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 8 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14 },
  fab: { position: "absolute", right: 20, shadowColor: "#4e73df", shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  fabGrad: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  // Modal styles
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: "800" },
  fieldLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 8, marginTop: 16 },
  fieldInput: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 4 },
  errorBox: { borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13 },
  addBtn: { borderRadius: 16, overflow: "hidden" },
  addBtnGrad: { paddingVertical: 15, alignItems: "center" },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
