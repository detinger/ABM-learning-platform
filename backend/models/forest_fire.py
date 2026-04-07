"""
Forest Fire Model
Demonstrates: percolation theory, phase transitions, critical thresholds, cascade effects
"""

from mesa import Agent, Model
from mesa.space import SingleGrid
from mesa.datacollection import DataCollector
import random


class TreeCell(Agent):
    """A cell that can be empty, a tree, on fire, or burned out."""

    STATES = ("empty", "tree", "fire", "burned")

    def __init__(self, model, state="empty"):
        super().__init__(model)
        self.state = state

    def step(self):
        if self.state != "fire":
            return
        # Spread fire to orthogonal (von Neumann) neighbors
        for neighbor in self.model.grid.get_neighbors(self.pos, moore=False):
            if neighbor.state == "tree":
                if random.random() < self.model.spread_prob:
                    neighbor.state = "fire"
        self.state = "burned"


class ForestFireModel(Model):
    """
    Forest fire cellular automaton. Fire starts on the left edge and spreads
    through adjacent trees. Reveals the critical density threshold for percolation.
    """
    MODEL_TYPE = "forest_fire"

    def __init__(self, width=60, height=40, tree_density=0.65, spread_prob=1.0):
        super().__init__()
        self.width = width
        self.height = height
        self.spread_prob = spread_prob
        self.initial_params = dict(
            width=width, height=height,
            tree_density=tree_density, spread_prob=spread_prob,
        )

        self.grid = SingleGrid(width, height, torus=False)
        self.datacollector = DataCollector(model_reporters={
            "Trees": lambda m: sum(1 for a in m.agents if a.state == "tree"),
            "Fire": lambda m: sum(1 for a in m.agents if a.state == "fire"),
            "Burned": lambda m: sum(1 for a in m.agents if a.state == "burned"),
        })

        # Fill every cell with a TreeCell agent
        for x in range(width):
            for y in range(height):
                if random.random() < tree_density:
                    state = "fire" if x == 0 else "tree"
                else:
                    state = "empty"
                cell = TreeCell(self, state)
                self.grid.place_agent(cell, (x, y))

        self.running = True
        self.datacollector.collect(self)

    def step(self):
        self.agents.shuffle_do("step")
        self.datacollector.collect(self)
        if sum(1 for a in self.agents if a.state == "fire") == 0:
            self.running = False

    def get_api_state(self):
        agents = [
            {"id": a.unique_id, "type": a.state,
             "x": a.pos[0], "y": a.pos[1], "properties": {}}
            for a in self.agents
        ]
        return {
            "step": self.steps, "model_type": self.MODEL_TYPE, "agents": agents,
            "counts": {
                "trees": sum(1 for a in self.agents if a.state == "tree"),
                "fire": sum(1 for a in self.agents if a.state == "fire"),
                "burned": sum(1 for a in self.agents if a.state == "burned"),
                "empty": sum(1 for a in self.agents if a.state == "empty"),
            },
            "width": self.grid.width, "height": self.grid.height,
        }

    def get_api_history(self):
        df = self.datacollector.get_model_vars_dataframe()
        return [{"step": int(s), "trees": int(r["Trees"]),
                 "fire": int(r["Fire"]), "burned": int(r["Burned"])}
                for s, r in df.iterrows()]
