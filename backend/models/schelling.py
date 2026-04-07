"""
Schelling Segregation Model
Demonstrates: emergence, residential segregation, tipping points, self-organization
"""

from mesa import Agent, Model
from mesa.space import SingleGrid
from mesa.datacollection import DataCollector
import random


class SchellingAgent(Agent):
    """A household that prefers to live near similar neighbors."""

    def __init__(self, model, agent_type):
        super().__init__(model)
        self.type = agent_type   # "type_a" or "type_b"
        self.happy = False

    def step(self):
        neighbors = self.model.grid.get_neighbors(self.pos, moore=True)
        if not neighbors:
            self.happy = True
            return

        same = sum(1 for n in neighbors if n.type == self.type)
        self.happy = (same / len(neighbors)) >= self.model.homophily

        if not self.happy:
            empties = self._get_empty_positions()
            if empties:
                self.model.grid.move_agent(self, random.choice(empties))

    def _get_empty_positions(self):
        occupied = {a.pos for a in self.model.agents}
        return [(x, y)
                for x in range(self.model.width)
                for y in range(self.model.height)
                if (x, y) not in occupied]


class SchellingModel(Model):
    """
    Schelling's classic model of residential segregation. Agents with mild
    same-type preferences produce striking macro-level segregation patterns.
    """
    MODEL_TYPE = "schelling"

    def __init__(self, width=30, height=30, density=0.80,
                 minority_pct=0.30, homophily=0.30):
        super().__init__()
        self.width = width
        self.height = height
        self.homophily = homophily
        self.initial_params = dict(
            width=width, height=height, density=density,
            minority_pct=minority_pct, homophily=homophily,
        )

        self.grid = SingleGrid(width, height, torus=True)
        self.datacollector = DataCollector(model_reporters={
            "Happy": lambda m: sum(1 for a in m.agents if a.happy),
            "Unhappy": lambda m: sum(1 for a in m.agents if not a.happy),
            "TypeA": lambda m: sum(1 for a in m.agents if a.type == "type_a"),
            "TypeB": lambda m: sum(1 for a in m.agents if a.type == "type_b"),
        })

        all_positions = [(x, y) for x in range(width) for y in range(height)]
        random.shuffle(all_positions)
        total_agents = int(len(all_positions) * density)
        num_minority = int(total_agents * minority_pct)

        for i, pos in enumerate(all_positions[:total_agents]):
            agent_type = "type_b" if i < num_minority else "type_a"
            self.grid.place_agent(SchellingAgent(self, agent_type), pos)

        self.running = True
        self.datacollector.collect(self)

    def step(self):
        self.agents.shuffle_do("step")
        self.datacollector.collect(self)

    def get_api_state(self):
        agents = [
            {"id": a.unique_id, "type": a.type,
             "x": a.pos[0], "y": a.pos[1],
             "properties": {"happy": a.happy}}
            for a in self.agents
        ]
        all_agents = list(self.agents)
        total = len(all_agents)
        happy = sum(1 for a in all_agents if a.happy)
        return {
            "step": self.steps, "model_type": self.MODEL_TYPE, "agents": agents,
            "counts": {
                "type_a": sum(1 for a in all_agents if a.type == "type_a"),
                "type_b": sum(1 for a in all_agents if a.type == "type_b"),
                "happy": happy,
                "unhappy": total - happy,
                "happy_pct": round(100 * happy / max(1, total), 1),
            },
            "width": self.grid.width, "height": self.grid.height,
        }

    def get_api_history(self):
        df = self.datacollector.get_model_vars_dataframe()
        total = sum(1 for _ in self.agents) or 1
        return [{"step": int(s),
                 "happy_pct": round(int(r["Happy"]) / total * 100, 1),
                 "type_a": int(r["TypeA"]),
                 "type_b": int(r["TypeB"])}
                for s, r in df.iterrows()]
