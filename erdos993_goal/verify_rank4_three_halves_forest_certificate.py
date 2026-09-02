#!/usr/bin/env python3
"""Exact certificate for the rank-4 three-halves reserve in forests.

The theorem certified here is

    Q_4(I(F)) >= 0 whenever alpha(F) >= 7.

Equivalently, every forest satisfies the rank-4 reserve wherever rank
four belongs to the prefix cutoff floor((2 alpha + 1)/3).

This verifier is modular.  It checks the convolution lift and the finite
exception handling.  Its three previously certified forest inputs are:

* delta_0 >= 2 (elementary);
* delta_1 >= 0 and delta_1 + delta_2 >= 2
  (verify_two_step_factorial_drop_forest_certificate.py);
* delta_2 >= 1
  (verify_rank3_three_halves_forest_certificate.py).

Its tree input is Q_4 >= 0 for alpha >= 7, certified by
verify_rank4_three_halves_leaf_certificate.py.

The large multivariate certificates use exact FLINT integer
polynomials.  Run individual cases with --case, or all cases with
--case all.
"""

from __future__ import annotations

import argparse
import math
from collections.abc import Iterable

import networkx as nx
import sympy as sp
from flint import fmpz_mpoly_ctx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)
from scan_pgc_all_forest_polynomials import multiply
from scan_q_cascade_all_forest_polynomials import q_reserve


BAD_POLYNOMIALS = (
    (1, 7, 15, 10, 1),
    (1, 7, 15, 11, 1),
)

FOREST_POLYNOMIAL_COUNTS_THROUGH_12 = (
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
)

SMALL_POLYNOMIALS = (
    (1, 1),
    (1, 2),
    (1, 2, 1),
    (1, 3, 1),
    (1, 3, 2),
    (1, 4, 3),
    (1, 4, 4),
    (1, 3, 3, 1),
    (1, 4, 3, 1),
    (1, 4, 4, 1),
    (1, 4, 5, 2),
    (1, 5, 6, 1),
    (1, 5, 6, 2),
    (1, 5, 7, 2),
    (1, 5, 7, 3),
    (1, 5, 8, 4),
    (1, 6, 10, 4),
    (1, 6, 10, 5),
    (1, 6, 11, 6),
    (1, 6, 12, 8),
)


def symbolic_identities() -> None:
    """Check the ratio translation and the elementary low-rank bounds."""

    k = sp.symbols("k", positive=True, integer=True)
    pm, p, pp = sp.symbols("pm p pp", positive=True)
    reserve = 2 * k * p**2 - pm * p - 2 * (k + 1) * pm * pp
    before = k * p / pm
    after = (k + 1) * pp / p
    assert sp.factor(
        reserve / (pm * p) - (2 * (before - after) - 1)
    ) == 0

    # For q_j = 2^j j! p_j, rho_j = q_{j+1}/q_j is
    # twice the ordinary factorial ratio.  Thus Q_j >= 0 is
    # delta_{j-1} = rho_{j-1} - rho_j >= 1.
    n, e, S = sp.symbols("n e S", nonnegative=True)
    p2 = sp.binomial(n, 2) - e
    p3 = sp.binomial(n, 3) - e * (n - 2) + S

    # delta_0 = 2 + 4e/n.
    lambda0 = n
    lambda1 = 2 * p2 / n
    assert sp.simplify(2 * (lambda0 - lambda1)) == 2 + 4 * e / n

    # The sharpened rank-2 factorial log-concavity bound is
    # lambda_1-lambda_2 >= 2/n.  Its cleared excess is decreasing
    # in S, and S <= C(e,2) for a forest.
    excess = sp.expand(2 * p2**2 - 3 * n * p3 - 2 * p2)
    assert sp.diff(excess, S) == -3 * n
    lower = sp.factor(excess.subs(S, e * (e - 1) / 2))
    expected = (
        (n - 1 - e)
        * (3 * e * n - 4 * e + n**2 - 2 * n)
        / 2
    )
    assert sp.simplify(lower - expected) == 0


def tree_polynomials(max_order: int) -> list[set[tuple[int, ...]]]:
    result: list[set[tuple[int, ...]]] = [
        set() for _ in range(max_order + 1)
    ]
    result[1].add((1, 1))
    for order in range(2, max_order + 1):
        for tree in nx.nonisomorphic_trees(order):
            engine = MaskIndependencePolynomial(tree)
            result[order].add(
                engine.polynomial((1 << order) - 1)
            )
    return result


