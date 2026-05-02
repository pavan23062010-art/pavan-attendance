import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ACADEMIC_MONTHS, useApp } from "@/context/AppContext";

const getInitialMonthIdx = (): number => {
  const now = new Date();
  const MNAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const target = `${now.getFullYear()}-${MNAMES[now.getMonth()]}`;
  const idx = ACADEMIC_MONTHS.indexOf(target);
  if (idx === -1) return now.getFullYear() < 2026 ? 0 : ACADEMIC_MONTHS.length - 1;
  return idx;
};

const TODAY_DAY = String(new Date().getDate());
const TODAY_MONTH = ACADEMIC_MONTHS[getInitialMonthIdx()];

export default function PavanFAB() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { students, records, currentUser } = useApp();
  const bottomPad = Platform.OS === "web" ? 84 : 60;
  const bottom = bottomPad + insets.bottom + 12;

  // Compute how many students are unmarked for today
  const unmarkedCount = useMemo(() => {
    if (!currentUser) return 0;
    const relevantStudents = currentUser.role === "admin"
      ? students
      : students.filter(s => s.class === currentUser.assignedClass && s.section === currentUser.assignedSection);

    return relevantStudents.filter(s => {
      const rec = records.find(r => r.class === s.class && r.section === s.section && r.month === TODAY_MONTH);
      return !rec || rec.daily[s.id]?.[TODAY_DAY] === undefined;
    }).length;
  }, [students, records, currentUser]);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const bubbleFade = useRef(new Animated.Value(0)).current;
  const bubbleSlide = useRef(new Animated.Value(12)).current;
  const [bubbleVisible, setBubbleVisible] = useState(true);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    Animated.parallel([
      Animated.timing(bubbleFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(bubbleSlide, { toValue: 0, duration: 400, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(bubbleFade, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(bubbleSlide, { toValue: 8, duration: 350, useNativeDriver: true }),
      ]).start(() => setBubbleVisible(false));
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const handlePress = () => {
    setBubbleVisible(false);
    router.push("/chat");
  };

  return (
    <View style={[styles.container, { bottom }]} pointerEvents="box-none">
      {/* Speech bubble */}
      {bubbleVisible && (
        <Animated.View
          style={[styles.bubble, { opacity: bubbleFade, transform: [{ translateY: bubbleSlide }] }]}
          pointerEvents="none"
        >
          <Text style={styles.bubbleText}>I am Pavan, how can I help you?</Text>
          <View style={styles.bubbleTail} />
        </Animated.View>
      )}

      {/* Glow ring */}
      <Animated.View style={[styles.glowRing, { opacity: glowAnim }]} />

      {/* FAB button */}
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <LinearGradient
            colors={["#4e73df", "#1cc88a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Text style={styles.fabLetter}>P</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>

      {/* Notification badge */}
      {unmarkedCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unmarkedCount > 99 ? "99+" : String(unmarkedCount)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    alignItems: "flex-start",
    zIndex: 999,
  },
  bubble: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    maxWidth: 210,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(78,115,223,0.35)",
  },
  bubbleText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  bubbleTail: {
    position: "absolute",
    bottom: -7,
    left: 18,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#1a1a2e",
  },
  glowRing: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#4e73df",
    top: -4,
    left: -4,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4e73df",
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 10,
  },
  fabLetter: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#e74a3b",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
});
