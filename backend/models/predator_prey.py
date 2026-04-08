"""
Predator-Prey (Wolves & Sheep) Agent-Based Model
Demonstrates: Lotka-Volterra dynamics, population cycles, trophic cascades
"""

from mesa import Agent, Model
from mesa.space import MultiGrid
from mesa.datacollection import DataCollector
import random


class Sheep(Agent):
    def __init__(self, model, energy_gain=4, reproduce_threshold=8, energy=None):
        super().__init__(model)
        self.energy = random.randint(1, 2 * energy_gain) if energy is None else energy
        self.energy_gain = energy_gain
        self.reproduce_threshold = reproduce_threshold

    def step(self):
        self._move()
        self.energy -= 1
        ate_grass = self._eat_grass()
        if self.energy <= 0:
            self._remove_from_world()
            return
        self._reproduce(ate_grass)

    def _remove_from_world(self):
        if self.pos is not None:
            self.model.grid.remove_agent(self)
        super().remove()

    def _move(self):
        neighbors = self.model.grid.get_neighborhood(self.pos, moore=True, include_center=False)
        self.model.grid.move_agent(self, random.choice(neighbors))

    def _eat_grass(self):
        for obj in self.model.grid.get_cell_list_contents([self.pos]):
            if isinstance(obj, GrassPatch) and obj.fully_grown:
                self.energy += self.energy_gain
                obj.fully_grown = False
                obj.countdown = obj.regrowth_time
                return True
        return False

    def _reproduce(self, ate_food):
        reproduce_chance = 1 / max(1, self.reproduce_threshold)
        if ate_food and self.energy >= self.reproduce_threshold and random.random() < reproduce_chance:
            offspring_energy = self.energy // 2
            self.energy -= offspring_energy
            offspring = Sheep(
                self.model,
                self.energy_gain,
                self.reproduce_threshold,
                energy=offspring_energy,
            )
            self.model.grid.place_agent(offspring, self.pos)


class Wolf(Agent):
    def __init__(self, model, energy_gain=20, reproduce_threshold=16, energy=None):
        super().__init__(model)
        self.energy = random.randint(1, 2 * energy_gain) if energy is None else energy
        self.energy_gain = energy_gain
        self.reproduce_threshold = reproduce_threshold

    def step(self):
        self._move()
        self.energy -= 1
        ate_sheep = self._eat_sheep()
        if self.energy <= 0:
            self._remove_from_world()
            return
        self._reproduce(ate_sheep)

    def _remove_from_world(self):
        if self.pos is not None:
            self.model.grid.remove_agent(self)
        super().remove()

    def _move(self):
        neighbors = self.model.grid.get_neighborhood(self.pos, moore=True, include_center=False)
        sheep_positions = [
            pos for pos in neighbors
            if any(isinstance(a, Sheep) for a in self.model.grid.get_cell_list_contents([pos]))
        ]
        target = random.choice(sheep_positions) if sheep_positions else random.choice(neighbors)
        self.model.grid.move_agent(self, target)

    def _eat_sheep(self):
        sheep = [a for a in self.model.grid.get_cell_list_contents([self.pos]) if isinstance(a, Sheep)]
        if sheep:
            self.energy += self.energy_gain
            random.choice(sheep)._remove_from_world()
            return True
        return False

    def _reproduce(self, ate_food):
        reproduce_chance = 1 / max(1, self.reproduce_threshold)
        if ate_food and self.energy >= self.reproduce_threshold and random.random() < reproduce_chance:
            offspring_energy = self.energy // 2
            self.energy -= offspring_energy
            offspring = Wolf(
                self.model,
                self.energy_gain,
                self.reproduce_threshold,
                energy=offspring_energy,
            )
            self.model.grid.place_agent(offspring, self.pos)


class GrassPatch(Agent):
    def __init__(self, model, regrowth_time=30):
        super().__init__(model)
        self.regrowth_time = regrowth_time
        self.fully_grown = True
        self.countdown = 0

    def step(self):
        if not self.fully_grown:
            self.countdown -= 1
            if self.countdown <= 0:
                self.fully_grown = True


class PredatorPreyModel(Model):
    """
    Classic Lotka-Volterra predator-prey ecosystem.
    Sheep graze on grass, wolves hunt sheep; populations oscillate cyclically.
    """
    MODEL_TYPE = "predator_prey"

    def __init__(self, width=20, height=20, initial_sheep=100, initial_wolves=20,
                 sheep_reproduce_threshold=6, wolf_reproduce_threshold=24,
                 sheep_gain_from_food=4, wolf_gain_from_food=20, grass_regrowth_time=30):
        super().__init__()
        self.width = width
        self.height = height
        self.initial_params = dict(
            width=width, height=height,
            initial_sheep=initial_sheep, initial_wolves=initial_wolves,
            sheep_reproduce_threshold=sheep_reproduce_threshold,
            wolf_reproduce_threshold=wolf_reproduce_threshold,
            sheep_gain_from_food=sheep_gain_from_food,
            wolf_gain_from_food=wolf_gain_from_food,
            grass_regrowth_time=grass_regrowth_time,
        )

        self.grid = MultiGrid(width, height, torus=True)
        self.datacollector = DataCollector(model_reporters={
            "Sheep": lambda m: sum(1 for a in m.agents if isinstance(a, Sheep)),
            "Wolves": lambda m: sum(1 for a in m.agents if isinstance(a, Wolf)),
            "Grass": lambda m: sum(1 for a in m.agents if isinstance(a, GrassPatch) and a.fully_grown),
        })

        for x in range(width):
            for y in range(height):
                self.grid.place_agent(GrassPatch(self, grass_regrowth_time), (x, y))

        for _ in range(initial_sheep):
            pos = (random.randrange(width), random.randrange(height))
            self.grid.place_agent(Sheep(self, sheep_gain_from_food, sheep_reproduce_threshold), pos)

        for _ in range(initial_wolves):
            pos = (random.randrange(width), random.randrange(height))
            self.grid.place_agent(Wolf(self, wolf_gain_from_food, wolf_reproduce_threshold), pos)

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

    def get_api_state(self):
        agents = []
        for agent in self.agents:
            if isinstance(agent, Sheep):
                agents.append({"id": agent.unique_id, "type": "sheep",
                                "x": agent.pos[0], "y": agent.pos[1],
                                "properties": {"energy": agent.energy}})
            elif isinstance(agent, Wolf):
                agents.append({"id": agent.unique_id, "type": "wolf",
                                "x": agent.pos[0], "y": agent.pos[1],
                                "properties": {"energy": agent.energy}})
            elif isinstance(agent, GrassPatch):
                agents.append({"id": agent.unique_id,
                                "type": "grass_grown" if agent.fully_grown else "grass_regrowing",
                                "x": agent.pos[0], "y": agent.pos[1],
                                "properties": {}})
        return {
            "step": self.steps, "model_type": self.MODEL_TYPE, "agents": agents,
            "counts": {
                "sheep": sum(1 for a in self.agents if isinstance(a, Sheep)),
                "wolves": sum(1 for a in self.agents if isinstance(a, Wolf)),
                "grass": sum(1 for a in self.agents if isinstance(a, GrassPatch) and a.fully_grown),
            },
            "width": self.grid.width, "height": self.grid.height,
        }

    def get_api_history(self):
        df = self.datacollector.get_model_vars_dataframe()
        return [{"step": int(s), "sheep": int(r["Sheep"]), "wolves": int(r["Wolves"]), "grass": int(r["Grass"])}
                for s, r in df.iterrows()]
