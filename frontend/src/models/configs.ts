import { Agent } from '../types';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface AgentStyle {
  /** If true, this agent type sets the cell background color */
  isBackground: boolean;
  backgroundColor?: string;
  dotColor?: string;
  dotSize?: number; // px
  animate?: boolean;
}

export interface MetricConfig {
  key: string;
  label: string;
  color: string;
}

export interface CountDisplay {
  key: string;
  label: string;
  emoji: string;
  colorClass: string;
}

export interface ParamConfig {
  key: string;
  label: string;
  type: 'integer' | 'float';
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface LegendEntry {
  label: string;
  color: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;
  concepts: string[];
  rules: string[];
  icon: string;
  gradient: string; // CSS gradient string for card backgrounds
  defaultParams: Record<string, number>;
  parameterConfig: ParamConfig[];
  metrics: MetricConfig[];
  countDisplay: CountDisplay[];
  agentStyles: Record<string, AgentStyle>;
  legend: LegendEntry[];
  /** If true, cells render purely by background (no foreground dots) */
  gridIsCellular?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Cell rendering helper
// ─────────────────────────────────────────────────────────────

export interface CellRender {
  backgroundColor: string;
  foreground: { color: string; size: number; animate?: boolean }[];
}

export function renderCell(agents: Agent[], config: ModelConfig): CellRender {
  const styles = config.agentStyles;
  const defaultBg = '#0f172a';

  const bgAgent = agents.find((a) => styles[a.type]?.isBackground);
  const backgroundColor = bgAgent ? (styles[bgAgent.type]?.backgroundColor ?? defaultBg) : defaultBg;

  const foreground = agents
    .filter((a) => !styles[a.type]?.isBackground && styles[a.type])
    .map((a) => ({
      color: styles[a.type]!.dotColor ?? '#ffffff',
      size: styles[a.type]!.dotSize ?? 6,
      animate: styles[a.type]!.animate,
    }));

  return { backgroundColor, foreground };
}

// ─────────────────────────────────────────────────────────────
// Model Configurations
// ─────────────────────────────────────────────────────────────

const PREDATOR_PREY: ModelConfig = {
  id: 'predator_prey',
  name: 'Predator-Prey',
  tagline: 'Wolves & Sheep Ecosystem',
  description:
    'Classic Lotka-Volterra dynamics on a grid. Sheep graze on grass, wolves hunt sheep, ' +
    'and populations oscillate in a never-ending cycle.',
  concepts: ['Population cycles', 'Trophic cascades', 'Carrying capacity', 'Emergence'],
  rules: [
    'Sheep graze on grass, gain energy, and reproduce when energy is high',
    'Wolves hunt sheep, gain energy from eating, reproduce when full',
    'Grass regrows after being eaten over a fixed countdown',
    'Both species die when energy runs out — extinction ends the sim',
  ],
  icon: '🐺',
  gradient: 'linear-gradient(135deg, #14532d 0%, #1e3a5f 100%)',
  defaultParams: {
    width: 20, height: 20,
    initial_sheep: 100, initial_wolves: 50,
    sheep_reproduce_threshold: 8, wolf_reproduce_threshold: 16,
    sheep_gain_from_food: 4, wolf_gain_from_food: 20,
    grass_regrowth_time: 30,
  },
  parameterConfig: [
    { key: 'width', label: 'Grid Width', type: 'integer', min: 10, max: 60, step: 5, default: 20 },
    { key: 'height', label: 'Grid Height', type: 'integer', min: 10, max: 60, step: 5, default: 20 },
    { key: 'initial_sheep', label: 'Initial Sheep', type: 'integer', min: 10, max: 300, step: 10, default: 100 },
    { key: 'initial_wolves', label: 'Initial Wolves', type: 'integer', min: 5, max: 150, step: 5, default: 50 },
    { key: 'sheep_reproduce_threshold', label: 'Sheep Repro Energy', type: 'integer', min: 2, max: 20, step: 1, default: 8 },
    { key: 'wolf_reproduce_threshold', label: 'Wolf Repro Energy', type: 'integer', min: 4, max: 40, step: 2, default: 16 },
    { key: 'sheep_gain_from_food', label: 'Sheep Energy from Grass', type: 'integer', min: 1, max: 15, step: 1, default: 4 },
    { key: 'wolf_gain_from_food', label: 'Wolf Energy from Sheep', type: 'integer', min: 5, max: 40, step: 5, default: 20 },
    { key: 'grass_regrowth_time', label: 'Grass Regrowth Time', type: 'integer', min: 5, max: 80, step: 5, default: 30 },
  ],
  metrics: [
    { key: 'sheep', label: '🐑 Sheep', color: '#e2e8f0' },
    { key: 'wolves', label: '🐺 Wolves', color: '#ef4444' },
    { key: 'grass', label: '🌿 Grass', color: '#22c55e' },
  ],
  countDisplay: [
    { key: 'sheep', label: 'Sheep', emoji: '🐑', colorClass: 'bg-white/5' },
    { key: 'wolves', label: 'Wolves', emoji: '🐺', colorClass: 'bg-red-500/10' },
    { key: 'grass', label: 'Grass', emoji: '🌿', colorClass: 'bg-green-500/10' },
  ],
  agentStyles: {
    grass_grown:     { isBackground: true,  backgroundColor: 'rgba(21,  128, 61,  0.45)' },
    grass_regrowing: { isBackground: true,  backgroundColor: 'rgba(92,  51,  23,  0.45)' },
    sheep:           { isBackground: false, dotColor: '#f8fafc', dotSize: 6 },
    wolf:            { isBackground: false, dotColor: '#ef4444', dotSize: 9, animate: true },
  },
  legend: [
    { label: 'Sheep', color: '#f8fafc' },
    { label: 'Wolf', color: '#ef4444' },
    { label: 'Grass (grown)', color: 'rgba(21,128,61,0.8)' },
    { label: 'Grass (regrowing)', color: 'rgba(92,51,23,0.8)' },
  ],
};

const SIR: ModelConfig = {
  id: 'sir',
  name: 'SIR Epidemic',
  tagline: 'Disease Spreading & Herd Immunity',
  description:
    'Susceptible agents move around a grid and can be infected by neighbors. ' +
    'Watch epidemic waves form and learn about R₀, herd immunity, and epidemic curves.',
  concepts: ['Epidemic spreading', 'Herd immunity', 'R₀ (reproduction number)', 'Phase transitions'],
  rules: [
    'Susceptible agents move randomly and can be infected by contact',
    'Infected agents transmit disease to susceptible neighbors with probability p',
    'After a fixed recovery time, infected agents become permanently immune',
    'Epidemic ends when no infected agents remain',
  ],
  icon: '🦠',
  gradient: 'linear-gradient(135deg, #7f1d1d 0%, #1e1b4b 100%)',
  defaultParams: {
    width: 30, height: 30,
    population: 400,
    initial_infected: 5,
    transmission_rate: 30, // stored as integer 0-100, divided by 100 in display
    recovery_time: 14,
  },
  parameterConfig: [
    { key: 'width', label: 'Grid Width', type: 'integer', min: 10, max: 60, step: 5, default: 30 },
    { key: 'height', label: 'Grid Height', type: 'integer', min: 10, max: 60, step: 5, default: 30 },
    { key: 'population', label: 'Population', type: 'integer', min: 50, max: 800, step: 50, default: 400 },
    { key: 'initial_infected', label: 'Initial Infected', type: 'integer', min: 1, max: 30, step: 1, default: 5 },
    { key: 'transmission_rate', label: 'Transmission Rate (%)', type: 'integer', min: 1, max: 90, step: 1, default: 30 },
    { key: 'recovery_time', label: 'Recovery Time (steps)', type: 'integer', min: 3, max: 40, step: 1, default: 14 },
  ],
  metrics: [
    { key: 'susceptible', label: '🔵 Susceptible', color: '#3b82f6' },
    { key: 'infected',    label: '🔴 Infected',    color: '#ef4444' },
    { key: 'recovered',   label: '🟢 Recovered',   color: '#22c55e' },
  ],
  countDisplay: [
    { key: 'susceptible', label: 'Susceptible', emoji: '🔵', colorClass: 'bg-blue-500/10' },
    { key: 'infected',    label: 'Infected',    emoji: '🔴', colorClass: 'bg-red-500/10' },
    { key: 'recovered',   label: 'Recovered',   emoji: '🟢', colorClass: 'bg-green-500/10' },
  ],
  agentStyles: {
    susceptible: { isBackground: false, dotColor: '#3b82f6', dotSize: 5 },
    infected:    { isBackground: false, dotColor: '#ef4444', dotSize: 6, animate: true },
    recovered:   { isBackground: false, dotColor: '#22c55e', dotSize: 5 },
  },
  legend: [
    { label: 'Susceptible', color: '#3b82f6' },
    { label: 'Infected',    color: '#ef4444' },
    { label: 'Recovered',   color: '#22c55e' },
  ],
};

const FOREST_FIRE: ModelConfig = {
  id: 'forest_fire',
  name: 'Forest Fire',
  tagline: 'Percolation & Critical Thresholds',
  description:
    'Fire starts on the left edge and spreads through adjacent trees. ' +
    'Explore the critical density threshold above which fires span the entire forest.',
  concepts: ['Percolation theory', 'Phase transitions', 'Critical thresholds', 'Cascade effects'],
  rules: [
    'Trees are placed randomly based on density parameter',
    'Fire starts on the left column and spreads to orthogonal (N/E/S/W) neighbors',
    'A burning tree ignites adjacent trees with probability p',
    'Burned trees cannot reignite — fire stops when no burning trees remain',
  ],
  icon: '🔥',
  gradient: 'linear-gradient(135deg, #7c2d12 0%, #1c1917 100%)',
  gridIsCellular: true,
  defaultParams: {
    width: 60, height: 40,
    tree_density: 65, // stored as integer 0-100, divided by 100 before sending
    spread_prob: 100, // 0-100
  },
  parameterConfig: [
    { key: 'width', label: 'Grid Width', type: 'integer', min: 20, max: 100, step: 10, default: 60 },
    { key: 'height', label: 'Grid Height', type: 'integer', min: 20, max: 80, step: 10, default: 40 },
    { key: 'tree_density', label: 'Tree Density (%)', type: 'integer', min: 10, max: 95, step: 5, default: 65 },
    { key: 'spread_prob', label: 'Spread Probability (%)', type: 'integer', min: 20, max: 100, step: 5, default: 100 },
  ],
  metrics: [
    { key: 'trees',  label: '🌲 Trees',  color: '#16a34a' },
    { key: 'fire',   label: '🔥 Fire',   color: '#f97316' },
    { key: 'burned', label: '🪵 Burned', color: '#57534e' },
  ],
  countDisplay: [
    { key: 'trees',  label: 'Trees',  emoji: '🌲', colorClass: 'bg-green-500/10' },
    { key: 'fire',   label: 'Fire',   emoji: '🔥', colorClass: 'bg-orange-500/10' },
    { key: 'burned', label: 'Burned', emoji: '🪵', colorClass: 'bg-stone-500/10' },
  ],
  agentStyles: {
    empty:  { isBackground: true, backgroundColor: '#1c1917' },
    tree:   { isBackground: true, backgroundColor: '#14532d' },
    fire:   { isBackground: true, backgroundColor: '#ea580c' },
    burned: { isBackground: true, backgroundColor: '#292524' },
  },
  legend: [
    { label: 'Tree',    color: '#14532d' },
    { label: 'Fire',    color: '#ea580c' },
    { label: 'Burned',  color: '#292524' },
    { label: 'Empty',   color: '#1c1917' },
  ],
};

const DIFFUSION: ModelConfig = {
  id: 'diffusion',
  name: 'Diffusion of Innovations',
  tagline: 'Technology Adoption S-Curves',
  description:
    'Watch a new technology spread through a population. Innovators adopt spontaneously; ' +
    'imitators adopt when enough neighbors already have. Produces the classic Bass S-curve.',
  concepts: ['Innovation diffusion', 'S-curves', 'Word-of-mouth effects', 'Network externalities'],
  rules: [
    'Each agent independently adopts with a small innovation coefficient (p)',
    'Agents are also influenced by adopted neighbors — imitation coefficient (q)',
    'Once adopted, an agent stays an adopter permanently',
    'Simulation ends when all agents have adopted',
  ],
  icon: '💡',
  gradient: 'linear-gradient(135deg, #1e3a5f 0%, #312e81 100%)',
  defaultParams: {
    width: 40, height: 30,
    density: 85,           // 0-100
    innovation_coeff: 1,   // 0-10 (x0.001 before sending)
    imitation_coeff: 50,   // 0-100 (x0.01 before sending)
    initial_adopters: 3,
  },
  parameterConfig: [
    { key: 'width', label: 'Grid Width', type: 'integer', min: 15, max: 80, step: 5, default: 40 },
    { key: 'height', label: 'Grid Height', type: 'integer', min: 15, max: 60, step: 5, default: 30 },
    { key: 'density', label: 'Population Density (%)', type: 'integer', min: 40, max: 100, step: 5, default: 85 },
    { key: 'innovation_coeff', label: 'Innovation Coeff p (×0.001)', type: 'integer', min: 0, max: 20, step: 1, default: 1 },
    { key: 'imitation_coeff', label: 'Imitation Coeff q (×0.01)', type: 'integer', min: 5, max: 100, step: 5, default: 50 },
    { key: 'initial_adopters', label: 'Seed Adopters', type: 'integer', min: 1, max: 20, step: 1, default: 3 },
  ],
  metrics: [
    { key: 'adopters',     label: '💡 Adopters',     color: '#f59e0b' },
    { key: 'non_adopters', label: '⬜ Non-Adopters', color: '#475569' },
  ],
  countDisplay: [
    { key: 'adopters',     label: 'Adopters',     emoji: '💡', colorClass: 'bg-amber-500/10' },
    { key: 'non_adopters', label: 'Non-Adopters', emoji: '⬜', colorClass: 'bg-slate-500/10' },
  ],
  agentStyles: {
    non_adopter: { isBackground: false, dotColor: '#475569', dotSize: 5 },
    adopter:     { isBackground: false, dotColor: '#f59e0b', dotSize: 6 },
  },
  legend: [
    { label: 'Non-Adopter', color: '#475569' },
    { label: 'Adopter',     color: '#f59e0b' },
  ],
};

const SCHELLING: ModelConfig = {
  id: 'schelling',
  name: 'Schelling Segregation',
  tagline: 'Emergence of Residential Segregation',
  description:
    'Each household only wants a fraction of its neighbors to be the same type. ' +
    'Even mild preferences produce striking macro-level segregation — a famous example of emergence.',
  concepts: ['Emergence', 'Self-organization', 'Tipping points', 'Micro-macro link'],
  rules: [
    'Two types of agents (Blue & Red) share a grid with some empty cells',
    'An agent is "happy" if ≥ homophily% of its neighbors are the same type',
    'Unhappy agents move to a random empty cell each step',
    'The model converges when nearly all agents are happy',
  ],
  icon: '🏘️',
  gradient: 'linear-gradient(135deg, #1e40af 0%, #7f1d1d 100%)',
  defaultParams: {
    width: 30, height: 30,
    density: 80,        // 0-100
    minority_pct: 30,   // 0-100
    homophily: 30,      // 0-100
  },
  parameterConfig: [
    { key: 'width', label: 'Grid Width', type: 'integer', min: 15, max: 60, step: 5, default: 30 },
    { key: 'height', label: 'Grid Height', type: 'integer', min: 15, max: 60, step: 5, default: 30 },
    { key: 'density', label: 'Occupancy (%)', type: 'integer', min: 40, max: 95, step: 5, default: 80 },
    { key: 'minority_pct', label: 'Minority % (Red)', type: 'integer', min: 10, max: 50, step: 5, default: 30 },
    { key: 'homophily', label: 'Homophily Threshold (%)', type: 'integer', min: 0, max: 80, step: 5, default: 30 },
  ],
  metrics: [
    { key: 'happy_pct', label: '😊 Happy %', color: '#22c55e' },
    { key: 'type_a',    label: '🔵 Blue',    color: '#3b82f6' },
    { key: 'type_b',    label: '🔴 Red',     color: '#ef4444' },
  ],
  countDisplay: [
    { key: 'type_a',    label: 'Blue',    emoji: '🔵', colorClass: 'bg-blue-500/10' },
    { key: 'type_b',    label: 'Red',     emoji: '🔴', colorClass: 'bg-red-500/10' },
    { key: 'happy_pct', label: 'Happy %', emoji: '😊', colorClass: 'bg-green-500/10' },
  ],
  agentStyles: {
    type_a: { isBackground: false, dotColor: '#3b82f6', dotSize: 7 },
    type_b: { isBackground: false, dotColor: '#ef4444', dotSize: 7 },
  },
  legend: [
    { label: 'Blue (majority)', color: '#3b82f6' },
    { label: 'Red (minority)',  color: '#ef4444' },
  ],
};

const WEALTH: ModelConfig = {
  id: 'wealth',
  name: 'Wealth Distribution',
  tagline: 'Sugarscape & Inequality Emergence',
  description:
    'Agents with different vision and metabolism compete for sugar resources on a landscape ' +
    'with two "mountains". Watch the Gini coefficient rise as wealth concentrates — even with no ' +
    'initial inequality.',
  concepts: ['Wealth inequality', 'Gini coefficient', 'Resource competition', 'Pareto principle'],
  rules: [
    'Each agent has a random vision range (how far they can see) and metabolism (sugar cost/step)',
    'Agents move to the richest visible, unoccupied cell each step',
    'Agents eat all sugar at their current cell; sugar slowly regrows',
    'Agents with no sugar die and are replaced by new agents with minimal wealth',
  ],
  icon: '💰',
  gradient: 'linear-gradient(135deg, #713f12 0%, #1c1917 100%)',
  defaultParams: {
    width: 40, height: 30,
    num_agents: 200,
    max_vision: 5,
    max_metabolism: 4,
    max_initial_sugar: 20,
  },
  parameterConfig: [
    { key: 'width', label: 'Grid Width', type: 'integer', min: 20, max: 80, step: 10, default: 40 },
    { key: 'height', label: 'Grid Height', type: 'integer', min: 20, max: 60, step: 10, default: 30 },
    { key: 'num_agents', label: 'Agents', type: 'integer', min: 50, max: 500, step: 50, default: 200 },
    { key: 'max_vision', label: 'Max Vision', type: 'integer', min: 1, max: 10, step: 1, default: 5 },
    { key: 'max_metabolism', label: 'Max Metabolism', type: 'integer', min: 1, max: 8, step: 1, default: 4 },
    { key: 'max_initial_sugar', label: 'Max Sugar', type: 'integer', min: 5, max: 40, step: 5, default: 20 },
  ],
  metrics: [
    { key: 'mean_wealth', label: '💰 Mean Wealth', color: '#f59e0b' },
    { key: 'gini',        label: '📊 Gini ×100',   color: '#f87171' },
    { key: 'agents',      label: '👤 Agents',      color: '#94a3b8' },
  ],
  countDisplay: [
    { key: 'agents',      label: 'Agents',     emoji: '👤', colorClass: 'bg-slate-500/10' },
    { key: 'mean_wealth', label: 'Mean Wealth', emoji: '💰', colorClass: 'bg-amber-500/10' },
    { key: 'gini',        label: 'Gini Coeff', emoji: '📊', colorClass: 'bg-red-500/10' },
  ],
  agentStyles: {
    sugar_empty:    { isBackground: true, backgroundColor: '#1c1917' },
    sugar_depleted: { isBackground: true, backgroundColor: '#292524' },
    sugar_low:      { isBackground: true, backgroundColor: '#451a03' },
    sugar_med:      { isBackground: true, backgroundColor: '#78350f' },
    sugar_high:     { isBackground: true, backgroundColor: '#d97706' },
    person:         { isBackground: false, dotColor: '#fef3c7', dotSize: 5 },
  },
  legend: [
    { label: 'No sugar',      color: '#1c1917' },
    { label: 'Low sugar',     color: '#451a03' },
    { label: 'Medium sugar',  color: '#78350f' },
    { label: 'High sugar',    color: '#d97706' },
    { label: 'Agent',         color: '#fef3c7' },
  ],
};

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  predator_prey: PREDATOR_PREY,
  sir: SIR,
  forest_fire: FOREST_FIRE,
  diffusion: DIFFUSION,
  schelling: SCHELLING,
  wealth: WEALTH,
};

export const MODEL_ORDER = ['predator_prey', 'sir', 'forest_fire', 'diffusion', 'schelling', 'wealth'];

/**
 * Transform integer-encoded frontend params into the floats/values the backend expects.
 * Some sliders use integers for UX (e.g., transmission_rate 0-100) but the model needs floats.
 */
export function transformParams(modelId: string, params: Record<string, number>): Record<string, number> {
  const p = { ...params };

  if (modelId === 'sir') {
    p.transmission_rate = Math.round(p.transmission_rate) / 100;
  }
  if (modelId === 'forest_fire') {
    p.tree_density = Math.round(p.tree_density) / 100;
    p.spread_prob  = Math.round(p.spread_prob)  / 100;
  }
  if (modelId === 'diffusion') {
    p.density           = Math.round(p.density)           / 100;
    p.innovation_coeff  = Math.round(p.innovation_coeff)  / 1000;
    p.imitation_coeff   = Math.round(p.imitation_coeff)   / 100;
  }
  if (modelId === 'schelling') {
    p.density       = Math.round(p.density)       / 100;
    p.minority_pct  = Math.round(p.minority_pct)  / 100;
    p.homophily     = Math.round(p.homophily)      / 100;
  }

  return p;
}
