import type { GridState, HistoryPoint } from '../types';
import type { Challenge, ChallengeContext, GoalStatus } from './types';

// ─────────────────────────── Metric helpers ───────────────────────────

const peak = (h: HistoryPoint[], key: string) => h.reduce((m, r) => Math.max(m, r[key] ?? 0), 0);
const last = (h: HistoryPoint[], key: string) => (h.length ? h[h.length - 1][key] ?? 0 : 0);
const first = (h: HistoryPoint[], key: string) => (h.length ? h[0][key] ?? 0 : 0);
const pct = (value: number) => `${value.toFixed(1)}%`;

/**
 * Average share of an agent's occupied neighbors (8 surrounding cells) that are its own
 * type. A random mix scores about the population share of each type (~57% at a 70/30 split).
 */
export function segregationIndex(state: GridState | null): number | null {
  if (!state || state.agents.length === 0) return null;
  const grid = new Map<number, string>();
  const key = (x: number, y: number) => y * state.width + x;
  for (const a of state.agents) grid.set(key(a.x, a.y), a.type);
  let total = 0, counted = 0;
  for (const a of state.agents) {
    let same = 0, all = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const x = a.x + dx, y = a.y + dy;
        if (x < 0 || y < 0 || x >= state.width || y >= state.height) continue;
        const t = grid.get(key(x, y));
        if (!t) continue;
        all++;
        if (t === a.type) same++;
      }
    }
    if (all) {
      total += same / all;
      counted++;
    }
  }
  return counted ? (total / counted) * 100 : null;
}

/** Has the fire reached the right-hand column (it starts on the left)? */
export function fireCrossed(state: GridState | null): boolean {
  if (!state) return false;
  return state.agents.some((a) => a.x === state.width - 1 && (a.type === 'burned' || a.type === 'fire'));
}

const atMost = (value: number, limit: number, final: boolean): GoalStatus =>
  value > limit ? 'failed' : final ? 'met' : 'pending';
const reachBy = (reached: boolean, step: number, by: number, final: boolean): GoalStatus =>
  reached ? 'met' : step >= by || final ? 'failed' : 'pending';
const finalCheck = (ok: boolean, final: boolean): GoalStatus => (final ? (ok ? 'met' : 'failed') : 'pending');

// ─────────────────────────── Challenges ───────────────────────────

const sirInfectedShare = ({ history }: ChallengeContext) => {
  const total = first(history, 'susceptible') + first(history, 'infected') + first(history, 'recovered');
  return total ? 100 - (last(history, 'susceptible') / total) * 100 : 0;
};

