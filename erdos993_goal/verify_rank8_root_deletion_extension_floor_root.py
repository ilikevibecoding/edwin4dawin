#!/usr/bin/env python3
"""Prove and audit the strengthened rooted-deletion extension floor at rank 8."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import networkx as nx

from scan_fixed_rank_leaf_curvature_fast import all_root_states


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_root_deletion_extension_floor_exact_root_20260825.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(top: int, bottom: int) -> int:
    return math.comb(top, bottom) if top >= bottom >= 0 else 0


def coefficient(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if rank < len(row) else 0


def extension_numerator(order: int, degree: int, rank: int) -> tuple[int, int]:
    """Return numerator/denominator of the extension mean R_d."""
    selected_rank = rank - 1
    far_order = order - degree - 1
    numerator = (
        (order - 1 - 3 * selected_rank - min(selected_rank, degree))
        * far_order
        + 2 * selected_rank
    )
    return numerator, far_order


def rank7_extension_d3_floor(order: int) -> Fraction:
    # R_3=(n^2-26n+100)/(n-4), followed by R_3/(R_3+7).
    return Fraction(
        order * order - 26 * order + 100,
        order * order - 19 * order + 72,
    )


def rank7_binomial_d4_floor(order: int) -> Fraction:
    # C(n-7,7)/[C(n-7,7)+C(n-5,6)], cancelled exactly.
    cubic = (order - 11) * (order - 12) * (order - 13)
    quadratic = 7 * (order - 5) * (order - 6)
    return Fraction(cubic, cubic + quadratic)


def rank7_universal_floor(order: int) -> Fraction:
    return min(rank7_extension_d3_floor(order), rank7_binomial_d4_floor(order))


def deterministic_trees(order: int) -> list[nx.Graph]:
    trees = [nx.path_graph(order), nx.star_graph(order - 1)]
    sequences = [
        [0] * (order - 2),
        [j % max(1, order // 3) for j in range(order - 2)],
        [((j * j + 3 * j + 1) % order) for j in range(order - 2)],
        [((7 * j + 5) % order) for j in range(order - 2)],
    ]
    trees.extend(nx.from_prufer_sequence(seq) for seq in sequences)
    return trees


def main() -> None:
    # Exact algebra behind the d<=3 / d>=4 partition and the crossover.
    algebra_checks = 0
    for order in range(28, 401):
        extension_floor = rank7_extension_d3_floor(order)
        binomial_floor = rank7_binomial_d4_floor(order)
        universal = rank7_universal_floor(order)
        crossover_cubic = order**3 - 53 * order**2 + 520 * order - 1288
        assert (extension_floor <= binomial_floor) == (crossover_cubic <= 0)
        assert (order <= 41) == (crossover_cubic <= 0)
        for degree in range(1, order):
            far_order = order - degree - 1
            if far_order < 6:
                continue
            r_num, r_den = extension_numerator(order, degree, 7)
            extension_degree_floor = Fraction(r_num, r_num + 7 * r_den)
            path_floor = choose(order - 7, 7)
            containing_ceiling = choose(far_order, 6)
            binomial_degree_floor = Fraction(
                path_floor, path_floor + containing_ceiling
            )
            combined = max(extension_degree_floor, binomial_degree_floor)
            assert universal <= combined
            if degree <= 3:
                assert extension_floor <= extension_degree_floor
            if degree >= 4:
                assert binomial_floor <= binomial_degree_floor
            algebra_checks += 1

    # The cubic is increasing from 42 onward, so the finite crossover check is
    # an all-order one rather than a numerical cutoff assumption.
    assert 42**3 - 53 * 42**2 + 520 * 42 - 1288 > 0
    assert 3 * 42**2 - 106 * 42 + 520 > 0
    # The derivative's derivative 6n-106 is positive for every n>=42.

    trees_checked = roots_checked = active_extension_checks = 0
    minimum_extension_slack = None
    minimum_extension_witness = None
    for order in range(2, 14):
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            deleted, whole = all_root_states(tree, 8)
            trees_checked += 1
            graph6 = nx.to_graph6_bytes(tree, header=False).decode().strip()
            for root in tree:
                roots_checked += 1
                degree = tree.degree(root)
                far_order = order - degree - 1
                for rank in range(2, 9):
                    c_rank = coefficient(whole, rank)
                    if not c_rank:
                        continue
                    h_rank = coefficient(deleted[root], rank)
                    a_rank = c_rank - h_rank
                    selected_rank = rank - 1
                    if not a_rank:
                        continue
                    assert far_order >= selected_rank
                    r_num, r_den = extension_numerator(order, degree, rank)
                    # k*h >= a*R_d, with the denominator m cleared.
                    slack = rank * h_rank * r_den - a_rank * r_num
                    assert slack >= 0
                    active_extension_checks += 1
                    row = (
                        slack,
                        order,
                        tree_index,
                        root,
                        degree,
                        rank,
                        h_rank,
                        a_rank,
                        r_num,
                        r_den,
                        graph6,
                    )
                    if minimum_extension_slack is None or row < minimum_extension_witness:
                        minimum_extension_slack = slack
                        minimum_extension_witness = row

    # Larger deterministic trees directly test the final rank-seven floor in
    # its live n>=28 range, using the existing exact rooted tree DP.
    large_tree_checks = large_root_checks = 0
    minimum_rank7_slack = None
    minimum_rank7_witness = None
    for order in (28, 29, 31, 40, 41, 42, 43, 60, 80, 120, 200):
        floor = rank7_universal_floor(order)
        for family_index, tree in enumerate(deterministic_trees(order)):
            deleted, whole = all_root_states(tree, 8)
            c7 = coefficient(whole, 7)
            if not c7:
                continue
            large_tree_checks += 1
            for root in tree:
                h7 = coefficient(deleted[root], 7)
                slack = h7 * floor.denominator - c7 * floor.numerator
                assert slack >= 0
                large_root_checks += 1
                row = (
                    slack,
                    order,
                    family_index,
                    root,
                    tree.degree(root),
                    h7,
                    c7,
                )
                if minimum_rank7_slack is None or row < minimum_rank7_witness:
                    minimum_rank7_slack = slack
                    minimum_rank7_witness = row

    samples = []
    for order in (28, 31, 40, 41, 42, 80, 200, 1000):
        extension_floor = rank7_extension_d3_floor(order)
        binomial_floor = rank7_binomial_d4_floor(order)
        floor = min(extension_floor, binomial_floor)
        samples.append(
            {
                "order": order,
                "extension_d3": str(extension_floor),
                "binomial_d4": str(binomial_floor),
                "universal_floor": str(floor),
                "active_branch": "extension_d3" if order <= 41 else "binomial_d4",
                "decimal": f"{float(floor):.18g}",
            }
        )

    payload = {
        "schema": "rank8-root-deletion-extension-floor-root-v1",
        "status": "PASS_EXACT_ALL_ORDER_ROOT_DELETION_EXTENSION_FLOOR",
        "theorem": (
            "Let T be an n-vertex tree, q have degree d, k>=2, s=k-1, "
            "H=T-N[q], m=n-d-1, a=i_s(H), and h=i_k(T-q). If a>0, then "
            "k*h >= a*(n-1-3s+2s/m-min(s,d))."
        ),
        "proof": {
            "selected_degree": (
                "For a uniform independent s-set R of the m-vertex forest H, "
                "the forest incidence injection gives "
                "E[sum_(v in R)deg_H(v)]<=2s-2s/m."
            ),
            "boundary": (
                "Every vertex of H has at most one neighbor in N(q), since two "
                "would create a cycle through q. Thus R hits at most min(s,d) "
                "distinct boundary vertices."
            ),
            "extensions": (
                "The mean number of vertices extending R inside T-q is at least "
                "n-1-3s+2s/m-min(s,d). Summing extensions counts each "
                "independent k-set of T-q at most k times, proving the theorem."
            ),
        },
        "rank8_corollary": {
            "definition": "Z=i7(T-q)/i7(T)",
            "all_order_range": "n>=28",
            "extension_d3": "E3=(n^2-26n+100)/(n^2-19n+72)",
            "binomial_d4": (
                "B4=(n-11)(n-12)(n-13)/"
                "[(n-11)(n-12)(n-13)+7(n-5)(n-6)]"
            ),
            "universal": "Z>=min(E3,B4)",
            "piecewise": "Z>=E3 for 28<=n<=41; Z>=B4 for n>=42",
            "crossover_polynomial": "n^3-53n^2+520n-1288",
            "samples": samples,
        },
        "exact_checks": {
            "algebra_degree_cells": algebra_checks,
            "small_tree_census": {
                "orders": "2..13",
                "trees": trees_checked,
                "roots": roots_checked,
                "active_extension_checks": active_extension_checks,
                "minimum_slack": minimum_extension_slack,
                "minimum_witness": (
                    list(minimum_extension_witness)
                    if minimum_extension_witness
                    else None
                ),
            },
            "large_rank7_families": {
                "trees": large_tree_checks,
                "roots": large_root_checks,
                "minimum_slack": minimum_rank7_slack,
                "minimum_witness": (
                    list(minimum_rank7_witness) if minimum_rank7_witness else None
                ),
            },
        },
        "scope_warning": (
            "This is a stronger all-order realizability constraint. It does not "
            "alone prove a pending Delta tensor, connected Q8, forest Q8, "
            "rank-eight PGC, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
