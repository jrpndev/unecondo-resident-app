import React, { useEffect } from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Package2 } from "lucide-react-native";

const { width, height } = Dimensions.get("window");

interface Props {
  onFinish?: () => void;
}

export function SplashScreen({ onFinish }: Props) {
  const iconScale   = useSharedValue(0.3);
  const iconOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textY       = useSharedValue(20);
  const subOpacity  = useSharedValue(0);
  const tagOpacity  = useSharedValue(0);
  const ringScale   = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0.4);

  useEffect(() => {
    // Icon spring entrance
    iconScale.value   = withSpring(1, { damping: 10, stiffness: 120 });
    iconOpacity.value = withTiming(1, { duration: 350 });

    // Pulsing ring behind icon
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0,  { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0,   { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Title slides up & fades in
    textOpacity.value = withDelay(280, withTiming(1, { duration: 450 }));
    textY.value       = withDelay(280, withSpring(0, { damping: 14, stiffness: 100 }));

    // Subtitle
    subOpacity.value = withDelay(500, withTiming(1, { duration: 450 }));

    // Bottom tagline
    tagOpacity.value = withDelay(700, withTiming(1, { duration: 450 }));

    if (onFinish) {
      const timer = setTimeout(onFinish, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity:   iconOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity:   ringOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity:   textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));

  const subStyle = useAnimatedStyle(() => ({
    opacity: subOpacity.value,
  }));

  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagOpacity.value,
  }));

  return (
    <LinearGradient
      colors={["#fb923c", "#f97316", "#ea580c"]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.container}
    >
      {/* Decorative background circles */}
      <View style={[styles.circle, { width: 380, height: 380, borderRadius: 190, top: -80, right: -100 }]} />
      <View style={[styles.circle, { width: 260, height: 260, borderRadius: 130, bottom: height * 0.1, left: -80 }]} />
      <View style={[styles.circle, { width: 140, height: 140, borderRadius: 70, top: height * 0.35, right: -30 }]} />

      {/* Center content */}
      <View style={styles.content}>
        {/* Pulsing ring */}
        <Animated.View style={[styles.ring, ringStyle]} />

        {/* Icon container */}
        <Animated.View style={[styles.iconWrapper, iconStyle]}>
          <Package2 size={54} color="white" strokeWidth={1.75} />
        </Animated.View>

        {/* App name */}
        <Animated.Text style={[styles.title, textStyle]}>
          Unecondo
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, subStyle]}>
          Gestão Inteligente de Encomendas
        </Animated.Text>
      </View>

      {/* Bottom tag */}
      <Animated.View style={[styles.bottom, tagStyle]}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Para porteiros</Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const ICON_SIZE = 110;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  content: {
    alignItems: "center",
  },
  ring: {
    position: "absolute",
    width: ICON_SIZE + 40,
    height: ICON_SIZE + 40,
    borderRadius: (ICON_SIZE + 40) / 2,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  iconWrapper: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  title: {
    color: "white",
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 10,
  },
  subtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  bottom: {
    position: "absolute",
    bottom: 52,
  },
  pill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  pillText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
