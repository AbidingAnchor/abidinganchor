import { useEffect, useMemo, useState } from "react";
import DayBackground, { getBackgroundTypeForTime } from "./DayBackground";
import SunsetBackground from "./SunsetBackground";
import CelestialBackground from "./CelestialBackground";

const FADE_DURATION_MS = 800;

// TODO: REMOVE BEFORE LAUNCH — delegates to DayBackground (localStorage devForceTheme + DEV_FORCE_HOUR + clock)
function getBackgroundType(date = new Date()) {
  return getBackgroundTypeForTime(date);
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
    const initial = getBackgroundType();
    console.log('[BackgroundManager] Initial theme:', initial);
    document.documentElement.setAttribute("data-theme", initial);
    return initial;
  });
  const [previousBg, setPreviousBg] = useState(null);

  useEffect(() => {
    let fadeTimeout;

    const updateBackground = () => {
      const nextBg = getBackgroundType();
      console.log('[BackgroundManager] Setting theme:', nextBg);
      setCurrentBg((prevBg) => {
        if (prevBg !== nextBg) {
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

    // TODO: REMOVE BEFORE LAUNCH — Settings theme preview
    const handleDevThemeChanged = () => updateBackground();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("devForceThemeChanged", handleDevThemeChanged);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("devForceThemeChanged", handleDevThemeChanged);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-50 pointer-events-none overflow-hidden">
      {previousBg && <BackgroundLayer type={previousBg} isVisible={false} />}
      <BackgroundLayer type={currentBg} isVisible />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"
        aria-hidden
      />
    </div>
  );
}
