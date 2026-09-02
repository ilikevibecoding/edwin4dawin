#!/usr/bin/env python3
"""Test integration cones after extracting the exact common T^3 factor."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_affine_direct_integration_kernel import finite_kernel
from analyze_path_isolate_p4_affine_parameter_bound_integration_kernel import (
    cone_summary,
)
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A,
    T,
    V,
    load_bottom,
    m,
    q,
    x,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def compact(audit: dict) -> dict:
    return {
        "reciprocal_bidegree": audit["reciprocal_bidegree"],
        "hcu": audit["reciprocal_hcu"]["hcu"],
        "negative_schur_coefficient_count": audit["reciprocal_hcu"][
            "negative_schur_coefficient_count"
        ],
        "in_paired_cone": audit["reciprocal_paired_cone"]["in_paired_cone"],
        "paired_cone_failure_count": audit["reciprocal_paired_cone"][
            "failure_count"
        ],
        "divisible_by_e1": audit["reciprocal_divisible_by_e1"],
        "e1_quotient_hcu": audit.get("e1_quotient_hcu", {}).get("hcu"),
        "e1_quotient_paired": audit.get(
            "e1_quotient_paired_cone", {}
        ).get("in_paired_cone"),
    }


def polynomial_quotient(numerator: sp.Expr, denominator: sp.Expr) -> sp.Expr:
    quotient = sp.cancel(numerator / denominator)
    if not quotient.is_polynomial():
        raise AssertionError("claimed common factor is not exact")
    return sp.expand(quotient)


def main() -> None:
    records = []
    for parity in (0, 1):
        constant, slope = split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        kernel = sp.Poly(sp.cancel((constant - slope) / T**3), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p = sp.expand(slope * A)
        base = sp.expand(T**3 * affine * V + p)
        increments = {
            "x": (
                sp.expand(A * base.subs(x, x + 1) - base),
                sp.expand((A - 1) * p),
            ),
            "c": (
                sp.expand(A**2 * base.subs(c, c + 1) - base),
                sp.expand((A**2 - 1) * p),
            ),
            "m": (
                sp.expand(A * T**2 * base.subs(m, m + 1) - q * base),
                sp.expand((A * T**2 - q) * p),
            ),
        }
        a = 2 * c + m + x - 3
        b_reduced = 2 * m + parity - 1
        for coordinate, (d_value, r_value) in increments.items():
            d_reduced = polynomial_quotient(d_value, T**3)
            r_reduced = polynomial_quotient(r_value, T**3)
            for numerator, denominator in ((1, 2), (1, 1)):
                value = finite_kernel(
                    d_reduced,
                    r_reduced,
                    a,
                    b_reduced,
                    numerator,
                    denominator,
                )
                audit = compact(cone_summary(value, 1))
                record = {
                    "package": "group",
                    "parity": parity,
                    "coordinate": coordinate,
                    "reserve_scale": f"{numerator}/{denominator}",
                    "extracted_factor": "T^3",
                    **audit,
                }
                records.append(record)
                print(
                    "group",
                    parity,
                    coordinate,
                    record["reserve_scale"],
                    record["hcu"],
                    record["in_paired_cone"],
                    record["paired_cone_failure_count"],
                    flush=True,
                )

    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p = sp.expand(slope * A)
        base = sp.expand(q**2 * T**3 * affine * V + p)
        increments = {
            "x": (
                sp.expand(A * base.subs(x, x + 1) - base),
                sp.expand((A - 1) * p),
            ),
            "m": (
                sp.expand(A * T**2 * base.subs(m, m + 1) - q * base),
                sp.expand(A * T**2 * p.subs(m, m + 1) - q * p),
            ),
        }
        a = m + x - 3
        b_reduced = 2 * m + parity - 2
        for coordinate, (d_value, r_value) in increments.items():
            d_reduced = polynomial_quotient(d_value, q**2 * T**3)
            r_reduced = polynomial_quotient(r_value, q**2 * T**3)
            value = finite_kernel(
                d_reduced,
                r_reduced,
                a,
                b_reduced,
                1,
                1,
            )
            audit = compact(cone_summary(value, 0))
            record = {
                "package": "bottom",
                "parity": parity,
                "coordinate": coordinate,
                "reserve_scale": "1/1",
                "extracted_factor": "(zw)^2*T^3",
                **audit,
            }
            records.append(record)
            print(
                "bottom",
                parity,
                coordinate,
                record["hcu"],
                record["in_paired_cone"],
                record["paired_cone_failure_count"],
                flush=True,
            )

    report = {
        "status": "ANALYSIS",
        "records": records,
        "warning": (
            "Cone entry is sufficient only after separately auditing the "
            "integration identity, shifted central target, and outer boundary exponents."
        ),
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_reduced_"
        "integration_cone_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
