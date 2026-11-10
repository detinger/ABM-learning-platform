import React from 'react';

/**
 * Lesson figures: inline SVG drawn with the same `--sim-*` and chart tokens as the
 * grid and charts, so a figure, the live simulation and its chart share one color
 * identity and all re-theme together (STYLE.md §9). Text styles live in index.css
 * under `.figure`.
 */

export type FigureId =
  | 'abm-loop'
  | 'sir-flow'
  | 'neighborhoods'
  | 'percolation'
  | 'schelling-rule'
  | 's-curve'
  | 'cycles'
  | 'lorenz'
  | 'ensemble';

const v = (token: string) => `var(--${token})`;
const fill = (token: string, opacity?: number): React.CSSProperties => ({ fill: v(token), fillOpacity: opacity });
const stroke = (token: string, width = 2, extra?: React.CSSProperties): React.CSSProperties => ({
  stroke: v(token),
  strokeWidth: width,
  fill: 'none',
  ...extra,
});

/** Deterministic pseudo-random numbers so figures render identically every time. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const path = (points: [number, number][]) =>
  points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');

const Arrow: React.FC<{ id: string; token?: string }> = ({ id, token = 'text-subtle' }) => (
  <defs>
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" style={fill(token)} />
    </marker>
  </defs>
);

/** A small grid of cells; `cell` returns a token for an agent dot, or null for empty. */
const MiniGrid: React.FC<{
  x: number;
  y: number;
  n: number;
  size: number;
  cell: (i: number, j: number) => string | null;
  highlight?: (i: number, j: number) => boolean;
}> = ({ x, y, n, size, cell, highlight }) => {
  const c = size / n;
  const items: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const token = cell(i, j);
      const hl = highlight?.(i, j);
      items.push(
        <rect
          key={`b${i}-${j}`}
          x={x + i * c}
          y={y + j * c}
          width={c}
          height={c}
          style={{ ...fill(hl ? 'primary-soft' : 'sim-empty'), stroke: v('sim-grid-line'), strokeWidth: 1 }}
        />,
      );
      if (token) items.push(<circle key={`a${i}-${j}`} cx={x + (i + 0.5) * c} cy={y + (j + 0.5) * c} r={c * 0.34} style={fill(token)} />);
    }
  }
  return <g>{items}</g>;
};

// ─────────────────────────── 1. Agents → interactions → emergence ───────────────────────────

const AbmLoop: React.FC = () => {
  const r1 = lcg(7);
  const mixed = Array.from({ length: 64 }, () => (r1() < 0.18 ? null : r1() < 0.6 ? 'sim-type-a' : 'sim-type-b'));
  const r2 = lcg(11);
  const clustered = (i: number, j: number) => {
    if (r2() < 0.16) return null;
    const boundary = 3.6 + Math.sin(j * 0.9) * 1.3;
    return i + (r2() - 0.5) * 0.8 < boundary ? 'sim-type-a' : 'sim-type-b';
  };
  const ring: [number, number, string][] = [
    [-1, -1, 'sim-type-a'], [0, -1, 'sim-type-b'], [1, -1, 'sim-type-a'],
    [-1, 0, 'sim-type-b'], [1, 0, 'sim-type-a'],
    [-1, 1, 'sim-type-b'], [0, 1, ''], [1, 1, 'sim-type-b'],
  ];
  return (
    <svg viewBox="0 0 640 282" role="img" aria-labelledby="fig-abm-title">
      <title id="fig-abm-title">Agents follow local rules, interact with neighbors, and a global pattern emerges</title>
      <Arrow id="arr-abm" />
      {/* Panel 1 */}
      <text x="90" y="22" className="fig-title" textAnchor="middle">1 · Agents</text>
      <MiniGrid x={20} y={36} n={8} size={140} cell={(i, j) => mixed[i * 8 + j]} />
      <text x="90" y="200" className="fig-small" textAnchor="middle">Each has a state and</text>
      <text x="90" y="214" className="fig-small" textAnchor="middle">a few simple rules</text>

      <line x1="172" y1="106" x2="232" y2="106" style={stroke('text-subtle', 1.5)} markerEnd="url(#arr-abm)" />

      {/* Panel 2 */}
      <text x="320" y="22" className="fig-title" textAnchor="middle">2 · Local interaction</text>
      <g transform="translate(320 106)">
        {ring.map(([dx, dy, token]) => (
          <g key={`${dx}${dy}`}>
            <line x1="0" y1="0" x2={dx * 46} y2={dy * 46} style={stroke('border-strong', 1.5, { strokeDasharray: '3 3' })} />
            <rect x={dx * 46 - 19} y={dy * 46 - 19} width="38" height="38" rx="6" style={{ ...fill('sim-empty'), stroke: v('border'), strokeWidth: 1 }} />
            {token && <circle cx={dx * 46} cy={dy * 46} r="11" style={fill(token)} />}
          </g>
        ))}
        <rect x="-19" y="-19" width="38" height="38" rx="6" style={{ ...fill('primary-soft'), stroke: v('primary'), strokeWidth: 2 }} />
        <circle r="12" style={fill('sim-type-a')} />
      </g>
      <text x="320" y="200" className="fig-small" textAnchor="middle">An agent looks only at</text>
      <text x="320" y="214" className="fig-small" textAnchor="middle">its neighbors, then acts</text>

      <line x1="408" y1="106" x2="468" y2="106" style={stroke('text-subtle', 1.5)} markerEnd="url(#arr-abm)" />

      {/* Panel 3 */}
      <text x="550" y="22" className="fig-title" textAnchor="middle">3 · Emergence</text>
      <MiniGrid x={480} y={36} n={8} size={140} cell={clustered} />
      <text x="550" y="200" className="fig-small" textAnchor="middle">A global pattern nobody</text>
      <text x="550" y="214" className="fig-small" textAnchor="middle">planned appears</text>

      {/* Feedback loop */}
      <path d="M550,226 C550,256 90,256 90,226" style={stroke('accent', 1.5, { strokeDasharray: '5 4' })} markerEnd="url(#arr-abm)" />
      <text x="320" y="274" className="fig-small fig-accent" textAnchor="middle">the pattern changes every agent’s surroundings</text>
    </svg>
  );
};

