import { useEffect, useRef } from "react";

/**
 * Procedural daytime sky canvas (6 AM–6 PM). Card chrome for `data-theme="sunset"` and
 * `data-theme="night"` lives in `index.css` / `theme-overrides.css`, not here.
 */

const SKY_TOP = "#6BB8E8";
const SKY_MID = "#A8D4F0";
const SKY_BOTTOM = "#F5E6C8";

function drawSkyGradient(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, SKY_TOP);
  g.addColorStop(0.48, SKY_MID);
  g.addColorStop(1, SKY_BOTTOM);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Conic god-rays: bright wedges radiating from the sun (angle 0 = right; -π/2 = up). */
function drawGodRays(ctx, w, h, sunX, sunY) {
  ctx.save();
  ctx.globalAlpha = 0.14;
  const g = ctx.createConicGradient(-Math.PI / 2, sunX, sunY);
  const stops = [
    [0, "rgba(255,255,255,0.33)"],
    [0.04, "rgba(255,255,255,0.03)"],
    [0.08, "rgba(255,248,220,0.27)"],
    [0.12, "rgba(255,255,255,0.03)"],
    [0.17, "rgba(255,255,255,0.24)"],
    [0.21, "rgba(255,255,255,0.0225)"],
    [0.26, "rgba(255,245,200,0.21)"],
    [0.31, "rgba(255,255,255,0.03)"],
    [0.36, "rgba(255,255,255,0.225)"],
    [0.41, "rgba(255,255,255,0.015)"],
    [0.46, "rgba(255,248,230,0.18)"],
    [0.51, "rgba(255,255,255,0.03)"],
    [0.56, "rgba(255,255,255,0.21)"],
    [0.61, "rgba(255,255,255,0.0225)"],
    [0.66, "rgba(255,250,215,0.195)"],
    [0.71, "rgba(255,255,255,0.03)"],
    [0.76, "rgba(255,255,255,0.165)"],
    [0.81, "rgba(255,255,255,0.015)"],
    [0.86, "rgba(255,248,220,0.225)"],
    [0.91, "rgba(255,255,255,0.03)"],
    [1, "rgba(255,255,255,0.3)"],
  ];
  for (const [t, c] of stops) g.addColorStop(t, c);

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawSun(ctx, sunX, sunY, t) {
  const pulse = 1 + Math.sin(t * 0.00035) * 0.03;

  ctx.save();
  ctx.filter = "blur(10px)";
  const outer = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 420 * pulse);
  outer.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  outer.addColorStop(0.08, "rgba(255, 252, 235, 0.75)");
  outer.addColorStop(0.22, "rgba(255, 230, 160, 0.45)");
  outer.addColorStop(0.45, "rgba(255, 210, 120, 0.15)");
  outer.addColorStop(0.7, "rgba(255, 220, 150, 0)");
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 420 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.filter = "blur(4px)";
  const corona = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 120 * pulse);
  corona.addColorStop(0, "rgba(255, 255, 255, 1)");
  corona.addColorStop(0.25, "rgba(255, 250, 230, 0.95)");
  corona.addColorStop(0.55, "rgba(255, 215, 130, 0.55)");
  corona.addColorStop(0.85, "rgba(255, 200, 100, 0.12)");
  corona.addColorStop(1, "rgba(255, 200, 100, 0)");
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 120 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const core = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 28 * pulse);
  core.addColorStop(0, "rgba(255, 255, 255, 1)");
  core.addColorStop(0.7, "rgba(255, 255, 255, 0.98)");
  core.addColorStop(1, "rgba(255, 248, 220, 0.35)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 28 * pulse, 0, Math.PI * 2);
  ctx.fill();
}

/** Single closed fluffy cloud from overlapping arcs (blob). */
function cloudPath(ctx, cx, cy, scale) {
  const s = scale;
  ctx.beginPath();
  ctx.arc(cx - 52 * s, cy + 4 * s, 28 * s, 0, Math.PI * 2);
  ctx.arc(cx - 22 * s, cy - 18 * s, 34 * s, 0, Math.PI * 2);
  ctx.arc(cx + 18 * s, cy - 22 * s, 40 * s, 0, Math.PI * 2);
  ctx.arc(cx + 58 * s, cy - 10 * s, 36 * s, 0, Math.PI * 2);
  ctx.arc(cx + 78 * s, cy + 12 * s, 30 * s, 0, Math.PI * 2);
  ctx.arc(cx + 42 * s, cy + 22 * s, 32 * s, 0, Math.PI * 2);
  ctx.arc(cx - 2 * s, cy + 24 * s, 30 * s, 0, Math.PI * 2);
  ctx.arc(cx - 38 * s, cy + 14 * s, 26 * s, 0, Math.PI * 2);
}

