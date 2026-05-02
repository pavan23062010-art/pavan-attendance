import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SchoolInfo, UserAccount, useApp, SECTIONS } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const PRESET_PRIMARIES = ["#4e73df","#2563eb","#7c3aed","#dc2626","#0891b2","#0f766e","#ea580c"];
const PRESET_ACCENTS   = ["#1cc88a","#16a34a","#0891b2","#f59e0b","#f6c23e","#e74a3b","#8b5cf6"];

const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 6);

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Change Password ──────────────────────────────────────────────────────────
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

// ─── School Branding ──────────────────────────────────────────────────────────
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
      <LinearGradient colors={[draft.primaryColor, draft.accentColor]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.previewStrip}>
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

// ─── Add/Edit User Modal ──────────────────────────────────────────────────────
function UserFormModal({
  visible, onClose, onSave, editUser, classes,
}: {
  visible: boolean; onClose: () => void;
  onSave: (u: UserAccount) => void;
  editUser?: UserAccount | null;
  classes: number[];
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"teacher" | "admin">("teacher");
  const [assignedClass, setAssignedClass] = useState<number>(classes[0] ?? 1);
  const [assignedSection, setAssignedSection] = useState("A");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editUser) {
      setDisplayName(editUser.displayName);
      setUsername(editUser.username);
      setPassword(editUser.password);
      setRole(editUser.role);
      setAssignedClass(editUser.assignedClass ?? classes[0] ?? 1);
      setAssignedSection(editUser.assignedSection ?? "A");
    } else {
      setDisplayName(""); setUsername(""); setPassword("");
      setRole("teacher"); setAssignedClass(classes[0] ?? 1); setAssignedSection("A");
    }
    setError("");
  }, [visible, editUser]);

  const handleSave = () => {
    if (!displayName.trim()) { setError("Display name is required."); return; }
    if (!username.trim()) { setError("Username is required."); return; }
    if (username.trim().includes(" ")) { setError("Username cannot contain spaces."); return; }
    if (!password.trim() || password.length < 4) { setError("Password must be at least 4 characters."); return; }

    onSave({
      id: editUser?.id ?? genId(),
      displayName: displayName.trim(),
      username: username.trim().toLowerCase(),
      password: password.trim(),
      role,
      assignedClass: role === "teacher" ? assignedClass : undefined,
      assignedSection: role === "teacher" ? assignedSection : undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 67 : insets.top + 16 }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.sheetTitle, { color: colors.foreground, fontSize: 22 }]}>
            {editUser ? "Edit User" : "Add New User"}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>

          {/* Role toggle */}
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ROLE</Text>
          <View style={[styles.roleToggle, { backgroundColor: colors.muted }]}>
            {(["teacher", "admin"] as const).map(r => (
              <TouchableOpacity key={r} onPress={() => setRole(r)}
                style={[styles.roleOption, role === r && { backgroundColor: colors.primary }]}>
                <Feather name={r === "admin" ? "shield" : "user"} size={14} color={role === r ? "#fff" : colors.mutedForeground} />
                <Text style={[styles.roleText, { color: role === r ? "#fff" : colors.mutedForeground }]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Display Name */}
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DISPLAY NAME</Text>
          <TextInput style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="e.g. Teacher Lakshmi" placeholderTextColor={colors.mutedForeground}
            value={displayName} onChangeText={t => { setDisplayName(t); setError(""); }} />

          {/* Username */}
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>USERNAME</Text>
          <TextInput style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="e.g. teacher5" placeholderTextColor={colors.mutedForeground}
            value={username} onChangeText={t => { setUsername(t); setError(""); }}
            autoCapitalize="none" autoCorrect={false} />

          {/* Password */}
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>PASSWORD</Text>
          <View style={[styles.passRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput style={[styles.passInput, { color: colors.foreground }]}
              placeholder="Min. 4 characters" placeholderTextColor={colors.mutedForeground}
              value={password} onChangeText={t => { setPassword(t); setError(""); }}
              secureTextEntry={!showPass} autoCapitalize="none" />
            <TouchableOpacity onPress={() => setShowPass(v => !v)} style={{ padding: 10 }}>
              <Feather name={showPass ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Class + Section (teacher only) */}
          {role === "teacher" && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ASSIGN CLASS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {classes.map(c => (
                  <TouchableOpacity key={c} onPress={() => setAssignedClass(c)}
                    style={[styles.pill, { backgroundColor: assignedClass === c ? colors.primary : colors.muted, marginRight: 8 }]}>
                    <Text style={[styles.pillText, { color: assignedClass === c ? "#fff" : colors.mutedForeground }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ASSIGN SECTION</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
                {SECTIONS.map(s => (
                  <TouchableOpacity key={s} onPress={() => setAssignedSection(s)}
                    style={[styles.pill, { backgroundColor: assignedSection === s ? colors.secondary : colors.muted }]}>
                    <Text style={[styles.pillText, { color: assignedSection === s ? "#fff" : colors.mutedForeground }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {!!error && (
            <View style={[styles.msgBox, { backgroundColor: colors.destructive + "15", marginBottom: 12 }]}>
              <Text style={{ color: colors.destructive, fontSize: 13 }}>⚠ {error}</Text>
            </View>
          )}

          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtnGrad}>
              <Feather name={editUser ? "check" : "user-plus"} size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>{editUser ? "Save Changes" : "Create Account"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── User Management Panel ────────────────────────────────────────────────────
function UserManagementPanel() {
  const { users, updateUsers, classes, currentUser } = useApp();
  const colors = useColors();
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<UserAccount | null>(null);

  const nonAdminUsers = users.filter(u => u.id !== currentUser?.id);

  const handleSave = (u: UserAccount) => {
    const exists = users.find(x => x.username === u.username && x.id !== u.id);
    if (exists) {
      Alert.alert("Username Taken", `"${u.username}" is already in use. Please choose another.`);
      return;
    }
    if (users.find(x => x.id === u.id)) {
      updateUsers(users.map(x => x.id === u.id ? u : x));
    } else {
      updateUsers([...users, u]);
    }
  };

  const handleDelete = (u: UserAccount) => {
    if (u.role === "admin") {
      Alert.alert("Cannot Delete", "Admin accounts cannot be deleted.");
      return;
    }
    Alert.alert(
      "Delete Account",
      `Remove ${u.displayName} (@${u.username})? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            updateUsers(users.filter(x => x.id !== u.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const openEdit = (u: UserAccount) => {
    setEditUser(u);
    setShowModal(true);
  };

  const openAdd = () => {
    setEditUser(null);
    setShowModal(true);
  };

  const roleColor = (role: string) => role === "admin" ? "#f59e0b" : colors.primary;

  return (
    <View style={[styles.inlineSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.sheetHeader, { marginBottom: 12 }]}>
        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>User Accounts</Text>
        <TouchableOpacity onPress={openAdd}
          style={[styles.addUserBtn, { backgroundColor: colors.primary }]}>
          <Feather name="plus" size={14} color="#fff" />
          <Text style={styles.addUserBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Current admin (self) */}
      {currentUser && (
        <View style={[styles.userRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <LinearGradient colors={["#f6c23e", "#e74a3b"]} style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{currentUser.displayName.charAt(0)}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: colors.foreground }]}>{currentUser.displayName}</Text>
            <Text style={[styles.userMeta, { color: colors.mutedForeground }]}>@{currentUser.username}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: "#f59e0b20" }]}>
            <Text style={[styles.roleBadgeText, { color: "#f59e0b" }]}>Admin (You)</Text>
          </View>
        </View>
      )}

      {/* Divider */}
      {nonAdminUsers.length > 0 && (
        <Text style={[styles.subHeader, { color: colors.mutedForeground }]}>
          TEACHERS & STAFF ({nonAdminUsers.length})
        </Text>
      )}

      {nonAdminUsers.length === 0 && (
        <View style={styles.emptyUsers}>
          <Feather name="users" size={28} color={colors.mutedForeground} />
          <Text style={[styles.emptyUsersText, { color: colors.mutedForeground }]}>No other accounts yet</Text>
          <Text style={[styles.emptyUsersSub, { color: colors.mutedForeground }]}>Tap Add to create a teacher account</Text>
        </View>
      )}

      {nonAdminUsers.map(u => (
        <View key={u.id} style={[styles.userRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.userAvatar, { backgroundColor: roleColor(u.role) + "25" }]}>
            <Text style={[styles.userAvatarText, { color: roleColor(u.role) }]}>{u.displayName.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: colors.foreground }]}>{u.displayName}</Text>
            <Text style={[styles.userMeta, { color: colors.mutedForeground }]}>
              @{u.username}
              {u.assignedClass ? ` · Class ${u.assignedClass}${u.assignedSection}` : ""}
            </Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: roleColor(u.role) + "20" }]}>
            <Text style={[styles.roleBadgeText, { color: roleColor(u.role) }]}>{u.role}</Text>
          </View>
          <View style={styles.userActions}>
            <TouchableOpacity onPress={() => openEdit(u)} style={[styles.userActionBtn, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="edit-2" size={14} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(u)} style={[styles.userActionBtn, { backgroundColor: colors.destructive + "15" }]}>
              <Feather name="trash-2" size={14} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <UserFormModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        editUser={editUser}
        classes={classes}
      />
    </View>
  );
}

// ─── Main Settings Screen ─────────────────────────────────────────────────────
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
          <LinearGradient
            colors={currentUser.role === "admin" ? ["#f6c23e", "#e74a3b"] : [school.primaryColor, school.accentColor]}
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

        {/* PAVAN AI */}
        <TouchableOpacity onPress={() => router.push("/chat")} style={styles.pavanCard}>
          <LinearGradient colors={["#4e73df", "#1cc88a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pavanGrad}>
            <View style={styles.pavanAvatar}>
              <Text style={styles.pavanAvatarText}>P</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pavanTitle}>Chat with PAVAN</Text>
              <Text style={styles.pavanSub}>Your AI attendance assistant</Text>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Account */}
        <SectionHeader title="ACCOUNT" />
        <SettingRow icon="lock" label="Change Password" onPress={() => setShowChangePass(v => !v)} />
        {showChangePass && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <ChangePasswordSheet visible={showChangePass} onClose={() => setShowChangePass(false)} />
          </View>
        )}

        {/* Admin-only sections */}
        {currentUser.role === "admin" && (
          <>
            <SectionHeader title="USER MANAGEMENT" />
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <UserManagementPanel />
            </View>

            <SectionHeader title="SCHOOL BRANDING" />
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <SchoolBrandingPanel />
            </View>
          </>
        )}

        {/* App info */}
        <SectionHeader title="APP INFO" />
        <SettingRow icon="info" label="Academic Year" value={school.academicYear} />
        <SettingRow icon="map-pin" label="School" value={`${school.nameLine1} ${school.nameLine2}, ${school.location}`} />
        <SettingRow icon="users" label="Total Accounts" value={`${users.length} users`} />

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
  inlineSheet: { borderRadius: 20, padding: 18, borderWidth: 1, marginBottom: 8 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: "700" },
  fieldLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 6, marginTop: 12 },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  passRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  passInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  msgBox: { borderRadius: 10, padding: 10 },
  saveBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  saveBtnGrad: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 13 },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  previewStrip: { borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  previewLine1: { color: "#fff", fontSize: 13, fontWeight: "800" },
  previewLine2: { color: "#fff", fontSize: 13, fontWeight: "800" },
  previewLoc: { color: "rgba(255,255,255,0.65)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginTop: 2 },
  previewAY: { color: "rgba(255,255,255,0.65)", fontSize: 11 },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  pavanCard: { marginHorizontal: 16, marginTop: 16, marginBottom: 4, borderRadius: 20, overflow: "hidden", shadowColor: "#4e73df", shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  pavanGrad: { flexDirection: "row", alignItems: "center", padding: 18, gap: 14 },
  pavanAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  pavanAvatarText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  pavanTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  pavanSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  // User management
  addUserBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  addUserBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  subHeader: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginTop: 12, marginBottom: 6 },
  userRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, gap: 10 },
  userAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  userAvatarText: { fontSize: 15, fontWeight: "700" },
  userName: { fontSize: 13, fontWeight: "700" },
  userMeta: { fontSize: 11, marginTop: 1 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  roleBadgeText: { fontSize: 10, fontWeight: "800" },
  userActions: { flexDirection: "row", gap: 6 },
  userActionBtn: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  emptyUsers: { alignItems: "center", paddingVertical: 24, gap: 6 },
  emptyUsersText: { fontSize: 13, fontWeight: "600" },
  emptyUsersSub: { fontSize: 11 },
  // User form modal
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  roleToggle: { flexDirection: "row", borderRadius: 12, padding: 4, marginBottom: 4 },
  roleOption: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  roleText: { fontSize: 13, fontWeight: "700" },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  pillText: { fontSize: 12, fontWeight: "700" },
});
