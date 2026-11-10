import pytest

from backend.models.registry import MODEL_REGISTRY, PARAM_SPECS, create_model, validate_params

MODEL_TYPES = sorted(MODEL_REGISTRY)


@pytest.mark.parametrize("model_type", MODEL_TYPES)
def test_model_runs_and_exposes_consistent_state(model_type):
    model = create_model(model_type, {"seed": 7})
    for _ in range(50):
        if not model.running:
            break
        model.step()

    state = model.get_api_state()
    assert state["model_type"] == model_type
    assert state["step"] == model.steps
    assert state["width"] > 0 and state["height"] > 0
    assert isinstance(state["counts"], dict) and state["counts"]
    for agent in state["agents"]:
        assert 0 <= agent["x"] < state["width"]
        assert 0 <= agent["y"] < state["height"]

    history = model.get_api_history()
    assert [row["step"] for row in history] == list(range(model.steps + 1))
    # Incremental reads return exactly the tail.
    assert model.get_api_history(len(history) - 1) == history[-1:]
    assert model.get_api_history(len(history)) == []


@pytest.mark.parametrize("model_type", MODEL_TYPES)
def test_same_seed_reproduces_run(model_type):
    def run():
        model = create_model(model_type, {"seed": 123})
        for _ in range(15):
            if model.running:
                model.step()
        return model.get_api_history()

    assert run() == run()


@pytest.mark.parametrize("model_type", MODEL_TYPES)
def test_param_specs_match_constructor(model_type):
    import inspect

    accepted = set(inspect.signature(MODEL_REGISTRY[model_type].__init__).parameters) - {"self", "seed"}
    assert set(PARAM_SPECS[model_type]) == accepted


def test_validation_rejects_unknown_and_out_of_range():
    with pytest.raises(ValueError, match="No parameter"):
        validate_params("sir", {"grid": 1})
    with pytest.raises(ValueError, match="between"):
        validate_params("sir", {"width": 5000})
    with pytest.raises(ValueError, match="integer"):
        validate_params("sir", {"population": 10.5})
    with pytest.raises(ValueError, match="number"):
        validate_params("sir", {"population": "10"})
    with pytest.raises(ValueError, match="Unknown model"):
        validate_params("nope", {})


def test_validation_coerces_types():
    assert validate_params("sir", {"population": 10.0, "transmission_rate": 1}) == {
        "population": 10, "transmission_rate": 1.0,
    }


def test_live_only_whitelist():
    assert validate_params("sir", {"transmission_rate": 0.5}, live_only=True) == {"transmission_rate": 0.5}
    with pytest.raises(ValueError, match="while running"):
        validate_params("sir", {"width": 10}, live_only=True)
