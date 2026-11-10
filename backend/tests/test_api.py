import pytest
from fastapi.testclient import TestClient

from backend import main_api


@pytest.fixture
def client():
    with TestClient(main_api.app) as c:
        yield c


def create(client, model_type="sir", **params):
    res = client.post("/api/simulation/create", json={"model_type": model_type, "params": params})
    assert res.status_code == 200, res.text
    return res.json()["simulation_id"]


def test_health_and_models(client):
    assert client.get("/api/health").json()["status"] == "ok"
    body = client.get("/api/models").json()
    assert "sir" in body["models"]
    assert body["params"]["sir"]["transmission_rate"]["live"] is True


def test_create_rejects_bad_params(client):
    res = client.post("/api/simulation/create", json={"model_type": "sir", "params": {"width": 99999}})
    assert res.status_code == 400
    res = client.post("/api/simulation/create", json={"model_type": "nope", "params": {}})
    assert res.status_code == 400


def test_rest_step_reset_delete(client):
    sim = create(client, seed=1)
    res = client.post(f"/api/simulation/{sim}/control", json={"action": "step", "steps": 3})
    assert res.json()["current_step"] == 3
    assert client.post(f"/api/simulation/{sim}/control", json={"action": "step", "steps": 10_000}).status_code == 422
    assert client.post(f"/api/simulation/{sim}/control", json={"action": "reset"}).json()["current_step"] == 0
    assert len(client.get(f"/api/simulation/{sim}/history").json()["history"]) == 1
    assert client.delete(f"/api/simulation/{sim}").status_code == 200
    assert client.get(f"/api/simulation/{sim}/state").status_code == 404


def test_websocket_protocol(client):
    sim = create(client, seed=2)
    with client.websocket_connect(f"/ws/simulation/{sim}") as ws:
        ws.send_json({"command": "get_state"})
        msg = ws.receive_json()
        assert msg["type"] == "state" and msg["append"] is False and len(msg["history"]) == 1

        ws.send_json({"command": "step", "steps": 2})
        msg = ws.receive_json()
        assert msg["append"] is True
        assert [r["step"] for r in msg["history"]] == [1, 2]

        ws.send_text("not json")
        assert ws.receive_json()["type"] == "error"

        ws.send_json({"command": "update_params", "params": {"width": 3}})
        assert ws.receive_json()["type"] == "error"

        ws.send_json({"command": "update_params", "params": {"transmission_rate": 0.9}})
        assert ws.receive_json() == {"type": "params_updated", "params": {"transmission_rate": 0.9}}

        ws.send_json({"command": "start", "speed": 0.02})
        msg = ws.receive_json()
        assert msg["type"] == "state" and msg["history"][0]["step"] == 3
        ws.send_json({"command": "pause"})
        while (msg := ws.receive_json())["type"] != "paused":
            pass

        ws.send_json({"command": "reset"})
        msg = ws.receive_json()
        assert msg["append"] is False and msg["data"]["step"] == 0

    # Closing the last connection discards the simulation.
    assert client.get(f"/api/simulation/{sim}/state").status_code == 404


def test_websocket_reports_terminal_state(client):
    sim = create(client, "sir", population=5, initial_infected=0, seed=3)
    with client.websocket_connect(f"/ws/simulation/{sim}") as ws:
        ws.send_json({"command": "step"})
        assert ws.receive_json()["type"] == "state"
        assert ws.receive_json()["type"] == "ended"
        ws.send_json({"command": "start"})
        assert ws.receive_json()["type"] == "ended"


def test_unknown_simulation_websocket(client):
    with client.websocket_connect("/ws/simulation/missing") as ws:
        assert ws.receive_json()["type"] == "error"


def test_store_ttl_and_cap():
    from backend.store import SimulationStore

    store = SimulationStore(ttl_seconds=0, max_items=2)
    a = store.create("sir", {})
    store.create("sir", {})
    store.create("sir", {})
    assert len(store) == 2 and store.get(a.id) is None  # oldest evicted
    assert store.sweep() == 2 and len(store) == 0
