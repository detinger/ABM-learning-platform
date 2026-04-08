/**
 * Generates self-contained, Google Colab-ready Python code for each ABM model.
 * Params are already backend-transformed (floats, not integers).
 */

type Params = Record<string, number>;

// ─── Predator-Prey ────────────────────────────────────────────────────────────

export function predatorPreyCode(p: Params): string {
  return `# ============================================================
# Predator-Prey Agent-Based Model  (Mesa 3)
# Concepts: Lotka-Volterra dynamics, population cycles,
#           trophic cascades, carrying capacity
# ============================================================

# %% 1 — Install dependencies
!pip install mesa numpy matplotlib networkx -q

# %% 2 — Imports
import random
import mesa
from mesa.space import MultiGrid
from mesa.datacollection import DataCollector
import matplotlib.pyplot as plt

# %% 3 — Agent definitions

class GrassPatch(mesa.Agent):
    def __init__(self, model, regrowth_time=${p.grass_regrowth_time}):
        super().__init__(model)
        self.regrowth_time = regrowth_time
        self.fully_grown = True
        self.countdown = 0

    def step(self):
        if not self.fully_grown:
            self.countdown -= 1
            if self.countdown <= 0:
                self.fully_grown = True


class Sheep(mesa.Agent):
    def __init__(self, model, energy_gain=${p.sheep_gain_from_food},
                 reproduce_threshold=${p.sheep_reproduce_threshold}, energy=None):
        super().__init__(model)
        self.energy = random.randint(1, 2 * energy_gain) if energy is None else energy
        self.energy_gain = energy_gain
        self.reproduce_threshold = reproduce_threshold

    def step(self):
        # Move to random neighbor
        neighbors = self.model.grid.get_neighborhood(self.pos, moore=True, include_center=False)
        self.model.grid.move_agent(self, random.choice(neighbors))
        # Metabolize before feeding/reproduction
        self.energy -= 1
        ate_grass = False
        # Eat grass
        for obj in self.model.grid.get_cell_list_contents([self.pos]):
            if isinstance(obj, GrassPatch) and obj.fully_grown:
                self.energy += self.energy_gain
                obj.fully_grown = False
                obj.countdown = obj.regrowth_time
                ate_grass = True
                break
        if self.energy <= 0:
            self._remove_from_world()
            return
        # Reproduce stochastically once the sheep has enough energy
        if ate_grass and self.energy >= self.reproduce_threshold and random.random() < 1 / max(1, self.reproduce_threshold):
            offspring_energy = self.energy // 2
            self.energy -= offspring_energy
            self.model.grid.place_agent(
                Sheep(self.model, self.energy_gain, self.reproduce_threshold, energy=offspring_energy), self.pos)

    def _remove_from_world(self):
        if self.pos is not None:
            self.model.grid.remove_agent(self)
        super().remove()


class Wolf(mesa.Agent):
    def __init__(self, model, energy_gain=${p.wolf_gain_from_food},
                 reproduce_threshold=${p.wolf_reproduce_threshold}, energy=None):
        super().__init__(model)
        self.energy = random.randint(1, 2 * energy_gain) if energy is None else energy
        self.energy_gain = energy_gain
        self.reproduce_threshold = reproduce_threshold

    def step(self):
        # Move toward sheep if nearby, else random
        neighbors = self.model.grid.get_neighborhood(self.pos, moore=True, include_center=False)
        sheep_pos = [p for p in neighbors
                     if any(isinstance(a, Sheep)
                            for a in self.model.grid.get_cell_list_contents([p]))]
        self.model.grid.move_agent(self, random.choice(sheep_pos if sheep_pos else neighbors))
        # Metabolize before hunting/reproduction
        self.energy -= 1
        ate_sheep = False
        # Hunt
        prey = [a for a in self.model.grid.get_cell_list_contents([self.pos])
                if isinstance(a, Sheep)]
        if prey:
            self.energy += self.energy_gain
            random.choice(prey)._remove_from_world()
            ate_sheep = True
        if self.energy <= 0:
            self._remove_from_world()
            return
        # Reproduce stochastically once the wolf has enough energy
        if ate_sheep and self.energy >= self.reproduce_threshold and random.random() < 1 / max(1, self.reproduce_threshold):
            offspring_energy = self.energy // 2
            self.energy -= offspring_energy
            self.model.grid.place_agent(
                Wolf(self.model, self.energy_gain, self.reproduce_threshold, energy=offspring_energy), self.pos)

    def _remove_from_world(self):
        if self.pos is not None:
            self.model.grid.remove_agent(self)
        super().remove()


# %% 4 — Model

class PredatorPreyModel(mesa.Model):
    def __init__(self, width=${p.width}, height=${p.height},
                 initial_sheep=${p.initial_sheep}, initial_wolves=${p.initial_wolves},
                 sheep_reproduce_threshold=${p.sheep_reproduce_threshold},
                 wolf_reproduce_threshold=${p.wolf_reproduce_threshold},
                 sheep_gain_from_food=${p.sheep_gain_from_food},
                 wolf_gain_from_food=${p.wolf_gain_from_food},
                 grass_regrowth_time=${p.grass_regrowth_time}):
        super().__init__()
        self.grid = MultiGrid(width, height, torus=True)
        self.datacollector = DataCollector(model_reporters={
            "Sheep":  lambda m: sum(1 for a in m.agents if isinstance(a, Sheep)),
            "Wolves": lambda m: sum(1 for a in m.agents if isinstance(a, Wolf)),
            "Grass":  lambda m: sum(1 for a in m.agents
                                    if isinstance(a, GrassPatch) and a.fully_grown),
        })
        for x in range(width):
            for y in range(height):
                self.grid.place_agent(GrassPatch(self, grass_regrowth_time), (x, y))
        for _ in range(initial_sheep):
            self.grid.place_agent(
                Sheep(self, sheep_gain_from_food, sheep_reproduce_threshold),
                (random.randrange(width), random.randrange(height)))
        for _ in range(initial_wolves):
            self.grid.place_agent(
                Wolf(self, wolf_gain_from_food, wolf_reproduce_threshold),
                (random.randrange(width), random.randrange(height)))
        self.running = initial_sheep > 0 or initial_wolves > 0
        self.datacollector.collect(self)

    def _shuffled_agents(self, agent_type):
        agents = list(self.agents_by_type.get(agent_type, []))
        random.shuffle(agents)
        return agents

    def _species_survive(self):
        sheep_alive = any(isinstance(a, Sheep) for a in self.agents)
        wolves_alive = any(isinstance(a, Wolf) for a in self.agents)
        return sheep_alive, wolves_alive

    def step(self):
        if not self.running:
            return

        for sheep in self._shuffled_agents(Sheep):
            if sheep in self.agents:
                sheep.step()

        for wolf in self._shuffled_agents(Wolf):
            if wolf not in self.agents:
                continue
            wolf.step()

        for grass in self._shuffled_agents(GrassPatch):
            if grass in self.agents:
                grass.step()

        self.datacollector.collect(self)
        sheep_alive, wolves_alive = self._species_survive()
        if not sheep_alive and not wolves_alive:
            self.running = False


# %% 5 — Run

model = PredatorPreyModel()
for _ in range(500):
    if model.running:
        model.step()

print(f"Ran {model.steps} steps")

# %% 6 — Visualize

data = model.datacollector.get_model_vars_dataframe()
fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(data.index, data["Sheep"],  color="#e2e8f0", linewidth=2, label="Sheep")
ax.plot(data.index, data["Wolves"], color="#ef4444", linewidth=2, label="Wolves")
ax.plot(data.index, data["Grass"],  color="#22c55e", linewidth=1.5,
        alpha=0.6, label="Grass (grown)")
ax.set_xlabel("Step")
ax.set_ylabel("Count")
ax.set_title("Predator-Prey Population Dynamics")
ax.legend()
ax.grid(True, alpha=0.3)
fig.patch.set_facecolor("#0f172a")
ax.set_facecolor("#1e293b")
for spine in ax.spines.values():
    spine.set_edgecolor("#334155")
ax.xaxis.label.set_color("white"); ax.yaxis.label.set_color("white")
ax.title.set_color("white")
ax.tick_params(colors="white")
ax.legend(facecolor="#1e293b", labelcolor="white", edgecolor="#334155")
plt.tight_layout()
plt.show()
`;
}

