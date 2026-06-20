"use client";

import { useEffect, useRef } from "react";
import type { ParticleKind, World } from "@/lib/worlds";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  rotation: number;
  spin: number;
};

type WorldCanvasProps = {
  world: World;
};

export function WorldCanvas({ world }: WorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || world.particle === "none") return;

    let frame = 0;
    let animationId = 0;
    let particles: Particle[] = [];

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = createParticles(world.particle, window.innerWidth, window.innerHeight);
    };

    const draw = () => {
      frame += 1;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);

      particles = particles.map((particle) => {
        const next = updateParticle(particle, world.particle);
        if (shouldRespawn(next, world.particle, window.innerWidth, window.innerHeight)) {
          return createParticle(world.particle, window.innerWidth, window.innerHeight);
        }
        return next;
      });

      for (const particle of particles) {
        drawParticle(context, particle, world, frame);
      }

      animationId = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [world]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-0 mix-blend-screen" aria-hidden="true" />;
}

function createParticles(kind: ParticleKind, width: number, height: number): Particle[] {
  const count = kind === "dust" || kind === "stars" ? 54 : 36;
  return Array.from({ length: count }, () => createParticle(kind, width, height));
}

function createParticle(kind: ParticleKind, width: number, height: number): Particle {
  switch (kind) {
    case "embers":
      return baseParticle(random(0, width), height + 12, random(-0.15, 0.15), random(-1, -0.4), random(1.5, 4), random(200, 400));
    case "petals":
      return baseParticle(random(0, width), -12, random(-0.2, 0.2), random(0.3, 0.6), random(4, 8), random(220, 420));
    case "rain":
      return baseParticle(random(0, width), -12, -0.15, random(2.5, 4), random(1, 2.2), random(120, 210));
    case "confetti":
      return baseParticle(random(0, width), -12, random(-0.6, 0.6), random(0.8, 2), random(3, 6), random(180, 320));
    case "stars":
      return baseParticle(random(0, width), random(0, height), 0, 0, random(0.5, 2), 9999);
    case "dust":
    default:
      return baseParticle(random(0, width), random(0, height), random(-0.08, 0.08), random(-0.08, 0.08), random(0.8, 2.3), 9999);
  }
}

function baseParticle(x: number, y: number, vx: number, vy: number, size: number, maxLife: number): Particle {
  return {
    x,
    y,
    vx,
    vy,
    size,
    maxLife,
    life: maxLife,
    rotation: random(0, Math.PI * 2),
    spin: random(-0.04, 0.04),
  };
}

function updateParticle(particle: Particle, kind: ParticleKind): Particle {
  return {
    ...particle,
    x: particle.x + particle.vx,
    y: particle.y + particle.vy,
    life: kind === "dust" || kind === "stars" ? particle.life : particle.life - 1,
    rotation: particle.rotation + particle.spin,
  };
}

function shouldRespawn(particle: Particle, kind: ParticleKind, width: number, height: number) {
  if (kind === "dust" || kind === "stars") {
    return particle.x < -20 || particle.x > width + 20 || particle.y < -20 || particle.y > height + 20;
  }

  return particle.life <= 0 || particle.x < -40 || particle.x > width + 40 || particle.y < -40 || particle.y > height + 40;
}

function drawParticle(context: CanvasRenderingContext2D, particle: Particle, world: World, frame: number) {
  const color = world.particleColor ?? world.orbHex;
  const alpha = world.particle === "dust" || world.particle === "stars" ? continuousAlpha(world.particle, frame, particle) : transientAlpha(particle);
  context.fillStyle = hexToRgba(color, alpha * 0.55);
  context.strokeStyle = hexToRgba(color, alpha * 0.55);

  if (world.particle === "rain") {
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(particle.x, particle.y);
    context.lineTo(particle.x - 1, particle.y + particle.size * 6);
    context.stroke();
    return;
  }

  if (world.particle === "confetti") {
    context.save();
    context.translate(particle.x, particle.y);
    context.rotate(particle.rotation);
    context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    context.restore();
    return;
  }

  context.beginPath();
  context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  context.fill();
}

function transientAlpha(particle: Particle) {
  const ratio = particle.life / particle.maxLife;
  if (ratio < 0.15) return ratio / 0.15;
  if (ratio > 0.8) return (1 - ratio) / 0.2;
  return 1;
}

function continuousAlpha(kind: ParticleKind, frame: number, particle: Particle) {
  if (kind === "stars") return 0.45 + Math.sin(frame * 0.04 + particle.x) * 0.35;
  return 0.62;
}

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(alpha, 1))})`;
}

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
