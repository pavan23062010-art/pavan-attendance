import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { fetch } from "expo/fetch";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { presentCount, pct, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
  ts?: number;
}

// ─── Rich text: parse **bold** fragments ─────────────────────────────────────
function RichText({ text, color, style }: { text: string; color: string; style?: object }) {
  const parts: { text: string; bold: boolean }[] = [];
  const regex = /\*\*(.*?)\*\*/g;
  let last = 0; let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), bold: false });
    parts.push({ text: m[1], bold: true });
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push({ text: text.slice(last), bold: false });
  return (
    <Text style={[{ color, fontSize: 14, lineHeight: 20 }, style]}>
      {parts.map((p, i) => (
        <Text key={i} style={p.bold ? { fontWeight: "800" } : undefined}>{p.text}</Text>
      ))}
    </Text>
  );
}

// ─── Typing dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDot(d => (d + 1) % 4), 400);
    return () => clearInterval(t);
  }, []);
  return (
    <Text style={{ fontSize: 18, letterSpacing: 2, color: "#94a3b8" }}>
      {"● ● ●".split(" ").map((d, i) => (
        <Text key={i} style={{ opacity: i <= dot ? 1 : 0.2 }}>{d} </Text>
      ))}
    </Text>
  );
}

const formatTime = (ts?: number) => {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function ChatScreen() {
  const { currentUser, school, students, records, classes } = useApp();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const name = currentUser?.displayName ?? "there";
  const role = currentUser?.role ?? "teacher";

  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "http://localhost:80";

  // Build school + attendance context to send with every message
  const buildContext = () => {
    const totalStudents = students.length;
    const below75 = students.filter(s => {
      const recs = records.filter(r => r.class === s.class && r.section === s.section);
      const tp = recs.reduce((a, r) => a + presentCount(r, s.id), 0);
      const wd = recs.reduce((a, r) => a + r.workingDays, 0);
      return pct(tp, wd) < 75;
    }).length;
    const classStats = classes.map(cls => {
      const clsStu = students.filter(s => s.class === cls);
      return `Class ${cls}: ${clsStu.length} students`;
    }).join(", ");
    return {
      schoolName: `${school.nameLine1} ${school.nameLine2}`,
      location: school.location,
      academicYear: school.academicYear,
      userRole: role,
      totalStudents,
      below75,
      classStats,
      assignedClass: currentUser?.assignedClass,
      assignedSection: currentUser?.assignedSection,
    };
  };

  const welcomeMsg: Message = {
    id: "welcome",
    role: "assistant",
    ts: Date.now(),
    content: `Hi **${name}**! 👋 I'm **PAVAN**, your AI attendance assistant for **${school.nameLine1} ${school.nameLine2}**.\n\nI know your school's attendance data and can help with:\n• Student attendance analysis & reports\n• Tips for at-risk students\n• Parent communication advice\n• Academic year ${school.academicYear} insights\n\nWhat would you like to know?`,
  };

  useEffect(() => {
    const timer = setTimeout(() => setMessages([welcomeMsg]), 500);
    return () => clearTimeout(timer);
  }, []);

  const clearChat = () => {
    Alert.alert("Clear Chat", "Start a fresh conversation with PAVAN?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => { setMessages([{ ...welcomeMsg, id: "welcome-" + Date.now(), ts: Date.now() }]); } },
    ]);
  };

  const scrollToBottom = () => {
    setTimeout(() => flatRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, ts: Date.now() };
    const loadingId = (Date.now() + 1).toString();
    const loadingMsg: Message = { id: loadingId, role: "assistant", content: "", loading: true };

    setMessages(prev => [loadingMsg, userMsg, ...prev]);
    setSending(true);
    scrollToBottom();

    const history: { role: "user" | "assistant"; content: string }[] = [];
    setMessages(prev => {
      const real = prev.filter(m => !m.loading && m.id !== loadingId && m.id !== userMsg.id && !m.id.startsWith("welcome"));
      real.slice(0, 10).forEach(m => history.unshift({ role: m.role, content: m.content }));
      return prev;
    });
    history.push({ role: "user", content: text });

    try {
      const response = await fetch(`${apiBase}/api/pavan/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, userName: name, context: buildContext() }),
      });

      let accumulated = "";
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                accumulated += data.content;
                setMessages(prev => prev.map(m => m.id === loadingId
                  ? { ...m, content: accumulated, loading: false, ts: Date.now() }
                  : m
                ));
              }
              if (data.error) {
                setMessages(prev => prev.map(m => m.id === loadingId
                  ? { ...m, content: data.error, loading: false, ts: Date.now() }
                  : m
                ));
              }
            } catch (_) {}
          }
        }
      }
      if (!accumulated) {
        setMessages(prev => prev.map(m => m.id === loadingId
          ? { ...m, content: "Sorry, I couldn't respond. Please try again.", loading: false, ts: Date.now() }
          : m
        ));
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {
      setMessages(prev => prev.map(m => m.id === loadingId
        ? { ...m, content: "Connection error. Please check your network and try again.", loading: false, ts: Date.now() }
        : m
      ));
    } finally {
      setSending(false);
    }
  };

  const renderMsg = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}>
        {!isUser && (
          <LinearGradient colors={["#4e73df", "#1cc88a"]} style={styles.botAvatar}>
            <Text style={styles.botAvatarText}>P</Text>
          </LinearGradient>
        )}
        <View style={{ maxWidth: "78%", alignItems: isUser ? "flex-end" : "flex-start" }}>
          <View style={[
            styles.bubble,
            isUser
              ? [styles.bubbleUser, { backgroundColor: colors.primary }]
              : [styles.bubbleBot, { backgroundColor: colors.card, borderColor: colors.border }],
          ]}>
            {item.loading ? (
              <TypingDots />
            ) : isUser ? (
              <Text style={{ color: "#fff", fontSize: 14, lineHeight: 20 }}>{item.content}</Text>
            ) : (
              <RichText text={item.content} color={colors.foreground} />
            )}
          </View>
          {item.ts && !item.loading && (
            <Text style={[styles.ts, { color: colors.mutedForeground }]}>{formatTime(item.ts)}</Text>
          )}
        </View>
        {isUser && (
          <View style={[styles.userAvatar, { backgroundColor: colors.primary + "30" }]}>
            <Text style={[styles.userAvatarText, { color: colors.primary }]}>{name.charAt(0)}</Text>
          </View>
        )}
      </View>
    );
  };

  const quickReplies = role === "admin"
    ? ["How many students are below 75%?", "Which class has lowest attendance?", "Tips for improving attendance", "School attendance summary"]
    : ["Who is absent most this month?", "Students below 75% in my class?", "How to notify parents?", "Tips for irregular students"];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={["#4e73df", "#1a3aaa"]} style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <LinearGradient colors={["#4e73df", "#1cc88a"]} style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>P</Text>
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>PAVAN</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.headerSub}>AI Attendance Assistant</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
          <Feather name="refresh-cw" size={17} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMsg}
          inverted
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            messages.length <= 1 ? (
              <View style={styles.quickRepliesBox}>
                <Text style={[styles.quickLabel, { color: colors.mutedForeground }]}>Suggested questions:</Text>
                <View style={styles.quickRow}>
                  {quickReplies.map(q => (
                    <TouchableOpacity key={q} onPress={() => setInput(q)}
                      style={[styles.quickChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Feather name="zap" size={11} color={colors.primary} />
                      <Text style={[styles.quickChipText, { color: colors.primary }]}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
        />

        <View style={[styles.inputArea, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomPad + 8 }]}>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Ask PAVAN anything about attendance…"
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit
          />
          <TouchableOpacity onPress={sendMessage} disabled={!input.trim() || sending}
            style={[styles.sendBtn, { opacity: !input.trim() || sending ? 0.4 : 1 }]}>
            {sending
              ? <ActivityIndicator size="small" color={colors.primary} style={{ width: 42, height: 42 }} />
              : <LinearGradient colors={["#4e73df", "#1cc88a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendBtnGrad}>
                  <Feather name="send" size={18} color="#fff" />
                </LinearGradient>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerAvatarText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#1cc88a" },
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 11 },
  clearBtn: { padding: 8 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12, gap: 8 },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowBot: { justifyContent: "flex-start" },
  botAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 18 },
  botAvatarText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  userAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 18 },
  userAvatarText: { fontSize: 13, fontWeight: "700" },
  bubble: { borderRadius: 18, padding: 12 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleBot: { borderBottomLeftRadius: 4, borderWidth: 1 },
  ts: { fontSize: 10, marginTop: 3, marginHorizontal: 4 },
  quickRepliesBox: { marginBottom: 16 },
  quickLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" },
  quickRow: { gap: 8 },
  quickChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1 },
  quickChipText: { fontSize: 13, fontWeight: "600", flex: 1 },
  inputArea: { flexDirection: "row", alignItems: "flex-end", padding: 12, gap: 10, borderTopWidth: 1 },
  textInput: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { flexShrink: 0 },
  sendBtnGrad: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
});
