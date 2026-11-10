"""Model registry: maps model_type strings to model classes and validates parameters."""

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from .diffusion import DiffusionModel
from .forest_fire import ForestFireModel
from .predator_prey import PredatorPreyModel
from .schelling import SchellingModel
from .sir_model import SIRModel
from .wealth import WealthModel

MODEL_REGISTRY = {
    "predator_prey": PredatorPreyModel,
    "sir": SIRModel,
    "forest_fire": ForestFireModel,
    "diffusion": DiffusionModel,
    "schelling": SchellingModel,
    "wealth": WealthModel,
}


@dataclass(frozen=True)
class Param:
    kind: type  # int or float
    min: float
    max: float


def _grid(max_side: int) -> dict[str, Param]:
    return {"width": Param(int, 5, max_side), "height": Param(int, 5, max_side)}


def _prob() -> Param:
    return Param(float, 0.0, 1.0)


# Bounds are in backend units (after the frontend's slider transforms) and are a
# little wider than the UI sliders. They exist so a public deployment cannot be
# asked to build a 5000x5000 grid or a million agents.
PARAM_SPECS: dict[str, dict[str, Param]] = {
    "predator_prey": {
        **_grid(100),
        "initial_sheep": Param(int, 0, 1000),
        "initial_wolves": Param(int, 0, 500),
        "sheep_reproduce_threshold": Param(int, 1, 50),
        "wolf_reproduce_threshold": Param(int, 1, 100),
        "sheep_gain_from_food": Param(int, 1, 50),
        "wolf_gain_from_food": Param(int, 1, 100),
        "grass_regrowth_time": Param(int, 1, 200),
    },
    "sir": {
        **_grid(100),
        "population": Param(int, 1, 2000),
        "initial_infected": Param(int, 0, 500),
        "transmission_rate": _prob(),
        "recovery_time": Param(int, 1, 100),
    },
    "forest_fire": {
        **_grid(150),
        "tree_density": _prob(),
        "spread_prob": _prob(),
    },
    "diffusion": {
        **_grid(120),
        "density": _prob(),
        "innovation_coeff": _prob(),
        "imitation_coeff": _prob(),
        "initial_adopters": Param(int, 0, 500),
    },
    "schelling": {
        **_grid(100),
        "density": _prob(),
        "minority_pct": _prob(),
        "homophily": _prob(),
    },
    "wealth": {
        **_grid(120),
        "num_agents": Param(int, 1, 1500),
        "max_vision": Param(int, 1, 20),
        "max_metabolism": Param(int, 1, 20),
        "max_initial_sugar": Param(int, 1, 100),
    },
}

# Parameters that agents read from the model on every step, so changing them
# mid-run is meaningful. Everything else is fixed at construction time.
LIVE_PARAMS: dict[str, frozenset] = {
    "predator_prey": frozenset(),
    "sir": frozenset({"transmission_rate", "recovery_time"}),
    "forest_fire": frozenset({"spread_prob"}),
    "diffusion": frozenset({"innovation_coeff", "imitation_coeff"}),
    "schelling": frozenset({"homophily"}),
    "wealth": frozenset(),
}

SEED = Param(int, 0, 2**32 - 1)


def _coerce(name: str, spec: Param, value: Any):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"Parameter '{name}' must be a number")
    if spec.kind is int:
        if float(value) != int(value):
            raise ValueError(f"Parameter '{name}' must be an integer")
        value = int(value)
    else:
        value = float(value)
    if not spec.min <= value <= spec.max:
        raise ValueError(f"Parameter '{name}' must be between {spec.min} and {spec.max} (got {value})")
    return value


def validate_params(model_type: str, params: Mapping[str, Any], *, live_only: bool = False) -> dict[str, Any]:
    """Return a cleaned copy of ``params`` or raise ValueError with a readable message."""
    if model_type not in PARAM_SPECS:
        raise ValueError(f"Unknown model type '{model_type}'. Available: {list(MODEL_REGISTRY)}")
    specs = PARAM_SPECS[model_type]
    allowed = LIVE_PARAMS[model_type] if live_only else set(specs) | {"seed"}

    cleaned: dict[str, Any] = {}
    for name, value in params.items():
        if name not in allowed:
            what = "can be changed while running" if live_only else "is accepted"
            raise ValueError(f"No parameter '{name}' {what} for model '{model_type}'")
        if name == "seed":
            if value is not None:
                cleaned[name] = _coerce(name, SEED, value)
            continue
        cleaned[name] = _coerce(name, specs[name], value)
    return cleaned


def create_model(model_type: str, params: Mapping[str, Any]):
    cleaned = validate_params(model_type, params)
    return MODEL_REGISTRY[model_type](**cleaned)
