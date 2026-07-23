'use client';

import { useEffect, useRef } from 'react';

interface ParticleState {
  type: 'hexagon' | 'line';
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  strokeWidth: number;
  diameter?: number;
  angle?: number;
  length?: number;
  rotateSpeed?: number;
  rotateClockwise?: boolean;
}

const MAX_ALPHA = 0.75;
const MAX_PARTICLES = 40;

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createParticle(width: number, height: number): ParticleState {
  const type: 'hexagon' | 'line' = Math.random() < 0.8 ? 'hexagon' : 'line';
  const x = Math.random() * width;
  const y = Math.random() * height;
  const base: ParticleState = {
    type,
    x,
    y,
    vx: (Math.random() < 0.5 ? -1 : 1) * Math.random() * 0.15,
    vy: (Math.random() < 0.5 ? -1 : 1) * Math.random() * 0.15,
    alpha: 0,
    strokeWidth: Math.random() * (Math.random() > 0.5 ? 1.2 : 2),
  };
  if (type === 'hexagon') {
    const isLarge = Math.random() < 0.12;
    base.diameter = isLarge ? 35 + Math.random() * 65 : 3 + Math.random() * 7;
  } else {
    base.angle = Math.atan2(y, x);
    base.length = randomFrom([5, 7, 3, 10]);
    base.rotateSpeed = randomFrom([80, 140, 220, 320]);
    base.rotateClockwise = Math.random() < 0.5;
  }
  return base;
}

function drawRoundedHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  const sides = 6;
  const corner = radius * 0.35;
  const step = (Math.PI * 2) / sides;
  const points: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const angle = i * step - Math.PI / 2;
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  ctx.beginPath();
  const [firstX, firstY] = points[0];
  const [lastX, lastY] = points[sides - 1];
  ctx.moveTo((firstX + lastX) / 2, (firstY + lastY) / 2);
  for (let i = 0; i < sides; i++) {
    const [px, py] = points[i];
    const [nx, ny] = points[(i + 1) % sides];
    ctx.arcTo(px, py, nx, ny, corner);
  }
  ctx.closePath();
}

/** Sfondo animato a particelle (esagoni + linee rotanti) per header di card/modali. */
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
        if (p.alpha < MAX_ALPHA) p.alpha = Math.min(MAX_ALPHA, p.alpha + 0.004);
        p.x += p.vx;
        p.y += p.vy;
        if (p.type === 'line') {
          const step = Math.PI / (p.rotateSpeed ?? 200);
          p.angle = (p.angle ?? 0) + (p.rotateClockwise ? -step : step);
        }
      });
      particles = particles.filter((p) => p.x > -10 && p.x < width + 10 && p.y > -10 && p.y < height + 10);

      ctx!.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        ctx!.lineWidth = p.strokeWidth;
        ctx!.strokeStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx!.save();
        if (p.type === 'line') {
          ctx!.translate(p.x, p.y);
          ctx!.rotate(p.angle ?? 0);
          ctx!.beginPath();
          ctx!.moveTo(-(p.length ?? 5) / 2, 0);
          ctx!.lineTo((p.length ?? 5) / 2, 0);
          ctx!.stroke();
        } else {
          drawRoundedHexagon(ctx!, p.x, p.y, p.diameter ?? 5);
          ctx!.stroke();
        }
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
