#!/usr/bin/env python3
"""Prove the actual rank-three double-broom terminal nonnegative.

The base is a path of L edges from root v to support s, with r extra
leaves at v and u extra leaves at s.  We add one more leaf at s and
evaluate the actual rank-three sibling-Theta increment.

At fixed rank three, the standard path-count formulas show that this
quantity has degree at most six separately in L,r,u once L>=8:

* an independent k-set count on a decorated path has degree <=k;
* a residual-edge k-set sum has degree <=k+1 (sum the two path
  fragments over the surviving edge position);
* every product in the reduced rank-three core has degree <=6.

Consequently seven exact values in each variable determine it.
The verifier computes the exact product-binomial coefficients through
degree six from the original recurrence at L=8,...,14 and proves the
closed formulas below.  It also replays L=3,...,7 directly.  The two
short terminal lengths L=1,2 have different, entirely nonnegative
coefficient tables and are checked separately.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_broom_terminal_binomial_differences import broom
from analyze_broom_terminal_mixed_binomial_differences import (
    mixed_forward_coefficients,
)
from prove_rank3_deepest_bundle_first_coefficient import direct_total


L = sp.symbols("L", integer=True, positive=True)


def expected_coefficients():
    """Nonzero coefficients of C(r,i)C(u,j), valid for L>=3."""
    return {
        (0, 0): sp.Rational(4, 3)
        * (2 * L**3 - 18 * L**2 + 85 * L - 87),
        (0, 1): 26 * L**2 + 28 * L + 24,
        (0, 2): 6 * L**2 + 98 * L + 62,
        (0, 3): 32 * L + 88,
        (0, 4): 40,
        (1, 0): -20 * L**2 + 144 * L + 86,
        (1, 1): 50 * L + 240,
        (1, 2): 12 * L + 178,
        (1, 3): 32,
        (2, 0): 16 * L**2 + 40 * L + 392,
        (2, 1): 32 * L + 172,
        (2, 2): 44,
        (3, 0): 88 * L + 272,
        (3, 1): 88,
        (4, 0): 144,
    }


def exact_table(length: int, degree: int = 6):
    values = []
    for root_leaves in range(degree + 1):
        row = []
        for support_leaves in range(degree + 1):
            graph, root, support = broom(
                length,
                root_leaves=root_leaves,
                support_leaves=support_leaves,
            )
            row.append(direct_total(graph, root, support))
        values.append(row)
    return mixed_forward_coefficients(values)


def coefficient_identity_certificate():
    expected = expected_coefficients()
    interpolation_lengths = list(range(8, 15))
    tables = {
        length: exact_table(length) for length in interpolation_lengths
    }
    checks = 0
    for first in range(7):
        for second in range(7):
            formula = sp.sympify(
                expected.get((first, second), sp.Integer(0))
            )
            # Both sides have degree at most six in L.  Seven exact
            # nodes therefore prove their identity for every L>=8.
            for length in interpolation_lengths:
                value = tables[length][first][second]
                target = int(formula.subs(L, length))
                assert value == target, (
                    length,
                    first,
                    second,
                    value,
                    target,
                )
                checks += 1

    # Directly bridge the finite pre-polynomial range 3<=L<=7.
    bridge_checks = 0
    for length in range(3, 8):
        table = exact_table(length)
        for first in range(7):
            for second in range(7):
                formula = sp.sympify(
                    expected.get((first, second), sp.Integer(0))
                )
                assert table[first][second] == int(
                    formula.subs(L, length)
                ), (length, first, second)
                bridge_checks += 1

    # L=1,2 have separate tables, but every coefficient is
    # nonnegative, proving every r,u value nonnegative.
    short_tables = {}
    for length in (1, 2):
        table = exact_table(length)
        assert all(value >= 0 for row in table for value in row)
        short_tables[str(length)] = {
            f"{first},{second}": value
            for first, row in enumerate(table)
            for second, value in enumerate(row)
            if value
        }
    return {
        "eventual_degree_bound": 6,
        "interpolation_lengths": interpolation_lengths,
        "interpolation_checks": checks,
        "bridge_lengths": "3..7",
        "bridge_checks": bridge_checks,
        "short_nonnegative_tables": short_tables,
    }


def positivity_certificate():
    expected = expected_coefficients()
    x = sp.symbols("x", integer=True, nonnegative=True)

    # Every coefficient involving at least one support leaf is
    # nonnegative for L>=3.
    shifted_mixed = {}
    for (first, second), formula0 in expected.items():
        formula = sp.sympify(formula0)
        if second == 0:
            continue
        shifted = sp.Poly(sp.expand(formula.subs(L, x + 3)), x)
        assert all(
            coefficient >= 0 for coefficient in shifted.all_coeffs()
        )
        shifted_mixed[f"{first},{second}"] = [
            int(coefficient) for coefficient in shifted.all_coeffs()
        ]

    A0 = sp.sympify(expected[(0, 0)])
    A1 = sp.sympify(expected[(1, 0)])
    A2 = sp.sympify(expected[(2, 0)])
    A3 = sp.sympify(expected[(3, 0)])
    A4 = sp.sympify(expected[(4, 0)])
    for formula in (A2, A3, A4):
        shifted = sp.Poly(sp.expand(formula.subs(L, x + 3)), x)
        assert all(
            coefficient > 0 for coefficient in shifted.all_coeffs()
        )

    # Let F_L(r) be the u=0 polynomial.  Its first forward
    # difference is
    # A1+r*A2+C(r,2)A3+C(r,3)A4 and is increasing in r.
    # Its value at r=2 is positive, so the minimum of F is attained
    # among r=0,1,2.
    delta_at_two = sp.expand(A1 + 2 * A2 + A3)
    shifted_delta = sp.Poly(
        sp.expand(delta_at_two.subs(L, x + 3)), x
    )
    assert all(
        coefficient > 0 for coefficient in shifted_delta.all_coeffs()
    )

    endpoint_values = {
        0: sp.expand(A0),
        1: sp.expand(A0 + A1),
        2: sp.expand(A0 + 2 * A1 + A2),
    }
    shifted_zero = sp.Poly(
        sp.expand(endpoint_values[0].subs(L, x + 3)), x
    )
    assert all(
        coefficient >= 0 for coefficient in shifted_zero.all_coeffs()
    )
    assert shifted_zero.eval(0) > 0

    derivative_certificates = {}
    for root_leaves in (1, 2):
        value = endpoint_values[root_leaves]
        derivative = sp.Poly(sp.diff(value, L), L)
        discriminant = sp.discriminant(derivative.as_expr(), L)
        assert derivative.LC() > 0 and discriminant < 0
        initial = sp.expand(value.subs(L, 3))
        assert initial > 0
        derivative_certificates[str(root_leaves)] = {
            "derivative": str(sp.factor(derivative.as_expr())),
            "discriminant": int(discriminant),
            "value_at_L=3": int(initial),
        }

    return {
        "support_mixed_shifted_coefficients": shifted_mixed,
        "root_forward_difference_at_r=2": str(
            sp.factor(delta_at_two)
        ),
        "root_endpoint_values": {
            str(key): str(sp.factor(value))
            for key, value in endpoint_values.items()
        },
        "root_endpoint_derivative_certificates": derivative_certificates,
    }


def main():
    identity = coefficient_identity_certificate()
    positivity = positivity_certificate()
    report = {
        "status": "PASS_RANK3_DOUBLE_BROOM_TERMINAL",
        "quantity": (
            "actual rank-three sibling-Theta increment for a path "
            "with endpoint leaf bundles"
        ),
        "mixed_binomial_coefficients_for_L_at_least_3": {
            f"{first},{second}": str(sp.factor(sp.sympify(formula)))
            for (first, second), formula in expected_coefficients().items()
        },
        "coefficient_identity_certificate": identity,
        "positivity_certificate": positivity,
        "conclusion": (
            "The actual rank-three terminal increment is nonnegative "
            "for every L>=1 and all root/support leaf counts."
        ),
    }
    Path(
        "rank3_double_broom_terminal_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
