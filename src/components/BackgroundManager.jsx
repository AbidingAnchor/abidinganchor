import { useEffect, useMemo, useRef, useState } from "react";
import DayBackground, { getBackgroundTypeForTime } from "./DayBackground";
import SunsetBackground from "./SunsetBackground";
import CelestialBackground from "./CelestialBackground";
import { StatusBar } from '@capacitor/status-bar';
import {
  THEME_PREFERENCE_CHANGED_EVENT,
  THEME_PREFERENCE_STORAGE_KEY,
  readThemePreferenceFromStorage,
} from "../utils/themePreferenceStorage";

const FADE_DURATION_MS = 800;
/** Solid base behind canvases — must never rely on “transparent” stacking (negative z-index can show OS/desktop). */
export const BACKGROUND_FALLBACK_NAVY = "#0a1a3e";

const BODY_SKY_CLASSES = [
  "theme-day",
  "theme-morning",
  "theme-afternoon",
  "theme-evening",
  "theme-sunset",
  "theme-night",
];

function logThemeMutation(source, payload) {
  try {
    const ts = new Date().toISOString();
    console.log(`[theme-debug] ${ts} ${source}`, payload);
  } catch {
    /* ignore */
  }
}

/** Syncs body.theme-* with sky period (parchment cards use morning/afternoon/day only). */
function syncBodySkyClasses(theme, reason = "unknown") {
  const body = document.body;
  const before = BODY_SKY_CLASSES.filter((c) => body.classList.contains(c));
  for (const c of BODY_SKY_CLASSES) body.classList.remove(c);

  if (theme === "day") {
    body.classList.add("theme-day");
    const h = new Date().getHours();
    body.classList.add(h < 12 ? "theme-morning" : "theme-afternoon");
  } else if (theme === "sunset") {
    body.classList.add("theme-sunset", "theme-evening");
  } else {
    body.classList.add("theme-night");
  }
  const after = BODY_SKY_CLASSES.filter((c) => body.classList.contains(c));
  logThemeMutation("BackgroundManager: body theme classes", { reason, theme, before, after });
}

/** Update Android system navigation bar color (theme-color meta tag and StatusBar) */
async function updateThemeColorMeta(theme) {
  let themeColor;
  if (theme === "day") {
    themeColor = "#F5E6C8"; // Day theme cream
  } else if (theme === "sunset") {
    themeColor = "#1a0533"; // Evening theme deep purple
  } else {
    themeColor = "#0a0a1a"; // Night theme dark navy
  }
  
  // Update meta tag for web browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", themeColor);
  }
  
  // Update Android navigation bar using Capacitor StatusBar
  try {
    await StatusBar.setStyle({ style: 'DARK' });
    await StatusBar.setBackgroundColor({ color: themeColor });
  } catch (error) {
    // StatusBar might not be available on web, ignore error
    console.debug('StatusBar update failed (expected on web):', error);
  }
}

function BackgroundLayer({ type, isVisible }) {
  const component = useMemo(() => {
    switch (type) {
      case "day": return <DayBackground />;
      case "sunset": return <SunsetBackground />;
      case "night":
      default: return <CelestialBackground />;
    }
  }, [type]);

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-[800ms] ease-in-out ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
    >
      {component}
    </div>
  );
}

