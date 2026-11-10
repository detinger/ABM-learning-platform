# Lessons, challenges and custom models

Branch: `lessons`. Status is tracked at the end of this file.

## Goals

The app currently lets people *explore* six models. This adds a guided path that teaches the ideas behind them:

1. **Lessons**: short, illustrated readings with live simulations embedded in the text and questions that check understanding.
2. **Challenges**: goal-based tasks for each model ("keep the epidemic peak under 20%"). The app checks the result automatically.
3. **Custom models**: an assessment of whether users can build their own simulations, with a proposed design (see the end of this file).

## 1. Lessons

### Curriculum

| # | Lesson | Model | Main ideas |
|---|---|---|---|
| 1 | What is an agent-based model? | Schelling | Agents, environment, rules, steps; emergence |
| 2 | Epidemics and the SIR model | SIR | Compartments, R₀, herd immunity threshold |
| 3 | Tipping points: percolation | Forest fire | Neighborhoods, critical threshold (~59%), phase transitions |
| 4 | Segregation from mild preferences | Schelling | Micro-macro link, thresholds, limits of a model |
| 5 | How innovations spread | Diffusion | Bass model, innovation p vs imitation q, S-curve, adopter categories |
| 6 | Predators, prey and cycles | Predator-prey | Lotka-Volterra cycles, lag, stochastic extinction, system size |
| 7 | Where inequality comes from | Wealth | Lorenz curve, Gini coefficient, heterogeneity, path dependence |
| 8 | Doing science with simulations | SIR | Stochasticity, seeds, replication, parameter sweeps, verification vs validation |

### Lesson format

A lesson is split into 4–5 sections, shown one at a time:

- A progress bar.
- A sticky outline marking each section done or current.
- Previous and Next buttons.

Each section is a list of content blocks:

| Block | Purpose |
|---|---|
| Text | Paragraphs with inline **bold**, *emphasis* and `code` |
| Key idea | A highlighted term and its definition |
| Figure | A themed SVG diagram drawn for the lesson (SIR flow, neighborhoods, percolation curve, S-curve, Lorenz curve, cycles, run ensemble) |
| Live simulation | An embedded run with preset parameters and 1–2 adjustable sliders. It starts only when the reader clicks it, so a lesson page never opens several server simulations at once |
| Prediction | "What do you think will happen?" There is no wrong answer; the explanation is revealed after the reader picks one, and they then run the simulation |
| Question | Multiple choice with feedback for each option, or a numeric answer with a tolerance |
| Callout | A tip, caveat or real-world connection |

The last section is a short quiz. The completion card shows:

- the quiz score
- the next lesson
- the challenges for that lesson's model

**Progress** (sections reached, answers, completed lessons, passed challenges) is saved in the browser's `localStorage`. There are no accounts and no backend changes.

### Visual design

The lessons follow STYLE.md: tokens only, both themes, no gradients. The visual interest comes from:

- **Figures** drawn in the simulation colors, so the diagram, the live grid and the chart share one color identity.
- **Model previews** on the lesson cards.
- **Status colors on answers**: correct answers use the success color and wrong answers use the error color.
- **Step pills** in the lesson outline.

The percolation figure plots data measured from this app's own forest-fire model, not a textbook curve.

## 2. Challenges

Each challenge has:

- a brief
- locked parameters, plus the parameters the player may change (with tightened ranges)
- a step limit
- 1–3 goals, checked live while the simulation runs
- hints
- an "insight" shown on success

A goal can be *met*, *pending* or *failed*. The run pauses as soon as a goal fails, or when it reaches the step limit or a terminal state. Attempts and passes are saved.

Thresholds were checked against the real models over 10 seeds each: the default settings fail every challenge, and at least one tested setting passes.