// ─── SIR Epidemic ─────────────────────────────────────────────────────────────

export function sirCode(p: Params): string {
  return `# ============================================================
# SIR Epidemic Agent-Based Model  (Mesa 3)
# Concepts: Disease spreading, herd immunity, R0,
#           epidemic curves, phase transitions
# ============================================================

# %% 1 — Install
!pip install mesa numpy matplotlib networkx -q

# %% 2 — Imports
import random
import mesa
from mesa.space import MultiGrid
from mesa.datacollection import DataCollector
import matplotlib.pyplot as plt

# %% 3 — Agent

class Person(mesa.Agent):
    def __init__(self, model, state="susceptible"):
        super().__init__(model)
        self.state = state
        self.infection_timer = model.recovery_time if state == "infected" else 0

    def step(self):
        # Random walk
        hood = self.model.grid.get_neighborhood(self.pos, moore=True, include_center=False)
        self.model.grid.move_agent(self, random.choice(hood))
        # Infect neighbors
        if self.state == "infected":
            for neighbor in self.model.grid.get_neighbors(self.pos, moore=True):
                if neighbor.state == "susceptible":
                    if random.random() < self.model.transmission_rate:
                        neighbor.state = "infected"
                        neighbor.infection_timer = self.model.recovery_time
            self.infection_timer -= 1
            if self.infection_timer <= 0:
                self.state = "recovered"


# %% 4 — Model

class SIRModel(mesa.Model):
    def __init__(self, width=${p.width}, height=${p.height},
                 population=${p.population}, initial_infected=${p.initial_infected},
                 transmission_rate=${p.transmission_rate},
                 recovery_time=${p.recovery_time}):
        super().__init__()
        self.transmission_rate = transmission_rate
        self.recovery_time = int(recovery_time)
        self.grid = MultiGrid(width, height, torus=True)
        self.datacollector = DataCollector(model_reporters={
            "Susceptible": lambda m: sum(1 for a in m.agents if a.state == "susceptible"),
            "Infected":    lambda m: sum(1 for a in m.agents if a.state == "infected"),
            "Recovered":   lambda m: sum(1 for a in m.agents if a.state == "recovered"),
        })
        for i in range(int(population)):
            state = "infected" if i < int(initial_infected) else "susceptible"
            p = Person(self, state)
            self.grid.place_agent(p, (random.randrange(width), random.randrange(height)))
        self.running = True
        self.datacollector.collect(self)

    def step(self):
        self.agents.shuffle_do("step")
        self.datacollector.collect(self)
        if sum(1 for a in self.agents if a.state == "infected") == 0:
            self.running = False


# %% 5 — Run

model = SIRModel()
while model.running:
    model.step()

print(f"Epidemic ended at step {model.steps}")
data = model.datacollector.get_model_vars_dataframe()
print(f"Final recovered: {data['Recovered'].iloc[-1]} "
      f"({100*data['Recovered'].iloc[-1]/data['Susceptible'].iloc[0]:.1f}%)")

# %% 6 — Visualize

fig, ax = plt.subplots(figsize=(10, 5))
ax.fill_between(data.index, data["Susceptible"], color="#3b82f6", alpha=0.3)
ax.fill_between(data.index, data["Infected"],    color="#ef4444", alpha=0.4)
ax.fill_between(data.index, data["Recovered"],   color="#22c55e", alpha=0.3)
ax.plot(data.index, data["Susceptible"], color="#3b82f6", linewidth=2, label="Susceptible")
ax.plot(data.index, data["Infected"],    color="#ef4444", linewidth=2, label="Infected")
ax.plot(data.index, data["Recovered"],   color="#22c55e", linewidth=2, label="Recovered")
ax.set_xlabel("Step"); ax.set_ylabel("Count")
ax.set_title(f"SIR Epidemic  (β={${p.transmission_rate}}, recovery={${p.recovery_time}} steps)")
ax.legend(); ax.grid(True, alpha=0.3)
plt.tight_layout(); plt.show()
`;
}