// ─────────────────────────── 2. SIR compartments ───────────────────────────

function sirCurve(beta: number, gamma: number, days: number, i0 = 0.01) {
  let s = 1 - i0, i = i0, r = 0;
  const out: [number, number, number][] = [];
  const dt = 0.1;
  for (let t = 0; t <= days; t += dt) {
    if (Math.abs(t - Math.round(t)) < dt / 2) out.push([s, i, r]);
    const inf = beta * s * i * dt;
    const rec = gamma * i * dt;
    s -= inf;
    i += inf - rec;
    r += rec;
  }
  return out;
}

const SirFlow: React.FC = () => {
  const boxes = [
    { x: 30, label: 'S', name: 'Susceptible', token: 'sim-susceptible' },
    { x: 250, label: 'I', name: 'Infected', token: 'sim-infected' },
    { x: 470, label: 'R', name: 'Recovered', token: 'sim-recovered' },
  ];
  const curve = sirCurve(0.35, 0.1, 100);
  const X = (t: number) => 70 + (t / 100) * 500;
  const Y = (f: number) => 290 - f * 110;
  const series: [string, number][] = [['sim-susceptible', 0], ['sim-infected', 1], ['sim-recovered', 2]];
  return (
    <svg viewBox="0 0 640 320" role="img" aria-labelledby="fig-sir-title">
      <title id="fig-sir-title">People move from susceptible to infected to recovered; the infected curve rises and falls</title>
      <Arrow id="arr-sir" />
      {boxes.map((b) => (
        <g key={b.label}>
          <rect x={b.x} y="20" width="140" height="70" rx="10" style={{ ...fill(b.token, 0.14), stroke: v(b.token), strokeWidth: 2 }} />
          <circle cx={b.x + 34} cy="55" r="16" style={fill(b.token)} />
          <text x={b.x + 34} y="60" className="fig-badge" textAnchor="middle">{b.label}</text>
          <text x={b.x + 60} y="60" className="fig-title">{b.name}</text>
        </g>
      ))}
      <line x1="174" y1="55" x2="246" y2="55" style={stroke('text-subtle', 2)} markerEnd="url(#arr-sir)" />
      <text x="210" y="112" className="fig-small" textAnchor="middle">contact ×</text>
      <text x="210" y="126" className="fig-small" textAnchor="middle">transmission rate</text>
      <line x1="394" y1="55" x2="466" y2="55" style={stroke('text-subtle', 2)} markerEnd="url(#arr-sir)" />
      <text x="430" y="112" className="fig-small" textAnchor="middle">after the</text>
      <text x="430" y="126" className="fig-small" textAnchor="middle">recovery time</text>

      <line x1="70" y1="290" x2="575" y2="290" style={stroke('chart-axis', 1)} />
      <line x1="70" y1="180" x2="70" y2="290" style={stroke('chart-axis', 1)} />
      <text x="64" y="184" className="fig-small" textAnchor="end">100%</text>
      <text x="64" y="294" className="fig-small" textAnchor="end">0</text>
      <text x="575" y="308" className="fig-small" textAnchor="end">time →</text>
      {series.map(([token, k]) => (
        <path key={token} d={path(curve.map((row, t) => [X(t), Y(row[k])]))} style={stroke(token, 2.5)} />
      ))}
      {(() => {
        const peak = curve.reduce((best, row, t) => (row[1] > curve[best][1] ? t : best), 0);
        return (
          <g>
            <line x1={X(peak)} y1={Y(curve[peak][1])} x2={X(peak)} y2="290" style={stroke('sim-infected', 1, { strokeDasharray: '3 3' })} />
            <text x={X(peak)} y="304" className="fig-small fig-strong" textAnchor="middle">↑ epidemic peak</text>
          </g>
        );
      })()}
    </svg>
  );
};

