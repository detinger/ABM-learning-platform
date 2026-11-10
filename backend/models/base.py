"""Shared helpers for exposing Mesa models over the API."""

from collections.abc import Callable
from typing import Any

# out_key -> (DataCollector reporter name, converter)
HistoryColumns = dict[str, tuple[str, Callable[[Any], Any]]]


def history_rows(model, columns: HistoryColumns, start: int = 0) -> list[dict[str, Any]]:
    """Return history rows from ``start`` onward without building a DataFrame.

    Mesa collects once at construction and once per step, so row ``i`` is tick ``i``.
    Reading the raw ``model_vars`` lists keeps each tick O(new rows) instead of O(history).
    """
    model_vars = model.datacollector.model_vars
    first = next(iter(columns.values()))[0]
    total = len(model_vars.get(first, []))
    rows = []
    for i in range(max(0, start), total):
        row: dict[str, Any] = {"step": i}
        for out_key, (source, convert) in columns.items():
            row[out_key] = convert(model_vars[source][i])
        rows.append(row)
    return rows


def history_length(model) -> int:
    model_vars = model.datacollector.model_vars
    return len(next(iter(model_vars.values()), []))
