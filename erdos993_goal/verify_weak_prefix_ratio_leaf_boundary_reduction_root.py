#!/usr/bin/env python3
"""Verify the exact WR leaf-boundary reduction.

The pointed boundary inequality is audited finitely, not proved here.
"""

from __future__ import annotations

import json
from math import ceil
from pathlib import Path

import networkx as nx
import sympy as sy

from probe_weak_prefix_ratio_forests_root import forest_polynomial


def cutoff(alpha: int) -> int:
    return ceil((2 * alpha - 1) / 3)


def alpha(graph: nx.Graph) -> int:
    return len(forest_polynomial(graph)) - 1


def coeff(row: list[int], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def main() -> None:
    # Symbolic coefficient identity.
    r = sy.symbols("r", integer=True, positive=True)
    ar, arm1, crm1, crm2 = sy.symbols("ar arm1 crm1 crm2")
    left = r * (ar + crm1) - (arm1 + crm2)
    right = (r * ar - arm1) + ((r - 1) * crm1 - crm2) + crm1
    assert sy.expand(left - right) == 0

    jumps = []
    for beta in range(1, 10001):
        jump = cutoff(beta + 1) - cutoff(beta)
        assert jump in (0, 1)
        assert jump == (1 if beta % 3 in (0, 2) else 0)
        if jump:
            jumps.append(beta)
        for target in range(1, cutoff(beta + 1)):
            assert target - 1 < cutoff(beta)

    forests = 0
    leaf_instances = 0
    identity_checks = 0
    pointed_boundary_checks = 0
    pointed_boundary_failures = []
    for graph0 in nx.graph_atlas_g():
        if graph0.number_of_nodes() == 0:
            continue
        if not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        forests += 1
        at = alpha(graph)
        row_t = forest_polynomial(graph)
        for leaf in tuple(graph):
            if graph.degree(leaf) != 1:
                continue
            parent = next(iter(graph[leaf]))
            A = graph.copy()
            A.remove_node(leaf)
            C = A.copy()
            C.remove_node(parent)
            row_a = forest_polynomial(A)
            row_c = forest_polynomial(C)
            aa = len(row_a) - 1
            ac = len(row_c) - 1
            assert ac == at - 1
            assert aa in (at - 1, at)
            leaf_instances += 1
            for target in range(1, len(row_t)):
                wt = target * coeff(row_t, target) - coeff(row_t, target - 1)
                wa = target * coeff(row_a, target) - coeff(row_a, target - 1)
                wc = ((target - 1) * coeff(row_c, target - 1)
                      - coeff(row_c, target - 2))
                assert wt == wa + wc + coeff(row_c, target - 1)
                identity_checks += 1
            if aa == ac and aa % 3 in (0, 2):
                target = cutoff(aa)
                if 1 <= target < len(row_a):
                    h = coeff(row_a, target - 1) - coeff(row_c, target - 1)
                    margin = target * coeff(row_a, target) - h
                    pointed_boundary_checks += 1
                    if margin < 0:
                        pointed_boundary_failures.append(
                            (nx.to_graph6_bytes(graph, header=False).decode().strip(),
                             leaf, parent, aa, target, margin)
                        )
    assert not pointed_boundary_failures
    report = {
        "status": "PASS_EXACT_WEAK_PREFIX_RATIO_LEAF_BOUNDARY_REDUCTION",
        "cutoff_beta_max": 10000,
        "jump_count": len(jumps),
        "atlas_forests": forests,
        "leaf_instances": leaf_instances,
        "identity_checks": identity_checks,
        "finite_pointed_boundary_checks": pointed_boundary_checks,
        "finite_pointed_boundary_failures": 0,
        "scope": "exact conditional reduction; pointed boundary remains open",
    }
    Path("weak_prefix_ratio_leaf_boundary_reduction_exact_root_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
