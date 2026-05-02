import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Path, Polygon, Rect, RadialGradient, Stop } from "react-native-svg";

import { useApp } from "@/context/AppContext";

function SchoolLogoSvg({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <RadialGradient id="bg" cx="40%" cy="35%" r="70%">
          <Stop offset="0%" stopColor="#3a5fd9" />
          <Stop offset="100%" stopColor="#1a3aaa" />
        </RadialGradient>
      </Defs>
      <Circle cx="60" cy="60" r="58" fill="url(#bg)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      <Rect x="18" y="82" width="84" height="6" rx="3" fill="#f6c23e" />
      <Rect x="25" y="88" width="6" height="18" rx="2" fill="#e0a800" />
      <Rect x="89" y="88" width="6" height="18" rx="2" fill="#e0a800" />
      <Rect x="34" y="50" width="52" height="34" rx="4" fill="#0d1b3e" stroke="#4e73df" strokeWidth="1.5" />
      <Rect x="40" y="56" width="12" height="10" rx="1" fill="#4e73df" opacity="0.7" />
      <Rect x="54" y="56" width="12" height="10" rx="1" fill="#4e73df" opacity="0.7" />
      <Rect x="68" y="56" width="12" height="10" rx="1" fill="#4e73df" opacity="0.7" />
      <Rect x="47" y="68" width="26" height="16" rx="2" fill="#1cc88a" opacity="0.9" />
      <Path d="M60 10 L75 30 L45 30 Z" fill="#f6c23e" />
      <Circle cx="60" cy="10" r="5" fill="#f6c23e" />
      <Polygon points="30,50 60,30 90,50" fill="#1a3680" stroke="#4e73df" strokeWidth="1" />
    </Svg>
  );
}

export default function LoginScreen() {
  const { login, currentUser, loaded } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (loaded && currentUser) {
      router.replace("/(tabs)");
    }
  }, [currentUser, loaded]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      const ok = login(username.trim(), password.trim());
      setLoading(false);
      if (ok) {
        router.replace("/(tabs)");
      } else {
        setError("Invalid username or password.");
      }
    }, 600);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <LinearGradient
      colors={["#0f0c29", "#302b63", "#24243e"]}
      style={[styles.container, { paddingTop: topPad }]}
    >
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.header}>
          <SchoolLogoSvg size={88} />
          <Text style={styles.schoolLine1}>PAVAN GROUP OF</Text>
          <Text style={styles.schoolLine2}>SCHOOLS</Text>
          <Text style={styles.schoolLocation}>Vinukonda · AY 2026–2027</Text>
          <View style={styles.divider} />
          <Text style={styles.subtitle}>Attendance Management System</Text>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.card}>
            <Text style={styles.signInTitle}>Sign In</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>USERNAME</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter username"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={username}
                  onChangeText={t => { setUsername(t); setError(""); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={t => { setPassword(t); setError(""); }}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                  <Text style={styles.eyeText}>{showPass ? "🙈" : "👁️"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient colors={["#4e73df", "#1cc88a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginBtnGrad}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.loginBtnText}>Sign In →</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.hint}>admin / admin123 &nbsp;|&nbsp; teacher1 / teach1</Text>
          </View>
        </KeyboardAvoidingView>

        <Text style={[styles.footer, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8 }]}>
          Made by <Text style={{ color: "rgba(255,255,255,0.5)", fontWeight: "600" }}>Pavan</Text>
        </Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 28 },
  schoolLine1: { color: "#ffffff", fontSize: 20, fontWeight: "800", letterSpacing: 1, marginTop: 14 },
  schoolLine2: { color: "#1cc88a", fontSize: 20, fontWeight: "800", letterSpacing: 2 },
  schoolLocation: { color: "rgba(255,255,255,0.5)", fontSize: 12, letterSpacing: 3, marginTop: 4, textTransform: "uppercase" },
  divider: { width: 40, height: 2, borderRadius: 1, marginVertical: 10, backgroundColor: "#4e73df" },
  subtitle: { color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: 1 },
  card: { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  signInTitle: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 20 },
  inputWrapper: { marginBottom: 16 },
  label: { color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "700", letterSpacing: 2, marginBottom: 6 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", paddingHorizontal: 14, paddingVertical: 12 },
  input: { flex: 1, color: "#fff", fontSize: 14 },
  eyeBtn: { paddingLeft: 8 },
  eyeText: { fontSize: 16 },
  errorBox: { backgroundColor: "rgba(231,74,59,0.15)", borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: "rgba(231,74,59,0.3)" },
  errorText: { color: "#ff6b6b", fontSize: 12 },
  loginBtn: { borderRadius: 16, overflow: "hidden", marginTop: 4 },
  loginBtnGrad: { paddingVertical: 15, alignItems: "center" },
  loginBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  hint: { color: "rgba(255,255,255,0.2)", fontSize: 10, textAlign: "center", marginTop: 14 },
  footer: { color: "rgba(255,255,255,0.2)", fontSize: 11, textAlign: "center", letterSpacing: 1, marginTop: 24 },
});
