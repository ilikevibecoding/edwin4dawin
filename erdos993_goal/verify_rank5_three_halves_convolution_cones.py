#!/usr/bin/env python3
"""Exact convolution-cone certificate for the rank-5 reserve.

The three input cones are parametrized in
``explore_rank5_three_halves_convolution.py``.  This verifier proves
that every high/high, low/high, and low/low product has nonnegative
rank-5 margin.  All arithmetic in the AM-GM certificate is integer
arithmetic.
"""

from __future__ import annotations

from collections import defaultdict

import sympy as sp

from explore_rank5_three_halves_convolution import (
    high_high,
    low_high,
    low_low,
)
from verify_rank4_three_halves_forest_certificate import (
    polynomial_statistics,
)


SCALE = 1_000_000

# Each row means
#
#   A*x^left + B*x^right - C*x^middle >= 0,
#
# because left+right=2*middle and 4*A*B >= C^2.  Rows sharing a
# negative monomial split its coefficient between several AM-GM blocks.
R0_AMGM = (
    (4000000, (1, 0, 0, 2, 6, 0), 115747, (1, 0, 0, 0, 8, 0), 34696782, (1, 0, 0, 4, 4, 0)),
    (8000000, (1, 0, 1, 1, 6, 0), 9688268, (0, 0, 2, 2, 5, 0), 1651620, (2, 0, 0, 0, 7, 0)),
    (4000000, (1, 0, 2, 0, 6, 0), 3109948, (0, 0, 4, 0, 5, 0), 1287276, (2, 0, 0, 0, 7, 0)),
    (8000000, (1, 1, 0, 1, 6, 0), 90393, (1, 0, 0, 0, 8, 0), 177785481, (1, 2, 0, 2, 4, 0)),
    (8000000, (1, 1, 1, 0, 6, 0), 9732402, (0, 2, 2, 0, 5, 0), 1644096, (2, 0, 0, 0, 7, 0)),
    (4000000, (1, 2, 0, 0, 6, 0), 160608, (1, 0, 0, 0, 8, 0), 24991158, (1, 4, 0, 0, 4, 0)),
    (20000000, (2, 0, 0, 1, 4, 2), 95248, (1, 0, 0, 0, 6, 2), 1049890812, (3, 0, 0, 2, 2, 2)),
    (72000000, (2, 0, 0, 1, 5, 1), 395412, (1, 0, 0, 0, 7, 1), 3277594004, (3, 0, 0, 2, 3, 1)),
    (52000000, (2, 0, 0, 1, 6, 0), 302036, (1, 0, 0, 0, 8, 0), 2238143800, (3, 0, 0, 2, 4, 0)),
    (78000000, (2, 0, 0, 2, 5, 0), 1250940, (2, 0, 0, 0, 7, 0), 1215885656, (2, 0, 0, 4, 3, 0)),
    (20000000, (2, 0, 1, 0, 4, 2), 74296, (1, 0, 0, 0, 6, 2), 1345967484, (3, 0, 2, 0, 2, 2)),
    (72000000, (2, 0, 1, 0, 5, 1), 292792, (1, 0, 0, 0, 7, 1), 4426350448, (3, 0, 2, 0, 3, 1)),
    (13000000, (2, 0, 1, 0, 6, 0), 6817, (1, 0, 0, 0, 8, 0), 6197740942, (3, 0, 2, 0, 4, 0)),
    (39000000, (2, 0, 1, 0, 6, 0), 7802501, (2, 0, 0, 0, 7, 0), 48862393, (2, 0, 2, 0, 5, 0)),
    (28000000, (2, 0, 1, 1, 5, 0), 113596, (2, 0, 0, 0, 7, 0), 1725412868, (2, 0, 2, 2, 3, 0)),
    (20000000, (2, 1, 0, 0, 4, 2), 95248, (1, 0, 0, 0, 6, 2), 1049890812, (3, 2, 0, 0, 2, 2)),
    (72000000, (2, 1, 0, 0, 5, 1), 396180, (1, 0, 0, 0, 7, 1), 3271240348, (3, 2, 0, 0, 3, 1)),
    (52000000, (2, 1, 0, 0, 6, 0), 307632, (1, 0, 0, 0, 8, 0), 2197430700, (3, 2, 0, 0, 4, 0)),
    (156000000, (2, 1, 0, 1, 5, 0), 1075832, (2, 0, 0, 0, 7, 0), 5655158056, (2, 2, 0, 2, 3, 0)),
    (28000000, (2, 1, 1, 0, 5, 0), 115180, (2, 0, 0, 0, 7, 0), 1701684324, (2, 2, 2, 0, 3, 0)),
    (78000000, (2, 2, 0, 0, 5, 0), 1673411, (2, 0, 0, 0, 7, 0), 914111340, (2, 4, 0, 0, 3, 0)),
    (696000000, (3, 0, 0, 1, 4, 1), 5361564, (2, 0, 0, 0, 6, 1), 22587439040, (4, 0, 0, 2, 2, 1)),
    (1444000000, (3, 0, 0, 1, 5, 0), 6939180, (2, 0, 0, 0, 7, 0), 75152077168, (4, 0, 0, 2, 3, 0)),
    (376000000, (3, 0, 1, 0, 4, 1), 2116812, (2, 0, 0, 0, 6, 1), 16696806332, (4, 0, 2, 0, 2, 1)),
    (987000000, (3, 0, 1, 0, 5, 0), 1552251, (2, 0, 0, 0, 7, 0), 156896178519, (4, 0, 2, 0, 3, 0)),
    (329000000, (3, 0, 1, 0, 5, 0), 12751803, (3, 0, 0, 0, 6, 0), 2122072464, (3, 0, 2, 0, 4, 0)),
    (696000000, (3, 1, 0, 0, 4, 1), 5387156, (2, 0, 0, 0, 6, 1), 22480136088, (4, 2, 0, 0, 2, 1)),
    (1444000000, (3, 1, 0, 0, 5, 0), 7271061, (2, 0, 0, 0, 7, 0), 72132086355, (4, 2, 0, 0, 3, 0)),
    (312000000, (4, 0, 0, 0, 3, 2), 1855320, (2, 0, 0, 0, 5, 2), 13116874720, (6, 0, 0, 0, 1, 2)),
    (1044000000, (4, 0, 0, 0, 4, 1), 7944900, (2, 0, 0, 0, 6, 1), 34296718652, (6, 0, 0, 0, 2, 1)),
    (132000000, (4, 0, 0, 0, 5, 0), 16716, (1, 0, 0, 0, 8, 0), 264146474142, (7, 0, 0, 0, 2, 0)),
    (8840000000, (4, 0, 0, 1, 4, 0), 41781468, (3, 0, 0, 0, 6, 0), 467585294036, (5, 0, 0, 2, 2, 0)),
    (3112000000, (4, 0, 1, 0, 4, 0), 9230670, (3, 0, 0, 0, 6, 0), 266272495868, (5, 0, 2, 0, 2, 0)),
    (8872000000, (4, 1, 0, 0, 4, 0), 40147954, (3, 0, 0, 0, 6, 0), 493219177020, (5, 2, 0, 0, 2, 0)),
    (6440000000, (5, 0, 0, 0, 3, 1), 45674796, (3, 0, 0, 0, 5, 1), 227004845300, (7, 0, 0, 0, 1, 1)),
    (5532000000, (5, 0, 0, 0, 4, 0), 1622812, (2, 0, 0, 0, 7, 0), 4714505438708, (8, 0, 0, 0, 1, 0)),
    (16596000000, (5, 0, 0, 0, 4, 0), 140027391, (3, 0, 0, 0, 6, 0), 492937376228, (7, 0, 0, 0, 2, 0)),
    (62512000000, (6, 0, 0, 0, 3, 0), 108740284, (3, 0, 0, 0, 6, 0), 8984136329828, (9, 0, 0, 0, 0, 0)),
)

