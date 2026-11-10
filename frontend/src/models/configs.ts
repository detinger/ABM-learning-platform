import type { LucideIcon } from 'lucide-react';
import { Biohazard, Coins, Flame, Home, Lightbulb, Rabbit } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Types
//
// Colors are design tokens (the name of a `--sim-*` CSS variable without the
// leading dashes) so the grid, legend, KPIs and chart share one identity per
// state and all follow the active theme. See STYLE.md §9.
// ─────────────────────────────────────────────────────────────

export type Token = string;

export interface AgentStyle {
  /** Background agents paint the whole cell; dot agents are drawn on top. */
  layer: 'background' | 'dot';
  token: Token;
  /** Dot diameter as a fraction of the cell size. */
  size?: number;
  outline?: Token;
}

export interface MetricConfig {
  key: string;
  label: string;
  token: Token;
}

export interface CountDisplay {
  key: string;
  label: string;
  token?: Token;
  format?: 'integer' | 'decimal' | 'percent';
  detail?: string;
}

export interface ParamConfig {
  key: string;
  label: string;
  type: 'integer' | 'float';
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
  hint?: string;
  /** Read by agents on every step, so it can change while the simulation runs. */
  live?: boolean;
}

export interface LegendEntry {
  label: string;
  token: Token;
}

export interface ModelConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;
  concepts: string[];
  rules: string[];
  icon: LucideIcon;
  defaultParams: Record<string, number>;
  parameterConfig: ParamConfig[];
  metrics: MetricConfig[];
  countDisplay: CountDisplay[];
  agentStyles: Record<string, AgentStyle>;
  legend: LegendEntry[];
  /** Cell background when no background agent occupies a cell. */
  emptyToken: Token;
  /** Weighted tokens used to draw the static preview on library cards. */
  preview: { background: [Token, number][]; dots: [Token, number][] };
}

// ─────────────────────────────────────────────────────────────
// Model configurations
// ─────────────────────────────────────────────────────────────

const PREDATOR_PREY: ModelConfig = {
  id: 'predator_prey',
  name: 'Predator-Prey',
  tagline: 'Wolves and sheep ecosystem',
  description:
    'Classic Lotka-Volterra dynamics on a grid. Sheep graze on grass, wolves hunt sheep, ' +
    'and population booms can either oscillate or collapse depending on the balance of the ecosystem.',
  concepts: ['Population cycles', 'Trophic cascades', 'Carrying capacity', 'Emergence'],
  rules: [
    'Sheep graze on grass, gain energy, and reproduce more easily once they are well-fed',
    'Wolves hunt sheep, gain energy from eating, and only sometimes reproduce after a successful hunt',
    'Grass regrows after being eaten over a fixed countdown',
    'The simulation continues through predator or prey collapse and only ends once both animal populations reach zero',
  ],
  icon: Rabbit,
  defaultParams: {
    width: 20, height: 20,
    initial_sheep: 100, initial_wolves: 20,
    sheep_reproduce_threshold: 6, wolf_reproduce_threshold: 24,
    sheep_gain_from_food: 4, wolf_gain_from_food: 20,
    grass_regrowth_time: 30,
  },
  parameterConfig: [
    { key: 'width', label: 'Grid width', type: 'integer', min: 10, max: 60, step: 5, default: 20, unit: 'cells' },
    { key: 'height', label: 'Grid height', type: 'integer', min: 10, max: 60, step: 5, default: 20, unit: 'cells' },
    { key: 'initial_sheep', label: 'Initial sheep', type: 'integer', min: 10, max: 300, step: 10, default: 100 },
    { key: 'initial_wolves', label: 'Initial wolves', type: 'integer', min: 5, max: 150, step: 5, default: 20 },
    { key: 'sheep_reproduce_threshold', label: 'Sheep reproduction energy', type: 'integer', min: 2, max: 20, step: 1, default: 6 },
    { key: 'wolf_reproduce_threshold', label: 'Wolf reproduction energy', type: 'integer', min: 4, max: 40, step: 2, default: 24 },
    { key: 'sheep_gain_from_food', label: 'Sheep energy from grass', type: 'integer', min: 1, max: 15, step: 1, default: 4 },
    { key: 'wolf_gain_from_food', label: 'Wolf energy from sheep', type: 'integer', min: 5, max: 40, step: 5, default: 20 },
    { key: 'grass_regrowth_time', label: 'Grass regrowth time', type: 'integer', min: 5, max: 80, step: 5, default: 30, unit: 'steps' },
  ],
  metrics: [
    { key: 'sheep', label: 'Sheep', token: 'chart-1' },
    { key: 'wolves', label: 'Wolves', token: 'sim-wolf' },
    { key: 'grass', label: 'Grass', token: 'chart-3' },
  ],
  countDisplay: [
    { key: 'sheep', label: 'Sheep', token: 'sim-sheep' },
    { key: 'wolves', label: 'Wolves', token: 'sim-wolf' },
    { key: 'grass', label: 'Grass patches', token: 'sim-grass', detail: 'fully grown' },
  ],
  agentStyles: {
    grass_grown: { layer: 'background', token: 'sim-grass' },
    grass_regrowing: { layer: 'background', token: 'sim-grass-regrowing' },
    sheep: { layer: 'dot', token: 'sim-sheep', size: 0.5, outline: 'sim-sheep-outline' },
    wolf: { layer: 'dot', token: 'sim-wolf', size: 0.7 },
  },
  legend: [
    { label: 'Sheep', token: 'sim-sheep' },
    { label: 'Wolf', token: 'sim-wolf' },
    { label: 'Grass (grown)', token: 'sim-grass' },
    { label: 'Grass (regrowing)', token: 'sim-grass-regrowing' },
  ],
  emptyToken: 'sim-empty',
  preview: {
    background: [['sim-grass', 7], ['sim-grass-regrowing', 3]],
    dots: [['sim-sheep', 3], ['sim-wolf', 1]],
  },
};

