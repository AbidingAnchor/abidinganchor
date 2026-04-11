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

    const createParticles = () => {
      particles = Array.from({ length: 120 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.2 + 0.2,
        opacity: Math.random() * 0.25 + 0.05,
        vx: (Math.random() - 0.5) * 0.08,
        vy: -(Math.random() * 0.15 + 0.02),
        twinkle: Math.random() * 0.008 + 0.001,
        twinkleDirection: Math.random() > 0.5 ? 1 : -1,
        type: Math.random() > 0.85 ? 'cross' : 'dot',
      }));
    };

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      createParticles();
    };

    const drawParticle = (p) => {
      ctx.save();
      ctx.globalAlpha = p.opacity;

      if (p.type === 'cross') {
        const size = p.r * 4;
        ctx.strokeStyle = `rgba(255, 220, 100, ${p.opacity})`;
        ctx.lineWidth = 0.5;
        
        ctx.beginPath();
        ctx.moveTo(p.x - size, p.y);
        ctx.lineTo(p.x + size, p.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - size);
        ctx.lineTo(p.x, p.y + size);
        ctx.stroke();
        
        const diag = size * 0.5;
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(p.x - diag, p.y - diag);
        ctx.lineTo(p.x + diag, p.y + diag);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x + diag, p.y - diag);
        ctx.lineTo(p.x - diag, p.y + diag);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 245, 200, ${p.opacity * 1.5})`;
        ctx.fill();

      } else {
        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, p.r * 3
        );
        gradient.addColorStop(0, `rgba(255, 235, 150, ${p.opacity})`);
        gradient.addColorStop(0.5, `rgba(255, 220, 100, ${p.opacity * 0.4})`);
        gradient.addColorStop(1, 'rgba(255, 220, 100, 0)');

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const updateParticles = () => {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.opacity += p.twinkle * p.twinkleDirection;
        if (p.opacity > 0.28 || p.opacity < 0.04) {
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
