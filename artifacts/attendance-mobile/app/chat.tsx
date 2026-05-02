import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { fetch } from "expo/fetch";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

const GREETING_DELAY = 600;

export default function ChatScreen() {
  const { currentUser, school } = useApp();
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
  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "http://localhost:80";

  // Welcome message on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Hi ${name}! 👋 I'm **PAVAN**, your school attendance assistant for ${school.nameLine1} ${school.nameLine2}.\n\nI can help you with attendance reports, student statistics, tips for irregular students, and anything about the AY ${school.academicYear} system. How can I help you today?`,
        },
      ]);
    }, GREETING_DELAY);
    return () => clearTimeout(timer);
  }, []);

  const scrollToTop = () => {
    setTimeout(() => flatRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const loadingId = (Date.now() + 1).toString();
    const loadingMsg: Message = { id: loadingId, role: "assistant", content: "", loading: true };

    setMessages(prev => [loadingMsg, userMsg, ...prev]);
    setSending(true);
    scrollToTop();

    // Build history for context (exclude loading/welcome for clean history)
    const history: { role: "user" | "assistant"; content: string }[] = [];
    setMessages(prev => {
      const real = prev.filter(m => !m.loading && m.id !== "welcome" && m.id !== loadingId && m.id !== userMsg.id);
      real.slice(0, 10).forEach(m => history.unshift({ role: m.role, content: m.content }));
      return prev;
    });

    history.push({ role: "user", content: text });

    try {
      const response = await fetch(`${apiBase}/api/pavan/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, userName: name }),
      });

      let accumulated = "";

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                accumulated += data.content;
                setMessages(prev =>
                  prev.map(m => m.id === loadingId ? { ...m, content: accumulated, loading: false } : m)
                );
              }
              if (data.error) {
                setMessages(prev =>
                  prev.map(m => m.id === loadingId ? { ...m, content: data.error, loading: false } : m)
                );
              }
            } catch (_) {}
          }
        }
      }

      if (!accumulated) {
        setMessages(prev =>
          prev.map(m => m.id === loadingId ? { ...m, content: "Sorry, I couldn't respond. Please try again.", loading: false } : m)
        );
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      setMessages(prev =>
        prev.map(m => m.id === loadingId ? { ...m, content: "Connection error. Please check your network and try again.", loading: false } : m)
      );
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
        <View style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: colors.primary }]
            : [styles.bubbleBot, { backgroundColor: colors.card, borderColor: colors.border }]
        ]}>
          {item.loading ? (
            <View style={styles.typingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.typingText, { color: colors.mutedForeground }]}>PAVAN is typing…</Text>
            </View>
          ) : (
            <Text style={[styles.msgText, { color: isUser ? "#fff" : colors.foreground }]}>
              {item.content.replace(/\*\*/g, "")}
            </Text>
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

  const quickReplies = [
    "How is attendance calculated?",
    "Students below 75% this month?",
    "Tips for irregular students",
    "Explain the report",
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
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
            <Text style={styles.headerSub}>AI Attendance Assistant</Text>
          </View>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        {/* Messages (inverted FlatList) */}
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
                <Text style={[styles.quickLabel, { color: colors.mutedForeground }]}>Try asking:</Text>
                <View style={styles.quickRow}>
                  {quickReplies.map(q => (
                    <TouchableOpacity key={q} onPress={() => { setInput(q); }}
                      style={[styles.quickChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.quickChipText, { color: colors.primary }]}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
        />

        {/* Input area */}
        <View style={[styles.inputArea, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomPad + 8 }]}>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Ask PAVAN anything…"
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!input.trim() || sending}
            style={[styles.sendBtn, { opacity: !input.trim() || sending ? 0.4 : 1 }]}
          >
            <LinearGradient colors={["#4e73df", "#1cc88a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendBtnGrad}>
              <Feather name="send" size={18} color="#fff" />
            </LinearGradient>
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
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 11 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12, gap: 8 },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowBot: { justifyContent: "flex-start" },
  botAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  botAvatarText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  userAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  userAvatarText: { fontSize: 13, fontWeight: "700" },
  bubble: { maxWidth: "78%", borderRadius: 18, padding: 12 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleBot: { borderBottomLeftRadius: 4, borderWidth: 1 },
  msgText: { fontSize: 14, lineHeight: 20 },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  typingText: { fontSize: 12 },
  quickRepliesBox: { marginBottom: 16 },
  quickLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" },
  quickRow: { gap: 8 },
  quickChip: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1 },
  quickChipText: { fontSize: 13, fontWeight: "600" },
  inputArea: { flexDirection: "row", alignItems: "flex-end", padding: 12, gap: 10, borderTopWidth: 1 },
  textInput: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { flexShrink: 0 },
  sendBtnGrad: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
});