// ─────────────────────────── 3. Neighborhoods ───────────────────────────

const Neighborhoods: React.FC = () => {
  const panel = (x: number, title: string, sub: string, isNeighbor: (dx: number, dy: number) => boolean) => (
    <g>
      <text x={x + 100} y="22" className="fig-title" textAnchor="middle">{title}</text>
      <MiniGrid
        x={x}
        y={36}
        n={5}
        size={200}
        cell={(i, j) => (i === 2 && j === 2 ? 'sim-fire' : isNeighbor(i - 2, j - 2) ? 'sim-tree' : null)}
        highlight={(i, j) => isNeighbor(i - 2, j - 2)}
      />
      <text x={x + 100} y="258" className="fig-small" textAnchor="middle">{sub}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 560 270" role="img" aria-labelledby="fig-nb-title">
      <title id="fig-nb-title">Von Neumann neighborhood has 4 neighbors; Moore neighborhood has 8</title>
      {panel(40, 'Von Neumann · 4 neighbors', 'north, east, south, west (forest fire)', (dx, dy) => Math.abs(dx) + Math.abs(dy) === 1)}
      {panel(320, 'Moore · 8 neighbors', 'includes diagonals (Schelling, SIR)', (dx, dy) => Math.max(Math.abs(dx), Math.abs(dy)) === 1)}
    </svg>
  );
};

// ─────────────────────────── 4. Percolation threshold (measured) ───────────────────────────

/** Share of 10 seeded runs (60×40 grid, spread 100%) in which the fire crossed the forest. */
const MEASURED: [number, number][] = [[50, 0], [55, 0], [58, 0.1], [60, 0.4], [62, 0.7], [65, 1]];

const Percolation: React.FC = () => {
  const X = (d: number) => 70 + ((d - 45) / 25) * 470;
  const Y = (p: number) => 220 - p * 180;
  const logistic = Array.from({ length: 101 }, (_, k) => {
    const d = 45 + k * 0.25;
    return [X(d), Y(1 / (1 + Math.exp(-(d - 60.6) / 1.1)))] as [number, number];
  });
  return (
    <svg viewBox="0 0 600 270" role="img" aria-labelledby="fig-perc-title">
      <title id="fig-perc-title">The chance that fire crosses the forest jumps from near zero to near certain between 57% and 64% tree density</title>
      <rect x={X(45)} y="40" width={X(59.3) - X(45)} height="180" style={fill('sim-tree', 0.08)} />
      <rect x={X(59.3)} y="40" width={X(70) - X(59.3)} height="180" style={fill('sim-fire', 0.08)} />
      <text x={X(51)} y="58" className="fig-small" textAnchor="middle">fires die out</text>
      <text x={X(66)} y="200" className="fig-small" textAnchor="middle">fires sweep through</text>
      {[0, 0.5, 1].map((p) => (
        <g key={p}>
          <line x1={X(45)} y1={Y(p)} x2={X(70)} y2={Y(p)} style={stroke('chart-grid', 1)} />
          <text x="62" y={Y(p) + 4} className="fig-small" textAnchor="end">{p * 100}%</text>
        </g>
      ))}
      {[45, 50, 55, 60, 65, 70].map((d) => (
        <text key={d} x={X(d)} y="238" className="fig-small" textAnchor="middle">{d}%</text>
      ))}
      <text x={X(57.5)} y="260" className="fig-small" textAnchor="middle">tree density</text>
      <text x="16" y="34" className="fig-small">chance fire crosses</text>
      <line x1={X(59.3)} y1="40" x2={X(59.3)} y2="220" style={stroke('accent', 1.5, { strokeDasharray: '5 4' })} />
      <text x={X(59.3) - 6} y="120" className="fig-small fig-accent" textAnchor="end">critical ≈ 59%</text>
      <path d={path(logistic)} style={stroke('sim-fire', 2.5)} />
      {MEASURED.map(([d, p]) => (
        <circle key={d} cx={X(d)} cy={Y(p)} r="5" style={{ ...fill('canvas-bg'), stroke: v('sim-fire'), strokeWidth: 2 }} />
      ))}
    </svg>
  );
};