function drawCloud(ctx, cx, cy, scale, blurPx, shadowOff) {
  cloudPath(ctx, cx, cy, scale);
  ctx.fillStyle = "rgba(255, 190, 198, 0.38)";
  ctx.save();
  ctx.translate(0, shadowOff);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.filter = `blur(${blurPx}px)`;
  cloudPath(ctx, cx, cy, scale);
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fill();
  ctx.restore();
}

function drawGroundHaze(ctx, w, h) {
  const y0 = h * 0.85;
  const g = ctx.createLinearGradient(0, y0, 0, h);
  g.addColorStop(0, "rgba(255, 220, 170, 0)");
  g.addColorStop(0.35, "rgba(255, 210, 150, 0.09)");
  g.addColorStop(0.7, "rgba(245, 190, 120, 0.16)");
  g.addColorStop(1, "rgba(235, 175, 95, 0.21)");
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, w, h - y0);
}

function drawStar4(ctx, x, y, arm, rot, alpha, warm) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  const stroke = warm
    ? `rgba(255, 235, 190, ${Math.min(1, alpha + 0.15)})`
    : `rgba(255, 255, 255, ${Math.min(1, alpha + 0.1)})`;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 0.65;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -arm);
  ctx.lineTo(0, arm);
  ctx.moveTo(-arm, 0);
  ctx.lineTo(arm, 0);
  ctx.stroke();
  ctx.restore();
}

export default function DayBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let animationFrameId = 0;
    let start = performance.now();

    const cloudCount = 8 + Math.floor(Math.random() * 5);
    let clouds = [];
    let sparkles = [];

    const layout = () => {
      clouds = [];
      for (let i = 0; i < cloudCount; i++) {
        const nx = 0.05 + Math.random() * 0.9;
        const ny = 0.12 + Math.random() * 0.48;
        const scale = 0.55 + Math.random() * 0.75;
        const blurPx = 5 + Math.random() * 7;
        const driftAmp = 18 + Math.random() * 22;
        const driftSpeed = 0.00012 + Math.random() * 0.0001;
        const phase = Math.random() * Math.PI * 2;
        clouds.push({ nx, ny, scale, blurPx, driftAmp, driftSpeed, phase });
      }

      sparkles = Array.from({ length: 80 }, () => ({
        nx: Math.random(),
        ny: Math.random() * 0.82,
        arm: 1.4 + Math.random() * 2.2,
        rot: Math.random() * Math.PI * 2,
        warm: Math.random() > 0.55,
        tw: Math.random() * Math.PI * 2,
        twSpeed: 0.0012 + Math.random() * 0.002,
      }));
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout();
    };

    const draw = (now) => {
      const t = now - start;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      drawSkyGradient(ctx, width, height);

      const sunX = width * 0.5;
      const sunY = height * 0.15;

      drawGodRays(ctx, width, height, sunX, sunY);
      drawSun(ctx, sunX, sunY, t);

      for (const c of clouds) {
        const drift = Math.sin(t * c.driftSpeed + c.phase) * c.driftAmp;
        const cx = c.nx * width + drift;
        const cy = c.ny * height;
        drawCloud(ctx, cx, cy, c.scale, c.blurPx, 5);
      }

      for (const s of sparkles) {
        const x = s.nx * width;
        const y = s.ny * height;
        const twinkle =
          0.22 + Math.sin(t * s.twSpeed + s.tw) * 0.18 + Math.sin(t * s.twSpeed * 1.7) * 0.06;
        drawStar4(ctx, x, y, s.arm, s.rot, twinkle, s.warm);
      }

      drawGroundHaze(ctx, width, height);

      animationFrameId = requestAnimationFrame(draw);
    };

    resize();
    animationFrameId = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