// ─── Forest Fire ──────────────────────────────────────────────────────────────

export function forestFireCode(p: Params): string {
  return `# ============================================================
# Forest Fire Agent-Based Model  (Mesa 3)
# Concepts: Percolation theory, phase transitions,
#           critical thresholds (~0.59), cascade effects
# ============================================================

# %% 1 — Install
!pip install mesa numpy matplotlib networkx -q

# %% 2 — Imports
import random
import mesa
from mesa.space import SingleGrid
from mesa.datacollection import DataCollector
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import numpy as np

# %% 3 — Agent

class TreeCell(mesa.Agent):
    def __init__(self, model, state="empty"):
        super().__init__(model)
        self.state = state   # "empty" | "tree" | "fire" | "burned"

    def step(self):
        if self.state != "fire":
            return
        for neighbor in self.model.grid.get_neighbors(self.pos, moore=False):
            if neighbor.state == "tree":
                if random.random() < self.model.spread_prob:
                    neighbor.state = "fire"
        self.state = "burned"


# %% 4 — Model

class ForestFireModel(mesa.Model):
    def __init__(self, width=${p.width}, height=${p.height},
                 tree_density=${p.tree_density}, spread_prob=${p.spread_prob}):
        super().__init__()
        self.spread_prob = spread_prob
        self.grid = SingleGrid(width, height, torus=False)
        self.datacollector = DataCollector(model_reporters={
            "Trees":  lambda m: sum(1 for a in m.agents if a.state == "tree"),
            "Fire":   lambda m: sum(1 for a in m.agents if a.state == "fire"),
            "Burned": lambda m: sum(1 for a in m.agents if a.state == "burned"),
        })
        for x in range(width):
            for y in range(height):
                state = ("fire" if x == 0 else "tree") if random.random() < tree_density else "empty"
                self.grid.place_agent(TreeCell(self, state), (x, y))
        self.running = True
        self.datacollector.collect(self)

    def step(self):
        self.agents.shuffle_do("step")
        self.datacollector.collect(self)
        if sum(1 for a in self.agents if a.state == "fire") == 0:
            self.running = False


# %% 5 — Run

model = ForestFireModel()
while model.running:
    model.step()

data = model.datacollector.get_model_vars_dataframe()
burned_pct = 100 * data["Burned"].iloc[-1] / max(1, data["Trees"].iloc[0] + data["Burned"].iloc[-1])
print(f"Fire stopped at step {model.steps}. {burned_pct:.1f}% of trees burned.")

# %% 6 — Visualize time series

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

ax1.fill_between(data.index, data["Trees"],  color="#16a34a", alpha=0.6, label="Trees")
ax1.fill_between(data.index, data["Fire"],   color="#f97316", alpha=0.8, label="Fire")
ax1.fill_between(data.index, data["Burned"], color="#57534e", alpha=0.6, label="Burned")
ax1.plot(data.index, data["Trees"],  "#16a34a", linewidth=2)
ax1.plot(data.index, data["Fire"],   "#f97316", linewidth=2)
ax1.plot(data.index, data["Burned"], "#57534e", linewidth=2)
ax1.set_xlabel("Step"); ax1.set_ylabel("Cell count")
ax1.set_title("Forest Fire: Time Series"); ax1.legend(); ax1.grid(True, alpha=0.3)

# Final grid snapshot
state_map = {"empty": 0, "tree": 1, "fire": 2, "burned": 3}
color_map = mcolors.ListedColormap(["#1c1917", "#14532d", "#ea580c", "#292524"])
grid_array = np.zeros((model.grid.height, model.grid.width))
for agent in model.agents:
    grid_array[agent.pos[1], agent.pos[0]] = state_map[agent.state]
ax2.imshow(grid_array, cmap=color_map, vmin=0, vmax=3, origin="lower")
ax2.set_title(f"Final State  (density=${p.tree_density})")
ax2.axis("off")
from matplotlib.patches import Patch
ax2.legend(handles=[Patch(color=c, label=l) for c, l in
                    zip(["#1c1917","#14532d","#ea580c","#292524"],
                        ["Empty","Tree","Fire","Burned"])],
           loc="lower right", facecolor="#1e293b", labelcolor="white")

plt.tight_layout(); plt.show()
`;
}

