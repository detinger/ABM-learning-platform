import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { GridState } from '../types';
import { modelTokens, type ModelConfig } from '../models/configs';
import { useTokens } from '../app/theme';

const MAX_CELL = 28;
const MAX_DOTS_PER_CELL = 4;
// Offsets (fractions of a cell) for 1–4 dots sharing a cell.
const DOT_LAYOUT: [number, number][][] = [
  [[0.5, 0.5]],
  [[0.32, 0.5], [0.68, 0.5]],
  [[0.5, 0.3], [0.3, 0.7], [0.7, 0.7]],
  [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]],
];

interface Props {
  gridState: GridState;
  config: ModelConfig;
  maxSize?: number;
}

/** Renders the grid on a <canvas>: one draw call per tick instead of thousands of DOM nodes. */
const SimulationCanvas: React.FC<Props> = ({ gridState, config, maxSize = 640 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(maxSize);
  const tokenNames = useMemo(() => modelTokens(config), [config]);
  const colors = useTokens(tokenNames);

  // Track the container width so the grid fits phones and narrow columns.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setAvailable(Math.max(120, Math.min(maxSize, Math.floor(entry.contentRect.width))));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [maxSize]);

  const { width, height } = gridState;
  const cell = Math.max(2, Math.min(MAX_CELL, Math.floor(available / width), Math.floor(maxSize / height)));
  const pixelWidth = width * cell;
  const pixelHeight = height * cell;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(pixelWidth * dpr);
    canvas.height = Math.round(pixelHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const styles = config.agentStyles;
    const background: (string | undefined)[] = new Array(width * height);
    const dots: { token: string; size: number; outline?: string }[][] = new Array(width * height);

    for (const agent of gridState.agents) {
      const style = styles[agent.type];
      if (!style) continue;
      const idx = agent.y * width + agent.x;
      if (style.layer === 'background') {
        background[idx] = style.token;
      } else {
        (dots[idx] ??= []).push({ token: style.token, size: style.size ?? 0.5, outline: style.outline });
      }
    }

    const empty = colors[config.emptyToken];
    for (let y = 0; y < height; y++) {
      const py = y * cell;
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const bg = background[idx];
        ctx.fillStyle = bg ? colors[bg] : empty;
        ctx.fillRect(x * cell, py, cell, cell);
      }
    }

    if (cell >= 6) {
      ctx.strokeStyle = colors['sim-grid-line'];
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 1; x < width; x++) {
        ctx.moveTo(x * cell + 0.5, 0);
        ctx.lineTo(x * cell + 0.5, pixelHeight);
      }
      for (let y = 1; y < height; y++) {
        ctx.moveTo(0, y * cell + 0.5);
        ctx.lineTo(pixelWidth, y * cell + 0.5);
      }
      ctx.stroke();
    }

    for (let idx = 0; idx < dots.length; idx++) {
      const list = dots[idx];
      if (!list) continue;
      const x = idx % width;
      const y = Math.floor(idx / width);
      const shown = list.slice(0, MAX_DOTS_PER_CELL);
      const layout = DOT_LAYOUT[shown.length - 1];
      const shrink = shown.length > 1 ? 0.6 : 1;
      shown.forEach((dot, i) => {
        const [ox, oy] = layout[i];
        const r = Math.max(1, (dot.size * cell * shrink) / 2);
        ctx.beginPath();
        ctx.arc(x * cell + ox * cell, y * cell + oy * cell, r, 0, Math.PI * 2);
        ctx.fillStyle = colors[dot.token];
        ctx.fill();
        if (dot.outline && r >= 2) {
          ctx.lineWidth = 1;
          ctx.strokeStyle = colors[dot.outline];
          ctx.stroke();
        }
      });
    }
  }, [gridState, config, colors, cell, width, height, pixelWidth, pixelHeight]);

  const summary = config.countDisplay
    .map((c) => `${c.label}: ${gridState.counts[c.key] ?? 0}`)
    .join(', ');

  return (
    <div className="flex flex-col gap-2">
      <div ref={frameRef} className="sim-canvas-frame">
        <canvas
          ref={canvasRef}
          style={{ width: pixelWidth, height: pixelHeight }}
          role="img"
          aria-label={`${config.name} grid at step ${gridState.step}. ${summary}.`}
        />
      </div>
      <p className="hint tabular m-0 text-center">
        {width} × {height} grid · {cell}px per cell
      </p>
    </div>
  );
};

export default SimulationCanvas;
