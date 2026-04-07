"""
SIR Epidemic Model
Demonstrates: disease spreading, herd immunity, R0, epidemic curves, phase transitions
"""

from mesa import Agent, Model
from mesa.space import MultiGrid
from mesa.datacollection import DataCollector
import random


class Person(Agent):
    """Agent representing a person who can be Susceptible, Infected, or Recovered."""

    def __init__(self, model, state="susceptible"):
        super().__init__(model)
        self.state = state
        self.infection_timer = model.recovery_time if state == "infected" else 0

    def step(self):
        self._move()
        if self.state == "infected":
            self._try_infect_neighbors()
            self.infection_timer -= 1
            if self.infection_timer <= 0:
                self.state = "recovered"

    def _move(self):
        neighborhood = self.model.grid.get_neighborhood(self.pos, moore=True, include_center=False)
        self.model.grid.move_agent(self, random.choice(neighborhood))

    def _try_infect_neighbors(self):
        for neighbor in self.model.grid.get_neighbors(self.pos, moore=True):
            if neighbor.state == "susceptible":
                if random.random() < self.model.transmission_rate:
                    neighbor.state = "infected"
                    neighbor.infection_timer = self.model.recovery_time


class SIRModel(Model):
    """
    Spatial SIR epidemic model. Infected agents move and transmit disease
    to susceptible neighbors. Recovered agents gain permanent immunity.
    """
    MODEL_TYPE = "sir"

    def __init__(self, width=30, height=30, population=400,
                 initial_infected=5, transmission_rate=0.3, recovery_time=14):
        super().__init__()
        self.width = width
        self.height = height
        self.transmission_rate = transmission_rate
        self.recovery_time = recovery_time
        self.initial_params = dict(
            width=width, height=height, population=population,
            initial_infected=initial_infected,
            transmission_rate=transmission_rate, recovery_time=recovery_time,
        )

        self.grid = MultiGrid(width, height, torus=True)
        self.datacollector = DataCollector(model_reporters={
            "Susceptible": lambda m: sum(1 for a in m.agents if a.state == "susceptible"),
            "Infected": lambda m: sum(1 for a in m.agents if a.state == "infected"),
            "Recovered": lambda m: sum(1 for a in m.agents if a.state == "recovered"),
        })

        for i in range(population):
            state = "infected" if i < initial_infected else "susceptible"
            person = Person(self, state)
            pos = (random.randrange(width), random.randrange(height))
            self.grid.place_agent(person, pos)

        self.running = True
        self.datacollector.collect(self)

    def step(self):
        self.agents.shuffle_do("step")
        self.datacollector.collect(self)
        if sum(1 for a in self.agents if a.state == "infected") == 0:
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
                "susceptible": sum(1 for a in self.agents if a.state == "susceptible"),
                "infected": sum(1 for a in self.agents if a.state == "infected"),
                "recovered": sum(1 for a in self.agents if a.state == "recovered"),
            },
            "width": self.grid.width, "height": self.grid.height,
        }

    def get_api_history(self):
        df = self.datacollector.get_model_vars_dataframe()
        return [{"step": int(s), "susceptible": int(r["Susceptible"]),
                 "infected": int(r["Infected"]), "recovered": int(r["Recovered"])}
                for s, r in df.iterrows()]