// ─── Diffusion of Innovations ──────────────────────────────────────────────────

export function diffusionCode(p: Params): string {
  return `# ============================================================
# Diffusion of Innovations — Bass Model  (Mesa 3)
# Concepts: Technology adoption S-curves,
#           innovation vs. imitation coefficients,
#           word-of-mouth network effects
# ============================================================

# %% 1 — Install
!pip install mesa numpy matplotlib networkx -q

# %% 2 — Imports
import random
import mesa
from mesa.space import SingleGrid
from mesa.datacollection import DataCollector
import matplotlib.pyplot as plt
import numpy as np

# %% 3 — Agent

class InnovationAgent(mesa.Agent):
    """Each agent can adopt a new product/technology over time."""
    def __init__(self, model, adopted=False):
        super().__init__(model)
        self.adopted = adopted

    def step(self):
        if self.adopted:
            return
        # Spontaneous adoption (innovators) — coefficient p
        if random.random() < self.model.innovation_coeff:
            self.adopted = True
            return
        # Imitation — influenced by adopted neighbors — coefficient q
        neighbors = self.model.grid.get_neighbors(self.pos, moore=True)
        if neighbors:
            adopted_count = sum(1 for n in neighbors if n.adopted)
            if adopted_count > 0:
                if random.random() < self.model.imitation_coeff * (adopted_count / len(neighbors)):
                    self.adopted = True


# %% 4 — Model

class DiffusionModel(mesa.Model):
    def __init__(self, width=${p.width}, height=${p.height},
                 density=${p.density},
                 innovation_coeff=${p.innovation_coeff},
                 imitation_coeff=${p.imitation_coeff},
                 initial_adopters=${p.initial_adopters}):
        super().__init__()
        self.innovation_coeff = innovation_coeff
        self.imitation_coeff  = imitation_coeff
        self.grid = SingleGrid(width, height, torus=True)
        self.datacollector = DataCollector(model_reporters={
            "Adopters":    lambda m: sum(1 for a in m.agents if a.adopted),
            "NonAdopters": lambda m: sum(1 for a in m.agents if not a.adopted),
        })
        positions = [(x, y) for x in range(width) for y in range(height)]
        random.shuffle(positions)
        n = int(len(positions) * density)
        for i, pos in enumerate(positions[:n]):
            self.grid.place_agent(InnovationAgent(self, adopted=(i < initial_adopters)), pos)
        self.running = True
        self.datacollector.collect(self)

    def step(self):
        self.agents.shuffle_do("step")
        self.datacollector.collect(self)
        if all(a.adopted for a in self.agents):
            self.running = False


# %% 5 — Run

model = DiffusionModel()
while model.running and model.steps < 500:
    model.step()

print(f"Full adoption reached at step {model.steps}")

# %% 6 — Visualize (S-curve)

data = model.datacollector.get_model_vars_dataframe()
total = data["Adopters"] + data["NonAdopters"]
cumulative_pct = data["Adopters"] / total * 100
new_adopters = data["Adopters"].diff().fillna(data["Adopters"].iloc[0])

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

# S-curve
ax1.plot(data.index, cumulative_pct, color="#f59e0b", linewidth=2.5)
ax1.axhline(50, color="#94a3b8", linestyle="--", alpha=0.5, label="50% adoption")
ax1.set_xlabel("Step"); ax1.set_ylabel("Cumulative adoption (%)")
ax1.set_title(f"Innovation S-Curve  (p=${p.innovation_coeff}, q=${p.imitation_coeff})")
ax1.set_ylim(0, 105); ax1.legend(); ax1.grid(True, alpha=0.3)

# New adopters per step (Bell curve shape)
ax2.bar(data.index, new_adopters, color="#f59e0b", alpha=0.7, width=1)
ax2.set_xlabel("Step"); ax2.set_ylabel("New adopters per step")
ax2.set_title("Adoption Rate (Bell Curve)")
ax2.grid(True, alpha=0.3, axis="y")

plt.tight_layout(); plt.show()
`;
}

