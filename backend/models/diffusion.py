"""
Diffusion of Innovations Model (Bass Model)
Demonstrates: technology adoption S-curves, social influence, word-of-mouth effects
"""

from mesa import Agent, Model
from mesa.space import SingleGrid
from mesa.datacollection import DataCollector
import random


class InnovationAgent(Agent):
    """A person who may adopt a new innovation over time."""

    def __init__(self, model, adopted=False):
        super().__init__(model)
        self.adopted = adopted

    def step(self):
        if self.adopted:
            return

        # Spontaneous adoption (innovators) — independent of neighbors
        if random.random() < self.model.innovation_coeff:
            self.adopted = True
            return

        # Imitation — adoption influenced by adopted neighbors (imitators)
        neighbors = self.model.grid.get_neighbors(self.pos, moore=True)
        if neighbors:
            adopter_count = sum(1 for n in neighbors if n.adopted)
            if adopter_count > 0:
                imitation_prob = self.model.imitation_coeff * (adopter_count / len(neighbors))
                if random.random() < imitation_prob:
                    self.adopted = True


class DiffusionModel(Model):
    """
    Spatial Bass diffusion model. Innovation spreads through a population via
    spontaneous adoption (p) and neighbor imitation (q). Produces the classic S-curve.
    """
    MODEL_TYPE = "diffusion"

    def __init__(self, width=40, height=30, density=0.85,
                 innovation_coeff=0.01, imitation_coeff=0.5, initial_adopters=3):
        super().__init__()
        self.width = width
        self.height = height
        self.innovation_coeff = innovation_coeff
        self.imitation_coeff = imitation_coeff
        self.initial_params = dict(
            width=width, height=height, density=density,
            innovation_coeff=innovation_coeff, imitation_coeff=imitation_coeff,
            initial_adopters=initial_adopters,
        )

        self.grid = SingleGrid(width, height, torus=True)
        self.datacollector = DataCollector(model_reporters={
            "Adopters": lambda m: sum(1 for a in m.agents if a.adopted),
            "NonAdopters": lambda m: sum(1 for a in m.agents if not a.adopted),
        })

        all_positions = [(x, y) for x in range(width) for y in range(height)]
        random.shuffle(all_positions)
        total_agents = int(len(all_positions) * density)

        for i, pos in enumerate(all_positions[:total_agents]):
            adopted = (i < initial_adopters)
            self.grid.place_agent(InnovationAgent(self, adopted), pos)

        self.running = True
        self.datacollector.collect(self)

    def step(self):
        self.agents.shuffle_do("step")
        self.datacollector.collect(self)
        if all(a.adopted for a in self.agents):
            self.running = False

    def get_api_state(self):
        agents = [
            {"id": a.unique_id,
             "type": "adopter" if a.adopted else "non_adopter",
             "x": a.pos[0], "y": a.pos[1], "properties": {}}
            for a in self.agents
        ]
        adopters = sum(1 for a in self.agents if a.adopted)
        total = sum(1 for _ in self.agents)
        return {
            "step": self.steps, "model_type": self.MODEL_TYPE, "agents": agents,
            "counts": {
                "adopters": adopters,
                "non_adopters": total - adopters,
            },
            "width": self.grid.width, "height": self.grid.height,
        }

    def get_api_history(self):
        df = self.datacollector.get_model_vars_dataframe()
        return [{"step": int(s), "adopters": int(r["Adopters"]),
                 "non_adopters": int(r["NonAdopters"])}
                for s, r in df.iterrows()]