// ─────────────────────────── 5. Schelling rule ───────────────────────────

const SchellingRule: React.FC = () => {
  const example = (x: number, layout: (string | null)[], verdict: string, detail: string, happy: boolean) => (
    <g>
      <MiniGrid x={x} y={20} n={3} size={150} cell={(i, j) => layout[j * 3 + i]} highlight={(i, j) => i === 1 && j === 1} />
      <text x={x + 75} y="196" className="fig-small" textAnchor="middle">{detail}</text>
      <rect x={x + 10} y="206" width="130" height="26" rx="13" style={fill(happy ? 'success-soft' : 'error-soft')} />
      <text x={x + 75} y="223" className={happy ? 'fig-title fig-success' : 'fig-title fig-error'} textAnchor="middle">{verdict}</text>
    </g>
  );
  const A = 'sim-type-a', B = 'sim-type-b';
  return (
    <svg viewBox="0 0 560 250" role="img" aria-labelledby="fig-sch-title">
      <title id="fig-sch-title">With a 30% threshold, an agent with 3 of 7 similar neighbors stays; one with 2 of 8 moves</title>
      {example(40, [A, B, A, B, A, null, B, A, B], 'Stays (43% ≥ 30%)', '3 of 7 neighbors are blue', true)}
      {example(370, [B, B, A, B, A, B, B, A, B], 'Moves (25% < 30%)', '2 of 8 neighbors are blue', false)}
      <text x="280" y="96" className="fig-title" textAnchor="middle">threshold</text>
      <text x="280" y="118" className="fig-big" textAnchor="middle">30%</text>
    </svg>
  );
};

// ─────────────────────────── 6. Diffusion S-curve and adopter categories ───────────────────────────

const SCurve: React.FC = () => {
  const X = (z: number) => 50 + ((z + 3) / 6) * 520;
  const pdf = (z: number) => Math.exp((-z * z) / 2);
  const Ybell = (y: number) => 220 - y * 120;
  const cdf = (z: number) => 1 / (1 + Math.exp(-1.702 * z));
  const Ys = (y: number) => 220 - y * 180;
  const cats: [number, number, string, string, number][] = [
    [-3, -2, 'Innovators', '2.5%', 1],
    [-2, -1, 'Early adopters', '13.5%', 0.8],
    [-1, 0, 'Early majority', '34%', 0.6],
    [0, 1, 'Late majority', '34%', 0.4],
    [1, 3, 'Laggards', '16%', 0.22],
  ];
  const area = (a: number, b: number) => {
    const pts: [number, number][] = [[X(a), 220]];
    for (let z = a; z <= b + 1e-9; z += 0.05) pts.push([X(z), Ybell(pdf(z))]);
    pts.push([X(b), 220]);
    return `${path(pts)}Z`;
  };
  const s = Array.from({ length: 121 }, (_, k) => {
    const z = -3 + k * 0.05;
    return [X(z), Ys(cdf(z))] as [number, number];
  });
  return (
    <svg viewBox="0 0 620 280" role="img" aria-labelledby="fig-s-title">
      <title id="fig-s-title">Adoptions per period form a bell; cumulative adoption forms an S-curve</title>
      {cats.map(([a, b, name, share, op]) => (
        <g key={name}>
          <path d={area(a, b)} style={{ ...fill('sim-adopter', op), stroke: v('canvas-bg'), strokeWidth: 1.5 }} />
          <text x={X((a + Math.min(b, 2.4)) / 2)} y="240" className="fig-small" textAnchor="middle">{name}</text>
          <text x={X((a + Math.min(b, 2.4)) / 2)} y="254" className="fig-small fig-strong" textAnchor="middle">{share}</text>
        </g>
      ))}
      <line x1={X(-3)} y1="220" x2={X(3)} y2="220" style={stroke('chart-axis', 1)} />
      <path d={path(s)} style={stroke('primary', 3)} />
      <rect x={X(-2.9)} y="28" width="18" height="3" style={fill('primary')} />
      <text x={X(-2.9) + 24} y="34" className="fig-title fig-primary">cumulative adopters (S-curve)</text>
      <text x={X(-0.15)} y={Ybell(1) - 8} className="fig-small" textAnchor="end">new adopters per period</text>
      <text x={X(3)} y="272" className="fig-small" textAnchor="end">time →</text>
    </svg>
  );
};

