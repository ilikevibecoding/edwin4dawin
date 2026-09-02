#!/usr/bin/env python3
"""Exact all-order convolution-cone certificate for the rank-six reserve."""

from __future__ import annotations

import gc
import json
import math
from collections import defaultdict
from pathlib import Path

import sympy as sp

from explore_rank6_three_halves_convolution import high_high, low_high, low_low
from verify_rank4_three_halves_forest_certificate import polynomial_statistics


SCALE = 1_000_000
REPORT = Path(__file__).with_name(
    "rank6_three_halves_convolution_cones_exact_20260813.json"
)


def extract_hard_map(polynomial, kept: tuple[int, ...]):
    hard_map: dict[tuple[int, ...], int] = {}
    outside_negative = 0
    for monomial, coefficient in polynomial.terms():
        is_hard = all(
            exponent == 0
            for index, exponent in enumerate(monomial)
            if index not in kept
        )
        if is_hard:
            hard_map[tuple(int(monomial[index]) for index in kept)] = int(coefficient)
        elif coefficient < 0:
            outside_negative += 1
    return hard_map, outside_negative


def allocation_for_pair(
    needed: int,
    left_available: int,
    right_available: int,
    left_weight: float,
    right_weight: float,
):
    if left_available <= 0 or right_available <= 0:
        return None
    ideal = needed * math.sqrt(right_weight / left_weight) / 2
    center = round(ideal)
    candidates = {1, left_available, max(1, int(ideal)), max(1, math.ceil(ideal))}
    candidates.update(range(max(1, center - 40), center + 41))
    for numerator, denominator in ((999, 1000), (99, 100), (9, 10), (3, 4), (1, 2)):
        target_right = max(1, right_available * numerator // denominator)
        candidates.add((needed * needed + 4 * target_right - 1) // (4 * target_right))
    best = None
    for left_use in candidates:
        if not 1 <= left_use <= left_available:
            continue
        right_use = (needed * needed + 4 * left_use - 1) // (4 * left_use)
        if right_use > right_available:
            continue
        score = left_weight * left_use + right_weight * right_use
        candidate = (score, left_use, right_use)
        if best is None or candidate < best:
            best = candidate
    return best


def build_and_verify_amgm(polynomial: sp.Poly) -> dict:
    coefficients = {
        tuple(int(value) for value in monomial): int(coefficient)
        for monomial, coefficient in polynomial.terms()
    }
    remaining = {
        monomial: SCALE * coefficient
        for monomial, coefficient in coefficients.items()
        if coefficient > 0
    }
    negatives = sorted(
        (SCALE * -coefficient, monomial)
        for monomial, coefficient in coefficients.items()
        if coefficient < 0
    )
    pair_map = {}
    incidence = {monomial: 0 for monomial in remaining}
    positive_monomials = sorted(remaining)
    for needed, middle in negatives:
        pairs = []
        for left in positive_monomials:
            right = tuple(2 * m - l for m, l in zip(middle, left))
            if left > right or right not in remaining:
                continue
            pairs.append((left, right))
            incidence[left] += 1
            incidence[right] += 1
        assert pairs
        pair_map[middle] = pairs

    allocations = []
    coverage: dict[tuple[int, ...], int] = defaultdict(int)
    usage: dict[tuple[int, ...], int] = defaultdict(int)
    minimum_slack = None
    ordered = sorted(negatives, key=lambda item: (len(pair_map[item[1]]), -item[0], item[1]))
    for needed, middle in ordered:
        choices = []
        for left, right in pair_map[middle]:
            left_available = remaining[left]
            right_available = remaining[right]
            result = allocation_for_pair(
                needed,
                left_available,
                right_available,
                max(1, incidence[left]) / left_available if left_available else math.inf,
                max(1, incidence[right]) / right_available if right_available else math.inf,
            )
            if result is None:
                continue
            score, left_use, right_use = result
            choices.append(
                (
                    score,
                    max(left_use / left_available, right_use / right_available),
                    left,
                    right,
                    left_use,
                    right_use,
                )
            )
        assert choices
        _, _, left, right, left_use, right_use = min(choices)
        assert tuple(l + r for l, r in zip(left, right)) == tuple(2 * m for m in middle)
        slack = 4 * left_use * right_use - needed * needed
        assert slack >= 0
        minimum_slack = slack if minimum_slack is None else min(minimum_slack, slack)
        remaining[left] -= left_use
        remaining[right] -= right_use
        assert remaining[left] >= 0 and remaining[right] >= 0
        incidence[left] = max(0, incidence[left] - 1)
        incidence[right] = max(0, incidence[right] - 1)
        coverage[middle] += needed
        usage[left] += left_use
        usage[right] += right_use
        allocations.append((needed, middle, left_use, left, right_use, right))

    expected = {
        monomial: SCALE * -coefficient
        for monomial, coefficient in coefficients.items()
        if coefficient < 0
    }
    assert dict(coverage) == expected
    smallest_remainder = min(
        SCALE * coefficients[monomial] - used for monomial, used in usage.items()
    )
    assert smallest_remainder >= 0
    return {
        "negative_terms": len(negatives),
        "blocks": len(allocations),
        "minimum_quadratic_slack": minimum_slack,
        "smallest_source_remainder": smallest_remainder,
        "rows": [
            [needed, list(middle), left_use, list(left), right_use, list(right)]
            for needed, middle, left_use, left, right_use, right in sorted(
                allocations, key=lambda row: row[1]
            )
        ],
    }


def poly_stats(poly: sp.Poly) -> dict[str, int]:
    values = [int(value) for value in poly.coeffs()]
    return {
        "terms": len(values),
        "negative": sum(value < 0 for value in values),
        "minimum": min(values),
        "maximum": max(values),
    }


def main() -> int:
    report: dict = {"status": "PASS_EXACT_ALL_ORDER_RANK6_CONVOLUTION_CONES", "scale": SCALE}

    high_margin, _ = high_high()
    report["high_high"] = polynomial_statistics(high_margin)
    assert report["high_high"] == {
        "terms": 7_409_192,
        "negative": 0,
        "minimum": 1,
        "maximum": 75_818_264_244,
    }
    del high_margin
    gc.collect()

    mixed_margin, _ = low_high()
    report["low_high"] = polynomial_statistics(mixed_margin)
    assert report["low_high"] == {
        "terms": 7_698_498,
        "negative": 152,
        "minimum": -605_920,
        "maximum": 21_265_743_494_310,
    }
    mixed_map, outside = extract_hard_map(mixed_margin, (1, 2, 5, 6, 7, 8, 9))
    assert outside == 0
    del mixed_margin
    gc.collect()
    mixed_variables = sp.symbols("b ta a3 a4 a5 tb b0", nonnegative=True)
    mixed_hard = sp.Poly.from_dict(mixed_map, mixed_variables, domain=sp.ZZ)
    report["low_high_hard"] = poly_stats(mixed_hard)
    assert report["low_high_hard"] == {
        "terms": 13_057,
        "negative": 152,
        "minimum": -605_920,
        "maximum": 73_916_778_240,
    }
    b, ta, a3, a4, a5, tb, b0 = mixed_variables
    mixed_linear = 7 * b + ta + a3 + a4 + a5
    mixed_quotient, remainder = sp.div(
        mixed_hard, sp.Poly(mixed_linear, *mixed_variables)
    )
    assert remainder.is_zero
    report["low_high_quotient"] = poly_stats(mixed_quotient)
    report["low_high_amgm"] = build_and_verify_amgm(mixed_quotient)
    del mixed_map, mixed_hard, mixed_quotient
    gc.collect()

    low_margin, _ = low_low()
    report["low_low"] = polynomial_statistics(low_margin)
    assert report["low_low"] == {
        "terms": 7_988_458,
        "negative": 193,
        "minimum": -605_920,
        "maximum": 834_662_895_360_000,
    }
    low_map, outside = extract_hard_map(low_margin, (1, 2, 3, 6, 7, 8, 9, 10))
    assert outside == 0
    del low_margin
    gc.collect()
    low_variables = sp.symbols("b c ta a3 a4 a5 tb b0", nonnegative=True)
    low_hard = sp.Poly.from_dict(low_map, low_variables, domain=sp.ZZ)
    report["low_low_hard"] = poly_stats(low_hard)
    assert report["low_low_hard"] == {
        "terms": 38_358,
        "negative": 193,
        "minimum": -605_920,
        "maximum": 38_995_190_829_000,
    }
    b, c, ta, a3, a4, a5, tb, b0 = low_variables
    low_linear = 7 * b + 7 * c + ta + a3 + a4 + a5
    low_quotient, remainder = sp.div(low_hard, sp.Poly(low_linear, *low_variables))
    assert remainder.is_zero
    report["low_low_quotient"] = poly_stats(low_quotient)
    report["low_low_amgm"] = build_and_verify_amgm(low_quotient)

    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("high/high", report["high_high"])
    print("low/high", report["low_high_quotient"], report["low_high_amgm"]["blocks"])
    print("low/low", report["low_low_quotient"], report["low_low_amgm"]["blocks"])
    print("report", REPORT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