const SIR: ModelConfig = {
  id: 'sir',
  name: 'SIR Epidemic',
  tagline: 'Disease spreading and herd immunity',
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
  icon: Biohazard,
  defaultParams: {
    width: 30, height: 30,
    population: 400,
    initial_infected: 5,
    transmission_rate: 30, // percent; divided by 100 before sending
    recovery_time: 14,
  },
  parameterConfig: [
    { key: 'width', label: 'Grid width', type: 'integer', min: 10, max: 60, step: 5, default: 30, unit: 'cells' },
    { key: 'height', label: 'Grid height', type: 'integer', min: 10, max: 60, step: 5, default: 30, unit: 'cells' },
    { key: 'population', label: 'Population', type: 'integer', min: 50, max: 800, step: 50, default: 400 },
    { key: 'initial_infected', label: 'Initial infected', type: 'integer', min: 1, max: 30, step: 1, default: 5 },
    { key: 'transmission_rate', label: 'Transmission rate', type: 'integer', min: 1, max: 90, step: 1, default: 30, unit: '%', live: true,
      hint: 'Chance a contact with an infected neighbor transmits the disease.' },
    { key: 'recovery_time', label: 'Recovery time', type: 'integer', min: 3, max: 40, step: 1, default: 14, unit: 'steps', live: true,
      hint: 'Applies to new infections.' },
  ],
  metrics: [
    { key: 'susceptible', label: 'Susceptible', token: 'sim-susceptible' },
    { key: 'infected', label: 'Infected', token: 'sim-infected' },
    { key: 'recovered', label: 'Recovered', token: 'sim-recovered' },
  ],
  countDisplay: [
    { key: 'susceptible', label: 'Susceptible', token: 'sim-susceptible' },
    { key: 'infected', label: 'Infected', token: 'sim-infected' },
    { key: 'recovered', label: 'Recovered', token: 'sim-recovered' },
  ],
  agentStyles: {
    susceptible: { layer: 'dot', token: 'sim-susceptible', size: 0.5 },
    infected: { layer: 'dot', token: 'sim-infected', size: 0.6 },
    recovered: { layer: 'dot', token: 'sim-recovered', size: 0.5 },
  },
  legend: [
    { label: 'Susceptible', token: 'sim-susceptible' },
    { label: 'Infected', token: 'sim-infected' },
    { label: 'Recovered', token: 'sim-recovered' },
  ],
  emptyToken: 'sim-empty',
  preview: {
    background: [['sim-empty', 1]],
    dots: [['sim-susceptible', 6], ['sim-infected', 2], ['sim-recovered', 2]],
  },
};

