"""
Wealth Distribution Model (Sugarscape-inspired)
Demonstrates: inequality emergence, Pareto principle, resource competition, Gini coefficient
"""

from mesa import Agent, Model
from mesa.space import MultiGrid
from mesa.datacollection import DataCollector
import random
import math


class SugarPatch(Agent):
    """A resource patch that regrows sugar over time."""

    def __init__(self, model, max_sugar, sugar):
        super().__init__(model)
        self.max_sugar = max_sugar
        self.sugar = sugar

    def step(self):
        self.sugar = min(self.max_sugar, self.sugar + 1)


class WealthAgent(Agent):
    """An agent that moves toward sugar, accumulates wealth, and metabolizes."""

    def __init__(self, model, vision, metabolism, sugar):
        super().__init__(model)
        self.vision = vision
        self.metabolism = metabolism
        self.sugar = sugar   # wealth

    def step(self):
        self._move()
        self._eat()
        self._metabolize()

    def _move(self):
        """Move to richest unoccupied cell within vision range."""
        neighborhood = self.model.grid.get_neighborhood(
            self.pos, moore=True, include_center=True, radius=self.vision
        )
        best_pos = self.pos
        best_sugar = -1

        for pos in neighborhood:
            cell = self.model.grid.get_cell_list_contents([pos])
            patches = [a for a in cell if isinstance(a, SugarPatch)]
            other_agents = [a for a in cell if isinstance(a, WealthAgent) and a is not self]
            if patches and not other_agents and patches[0].sugar > best_sugar:
                best_sugar = patches[0].sugar
                best_pos = pos

        if best_pos != self.pos:
            self.model.grid.move_agent(self, best_pos)

    def _eat(self):
        cell = self.model.grid.get_cell_list_contents([self.pos])
        for patch in cell:
            if isinstance(patch, SugarPatch):
                self.sugar += patch.sugar
                patch.sugar = 0
                break

    def _metabolize(self):
        self.sugar -= self.metabolism
        if self.sugar <= 0:
            self.model._dying_agents.append(self)


class WealthModel(Model):
    """
    Sugarscape-inspired wealth model. Agents compete for resources on a
    landscape with two sugar mountains. Reveals how simple rules generate
    wealth inequality (measured by Gini coefficient).
    """
    MODEL_TYPE = "wealth"

    def __init__(self, width=40, height=30, num_agents=200,
                 max_vision=5, max_metabolism=4, max_initial_sugar=20):
        super().__init__()
        self.width = width
        self.height = height
        self._dying_agents = []
        self.initial_params = dict(
            width=width, height=height, num_agents=num_agents,
            max_vision=max_vision, max_metabolism=max_metabolism,
            max_initial_sugar=max_initial_sugar,
        )

        self.grid = MultiGrid(width, height, torus=True)
        self.datacollector = DataCollector(model_reporters={
            "MeanWealth": lambda m: m._mean_wealth(),
            "Gini": lambda m: m._gini(),
            "Agents": lambda m: sum(1 for a in m.agents if isinstance(a, WealthAgent)),
        })

        # Create sugar landscape with two hills
        for x in range(width):
            for y in range(height):
                d1 = abs(x - width // 4) + abs(y - height // 4)
                d2 = abs(x - 3 * width // 4) + abs(y - 3 * height // 4)
                hill_radius = min(width, height) // 3
                cap = max(0, int(max_initial_sugar * (1 - min(d1, d2) / hill_radius)))
                self.grid.place_agent(SugarPatch(self, cap, cap), (x, y))

        # Create agents
        self._max_vision = max_vision
        self._max_metabolism = max_metabolism
        self._max_initial_sugar = max_initial_sugar
        for _ in range(num_agents):
            pos = (random.randrange(width), random.randrange(height))
            vision = random.randint(1, max_vision)
            metabolism = random.randint(1, max_metabolism)
            sugar = random.randint(5, max_initial_sugar)
            self.grid.place_agent(WealthAgent(self, vision, metabolism, sugar), pos)

        self.running = True
        self.datacollector.collect(self)

    def step(self):
        self._dying_agents = []
        self.agents.shuffle_do("step")

        # Replace dead agents with new ones
        for agent in self._dying_agents:
            agent.remove()
            pos = (random.randrange(self.width), random.randrange(self.height))
            v = random.randint(1, self._max_vision)
            m = random.randint(1, self._max_metabolism)
            self.grid.place_agent(WealthAgent(self, v, m, 5), pos)

        self.datacollector.collect(self)

    def _mean_wealth(self):
        sugars = [a.sugar for a in self.agents if isinstance(a, WealthAgent)]
        return round(sum(sugars) / len(sugars), 1) if sugars else 0

    def _gini(self):
        sugars = sorted(a.sugar for a in self.agents if isinstance(a, WealthAgent))
        if not sugars:
            return 0
        n = len(sugars)
        total = sum(sugars)
        if total == 0:
            return 0
        cumsum = sum((2 * (i + 1) - n - 1) * s for i, s in enumerate(sugars))
        return round(cumsum / (n * total), 3)

    def get_api_state(self):
        agents = []
        for agent in self.agents:
            if isinstance(agent, SugarPatch):
                if agent.max_sugar == 0:
                    atype = "sugar_empty"
                elif agent.sugar == 0:
                    atype = "sugar_depleted"
                elif agent.sugar < agent.max_sugar * 0.4:
                    atype = "sugar_low"
                elif agent.sugar < agent.max_sugar * 0.75:
                    atype = "sugar_med"
                else:
                    atype = "sugar_high"
                agents.append({"id": agent.unique_id, "type": atype,
                                "x": agent.pos[0], "y": agent.pos[1],
                                "properties": {"sugar": agent.sugar, "max_sugar": agent.max_sugar}})
            elif isinstance(agent, WealthAgent):
                agents.append({"id": agent.unique_id, "type": "person",
                                "x": agent.pos[0], "y": agent.pos[1],
                                "properties": {"wealth": agent.sugar, "vision": agent.vision}})

        wealth_agents = [a for a in self.agents if isinstance(a, WealthAgent)]
        return {
            "step": self.steps, "model_type": self.MODEL_TYPE, "agents": agents,
            "counts": {
                "agents": len(wealth_agents),
                "mean_wealth": self._mean_wealth(),
                "gini": self._gini(),
            },
            "width": self.grid.width, "height": self.grid.height,
        }

    def get_api_history(self):
        df = self.datacollector.get_model_vars_dataframe()
        return [{"step": int(s), "mean_wealth": float(r["MeanWealth"]),
                 "gini": float(r["Gini"]), "agents": int(r["Agents"])}
                for s, r in df.iterrows()]
