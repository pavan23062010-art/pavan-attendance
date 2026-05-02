import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SchoolInfo, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const PRESET_PRIMARIES = ["#4e73df","#2563eb","#7c3aed","#dc2626","#0891b2","#0f766e","#ea580c"];
const PRESET_ACCENTS   = ["#1cc88a","#16a34a","#0891b2","#f59e0b","#f6c23e","#e74a3b","#8b5cf6"];

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>;
}

function SettingRow({ icon, label, value, onPress, danger }: { icon: string; label: string; value?: string; onPress?: () => void; danger?: boolean }) {
  const colors = useColors();
  return (
    <TouchableOpacity onPress={onPress} style={[styles.settingRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]} disabled={!onPress}>
      <Feather name={icon as any} size={18} color={danger ? colors.destructive : colors.primary} style={{ marginRight: 14 }} />
      <Text style={[styles.settingLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
      {value !== undefined && <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{value}</Text>}
      {onPress && <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginLeft: 4 }} />}
    </TouchableOpacity>
  );
}

function ChangePasswordSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { currentUser, updateUsers, users } = useApp();
  const colors = useColors();
  const [old, setOld] = useState(""); const [newP, setNewP] = useState(""); const [conf, setConf] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  if (!visible) return null;

  const save = () => {
    if (old !== currentUser?.password) { setMsg({ text: "Current password is incorrect.", ok: false }); return; }
    if (newP.length < 4) { setMsg({ text: "Minimum 4 characters.", ok: false }); return; }
    if (newP !== conf) { setMsg({ text: "Passwords do not match.", ok: false }); return; }
    updateUsers(users.map(u => u.id === currentUser?.id ? { ...u, password: newP } : u));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMsg({ text: "Password changed!", ok: true });
    setOld(""); setNewP(""); setConf("");
    setTimeout(() => { setMsg(null); onClose(); }, 1500);
  };

  return (
    <View style={[styles.inlineSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sheetHeader}>
        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Change Password</Text>
        <TouchableOpacity onPress={onClose}><Feather name="x" size={20} color={colors.mutedForeground} /></TouchableOpacity>
      </View>
      {[
        { label: "Current Password", val: old, set: setOld },
        { label: "New Password", val: newP, set: setNewP },
        { label: "Confirm New Password", val: conf, set: setConf },
      ].map(f => (
        <View key={f.label} style={{ marginBottom: 12 }}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{f.label.toUpperCase()}</Text>
          <TextInput secureTextEntry style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={f.val} onChangeText={f.set} />
        </View>
      ))}
      {msg && <View style={[styles.msgBox, { backgroundColor: (msg.ok ? "#dcfce7" : "#fee2e2") }]}>
        <Text style={{ color: msg.ok ? "#16a34a" : "#dc2626", fontSize: 13 }}>{msg.text}</Text>
      </View>}
      <TouchableOpacity onPress={save} style={styles.saveBtn}>
        <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtnGrad}>
          <Text style={styles.saveBtnText}>Save</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function SchoolBrandingPanel() {
  const { school, updateSchool } = useApp();
  const colors = useColors();
  const [draft, setDraft] = useState<SchoolInfo>(school);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => setDraft(school), [school]);

  const save = () => {
    if (!draft.nameLine1.trim() || !draft.location.trim()) { setMsg({ text: "Name and location required.", ok: false }); return; }
    updateSchool(draft);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMsg({ text: "Saved!", ok: true });
    setTimeout(() => setMsg(null), 2000);
  };

  const F = ({ label, field, placeholder }: { label: string; field: keyof SchoolInfo; placeholder: string }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
        value={String(draft[field])} onChangeText={t => setDraft(d => ({ ...d, [field]: t }))} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} />
    </View>
  );

  return (
    <View style={[styles.inlineSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sheetTitle, { color: colors.foreground, marginBottom: 16 }]}>School Branding</Text>

      {/* Preview strip */}
      <LinearGradient colors={[draft.primaryColor, draft.accentColor]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.previewStrip}>
        <View>
          <Text style={styles.previewLine1}>{draft.nameLine1 || "Line 1"}</Text>
          <Text style={styles.previewLine2}>{draft.nameLine2 || "Line 2"}</Text>
          <Text style={styles.previewLoc}>{draft.location || "Location"}</Text>
        </View>
        <Text style={styles.previewAY}>AY {draft.academicYear}</Text>
      </LinearGradient>

      <F label="NAME LINE 1" field="nameLine1" placeholder="e.g. PAVAN GROUP OF" />
      <F label="NAME LINE 2" field="nameLine2" placeholder="e.g. SCHOOLS" />
      <F label="LOCATION" field="location" placeholder="e.g. Vinukonda" />
      <F label="ACADEMIC YEAR" field="academicYear" placeholder="e.g. 2026 – 2027" />
      <F label="MADE BY (CREDIT)" field="madeBy" placeholder="e.g. Pavan" />

      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>PRIMARY COLOR</Text>
      <View style={styles.colorRow}>
        {PRESET_PRIMARIES.map(c => (
          <TouchableOpacity key={c} onPress={() => setDraft(d => ({ ...d, primaryColor: c }))}
            style={[styles.colorDot, { backgroundColor: c, borderWidth: draft.primaryColor === c ? 3 : 0, borderColor: "#1a1a2e" }]} />
        ))}
      </View>

      <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>ACCENT COLOR</Text>
      <View style={styles.colorRow}>
        {PRESET_ACCENTS.map(c => (
          <TouchableOpacity key={c} onPress={() => setDraft(d => ({ ...d, accentColor: c }))}
            style={[styles.colorDot, { backgroundColor: c, borderWidth: draft.accentColor === c ? 3 : 0, borderColor: "#1a1a2e" }]} />
        ))}
      </View>

      {msg && <View style={[styles.msgBox, { backgroundColor: msg.ok ? "#dcfce7" : "#fee2e2", marginTop: 12 }]}>
        <Text style={{ color: msg.ok ? "#16a34a" : "#dc2626", fontSize: 13 }}>{msg.text}</Text>
      </View>}

      <TouchableOpacity onPress={save} style={[styles.saveBtn, { marginTop: 16 }]}>
        <LinearGradient colors={[draft.primaryColor, draft.accentColor]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtnGrad}>
          <Text style={styles.saveBtnText}>Save School Info</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

export default function SettingsScreen() {
  const { currentUser, updateUsers, users, logout, school } = useApp();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : 60;
  const [showChangePass, setShowChangePass] = useState(false);
  const [dispName, setDispName] = useState(currentUser?.displayName ?? "");
  const [editingName, setEditingName] = useState(false);

  const saveName = () => {
    if (!dispName.trim() || !currentUser) return;
    updateUsers(users.map(u => u.id === currentUser.id ? { ...u, displayName: dispName.trim() } : u));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditingName(false);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => { logout(); router.replace("/"); } },
    ]);
  };

  if (!currentUser) return null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[school.primaryColor, "#1a3aaa"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSub}>{currentUser.displayName} · {currentUser.role}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 16 }} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <LinearGradient colors={currentUser.role === "admin" ? ["#f6c23e","#e74a3b"] : [school.primaryColor, school.accentColor]}
            style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{currentUser.displayName.charAt(0)}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput style={[styles.nameInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                  value={dispName} onChangeText={setDispName} autoFocus />
                <TouchableOpacity onPress={saveName} style={[styles.saveNameBtn, { backgroundColor: colors.secondary }]}>
                  <Feather name="check" size={14} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setDispName(currentUser.displayName); setEditingName(false); }} style={styles.cancelNameBtn}>
                  <Feather name="x" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingName(true)} style={styles.nameRow}>
                <Text style={[styles.profileName, { color: colors.foreground }]}>{currentUser.displayName}</Text>
                <Feather name="edit-2" size={14} color={colors.mutedForeground} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}
            <Text style={[styles.profileMeta, { color: colors.mutedForeground }]}>
              @{currentUser.username} · {currentUser.role}{currentUser.assignedClass ? ` · Class ${currentUser.assignedClass}${currentUser.assignedSection}` : ""}
            </Text>
          </View>
        </View>

        <SectionHeader title="ACCOUNT" />
        <SettingRow icon="lock" label="Change Password" onPress={() => setShowChangePass(v => !v)} />
        {showChangePass && <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}><ChangePasswordSheet visible={showChangePass} onClose={() => setShowChangePass(false)} /></View>}

        {currentUser.role === "admin" && (
          <>
            <SectionHeader title="SCHOOL BRANDING" />
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <SchoolBrandingPanel />
            </View>
          </>
        )}

        <SectionHeader title="APP INFO" />
        <SettingRow icon="info" label="Academic Year" value={school.academicYear} />
        <SettingRow icon="map-pin" label="School" value={`${school.nameLine1} ${school.nameLine2}, ${school.location}`} />

        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Feather name="log-out" size={18} color={colors.destructive} />
            <Text style={[styles.logoutText, { color: colors.destructive }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  profileCard: { flexDirection: "row", alignItems: "center", margin: 16, borderRadius: 20, padding: 16, gap: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  profileAvatarText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  nameRow: { flexDirection: "row", alignItems: "center" },
  nameEditRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nameInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14 },
  saveNameBtn: { padding: 8, borderRadius: 8 },
  cancelNameBtn: { padding: 8 },
  profileName: { fontSize: 16, fontWeight: "700" },
  profileMeta: { fontSize: 12, marginTop: 3 },
  sectionHeader: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6 },
  settingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  settingLabel: { flex: 1, fontSize: 15 },
  settingValue: { fontSize: 13 },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, padding: 16, justifyContent: "center", borderWidth: 1, borderColor: "#fee2e2", backgroundColor: "#fff1f1" },
  logoutText: { fontSize: 15, fontWeight: "700" },
  // Inline sheet styles
  inlineSheet: { borderRadius: 20, padding: 18, borderWidth: 1, marginBottom: 8 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: "700" },
  fieldLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 6 },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  msgBox: { borderRadius: 10, padding: 10 },
  saveBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  saveBtnGrad: { paddingVertical: 13, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  // Branding panel
  previewStrip: { borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  previewLine1: { color: "#fff", fontSize: 13, fontWeight: "800" },
  previewLine2: { color: "#fff", fontSize: 13, fontWeight: "800" },
  previewLoc: { color: "rgba(255,255,255,0.65)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginTop: 2 },
  previewAY: { color: "rgba(255,255,255,0.65)", fontSize: 11 },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
});