const FOREST_FIRE: ModelConfig = {
  id: 'forest_fire',
  name: 'Forest Fire',
  tagline: 'Percolation and critical thresholds',
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
  icon: Flame,
  defaultParams: {
    width: 60, height: 40,
    tree_density: 65, // percent
    spread_prob: 100, // percent
  },
  parameterConfig: [
    { key: 'width', label: 'Grid width', type: 'integer', min: 20, max: 100, step: 10, default: 60, unit: 'cells' },
    { key: 'height', label: 'Grid height', type: 'integer', min: 20, max: 80, step: 10, default: 40, unit: 'cells' },
    { key: 'tree_density', label: 'Tree density', type: 'integer', min: 10, max: 95, step: 5, default: 65, unit: '%',
      hint: 'The critical threshold on a square grid is about 59%.' },
    { key: 'spread_prob', label: 'Spread probability', type: 'integer', min: 20, max: 100, step: 5, default: 100, unit: '%', live: true },
  ],
  metrics: [
    { key: 'trees', label: 'Trees', token: 'sim-tree' },
    { key: 'fire', label: 'Burning', token: 'sim-fire' },
    { key: 'burned', label: 'Burned', token: 'sim-burned' },
  ],
  countDisplay: [
    { key: 'trees', label: 'Trees', token: 'sim-tree' },
    { key: 'fire', label: 'Burning', token: 'sim-fire' },
    { key: 'burned', label: 'Burned', token: 'sim-burned' },
  ],
  agentStyles: {
    empty: { layer: 'background', token: 'sim-empty' },
    tree: { layer: 'background', token: 'sim-tree' },
    fire: { layer: 'background', token: 'sim-fire' },
    burned: { layer: 'background', token: 'sim-burned' },
  },
  legend: [
    { label: 'Tree', token: 'sim-tree' },
    { label: 'Burning', token: 'sim-fire' },
    { label: 'Burned', token: 'sim-burned' },
    { label: 'Empty', token: 'sim-empty' },
  ],
  emptyToken: 'sim-empty',
  preview: {
    background: [['sim-tree', 6], ['sim-empty', 3], ['sim-burned', 2], ['sim-fire', 1]],
    dots: [],
  },
};

const DIFFUSION: ModelConfig = {
  id: 'diffusion',
  name: 'Diffusion of Innovations',
  tagline: 'Technology adoption S-curves',
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
  icon: Lightbulb,
  defaultParams: {
    width: 40, height: 30,
    density: 85,         // percent
    innovation_coeff: 1, // x0.001
    imitation_coeff: 50, // x0.01
    initial_adopters: 3,
  },
  parameterConfig: [
    { key: 'width', label: 'Grid width', type: 'integer', min: 15, max: 80, step: 5, default: 40, unit: 'cells' },
    { key: 'height', label: 'Grid height', type: 'integer', min: 15, max: 60, step: 5, default: 30, unit: 'cells' },
    { key: 'density', label: 'Population density', type: 'integer', min: 40, max: 100, step: 5, default: 85, unit: '%' },
    { key: 'innovation_coeff', label: 'Innovation coefficient p', type: 'integer', min: 0, max: 20, step: 1, default: 1, unit: '×0.001', live: true,
      hint: 'Chance per step that an agent adopts on its own.' },
    { key: 'imitation_coeff', label: 'Imitation coefficient q', type: 'integer', min: 5, max: 100, step: 5, default: 50, unit: '×0.01', live: true,
      hint: 'Scaled by the share of neighbors who already adopted.' },
    { key: 'initial_adopters', label: 'Seed adopters', type: 'integer', min: 1, max: 20, step: 1, default: 3 },
  ],
  metrics: [
    { key: 'adopters', label: 'Adopters', token: 'sim-adopter' },
    { key: 'non_adopters', label: 'Non-adopters', token: 'chart-1' },
  ],
  countDisplay: [
    { key: 'adopters', label: 'Adopters', token: 'sim-adopter' },
    { key: 'non_adopters', label: 'Non-adopters', token: 'sim-non-adopter' },
  ],
  agentStyles: {
    non_adopter: { layer: 'dot', token: 'sim-non-adopter', size: 0.55 },
    adopter: { layer: 'dot', token: 'sim-adopter', size: 0.65 },
  },
  legend: [
    { label: 'Non-adopter', token: 'sim-non-adopter' },
    { label: 'Adopter', token: 'sim-adopter' },
  ],
  emptyToken: 'sim-empty',
  preview: {
    background: [['sim-empty', 1]],
    dots: [['sim-non-adopter', 5], ['sim-adopter', 3]],
  },
};