| Model | Challenge | Level | Goal | A passing setting (tested) |
|---|---|---|---|---|
| SIR | Flatten the curve | Beginner | Peak infected ≤ 20% with transmission ≥ 20% | 20%, recovery 3: peak 6–13% |
| SIR | The Goldilocks outbreak | Advanced | 25–50% of people infected in total | 3% transmission, recovery 14 |
| Forest fire | Firebreak | Beginner | Density 75% (locked): burn ≤ 20% of trees | Spread 60–70%: 4–17% |
| Forest fire | On the edge | Advanced | Fire crosses the forest with density ≤ 60% | Density 60%: crosses in 4 of 10 seeds |
| Diffusion | No word of mouth | Beginner | q locked at 0.05: 90% adoption by step 60 | p = 0.02: step 48–52 |
| Diffusion | Go viral | Intermediate | p ≤ 0.002: 90% adoption by step 15 | q = 1.0, 20 seed adopters: step 8–12 |
| Schelling | A little preference | Beginner | Homophily ≤ 30%: segregation index ≥ 75% | 30%: 77–82% |
| Schelling | Happy and mixed | Intermediate | Homophily ≥ 20%: ≥ 95% happy and segregation ≤ 68% | 20%: 65–68% |
| Predator-prey | Population boom | Beginner | ≥ 500 sheep within 150 steps | 40×40 grid, fast grass: 880–1020 |
| Predator-prey | Coexistence | Advanced | Both species alive at step 300 | 40×40 grid, 200 sheep: 9 of 10 seeds |
| Wealth | Winner takes all | Beginner | Gini ≥ 0.50 at step 100 | Vision 1: 0.52–0.57 |
| Wealth | A fairer island | Intermediate | Gini ≤ 0.30 at step 100 | Metabolism 1: 0.27–0.29 |

The **segregation index** is the average share of an agent's neighbors that are its own type. The app computes it from the grid state. A random mix scores about 57%.

Challenges are listed at `/challenges`, and each opens at `/challenges/:id`. Each model's workspace links to its challenges.

## 3. Can users create their own simulations?

**Running user-written Python on the server: not recommended.** It means running untrusted code on a public Railway instance, which allows anyone to read secrets, use up CPU and memory, or attack other users. Doing it safely needs a real sandbox (gVisor, Firecracker, or a separate worker with strict limits). That is a large, ongoing security project for a learning app.

**Option A, a rule-based model builder: feasible, about two to three days of work.** Users pick from building blocks instead of writing code:

- **States** (2–5), each with a name and a color from the simulation palette.
- **Initial layout**: a density for each state, or "seed N cells".
- **Neighborhood**: von Neumann or Moore, with or without wrap-around edges.
- **Transition rules**: one row each, of the form "A cell in state **X** with at least **k** neighbors in state **Y** becomes **Z** with probability **p**", plus spontaneous rules ("**X** becomes **Z** with probability **p**").
- **End condition**, plus charts of the count of each state, generated automatically.

This one engine can express forest fire, SIR on a grid, Game of Life, rumor spread and majority voting. On the server it is one generic `RuleModel`. The rules are validated against fixed limits (states ≤ 5, rules ≤ 12, grid ≤ 100×100), so it is safe on a public server. Models are saved in `localStorage` and shared as a URL that encodes the rule set (no database). The existing canvas, chart, table, CSV export and Python code generator all work with it. The code generator would print the rules as Mesa code, which is an excellent learning link.

**Option B, user code that runs in the browser (Pyodide plus Mesa): feasible but heavy.** It downloads about 15 MB the first time, but it is safe because the code runs on the user's own machine. It fits a later "advanced" track. Plan on about a week of work.

**Recommendation:** build Option A next, add a lesson called "Build your own model", and reuse the challenge system for "recreate the forest fire with rules" tasks.

## Status

| Item | Status |
|---|---|
| Plan | Done |
| Content types, progress store (`localStorage`), inline text formatting | Done |
| Figures: 9 themed SVG diagrams (the percolation curve uses data measured from this app) | Done |
| 8 lessons with embedded simulations, predictions and graded questions | Done |
| 12 challenges with live goal checking and frozen verdicts | Done |
| Routes `/learn`, `/learn/:id`, `/challenges`, `/challenges/:id`; sidebar group; links from the library and the model workspace | Done |
| Checks | Type check, ESLint and build pass. Headless Chrome run: a full lesson, a numeric answer, and 6 challenge attempts (defaults fail, tested settings pass). Light and dark figures; no overflow at 390px; no console errors |
| Custom model builder (Option A) | Proposed, not started |
