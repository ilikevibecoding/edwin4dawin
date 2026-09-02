#!/usr/bin/env python3
"""Independent edge-list audit of the two-rooted-star Newton theorem."""

from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / "prove_iso_disjoint_rooted_stars_newton_agent.py"
PRODUCER_REPORT = HERE / "iso_disjoint_rooted_stars_newton_exact_agent_20260829.json"
OUTPUT = HERE / "iso_disjoint_rooted_stars_newton_audit_agent_20260829.json"
PINNED_SOURCE = "FDE0BEF62F49D31AC5183FE5BB10734A3793F9FD64AEDF929AE2275275F9FD92"
PINNED_REPORT = "B6B862674C9967411C62A965032674A6FC9410968C7C5D59851AA640088AF9B3"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_producer():
    spec = importlib.util.spec_from_file_location("two_star_newton_producer", PRODUCER)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def independence_row(n: int, edges: list[tuple[int, int]], removed: set[int]):
    live = [v for v in range(n) if v not in removed]
    pos = {v: k for k, v in enumerate(live)}
    edge_masks = [
        (1 << pos[u]) | (1 << pos[v])
        for u, v in edges
        if u in pos and v in pos
    ]
    row = [0] * (len(live) + 1)
    for subset in range(1 << len(live)):
        if all(subset & mask != mask for mask in edge_masks):
            row[subset.bit_count()] += 1
    while len(row) > 1 and row[-1] == 0:
        row.pop()
    return row


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def four_minor(E, U, V, W, rank):
    return (
        2*rank*at(E,rank)*at(W,rank-2)
        -(rank+1)*at(E,rank+1)*at(W,rank-3)
        +at(E,rank-1)*(2*at(W,rank-3)-(rank+1)*at(W,rank-1))
        +at(U,rank)*(-(rank+1)*at(V,rank-2)-at(W,rank-3))
        +at(U,rank-1)*(2*rank*at(V,rank-1)+2*at(W,rank-2))
        +at(U,rank-2)*(-(rank+1)*at(V,rank)+2*at(V,rank-2)-at(W,rank-1))
        -at(V,rank)*at(W,rank-3)+2*at(V,rank-1)*at(W,rank-2)
        -at(V,rank-2)*at(W,rank-1)
    )


def main():
    assert sha(PRODUCER) == PINNED_SOURCE
    assert sha(PRODUCER_REPORT) == PINNED_REPORT
    producer_report = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    assert producer_report["marker"] == "PASS_EXACT_ALL_ORDER_ISO_DISJOINT_ROOTED_STARS_NEWTON_BASE"
    producer = load_producer()

    stream = hashlib.sha256(); checks = 0; minimum = None
    for a in range(0, 7):
        for b in range(0, 7):
            u = 0
            v = a + 1
            n = a + b + 2
            edges = [(u, leaf) for leaf in range(1, a+1)]
            edges += [(v, leaf) for leaf in range(v+1, v+b+1)]
            E = independence_row(n, edges, set())
            U = independence_row(n, edges, {u})
            V = independence_row(n, edges, {v})
            W = independence_row(n, edges, {u, v})
            for rank in range(2, a+b+5):
                graph_value = four_minor(E, U, V, W, rank)
                formula_value = producer.numeric_N(a, b, rank)
                assert graph_value == formula_value
                assert graph_value >= 0
                checks += 1
                stream.update(f"{a},{b},{rank},{graph_value};".encode())
                cell = {"value": graph_value, "a": a, "b": b, "rank": rank}
                if minimum is None or graph_value < minimum["value"]:
                    minimum = cell

    report = {
        "marker": "PASS_INDEPENDENT_EDGE_LIST_AUDIT_ISO_DISJOINT_ROOTED_STARS_NEWTON_BASE",
        "pinned_source_sha256": PINNED_SOURCE,
        "pinned_report_sha256": PINNED_REPORT,
        "graph_rank_checks": checks,
        "ranges": {"a": [0, 6], "b": [0, 6]},
        "minimum": minimum,
        "value_stream_sha256": stream.hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(raw, end="")
    print(report["marker"])


if __name__ == "__main__":
    main()
