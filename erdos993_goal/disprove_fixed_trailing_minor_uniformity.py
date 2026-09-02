#!/usr/bin/env python3
"""Exact obstruction to the proposed fixed trailing-minor quartic proof.

The quartic pair itself remains positively compatible in the recorded
rational examples.  What fails is the stronger assertion that deleting the
first row/column of the cubic Jacobi matrix always supplies a common
interlacer.  At p=13, alpha=0, u=v=1/2 and c=1/25, exact rational root
isolation gives

    0 < h_1 < c_1,

where h_1 is the first positive zero of the adjacent cubic row and c_1 is
the first zero of the trailing minor.  Interlacing with y*H would instead
require 0 < c_1 < h_1.

The same script checks that the actual current/adjacent cubic pair still has
the interval-overlap property, so this is not a quartic counterexample.
It also isolates the intervening positive parameter where the trailing
minor and adjacent row share a root.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from probe_adjacent_cubic_resultant_bernstein import (
    C_PARAMETER,
    Y,
    cubic_trailing_minor,
    transformed_monic as symbolic_transformed_monic,
)
from verify_adjacent_cubic_trailing_minor_interlacer import (
    characteristic_segment,
    exact_cubic_matrix_data,
    intervals,
    transformed_monic,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "fixed_trailing_minor_uniformity_obstruction_20260806.json"


def primitive_digest(poly: sp.Poly) -> str:
    _, cleared = poly.clear_denoms(convert=True)
    _, primitive = cleared.primitive()
    payload = ",".join(str(value) for value in primitive.all_coeffs())
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def overlap(
    first: list[tuple[sp.Rational, sp.Rational]],
    second: list[tuple[sp.Rational, sp.Rational]],
) -> bool:
    assert len(first) == len(second)
    return all(
        first[index][1] < second[index + 1][0]
        and second[index][1] < first[index + 1][0]
        for index in range(len(first) - 1)
    )


def rational_case(c: Fraction) -> dict[str, object]:
    p = 13
    alpha = 0
    u = v = Fraction(1, 2)
    gamma = [c, 1 - c * (u + v), -(u + v) + c * u * v, u * v]
    current = transformed_monic(p, alpha, gamma)
    adjacent = transformed_monic(p - 2, alpha + 1, gamma)
    adjacent_zero = sp.Poly(Y * adjacent.as_expr(), Y, domain=sp.QQ)
    diagonal, subdiagonal = exact_cubic_matrix_data(p, alpha, gamma)
    trailing = characteristic_segment(diagonal, subdiagonal, 1, len(diagonal))
    current_roots = intervals(current)
    adjacent_zero_roots = intervals(adjacent_zero, allow_zero=True)
    trailing_roots = intervals(trailing)
    pair_overlap = bool(overlap(current_roots, adjacent_zero_roots))
    first_minor_before_first_adjacent = bool(
        trailing_roots[0][1] < adjacent_zero_roots[1][0]
    )
    first_adjacent_before_first_minor = bool(
        adjacent_zero_roots[1][1] < trailing_roots[0][0]
    )
    return {
        "c": str(c),
        "current_adjacent_interval_overlap": pair_overlap,
        "trailing_first_before_adjacent_first": (
            first_minor_before_first_adjacent
        ),
        "adjacent_first_before_trailing_first": (
            first_adjacent_before_first_minor
        ),
        "current_digest": primitive_digest(current),
        "adjacent_with_zero_digest": primitive_digest(adjacent_zero),
        "trailing_minor_digest": primitive_digest(trailing),
        "first_positive_adjacent_interval": list(
            map(str, adjacent_zero_roots[1])
        ),
        "first_trailing_minor_interval": list(map(str, trailing_roots[0])),
    }


def collision_polynomial() -> tuple[sp.Poly, list[tuple[sp.Rational, sp.Rational]]]:
    u = v = sp.Rational(1, 2)
    gamma = [
        C_PARAMETER,
        1 - C_PARAMETER * (u + v),
        -(u + v) + C_PARAMETER * u * v,
        u * v,
    ]
    trailing = cubic_trailing_minor(13, 0, gamma)
    adjacent = symbolic_transformed_monic(11, 1, gamma)
    resultant = sp.cancel(sp.resultant(trailing.as_expr(), adjacent.as_expr(), Y))
    numerator, _ = sp.fraction(resultant)
    polynomial = sp.Poly(numerator, C_PARAMETER, domain=sp.QQ)
    _, primitive = polynomial.clear_denoms(convert=True)
    _, primitive = primitive.primitive()
    positive = []
    for interval, multiplicity in sp.polys.polytools.intervals(
        primitive, eps=sp.Rational(1, 10) ** 20
    ):
        left, right = map(sp.Rational, interval)
        if right > 0:
            assert left > 0 and multiplicity == 1
            positive.append((left, right))
    return primitive, positive


def main() -> None:
    below = rational_case(Fraction(1, 25))
    above = rational_case(Fraction(1, 20))
    assert below["current_adjacent_interval_overlap"]
    assert below["adjacent_first_before_trailing_first"]
    assert not below["trailing_first_before_adjacent_first"]
    assert above["current_adjacent_interval_overlap"]
    assert above["trailing_first_before_adjacent_first"]
    assert not above["adjacent_first_before_trailing_first"]

    collision, positive_intervals = collision_polynomial()
    assert len(positive_intervals) == 1
    assert positive_intervals[0][0] > sp.Rational(1, 25)
    assert positive_intervals[0][1] < sp.Rational(1, 20)
    report = {
        "status": "EXACT_OBSTRUCTION_TO_FIXED_TRAILING_MINOR_INTERLACER",
        "parameters": {"p": 13, "alpha": 0, "u": "1/2", "v": "1/2"},
        "below_collision": below,
        "above_collision": above,
        "collision_resultant_degree": collision.degree(),
        "collision_resultant_digest": primitive_digest(collision),
        "unique_positive_collision_parameter_interval": list(
            map(str, positive_intervals[0])
        ),
        "conclusion": (
            "The fixed first-deletion trailing minor is not a uniform common "
            "interlacer.  The underlying current/adjacent cubic pair still "
            "has strict interval overlap on both sides, so the quartic "
            "compatibility route remains viable with a different interlacer."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
