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

    const PARTICLE_COUNT = 55;

    const createParticles = () => {
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2.2 + 0.6,
        opacity: Math.random() * 0.35 + 0.08,
        vx: Math.random() * 0.18 + 0.03,
        vy: -(Math.random() * 0.08 + 0.01),
        twinkle: Math.random() * 0.02 + 0.002,
        twinkleDirection: Math.random() > 0.5 ? 1 : -1,
      }));
    };

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      createParticles();
    };

    const drawParticle = (p) => {
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
      gradient.addColorStop(0, `rgba(255, 247, 220, ${p.opacity})`);
      gradient.addColorStop(0.35, `rgba(255, 240, 200, ${p.opacity * 0.45})`);
      gradient.addColorStop(1, "rgba(255, 240, 200, 0)");

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
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
