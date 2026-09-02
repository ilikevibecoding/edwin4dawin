#!/usr/bin/env python3
"""Independent expanded-tree audit of every stored direct-census minimum."""
from __future__ import annotations

import json
from math import comb
from pathlib import Path

import sympy as sp

from verify_rank7_terminal_broom_reduction import (
    c,
    h,
    exact_decomposition,
    newton_coefficients,
)


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "rank7_r1_high_correlation_direct_delta_b26plus_exact_20260817.json"
REPORT = HERE / "rank7_r1_high_correlation_direct_delta_stored_witness_audit_20260817.json"
LIMIT = 7


def mul(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (min(LIMIT, len(left) + len(right) - 2) + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= LIMIT:
                out[i + j] += a * b
    return out


def add(left: list[int], right: list[int]) -> list[int]:
    length = min(LIMIT + 1, max(len(left), len(right)))
    return [
        (left[i] if i < len(left) else 0)
        + (right[i] if i < len(right) else 0)
        for i in range(length)
    ]


def independent_sets(adjacency: list[set[int]], deleted: set[int]) -> list[int]:
    seen: set[int] = set()

    def visit(vertex: int, parent: int) -> tuple[list[int], list[int]]:
        seen.add(vertex)
        excluded = [1]
        included = [0, 1]
        for child in adjacency[vertex]:
            if child == parent or child in deleted:
                continue
            child0, child1 = visit(child, vertex)
            excluded = mul(excluded, add(child0, child1))
            included = mul(included, child0)
        return excluded, included

    total = [1]
    for vertex in range(len(adjacency)):
        if vertex in deleted or vertex in seen:
            continue
        part0, part1 = visit(vertex, -1)
        total = mul(total, add(part0, part1))
    total += [0] * (LIMIT + 1 - len(total))
    return total[: LIMIT + 1]


def expand(witness: dict) -> tuple[list[set[int]], int, int]:
    weights = witness["weights_by_vertex"]
    slots = witness["leaf_slots"]
    order = len(weights)
    adjacency = [set() for _ in range(order + sum(slots))]
    for u, v in witness["core_edges"]:
        adjacency[u].add(v)
        adjacency[v].add(u)
    assert sum(len(neighbors) for neighbors in adjacency[:order]) == 2 * (order - 1)
    root_neighbor = witness["root_neighbor_vertex"]
    root = None
    next_vertex = order
    for vertex, count in enumerate(slots):
        for _ in range(count):
            leaf = next_vertex
            next_vertex += 1
            adjacency[vertex].add(leaf)
            adjacency[leaf].add(vertex)
            if vertex == root_neighbor and root is None:
                root = leaf
    assert next_vertex == 23 and root is not None
    return adjacency, root, root_neighbor


def main() -> int:
    payload = json.loads(SOURCE.read_text(encoding="utf-8"))
    raw = newton_coefficients(exact_decomposition())[:7]
    audited = 0
    fingerprints: set[str] = set()

    records = list(payload["rank_minima"])
    for beta_report in payload["B2_reports"].values():
        records.extend(beta_report["rank_minima"])
    for record in records:
        witness = record["witness"]
        fingerprint = json.dumps(witness, sort_keys=True)
        if fingerprint in fingerprints:
            continue
        fingerprints.add(fingerprint)
        adjacency, root, root_neighbor = expand(witness)
        coefficients = independent_sets(adjacency, set())
        deletion = independent_sets(adjacency, {root, root_neighbor})
        h_coefficients = independent_sets(adjacency, {root})
        assert coefficients == witness["c0_through_c7"]
        assert deletion == witness["J0_through_J7"]
        assert deletion[4] == witness["a_i4_J"]
        assert deletion[5] == witness["b_i5_J"]
        degrees = [len(neighbors) for neighbors in adjacency]
        beta = sum(comb(degree - 1, 2) for degree in degrees)
        assert beta == witness["B2"]
        assert witness["root_neighbor_excess"] == degrees[root_neighbor] - 1
        substitutions = {
            c[index]: sp.Integer(coefficients[index]) for index in range(8)
        }
        substitutions.update(
            {h[5]: sp.Integer(h_coefficients[5]), h[6]: sp.Integer(h_coefficients[6])}
        )
        deltas = [
            int(value.subs(substitutions, simultaneous=True)) for value in raw
        ]
        assert deltas == witness["Delta0_through_Delta6"]
        assert all(value > 0 for value in deltas)
        audited += 1

    beta_minima = [
        min(report["rank_minima"][rank]["value"] for report in payload["B2_reports"].values())
        for rank in range(7)
    ]
    global_minima = [record["value"] for record in payload["rank_minima"]]
    assert beta_minima == global_minima
    report = {
        "status": "PASS_INDEPENDENT_EXPANDED_TREE_STORED_WITNESS_AUDIT",
        "B2_levels": len(payload["B2_reports"]),
        "distinct_stored_witnesses_audited": audited,
        "global_minima": global_minima,
        "failure": None,
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
