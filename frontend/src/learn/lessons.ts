import type { Lesson } from './types';

/**
 * Lesson content. Text supports **bold**, *emphasis* and `code`; separate paragraphs
 * with a blank line. Simulation parameters are in slider units (see configs.ts).
 */
export const LESSONS: Lesson[] = [
  // ─────────────────────────── 1 ───────────────────────────
  {
    id: 'intro',
    title: 'What is an agent-based model?',
    summary: 'Agents, rules and environments, and how simple local behavior produces surprising global patterns.',
    model: 'schelling',
    minutes: 10,
    level: 'Beginner',
    objectives: [
      'Name the building blocks of an agent-based model',
      'Explain what “emergence” means with an example',
      'Say when agent-based modeling is a good tool, and when it isn’t',
    ],
    sections: [
      {
        id: 'building-blocks',
        title: 'The building blocks',
        blocks: [
          {
            kind: 'text',
            text:
              'An **agent-based model** (ABM) simulates a system from the bottom up. Instead of writing one equation for a whole population, you describe individuals: what they know, what they want and how they act. Then you let them loose and watch what happens.\n\nEvery model on this platform is built from the same four parts.',
          },
          {
            kind: 'concepts',
            items: [
              { term: 'Agent', text: 'An individual with its own state: a sheep with energy, a household with a type, a person who is infected or not.' },
              { term: 'Environment', text: 'The space agents live in. Here it is always a grid of cells, sometimes with resources like grass or sugar.' },
              { term: 'Rules', text: 'What each agent does on its turn, usually based only on what it can see nearby.' },
              { term: 'Step', text: 'One tick of the clock. Every agent gets a turn, then the model records its measurements.' },
            ],
          },
          { kind: 'figure', figure: 'abm-loop', caption: 'Agents act on local information. Their combined actions create a global pattern, which in turn changes what each agent sees.' },
        ],
      },
      {
        id: 'emergence',
        title: 'Emergence',
        blocks: [
          {
            kind: 'text',
            text:
              'The most important idea in agent-based modeling is **emergence**: patterns at the level of the whole system that no single agent intends or even knows about. Traffic jams, flocks of birds, market crashes and city neighborhoods are all emergent.\n\nTry it with a classic. In the model below, blue and orange households each want *at least 30%* of their neighbors to be like them. That is a tolerant rule: they are happy to be in a 70% minority. Unhappy households move to a random empty spot.',
          },
          {
            kind: 'question',
            question: {
              id: 'intro-predict',
              type: 'predict',
              prompt: 'Before you run it: what will the city look like after 50 steps?',
              options: ['Still well mixed', 'A little clustering here and there', 'Clearly separated blue and orange areas'],
              reveal:
                'Most people expect a mild rule to produce a mild result, but the city sorts itself into clearly separated areas. Nobody in the model wants segregation; it emerges from many small moves. Run it and see.',
            },
          },
          { kind: 'sim', model: 'schelling', controls: ['homophily'], prompt: 'Run the model, then try homophily at 10% and at 50%. How does the final pattern change?' },
        ],
      },
      {
        id: 'why',
        title: 'Why simulate?',
        blocks: [
          {
            kind: 'text',
            text:
              'Classic models describe averages with equations: “the infected population grows at rate β·S·I”. They are elegant and fast, but they assume everyone is the same and everyone mixes with everyone.\n\nAgent-based models are useful when those assumptions break:',
          },
          {
            kind: 'list',
            items: [
              '**Heterogeneity**: agents differ (vision, metabolism, tolerance), and the differences matter.',
              '**Space and networks**: who interacts with whom changes the outcome.',
              '**Adaptation**: agents change their behavior in response to what happens.',
              '**Small numbers and chance**: a population of 12 wolves can die out by bad luck; an equation never does.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'The trade-off',
            text: 'ABMs are harder to analyze, have many parameters and give different results each run. You need many runs and careful experiments to draw conclusions. Lesson 8 covers how.',
          },
        ],
      },
      {
        id: 'check',
        title: 'Check your understanding',
        blocks: [
          {
            kind: 'question',
            question: {
              id: 'intro-q1',
              type: 'choice',
              prompt: 'Which statement best describes emergence?',
              options: [
                { text: 'Agents are programmed to produce a specific global pattern.', feedback: 'No. If the pattern is programmed in, it isn’t emergent.' },
                { text: 'A system-level pattern arises from local interactions that don’t mention that pattern.', correct: true },
                { text: 'The model produces random output each time.', feedback: 'Randomness is common in ABMs, but emergence is about structure, not noise.' },
              ],
              explanation: 'Segregation emerged in the Schelling model even though no rule says “form segregated areas”.',
            },
          },
          {
            kind: 'question',
            question: {
              id: 'intro-q2',
              type: 'choice',
              prompt: 'In the Schelling model, what information does a household use to decide whether to move?',
              options: [
                { text: 'The overall segregation level of the city', feedback: 'Agents never see the whole city; they only see their surroundings.' },
                { text: 'The types of its immediate neighbors', correct: true },
                { text: 'The average happiness of all households', feedback: 'That is a measurement the modeler makes, not something agents know.' },
              ],
              explanation: 'Agents act on local information only. Global measures, like the share of happy agents, are what we observe from the outside.',
            },
          },
          {
            kind: 'question',
            question: {
              id: 'intro-q3',
              type: 'choice',
              prompt: 'When is an agent-based model a particularly good choice?',
              options: [
                { text: 'When everyone in the system behaves identically and mixes randomly', feedback: 'Then a simple equation-based model is usually enough and much faster.' },
                { text: 'When individual differences, space or adaptation matter', correct: true },
                { text: 'When you need one exact, repeatable prediction', feedback: 'ABMs are usually stochastic: you study distributions of outcomes over many runs.' },
              ],
              explanation: 'ABMs shine when heterogeneity, local interaction or behavior change drive the outcome.',
            },
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 2 ───────────────────────────
  {
    id: 'epidemics',
    title: 'Epidemics and the SIR model',
    summary: 'How diseases spread, what R₀ means, and why herd immunity doesn’t require everyone to be immune.',
    model: 'sir',
    minutes: 15,
    level: 'Beginner',
    objectives: [
      'Describe the S, I and R compartments',
      'Estimate R₀ from contacts, transmission and duration',
      'Compute the herd immunity threshold',
    ],
    sections: [
      {
        id: 'compartments',
        title: 'Three kinds of people',
        blocks: [
          {
            kind: 'text',
            text:
              'In 1927, Kermack and McKendrick split a population into three groups, or **compartments**. Almost every epidemic model since builds on their idea.',
          },
          { kind: 'figure', figure: 'sir-flow', caption: 'People move one way through the compartments. The infected curve rises, peaks and falls as susceptible people run out.' },
          {
            kind: 'concepts',
            items: [
              { term: 'Susceptible', text: 'Can catch the disease.' },
              { term: 'Infected', text: 'Has the disease and can pass it to neighbors.' },
              { term: 'Recovered', text: 'Immune for good; no longer part of the chain.' },
            ],
          },
          {
            kind: 'text',
            text: 'In our agent version, people wander a grid. Each step, every infected person may infect each susceptible neighbor with probability equal to the **transmission rate**, and recovers after the **recovery time**.',
          },
        ],
      },
      {
        id: 'r0',
        title: 'R₀: the reproduction number',
        blocks: [
          {
            kind: 'text',
            text:
              'The **basic reproduction number R₀** is the average number of people one infected person infects in a fully susceptible population. Roughly:\n\n**R₀ ≈ contacts per day × chance of transmission per contact × days infectious**\n\nIf R₀ > 1, each case causes more than one new case and the outbreak grows. If R₀ < 1, it fizzles out. R₀ = 1 is the **epidemic threshold**.',
          },
          {
            kind: 'question',
            question: {
              id: 'r0-calc',
              type: 'number',
              prompt: 'An infected person meets 4 susceptible people a day, infects each with probability 0.25, and is infectious for 3 days. What is R₀?',
              answer: 3,
              tolerance: 0.05,
              explanation: '4 contacts × 0.25 × 3 days = 3. Each case causes about three new ones, so the epidemic grows quickly.',
            },
          },
          {
            kind: 'callout',
            tone: 'info',
            title: 'Real diseases',
            text: 'Seasonal flu has an R₀ of roughly 1–2, and measles 12–18. The same formula shows the levers for control: fewer contacts (distancing), lower transmission (masks, hygiene), or a shorter infectious period (isolation, treatment).',
          },
        ],
      },
      {
        id: 'run',
        title: 'Run an outbreak',
        blocks: [
          {
            kind: 'text',
            text: 'The defaults describe a very contagious disease. Run it once, then pull the two levers. Both sliders are live, so you can change them mid-outbreak.',
          },
          { kind: 'sim', model: 'sir', controls: ['transmission_rate', 'recovery_time'], prompt: 'Find a setting where the infected curve stays low and flat. Which lever is more effective?' },
          {
            kind: 'question',
            question: {
              id: 'sir-predict',
              type: 'predict',
              prompt: 'If you halve the recovery time, what happens to the epidemic peak?',
              options: ['It barely changes', 'It drops a lot', 'It rises, because people recover and move around'],
              reveal: 'Halving the infectious time roughly halves R₀, so the peak drops sharply. In this model, recovery time 14 gives a peak above 90%, and recovery time 4 gives about 33% (median of 10 runs).',
            },
          },
        ],
      },
      {
        id: 'herd',
        title: 'Herd immunity',
        blocks: [
          {
            kind: 'text',
            text:
              'An outbreak doesn’t need to infect everyone to stop. Once enough people are immune, each case meets too few susceptible people to replace itself, and the effective reproduction number drops below 1.\n\nThe **herd immunity threshold** is the immune share at which that happens:\n\n**threshold = 1 − 1/R₀**',
          },
          {
            kind: 'question',
            question: {
              id: 'herd-calc',
              type: 'choice',
              prompt: 'A disease has R₀ = 4. What share of the population must be immune to stop it spreading?',
              options: [
                { text: '25%', feedback: 'That is 1/R₀, the share that can remain susceptible.' },
                { text: '50%' },
                { text: '75%', correct: true },
                { text: '100%', feedback: 'Herd immunity works precisely because you don’t need everyone immune.' },
              ],
              explanation: '1 − 1/4 = 0.75. With 75% immune, each case meets on average only one susceptible person who would catch it.',
            },
          },
          {
            kind: 'callout',
            tone: 'success',
            title: 'Try the challenges',
            text: '“Flatten the curve” and “The Goldilocks outbreak” put these ideas to work.',
          },
        ],
      },
      {
        id: 'quiz',
        title: 'Quiz',
        blocks: [
          {
            kind: 'question',
            question: {
              id: 'epi-q1',
              type: 'choice',
              prompt: 'Why does the infected curve eventually fall, even if nobody changes behavior?',
              options: [
                { text: 'The disease becomes weaker over time', feedback: 'The transmission rate stays constant in this model.' },
                { text: 'Susceptible people run out, so each case causes fewer new ones', correct: true },
                { text: 'Agents stop moving', feedback: 'Agents keep moving throughout the run.' },
              ],
              explanation: 'As immunity builds, the effective reproduction number drops below 1 and the epidemic declines.',
            },
          },
          {
            kind: 'question',
            question: {
              id: 'epi-q2',
              type: 'choice',
              prompt: 'Which change does NOT lower R₀?',
              options: [
                { text: 'Fewer contacts per day' },
                { text: 'A shorter infectious period' },
                { text: 'A larger initial number of infected people', correct: true },
                { text: 'Lower transmission per contact' },
              ],
              explanation: 'R₀ is a property of the disease and behavior. More initial cases make the outbreak start faster but don’t change R₀.',
            },
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 3 ───────────────────────────
  {
    id: 'percolation',
    title: 'Tipping points: percolation',
    summary: 'Why a forest at 55% density survives a fire and one at 65% burns down: critical thresholds and phase transitions.',
    model: 'forest_fire',
    minutes: 12,
    level: 'Beginner',
    objectives: [
      'Distinguish von Neumann and Moore neighborhoods',
      'Explain a critical threshold and a phase transition',
      'Recognize percolation in other systems',
    ],
    sections: [
      {
        id: 'neighbors',
        title: 'Who counts as a neighbor?',
        blocks: [
          {
            kind: 'text',
            text: 'On a grid, “nearby” needs a definition. The two common choices give agents 4 or 8 neighbors. The forest fire spreads only north, east, south and west.',
          },
          { kind: 'figure', figure: 'neighborhoods', caption: 'The highlighted cells are the neighbors of the burning cell in the center.' },
          {
            kind: 'text',
            text: 'This choice changes results. With diagonals, fire has more paths and spreads through sparser forests. Always check which neighborhood a model uses.',
          },
        ],
      },
      {
        id: 'threshold',
        title: 'The critical threshold',
        blocks: [
          {
            kind: 'question',
            question: {
              id: 'perc-predict',
              type: 'predict',
              prompt: 'Fire starts on the left edge. Going from 50% to 70% tree density, how does the chance that fire crosses to the right edge change?',
              options: ['Steadily, a bit more with each extra percent', 'Hardly at all, then suddenly almost certain', 'It is always about 50%'],
              reveal: 'It switches suddenly. Below about 59% the fire almost never crosses; a few percent higher it almost always does. The chart below was measured from this very model.',
            },
          },
          { kind: 'figure', figure: 'percolation', caption: 'Measured in this app: share of 10 runs per density (60×40 grid, spread 100%) in which the fire crossed the forest.' },
          {
            kind: 'text',
            text:
              'This is **percolation**. Below the **critical density** (about 59.3% on a square grid with 4 neighbors), trees form isolated clusters and fire burns out inside one. Above it, one giant cluster spans the forest.\n\nA small change in a cause that produces a large, sudden change in the outcome is called a **phase transition**, like water turning to ice at 0 °C.',
          },
        ],
      },
      {
        id: 'run',
        title: 'Find the tipping point',
        blocks: [
          { kind: 'sim', model: 'forest_fire', params: { tree_density: 55 }, controls: ['tree_density'], prompt: 'Try 55%, then 60%, then 65%. Run each setting a few times. Where are results most unpredictable?' },
          {
            kind: 'callout',
            tone: 'info',
            title: 'Look for it everywhere',
            text: 'Percolation describes coffee through grounds, oil through rock, disease through a partly vaccinated population, and cascading failures in power grids.',
          },
        ],
      },
      {
        id: 'quiz',
        title: 'Quiz',
        blocks: [
          {
            kind: 'question',
            question: {
              id: 'perc-q1',
              type: 'choice',
              prompt: 'Near the critical density, why do repeated runs give very different results?',
              options: [
                { text: 'The model has a bug', feedback: 'It is a real property of systems at a threshold.' },
                { text: 'Clusters of every size exist, so whether one spans the forest depends on chance', correct: true },
                { text: 'The fire spreads faster', feedback: 'Speed isn’t the issue; connectivity is.' },
              ],
              explanation: 'At criticality, small random differences in tree placement decide whether a spanning cluster exists.',
            },
          },
          {
            kind: 'question',
            question: {
              id: 'perc-q2',
              type: 'choice',
              prompt: 'If fire could also spread diagonally (Moore neighborhood), the critical density would be…',
              options: [
                { text: 'Higher', feedback: 'More neighbors means more paths, so fire needs fewer trees.' },
                { text: 'Lower', correct: true },
                { text: 'The same', feedback: 'The threshold depends on how cells connect.' },
              ],
              explanation: 'With 8 neighbors, the threshold for the square grid drops to about 41%.',
            },
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 4 ───────────────────────────
  {
    id: 'segregation',
    title: 'Segregation from mild preferences',
    summary: 'Schelling’s model links individual choices to city-wide patterns, and shows why macro outcomes can mislead us about intentions.',
    model: 'schelling',
    minutes: 12,
    level: 'Intermediate',
    objectives: [
      'Apply the happiness rule to a neighborhood',
      'Explain the micro-macro link',
      'Discuss what the model can and cannot tell us',
    ],
    sections: [
      {
        id: 'rule',
        title: 'The rule',
        blocks: [
          {
            kind: 'text',
            text:
              'In 1971, economist Thomas Schelling moved coins on a checkerboard to study how neighborhoods form. Each agent has one rule: *if fewer than a threshold share of my neighbors are like me, I move.* That threshold is the **homophily** parameter.',
          },
          { kind: 'figure', figure: 'schelling-rule', caption: 'The highlighted center agent compares its similar neighbors with the threshold. Empty cells don’t count.' },
          {
            kind: 'question',
            question: {
              id: 'sch-apply',
              type: 'choice',
              prompt: 'Homophily is 40%. An orange agent has 6 occupied neighbors, and 2 of them are orange. What does it do?',
              options: [
                { text: 'Stays, because 2 of 6 is enough', feedback: '2 of 6 is about 33%, which is below 40%.' },
                { text: 'Moves, because 33% < 40%', correct: true },
              ],
              explanation: 'Only occupied neighbors count: 2/6 ≈ 33%, below the 40% threshold, so the agent is unhappy and moves.',
            },
          },
        ],
      },
      {
        id: 'cascade',
        title: 'Cascades of moves',
        blocks: [
          {
            kind: 'text',
            text:
              'When one agent moves out, its old neighbors lose a similar neighbor, and some of them become unhappy and move too. Its arrival changes its new neighborhood in the same way. These **cascades** amplify small preferences into large patterns.',
          },
          { kind: 'sim', model: 'schelling', controls: ['homophily', 'density'], prompt: 'Set homophily to 20%, then 30%, then 40%. Watch how fast the share of happy agents climbs and how clustered the result is.' },
          {
            kind: 'callout',
            tone: 'info',
            title: 'Measuring segregation',
            text: 'The challenges use a segregation index: the average share of an agent’s neighbors that are its own type. A random mix scores about 57% here; homophily 30% pushes it to around 78%.',
          },
        ],
      },
      {
        id: 'limits',
        title: 'What the model does and doesn’t say',
        blocks: [
          {
            kind: 'text',
            text:
              'Schelling’s model shows that segregation **can** arise without strong prejudice. It does **not** show that real segregation **is** caused only by mild preferences. Housing markets, discrimination, income and policy all play major roles that the model leaves out.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Models are arguments, not proofs',
            text: 'A simple model proves that a mechanism is *sufficient* to produce a pattern. Whether it is the mechanism at work in a real city needs data.',
          },
        ],
      },
      {
        id: 'quiz',
        title: 'Quiz',
        blocks: [
          {
            kind: 'question',
            question: {
              id: 'sch-q1',
              type: 'choice',
              prompt: 'Observing a highly segregated city, what can we conclude about residents’ preferences?',
              options: [
                { text: 'They must strongly prefer their own group', feedback: 'Schelling showed that mild preferences can produce the same pattern.' },
                { text: 'Nothing for certain: very different preferences can produce similar patterns', correct: true },
                { text: 'They are indifferent', feedback: 'Indifferent agents never move, so the random mix would remain.' },
              ],
              explanation: 'Different micro rules can produce the same macro pattern. You can’t read intentions off outcomes.',
            },
          },
          {
            kind: 'question',
            question: {
              id: 'sch-q2',
              type: 'choice',
              prompt: 'What happens with homophily at 0%?',
              options: [
                { text: 'Everyone is happy and nobody moves', correct: true },
                { text: 'Complete segregation', feedback: 'With a 0% threshold every agent is satisfied immediately.' },
              ],
              explanation: 'No agent is ever unhappy, so the initial random mix stays exactly as it is.',
            },
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 5 ───────────────────────────
  {
    id: 'diffusion',
    title: 'How innovations spread',
    summary: 'Advertising versus word of mouth: the Bass model, S-curves, and the five adopter categories.',
    model: 'diffusion',
    minutes: 12,
    level: 'Intermediate',
    objectives: [
      'Distinguish the innovation (p) and imitation (q) coefficients',
      'Explain why adoption follows an S-curve',
      'Name Rogers’ adopter categories',
    ],
    sections: [
      {
        id: 'bass',
        title: 'Two reasons to adopt',
        blocks: [
          {
            kind: 'text',
            text:
              'In 1969, Frank Bass modeled how new products spread. People adopt for two reasons:\n\nThe **innovation coefficient p** captures adopting on your own, from advertising or curiosity. It doesn’t depend on anyone else.\n\nThe **imitation coefficient q** captures adopting because people you know already have. It grows with the share of adopters around you.',
          },
          {
            kind: 'callout',
            tone: 'info',
            title: 'Typical values',
            text: 'Studies of real products find p around 0.03 and q around 0.4: word of mouth is usually more than ten times stronger than advertising.',
          },
        ],
      },
      {
        id: 'scurve',
        title: 'The S-curve',
        blocks: [
          { kind: 'figure', figure: 's-curve', caption: 'Rogers’ adopter categories (1962). New adopters per period form a bell; the running total forms an S.' },
          {
            kind: 'text',
            text:
              'At first, few people have adopted, so imitation is weak and growth is slow. As adopters accumulate, word of mouth accelerates the spread. Eventually few non-adopters remain and growth slows again. The result is the S-curve.',
          },
        ],
      },
      {
        id: 'run',
        title: 'Experiment',
        blocks: [
          { kind: 'sim', model: 'diffusion', controls: ['innovation_coeff', 'imitation_coeff'], prompt: 'Run with the defaults, then set q to its minimum and p to its maximum. Does the curve still look like an S?' },
          {
            kind: 'question',
            question: {
              id: 'diff-predict',
              type: 'predict',
              prompt: 'With imitation at its minimum and innovation at its maximum, the adoption curve will be…',
              options: ['A sharper S', 'A smooth curve that rises fastest at the start', 'Flat'],
              reveal: 'Without word of mouth there is no take-off phase. Each step, a fixed share of the remaining non-adopters adopts, so growth is fastest at the start and slows steadily, with no S.',
            },
          },
        ],
      },
      {
        id: 'quiz',
        title: 'Quiz',
        blocks: [
          {
            kind: 'question',
            question: {
              id: 'diff-q1',
              type: 'choice',
              prompt: 'Which coefficient is responsible for the slow start and the sudden take-off?',
              options: [
                { text: 'p, innovation', feedback: 'p acts the same at every stage.' },
                { text: 'q, imitation', correct: true },
              ],
              explanation: 'Imitation is weak while few people have adopted and strong once many have. That creates the S shape.',
            },
          },
          {
            kind: 'question',
            question: {
              id: 'diff-q2',
              type: 'choice',
              prompt: 'In this grid model, why does population density matter for diffusion?',
              options: [
                { text: 'It doesn’t matter', feedback: 'Imitation depends on neighbors, so it matters.' },
                { text: 'Isolated agents have fewer neighbors to imitate, so word of mouth can’t reach them', correct: true },
                { text: 'Denser grids have higher p', feedback: 'p is a fixed parameter.' },
              ],
              explanation: 'Word of mouth needs connections. Gaps in the grid slow or block the spread.',
            },
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 6 ───────────────────────────
  {
    id: 'ecosystems',
    title: 'Predators, prey and cycles',
    summary: 'Lotka-Volterra oscillations, why predators lag behind prey, and how chance drives small populations extinct.',
    model: 'predator_prey',
    minutes: 14,
    level: 'Intermediate',
    objectives: [
      'Explain why predator and prey populations oscillate',
      'Explain why predator peaks lag prey peaks',
      'Describe demographic stochasticity and the role of system size',
    ],
    sections: [
      {
        id: 'cycles',
        title: 'Boom and bust',
        blocks: [
          {
            kind: 'text',
            text:
              'In the 1920s, Alfred Lotka and Vito Volterra independently wrote equations for predators and prey. Their prediction was endless cycles: many sheep feed many wolves; many wolves eat most sheep; then wolves starve, and sheep recover.',
          },
          { kind: 'figure', figure: 'cycles', caption: 'The Lotka-Volterra equations. Wolf peaks always follow sheep peaks.' },
          {
            kind: 'question',
            question: {
              id: 'pp-lag',
              type: 'choice',
              prompt: 'Why do wolf numbers peak after sheep numbers?',
              options: [
                { text: 'Wolves breed more slowly in general', feedback: 'The timing comes from the feedback loop, not breeding speed alone.' },
                { text: 'Wolves keep increasing as long as there are plenty of sheep, so they peak once sheep are already declining', correct: true },
                { text: 'It is random', feedback: 'The lag is systematic and appears in every cycle.' },
              ],
              explanation: 'Predators grow while food is abundant. By the time they peak, they have already eaten the prey population down.',
            },
          },
        ],
      },
      {
        id: 'agents',
        title: 'Real animals are whole numbers',
        blocks: [
          {
            kind: 'text',
            text:
              'Equations treat populations as smooth quantities: 0.3 wolves can recover. Agents can’t. At the bottom of a cycle a handful of animals remain, and a few unlucky steps wipe them out. This is **demographic stochasticity**.\n\nIn the default 20×20 world, both species usually go extinct within about 250 steps.',
          },
          { kind: 'sim', model: 'predator_prey', controls: ['width', 'height', 'initial_sheep'], prompt: 'Run the default world. Then try a 40×40 world with 200 sheep. How do the low points of the cycles change?' },
        ],
      },
      {
        id: 'size',
        title: 'Bigger worlds are safer',
        blocks: [
          {
            kind: 'text',
            text:
              'In a larger world, the low points of each cycle still contain many animals, so chance extinction becomes rare. In our tests, a 40×40 world with 200 sheep kept both species alive for 300 steps in 9 out of 10 runs; the default world did so in none.',
          },
          {
            kind: 'callout',
            tone: 'success',
            title: 'Conservation connection',
            text: 'This is one reason habitat size and connectivity matter for endangered species. Small, isolated populations can vanish by chance even when, on average, they should persist.',
          },
        ],
      },
      {
        id: 'quiz',
        title: 'Quiz',
        blocks: [
          {
            kind: 'question',
            question: {
              id: 'pp-q1',
              type: 'choice',
              prompt: 'What does the agent-based model show that the Lotka-Volterra equations don’t?',
              options: [
                { text: 'Oscillations', feedback: 'Both show oscillations.' },
                { text: 'Extinction by chance in small populations', correct: true },
                { text: 'That wolves eat sheep', feedback: 'Both include predation.' },
              ],
              explanation: 'The classic equations never reach zero. Discrete, random individuals can.',
            },
          },
          {
            kind: 'question',
            question: {
              id: 'pp-q2',
              type: 'choice',
              prompt: 'What mainly limits how many sheep the world can support?',
              options: [
                { text: 'The initial number of sheep', feedback: 'Starting numbers fade; the resource sets the ceiling.' },
                { text: 'Grass: the grid area and how fast it regrows', correct: true },
                { text: 'The number of wolves only' },
              ],
              explanation: 'That ceiling is the carrying capacity. The “Population boom” challenge explores it.',
            },
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 7 ───────────────────────────
  {
    id: 'inequality',
    title: 'Where inequality comes from',
    summary: 'Sugarscape, Lorenz curves and the Gini coefficient: how small differences compound into large inequality.',
    model: 'wealth',
    minutes: 12,
    level: 'Intermediate',
    objectives: ['Read a Lorenz curve', 'Interpret the Gini coefficient', 'Identify sources of inequality in the model'],
    sections: [
      {
        id: 'measure',
        title: 'Measuring inequality',
        blocks: [
          {
            kind: 'text',
            text:
              'Sort everyone from poorest to richest and plot the cumulative share of wealth held by each cumulative share of people. That is the **Lorenz curve**. Perfect equality is a straight diagonal; the further the curve sags, the more unequal the society.',
          },
          { kind: 'figure', figure: 'lorenz', caption: 'The Gini coefficient is the gap between the Lorenz curve and equality, as a share of the total area under the diagonal.' },
          {
            kind: 'question',
            question: {
              id: 'gini-read',
              type: 'choice',
              prompt: 'A country has a Gini coefficient of 0. What does that mean?',
              options: [
                { text: 'Everyone has exactly the same wealth', correct: true },
                { text: 'Nobody has any wealth', feedback: 'Gini measures distribution, not the total.' },
                { text: 'One person owns everything', feedback: 'That is a Gini of 1.' },
              ],
              explanation: 'Gini runs from 0 (perfect equality) to 1 (one person owns everything). Real countries range from about 0.25 to 0.65 for income.',
            },
          },
        ],
      },
      {
        id: 'sugarscape',
        title: 'Sugarscape',
        blocks: [
          {
            kind: 'text',
            text:
              'Epstein and Axtell’s *Growing Artificial Societies* (1996) placed agents on a landscape with two sugar mountains. Each agent has its own **vision** (how far it can see sugar) and **metabolism** (how much sugar it burns per step). Agents move to the richest cell they can see and eat.\n\nEveryone starts with modest, similar wealth. Watch what happens to the Gini coefficient.',
          },
          { kind: 'sim', model: 'wealth', controls: ['max_vision', 'max_metabolism'], prompt: 'Run with the defaults and watch Gini rise. Then try max vision 1, and separately max metabolism 1.' },
        ],
      },
      {
        id: 'sources',
        title: 'Three sources of inequality',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Traits**: better vision and lower metabolism are lasting advantages.',
              '**Location**: starting near a mountain is luck, and wealth helps you stay there.',
              '**Compounding**: small advantages each step add up over hundreds of steps.',
            ],
          },
          {
            kind: 'text',
            text: 'In our tests, lowering max vision to 1 raised the Gini at step 100 from about 0.44 to 0.54, while lowering max metabolism to 1 cut it to about 0.28.',
          },
        ],
      },
      {
        id: 'quiz',
        title: 'Quiz',
        blocks: [
          {
            kind: 'question',
            question: {
              id: 'ineq-q1',
              type: 'choice',
              prompt: 'Why does inequality grow in Sugarscape even though agents start with similar wealth?',
              options: [
                { text: 'Agents steal from each other', feedback: 'There is no trade or theft in this version.' },
                { text: 'Differences in traits and location compound over time', correct: true },
                { text: 'The model assigns more sugar to some agents each step', feedback: 'All agents follow the same rules.' },
              ],
              explanation: 'Identical rules plus different traits and luck produce a skewed distribution. No rule says “make some rich”.',
            },
          },
        ],
      },
    ],
  },

  // ─────────────────────────── 8 ───────────────────────────
  {
    id: 'method',
    title: 'Doing science with simulations',
    summary: 'Randomness, seeds, replication and parameter sweeps: how to turn simulation runs into trustworthy conclusions.',
    model: 'sir',
    minutes: 15,
    level: 'Advanced',
    objectives: [
      'Explain why single runs can mislead',
      'Use random seeds for reproducibility',
      'Plan a parameter sweep and distinguish verification from validation',
    ],
    sections: [
      {
        id: 'noise',
        title: 'Every run is different',
        blocks: [
          {
            kind: 'text',
            text:
              'Agents move, infect and reproduce with probabilities, so two runs with the same parameters differ. One run is an anecdote. To learn about the model, look at the **distribution** of outcomes over many runs.',
          },
          { kind: 'figure', figure: 'ensemble', caption: 'Twelve runs of the same epidemic. Individual peaks vary in timing and height; their average is the model’s typical behavior.' },
          {
            kind: 'question',
            question: {
              id: 'method-q1',
              type: 'choice',
              prompt: 'A classmate ran a model once and says “lowering transmission to 25% halves the peak”. What should you ask?',
              options: [
                { text: 'Which programming language they used', feedback: 'That doesn’t affect the conclusion.' },
                { text: 'How many runs that is based on, and how much the results vary', correct: true },
                { text: 'Nothing; one run is enough', feedback: 'With randomness, a single run can be far from typical.' },
              ],
              explanation: 'Compare averages and spreads over many replications before claiming an effect.',
            },
          },
        ],
      },
      {
        id: 'seeds',
        title: 'Random seeds',
        blocks: [
          {
            kind: 'text',
            text:
              'Computers generate “random” numbers from a starting value called a **seed**. The same seed and the same parameters reproduce a run exactly. That is essential for debugging and for sharing results.\n\nThe simulation below always uses seed `42`. Run it, note the peak, then press reset and run it again.',
          },
          { kind: 'sim', model: 'sir', params: { transmission_rate: 15, recovery_time: 8 }, seed: 42, prompt: 'Reset and run again: the curve is identical. In the model workspace, clear the seed field to get a new random run each time.' },
          {
            kind: 'callout',
            tone: 'info',
            title: 'Good practice',
            text: 'Report the seeds you used. For experiments, run seeds 1…N for every setting so that any difference between settings isn’t just luck of the draw.',
          },
        ],
      },
      {
        id: 'sweeps',
        title: 'Parameter sweeps',
        blocks: [
          {
            kind: 'text',
            text:
              'To understand a parameter, vary it systematically: for example, tree density from 50% to 70% in steps of 2, with 10 seeds each. The percolation chart in lesson 3 is exactly such a sweep.\n\nExport CSV from a model workspace to analyze runs in a spreadsheet, or use **Python code** to run a sweep in Colab with Mesa.',
          },
          {
            kind: 'question',
            question: {
              id: 'method-sweep',
              type: 'number',
              prompt: 'A sweep tests 11 density values with 10 seeds each. How many runs is that?',
              answer: 110,
              tolerance: 0,
              unit: 'runs',
              explanation: '11 × 10 = 110 runs. Sweeps get expensive quickly; with two parameters, multiply again.',
            },
          },
        ],
      },
      {
        id: 'trust',
        title: 'Can we trust the model?',
        blocks: [
          {
            kind: 'concepts',
            items: [
              { term: 'Verification', text: 'Does the code do what the model description says? Check with tests, simple cases and known results.' },
              { term: 'Validation', text: 'Does the model describe the real world well enough for its purpose? Compare with data.' },
            ],
          },
          {
            kind: 'question',
            question: {
              id: 'method-q2',
              type: 'choice',
              prompt: 'You check that with homophily 0% no Schelling agent ever moves. Is that verification or validation?',
              options: [
                { text: 'Verification', correct: true },
                { text: 'Validation', feedback: 'You compared the code with its own specification, not with real-world data.' },
              ],
              explanation: 'Testing a known special case checks that the implementation is correct: verification.',
            },
          },
          {
            kind: 'callout',
            tone: 'success',
            title: 'You’ve finished the core path',
            text: 'Try the advanced challenges. They reward exactly this kind of systematic experimenting.',
          },
        ],
      },
    ],
  },
];

export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(LESSONS.map((l) => [l.id, l]));

/** Number of graded questions (choice and number) in a lesson. */
export function gradedQuestions(lesson: Lesson) {
  return lesson.sections.flatMap((s) =>
    s.blocks.flatMap((b) => (b.kind === 'question' && b.question.type !== 'predict' ? [b.question] : [])),
  );
}
