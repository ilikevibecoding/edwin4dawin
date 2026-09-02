#!/usr/bin/env python3
"""Exact certificates for the finite polynomial steps in the lambda=3 proof.

The proposed rooted-tree induction is analytic except for checking that a
short family of explicit polynomials is nonnegative on rational intervals.
This script converts those polynomials exactly to Bernstein form.  A
polynomial whose Bernstein coefficients are all nonnegative is nonnegative
throughout the interval, because the Bernstein basis functions are
nonnegative and sum to one.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from math import comb
from pathlib import Path


Polynomial = list[Fraction]


def trim(poly: Polynomial) -> Polynomial:
    while len(poly) > 1 and poly[-1] == 0:
        poly.pop()
    return poly


def add_term(poly: Polynomial, degree: int, coefficient: int | Fraction) -> None:
    while len(poly) <= degree:
        poly.append(Fraction(0))
    poly[degree] += Fraction(coefficient)


def substitute_affine(
    poly: Polynomial, left: Fraction, right: Fraction
) -> Polynomial:
    """Return power coefficients of p(left + (right-left) s)."""
    width = right - left
    out = [Fraction(0) for _ in poly]
    for degree, coefficient in enumerate(poly):
        for power in range(degree + 1):
            out[power] += (
                coefficient
                * comb(degree, power)
                * left ** (degree - power)
                * width**power
            )
    return trim(out)


def power_to_bernstein(poly: Polynomial, degree: int | None = None) -> Polynomial:
    """Convert power coefficients on [0,1] to Bernstein coefficients."""
    natural_degree = len(poly) - 1
    if degree is None:
        degree = natural_degree
    if degree < natural_degree:
        raise ValueError("Bernstein degree cannot be below polynomial degree")
    padded = poly + [Fraction(0)] * (degree + 1 - len(poly))
    return [
        sum(
            padded[j] * Fraction(comb(k, j), comb(degree, j))
            for j in range(k + 1)
        )
        for k in range(degree + 1)
    ]


def bernstein_certificate(
    poly: Polynomial,
    left: Fraction,
    right: Fraction,
    degree: int | None = None,
) -> dict[str, object]:
    transformed = substitute_affine(poly, left, right)
    coefficients = power_to_bernstein(transformed, degree)
    minimum = min(coefficients)
    assert minimum >= 0
    return {
        "interval": [str(left), str(right)],
        "power_coefficients": [str(value) for value in poly],
        "bernstein_degree": len(coefficients) - 1,
        "bernstein_coefficients": [str(value) for value in coefficients],
        "minimum_bernstein_coefficient": str(minimum),
    }


def boundary_polynomial(t: int) -> Polynomial:
    """Polynomial 4(2x+1) times the lower bound for N_t(x)."""
    # P_t = t(2x+1) + 24 x^t(2x+1)
    #       - 48t x^t(1-x) - 18 x^(2t)(2x+1).
    poly: Polynomial = [Fraction(0)]
    add_term(poly, 0, t)
    add_term(poly, 1, 2 * t)
    add_term(poly, t, 24)
    add_term(poly, t + 1, 48)
    add_term(poly, t, -48 * t)
    add_term(poly, t + 1, 48 * t)
    add_term(poly, 2 * t, -18)
    add_term(poly, 2 * t + 1, -36)
    return trim(poly)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    checks: dict[str, object] = {}

    # For t=2 the natural Bernstein certificate becomes positive after one
    # rational subdivision.  For t=3,...,6 no subdivision is needed.
    checks["N_2_lower_left"] = bernstein_certificate(
        boundary_polynomial(2), Fraction(1, 4), Fraction(1, 3)
    )
    checks["N_2_lower_right"] = bernstein_certificate(
        boundary_polynomial(2), Fraction(1, 3), Fraction(1)
    )
    for t in range(3, 7):
        checks[f"N_{t}_lower"] = bernstein_certificate(
            boundary_polynomial(t), Fraction(1, 4), Fraction(1)
        )

    # The strengthened-root t=1 step reduces to
    # 152 x^2 - 74 x + 9 >= 0 on [1/4,1].
    strengthened_t1 = [Fraction(9), Fraction(-74), Fraction(152)]
    checks["strengthened_root_t1"] = bernstein_certificate(
        strengthened_t1, Fraction(1, 4), Fraction(1)
    )

    # The bound 12 x^2(1-x)/(2x+1) <= 4/5 reduces to this cubic.
    four_fifths = [
        Fraction(1),
        Fraction(2),
        Fraction(-15),
        Fraction(15),
    ]
    checks["four_fifths_cubic_left"] = bernstein_certificate(
        four_fifths, Fraction(1, 4), Fraction(1, 2)
    )
    checks["four_fifths_cubic_middle"] = bernstein_certificate(
        four_fifths, Fraction(1, 2), Fraction(2, 3)
    )
    checks["four_fifths_cubic_right"] = bernstein_certificate(
        four_fifths, Fraction(2, 3), Fraction(1)
    )

    report = {
        "status": "PASS",
        "method": (
            "Exact rational Bernstein coefficients; every listed coefficient "
            "is nonnegative."
        ),
        "checks": checks,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
