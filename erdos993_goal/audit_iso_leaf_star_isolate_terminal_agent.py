#!/usr/bin/env python3
"""Independent literal graph audit for the star-plus-isolates ISO base."""

from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / "verify_iso_leaf_star_isolate_terminal_agent.py"
PRODUCER_REPORT = HERE / "iso_leaf_star_isolate_terminal_exact_agent_20260829.json"
OUTPUT = HERE / "iso_leaf_star_isolate_terminal_audit_agent_20260829.json"
PINNED_PRODUCER_SHA256 = "9532842E08F1B2B68F6D6E48CEE31B7C519FB3A0C3B0E633A58CF6DFD7414047"
PINNED_REPORT_SHA256 = "9764F21B884B9BF03C551CFF945B3BE7754A694C3A58698F3CFDB10AD711D420"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_producer():
    spec = importlib.util.spec_from_file_location("star_iso_producer", PRODUCER)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def independence_row(n: int, edges: list[tuple[int, int]], removed: set[int]) -> list[int]:
    live = [v for v in range(n) if v not in removed]
    live_index = {v: j for j, v in enumerate(live)}
    masks = []
    for u, v in edges:
        if u in live_index and v in live_index:
            masks.append((1 << live_index[u]) | (1 << live_index[v]))
    row = [0] * (len(live) + 1)
    for subset in range(1 << len(live)):
        if all(subset & mask != mask for mask in masks):
            row[subset.bit_count()] += 1
    while len(row) > 1 and row[-1] == 0:
        row.pop()
    return row


def q(row: list[int], rank: int) -> int:
    def at(k: int) -> int:
        return row[k] if 0 <= k < len(row) else 0

    return rank * at(rank) ** 2 + at(rank - 1) ** 2 - (rank + 1) * at(rank - 1) * at(rank + 1)


def main() -> None:
    assert sha(PRODUCER) == PINNED_PRODUCER_SHA256
    assert sha(PRODUCER_REPORT) == PINNED_REPORT_SHA256
    producer_report = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    assert producer_report["marker"] == "PASS_EXACT_ALL_ORDER_ISO_LEAF_STAR_PLUS_ISOLATES_TERMINAL"
    producer = load_producer()

    count = 0
    stream = hashlib.sha256()
    minimum = None
    # Vertex 0 is the centre, vertices 1..m are star leaves, and the rest
    # are isolates.  Vertex 1 is the distinguished leaf.
    for m in range(1, 8):
        for t in range(0, 6):
            n = m + t + 1
            edges = [(0, leaf) for leaf in range(1, m + 1)]
            full = independence_row(n, edges, set())
            deleted = independence_row(n, edges, {1})
            link = independence_row(n, edges, {0, 1})
            assert (full, deleted, link) == producer.rows(m, t)
            for rank in range(2, n + 3):
                graph_value = q(full, rank) - q(deleted, rank) - q(link, rank - 1)
                producer_value = producer.direct_remainder(m, t, rank)
                assert graph_value == producer_value
                assert graph_value >= 0
                count += 1
                stream.update(f"{m},{t},{rank},{graph_value};".encode())
                cell = {"value": graph_value, "m": m, "t": t, "rank": rank}
                if minimum is None or graph_value < minimum["value"]:
                    minimum = cell

    report = {
        "marker": "PASS_INDEPENDENT_LITERAL_GRAPH_AUDIT_ISO_LEAF_STAR_PLUS_ISOLATES_TERMINAL",
        "pinned_producer_sha256": PINNED_PRODUCER_SHA256,
        "pinned_producer_report_sha256": PINNED_REPORT_SHA256,
        "graph_cells": count,
        "ranges": {"m": [1, 7], "t": [0, 5]},
        "minimum": minimum,
        "value_stream_sha256": stream.hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(raw, end="")
    print(report["marker"])


if __name__ == "__main__":
    main()