// ─────────────────────────── 7. Predator-prey cycles ───────────────────────────

function lotkaVolterra() {
  const a = 1, b = 0.1, c = 1.5, d = 0.075;
  let x = 10, y = 5;
  const out: [number, number][] = [];
  const dt = 0.01;
  for (let k = 0; k <= 2000; k++) {
    if (k % 10 === 0) out.push([x, y]);
    const f = (x1: number, y1: number): [number, number] => [a * x1 - b * x1 * y1, d * x1 * y1 - c * y1];
    const k1 = f(x, y);
    const k2 = f(x + (dt / 2) * k1[0], y + (dt / 2) * k1[1]);
    const k3 = f(x + (dt / 2) * k2[0], y + (dt / 2) * k2[1]);
    const k4 = f(x + dt * k3[0], y + dt * k3[1]);
    x += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
  }
  return out;
}

const Cycles: React.FC = () => {
  const data = lotkaVolterra();
  const maxV = Math.max(...data.map(([x, y]) => Math.max(x, y)));
  const X = (k: number) => 50 + (k / (data.length - 1)) * 520;
  const Y = (val: number) => 210 - (val / maxV) * 170;
  const peaks = (idx: 0 | 1) =>
    data.map((row, k) => [k, row[idx]] as const).filter(([k, val]) => k > 0 && k < data.length - 1 && val > data[k - 1][idx] && val >= data[k + 1][idx]);
  const sheepPeaks = peaks(0);
  const wolfPeaks = peaks(1);
  return (
    <svg viewBox="0 0 620 260" role="img" aria-labelledby="fig-cyc-title">
      <title id="fig-cyc-title">Sheep and wolf populations oscillate, with wolf peaks following sheep peaks</title>
      <Arrow id="arr-cyc" token="accent" />
      <line x1="50" y1="210" x2="575" y2="210" style={stroke('chart-axis', 1)} />
      <path d={path(data.map(([x], k) => [X(k), Y(x)]))} style={stroke('chart-1', 2.5)} />
      <path d={path(data.map(([, y], k) => [X(k), Y(y)]))} style={stroke('sim-wolf', 2.5)} />
      {sheepPeaks.slice(0, 2).map(([k, val], n) => {
        const w = wolfPeaks[n];
        if (!w) return null;
        return (
          <g key={k}>
            <line x1={X(k)} y1={Y(val) - 8} x2={X(w[0]) - 2} y2={Y(val) - 8} style={stroke('accent', 1.5)} markerEnd="url(#arr-cyc)" />
            <text x={(X(k) + X(w[0])) / 2} y={Y(val) - 14} className="fig-small fig-accent" textAnchor="middle">lag</text>
          </g>
        );
      })}
      <g transform="translate(60 236)">
        <rect width="12" height="4" y="-4" style={fill('chart-1')} />
        <text x="18" y="0" className="fig-small">Sheep (prey)</text>
        <rect x="120" width="12" height="4" y="-4" style={fill('sim-wolf')} />
        <text x="138" y="0" className="fig-small">Wolves (predators)</text>
      </g>
      <text x="575" y="236" className="fig-small" textAnchor="end">time →</text>
    </svg>
  );
};

// ─────────────────────────── 8. Lorenz curve ───────────────────────────

