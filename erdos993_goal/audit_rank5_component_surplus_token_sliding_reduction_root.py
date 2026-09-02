#!/usr/bin/env python3
"""Independent edge-first audit of the token-sliding reduction."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / "verify_rank5_component_surplus_token_sliding_reduction_root.py"
PRIMARY = HERE / "rank5_component_surplus_token_sliding_reduction_exact_20260825.json"
THEOREM = HERE / "RANK5_COMPONENT_SURPLUS_TOKEN_SLIDING_REDUCTION_2026-08-25.md"
OUTPUT = HERE / "rank5_component_surplus_token_sliding_reduction_independent_audit_20260825.json"
PINNED = {
    PRODUCER.name: "C082868751825EFA9FD98DEBFA37EEF7F609C56C5A330E9B846D36833A526164",
    PRIMARY.name: "E15E1D8C93E4A557B212FB6494E79C31C849B228BBD153DB1D8FD4D3F7EFA2C9",
    THEOREM.name: "3946342E13832D78C1A801464BD208348412CEB732837782C99B4A8C9EABE442",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent(edges: tuple[tuple[int, int], ...], chosen: tuple[int, ...]) -> bool:
    selected = set(chosen)
    return all(not (u in selected and v in selected) for u, v in edges)


def audit_tree(tree: nx.Graph) -> tuple[int, int, int, int, int]:
    vertices = tuple(tree)
    edges = tuple(tree.edges())
    n = len(vertices)
    i5 = sum(independent(edges, chosen) for chosen in itertools.combinations(vertices, 5))

    a4 = 0
    c4 = 0
    closed = {v: {v, *tree.neighbors(v)} for v in vertices}
    for chosen in itertools.combinations(vertices, 4):
        if not independent(edges, chosen):
            continue
        removed = set().union(*(closed[v] for v in chosen))
        residual = set(vertices) - removed
        residual_edges = sum(u in residual and v in residual for u, v in edges)
        a4 += len(residual)
        c4 += len(residual) - residual_edges

    token_edges_edge_first = 0
    for u, v in edges:
        forbidden = closed[u] | closed[v]
        allowed = tuple(vertex for vertex in vertices if vertex not in forbidden)
        token_edges_edge_first += sum(
            independent(edges, chosen)
            for chosen in itertools.combinations(allowed, 4)
        )

    matching_two = sum(
        len({*first, *second}) == 4
        for first, second in itertools.combinations(edges, 2)
    )
    surplus = sum(math.comb(tree.degree(v) - 1, 2) for v in vertices)
    w = math.comb(n - 2, 2)
    assert a4 == 5 * i5
    assert w - surplus == matching_two
    assert w * c4 - surplus * a4 == 5 * matching_two * i5 - w * token_edges_edge_first
    return i5, a4, c4, token_edges_edge_first, w * c4 - surplus * a4


def main() -> None:
    actual = {path.name: sha256(path) for path in (PRODUCER, PRIMARY, THEOREM)}
    assert actual == PINNED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_TOKEN_SLIDING_REDUCTION_BOUNDED_CANDIDATE_DIAGNOSTIC"
    primary_orders = {
        row["order"]: row for row in primary["bounded_census"]["per_order"]
    }

    totals = {"trees": 0, "i5": 0, "A4": 0, "C4": 0, "token_edges": 0}
    per_order = []
    for n in range(6, 12):
        local_minimum = None
        trees = 0
        for tree in nx.nonisomorphic_trees(n):
            i5, a4, c4, token_edges, margin = audit_tree(tree)
            local_minimum = margin if local_minimum is None else min(local_minimum, margin)
            totals["trees"] += 1
            totals["i5"] += i5
            totals["A4"] += a4
            totals["C4"] += c4
            totals["token_edges"] += token_edges
            trees += 1
        assert trees == primary_orders[n]["trees"]
        assert local_minimum == primary_orders[n]["minimum_candidate_margin"]
        per_order.append({"order": n, "trees": trees, "minimum_margin": local_minimum})
        print(f"INDEPENDENT_TOKEN_AUDIT_ORDER {n} TREES {trees} MIN {local_minimum}", flush=True)

    payload = {
        "schema": "rank5-component-surplus-token-sliding-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EDGE_FIRST_TOKEN_SLIDING_REDUCTION_AUDIT",
        "orders": [6, 11],
        "totals": totals,
        "per_order": per_order,
        "pinned_inputs": actual,
        "independence_statement": (
            "The audit imports neither producer code nor producer data structures. "
            "It counts token edges edge-first from T-N[u]-N[v] and recomputes residual forests directly."
        ),
        "proof_boundary": "The equivalent all-order average-degree inequality remains open.",
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
