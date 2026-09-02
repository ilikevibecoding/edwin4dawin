#!/usr/bin/env python3
"""Structural lift of the rank-six tree reserve theorem to all forests."""

from __future__ import annotations

import json
import math
from pathlib import Path

import sympy as sp

from explore_rank6_fixed_small_convolution import (
    full_context,
    scaled_fixed,
    small_tree_polynomials,
)
from explore_rank6_three_halves_convolution import factorial_convolution, rank6_margin
from scan_pgc_all_forest_polynomials import multiply
from scan_q_cascade_all_forest_polynomials import q_reserve
from verify_rank4_three_halves_forest_certificate import (
    forest_polynomials,
    polynomial_statistics,
    tree_polynomials,
)


REPORT = Path(__file__).with_name(
    "rank6_three_halves_forest_certificate_exact_20260813.json"
)


def symbolic_identity() -> None:
    pm, p, pp = sp.symbols("pm p pp", positive=True)
    reserve = 12 * p**2 - pm * p - 14 * pm * pp
    assert sp.factor(
        reserve / (pm * p) - (2 * (6 * p / pm - 7 * pp / p) - 1)
    ) == 0


def finite_tree_diagnostic() -> dict:
    trees = tree_polynomials(12)
    counts = []
    minima = []
    for order in range(1, 13):
        values = [
            q_reserve(polynomial, 6)
            for polynomial in trees[order]
            if len(polynomial) - 1 >= 7
        ]
        counts.append(len(values))
        minima.append(min(values) if values else None)
    negatives = []
    for order in range(1, 13):
        for polynomial in trees[order]:
            if len(polynomial) - 1 < 7:
                continue
            value = q_reserve(polynomial, 6)
            if value < 0:
                negatives.append([list(polynomial), value])
    return {"counts": counts, "minima": minima, "negative": negatives}


def finite_required_alpha_certificate() -> dict:
    """Close the orders below 13 that occur in rank-six PGC."""
    forests = forest_polynomials(12)
    by_order = []
    checks = 0
    minimum = None
    minimum_record = None
    for order in range(1, 13):
        values = []
        for polynomial in forests[order]:
            if len(polynomial) - 1 < 10:
                continue
            value = q_reserve(polynomial, 6)
            assert value >= 0
            values.append(value)
            checks += 1
            if minimum is None or value < minimum:
                minimum = value
                minimum_record = [order, list(polynomial)]
        by_order.append([order, len(values), min(values) if values else None])
    assert checks == 94
    assert minimum == 43_624
    assert minimum_record is not None
    return {
        "scope": "all forest polynomials of order<=12 and alpha>=10",
        "checks": checks,
        "minimum": minimum,
        "minimum_record": minimum_record,
        "by_order": by_order,
    }


def finite_small_product_certificate() -> dict:
    forests = forest_polynomials(12)
    trees = tree_polynomials(12)
    checked = 0
    distinct = set()
    minimum = None
    minimum_record = None
    for left_order in range(1, 13):
        for right_order in range(1, 13):
            total_order = left_order + right_order
            if not 13 <= total_order <= 24:
                continue
            for left in forests[left_order]:
                for right in trees[right_order]:
                    product = multiply(left, right)
                    value = q_reserve(product, 6)
                    assert value >= 0
                    checked += 1
                    distinct.add(product)
                    if minimum is None or value < minimum:
                        minimum = value
                        minimum_record = [left_order, right_order, list(left), list(right), list(product)]
    return {
        "pair_checks": checked,
        "distinct_products": len(distinct),
        "minimum": minimum,
        "minimum_record": minimum_record,
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
        margin = rank6_margin(product, h)
        stats = polynomial_statistics(margin)
        assert stats["negative"] == 0
        assert stats["minimum"] >= 1
        total_terms += stats["terms"]
        smallest = stats["minimum"] if smallest is None else min(smallest, stats["minimum"])
    return {
        "cases": len(polynomials),
        "terms": total_terms,
        "minimum": 0 if smallest is None else smallest,
    }


def main() -> int:
    symbolic_identity()
    finite_trees = finite_tree_diagnostic()
    assert finite_trees == {
        "counts": [0, 0, 0, 0, 0, 0, 0, 1, 7, 37, 148, 434],
        "minima": [None, None, None, None, None, None, None, 147, 126, 84, 98, -40],
        "negative": [[[1, 12, 55, 122, 135, 68, 12, 1], -40]],
    }
    print("finite trees", finite_trees, flush=True)
    finite_required_alpha = finite_required_alpha_certificate()
    print("finite required alpha", finite_required_alpha, flush=True)
    finite_products = finite_small_product_certificate()
    assert finite_products == {
        "pair_checks": 2_227_175,
        "distinct_products": 1_609_907,
        "minimum": 9_738,
        "minimum_record": [
            5,
            8,
            [1, 5, 6, 1],
            [1, 8, 21, 21, 7, 1],
            [1, 13, 67, 175, 246, 183, 68, 13, 1],
        ],
    }
    print("small products", finite_products, flush=True)
    fixed_high = fixed_family_certificate("high")
    assert fixed_high == {"cases": 874, "terms": 22_774_692, "minimum": 1}
    print("fixed high", fixed_high, flush=True)
    fixed_low = fixed_family_certificate("low")
    assert fixed_low == {"cases": 874, "terms": 30_849_578, "minimum": 1}
    print("fixed low", fixed_low, flush=True)
    report = {
        "status": "PASS_EXACT_ALL_FOREST_RANK6_RESERVE_LIFT",
        "theorem": "Q6(I(F))>=0 for every forest F with alpha(F)>=10",
        "finite_tree_bases": finite_trees,
        "finite_required_alpha_base": finite_required_alpha,
        "small_products": finite_products,
        "fixed_high": fixed_high,
        "fixed_low": fixed_low,
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
