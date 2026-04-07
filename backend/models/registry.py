"""Model registry — maps model_type strings to model classes."""

from .predator_prey import PredatorPreyModel
from .sir_model import SIRModel
from .forest_fire import ForestFireModel
from .diffusion import DiffusionModel
from .schelling import SchellingModel
from .wealth import WealthModel

MODEL_REGISTRY = {
    "predator_prey": PredatorPreyModel,
    "sir": SIRModel,
    "forest_fire": ForestFireModel,
    "diffusion": DiffusionModel,
    "schelling": SchellingModel,
    "wealth": WealthModel,
}


def create_model(model_type: str, params: dict):
    if model_type not in MODEL_REGISTRY:
        raise ValueError(f"Unknown model type '{model_type}'. Available: {list(MODEL_REGISTRY)}")
    return MODEL_REGISTRY[model_type](**params)
