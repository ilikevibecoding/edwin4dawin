#!/usr/bin/env python3
"""Exact certificate for a two-step factorial-ratio drop in forests."""

from __future__ import annotations

from fractions import Fraction

import networkx as nx
import numpy as np
import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    tensor_bernstein_fast,
)
from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)
from scan_pgc_all_forest_polynomials import multiply


EXPECTED_COUNTS = [
    1,
    2,
    3,
    6,
    10,
    20,
    36,
    73,
    142,
    294,
    618,
    1348,
    2974,
    6777,
    15739,
]


def symbolic_rank2_certificate():
    """Verify lambda_1-lambda_2 >= 2/n for every forest."""

    n, e, S = sp.symbols("n e S", nonnegative=True)

    def choose(a, k):
        return sp.prod(a - j for j in range(k)) / sp.factorial(k)

    p2 = choose(n, 2) - e
    p3 = choose(n, 3) - e * (n - 2) + S
    excess = sp.expand(2 * p2**2 - 3 * n * p3 - 2 * p2)
    assert sp.diff(excess, S) == -3 * n

    # In a forest, pairs of incident edges are distinct pairs, so
    # S <= C(e,2).  The resulting lower bound factors positively when
    # 0 <= e <= n-1 and n >= 2.
    lower = sp.factor(excess.subs(S, choose(e, 2)))
    expected = (
        (n - 1 - e)
        * (3 * e * n - 4 * e + n**2 - 2 * n)
        / 2
    )
    assert sp.simplify(lower - expected) == 0


def symbolic_large_order_certificate():
    n, e, S, R = sp.symbols("n e S R", nonnegative=True)

    def choose(a, k):
        return sp.prod(a - j for j in range(k)) / sp.factorial(k)

    p2 = choose(n, 2) - e
    p3 = choose(n, 3) - e * (n - 2) + S
    p4 = (
        choose(n, 4)
        - e * choose(n - 2, 2)
        + S * (n - 4)
        + choose(e, 2)
        - R
    )
    drop = sp.expand(2 * p2 * p3 - n * p3 - 4 * n * p4)
    assert sp.diff(drop, R) == 4 * n

    # The line graph has e vertices and S edges.  Its wedge count and
    # Cauchy give R >= (2S^2/e-S)/3.
    line_lower = (2 * S**2 / e - S) / 3
    lower = sp.cancel(drop.subs(R, line_lower))

    u, v, s, z = sp.symbols("u v s z", nonnegative=True)
    order = 1 / u
    edge_box = 1 + (order - 2) * s
    S_box = edge_box * (edge_box - 1) * z / 2
    box = sp.cancel(
        lower.subs({n: order, e: edge_box, S: S_box}) * u**5
    )
    assert sp.denom(box) == 1
    box = sp.expand(box.subs(u, v / 16))
    assert sp.Poly(box, v, s, z).degree_list() == (5, 3, 2)

    degrees, coefficients = tensor_bernstein_fast(
        box, (v, s, z)
    )
    assert degrees == (5, 3, 2)
    assert minimum_with_index(coefficients) == (
        0,
        (0, 0, 0),
    )
    flattened = [
        coefficients[index]
        for index in np.ndindex(coefficients.shape)
    ]
    assert len(flattened) == 72
    assert sum(value == 0 for value in flattened) == 13
    assert min(value for value in flattened if value > 0) == sp.Rational(
        1, 7680
    )
    return len(flattened)


def finite_certificate(max_order: int = 15):
    tree_polynomials = [set() for _ in range(max_order + 1)]
    tree_polynomials[1].add((1, 1))
    for order in range(2, max_order + 1):
        for tree in nx.nonisomorphic_trees(order):
            engine = MaskIndependencePolynomial(tree)
            tree_polynomials[order].add(
                engine.polynomial((1 << order) - 1)
            )

    forest_polynomials = [set() for _ in range(max_order + 1)]
    forest_polynomials[0].add((1,))
    counts = []
    checks = 0
    zeros = 0
    best = None
    for order in range(1, max_order + 1):
        generated = set()
        for component_order in range(1, order + 1):
            for tree_poly in tree_polynomials[component_order]:
                for rest in forest_polynomials[
                    order - component_order
                ]:
                    generated.add(multiply(tree_poly, rest))
        forest_polynomials[order] = generated
        counts.append(len(generated))
        for polynomial in generated:
            coefficient = lambda rank: (
                polynomial[rank]
                if 0 <= rank < len(polynomial)
                else 0
            )
            value = (
                2 * coefficient(2) * coefficient(3)
                - coefficient(1) * coefficient(3)
                - 4 * coefficient(1) * coefficient(4)
            )
            checks += 1
            assert value >= 0
            zeros += value == 0
            scale = coefficient(1) * coefficient(3)
            if scale:
                ratio = Fraction(value, scale)
                if best is None or ratio < best[0]:
                    best = (ratio, order, polynomial, value)
    assert counts == EXPECTED_COUNTS
    assert checks == 28_043
    assert zeros == 7
    assert best == (
        Fraction(2, 15),
        15,
        (
            1,
            15,
            91,
            364,
            1001,
            2002,
            3003,
            3432,
            3003,
            2002,
            1001,
            364,
            91,
            14,
            1,
        ),
        728,
    )
    return checks, zeros


def main() -> int:
    symbolic_rank2_certificate()
    coefficients = symbolic_large_order_certificate()
    checks, zeros = finite_certificate()
    print("two-step factorial-drop forest certificate: PASS")
    print("rank-2 sharpened drop: lambda_1-lambda_2 >= 2/n")
    print("large-order domain: n >= 16")
    print("Bernstein coefficients:", coefficients)
    print("finite forest polynomials:", f"{checks:,}")
    print("finite zero margins:", zeros)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
