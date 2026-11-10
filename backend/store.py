"""In-memory simulation store with idle expiry and a size cap.

State lives in the process, so the app must run as a single replica. A redeploy
or restart drops every simulation, which is acceptable for a learning tool.
"""

import time
import uuid
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Any

from .models.registry import create_model


@dataclass
class Session:
    id: str
    model_type: str
    model: Any
    last_seen: float = field(default_factory=time.monotonic)
    connections: int = 0

    def touch(self) -> None:
        self.last_seen = time.monotonic()

    def reset(self) -> None:
        self.model = create_model(self.model_type, self.model.initial_params)
        self.touch()


class SimulationStore:
    def __init__(self, ttl_seconds: int, max_items: int):
        self.ttl = ttl_seconds
        self.max_items = max_items
        self._items: OrderedDict[str, Session] = OrderedDict()

    def __len__(self) -> int:
        return len(self._items)

    def __iter__(self):
        return iter(list(self._items.values()))

    def create(self, model_type: str, params: dict) -> Session:
        model = create_model(model_type, params)
        sim_id = uuid.uuid4().hex[:12]
        session = Session(sim_id, model_type, model)
        self._items[sim_id] = session
        self._enforce_cap()
        return session

    def get(self, sim_id: str) -> Session | None:
        session = self._items.get(sim_id)
        if session is not None:
            session.touch()
            self._items.move_to_end(sim_id)
        return session

    def delete(self, sim_id: str) -> bool:
        return self._items.pop(sim_id, None) is not None

    def sweep(self) -> int:
        """Drop sessions idle longer than the TTL that have no open WebSocket."""
        cutoff = time.monotonic() - self.ttl
        expired = [s.id for s in self._items.values() if s.connections == 0 and s.last_seen < cutoff]
        for sim_id in expired:
            del self._items[sim_id]
        return len(expired)

    def _enforce_cap(self) -> None:
        # Evict least-recently-used sessions, preferring ones nobody is watching.
        while len(self._items) > self.max_items:
            victim = next((s.id for s in self._items.values() if s.connections == 0), None)
            if victim is None:
                victim = next(iter(self._items))
            del self._items[victim]