export const CHALLENGES: Challenge[] = [
  // ── SIR ──
  {
    id: 'sir-flatten',
    model: 'sir',
    title: 'Flatten the curve',
    level: 'Beginner',
    brief:
      'A new disease spreads with at least 20% transmission per contact. You can’t stop it, but you can shorten how long people stay infectious, as isolation or treatment would. Keep the peak below the hospitals’ capacity: at most 20% of the population infected at once.',
    horizon: 400,
    start: { transmission_rate: 30, recovery_time: 14 },
    editable: { transmission_rate: { min: 20 }, recovery_time: {} },
    goals: [
      {
        id: 'peak',
        label: 'Peak infected ≤ 20% of the population',
        evaluate: ({ history, params, final }) => {
          const share = (peak(history, 'infected') / params.population) * 100;
          return { status: atMost(share, 20, final), value: `peak ${pct(share)}` };
        },
      },
    ],
    hints: [
      'R₀ grows with both the transmission rate and the time someone stays infectious.',
      'Try the minimum transmission rate first, then shorten the recovery time step by step.',
    ],
    insight:
      'Peak height depends on R₀, and R₀ ≈ contacts × transmission × infectious time. Halving the infectious time roughly halves R₀, so shorter illness flattens the curve as effectively as fewer transmissions.',
    lesson: 'epidemics',
  },
  {
    id: 'sir-goldilocks',
    model: 'sir',
    title: 'The Goldilocks outbreak',
    level: 'Advanced',
    brief:
      'Find a disease right at the epidemic threshold: one that infects at least a quarter of the population in total, but leaves at least half untouched. Too contagious and almost everyone gets it; too weak and it fizzles out.',
    horizon: 600,
    start: { transmission_rate: 30, recovery_time: 14 },
    editable: { transmission_rate: {}, recovery_time: {} },
    goals: [
      {
        id: 'atleast',
        label: 'At least 25% infected in total',
        evaluate: (ctx) => {
          const share = sirInfectedShare(ctx);
          return { status: share >= 25 ? 'met' : ctx.final ? 'failed' : 'pending', value: `${pct(share)} ever infected` };
        },
      },
      {
        id: 'atmost',
        label: 'At most 50% infected in total',
        evaluate: (ctx) => {
          const share = sirInfectedShare(ctx);
          return { status: atMost(share, 50, ctx.final), value: `${pct(share)} ever infected` };
        },
      },
    ],
    hints: [
      'Near R₀ = 1 small changes matter a lot. Make tiny adjustments.',
      'Very low transmission (a few percent) with a long recovery time sits close to the threshold.',
      'Outcomes near a threshold are noisy. If a setting almost works, run it again with another seed.',
    ],
    insight:
      'Near R₀ = 1 the final size of an epidemic is extremely sensitive and highly variable between runs. That is why early outbreak forecasts carry wide uncertainty.',
    lesson: 'epidemics',
  },

  // ── Forest fire ──
  {
    id: 'fire-firebreak',
    model: 'forest_fire',
    title: 'Firebreak',
    level: 'Beginner',
    brief:
      'The forest is dense (75% trees) and that won’t change. Damp weather lowers the chance that fire jumps between trees. How damp must it be to save the forest? Burn no more than 20% of the trees.',
    horizon: 1000,
    start: { tree_density: 75, spread_prob: 100 },
    editable: { spread_prob: {} },
    goals: [
      {
        id: 'burned',
        label: 'At most 20% of trees burned',
        evaluate: ({ history, final }) => {
          const trees = first(history, 'trees') + first(history, 'fire');
          const burned = trees ? ((last(history, 'burned') + last(history, 'fire')) / trees) * 100 : 0;
          return { status: atMost(burned, 20, final), value: `${pct(burned)} burned` };
        },
      },
    ],
    hints: ['Lowering the spread probability acts like thinning the forest: fewer trees effectively pass the fire on.'],
    insight:
      'Spread probability and tree density combine into one effective density. Below a critical value, every fire dies out locally; above it, fires sweep the whole forest. The switch is sharp, not gradual.',
    lesson: 'percolation',
  },
  {
    id: 'fire-edge',
    model: 'forest_fire',
    title: 'On the edge',
    level: 'Advanced',
    brief:
      'With fire spreading every time (100%), find the sparsest forest the fire can still cross from the left edge to the right. Density must be at most 60%.',
    horizon: 1000,
    start: { tree_density: 50, spread_prob: 100 },
    editable: { tree_density: { max: 60 }, width: {}, height: {} },
    goals: [
      {
        id: 'cross',
        label: 'Fire reaches the right edge',
        evaluate: ({ state, final }) => {
          const crossed = fireCrossed(state);
          return { status: crossed ? 'met' : final ? 'failed' : 'pending', value: crossed ? 'crossed' : 'not yet' };
        },
      },
    ],
    hints: [
      'The critical density on a square grid is about 59.3%.',
      'Right at the threshold, crossing is a matter of luck. Try several seeds.',
      'A narrower forest (smaller width) is easier to cross.',
    ],
    insight:
      'At the critical density, the forest forms clusters of every size, and whether one spans the grid is down to chance. That randomness right at a tipping point is a signature of a phase transition.',
    lesson: 'percolation',
  },

  // ── Diffusion ──
  {
    id: 'diffusion-no-wom',
    model: 'diffusion',
    title: 'No word of mouth',
    level: 'Beginner',
    brief:
      'Imagine a product nobody talks about: imitation is locked at its minimum (q = 0.05). Using only advertising (the innovation coefficient p), reach 90% adoption by step 60.',
    horizon: 60,
    start: { imitation_coeff: 5, innovation_coeff: 1 },
    editable: { innovation_coeff: {}, initial_adopters: {} },
    goals: [
      {
        id: 'ninety',
        label: '90% adoption by step 60',
        evaluate: ({ history, step, final }) => {
          const total = first(history, 'adopters') + first(history, 'non_adopters');
          const share = total ? (last(history, 'adopters') / total) * 100 : 0;
          return { status: reachBy(share >= 90, step, 60, final), value: `${pct(share)} at step ${step}` };
        },
      },
    ],
    hints: ['p is the chance per step that each person adopts on their own. Try the maximum.'],
    insight:
      'With innovation alone, adoption follows a smooth exponential approach with no S-shaped take-off. The S-curve comes from imitation, when adopters convince their neighbors.',
    lesson: 'diffusion',
  },
  {
    id: 'diffusion-viral',
    model: 'diffusion',
    title: 'Go viral',
    level: 'Intermediate',
    brief:
      'Your advertising budget is tiny (p ≤ 0.002), but people talk. Reach 90% adoption by step 15.',
    horizon: 15,
    start: { innovation_coeff: 1, imitation_coeff: 50, initial_adopters: 3 },
    editable: { innovation_coeff: { max: 2 }, imitation_coeff: {}, initial_adopters: {}, density: {} },
    goals: [
      {
        id: 'ninety',
        label: '90% adoption by step 15',
        evaluate: ({ history, step, final }) => {
          const total = first(history, 'adopters') + first(history, 'non_adopters');
          const share = total ? (last(history, 'adopters') / total) * 100 : 0;
          return { status: reachBy(share >= 90, step, 15, final), value: `${pct(share)} at step ${step}` };
        },
      },
    ],
    hints: [
      'Imitation q is the main lever. Turn it up.',
      'Word of mouth needs starting points: more seed adopters means more places where it can begin.',
    ],
    insight:
      'Imitation is self-reinforcing: each adopter creates more adopters. Seeding many starting points ("influencer" campaigns) speeds up the take-off because spreading happens in parallel.',
    lesson: 'diffusion',
  },

  // ── Schelling ──
  {
    id: 'schelling-mild',
    model: 'schelling',
    title: 'A little preference',
    level: 'Beginner',
    brief:
      'Households are tolerant: nobody demands more than 30% neighbors like themselves. Show that the city still ends up strongly segregated, with a segregation index of at least 75% after 100 steps.',
    horizon: 100,
    start: { homophily: 10 },
    editable: { homophily: { max: 30 }, density: {} },
    goals: [
      {
        id: 'segregated',
        label: 'Segregation index ≥ 75% at step 100',
        evaluate: ({ state, final }) => {
          const seg = segregationIndex(state) ?? 0;
          return { status: finalCheck(seg >= 75, final), value: `index ${pct(seg)}` };
        },
      },
    ],
    hints: ['Try the highest homophily you are allowed. Is 30% really an intolerant preference?'],
    insight:
      'Schelling’s famous result: individual preferences far milder than "I want to be in the majority" still sort a city into homogeneous areas. The macro pattern says little about individual intentions.',
    lesson: 'segregation',
  },
  {
    id: 'schelling-mixed',
    model: 'schelling',
    title: 'Happy and mixed',
    level: 'Intermediate',
    brief:
      'Everyone wants at least 20% of neighbors like themselves. Can the city keep almost everyone happy (≥ 95%) while staying mixed (segregation index ≤ 68%) after 100 steps?',
    horizon: 100,
    start: { homophily: 40 },
    editable: { homophily: { min: 20 }, density: {}, minority_pct: {} },
    goals: [
      {
        id: 'happy',
        label: 'At least 95% happy at step 100',
        evaluate: ({ history, final }) => {
          const happy = last(history, 'happy_pct');
          return { status: finalCheck(happy >= 95, final), value: `${pct(happy)} happy` };
        },
      },
      {
        id: 'mixed',
        label: 'Segregation index ≤ 68% at step 100',
        evaluate: ({ state, final }) => {
          const seg = segregationIndex(state) ?? 0;
          return { status: finalCheck(seg <= 68, final), value: `index ${pct(seg)}` };
        },
      },
    ],
    hints: [
      'Each unhappy move tends to increase clustering. Fewer moves keeps the mix.',
      'The lower the threshold, the fewer agents need to move at all.',
      'Occupancy matters too: with more neighbors, it is easier to find enough similar ones.',
    ],
    insight:
      'Below a tipping point, few agents are unhappy, few move, and the random mix survives. Above it, moves trigger more moves in a cascade. Small changes in tolerance can decide which regime a city is in.',
    lesson: 'segregation',
  },

  // ── Predator-prey ──
  {
    id: 'pp-boom',
    model: 'predator_prey',
    title: 'Population boom',
    level: 'Beginner',
    brief: 'Engineer a sheep paradise: get at least 500 sheep alive at the same time within 150 steps.',
    horizon: 150,
    start: {},
    editable: {
      width: {}, height: {}, initial_sheep: {}, initial_wolves: {},
      sheep_reproduce_threshold: {}, sheep_gain_from_food: {}, grass_regrowth_time: {},
    },
    goals: [
      {
        id: 'sheep',
        label: '500 sheep or more at once',
        evaluate: ({ history, step, final }) => {
          const max = peak(history, 'sheep');
          return { status: reachBy(max >= 500, step, 150, final), value: `peak ${max.toLocaleString()} sheep` };
        },
      },
    ],
    hints: [
      'Carrying capacity: a 20×20 world can’t feed 500 sheep. Make the world bigger.',
      'Faster-growing grass and more energy per meal turn food into lambs faster.',
    ],
    insight:
      'Population size is capped by the resource: grid area times how fast grass regrows. Raising the carrying capacity matters more than the starting number of sheep.',
    lesson: 'ecosystems',
  },
  {
    id: 'pp-coexist',
    model: 'predator_prey',
    title: 'Coexistence',
    level: 'Advanced',
    brief:
      'In the default world both species eventually die out. Find an ecosystem where sheep and wolves are both still alive after 300 steps.',
    horizon: 300,
    start: {},
    editable: {
      width: {}, height: {}, initial_sheep: {}, initial_wolves: {},
      sheep_reproduce_threshold: {}, wolf_reproduce_threshold: {},
      sheep_gain_from_food: {}, wolf_gain_from_food: {}, grass_regrowth_time: {},
    },
    goals: [
      {
        id: 'sheep',
        label: 'Sheep alive at step 300',
        evaluate: ({ history, final }) => {
          const n = last(history, 'sheep');
          return { status: n === 0 ? 'failed' : final ? 'met' : 'pending', value: `${n} sheep` };
        },
      },
      {
        id: 'wolves',
        label: 'Wolves alive at step 300',
        evaluate: ({ history, final }) => {
          const n = last(history, 'wolves');
          return { status: n === 0 ? 'failed' : final ? 'met' : 'pending', value: `${n} wolves` };
        },
      },
    ],
    hints: [
      'Small populations go extinct by bad luck at the bottom of a cycle.',
      'A larger world holds larger populations, so the low points of each cycle stay above zero.',
      'Try a 40×40 grid with more starting sheep.',
    ],
    insight:
      'Equations predict endless cycles, but real populations are made of individuals: at the bottom of a cycle a few unlucky deaths cause extinction. Larger systems buffer this "demographic noise". That is one reason habitat size matters in conservation.',
    lesson: 'ecosystems',
  },

  // ── Wealth ──
  {
    id: 'wealth-unequal',
    model: 'wealth',
    title: 'Winner takes all',
    level: 'Beginner',
    brief: 'Create a society where wealth is highly concentrated: a Gini coefficient of at least 0.50 at step 100.',
    horizon: 100,
    start: {},
    editable: { num_agents: {}, max_vision: {}, max_metabolism: {}, max_initial_sugar: {} },
    goals: [
      {
        id: 'gini',
        label: 'Gini ≥ 0.50 at step 100',
        evaluate: ({ history, final }) => {
          const g = last(history, 'gini') / 100;
          return { status: finalCheck(g >= 0.5, final), value: `Gini ${g.toFixed(2)}` };
        },
      },
    ],
    hints: [
      'What happens if most agents can barely see where the sugar is?',
      'Try lowering the maximum vision.',
    ],
    insight:
      'When information (vision) is scarce, a few agents who happen to start near a sugar mountain keep their advantage while others wander. Unequal access to information compounds into unequal wealth.',
    lesson: 'inequality',
  },
  {
    id: 'wealth-fair',
    model: 'wealth',
    title: 'A fairer island',
    level: 'Intermediate',
    brief: 'With 200 agents on the island, bring the Gini coefficient down to 0.30 or less at step 100.',
    horizon: 100,
    start: { num_agents: 200 },
    editable: { max_vision: {}, max_metabolism: {}, max_initial_sugar: {} },
    goals: [
      {
        id: 'gini',
        label: 'Gini ≤ 0.30 at step 100',
        evaluate: ({ history, final }) => {
          const g = last(history, 'gini') / 100;
          return { status: finalCheck(g <= 0.3, final), value: `Gini ${g.toFixed(2)}` };
        },
      },
    ],
    hints: [
      'Inequality grows from differences between agents. Which difference costs agents the most every step?',
      'Try reducing the maximum metabolism.',
    ],
    insight:
      'Heterogeneity drives inequality: when everyone burns sugar at nearly the same low rate, nobody falls far behind. Inequality in this model comes from differences in traits, amplified over time, not from different starting wealth.',
    lesson: 'inequality',
  },
];

export const CHALLENGE_BY_ID: Record<string, Challenge> = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));
export const challengesForModel = (model: string) => CHALLENGES.filter((c) => c.model === model);
