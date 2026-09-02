#!/usr/bin/env python3
"""Probe common interlacing of distinguished-pair prefix averages.

For the actual defect-three endpoint, rewrite the complete level-d average by
first choosing an unordered pair of deleted leaves.  A cross-block pair adds
a center--center edge of square weight w_i*w_j/2; the remaining d-2 leaf
deletions are then averaged.  Every fixed-prefix polynomial is stable by the
fixed-cardinality induced-subgraph theorem.  This script asks whether these
much more smoothed prefix polynomials have a common interlacer on random
positive-direction affine lines.

This is numerical route-selection evidence only.  Any suspected failure must
be replayed exactly before it is used as a mathematical obstruction.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

import numpy as np
import sympy as sp
from numpy.polynomial import Polynomial

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


OUT = Path("distinguished_pair_prefix_interlacing_probe_20260803.json")


def monic_coefficients(expression: sp.Expr) -> np.ndarray:
    poly = sp.Poly(sp.expand(expression), X)
    lead = float(poly.LC())
    return np.array([float(poly.nth(k)) / lead for k in range(poly.degree() + 1)])


def compose_affine(poly: Polynomial, intercept: float, direction: float) -> Polynomial:
    return poly(Polynomial([intercept, direction]))


def derivative_convolution_line(
    left: Polynomial,
    right: Polynomial,
    order: int,
    x_intercept: float,
    x_direction: float,
    y_intercept: float,
    y_direction: float,
) -> Polynomial:
    result = Polynomial([0.0])
    for k in range(order + 1):
        left_part = compose_affine(left.deriv(k), x_intercept, x_direction)
        right_part = compose_affine(right.deriv(order - k), y_intercept, y_direction)
        result = result + math.comb(order, k) * left_part * right_part
    return result


def delete_roots(base: Polynomial, roots: list[float], deleted: tuple[int, ...]) -> Polynomial:
    result = base
    for index in deleted:
        quotient, remainder = divmod(result, Polynomial([roots[index], 1.0]))
        scale = max(1.0, np.max(np.abs(result.coef)))
        if np.max(np.abs(remainder.coef)) > 1e-6 * scale:
            raise ArithmeticError("unstable numerical leaf division")
        result = quotient
    return result


def star_after_deletion(a_deleted: Polynomial, deleted_count: int, N: int) -> Polynomial:
    # Exact aligned identity: g_K=(X*a_K'+(N-3+|K|)a_K)/(2N-3).
    variable = Polynomial([0.0, 1.0])
    return (
        variable * a_deleted.deriv() + (N - 3 + deleted_count) * a_deleted
    ) / (2 * N - 3)


def real_roots(poly: Polynomial) -> list[float] | None:
    coefficients = np.trim_zeros(poly.coef, trim="b")
    if len(coefficients) <= 1:
        return []
    scale = np.max(np.abs(coefficients))
    roots = np.roots((coefficients / scale)[::-1])
    tolerance = 2e-5 * max(1.0, max(abs(root) for root in roots))
    if any(abs(root.imag) > tolerance for root in roots):
        return None
    return sorted(float(root.real) for root in roots)


def common_interlacer_gap(root_lists: list[list[float]]) -> tuple[bool, float, int | None]:
    degree = len(root_lists[0])
    if any(len(roots) != degree for roots in root_lists):
        return False, float("-inf"), None
    minimum_gap = float("inf")
    minimum_index: int | None = None
    for index in range(degree - 1):
        lower = max(roots[index] for roots in root_lists)
        upper = min(roots[index + 1] for roots in root_lists)
        gap = upper - lower
        if gap < minimum_gap:
            minimum_gap = gap
            minimum_index = index
    return minimum_gap >= -1e-6, minimum_gap, minimum_index


def actual_leaf_data(N: int) -> tuple[Polynomial, Polynomial, list[float], list[float]]:
    g_expr = sp.factorial(N) * hypergeometric_form(N, 3)
    h_expr = sp.factorial(N) * hypergeometric_form(N - 1, 3)
    quotient = sp.Poly(sp.expand(g_expr + h_expr), X).exquo(sp.Poly(X**2, X))
    nonzero = sorted(
        [-float(sp.re(root)) for root in sp.nroots(quotient, n=50, maxsteps=300)]
    )
    roots = [0.0, 0.0] + nonzero
    assert len(roots) == N
    variable = Polynomial([0.0, 1.0])
    a = Polynomial([1.0])
    for root in roots:
        a = a * Polynomial([root, 1.0])
    g = (variable * a.deriv() + (N - 3) * a) / (2 * N - 3)
    weights = [root / (2 * N - 3) for root in roots]
    return a, g, roots, weights


def prefix_line_polynomials(
    N: int,
    d: int,
    a: Polynomial,
    g: Polynomial,
    roots: list[float],
    weights: list[float],
    line: tuple[int, int, int, int],
) -> dict[tuple[int, int], Polynomial]:
    xa, xd, ya, yd = line
    tail_order = d - 2
    a_single = [delete_roots(a, roots, (i,)) for i in range(N)]
    g_single = [star_after_deletion(value, 1, N) for value in a_single]
    result: dict[tuple[int, int], Polynomial] = {}

    # Same-X prefixes and their same-Y reflections.
    for i in range(N):
        for j in range(i + 1, N):
            a_pair = delete_roots(a_single[i], roots, (j,))
            g_pair = star_after_deletion(a_pair, 2, N)
            result[(i, j)] = derivative_convolution_line(
                g_pair, g, tail_order, xa, xd, ya, yd
            )
            result[(N + i, N + j)] = derivative_convolution_line(
                g, g_pair, tail_order, xa, xd, ya, yd
            )

    # Cross prefixes.  The edge square is w_i*w_j/2.
    for i in range(N):
        for j in range(N):
            star_part = derivative_convolution_line(
                g_single[i], g_single[j], tail_order, xa, xd, ya, yd
            )
            edge_part = derivative_convolution_line(
                a_single[i], a_single[j], tail_order, xa, xd, ya, yd
            )
            result[(i, N + j)] = star_part - (weights[i] * weights[j] / 2.0) * edge_part
    return result


def sum_polynomials(polynomials: list[Polynomial]) -> Polynomial:
    result = Polynomial([0.0])
    for polynomial in polynomials:
        result = result + polynomial
    return result


def hierarchical_interlacing(
    prefixes: dict[tuple[int, int], Polynomial], leaf_count: int
) -> tuple[bool, float, bool, float]:
    """Check sibling compatibility and compatibility of first-choice averages."""
    sibling_minimum = float("inf")
    first_choice_averages: list[Polynomial] = []
    for first in range(leaf_count):
        siblings = [
            polynomial
            for pair, polynomial in prefixes.items()
            if first in pair
        ]
        sibling_roots = [real_roots(polynomial) for polynomial in siblings]
        if any(value is None for value in sibling_roots):
            return False, float("-inf"), False, float("-inf")
        sibling_ok, sibling_gap, _ = common_interlacer_gap(
            [value for value in sibling_roots if value is not None]
        )
        sibling_minimum = min(sibling_minimum, sibling_gap)
        if not sibling_ok:
            return False, sibling_minimum, False, float("-inf")
        first_choice_averages.append(sum_polynomials(siblings))

    average_roots = [real_roots(polynomial) for polynomial in first_choice_averages]
    if any(value is None for value in average_roots):
        return True, sibling_minimum, False, float("-inf")
    root_ok, root_gap, _ = common_interlacer_gap(
        [value for value in average_roots if value is not None]
    )
    return True, sibling_minimum, root_ok, root_gap


def main() -> None:
    rng = random.Random(20260803)
    report: dict[str, object] = {
        "kind": "distinguished_pair_prefix_interlacing_probe",
        "cases": [],
    }
    # The strongest compatibility claim already fails at the first two actual
    # endpoints; larger cases add numerical leaf-division noise without
    # changing that route-selection conclusion.
    for m in range(1, 3):
        N = 3 * m + 3
        d = 2 * m + 3
        a, g, roots, weights = actual_leaf_data(N)
        case: dict[str, object] = {
            "m": m,
            "N": N,
            "d": d,
            "trials": 0,
            "nonreal_prefix_suspects": [],
            "common_interlacer_failures": [],
            "minimum_gap": None,
            "hierarchical_failures": [],
            "minimum_sibling_gap": None,
            "minimum_root_average_gap": None,
        }
        minimum_gap = float("inf")
        minimum_sibling_gap = float("inf")
        minimum_root_average_gap = float("inf")
        for _ in range(20):
            line = (
                rng.randint(-70, 70),
                rng.randint(1, 25),
                rng.randint(-70, 70),
                rng.randint(1, 25),
            )
            polynomials = prefix_line_polynomials(N, d, a, g, roots, weights, line)
            roots_on_line = [real_roots(poly) for poly in polynomials.values()]
            case["trials"] += 1
            if any(value is None for value in roots_on_line):
                case["nonreal_prefix_suspects"].append({"line": line})
                break
            valid_roots = [value for value in roots_on_line if value is not None]
            compatible, gap, index = common_interlacer_gap(valid_roots)
            minimum_gap = min(minimum_gap, gap)
            if not compatible:
                case["common_interlacer_failures"].append(
                    {"line": line, "gap": gap, "root_index": index}
                )
            sibling_ok, sibling_gap, root_ok, root_gap = hierarchical_interlacing(
                polynomials, 2 * N
            )
            minimum_sibling_gap = min(minimum_sibling_gap, sibling_gap)
            minimum_root_average_gap = min(minimum_root_average_gap, root_gap)
            if not sibling_ok or not root_ok:
                case["hierarchical_failures"].append(
                    {
                        "line": line,
                        "sibling_ok": sibling_ok,
                        "sibling_gap": sibling_gap,
                        "root_average_ok": root_ok,
                        "root_average_gap": root_gap,
                    }
                )
                break
        case["minimum_gap"] = minimum_gap
        case["minimum_sibling_gap"] = minimum_sibling_gap
        case["minimum_root_average_gap"] = minimum_root_average_gap
        report["cases"].append(case)
        print(
            json.dumps(
                {
                    "m": m,
                    "trials": case["trials"],
                    "prefix_nonreal": len(case["nonreal_prefix_suspects"]),
                    "common_interlacer_failures": len(case["common_interlacer_failures"]),
                    "hierarchical_failures": len(case["hierarchical_failures"]),
                    "minimum_gap": minimum_gap,
                }
            ),
            flush=True,
        )
    report["status"] = (
        "NUMERICAL_FAILURE_SUSPECT"
        if any(
            case["nonreal_prefix_suspects"]
            or case["common_interlacer_failures"]
            or case["hierarchical_failures"]
            for case in report["cases"]
        )
        else "NO_FAILURE_NUMERICAL_PROBE"
    )
    report["warning"] = "Numerical route-selection evidence only; replay every suspect exactly."
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
