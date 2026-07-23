'use client';

import { useEffect, useRef } from 'react';

interface ParticleState {
  type: 'bubble' | 'line';
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  hex: string;
  strokeWidth: number;
  diameter?: number;
  angle?: number;
  length?: number;
  rotateSpeed?: number;
  rotateClockwise?: boolean;
}

const COLORS = ['#8f88a8', '#5c5570', '#5c5570', '#5c5570', '#5c5570', '#5c5570'];
const MAX_PARTICLES = 45;

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createParticle(width: number, height: number): ParticleState {
  const type: 'bubble' | 'line' = Math.random() < 0.8 ? 'bubble' : 'line';
  const x = Math.random() * width;
  const y = Math.random() * height;
  const base: ParticleState = {
    type,
    x,
    y,
    vx: (Math.random() < 0.5 ? -1 : 1) * Math.random() * 0.5,
    vy: (Math.random() < 0.5 ? -1 : 1) * Math.random() * 0.5,
    alpha: 0,
    hex: randomFrom(COLORS),
    strokeWidth: Math.random() * (Math.random() > 0.5 ? 1.2 : 2),
  };
  if (type === 'bubble') {
    base.diameter = 2 + Math.random() * 7;
  } else {
    base.angle = Math.atan2(y, x);
    base.length = randomFrom([5, 7, 3, 10]);
    base.rotateSpeed = randomFrom([10, 30, 60, 120]);
    base.rotateClockwise = Math.random() < 0.5;
  }
  return base;
}

/** Sfondo animato a particelle (bolle + linee rotanti) per header di card/modali. */
export default function ParticleCanvasHeader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let particles: ParticleState[] = [];
    let frameId = 0;
    let width = 0;
    let height = 0;

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      width = parent.offsetWidth;
      height = parent.offsetHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function generate() {
      while (particles.length < MAX_PARTICLES) {
        particles.push(createParticle(width, height));
      }
    }

    function update() {
      particles.forEach((p) => {
        if (p.alpha < 1) p.alpha += 0.01;
        p.x += p.vx;
        p.y += p.vy;
        if (p.type === 'line') {
          const step = Math.PI / (p.rotateSpeed ?? 60);
          p.angle = (p.angle ?? 0) + (p.rotateClockwise ? -step : step);
        }
      });
      particles = particles.filter((p) => p.x > -10 && p.x < width + 10 && p.y > -10 && p.y < height + 10);

      ctx!.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        ctx!.lineWidth = p.strokeWidth;
        ctx!.strokeStyle = hexToRgba(p.hex, p.alpha);
        ctx!.save();
        if (p.type === 'line') {
          ctx!.translate(p.x, p.y);
          ctx!.rotate(p.angle ?? 0);
          ctx!.beginPath();
          ctx!.moveTo(-(p.length ?? 5) / 2, 0);
          ctx!.lineTo((p.length ?? 5) / 2, 0);
        } else {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.diameter ?? 3, 0, Math.PI * 2);
        }
        ctx!.stroke();
        ctx!.restore();
      });

      generate();
      frameId = requestAnimationFrame(update);
    }

    resize();
    generate();
    update();

    const handleResize = () => resize();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />;
}
