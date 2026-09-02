#!/usr/bin/env python3
"""Verify the all-orders rooted cross-drop theorem for trees.

For a rooted tree (T,p), put

    d=i_3(T), e=i_4(T), f=i_5(T),
    h=i_3(T-p), k=i_4(T-p).

This verifier proves

    d(e^2-df) >= 2e(eh-dk)

for every rooted tree of order at least 13.  Orders 13--19 are audited
from an exact exhaustive output.  For order at least 20, a stronger
root-ratio inequality is proved by an exact grouped-moment Bernstein
certificate and combined with the proved rank-4 Q theorem.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    tensor_bernstein_fast,
)
from explore_rank5_root_ratio_moment_certificate import (
    build_expression,
    choose,
)


FINITE_OUTPUT = Path(
    "rank5_cross_drop_finite_n19_20260727.json"
)

TREE_COUNTS = {
    13: 1301,
    14: 3159,
    15: 7741,
    16: 19320,
    17: 48629,
    18: 123867,
    19: 317955,
}


def derivative_and_bound_checks(polynomial, variables) -> None:
    u, A2, A3, t, B, q1, q2, qd = variables
    J = (
        3 * A2 * u
        + 60 * q1 * u**2
        + 30 * t**2 * u
        + 210 * t * u**2
        - 60 * t * u
        + 282 * u**3
        - 187 * u**2
        + 21 * u
        + 1
    )
    K = -3 * A2 * u + 18 * u**3 - 23 * u**2 + 9 * u - 1
    assert sp.factor(sp.diff(polynomial, A3) + u * J / 18) == 0
    assert sp.factor(sp.diff(polynomial, B) + u**2 * J / 3) == 0
    assert sp.factor(sp.diff(polynomial, qd) + 10 * u**3 * K / 3) == 0

    # On 0 <= u <= 1/20 and 0 <= t <= 1, the first expression is
    # nonnegative term by term:
    #
    # J >= 1 - 9u - 187u^2 >= 33/400 > 0.
    lower_remainder = sp.factor(J - (1 - 9 * u - 187 * u**2))
    expected_remainder = (
        3 * A2 * u
        + 60 * q1 * u**2
        + 30 * u * (t - 1) ** 2
        + 210 * t * u**2
        + 282 * u**3
    )
    assert sp.expand(lower_remainder - expected_remainder) == 0
    assert (1 - 9 * sp.Rational(1, 20) - 187 * sp.Rational(1, 20) ** 2) == sp.Rational(33, 400)

    # K <= 18u^3+9u-1 <= -2191/4000 < 0.
    assert sp.expand(
        (18 * u**3 + 9 * u - 1) - K
    ) == 3 * A2 * u + 23 * u**2
    assert (
        18 * sp.Rational(1, 20) ** 3
        + 9 * sp.Rational(1, 20)
        - 1
    ) == -sp.Rational(2191, 4000)


def large_order_certificate():
    polynomial, variables = build_expression()
    derivative_and_bound_checks(polynomial, variables)
    u, A2, A3, t, B, q1, q2, qd = variables
    mass = 1 - 2 * u

    # For normalized excess degrees x_v=(deg(v)-1)/n:
    # A3 <= mass*A2, B <= (mass^2-A2)/2, and qd >= 0.
    # The derivative checks show that these substitutions lower the
    # desired margin.
    relaxed = sp.expand(
        polynomial.subs(
            {
                A3: mass * A2,
                B: (mass**2 - A2) / 2,
                qd: 0,
            }
        )
    )

    v, s, a, zn, zr = sp.symbols(
        "v s a zn zr", nonnegative=True
    )
    U = v / 20
    root_mass = (1 - 3 * U) * s
    remainder = (1 - 3 * U) * (1 - s)
    neighbor_mass = U + remainder * a
    far_mass = remainder * (1 - a)

    # If neighbor_mass is nonzero, integrality gives at least one unit
    # U there.  Cauchy over deg(p)=(root_mass+U)/U neighbors gives
    # zn >= U/(root_mass+U).  This parameterizes that exact interval.
    neighbor_second_ratio = (
        U + root_mass * zn
    ) / (root_mass + U)
    neighbor_second = neighbor_mass**2 * neighbor_second_ratio
    total_second = (
        root_mass**2 + neighbor_second + far_mass**2 * zr
    )

    rational = sp.cancel(
        relaxed.subs(
            {
                u: U,
                t: root_mass,
                q1: neighbor_mass,
                q2: neighbor_second,
                A2: total_second,
            }
        )
    )
    numerator, denominator = sp.fraction(rational)
    expected_denominator = (
        46_080_000_000 * (3 * s * v - 20 * s - v) ** 2
    )
    assert sp.factor(denominator - expected_denominator) == 0

    degrees, coefficients = tensor_bernstein_fast(
        sp.expand(numerator), (v, s, a, zn, zr)
    )
    minimum, index = minimum_with_index(coefficients)
    positives = [value for value in coefficients.flat if value > 0]
    zeros = sum(value == 0 for value in coefficients.flat)
    assert degrees == (9, 7, 4, 2, 2)
    assert coefficients.size == 3600
    assert minimum == 0
    assert zeros == 135
    assert len(positives) == 3465
    assert min(positives) == 4_517_937
    assert all(value >= 0 for value in coefficients.flat)

    # The omitted neighbor_mass=0 case is a star rooted at its center.
    leaves = sp.symbols("leaves", integer=True, nonnegative=True)
    d_star = choose(leaves, 3)
    e_star = choose(leaves, 4)
    h_star = d_star
    k_star = e_star
    star_margin = sp.factor(
        d_star * (2 * e_star + d_star)
        - 20 * (e_star * h_star - d_star * k_star)
    )
    assert star_margin == sp.factor(d_star * (2 * e_star + d_star))

    return degrees, coefficients.size, zeros, min(positives), index


def finite_output_audit():
    payload = json.loads(FINITE_OUTPUT.read_text(encoding="utf-8"))
    assert payload["parameters"] == {
        "min_order": 13,
        "max_order": 19,
    }
    rows = payload["per_order"]
    assert [row["order"] for row in rows] == list(range(13, 20))
    total_trees = 0
    total_roots = 0
    for row in rows:
        order = row["order"]
        assert row["trees"] == TREE_COUNTS[order]
        assert row["roots"] == order * TREE_COUNTS[order]
        assert row["cross_failures"] == 0
        assert row["minimum_cross"] >= 0
        witness = row["minimum_cross_witness"]
        d, e, f, h, k = witness["window"]
        replay = d * (e * e - d * f) - 2 * e * (e * h - d * k)
        assert replay == row["minimum_cross"]
        assert replay == witness["cross_margin"]
        total_trees += row["trees"]
        total_roots += row["roots"]
    assert payload["totals"] == {
        "trees": total_trees,
        "roots": total_roots,
        "cross_failures": 0,
    }
    return total_trees, total_roots, rows


def symbolic_implication() -> None:
    d, e, f, h, k = sp.symbols(
        "d e f h k", positive=True
    )
    curvature_lower = e * (2 * e + d) / 10
    cross_lower = sp.factor(
        d * curvature_lower - 2 * e * (e * h - d * k)
    )
    simple_margin = d * (2 * e + d) - 20 * (e * h - d * k)
    assert sp.factor(cross_lower - e * simple_margin / 10) == 0


def main() -> int:
    symbolic_implication()
    degrees, size, zeros, smallest_positive, index = (
        large_order_certificate()
    )
    trees, roots, rows = finite_output_audit()
    print("rank-5 rooted cross-drop certificate: PASS")
    print(
        "large-order Bernstein:",
        f"degrees={degrees}",
        f"coefficients={size}",
        f"zeros={zeros}",
        f"smallest_positive={smallest_positive}",
        f"minimum_index={index}",
    )
    for row in rows:
        print(
            f"n={row['order']} trees={row['trees']:,} "
            f"roots={row['roots']:,} "
            f"min_cross={row['minimum_cross']}"
        )
    print(f"finite total: trees={trees:,}, roots={roots:,}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