const Lorenz: React.FC = () => {
  const size = 200, x0 = 70, y0 = 230;
  const P = (fx: number, fy: number): [number, number] => [x0 + fx * size, y0 - fy * size];
  const curve = Array.from({ length: 51 }, (_, k) => P(k / 50, (k / 50) ** 2.5));
  const area = `${path([P(0, 0), P(1, 1)])}${path(curve.slice().reverse()).replace(/^M/, 'L')}Z`;
  return (
    <svg viewBox="0 0 560 270" role="img" aria-labelledby="fig-lor-title">
      <title id="fig-lor-title">The Lorenz curve sags below the line of equality; the shaded gap gives the Gini coefficient</title>
      <rect x={x0} y={y0 - size} width={size} height={size} style={{ ...fill('canvas-bg'), stroke: v('chart-axis'), strokeWidth: 1 }} />
      <path d={area} style={fill('sim-gini', 0.18)} />
      <line x1={x0} y1={y0} x2={x0 + size} y2={y0 - size} style={stroke('text-subtle', 1.5, { strokeDasharray: '5 4' })} />
      <path d={path(curve)} style={stroke('sim-wealth', 3)} />
      <text x={x0 + size / 2} y={y0 + 22} className="fig-small" textAnchor="middle">share of people (poorest → richest)</text>
      <text x={x0 - 12} y={y0 - size / 2} className="fig-small" textAnchor="middle" transform={`rotate(-90 ${x0 - 12} ${y0 - size / 2})`}>
        share of wealth
      </text>
      <text x={x0 + 70} y={y0 - 120} className="fig-small" transform={`rotate(-45 ${x0 + 70} ${y0 - 120})`}>perfect equality</text>
      <text x={x0 + 120} y={y0 - 40} className="fig-small fig-strong">Lorenz curve</text>

      <g transform="translate(330 60)">
        <text className="fig-title">Gini coefficient</text>
        <text y="26" className="fig-small">= shaded area ÷ area under the dashed line</text>
        <rect y="44" width="200" height="10" rx="5" style={fill('bg-sunken')} />
        <rect y="44" width={200 * 0.43} height="10" rx="5" style={fill('sim-gini')} />
        <text y="74" className="fig-small">0 · everyone equal</text>
        <text x="200" y="74" className="fig-small" textAnchor="end">1 · one owns all</text>
        <text y="110" className="fig-big">≈ 0.43</text>
        <text y="130" className="fig-small">for this curve, close to the</text>
        <text y="144" className="fig-small">model’s default after 100 steps</text>
      </g>
    </svg>
  );
};

// ─────────────────────────── 9. Run ensemble ───────────────────────────

const Ensemble: React.FC = () => {
  const rand = lcg(3);
  const X = (t: number) => 60 + (t / 80) * 500;
  const Y = (f: number) => 210 - f * 330;
  const runs = Array.from({ length: 12 }, () => {
    const beta = 0.3 + (rand() - 0.5) * 0.12;
    const shift = Math.round((rand() - 0.3) * 16);
    const c = sirCurve(beta, 0.1, 80 + 20, 0.004);
    return Array.from({ length: 81 }, (_, t) => c[Math.max(0, Math.min(c.length - 1, t - shift + 10))][1] * (0.85 + rand() * 0.04));
  });
  const mean = Array.from({ length: 81 }, (_, t) => runs.reduce((s, r) => s + r[t], 0) / runs.length);
  return (
    <svg viewBox="0 0 620 250" role="img" aria-labelledby="fig-ens-title">
      <title id="fig-ens-title">Twelve runs with different seeds peak at different times and heights; their average is smoother</title>
      <line x1="60" y1="210" x2="570" y2="210" style={stroke('chart-axis', 1)} />
      {runs.map((r, k) => (
        <path key={k} d={path(r.map((f, t) => [X(t), Y(f)]))} style={stroke('sim-infected', 1.5, { strokeOpacity: 0.3 })} />
      ))}
      <path d={path(mean.map((f, t) => [X(t), Y(f)]))} style={stroke('text', 3)} />
      <g transform="translate(400 40)">
        <rect width="16" height="3" y="-4" style={fill('sim-infected', 0.45)} />
        <text x="22" y="0" className="fig-small">one run (different seed)</text>
        <rect width="16" height="3" y="14" style={fill('text')} />
        <text x="22" y="18" className="fig-small fig-strong">average of 12 runs</text>
      </g>
      <text x="570" y="232" className="fig-small" textAnchor="end">time →</text>
      <text x="54" y="44" className="fig-small" textAnchor="end">infected</text>
    </svg>
  );
};

const FIGURES: Record<FigureId, React.FC> = {
  'abm-loop': AbmLoop,
  'sir-flow': SirFlow,
  neighborhoods: Neighborhoods,
  percolation: Percolation,
  'schelling-rule': SchellingRule,
  's-curve': SCurve,
  cycles: Cycles,
  lorenz: Lorenz,
  ensemble: Ensemble,
};

export const Figure: React.FC<{ id: FigureId; caption: string }> = ({ id, caption }) => {
  const Svg = FIGURES[id];
  return (
    <figure className="figure">
      <div className="figure-art">
        <Svg />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
};