def forest_polynomials(
    max_order: int,
) -> list[set[tuple[int, ...]]]:
    trees = tree_polynomials(max_order)
    forests: list[set[tuple[int, ...]]] = [
        set() for _ in range(max_order + 1)
    ]
    forests[0].add((1,))
    for order in range(1, max_order + 1):
        generated: set[tuple[int, ...]] = set()
        for component_order in range(1, order + 1):
            for tree_polynomial in trees[component_order]:
                for remainder in forests[order - component_order]:
                    generated.add(
                        multiply(tree_polynomial, remainder)
                    )
        forests[order] = generated
    return forests


def finite_classification() -> dict[str, object]:
    """Classify every forest polynomial with alpha at most six."""

    forests = forest_polynomials(12)
    counts = tuple(len(forests[n]) for n in range(1, 13))
    assert counts == FOREST_POLYNOMIAL_COUNTS_THROUGH_12

    checked = 0
    negatives: set[tuple[tuple[int, ...], int]] = set()
    for order in range(1, 13):
        for polynomial in forests[order]:
            if len(polynomial) - 1 > 6:
                continue
            checked += 1
            value = q_reserve(polynomial, 4)
            if value < 0:
                negatives.add((polynomial, value))

    assert checked == 572
    assert negatives == {
        (BAD_POLYNOMIALS[0], -2),
        (BAD_POLYNOMIALS[1], -3),
    }

    generated_small = {
        polynomial
        for order in range(1, 7)
        for polynomial in forests[order]
        if len(polynomial) - 1 <= 3
    }
    assert generated_small == set(SMALL_POLYNOMIALS)
    return {
        "all_counts": counts,
        "checked_alpha_at_most_six": checked,
        "negative": negatives,
        "small_count": len(generated_small),
    }


def scaled_fixed(polynomial, h, zero):
    coefficients = [
        math.factorial(rank)
        * 2**rank
        * coefficient
        * h**rank
        for rank, coefficient in enumerate(polynomial[:6])
    ]
    coefficients.extend([zero] * (6 - len(coefficients)))
    return coefficients


def ratios_to_coefficients(ratios, one):
    coefficients = [one]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return coefficients