R1_AMGM = (
    (378, (3, 1, 0, 0, 4, 0), 100, (4, 0, 0, 0, 4, 0), 400, (2, 2, 0, 0, 4, 0)),
    (258, (3, 0, 0, 1, 4, 0), 100, (4, 0, 0, 0, 4, 0), 200, (2, 0, 0, 2, 4, 0)),
    (8, (2, 1, 0, 0, 5, 0), 1, (3, 0, 0, 0, 5, 0), 16, (1, 2, 0, 0, 5, 0)),
    (8, (2, 0, 0, 1, 5, 0), 1, (3, 0, 0, 0, 5, 0), 16, (1, 0, 0, 2, 5, 0)),
)


def coefficient_map(polynomial: sp.Poly) -> dict[tuple[int, ...], int]:
    return {
        tuple(int(exponent) for exponent in monomial): int(coefficient)
        for monomial, coefficient in polynomial.terms()
    }


def verify_amgm(
    coefficients: dict[tuple[int, ...], int],
    rows: tuple,
    scale: int,
) -> dict[str, int]:
    negative_coverage: dict[tuple[int, ...], int] = defaultdict(int)
    positive_usage: dict[tuple[int, ...], int] = defaultdict(int)
    minimum_slack = None
    for needed, middle, left_use, left, right_use, right in rows:
        assert tuple(
            left_index + right_index
            for left_index, right_index in zip(left, right)
        ) == tuple(2 * middle_index for middle_index in middle)
        slack = 4 * left_use * right_use - needed * needed
        assert slack >= 0
        minimum_slack = slack if minimum_slack is None else min(
            minimum_slack, slack
        )
        negative_coverage[middle] += needed
        positive_usage[left] += left_use
        positive_usage[right] += right_use

    negatives = {
        monomial: -scale * coefficient
        for monomial, coefficient in coefficients.items()
        if coefficient < 0
    }
    assert negative_coverage == negatives
    smallest_remainder = None
    for monomial, used in positive_usage.items():
        available = scale * coefficients.get(monomial, 0)
        assert available > 0
        assert used <= available
        remainder = available - used
        smallest_remainder = (
            remainder
            if smallest_remainder is None
            else min(smallest_remainder, remainder)
        )
    return {
        "negative_terms": len(negatives),
        "blocks": len(rows),
        "minimum_quadratic_slack": (
            0 if minimum_slack is None else minimum_slack
        ),
        "smallest_source_remainder": (
            0 if smallest_remainder is None else smallest_remainder
        ),
    }


