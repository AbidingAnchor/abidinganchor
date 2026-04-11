import { useEffect, useRef } from "react";

export default function DayBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let width;
    let height;
    let particles = [];
    let animationFrameId;

    const PARTICLE_COUNT = 80;

    const createParticles = () => {
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2.8 + 0.8,
        opacity: Math.random() * 0.45 + 0.12,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(Math.random() * 0.25 + 0.05),
        twinkle: Math.random() * 0.018 + 0.003,
        twinkleDirection: Math.random() > 0.5 ? 1 : -1,
      }));
    };

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      createParticles();
    };

    const drawParticle = (p) => {
      // Outer soft glow
      const outerGlow = ctx.createRadialGradient(
        p.x, p.y, 0, p.x, p.y, p.r * 10
      );
      outerGlow.addColorStop(0, `rgba(255, 230, 120, ${p.opacity * 0.6})`);
      outerGlow.addColorStop(0.4, `rgba(255, 210, 80, ${p.opacity * 0.25})`);
      outerGlow.addColorStop(1, 'rgba(255, 210, 80, 0)');

      ctx.beginPath();
      ctx.fillStyle = outerGlow;
      ctx.arc(p.x, p.y, p.r * 10, 0, Math.PI * 2);
      ctx.fill();

      // Bright core
      const core = ctx.createRadialGradient(
        p.x, p.y, 0, p.x, p.y, p.r * 1.5
      );
      core.addColorStop(0, `rgba(255, 255, 220, ${p.opacity * 1.2})`);
      core.addColorStop(1, `rgba(255, 230, 150, 0)`);

      ctx.beginPath();
      ctx.fillStyle = core;
      ctx.arc(p.x, p.y, p.r * 1.5, 0, Math.PI * 2);
      ctx.fill();
    };

    const updateParticles = () => {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.opacity += p.twinkle * p.twinkleDirection;
        if (p.opacity > 0.42 || p.opacity < 0.06) {
          p.twinkleDirection *= -1;
        }
        if (p.x > width + 30) p.x = -30;
        if (p.y < -30) {
          p.y = height + 30;
          p.x = Math.random() * width;
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      updateParticles();
      particles.forEach(drawParticle);
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
    <div className="absolute inset-0 overflow-hidden day-bg">
      <div className="absolute inset-0 day-sky-gradient" />
      <div className="day-sun-glow" />
      <div className="day-god-rays" />
      <div className="cloud-layer cloud-layer-1">
        <span className="cloud cloud-1" />
        <span className="cloud cloud-2" />
        <span className="cloud cloud-3" />
      </div>
      <div className="cloud-layer cloud-layer-2">
        <span className="cloud cloud-4" />
        <span className="cloud cloud-5" />
        <span className="cloud cloud-6" />
      </div>
      <div className="day-atmosphere-haze" />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
    </div>
  );
}
