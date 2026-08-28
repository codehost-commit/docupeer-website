"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

const COLORS = ["#ffd166", "#ff7b54", "#f8f5ec", "#71c9ff", "#89f0c2", "#e99cff"];

export function LaunchCelebration({ active, onComplete }: { active: boolean; onComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = window.setTimeout(() => onCompleteRef.current?.(), 1400);
      return () => window.clearTimeout(timer);
    }

    const canvas = canvasRef.current;
    const maybeContext = canvas.getContext("2d");
    if (!maybeContext) return;
    const context = maybeContext;
    let frame = 0;
    let animation = 0;
    let stopped = false;
    const particles: Particle[] = [];
    const start = performance.now();

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * ratio);
      canvas.height = Math.round(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function burst(x: number, y: number, count: number) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count + Math.random() * 0.18;
        const speed = 2.5 + Math.random() * 7;
        const maxLife = 54 + Math.random() * 46;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: maxLife,
          maxLife,
          color: Math.random() > 0.22 ? color : "#ffffff",
          size: 1.2 + Math.random() * 2.4,
        });
      }
    }

    function render(now: number) {
      if (stopped) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const elapsed = now - start;
      context.clearRect(0, 0, width, height);

      if (elapsed < 5400 && frame % 22 === 0) {
        burst(width * (0.12 + Math.random() * 0.76), height * (0.1 + Math.random() * 0.48), 46 + Math.floor(Math.random() * 34));
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.life -= 1;
        particle.vy += 0.045;
        particle.vx *= 0.992;
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.life <= 0) {
          particles.splice(index, 1);
          continue;
        }
        const alpha = Math.min(1, particle.life / Math.min(22, particle.maxLife));
        context.globalAlpha = alpha;
        context.fillStyle = particle.color;
        context.shadowBlur = 12;
        context.shadowColor = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      context.shadowBlur = 0;
      frame += 1;

      if (elapsed < 7200 || particles.length) animation = requestAnimationFrame(render);
      else onCompleteRef.current?.();
    }

    resize();
    burst(window.innerWidth / 2, window.innerHeight * 0.42, 100);
    window.addEventListener("resize", resize);
    animation = requestAnimationFrame(render);
    return () => {
      stopped = true;
      cancelAnimationFrame(animation);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
      <div className="launch-flash absolute inset-0 bg-white" />
      <div className="launch-reveal absolute left-1/2 top-1/2 w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2 text-center text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.65)]">
        <div className="text-[11px] font-bold uppercase tracking-[0.55em] text-[#ffd166] sm:text-sm">The future of peer review starts now</div>
        <div className="display mt-5 text-6xl sm:text-8xl">We are live.</div>
      </div>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