// ─── Schelling Segregation ────────────────────────────────────────────────────

export function schellingCode(p: Params): string {
  return `# ============================================================
# Schelling Segregation Model  (Mesa 3)
# Concepts: Emergence, self-organization, tipping points,
#           micro-macro link — mild preferences → strong segregation
# ============================================================

# %% 1 — Install
!pip install mesa numpy matplotlib networkx -q

# %% 2 — Imports
import random
import mesa
from mesa.space import SingleGrid
from mesa.datacollection import DataCollector
import matplotlib.pyplot as plt
import numpy as np

# %% 3 — Agent

class SchellingAgent(mesa.Agent):
    def __init__(self, model, agent_type):
        super().__init__(model)
        self.type  = agent_type   # "type_a" or "type_b"
        self.happy = False

    def step(self):
        neighbors = self.model.grid.get_neighbors(self.pos, moore=True)
        if not neighbors:
            self.happy = True
            return
        same = sum(1 for n in neighbors if n.type == self.type)
        self.happy = (same / len(neighbors)) >= self.model.homophily
        if not self.happy:
            occupied = {a.pos for a in self.model.agents}
            empties  = [(x, y) for x in range(self.model.grid.width)
                        for y in range(self.model.grid.height)
                        if (x, y) not in occupied]
            if empties:
                self.model.grid.move_agent(self, random.choice(empties))


# %% 4 — Model

class SchellingModel(mesa.Model):
    def __init__(self, width=${p.width}, height=${p.height},
                 density=${p.density}, minority_pct=${p.minority_pct},
                 homophily=${p.homophily}):
        super().__init__()
        self.homophily = homophily
        self.grid = SingleGrid(width, height, torus=True)
        self.datacollector = DataCollector(model_reporters={
            "Happy":   lambda m: sum(1 for a in m.agents if a.happy),
            "Unhappy": lambda m: sum(1 for a in m.agents if not a.happy),
        })
        positions = [(x, y) for x in range(width) for y in range(height)]
        random.shuffle(positions)
        n_agents   = int(len(positions) * density)
        n_minority = int(n_agents * minority_pct)
        for i, pos in enumerate(positions[:n_agents]):
            self.grid.place_agent(
                SchellingAgent(self, "type_b" if i < n_minority else "type_a"), pos)
        self.running = True
        self.datacollector.collect(self)

    def step(self):
        self.agents.shuffle_do("step")
        self.datacollector.collect(self)


# %% 5 — Capture initial grid, then run

def grid_to_array(model):
    arr = np.full((model.grid.height, model.grid.width), np.nan)
    for agent in model.agents:
        arr[agent.pos[1], agent.pos[0]] = 0 if agent.type == "type_a" else 1
    return arr

initial_grid = grid_to_array(model := SchellingModel())

for _ in range(200):
    model.step()

final_grid = grid_to_array(model)
data = model.datacollector.get_model_vars_dataframe()
total = sum(1 for _ in model.agents)
happy_pct = data["Happy"].iloc[-1] / total * 100
print(f"After {model.steps} steps: {happy_pct:.1f}% of agents are happy")

# %% 6 — Visualize

cmap = plt.cm.RdBu
fig, axes = plt.subplots(1, 3, figsize=(16, 5))

for ax, grid, title in zip(axes[:2], [initial_grid, final_grid],
                             ["Initial (random)", f"After {model.steps} steps"]):
    im = ax.imshow(grid, cmap=cmap, vmin=0, vmax=1, origin="lower")
    ax.set_title(title); ax.axis("off")
fig.colorbar(im, ax=axes[1], label="Blue=0  Red=1", shrink=0.8)

axes[2].plot(data.index, data["Happy"] / total * 100,
             color="#22c55e", linewidth=2, label="Happy %")
axes[2].axhline(${Math.round(p.homophily * 100)}, color="#94a3b8", linestyle="--",
                label=f"Homophily threshold (${Math.round(p.homophily * 100)}%)")
axes[2].set_xlabel("Step"); axes[2].set_ylabel("Happy agents (%)")
axes[2].set_title("Convergence to Happiness"); axes[2].legend(); axes[2].grid(True, alpha=0.3)

plt.suptitle(
    f"Schelling Segregation  (density=${p.density}, homophily=${p.homophily})",
    fontsize=13, y=1.01)
plt.tight_layout(); plt.show()
`;
}

