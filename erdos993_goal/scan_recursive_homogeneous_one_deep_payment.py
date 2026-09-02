#!/usr/bin/env python3
"""Exact adversarial scan on recursively homogeneous rooted trees.

Start from a single rooted vertex, with pair (P,E)=(1+x,1).  For each
branching number m in the supplied list, replace the current rooted tree
by a new root having m identical copies of it as children:

    E_new=P^m,  P_new=E_new+x E^m.

The list ``1,t,m`` reproduces the inward Galvin family used by
``scan_one_deep_galvin_payment_exact.py``.  Further entries test deeper
phase-stacking constructions that ordinary random-tree samples almost
never encounter.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from fractions import Fraction
from pathlib import Path

from flint import fmpz_poly


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

X = fmpz_poly([0, 1])
ONE = fmpz_poly([1])
ONE_PLUS_X = fmpz_poly([1, 1])


def coeff(poly: fmpz_poly, rank: int):
    return poly[rank] if 0 <= rank <= poly.degree() else 0


def stable_decimal(numerator: int, denominator: int) -> float:
    shift = max(
        0,
        max(numerator.bit_length(), denominator.bit_length()) - 52,
    )
    return (numerator >> shift) / (denominator >> shift)


def rooted_pair(branching: list[int]) -> tuple[fmpz_poly, fmpz_poly]:
    p = ONE_PLUS_X
    e = ONE
    for multiplicity in branching:
        new_e = p**multiplicity
        new_p = new_e + X * (e**multiplicity)
        p, e = new_p, new_e
    return p, e


def scan(
    branching: list[int],
    direct_leaves: int,
    minimum_rank: int,
) -> dict:
    p, e = rooted_pair(branching)
    c_poly = (ONE_PLUS_X**direct_leaves) * p
    d_poly = e
    b_poly = ONE_PLUS_X * (c_poly + X * d_poly)

    checks = 0
    negative_drift = 0
    negative_gsb = 0
    negative_minor = 0
    half_payment_failures = 0
    maximum: Fraction | None = None
    maximum_item = None
    first_failure = None

    for k in range(minimum_rank, c_poly.degree() + 1):
        if coeff(b_poly, k + 1) < coeff(b_poly, k):
            continue
        cm = coeff(c_poly, k - 1)
        c = coeff(c_poly, k)
        cp = coeff(c_poly, k + 1)
        dm2 = coeff(d_poly, k - 2)
        dm1 = coeff(d_poly, k - 1)
        d = coeff(d_poly, k)
        if cm <= 0 or c <= 0:
            continue

        drift = (
            (k + 1) * cm * (c + d + dm1)
            - (k * c + cm) * (cm + dm1 + dm2)
        )
        gsb = k * c * c + cm * c - (k + 1) * cm * cp
        minor = (
            c * c
            - cm * cp
            + c * (d + dm1)
            - cp * (dm1 + dm2)
        )
        half_margin = 2 * c * drift + (cm + dm1 + dm2) * gsb
        if (
            c * drift + (cm + dm1 + dm2) * gsb
            != (k + 1) * cm * minor
        ):
            raise AssertionError("compensation identity failed")

        checks += 1
        negative_drift += drift < 0
        negative_gsb += gsb < 0
        negative_minor += minor < 0
        half_payment_failures += half_margin < 0
        if half_margin < 0 and first_failure is None:
            first_failure = {
                "k": k,
                "half_margin": str(half_margin),
                "minor": str(minor),
            }
        if drift < 0 and gsb > 0:
            payment = Fraction(
                int(-c * drift),
                int((cm + dm1 + dm2) * gsb),
            )
            if maximum is None or payment > maximum:
                maximum = payment
                maximum_item = {
                    "k": k,
                    "numerator": str(payment.numerator),
                    "denominator": str(payment.denominator),
                    "decimal": stable_decimal(
                        payment.numerator, payment.denominator
                    ),
                }

    # The recursive order is n_new=1+m*n_old.
    order = 1
    for multiplicity in branching:
        order = 1 + multiplicity * order
    order += direct_leaves + 1  # outer support plus terminal isolate

    return {
        "branching": branching,
        "direct_leaves": direct_leaves,
        "inward_order": order - direct_leaves - 1,
        "full_terminal_order": order,
        "inward_alpha": p.degree(),
        "operative_prefix_checks": checks,
        "negative_weighted_deletion_drift": negative_drift,
        "negative_gsb": negative_gsb,
        "negative_pird_minor": negative_minor,
        "half_payment_failures": half_payment_failures,
        "maximum_payment": maximum_item,
        "first_failure": first_failure,
        "status": (
            "PASS_NOT_PROOF"
            if negative_gsb == 0
            and negative_minor == 0
            and half_payment_failures == 0
            else "FAIL"
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--branching",
        required=True,
        help="comma-separated positive integers, for example 1,9,30",
    )
    parser.add_argument("--direct-leaves", type=int, default=2)
    parser.add_argument("--minimum-rank", type=int, default=6)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    branching = [int(item) for item in args.branching.split(",")]
    if not branching or min(branching) < 1:
        raise ValueError("branching values must be positive")

    report = scan(branching, args.direct_leaves, args.minimum_rank)
    rendered = json.dumps(report, indent=2) + "\n"
    if args.output is not None:
        args.output.write_text(rendered, encoding="utf-8")
    print(rendered, end="")


if __name__ == "__main__":
    main()
