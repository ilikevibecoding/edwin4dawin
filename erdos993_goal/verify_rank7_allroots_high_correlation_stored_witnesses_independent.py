#!/usr/bin/env python3
"""Independent expanded-tree audit of stored all-root rank-seven minima."""

from __future__ import annotations

import argparse
import json
from math import comb
from pathlib import Path

import sympy as sp

from verify_rank7_terminal_broom_reduction import (
    c,
    exact_decomposition,
    h,
    newton_coefficients,
)

LIMIT = 7


def mul(left, right):
    out = [0] * (min(LIMIT, len(left) + len(right) - 2) + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= LIMIT:
                out[i + j] += a * b
    return out


def add(left, right):
    length = min(LIMIT + 1, max(len(left), len(right)))
    return [
        (left[i] if i < len(left) else 0)
        + (right[i] if i < len(right) else 0)
        for i in range(length)
    ]


def independent_sets(adjacency, deleted):
    seen = set()

    def visit(vertex, parent):
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


def expand(witness, expected_n):
    weights = witness["weights_by_vertex"]
    slots = witness["leaf_slots"]
    order = len(weights)
    adjacency = [set() for _ in range(order + sum(slots))]
    for u, v in witness["core_edges"]:
        adjacency[u].add(v)
        adjacency[v].add(u)
    core_vertex = witness["root_neighbor_vertex"]
    selected_leaf = None
    next_vertex = order
    for vertex, count in enumerate(slots):
        for _ in range(count):
            leaf = next_vertex
            next_vertex += 1
            adjacency[vertex].add(leaf)
            adjacency[leaf].add(vertex)
            if vertex == core_vertex and selected_leaf is None:
                selected_leaf = leaf
    assert next_vertex == expected_n
    if witness["root_kind"] == "positive_core_vertex":
        root = core_vertex
    else:
        assert witness["root_kind"] == "pendant_leaf" and selected_leaf is not None
        root = selected_leaf
    return adjacency, root


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    payload = json.loads(Path(args.source).read_text(encoding="utf-8"))
    raw = newton_coefficients(exact_decomposition())[:7]
    records = list(payload["rank_minima"])
    for beta_report in payload["B2_reports"].values():
        records.extend(beta_report["rank_minima"])

    fingerprints = set()
    audited = 0
    root_kind_counts = {"positive_core_vertex": 0, "pendant_leaf": 0}
    for record in records:
        witness = record["witness"]
        fingerprint = json.dumps(witness, sort_keys=True)
        if fingerprint in fingerprints:
            continue
        fingerprints.add(fingerprint)
        adjacency, root = expand(witness, int(payload["scope"]["n"]))
        closed = {root, *adjacency[root]}
        coefficients = independent_sets(adjacency, set())
        deletion = independent_sets(adjacency, closed)
        h_coefficients = independent_sets(adjacency, {root})
        assert coefficients == witness["c0_through_c7"]
        assert deletion == witness["J0_through_J7"]
        assert len(adjacency[root]) == witness["actual_root_degree"]
        degrees = [len(row) for row in adjacency]
        assert sum(comb(degree - 1, 2) for degree in degrees) == witness["B2"]
        substitutions = {c[index]: sp.Integer(coefficients[index]) for index in range(8)}
        substitutions.update({
            h[5]: sp.Integer(h_coefficients[5]),
            h[6]: sp.Integer(h_coefficients[6]),
        })
        deltas = [int(value.subs(substitutions, simultaneous=True)) for value in raw]
        assert deltas == witness["Delta0_through_Delta6"]
        assert all(value >= 0 for value in deltas)
        if int(payload["scope"]["n"]) == 23:
            assert all(value > 0 for value in deltas)
        root_kind_counts[witness["root_kind"]] += 1
        audited += 1

    beta_minima = [
        min(report["rank_minima"][rank]["value"] for report in payload["B2_reports"].values())
        for rank in range(7)
    ]
    global_minima = [record["value"] for record in payload["rank_minima"]]
    assert beta_minima == global_minima
    report = {
        "status": "PASS_INDEPENDENT_EXPANDED_TREE_ALLROOT_STORED_WITNESS_AUDIT",
        "B2_levels": len(payload["B2_reports"]),
        "distinct_stored_witnesses_audited": audited,
        "root_kind_counts": root_kind_counts,
        "global_minima": global_minima,
        "failure": None,
    }
    Path(args.output).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
