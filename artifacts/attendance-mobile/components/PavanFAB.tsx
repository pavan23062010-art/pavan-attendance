import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

export default function PavanFAB() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 84 : 60;
  const bottom = bottomPad + insets.bottom + 12;

  // Pulse scale animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Glow opacity animation
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  // Speech bubble fade/slide animation
  const bubbleFade = useRef(new Animated.Value(0)).current;
  const bubbleSlide = useRef(new Animated.Value(12)).current;
  const [bubbleVisible, setBubbleVisible] = useState(true);

  useEffect(() => {
    // Continuous pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    // Bubble appear then auto-hide after 4s
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
});