const SCHELLING: ModelConfig = {
  id: 'schelling',
  name: 'Schelling Segregation',
  tagline: 'Emergence of residential segregation',
  description:
    'Each household only wants a fraction of its neighbors to be the same type. ' +
    'Even mild preferences produce striking macro-level segregation — a famous example of emergence.',
  concepts: ['Emergence', 'Self-organization', 'Tipping points', 'Micro-macro link'],
  rules: [
    'Two types of agents (blue and orange) share a grid with some empty cells',
    'An agent is "happy" if at least the homophily share of its neighbors are the same type',
    'Unhappy agents move to a random empty cell each step',
    'The model converges when nearly all agents are happy',
  ],
  icon: Home,
  defaultParams: {
    width: 30, height: 30,
    density: 80,      // percent
    minority_pct: 30, // percent
    homophily: 30,    // percent
  },
  parameterConfig: [
    { key: 'width', label: 'Grid width', type: 'integer', min: 15, max: 60, step: 5, default: 30, unit: 'cells' },
    { key: 'height', label: 'Grid height', type: 'integer', min: 15, max: 60, step: 5, default: 30, unit: 'cells' },
    { key: 'density', label: 'Occupancy', type: 'integer', min: 40, max: 95, step: 5, default: 80, unit: '%' },
    { key: 'minority_pct', label: 'Minority share (orange)', type: 'integer', min: 10, max: 50, step: 5, default: 30, unit: '%' },
    { key: 'homophily', label: 'Homophily threshold', type: 'integer', min: 0, max: 80, step: 5, default: 30, unit: '%', live: true,
      hint: 'Minimum share of same-type neighbors an agent needs to stay put.' },
  ],
  metrics: [
    { key: 'happy_pct', label: 'Happy (%)', token: 'sim-happy' },
    { key: 'type_a', label: 'Blue', token: 'sim-type-a' },
    { key: 'type_b', label: 'Orange', token: 'sim-type-b' },
  ],
  countDisplay: [
    { key: 'type_a', label: 'Blue', token: 'sim-type-a' },
    { key: 'type_b', label: 'Orange', token: 'sim-type-b' },
    { key: 'happy_pct', label: 'Happy', token: 'sim-happy', format: 'percent' },
  ],
  agentStyles: {
    type_a: { layer: 'dot', token: 'sim-type-a', size: 0.7 },
    type_b: { layer: 'dot', token: 'sim-type-b', size: 0.7 },
  },
  legend: [
    { label: 'Blue (majority)', token: 'sim-type-a' },
    { label: 'Orange (minority)', token: 'sim-type-b' },
  ],
  emptyToken: 'sim-empty',
  preview: {
    background: [['sim-empty', 1]],
    dots: [['sim-type-a', 5], ['sim-type-b', 3]],
  },
};

