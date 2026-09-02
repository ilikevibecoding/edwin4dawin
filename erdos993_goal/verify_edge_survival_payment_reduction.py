#!/usr/bin/env python3
"""Verify the edge-survival reduction of denominator-free payment.

The strong rank-free floor Q>=0 is also tested on Galvin's T_{14,8};
that strengthening fails, while the actual rank-budgeted payment
P_q=Q+qS^2 remains positive at every rank.
"""

from __future__ import annotations

import json
from itertools import combinations
from pathlib import Path

import networkx as nx
import sympy as sp

from scan_denominator_free_payment_tree_dp import tree_moment_jet


def galvin_tree(m: int, t: int) -> nx.Graph:
    """Construct Galvin's rooted tree T_{m,t,1}."""
    tree = nx.Graph()
    tree.add_nodes_from(range(1 + m + 2 * m * t))
    for branch in range(m):
        support = 1 + branch
        tree.add_edge(0, support)
        for arm in range(t):
            middle = 1 + m + branch * t + arm
            leaf = 1 + m + m * t + branch * t + arm
            tree.add_edge(support, middle)
            tree.add_edge(middle, leaf)
    assert nx.is_tree(tree)
    return tree


def brute_rank_statistics(
    tree: nx.Graph, q: int
) -> tuple[int, int, int, int, int, int]:
    """Return count,S,H2,H3,E0,E1 and verify the wedge identity."""
    order = len(tree)
    adjacency = [0] * order
    closed = [0] * order
    edges = list(tree.edges())
    for left, right in edges:
        adjacency[left] |= 1 << right
        adjacency[right] |= 1 << left
    for vertex in range(order):
        closed[vertex] = adjacency[vertex] | (1 << vertex)
    all_mask = (1 << order) - 1

    count = S = H2 = H3 = E0 = E1 = W0 = 0
    for vertices in combinations(range(order), q):
        chosen = 0
        forbidden = 0
        valid = True
        for vertex in vertices:
            if adjacency[vertex] & chosen:
                valid = False
                break
            chosen |= 1 << vertex
            forbidden |= closed[vertex]
        if not valid:
            continue
        residual = all_mask & ~forbidden
        h = residual.bit_count()
        degrees = [
            (adjacency[vertex] & residual).bit_count()
            for vertex in range(order)
            if residual & (1 << vertex)
        ]
        e = sum(degrees) // 2
        wedges = sum(degree * (degree - 1) // 2 for degree in degrees)
        count += 1
        S += h
        H2 += h * h
        H3 += h * h * h
        E0 += e
        E1 += h * e
        W0 += wedges

    next_edge_count = 0
    for vertices in combinations(range(order), q + 1):
        chosen = 0
        forbidden = 0
        valid = True
        for vertex in vertices:
            if adjacency[vertex] & chosen:
                valid = False
                break
            chosen |= 1 << vertex
            forbidden |= closed[vertex]
        if not valid:
            continue
        residual = all_mask & ~forbidden
        next_edge_count += sum(
            bool(residual & (1 << left))
            and bool(residual & (1 << right))
            for left, right in edges
        )
    assert E1 == (q + 1) * next_edge_count + 2 * W0 + 2 * E0
    return count, S, H2, H3, E0, E1


def main() -> None:
    S, B, C, E0, E1, W, En, q = sp.symbols(
        "S B C E0 E1 W En q"
    )
    H2 = S + B + 2 * E0
    H3 = S + 3 * B + C - 6 * E0 + 6 * E1 - 6 * W
    C0 = S - E0
    C1 = H2 - E1
    Q = sp.expand(
        H2**2 + 4 * H2 * C0 - S * H3 - 3 * S * C1 - S**2
    )
    expected_with_wedges = (
        B**2
        - C * S
        - 4 * E0**2
        + 8 * E0 * S
        - 3 * E1 * S
        + 6 * S * W
    )
    assert sp.expand(Q - expected_with_wedges) == 0

    edge_survival_substitution = {
        E1: (q + 1) * En + 2 * W + 2 * E0
    }
    reduced_Q = sp.expand(Q.subs(edge_survival_substitution))
    expected_reduced_Q = (
        B**2
        - C * S
        + 2 * S * E0
        - 3 * (q + 1) * S * En
        - 4 * E0**2
    )
    assert sp.expand(reduced_Q - expected_reduced_Q) == 0
    reduced_payment = sp.expand(reduced_Q + q * S**2)

    brute_checks = 0
    for order in range(2, 11):
        for tree in nx.nonisomorphic_trees(order):
            dynamic = tree_moment_jet(tree)
            for rank in range(1, max(dynamic) + 1):
                if rank + 1 not in dynamic:
                    continue
                brute = brute_rank_statistics(tree, rank)
                row = dynamic[rank]
                assert brute == row
                brute_checks += 1

    tree = galvin_tree(14, 8)
    jet = tree_moment_jet(tree)
    payment_failures = []
    strong_floor_failures = []
    minimum_payment = None
    minimum_strong_floor = None
    for rank, (count, mass, h2, h3, edge0, h_edge) in sorted(
        jet.items()
    ):
        if rank < 1 or mass == 0:
            continue
        component0 = mass - edge0
        component1 = h2 - h_edge
        payment = (
            (rank - 1) * mass**2
            - mass * h3
            - 3 * mass * component1
            + h2**2
            + 4 * h2 * component0
        )
        strong_gap = payment - rank * mass**2
        payment_record = {
            "rank_q": rank,
            "payment": payment,
            "normalized": str(sp.Rational(payment, mass**2)),
        }
        strong_record = {
            "rank_q": rank,
            "strong_floor_gap": strong_gap,
            "normalized": str(sp.Rational(strong_gap, mass**2)),
        }
        if payment < 0:
            payment_failures.append(payment_record)
        if strong_gap < 0:
            strong_floor_failures.append(strong_record)
        if (
            minimum_payment is None
            or payment * minimum_payment[1]
            < minimum_payment[0] * mass**2
        ):
            minimum_payment = (payment, mass**2, rank)
        if (
            minimum_strong_floor is None
            or strong_gap * minimum_strong_floor[1]
            < minimum_strong_floor[0] * mass**2
        ):
            minimum_strong_floor = (strong_gap, mass**2, rank)

    assert not payment_failures
    assert len(strong_floor_failures) == 6
    assert minimum_payment is not None
    assert minimum_strong_floor is not None

    report = {
        "status": "PASS_EDGE_SURVIVAL_REDUCTION_STRONG_FLOOR_REFUTED",
        "symbolic_strong_Q": str(sp.factor(reduced_Q)),
        "symbolic_actual_payment": str(sp.factor(reduced_payment)),
        "edge_survival_identity": (
            "E1_q=(q+1)*E_(q+1)+2*W_q+2*E_q"
        ),
        "small_tree_brute_checks": brute_checks,
        "galvin_counterexample": {
            "family": "T_{14,8}",
            "order": len(tree),
            "actual_payment_failures": payment_failures,
            "strong_floor_failure_count": len(strong_floor_failures),
            "strong_floor_failures": strong_floor_failures,
            "minimum_actual_payment": {
                "rank_q": minimum_payment[2],
                "exact": (
                    f"{minimum_payment[0]}/{minimum_payment[1]}"
                ),
                "decimal": (
                    minimum_payment[0] / minimum_payment[1]
                ),
            },
            "minimum_strong_floor": {
                "rank_q": minimum_strong_floor[2],
                "exact": (
                    f"{minimum_strong_floor[0]}/"
                    f"{minimum_strong_floor[1]}"
                ),
                "decimal": (
                    minimum_strong_floor[0]
                    / minimum_strong_floor[1]
                ),
            },
        },
        "conclusion": (
            "The q*S^2 rank budget cannot be removed. The actual "
            "denominator-free payment survives this exact Galvin "
            "counterexample to the stronger rank-free floor."
        ),
    }
    output = Path(
        "edge_survival_payment_reduction_certificate_20260729.json"
    )
    output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