def high_factor(h, terminal, d0, d1, d2, d3, one):
    gaps = (2 * h + d0, h + d1, h + d2, h + d3)
    ratios = [None] * 5
    ratios[4] = terminal
    for index in range(3, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios_to_coefficients(ratios, one)


def low_factor(h, r, terminal, d0, d2, d3, one):
    gaps = (2 * h + d0, r, 2 * h - r + d2, h + d3)
    ratios = [None] * 5
    ratios[4] = terminal
    for index in range(3, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios_to_coefficients(ratios, one)


def factorial_convolution(left, right, zero):
    return [
        sum(
            (
                math.comb(rank, index)
                * left[index]
                * right[rank - index]
                for index in range(rank + 1)
            ),
            zero,
        )
        for rank in range(6)
    ]


def rank4_margin(coefficients, h):
    return (
        coefficients[4] ** 2
        - coefficients[3] * coefficients[5]
        - h * coefficients[3] * coefficients[4]
    )


def polynomial_statistics(polynomial) -> dict[str, int]:
    coefficients = polynomial.coeffs()
    if not coefficients:
        return {
            "terms": 0,
            "negative": 0,
            "minimum": 0,
            "maximum": 0,
        }
    return {
        "terms": len(coefficients),
        "negative": sum(coefficient < 0 for coefficient in coefficients),
        "minimum": int(min(coefficients)),
        "maximum": int(max(coefficients)),
    }


def high_high_certificate() -> dict[str, int]:
    names = (
        "h",
        "ta",
        "a0",
        "a1",
        "a2",
        "a3",
        "tb",
        "b0",
        "b1",
        "b2",
        "b3",
    )
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    h, ta, a0, a1, a2, a3, tb, b0, b1, b2, b3 = (
        context.gens()
    )
    left = high_factor(h, ta, a0, a1, a2, a3, context.constant(1))
    right = high_factor(
        h, tb, b0, b1, b2, b3, context.constant(1)
    )
    product = factorial_convolution(
        left, right, context.constant(0)
    )
    margin = rank4_margin(product, h)
    stats = polynomial_statistics(margin)
    assert stats == {
        "terms": 35_929,
        "negative": 0,
        "minimum": 1,
        "maximum": 798_580,
    }
    return stats


def low_high_certificate() -> dict[str, dict[str, int]]:
    names = (
        "a",
        "b",
        "ta",
        "a0",
        "a2",
        "a3",
        "tb",
        "b0",
        "b1",
        "b2",
        "b3",
    )
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    a, b, ta, a0, a2, a3, tb, b0, b1, b2, b3 = context.gens()
    h = a + b
    left = low_factor(
        h, a, ta, a0, a2, a3, context.constant(1)
    )
    right = high_factor(
        h, tb, b0, b1, b2, b3, context.constant(1)
    )
    product = factorial_convolution(
        left, right, context.constant(0)
    )
    margin = rank4_margin(product, h)
    base = polynomial_statistics(margin)
    assert base == {
        "terms": 36_758,
        "negative": 15,
        "minimum": -8_770,
        "maximum": 17_961_000,
    }

    variable_sum = sum(context.gens(), context.constant(0))
    certificate = margin * variable_sum**8
    multiplied = polynomial_statistics(certificate)
    assert multiplied == {
        "terms": 5_298_701,
        "negative": 0,
        "minimum": 1,
        "maximum": 32_541_590_556_160,
    }
    return {"base": base, "certificate": multiplied}


def low_low_certificate() -> dict[str, dict[str, int]]:
    # By symmetry it suffices to cover r_A <= r_B.  Put
    # r_A=a, r_B=a+b, and h=a+b+c.
    names = (
        "a",
        "b",
        "c",
        "ta",
        "a0",
        "a2",
        "a3",
        "tb",
        "b0",
        "b2",
        "b3",
    )
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    a, b, c, ta, a0, a2, a3, tb, b0, b2, b3 = context.gens()
    h = a + b + c
    left = low_factor(
        h, a, ta, a0, a2, a3, context.constant(1)
    )
    right = low_factor(
        h, a + b, tb, b0, b2, b3, context.constant(1)
    )
    product = factorial_convolution(
        left, right, context.constant(0)
    )
    margin = rank4_margin(product, h)
    base = polynomial_statistics(margin)
    assert base == {
        "terms": 37_593,
        "negative": 42,
        "minimum": -8_770,
        "maximum": 110_370_750,
    }

    variable_sum = sum(context.gens(), context.constant(0))
    certificate = margin * variable_sum**8
    multiplied = polynomial_statistics(certificate)
    assert multiplied == {
        "terms": 5_303_272,
        "negative": 0,
        "minimum": 1,
        "maximum": 172_042_813_187_840,
    }
    return {"base": base, "certificate": multiplied}


def full_factor_context(mode: str):
    if mode == "high":
        context = fmpz_mpoly_ctx.get(
            ("h", "t", "d0", "d1", "d2", "d3"),
            "degrevlex",
        )
        h, t, d0, d1, d2, d3 = context.gens()
        factor = high_factor(
            h, t, d0, d1, d2, d3, context.constant(1)
        )
    elif mode == "low":
        context = fmpz_mpoly_ctx.get(
            ("a", "b", "t", "d0", "d2", "d3"),
            "degrevlex",
        )
        a, b, t, d0, d2, d3 = context.gens()
        h = a + b
        factor = low_factor(
            h, a, t, d0, d2, d3, context.constant(1)
        )
    else:
        raise ValueError(mode)
    return context, h, factor


def fixed_family_certificate(
    polynomials: Iterable[tuple[int, ...]],
    mode: str,
) -> dict[str, int]:
    context, h, full = full_factor_context(mode)
    zero = context.constant(0)
    terms = 0
    smallest = None
    cases = 0
    for polynomial in polynomials:
        fixed = scaled_fixed(polynomial, h, zero)
        product = factorial_convolution(fixed, full, zero)
        margin = rank4_margin(product, h)
        stats = polynomial_statistics(margin)
        assert stats["negative"] == 0
        assert stats["minimum"] >= 0
        terms += stats["terms"]
        cases += 1
        if stats["terms"]:
            smallest = (
                stats["minimum"]
                if smallest is None
                else min(smallest, stats["minimum"])
            )
    return {
        "cases": cases,
        "terms": terms,
        "minimum": 0 if smallest is None else smallest,
    }


def finite_product_repairs() -> dict[str, object]:
    # A bad factor becomes good after multiplication by any small
    # nonconstant forest factor.
    bad_small_values = []
    for bad in BAD_POLYNOMIALS:
        for small in SMALL_POLYNOMIALS:
            value = q_reserve(multiply(bad, small), 4)
            assert value > 0
            bad_small_values.append(value)

    # Two bad factors also produce a good factor.
    bad_pair_values = []
    for left in BAD_POLYNOMIALS:
        for right in BAD_POLYNOMIALS:
            value = q_reserve(multiply(left, right), 4)
            assert value > 0
            bad_pair_values.append(value)

    # Products made solely from alpha<=3 factors become good as soon as
    # their total support first reaches four.  The first crossing has
    # alpha at most six.
    states: list[set[tuple[int, ...]]] = [set() for _ in range(7)]
    states[0].add((1,))
    changed = True
    while changed:
        changed = False
        for alpha in range(7):
            for left in tuple(states[alpha]):
                for small in SMALL_POLYNOMIALS:
                    new_alpha = alpha + len(small) - 1
                    if new_alpha > 6:
                        continue
                    product = multiply(left, small)
                    if product not in states[new_alpha]:
                        states[new_alpha].add(product)
                        changed = True
    assert tuple(len(level) for level in states) == (
        1,
        2,
        5,
        13,
        23,
        43,
        80,
    )
    crossing_minima = {}
    for alpha in range(4, 7):
        values = [q_reserve(poly, 4) for poly in states[alpha]]
        assert min(values) > 0
        crossing_minima[alpha] = min(values)
    assert crossing_minima == {4: 1, 5: 35, 6: 300}

    return {
        "bad_small_cases": len(bad_small_values),
        "bad_small_minimum": min(bad_small_values),
        "bad_pair_cases": len(bad_pair_values),
        "bad_pair_minimum": min(bad_pair_values),
        "small_product_counts": tuple(len(level) for level in states),
        "small_crossing_minima": crossing_minima,
    }


def structural_certificate() -> dict[str, object]:
    symbolic_identities()
    finite = finite_classification()
    finite_repairs = finite_product_repairs()
    small_high = fixed_family_certificate(SMALL_POLYNOMIALS, "high")
    small_low = fixed_family_certificate(SMALL_POLYNOMIALS, "low")
    bad_high = fixed_family_certificate(BAD_POLYNOMIALS, "high")
    bad_low = fixed_family_certificate(BAD_POLYNOMIALS, "low")

    assert small_high == {
        "cases": 20,
        "terms": 16_300,
        "minimum": 1,
    }
    assert small_low == {
        "cases": 20,
        "terms": 19_920,
        "minimum": 1,
    }
    assert bad_high == {
        "cases": 2,
        "terms": 1_630,
        "minimum": 1,
    }
    assert bad_low == {
        "cases": 2,
        "terms": 1_992,
        "minimum": 1,
    }
    return {
        "finite": finite,
        "finite_repairs": finite_repairs,
        "small_high": small_high,
        "small_low": small_low,
        "bad_high": bad_high,
        "bad_low": bad_low,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--case",
        choices=(
            "structural",
            "high-high",
            "low-high",
            "low-low",
            "all",
        ),
        default="structural",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    selected = args.case
    if selected in ("structural", "all"):
        result = structural_certificate()
        print("rank-4 forest structural certificate: PASS")
        print(
            "finite alpha<=6 polynomials:",
            result["finite"]["checked_alpha_at_most_six"],
        )
        print(
            "small/full terms:",
            result["small_high"]["terms"],
            result["small_low"]["terms"],
        )
        print(
            "exception/full terms:",
            result["bad_high"]["terms"],
            result["bad_low"]["terms"],
        )
    if selected in ("high-high", "all"):
        result = high_high_certificate()
        print("rank-4 high/high cone: PASS", result)
    if selected in ("low-high", "all"):
        result = low_high_certificate()
        print("rank-4 low/high cone: PASS", result)
    if selected in ("low-low", "all"):
        result = low_low_certificate()
        print("rank-4 low/low cone: PASS", result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