export default function BackgroundManager() {
  const currentBgRef = useRef(null);
  
  // Early check: immediately apply saved manual theme preference on every render
  // This prevents time-based theme from overriding manual selection on remount
  useEffect(() => {
    const themePreference = readThemePreferenceFromStorage();
    if (themePreference === 'day' || themePreference === 'evening' || themePreference === 'night') {
      const savedTheme = themePreference === 'evening' ? 'sunset' : themePreference;
      document.documentElement.setAttribute('data-theme', savedTheme);
      syncBodySkyClasses(savedTheme, 'early-theme-check');
      updateThemeColorMeta(savedTheme);
      currentBgRef.current = savedTheme;
      setCurrentBg(savedTheme);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const [currentBg, setCurrentBg] = useState(() => {
    const themePreference = readThemePreferenceFromStorage();
    let initial;
    
    // Always check saved preference first - use it if set to day, evening, or night
    if (themePreference === 'day' || themePreference === 'evening' || themePreference === 'night') {
      // Use the saved preference directly (evening maps to sunset)
      initial = themePreference === 'evening' ? 'sunset' : themePreference;
    } else {
      // Only use time-based if preference is 'auto' or undefined
      initial = getBackgroundTypeForTime();
    }
    
    currentBgRef.current = initial;
    logThemeMutation("BackgroundManager: set data-theme", { reason: "initial-state", theme: initial, themePreference });
    document.documentElement.setAttribute("data-theme", initial);
    syncBodySkyClasses(initial, "initial-state");
    return initial;
  });
  const [previousBg, setPreviousBg] = useState(null);

  useEffect(() => {
    let fadeTimeout;

    const updateBackground = () => {
      const themePreference = readThemePreferenceFromStorage();
      console.log('theme-preference:', themePreference);
      console.log('applying theme:', themePreference === 'auto' || !themePreference ? 'time-based' : themePreference);
      // Skip automatic updates if manual theme preference is set
      if (themePreference && themePreference !== 'auto') return;

      const nextBg = getBackgroundTypeForTime();
      // Dedupe: skip DOM + state when period unchanged (avoids thrash from duplicate events / interval ticks).
      if (nextBg === currentBgRef.current) return;

      const prevBg = currentBgRef.current;
      currentBgRef.current = nextBg;
      syncBodySkyClasses(nextBg, "updateBackground");
      logThemeMutation("BackgroundManager: set data-theme", {
        reason: "state-transition",
        prevTheme: prevBg,
        nextTheme: nextBg,
      });
      document.documentElement.setAttribute("data-theme", nextBg);
      updateThemeColorMeta(nextBg);
      setPreviousBg(prevBg);
      setCurrentBg(nextBg);
      clearTimeout(fadeTimeout);
      fadeTimeout = setTimeout(() => setPreviousBg(null), FADE_DURATION_MS);
    };

    const applyThemePreference = () => {
      const themePreference = readThemePreferenceFromStorage();
      const nextBg = themePreference === 'auto' || !themePreference
        ? getBackgroundTypeForTime()
        : themePreference === 'evening' ? 'sunset' : themePreference;
      
      if (nextBg === currentBgRef.current) return;
      
      const prevBg = currentBgRef.current;
      currentBgRef.current = nextBg;
      syncBodySkyClasses(nextBg, 'themePreferenceChanged');
      document.documentElement.setAttribute('data-theme', nextBg);
      updateThemeColorMeta(nextBg);
      setPreviousBg(prevBg);
      setCurrentBg(nextBg);
      clearTimeout(fadeTimeout);
      fadeTimeout = setTimeout(() => setPreviousBg(null), FADE_DURATION_MS);
    };

    updateBackground();
    updateThemeColorMeta(currentBgRef.current);
    const interval = setInterval(updateBackground, 30 * 1000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const themePreference = readThemePreferenceFromStorage();
        // Only update background if preference is auto
        if (!themePreference || themePreference === 'auto') {
          updateBackground();
        }
      }
    };

    const onThemePreferenceChanged = () => applyThemePreference();
    const onStorage = (e) => {
      if (e.key === THEME_PREFERENCE_STORAGE_KEY || e.key === null) {
        const themePreference = readThemePreferenceFromStorage();
        // Only update background if preference is auto
        if (!themePreference || themePreference === 'auto') {
          updateBackground();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(THEME_PREFERENCE_CHANGED_EVENT, onThemePreferenceChanged);
    window.addEventListener("storage", onStorage);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(THEME_PREFERENCE_CHANGED_EVENT, onThemePreferenceChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden min-h-[100dvh] h-[100dvh] w-full"
      style={{ backgroundColor: BACKGROUND_FALLBACK_NAVY }}
    >
      {/* Always-on paint layer so canvas/WebGL never exposes transparency during mount or cross-fade */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: BACKGROUND_FALLBACK_NAVY, zIndex: 0 }}
        aria-hidden
      />
      {previousBg && <BackgroundLayer type={previousBg} isVisible={false} />}
      <BackgroundLayer type={currentBg} isVisible />
      {/* Lighten bottom scrim on day sky so canvas stays crisp (sunset/night keep depth) */}
      <div
        className={
          currentBg === "day"
            ? "absolute inset-0 bg-gradient-to-t from-black/[0.12] to-transparent"
            : "absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"
        }
        aria-hidden
      />
    </div>
  );
}
