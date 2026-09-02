#!/usr/bin/env python3
"""Disprove the naive single-Grassmannian lift of the G-repaired endpoint.

Homogenize the bare defect-four endpoint polynomial R_m(X,Y) to its total
degree D and polarize the X, Y, and homogenizing variables in the standard
binomial normalization.  If the resulting homogeneous multiaffine
coefficient vector were the Pluecker vector of a point of Gr(D,n), every
quadratic Pluecker relation would vanish.  This script samples exact rational
relations and records explicit violations.  One violation is a proof that
this particular lift is not a single Grassmannian point.
"""

from __future__ import annotations

import json
import random
from fractions import Fraction
from math import comb
from pathlib import Path

import sympy as sp

from verify_group_reserve_reverse_borel_laguerre_identity import X, Y, base_family


OUT = Path("naive_grassmannian_plucker_lift_disproof_20260802.json")


def endpoint_R(m: int) -> sp.Poly:
    N = 3 * m + 3
    a = N - 4
    b = 2 * m + 1
    expression = sp.expand(
        base_family(N, a + 1, b + 2) - base_family(N - 1, a, b)
    )
    return sp.Poly(expression, X, Y)


def candidate_coordinate(
    subset: tuple[int, ...],
    poly: sp.Poly,
    dx: int,
    dy: int,
    degree: int,
) -> Fraction:
    hx = sum(index < dx for index in subset)
    hy = sum(dx <= index < dx + dy for index in subset)
    hs = len(subset) - hx - hy
    if hs != degree - hx - hy or not (0 <= hs <= degree):
        return Fraction(0)
    coefficient = poly.coeff_monomial(X**hx * Y**hy)
    if coefficient == 0:
        return Fraction(0)
    value = sp.Rational(coefficient) / (
        comb(dx, hx) * comb(dy, hy) * comb(degree, hs)
    )
    return Fraction(int(value.p), int(value.q))


def alternating_coordinate(
    ordered_indices: tuple[int, ...],
    poly: sp.Poly,
    dx: int,
    dy: int,
    degree: int,
) -> Fraction:
    if len(set(ordered_indices)) != len(ordered_indices):
        return Fraction(0)
    inversions = sum(
        ordered_indices[i] > ordered_indices[j]
        for i in range(len(ordered_indices))
        for j in range(i + 1, len(ordered_indices))
    )
    sign = -1 if inversions % 2 else 1
    return sign * candidate_coordinate(
        tuple(sorted(ordered_indices)), poly, dx, dy, degree
    )


def relation_value(
    I: tuple[int, ...],
    J: tuple[int, ...],
    poly: sp.Poly,
    dx: int,
    dy: int,
    degree: int,
) -> Fraction:
    value = Fraction(0)
    for r, j in enumerate(J):
        value += (-1) ** (r + 1) * alternating_coordinate(
            I + (j,), poly, dx, dy, degree
        ) * candidate_coordinate(J[:r] + J[r + 1 :], poly, dx, dy, degree)
    return value


def main() -> None:
    rng = random.Random(9930259)
    trials_per_m = 5000
    records = []
    examples = []

    for m in (1, 2):
        poly = endpoint_R(m)
        dx = int(poly.degree(X))
        dy = int(poly.degree(Y))
        degree = int(poly.total_degree())
        nvars = dx + dy + degree
        failures = 0
        nontrivial = 0
        universe = list(range(nvars))
        for trial in range(trials_per_m):
            # Disjoint I,J avoid duplicate-index bookkeeping and give the
            # standard (D-1,D+1) quadratic relation directly.
            chosen = rng.sample(universe, 2 * degree)
            I = tuple(sorted(chosen[: degree - 1]))
            J = tuple(sorted(chosen[degree - 1 :]))
            value = relation_value(I, J, poly, dx, dy, degree)
            if value:
                nontrivial += 1
                failures += 1
                if len(examples) < 8:
                    examples.append(
                        {
                            "m": m,
                            "trial": trial,
                            "I_zero_based": I,
                            "J_zero_based": J,
                            "relation_value": f"{value.numerator}/{value.denominator}",
                        }
                    )
        records.append(
            {
                "m": m,
                "D": degree,
                "degree_X": dx,
                "degree_Y": dy,
                "polarized_variable_count": nvars,
                "sampled_relations": trials_per_m,
                "nonzero_relations": failures,
                "zero_relations": trials_per_m - failures,
            }
        )
        print(records[-1], flush=True)

    assert any(record["nonzero_relations"] for record in records)
    report = {
        "kind": "naive_grassmannian_plucker_lift_disproof",
        "date": "2026-08-02",
        "status": "DISPROVED_NAIVE_SINGLE_PLUCKER_LIFT",
        "construction": (
            "total-degree homogenization followed by separate standard "
            "binomial polarization of X, Y, and the homogenizing variable"
        ),
        "records": records,
        "explicit_violations": examples,
        "conclusion": (
            "The natural polarized G-repaired endpoint coefficient vector is "
            "not the Pluecker vector of one Grassmannian point. This does not "
            "exclude mixed characteristic, sums-of-minors, or TN-operator lifts."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
