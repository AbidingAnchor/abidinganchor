import { useEffect, useMemo, useState } from "react";
import DayBackground, {
  getBackgroundTypeForTime,
  getEffectiveForcedHour,
} from "./DayBackground";
import SunsetBackground from "./SunsetBackground";
import CelestialBackground from "./CelestialBackground";
import {
  THEME_PREFERENCE_CHANGED_EVENT,
  THEME_PREFERENCE_STORAGE_KEY,
} from "../utils/themePreferenceStorage";

const FADE_DURATION_MS = 800;

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
    const forced = getEffectiveForcedHour();
    const h = Number.isFinite(forced) ? forced : new Date().getHours();
    body.classList.add(h < 12 ? "theme-morning" : "theme-afternoon");
  } else if (theme === "sunset") {
    body.classList.add("theme-sunset", "theme-evening");
  } else {
    body.classList.add("theme-night");
  }
  const after = BODY_SKY_CLASSES.filter((c) => body.classList.contains(c));
  logThemeMutation("BackgroundManager: body theme classes", { reason, theme, before, after });
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
  const [currentBg, setCurrentBg] = useState(() => {
    const initial = getBackgroundTypeForTime(new Date());
    logThemeMutation("BackgroundManager: set data-theme", { reason: "initial-state", theme: initial });
    document.documentElement.setAttribute("data-theme", initial);
    syncBodySkyClasses(initial, "initial-state");
    return initial;
  });
  const [previousBg, setPreviousBg] = useState(null);

  useEffect(() => {
    let fadeTimeout;

    const updateBackground = () => {
      const nextBg = getBackgroundTypeForTime(new Date());
      syncBodySkyClasses(nextBg, "updateBackground");
      setCurrentBg((prevBg) => {
        if (prevBg !== nextBg) {
          logThemeMutation("BackgroundManager: set data-theme", {
            reason: "state-transition",
            prevTheme: prevBg,
            nextTheme: nextBg,
          });
          document.documentElement.setAttribute("data-theme", nextBg);
          setPreviousBg(prevBg);
          clearTimeout(fadeTimeout);
          fadeTimeout = setTimeout(() => setPreviousBg(null), FADE_DURATION_MS);
          return nextBg;
        }
        return prevBg;
      });
    };

    updateBackground();
    const interval = setInterval(updateBackground, 30 * 1000);

    const handleVisibilityChange = () => {
      if (!document.hidden) updateBackground();
    };

    const onThemePreferenceChanged = () => updateBackground();
    const onStorage = (e) => {
      if (e.key === THEME_PREFERENCE_STORAGE_KEY || e.key === null) updateBackground();
    };

    // TODO: REMOVE BEFORE LAUNCH — Settings theme preview
    const handleDevThemeChanged = () => updateBackground();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("devForceThemeChanged", handleDevThemeChanged);
    window.addEventListener(THEME_PREFERENCE_CHANGED_EVENT, onThemePreferenceChanged);
    window.addEventListener("storage", onStorage);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("devForceThemeChanged", handleDevThemeChanged);
      window.removeEventListener(THEME_PREFERENCE_CHANGED_EVENT, onThemePreferenceChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 -z-50 pointer-events-none overflow-hidden min-h-[100dvh] h-[100dvh] w-full bg-[#0a1432]"
    >
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
