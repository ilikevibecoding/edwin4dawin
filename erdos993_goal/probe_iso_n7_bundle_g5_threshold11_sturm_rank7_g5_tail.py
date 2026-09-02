#!/usr/bin/env python3
"""Exact Sturm refinement of the rank-seven g5 order-11 cone.

Bernstein controls are polynomials in t=n-11.  Nonnegative power
coefficients are an immediate certificate.  For the remaining controls, this
probe square-free-factorizes over QQ and uses exact Sturm counts to verify that
no odd-multiplicity factor has a positive real root.  Together with the sign
at t=0, that is an exact nonnegativity certificate on t>=0.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

import sympy as sp

import probe_iso_n7_bundle_g5_interval_edge_cone_rank7_g5_tail as base
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import (
    fast_tensor_bernstein,
)


OUTPUT = Path(__file__).resolve().parent / "iso_n7_bundle_g5_threshold11_sturm_probe_rank7_g5_tail_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G5_THRESHOLD11_STURM_RANK7_G5_TAIL"


def positive_root_count(polynomial: sp.Poly) -> int:
    return int(polynomial.count_roots(sp.Integer(0), sp.oo))


def sturm_summary(expression, variables, tail):
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression)))
    if sp.LC(sp.Poly(denominator, tail)) < 0:
        numerator, denominator = -numerator, -denominator
    assert denominator.free_symbols <= {tail}
    assert all(value >= 0 for value in sp.Poly(denominator, tail).all_coeffs())
    degrees, values = fast_tensor_bernstein(numerator, variables)

    stream = hashlib.sha256()
    scalar_total = 0
    negative_scalar_count = 0
    coefficient_certificates = 0
    sturm_certificates = 0
    unresolved = []
    minimum_scalar = None
    for index in sorted(values):
        value = values[index]
        stream.update(f"{degrees}|{index}|{sp.srepr(value)};".encode())
        polynomial = sp.Poly(value, tail, domain=sp.QQ)
        coefficients = polynomial.all_coeffs()
        scalar_total += len(coefficients)
        minimum_scalar = (
            min(coefficients) if minimum_scalar is None
            else min(minimum_scalar, *coefficients)
        )
        negative_scalar_count += sum(1 for coefficient in coefficients if coefficient < 0)
        if all(coefficient >= 0 for coefficient in coefficients):
            coefficient_certificates += 1
            continue
        if polynomial.is_zero:
            coefficient_certificates += 1
            continue

        # Remove the harmless t^valuation factor so the sign at zero is
        # nonzero and the open positive-axis Sturm count is unambiguous.
        minimum_exponent = min(monomial[0] for monomial, _ in polynomial.terms())
        reduced = sp.Poly(
            sp.cancel(polynomial.as_expr() / tail**minimum_exponent),
            tail,
            domain=sp.QQ,
        )
        zero_value = reduced.eval(0)
        odd_positive_roots = 0
        factor_rows = []
        if zero_value > 0:
            _content, factors = reduced.sqf_list()
            for factor, multiplicity in factors:
                roots = positive_root_count(factor) if multiplicity % 2 else 0
                odd_positive_roots += roots
                factor_rows.append({
                    "degree": factor.degree(),
                    "multiplicity": multiplicity,
                    "positive_roots_if_odd": roots,
                    "factor_sha256": hashlib.sha256(
                        sp.srepr(factor.as_expr()).encode()
                    ).hexdigest().upper(),
                })
        if zero_value > 0 and odd_positive_roots == 0:
            sturm_certificates += 1
            continue
        if len(unresolved) < 40:
            unresolved.append({
                "index": list(index),
                "control": str(sp.factor(value)),
                "valuation": minimum_exponent,
                "reduced_at_zero": str(zero_value),
                "odd_positive_roots": odd_positive_roots,
                "square_free_factors": factor_rows,
            })

    return {
        "variables": list(map(str, variables)),
        "degree_profile": list(degrees),
        "bernstein_controls": len(values),
        "tail_scalar_coefficients": scalar_total,
        "negative_tail_scalar_coefficients": negative_scalar_count,
        "minimum_tail_scalar_coefficient": str(minimum_scalar),
        "coefficient_certified_controls": coefficient_certificates,
        "sturm_certified_controls": sturm_certificates,
        "unresolved_controls": len(values) - coefficient_certificates - sturm_certificates,
        "first_unresolved": unresolved,
        "positive_denominator": str(sp.factor(denominator)),
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "exact_power_inversion": False,
        "sturm_method": (
            "After removing t-adic valuation, a positive value at zero and "
            "zero positive roots among all odd-multiplicity square-free "
            "factors prove nonnegativity for t>=0 exactly."
        ),
    }


def main():
    base.THRESHOLD = 11
    base.OUTPUT = OUTPUT
    base.MARKER = MARKER
    base.bernstein_summary = sturm_summary
    base.main()


if __name__ == "__main__":
    main()
