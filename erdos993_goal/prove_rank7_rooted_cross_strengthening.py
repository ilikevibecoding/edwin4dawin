#!/usr/bin/env python3
"""Exact strengthening of the large-order rooted C7 reduction.

This replay checks four logically separate pieces:

1. the algebraic reduction 14*C7=e*S7+d*Q6;
2. the root-degree staircase from the sharp rank-(4,5) endpoint;
3. a quantitative B2-curvature sufficient condition in the residual band;
4. every path (B2=0) and every three-arm spider (B2=1), at every root,
   for orders 23--38.

It intentionally reports the exact cells left open.  It is not a universal
C7 certificate for the residual band.
"""

from __future__ import annotations

from functools import lru_cache
from fractions import Fraction
from hashlib import sha256
from itertools import product
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank7_rooted_cross_strengthening_exact_20260816.json"


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(a + b for a, b in zip(left, right))


def multiply(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    out = [0] * 8
    for i, a in enumerate(left):
        for j, b in enumerate(right[: 8 - i]):
            out[i + j] += a * b
    return tuple(out)


ONE = (1, 0, 0, 0, 0, 0, 0, 0)
X = (0, 1, 0, 0, 0, 0, 0, 0)


def rooted_polynomials(adjacency: list[list[int]]) -> tuple[tuple[int, ...], list[tuple[int, ...]]]:
    """Return I(T) and I(T-v) for every v, truncated exactly at rank 7."""

    @lru_cache(maxsize=None)
    def directed(vertex: int, parent: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
        excluded = ONE
        included = X
        for neighbor in adjacency[vertex]:
            if neighbor == parent:
                continue
            child_excluded, child_included = directed(neighbor, vertex)
            excluded = multiply(excluded, add(child_excluded, child_included))
            included = multiply(included, child_excluded)
        return excluded, included

    root_excluded, root_included = directed(0, -1)
    whole = add(root_excluded, root_included)
    deletions = []
    for root in range(len(adjacency)):
        polynomial = ONE
        for neighbor in adjacency[root]:
            excluded, included = directed(neighbor, root)
            polynomial = multiply(polynomial, add(excluded, included))
        deletions.append(polynomial)
    return whole, deletions


def c7(polynomial: tuple[int, ...], deletion: tuple[int, ...]) -> int:
    d, e, f = polynomial[5:8]
    h, k = deletion[5:7]
    return d * (e * e - d * f) - 2 * e * (e * h - d * k)


def path_adjacency(order: int) -> list[list[int]]:
    adjacency = [[] for _ in range(order)]
    for vertex in range(order - 1):
        adjacency[vertex].append(vertex + 1)
        adjacency[vertex + 1].append(vertex)
    return adjacency


def spider_adjacency(arms: tuple[int, int, int]) -> list[list[int]]:
    adjacency: list[list[int]] = [[] for _ in range(1 + sum(arms))]
    next_vertex = 1
    for length in arms:
        previous = 0
        for _ in range(length):
            adjacency[previous].append(next_vertex)
            adjacency[next_vertex].append(previous)
            previous = next_vertex
            next_vertex += 1
    return adjacency


def three_partitions(total: int):
    for a in range(1, total // 3 + 1):
        for b in range(a, (total - a) // 2 + 1):
            c = total - a - b
            if b <= c:
                yield (a, b, c)


def verify_algebra() -> dict:
    d, e, f, h, k = sp.symbols("d e f h k")
    q6 = 12 * e**2 - d * e - 14 * d * f
    s7 = d * (2 * e + d) - 28 * (e * h - d * k)
    target = d * (e**2 - d * f) - 2 * e * (e * h - d * k)
    assert sp.expand(14 * target - e * s7 - d * q6) == 0

    a, b = sp.symbols("a b")
    root_cross = sp.expand((k + b) * h - (h + a) * k)
    alternate = sp.expand((h + a) * b - (k + b) * a)
    assert sp.expand(root_cross - alternate) == 0

    x, y, upper = sp.symbols("x y upper")
    difference = sp.factor(
        (upper - x) / (1 + upper) - (y - x) / (1 + y)
    )
    expected_difference = (upper - y) * (x + 1) / ((upper + 1) * (y + 1))
    assert sp.simplify(difference - expected_difference) == 0
    return {
        "decomposition": "14*C7=e*S7+d*Q6",
        "Q6": "12*e^2-d*e-14*d*f",
        "S7": "d*(2*e+d)-28*(e*h-d*k)",
        "root_deletion_identity": "e*h-d*k=d*b-e*a=h*b-a*k",
        "cross_fraction_gap": str(difference),
    }


def endpoint_x(order: int, curvature: int = 0) -> Fraction:
    t = Fraction((order - 7) * (order - 8), order - 3)
    coefficient = Fraction(order**3 - 8 * order**2 - 19 * order + 302, 6)
    assert coefficient > 0
    # Exact tree-specific ceilings for i4.  First, count pairs (edge,S)
    # with |S|=4 and edge subset S: every non-independent S contains at
    # most three tree edges, giving i4<=C(n-1,4).  Second, two-term
    # inclusion-exclusion over tree edges gives the B2-sensitive ceiling
    # C(n,4)-S1+S2-S3, where
    # S1=(n-1)C(n-2,2), S2=C(n-1,2)+(n-4)(B2+n-2).
    # The connected-four-subtree bound S3>=n-3+B2 holds for n>=6.
    edge_ceiling = comb(order - 1, 4)
    inclusion_exclusion_ceiling = (
        comb(order, 4)
        - (order - 1) * comb(order - 2, 2)
        + comb(order - 1, 2)
        + (order - 4) * (curvature + order - 2)
        - (order - 3 + curvature)
    )
    i4_ceiling = min(edge_ceiling, inclusion_exclusion_ceiling)
    assert i4_ceiling > 0
    mu4 = t + coefficient * curvature / ((order - 3) * i4_ceiling)
    assert mu4 > 2
    return (mu4 - 3 + Fraction(2, 1) / mu4) / 6


def verify_connected_four_subtree_base() -> dict:
    """Check the n=6 base of S3>=n-3+B2 over all Prüfer codes.

    The all-order induction is recorded in the theorem note.  Prüfer codes
    enumerate every labeled six-vertex tree exactly once.
    """

    order = 6
    minimum_gap = None
    checks = 0
    for code in product(range(order), repeat=order - 2):
        degree_work = [1] * order
        for vertex in code:
            degree_work[vertex] += 1
        edges = []
        for vertex in code:
            leaf = next(index for index, value in enumerate(degree_work) if value == 1)
            edges.append((leaf, vertex))
            degree_work[leaf] -= 1
            degree_work[vertex] -= 1
        leaves = [index for index, value in enumerate(degree_work) if value == 1]
        assert len(leaves) == 2
        edges.append((leaves[0], leaves[1]))

        degrees = [0] * order
        for left, right in edges:
            degrees[left] += 1
            degrees[right] += 1
        b2 = sum(comb(value - 1, 2) for value in degrees)
        connected_four = sum(comb(value, 3) for value in degrees) + sum(
            (degrees[left] - 1) * (degrees[right] - 1) for left, right in edges
        )
        gap = connected_four - (order - 3 + b2)
        assert gap >= 0
        minimum_gap = gap if minimum_gap is None else min(minimum_gap, gap)
        checks += 1
    assert checks == order ** (order - 2) == 1296
    return {"labeled_trees_checked": checks, "minimum_gap": minimum_gap}


def scalar(order: int, root_degree: int, curvature: int = 0) -> Fraction:
    x = endpoint_x(order, curvature)
    upper = Fraction(order - root_degree - 5, 5)
    return 1 + 2 * x - 28 * (upper - x) / (1 + upper)


def verify_degree_and_curvature() -> tuple[list[dict], list[dict], list[dict]]:
    expected_staircase = {
        9: 19,
        8: 25,
        7: 29,
        6: 32,
        5: 34,
        4: 35,
        3: 37,
        2: 38,
        1: 39,
    }
    symbolic_n = sp.symbols("n", integer=True, positive=True)
    symbolic_t = (symbolic_n - 7) * (symbolic_n - 8) / (symbolic_n - 3)
    symbolic_x = (symbolic_t - 3 + 2 / symbolic_t) / 6
    degree_rows = []
    for root_degree in range(1, 10):
        first = expected_staircase[root_degree]
        symbolic_upper = (symbolic_n - root_degree - 5) / 5
        symbolic_scalar = sp.factor(
            1
            + 2 * symbolic_x
            - 28 * (symbolic_upper - symbolic_x) / (1 + symbolic_upper)
        )
        numerator, denominator = sp.fraction(sp.together(symbolic_scalar))
        expected_denominator = (
            3
            * (symbolic_n - root_degree)
            * (symbolic_n - 8)
            * (symbolic_n - 7)
            * (symbolic_n - 3)
        )
        assert sp.factor(denominator - expected_denominator) == 0
        shifted = sp.Poly(sp.expand(numerator.subs(symbolic_n, symbolic_n + first)), symbolic_n)
        shifted_coefficients = shifted.all_coeffs()
        assert all(value > 0 for value in shifted_coefficients)
        assert scalar(first, root_degree) > 0
        if first > 19:
            assert scalar(first - 1, root_degree) <= 0
        degree_rows.append(
            {
                "minimum_root_degree": root_degree,
                "minimum_order": first,
                "endpoint_scalar": str(scalar(first, root_degree)),
                "shifted_numerator_coefficients": [
                    int(value) for value in shifted_coefficients
                ],
            }
        )

    curvature_rows = []
    residual_cells = []
    for order in range(23, 39):
        row = {"order": order, "root_degree_thresholds": []}
        for root_degree in range(1, 10):
            maximum = comb(order - 2, 2)
            threshold = next(
                (
                    value
                    for value in range(maximum + 1)
                    if scalar(order, root_degree, value) > 0
                ),
                None,
            )
            row["root_degree_thresholds"].append(
                {
                    "root_degree": root_degree,
                    "minimum_B2": threshold,
                    "scalar_at_threshold": (
                        str(scalar(order, root_degree, threshold))
                        if threshold is not None
                        else None
                    ),
                }
            )
            if threshold is None:
                residual_cells.append(
                    {
                        "order": order,
                        "root_degree": root_degree,
                        "B2_min": 2,
                        "B2_max": maximum,
                        "reason": "curvature threshold exceeds the universal star ceiling",
                    }
                )
            elif threshold > 2:
                residual_cells.append(
                    {
                        "order": order,
                        "root_degree": root_degree,
                        "B2_min": 2,
                        "B2_max": threshold - 1,
                    }
                )
            if threshold is not None:
                assert all(
                    scalar(order, root_degree, value) > 0
                    for value in range(threshold, maximum + 1)
                )
        curvature_rows.append(row)

    # Cells with degree at or above the staircase threshold have minimum_B2=0.
    for row in curvature_rows:
        for cell in row["root_degree_thresholds"]:
            if scalar(row["order"], cell["root_degree"], 0) > 0:
                assert cell["minimum_B2"] == 0
    return degree_rows, curvature_rows, residual_cells


def verify_low_curvature() -> tuple[list[dict], dict]:
    rows = []
    total_trees = 0
    total_roots = 0
    global_minimum = None
    global_witness = None
    for order in range(23, 39):
        families = [("path", None, path_adjacency(order))]
        for arms in three_partitions(order - 1):
            families.append(("three_arm_spider", arms, spider_adjacency(arms)))
        minimum = None
        witness = None
        for family, arms, adjacency in families:
            polynomial, deletions = rooted_polynomials(adjacency)
            for root, deletion in enumerate(deletions):
                value = c7(polynomial, deletion)
                assert value > 0
                if minimum is None or value < minimum:
                    minimum = value
                    witness = {
                        "family": family,
                        "arms": arms,
                        "root": root,
                        "root_degree": len(adjacency[root]),
                    }
                if global_minimum is None or value < global_minimum:
                    global_minimum = value
                    global_witness = {"order": order, **witness}
        tree_count = len(families)
        root_count = order * tree_count
        total_trees += tree_count
        total_roots += root_count
        rows.append(
            {
                "order": order,
                "path_count": 1,
                "three_arm_spider_count": tree_count - 1,
                "rooted_checks": root_count,
                "minimum_C7": minimum,
                "minimum_witness": witness,
            }
        )

    # Independent symbolic leaf-root path factorization.
    n = sp.symbols("n", integer=True, positive=True)
    coefficient = lambda q, rank: sp.binomial(q - rank + 1, rank)
    d, e, f = (coefficient(n, rank) for rank in (5, 6, 7))
    h, k = (coefficient(n - 1, rank) for rank in (5, 6))
    path_leaf = sp.factor(d * (e**2 - d * f) - 2 * e * (e * h - d * k))
    quartic = n**4 - 24 * n**3 + 227 * n**2 - 780 * n - 1332
    asserted_factorization = (
        (n - 10)
        * (n - 9)
        * (n - 8) ** 3
        * (n - 7) ** 3
        * (n - 6) ** 3
        * (n - 5) ** 2
        * quartic
        / sp.Integer(435456000)
    )
    assert sp.simplify(path_leaf - asserted_factorization) == 0
    shifted_quartic = sp.Poly(sp.expand(quartic.subs(n, n + 13)), n)
    assert shifted_quartic.all_coeffs() == [1, 28, 305, 1742, 2724]

    summary = {
        "status": "PASS_EXACT_PATHS_AND_THREE_ARM_SPIDERS_ALL_ROOTS_N23_THROUGH_N38",
        "classification": "B2=0 iff path; B2=1 iff three-arm spider",
        "family_trees": total_trees,
        "rooted_checks": total_roots,
        "global_minimum_C7": global_minimum,
        "global_minimum_witness": global_witness,
        "path_leaf_factorization": str(asserted_factorization),
        "path_leaf_quartic_shift_n_equals_13_plus_m": [1, 28, 305, 1742, 2724],
    }
    return rows, summary


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    algebra = verify_algebra()
    connected_four_base = verify_connected_four_subtree_base()
    degree_rows, curvature_rows, residual_cells = verify_degree_and_curvature()
    low_rows, low_summary = verify_low_curvature()
    finite_report = HERE / "rank7_rooted_cross_finite_n19_n22_exact_20260816.json"
    assert finite_report.exists(), "run replay_rank7_rooted_cross_finite.py first"
    finite = json.loads(finite_report.read_text(encoding="utf-8"))
    assert finite["status"] == "PASS_EXACT_RANK7_ROOTED_CROSS_ALL_ROOTS_ORDERS_19_THROUGH_22"

    report = {
        "status": "PASS_EXACT_PARTIAL_RANK7_ROOTED_CROSS_STRENGTHENING",
        "algebra": algebra,
        "unconditional_exact_finite_orders": {
            "minimum_order": 19,
            "maximum_order": 22,
            "free_trees": finite["totals"]["free_trees"],
            "rooted_checks": finite["totals"]["rooted_checks"],
            "certificate": finite_report.name,
            "certificate_sha256": file_sha256(finite_report),
        },
        "analytic_all_root_tail": {"minimum_order": 39},
        "degree_staircase": degree_rows,
        "curvature_bound": {
            "definition": "B2=sum_v binomial(deg(v)-1,2)",
            "rank45_reserve": "5(n-3)i5-(n-7)(n-8)i4 >= ((n^3-8n^2-19n+302)/6) B2",
            "connected_four_subtree_bound": {
                "statement": "S3>=n-3+B2 for every tree of order n>=6",
                "prufer_base_n6": connected_four_base,
                "induction": "delete a leaf; the new connected four-subtrees are the connected triples through its neighbor",
            },
            "i4_ceiling": "min(C(n-1,4), C(n,4)-(n-1)C(n-2,2)+C(n-1,2)+(n-4)(B2+n-2)-(n-3+B2))",
            "rows": curvature_rows,
        },
        "low_curvature_exact": {"summary": low_summary, "orders": low_rows},
        "residual": {
            "orders": "23 through 38",
            "cell_count": len(residual_cells),
            "cells": residual_cells,
            "warning": "These cells are genuinely unproved by this certificate; do not call C7 universal.",
        },
        "prerequisites": [
            "RANK6_FOREST_THREE_HALVES_THEOREM_2026-08-13.md",
            "TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md",
            "FOREST_V7_ALPHA12_THEOREM_2026-08-13.md",
        ],
    }
    assert residual_cells, "partial certificate must not silently claim universal closure"
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(
        f"low-curvature exact: {low_summary['family_trees']} trees / "
        f"{low_summary['rooted_checks']} roots; minimum={low_summary['global_minimum_C7']}"
    )
    print(f"genuine residual cells: {len(residual_cells)}")
    print(f"wrote {OUTPUT.name}; sha256={file_sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