def extract_hard_map(
    polynomial, kept: tuple[int, ...]
) -> tuple[dict[tuple[int, ...], int], int]:
    hard_map = {}
    outside_negative = 0
    for monomial, coefficient in polynomial.terms():
        is_hard = all(
            exponent == 0
            for index, exponent in enumerate(monomial)
            if index not in kept
        )
        if is_hard:
            hard_map[
                tuple(int(monomial[index]) for index in kept)
            ] = int(coefficient)
        else:
            outside_negative += coefficient < 0
    return hard_map, outside_negative


def main() -> int:
    high_margin, _ = high_high()
    high_stats = polynomial_statistics(high_margin)
    assert high_stats == {
        "terms": 512_157,
        "negative": 0,
        "minimum": 1,
        "maximum": 167_441_472,
    }

    low_high_margin, _ = low_high()
    low_high_stats = polynomial_statistics(low_high_margin)
    assert low_high_stats == {
        "terms": 528_280,
        "negative": 57,
        "minimum": -375_072,
        "maximum": 15_961_671_936,
    }

    low_low_margin, _ = low_low()
    low_low_stats = polynomial_statistics(low_low_margin)
    assert low_low_stats == {
        "terms": 544_352,
        "negative": 57,
        "minimum": -375_072,
        "maximum": 212_127_252_480,
    }

    low_high_hard, low_high_outside_negative = extract_hard_map(
        low_high_margin, (0, 1, 2, 5, 6, 7, 8)
    )
    low_low_hard, low_low_outside_negative = extract_hard_map(
        low_low_margin, (0, 1, 3, 6, 7, 8, 9)
    )
    assert low_high_outside_negative == 0
    assert low_low_outside_negative == 0
    assert low_low_hard == low_high_hard
    hard_map = low_high_hard

    variables = sp.symbols("a b ta a3 a4 tb b0", nonnegative=True)
    hard = sp.Poly.from_dict(hard_map, variables, domain=sp.ZZ)
    hard_values = [int(value) for value in hard.coeffs()]
    assert (
        len(hard_values),
        sum(value < 0 for value in hard_values),
        min(hard_values),
        max(hard_values),
    ) == (6_164, 57, -375_072, 9_805_291_776)

    a, b, ta, a3, a4, tb, b0 = variables
    linear = 6 * a + a3 + a4 + 6 * b + ta
    quotient, remainder = sp.div(
        hard, sp.Poly(linear, *variables)
    )
    assert remainder.is_zero
    quotient_values = [int(value) for value in quotient.coeffs()]
    assert (
        len(quotient_values),
        sum(value < 0 for value in quotient_values),
        min(quotient_values),
        max(quotient_values),
    ) == (4_005, 39, -62_512, 801_342_720)

    quotient_in_a = sp.Poly(quotient.as_expr(), a)
    active = variables[1:]
    slices = []
    slice_stats = []
    for exponent in range(10):
        expression = quotient_in_a.coeff_monomial(a**exponent)
        polynomial = sp.Poly(expression, *active)
        slices.append(polynomial)
        values = [int(value) for value in polynomial.coeffs()]
        slice_stats.append(
            (
                len(values),
                sum(value < 0 for value in values),
                min(values) if values else 0,
                max(values) if values else 0,
            )
        )
    assert slice_stats == [
        (1_466, 35, -62_512, 20_547_328),
        (1_033, 4, -378, 130_779_104),
        (666, 0, 6, 406_271_232),
        (406, 0, 264, 724_699_392),
        (231, 0, 4_806, 801_342_720),
        (120, 0, 29_492, 561_666_816),
        (55, 0, 102_480, 301_125_888),
        (21, 0, 169_344, 104_507_136),
        (6, 0, 1_306_368, 20_597_760),
        (1, 0, 1_741_824, 1_741_824),
    ]

    r0_result = verify_amgm(
        coefficient_map(slices[0]), R0_AMGM, SCALE
    )
    r1_result = verify_amgm(
        coefficient_map(slices[1]), R1_AMGM, 1
    )
    print("computed quotient slice certificates:", r0_result, r1_result)
    assert r0_result == {
        "negative_terms": 35,
        "blocks": 38,
        "minimum_quadratic_slack": 6_456,
        "smallest_source_remainder": 51,
    }
    assert r1_result == {
        "negative_terms": 4,
        "blocks": 4,
        "minimum_quadratic_slack": 0,
        "smallest_source_remainder": 113,
    }

    print("rank-5 convolution-cone certificate: PASS")
    print(
        "raw:",
        {
            "high/high": high_stats,
            "low/high": low_high_stats,
            "low/low": low_low_stats,
        },
    )
    print("hard terms:", len(hard_values))
    print("quotient slice certificates:", r0_result, r1_result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
