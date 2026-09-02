#!/usr/bin/env python3
"""Verify a 31-vertex HIT counterexample to the discarded ED companion.

This tree does *not* counterexample Erdős 993 or the primary full-minor
invariant.  It shows that the proposed companion

    M_E(m,n) >= M_J(m,n)

is false once nonminimal leaf padding is allowed.
"""

from __future__ import annotations

import json

import networkx as nx

from hit_curvature_reserve_stress import planted_state, tree_certificate
from hit_full_minor_reserve_stress import state_records, toeplitz_minor


EDGES_A = [
    (0, 1),
    (0, 5),
    (0, 7),
    (1, 2),
    (1, 3),
    (1, 4),
    (2, 8),
    (2, 9),
    (3, 10),
    (3, 11),
    (4, 12),
    (4, 13),
    (5, 6),
    (5, 14),
    (6, 15),
    (6, 16),
]
EDGES_B = [
    (0, 1),
    (0, 3),
    (0, 4),
    (1, 2),
    (1, 5),
    (2, 6),
    (2, 7),
    (3, 8),
    (3, 9),
    (4, 10),
    (4, 11),
]


def build_tree() -> nx.Graph:
    graph = nx.Graph()
    graph.add_edges_from(EDGES_A)
    offset = 17
    graph.add_edges_from(
        (left + offset, right + offset) for left, right in EDGES_B
    )
    # Join roots 2 and 3 (offset to 20) below a new binary planted root 29,
    # then add leaf 30 as the root's parent in the unrooted HIT.
    graph.add_edges_from([(29, 2), (29, 20), (29, 30)])
    return graph


def main() -> None:
    graph = build_tree()
    assert nx.is_tree(graph)
    assert graph.number_of_nodes() == 31
    assert all(degree != 2 for _, degree in graph.degree())

    memo = {}
    state = planted_state(graph, 29, 30, memo)
    e_minor = toeplitz_minor(state.e, 18, 18)
    j_minor = toeplitz_minor(state.j, 18, 18)
    assert e_minor == 957
    assert j_minor == 971
    assert e_minor - j_minor == -14

    primary_checks = 0
    primary_failures = []
    internal = [vertex for vertex, degree in graph.degree() if degree > 1]
    for vertex, parent, planted in state_records(graph, internal):
        upper = max(len(planted.t) - 1, len(planted.j))
        for m in range(upper + 1):
            for n in range(m + 1):
                reserve = toeplitz_minor(
                    planted.t, m, n
                ) - toeplitz_minor(planted.j, m - 1, n - 1)
                primary_checks += 1
                if reserve < 0:
                    primary_failures.append(
                        {
                            "vertex": vertex,
                            "parent": parent,
                            "m": m,
                            "n": n,
                            "reserve": reserve,
                        }
                    )
    assert primary_checks == 8_939
    assert not primary_failures

    whole = planted_state(graph, 30, None, memo).t
    first_descent = next(
        (
            index
            for index in range(len(whole) - 1)
            if whole[index + 1] < whole[index]
        ),
        None,
    )
    first_reascent = (
        next(
            (
                index
                for index in range(first_descent + 1, len(whole) - 1)
                if whole[index + 1] > whole[index]
            ),
            None,
        )
        if first_descent is not None
        else None
    )
    lc_failures = [
        index
        for index in range(1, len(whole) - 1)
        if whole[index] ** 2 < whole[index - 1] * whole[index + 1]
    ]
    assert first_reascent is None
    assert not lc_failures

    report = {
        "certificate": "passed",
        "tree": tree_certificate(graph),
        "discarded_companion_failure": {
            "root": 29,
            "parent": 30,
            "m": 18,
            "n": 18,
            "E_minor": e_minor,
            "J_minor": j_minor,
            "reserve": e_minor - j_minor,
            "E": state.e,
            "J": state.j,
            "T": state.t,
        },
        "primary_full_minor_checks": primary_checks,
        "primary_full_minor_failures": primary_failures,
        "whole_tree": {
            "independence_polynomial": whole,
            "first_descent": first_descent,
            "first_reascent": first_reascent,
            "log_concavity_failures": lc_failures,
            "unimodal": first_reascent is None,
        },
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
