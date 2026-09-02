#!/usr/bin/env python3
"""Fast exact reconnaissance for the rank-seven g5 cone from order 11.

This runs the same rational elimination as the full interval/edge certificate,
but omits the expensive Bernstein inverse reconstruction and factorization.
All arithmetic and coefficient signs remain exact.  It is deliberately a
probe; a passing result must be replayed by the full fail-closed producer.
"""

from __future__ import annotations

import hashlib
import itertools
from pathlib import Path

import sympy as sp

import probe_iso_n7_bundle_g5_interval_edge_cone_rank7_g5_tail as base


OUTPUT = Path(__file__).resolve().parent / "iso_n7_bundle_g5_threshold11_fast_probe_rank7_g5_tail_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G5_THRESHOLD11_FAST_RANK7_G5_TAIL"


def fast_tensor_bernstein(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    power = dict(polynomial.terms())
    values = {}
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = sp.Integer(0)
        for monomial, coefficient in power.items():
            if all(left <= right for left, right in zip(monomial, index)):
                multiplier = sp.Integer(1)
                for exponent, location, degree in zip(monomial, index, degrees):
                    multiplier *= (
                        sp.binomial(location, exponent)
                        / sp.binomial(degree, exponent)
                    )
                value += coefficient * multiplier
        values[index] = sp.expand(value)
    return degrees, values


def fast_summary(expression, variables, tail):
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression)))
    if sp.LC(sp.Poly(denominator, tail)) < 0:
        numerator, denominator = -numerator, -denominator
    assert denominator.free_symbols <= {tail}
    assert all(value >= 0 for value in sp.Poly(denominator, tail).all_coeffs())
    degrees, values = fast_tensor_bernstein(numerator, variables)
    negatives = []
    scalar_total = 0
    negative_count = 0
    minimum = None
    stream = hashlib.sha256()
    for index in sorted(values):
        value = values[index]
        stream.update(f"{degrees}|{index}|{sp.srepr(value)};".encode())
        for coefficient in sp.Poly(value, tail).all_coeffs():
            scalar_total += 1
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            if coefficient < 0:
                negative_count += 1
                if len(negatives) < 20:
                    negatives.append({
                        "index": list(index),
                        "control": str(value),
                        "negative_coefficient": str(coefficient),
                    })
    return {
        "variables": list(map(str, variables)),
        "degree_profile": list(degrees),
        "bernstein_controls": len(values),
        "tail_scalar_coefficients": scalar_total,
        "negative_tail_scalar_coefficients": negative_count,
        "minimum_tail_scalar_coefficient": str(minimum),
        "first_negative": negatives,
        "positive_denominator": str(sp.factor(denominator)),
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "exact_power_inversion": False,
    }


def main():
    base.THRESHOLD = 11
    base.OUTPUT = OUTPUT
    base.MARKER = MARKER
    base.bernstein_summary = fast_summary
    base.main()


if __name__ == "__main__":
    main()
