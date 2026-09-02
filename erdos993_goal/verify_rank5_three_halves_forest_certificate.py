#!/usr/bin/env python3
"""Structural certificate lifting the rank-5 tree theorem to forests.

Together with

* ``RANK5_TREE_THREE_HALVES_THEOREM_2026-07-27.md``;
* ``verify_rank5_three_halves_convolution_cones.py``;
* the universal rank-2 curvature and two-step-drop certificates;
* the rank-3 and rank-4 forest reserve certificates;

this proves Q_5(I(F)) >= 0 for every forest F of order at least 10.
"""

from __future__ import annotations

import math

import sympy as sp

from explore_rank5_fixed_small_convolution import (
    full_context,
    scaled_fixed,
    small_tree_polynomials,
)
from explore_rank5_three_halves_convolution import (
    factorial_convolution,
    rank5_margin,
)
from scan_pgc_all_forest_polynomials import multiply
from scan_q_cascade_all_forest_polynomials import q_reserve
from verify_rank4_three_halves_forest_certificate import (
    polynomial_statistics,
    tree_polynomials,
)


SMALL_PRODUCT_COUNTS = (
    1,
    2,
    5,
    13,
    38,
    117,
    222,
    500,
    1_131,
    2_591,
    5_677,
)


def symbolic_identities() -> None:
    pm, p, pp = sp.symbols("pm p pp", positive=True)
    reserve = 10 * p**2 - pm * p - 12 * pm * pp
    before = 5 * p / pm
    after = 6 * pp / p
    assert sp.factor(
        reserve / (pm * p) - (2 * (before - after) - 1)
    ) == 0

    # For q_j=2^j j! p_j, rho_j=q_{j+1}/q_j, the rank-j
    # reserve is equivalent to rho_{j-1}-rho_j >= 1.
    j = sp.symbols("j", positive=True, integer=True)
    factorial_before = 2 * j * p / pm
    factorial_after = 2 * (j + 1) * pp / p
    general_reserve = (
        2 * j * p**2
        - pm * p
        - 2 * (j + 1) * pm * pp
    )
    assert sp.factor(
        general_reserve / (pm * p)
        - (factorial_before - factorial_after - 1)
    ) == 0


def finite_full_tree_bases() -> dict[str, object]:
    trees = tree_polynomials(9)
    counts = []
    minima = []
    for order in range(1, 10):
        values = [
            q_reserve(polynomial, 5)
            for polynomial in trees[order]
            if len(polynomial) - 1 >= 6
        ]
        counts.append(len(values))
        minima.append(min(values) if values else None)
        assert all(value >= 0 for value in values)
    assert tuple(counts) == (0, 0, 0, 0, 0, 0, 1, 6, 27)
    assert tuple(minima) == (
        None,
        None,
        None,
        None,
        None,
        None,
        90,
        54,
        53,
    )
    return {"counts": tuple(counts), "minima": tuple(minima)}


def small_product_states() -> list[set[tuple[int, ...]]]:
    small = small_tree_polynomials()
    assert len(small) == 72
    assert tuple(
        sum(len(polynomial) - 1 == alpha for polynomial in small)
        for alpha in range(1, 6)
    ) == (2, 2, 5, 15, 48)

    states: list[set[tuple[int, ...]]] = [
        set() for _ in range(11)
    ]
    states[0].add((1,))
    changed = True
    while changed:
        changed = False
        for alpha in range(11):
            for left in tuple(states[alpha]):
                for factor in small:
                    new_alpha = alpha + len(factor) - 1
                    if new_alpha > 10:
                        continue
                    product = multiply(left, factor)
                    if product not in states[new_alpha]:
                        states[new_alpha].add(product)
                        changed = True
    assert tuple(len(level) for level in states) == SMALL_PRODUCT_COUNTS
    return states


def finite_small_product_certificate() -> dict[str, object]:
    states = small_product_states()
    crossing_minima = {}
    for alpha in range(6, 11):
        values = [
            q_reserve(polynomial, 5)
            for polynomial in states[alpha]
        ]
        assert min(values) > 0
        crossing_minima[alpha] = min(values)
    assert crossing_minima == {
        6: 54,
        7: 582,
        8: 2_908,
        9: 12_960,
        10: 41_060,
    }

    # If a forest of order at least 10 has total independence number
    # at most five, bipartiteness forces n=10 and alpha=5.
    order_ten_values = [
        q_reserve(polynomial, 5)
        for polynomial in states[5]
        if polynomial[1] == 10
    ]
    assert len(order_ten_values) == 25
    assert min(order_ten_values) == 150
    return {
        "counts": tuple(len(level) for level in states),
        "crossing_minima": crossing_minima,
        "order_ten_alpha_five_count": len(order_ten_values),
        "order_ten_alpha_five_minimum": min(order_ten_values),
    }


def fixed_family_certificate(mode: str) -> dict[str, int]:
    polynomials = small_tree_polynomials()
    context, h, full = full_context(mode)
    zero = context.constant(0)
    total_terms = 0
    smallest = None
    for polynomial in polynomials:
        fixed = scaled_fixed(polynomial, h, zero)
        product = factorial_convolution(fixed, full, zero)
        margin = rank5_margin(product, h)
        stats = polynomial_statistics(margin)
        assert stats["negative"] == 0
        assert stats["minimum"] >= 1
        total_terms += stats["terms"]
        smallest = (
            stats["minimum"]
            if smallest is None
            else min(smallest, stats["minimum"])
        )
    return {
        "cases": len(polynomials),
        "terms": total_terms,
        "minimum": 0 if smallest is None else smallest,
    }


def main() -> int:
    symbolic_identities()
    finite_trees = finite_full_tree_bases()
    finite_products = finite_small_product_certificate()
    fixed_high = fixed_family_certificate("high")
    fixed_low = fixed_family_certificate("low")
    assert fixed_high == {
        "cases": 72,
        "terms": 328_896,
        "minimum": 1,
    }
    assert fixed_low == {
        "cases": 72,
        "terms": 424_656,
        "minimum": 1,
    }

    print("rank-5 forest structural certificate: PASS")
    print("finite full-tree bases:", finite_trees)
    print("small-product crossing:", finite_products)
    print("fixed/full:", fixed_high, fixed_low)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
