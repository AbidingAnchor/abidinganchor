import { useEffect, useRef } from "react";

export default function SunsetBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let width;
    let height;
    let motes = [];
    let stars = [];
    let animationFrameId;

    const MOTE_COUNT = 45;
    const STAR_COUNT = 55;

    const createScene = () => {
      motes = Array.from({ length: MOTE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2 + 0.8,
        opacity: Math.random() * 0.28 + 0.08,
        vx: Math.random() * 0.12 + 0.015,
        vy: -(Math.random() * 0.05 + 0.01),
        twinkle: Math.random() * 0.01 + 0.002,
        dir: Math.random() > 0.5 ? 1 : -1,
      }));

      stars = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * (height * 0.7),
        r: Math.random() * 1.2 + 0.25,
        opacity: Math.random() * 0.28 + 0.03,
        twinkle: Math.random() * 0.012 + 0.002,
        dir: Math.random() > 0.5 ? 1 : -1,
      }));
    };

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      createScene();
    };

    const drawMote = (p) => {
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 7);
      gradient.addColorStop(0, `rgba(255, 230, 180, ${p.opacity})`);
      gradient.addColorStop(0.4, `rgba(255, 210, 150, ${p.opacity * 0.45})`);
      gradient.addColorStop(1, "rgba(255, 210, 150, 0)");

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(p.x, p.y, p.r * 7, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawStar = (s) => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,245,${s.opacity})`;
      ctx.fill();

      if (s.r > 0.9) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,245,220,${s.opacity * 0.18})`;
        ctx.arc(s.x, s.y, s.r * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const update = () => {
      motes.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.opacity += p.twinkle * p.dir;
        if (p.opacity > 0.34 || p.opacity < 0.06) p.dir *= -1;
        if (p.x > width + 40) p.x = -40;
        if (p.y < -40) {
          p.y = height + 40;
          p.x = Math.random() * width;
        }
      });

      stars.forEach((s) => {
        s.opacity += s.twinkle * s.dir;
        if (s.opacity > 0.34 || s.opacity < 0.02) s.dir *= -1;
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      update();
      stars.forEach(drawStar);
      motes.forEach(drawMote);
      animationFrameId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden sunset-bg">
      <div className="absolute inset-0 sunset-sky-gradient" />
      <div className="sunset-sun-glow" />
      <div className="sunset-upper-haze" />
      <div className="sunset-rays" />
      <div className="sunset-cloud-layer sunset-cloud-layer-1">
        <span className="sunset-cloud sunset-cloud-1" />
        <span className="sunset-cloud sunset-cloud-2" />
        <span className="sunset-cloud sunset-cloud-3" />
      </div>
      <div className="sunset-cloud-layer sunset-cloud-layer-2">
        <span className="sunset-cloud sunset-cloud-4" />
        <span className="sunset-cloud sunset-cloud-5" />
        <span className="sunset-cloud sunset-cloud-6" />
      </div>
      <div className="sunset-atmosphere-haze" />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
    </div>
  );
}
