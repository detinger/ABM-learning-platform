import React, { useEffect, useMemo, useRef } from 'react';
import type { ModelConfig } from '../models/configs';
import { useTokens } from '../app/theme';

const COLS = 32;
const ROWS = 14;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h;
}

function pick(weights: [string, number][], r: number) {
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let acc = 0;
  for (const [token, w] of weights) {
    acc += w / total;
    if (r <= acc) return token;
  }
  return weights[weights.length - 1][0];
}

/** Decorative, deterministic preview of a model's grid for library cards. */
const ModelPreview: React.FC<{ config: ModelConfig; variant?: string }> = ({ config, variant = '' }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const names = useMemo(
    () => [...new Set([...config.preview.background, ...config.preview.dots].map(([t]) => t).concat('canvas-bg'))],
    [config],
  );
  const colors = useTokens(names);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const cell = 10;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = COLS * cell * dpr;
    canvas.height = ROWS * cell * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rand = mulberry32(hash(config.id + variant));
    const { background, dots } = config.preview;

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        // Smooth noise so backgrounds form patches rather than static.
        const wave = (Math.sin(x * 0.35 + hash(config.id) % 7) + Math.cos(y * 0.5)) / 4 + 0.5;
        ctx.fillStyle = colors[pick(background, Math.min(1, wave * 0.6 + rand() * 0.4))];
        ctx.fillRect(x * cell, y * cell, cell, cell);
        if (dots.length && rand() < 0.28) {
          ctx.beginPath();
          ctx.arc(x * cell + 5, y * cell + 5, 3, 0, Math.PI * 2);
          ctx.fillStyle = colors[pick(dots, rand())];
          ctx.fill();
        }
      }
    }
  }, [config, colors, variant]);

  return <canvas ref={ref} aria-hidden className="block h-full w-full" style={{ objectFit: 'cover' }} />;
};

export default ModelPreview;
