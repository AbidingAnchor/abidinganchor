import { useEffect, useMemo, useState } from "react";
import DayBackground from "./DayBackground";
import SunsetBackground from "./SunsetBackground";
import CelestialBackground from "./CelestialBackground";

const FADE_DURATION_MS = 800;

function getBackgroundType(date = new Date()) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const dayStart = 6 * 60;
  const sunsetStart = 18 * 60;
  const nightStart = 20 * 60;

  if (totalMinutes >= dayStart && totalMinutes < sunsetStart) return "day";
  if (totalMinutes >= sunsetStart && totalMinutes < nightStart) return "sunset";
  return "celestial";
}

function BackgroundLayer({ type, isVisible }) {
  const component = useMemo(() => {
    switch (type) {
      case "day": return <DayBackground />;
      case "sunset": return <SunsetBackground />;
      case "celestial":
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
  const [currentBg, setCurrentBg] = useState(() => getBackgroundType());
  const [previousBg, setPreviousBg] = useState(null);

  useEffect(() => {
    let fadeTimeout;

    const updateBackground = () => {
      setCurrentBg((prevBg) => {
        const nextBg = getBackgroundType();
        if (prevBg !== nextBg) {
          setPreviousBg(prevBg);
          clearTimeout(fadeTimeout);
          fadeTimeout = setTimeout(() => {
            setPreviousBg(null);
          }, FADE_DURATION_MS);
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

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-50 pointer-events-none overflow-hidden">
      {previousBg && <BackgroundLayer type={previousBg} isVisible={false} />}
      <BackgroundLayer type={currentBg} isVisible />
    </div>
  );
}