const WEALTH: ModelConfig = {
  id: 'wealth',
  name: 'Wealth Distribution',
  tagline: 'Sugarscape and the emergence of inequality',
  description:
    'Agents with different vision and metabolism compete for sugar on a landscape ' +
    'with two "mountains". Watch the Gini coefficient rise as wealth concentrates, even with no ' +
    'initial inequality.',
  concepts: ['Wealth inequality', 'Gini coefficient', 'Resource competition', 'Pareto principle'],
  rules: [
    'Each agent has a random vision range (how far they can see) and metabolism (sugar cost per step)',
    'Agents move to the richest visible, unoccupied cell each step',
    'Agents eat all sugar at their current cell; sugar slowly regrows',
    'Agents with no sugar die and are replaced by new agents with minimal wealth',
  ],
  icon: Coins,
  defaultParams: {
    width: 40, height: 30,
    num_agents: 200,
    max_vision: 5,
    max_metabolism: 4,
    max_initial_sugar: 20,
  },
  parameterConfig: [
    { key: 'width', label: 'Grid width', type: 'integer', min: 20, max: 80, step: 10, default: 40, unit: 'cells' },
    { key: 'height', label: 'Grid height', type: 'integer', min: 20, max: 60, step: 10, default: 30, unit: 'cells' },
    { key: 'num_agents', label: 'Agents', type: 'integer', min: 50, max: 500, step: 50, default: 200 },
    { key: 'max_vision', label: 'Max vision', type: 'integer', min: 1, max: 10, step: 1, default: 5, unit: 'cells' },
    { key: 'max_metabolism', label: 'Max metabolism', type: 'integer', min: 1, max: 8, step: 1, default: 4, unit: 'sugar/step' },
    { key: 'max_initial_sugar', label: 'Max sugar per cell', type: 'integer', min: 5, max: 40, step: 5, default: 20 },
  ],
  metrics: [
    { key: 'mean_wealth', label: 'Mean wealth', token: 'sim-wealth' },
    { key: 'gini', label: 'Gini ×100', token: 'sim-gini' },
    { key: 'agents', label: 'Agents', token: 'sim-population' },
  ],
  countDisplay: [
    { key: 'agents', label: 'Agents', token: 'sim-person' },
    { key: 'mean_wealth', label: 'Mean wealth', token: 'sim-wealth', format: 'decimal', detail: 'sugar per agent' },
    { key: 'gini', label: 'Gini coefficient', token: 'sim-gini', format: 'decimal', detail: '0 = equal, 1 = one agent owns all' },
  ],
  agentStyles: {
    sugar_empty: { layer: 'background', token: 'sim-sugar-none' },
    sugar_depleted: { layer: 'background', token: 'sim-sugar-depleted' },
    sugar_low: { layer: 'background', token: 'sim-sugar-low' },
    sugar_med: { layer: 'background', token: 'sim-sugar-med' },
    sugar_high: { layer: 'background', token: 'sim-sugar-high' },
    person: { layer: 'dot', token: 'sim-person', size: 0.5 },
  },
  legend: [
    { label: 'No sugar', token: 'sim-sugar-none' },
    { label: 'Low sugar', token: 'sim-sugar-low' },
    { label: 'Medium sugar', token: 'sim-sugar-med' },
    { label: 'High sugar', token: 'sim-sugar-high' },
    { label: 'Agent', token: 'sim-person' },
  ],
  emptyToken: 'sim-sugar-none',
  preview: {
    background: [['sim-sugar-none', 3], ['sim-sugar-low', 3], ['sim-sugar-med', 2], ['sim-sugar-high', 2]],
    dots: [['sim-person', 1]],
  },
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

/** Every token a model's visuals need, for resolving colors from CSS in one pass. */
export function modelTokens(config: ModelConfig): Token[] {
  const tokens = new Set<Token>([config.emptyToken, 'sim-grid-line', 'canvas-bg']);
  for (const style of Object.values(config.agentStyles)) {
    tokens.add(style.token);
    if (style.outline) tokens.add(style.outline);
  }
  config.metrics.forEach((m) => tokens.add(m.token));
  config.legend.forEach((l) => tokens.add(l.token));
  config.countDisplay.forEach((c) => c.token && tokens.add(c.token));
  return [...tokens];
}

/**
 * Transform integer-encoded slider values into the floats the backend expects.
 * Sliders use integers for UX (e.g. transmission rate 0–100 %), the model needs 0–1.
 */
const SCALE: Record<string, Record<string, number>> = {
  sir: { transmission_rate: 100 },
  forest_fire: { tree_density: 100, spread_prob: 100 },
  diffusion: { density: 100, innovation_coeff: 1000, imitation_coeff: 100 },
  schelling: { density: 100, minority_pct: 100, homophily: 100 },
};

export function transformParams(modelId: string, params: Record<string, number>): Record<string, number> {
  const scales = SCALE[modelId] ?? {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(params)) {
    out[key] = scales[key] ? Math.round(value) / scales[key] : value;
  }
  return out;
}