// ─── Wealth Distribution ──────────────────────────────────────────────────────

export function wealthCode(p: Params): string {
  return `# ============================================================
# Wealth Distribution — Sugarscape  (Mesa 3)
# Concepts: Gini coefficient, wealth inequality,
#           resource competition, Pareto principle
# ============================================================

# %% 1 — Install
!pip install mesa numpy matplotlib networkx -q

# %% 2 — Imports
import random
import mesa
from mesa.space import MultiGrid
from mesa.datacollection import DataCollector
import matplotlib.pyplot as plt
import numpy as np

# %% 3 — Agents

class SugarPatch(mesa.Agent):
    def __init__(self, model, max_sugar, sugar):
        super().__init__(model)
        self.max_sugar = max_sugar
        self.sugar = sugar

    def step(self):
        self.sugar = min(self.max_sugar, self.sugar + 1)


class WealthAgent(mesa.Agent):
    def __init__(self, model, vision, metabolism, sugar):
        super().__init__(model)
        self.vision = vision
        self.metabolism = metabolism
        self.sugar = sugar

    def step(self):
        # Move to richest visible unoccupied cell
        hood = self.model.grid.get_neighborhood(
            self.pos, moore=True, include_center=True, radius=self.vision)
        best, best_s = self.pos, -1
        for pos in hood:
            cell = self.model.grid.get_cell_list_contents([pos])
            patches = [a for a in cell if isinstance(a, SugarPatch)]
            others  = [a for a in cell if isinstance(a, WealthAgent) and a is not self]
            if patches and not others and patches[0].sugar > best_s:
                best_s, best = patches[0].sugar, pos
        if best != self.pos:
            self.model.grid.move_agent(self, best)
        # Eat
        for a in self.model.grid.get_cell_list_contents([self.pos]):
            if isinstance(a, SugarPatch):
                self.sugar += a.sugar; a.sugar = 0; break
        # Metabolize
        self.sugar -= self.metabolism
        if self.sugar <= 0:
            self.model._dying.append(self)


def gini(values):
    s = sorted(values)
    n = len(s); total = sum(s)
    if n == 0 or total == 0: return 0
    return sum((2*(i+1)-n-1)*v for i, v in enumerate(s)) / (n * total)


# %% 4 — Model

class WealthModel(mesa.Model):
    def __init__(self, width=${p.width}, height=${p.height},
                 num_agents=${p.num_agents}, max_vision=${p.max_vision},
                 max_metabolism=${p.max_metabolism},
                 max_initial_sugar=${p.max_initial_sugar}):
        super().__init__()
        self._dying = []
        self._max_v, self._max_m = max_vision, max_metabolism
        self.grid = MultiGrid(width, height, torus=True)
        self.datacollector = DataCollector(model_reporters={
            "MeanWealth": lambda m: round(np.mean(
                [a.sugar for a in m.agents if isinstance(a, WealthAgent)]) or 0, 2),
            "Gini": lambda m: round(gini(
                [a.sugar for a in m.agents if isinstance(a, WealthAgent)]), 3),
        })
        # Sugar landscape: two hills
        for x in range(width):
            for y in range(height):
                d = min(abs(x-width//4)+abs(y-height//4),
                        abs(x-3*width//4)+abs(y-3*height//4))
                cap = max(0, int(max_initial_sugar * (1 - d / (min(width,height)//3))))
                self.grid.place_agent(SugarPatch(self, cap, cap), (x, y))
        for _ in range(num_agents):
            self.grid.place_agent(
                WealthAgent(self,
                            random.randint(1, max_vision),
                            random.randint(1, max_metabolism),
                            random.randint(5, max_initial_sugar)),
                (random.randrange(width), random.randrange(height)))
        self.running = True
        self.datacollector.collect(self)

    def step(self):
        self._dying = []
        self.agents.shuffle_do("step")
        for a in self._dying:
            a.remove()
            self.grid.place_agent(
                WealthAgent(self, random.randint(1, self._max_v),
                            random.randint(1, self._max_m), 5),
                (random.randrange(self.grid.width), random.randrange(self.grid.height)))
        self.datacollector.collect(self)


# %% 5 — Run

model = WealthModel()
for _ in range(200):
    model.step()

data = model.datacollector.get_model_vars_dataframe()
print(f"After {model.steps} steps:")
print(f"  Mean wealth : {data['MeanWealth'].iloc[-1]:.1f}")
print(f"  Gini coeff  : {data['Gini'].iloc[-1]:.3f}  (0=equal, 1=max inequality)")

# %% 6 — Visualize

fig, axes = plt.subplots(1, 3, figsize=(16, 5))

# Gini over time
axes[0].plot(data.index, data["Gini"], color="#f87171", linewidth=2)
axes[0].set_ylim(0, 1)
axes[0].set_xlabel("Step"); axes[0].set_ylabel("Gini coefficient")
axes[0].set_title("Wealth Inequality Over Time")
axes[0].axhline(0.5, linestyle="--", color="#94a3b8", alpha=0.5, label="Gini = 0.5")
axes[0].legend(); axes[0].grid(True, alpha=0.3)

# Wealth distribution histogram
final_wealth = sorted(a.sugar for a in model.agents if isinstance(a, WealthAgent))
axes[1].hist(final_wealth, bins=30, color="#f59e0b", alpha=0.8, edgecolor="#1e293b")
axes[1].set_xlabel("Wealth"); axes[1].set_ylabel("Number of agents")
axes[1].set_title("Final Wealth Distribution")
axes[1].grid(True, alpha=0.3, axis="y")

# Lorenz curve
n = len(final_wealth); total = sum(final_wealth) or 1
lorenz_x = np.linspace(0, 1, n)
lorenz_y = np.cumsum(final_wealth) / total
axes[2].plot([0, 1], [0, 1], "--", color="#94a3b8", label="Perfect equality")
axes[2].fill_between(lorenz_x, lorenz_x, lorenz_y, alpha=0.3, color="#f87171")
axes[2].plot(lorenz_x, lorenz_y, color="#f87171", linewidth=2, label="Lorenz curve")
axes[2].set_xlabel("Cumulative population share")
axes[2].set_ylabel("Cumulative wealth share")
axes[2].set_title(f"Lorenz Curve  (Gini={data['Gini'].iloc[-1]:.3f})")
axes[2].legend(); axes[2].grid(True, alpha=0.3)

plt.tight_layout(); plt.show()
`;
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

const GENERATORS: Record<string, (p: Params) => string> = {
  predator_prey: predatorPreyCode,
  sir:           sirCode,
  forest_fire:   forestFireCode,
  diffusion:     diffusionCode,
  schelling:     schellingCode,
  wealth:        wealthCode,
};

export function generateCode(modelId: string, params: Params): string {
  const gen = GENERATORS[modelId];
  return gen ? gen(params) : `# No code generator for model: ${modelId}`;
}
