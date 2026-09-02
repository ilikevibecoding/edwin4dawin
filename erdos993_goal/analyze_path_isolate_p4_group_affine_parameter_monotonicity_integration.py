#!/usr/bin/env python3
"""Test the half-reserve integration certificate for affine monotonicity."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_affine_direct_integration_kernel import (
    finite_kernel,
    summarize,
)
from analyze_path_isolate_p4_affine_parameter_bound_integration_kernel import (
    cone_summary,
)
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A,
    T,
    V,
    m,
    q,
    w,
    x,
    z,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


C, M = sp.symbols("C M")


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
        reserve = sp.expand(slope * A)
        base = sp.expand(T**3 * affine * V + reserve)
        increments = {
            "x": (
                sp.expand(A * base.subs(x, x + 1) - base),
                sp.expand((A - 1) * reserve),
            ),
            "c": (
                sp.expand(A**2 * base.subs(c, c + 1) - base),
                sp.expand((A**2 - 1) * reserve),
            ),
            "m": (
                sp.expand(A * T**2 * base.subs(m, m + 1) - q * base),
                sp.expand((A * T**2 - q) * reserve),
            ),
        }
        a = 2 * c + m + x - 3
        b = 2 * m + parity - 4
        for coordinate, (increment_base, increment_reserve) in increments.items():
            for reserve_numerator, reserve_denominator in ((1, 2), (1, 1)):
                raw_value = finite_kernel(
                    increment_base,
                    increment_reserve,
                    a,
                    b,
                    reserve_numerator,
                    reserve_denominator,
                )
                for allocation, factor in (("none", 1), ("A*T", A * T)):
                    value = sp.expand(factor * raw_value)
                    shifted_value = sp.expand(
                        value.subs({c: C + 1, m: M + 3})
                    )
                    record = {
                        "parity": parity,
                        "coordinate": coordinate,
                        "reserve_scale": (
                            f"{reserve_numerator}/{reserve_denominator}"
                        ),
                        "allocated_outer_factor": allocation,
                        **summarize(shifted_value, (z, w, C, M, x)),
                        **compact(cone_summary(value, 1)),
                    }
                    records.append(record)
                    print(
                        parity,
                        coordinate,
                        record["reserve_scale"],
                        allocation,
                        record["negative_term_count"],
                        record["hcu"],
                        record["in_paired_cone"],
                        record["paired_cone_failure_count"],
                        flush=True,
                    )
    report = {
        "status": "ANALYSIS",
        "candidate": (
            "For each coordinate, test reserve scales 1/2 and 1 after "
            "the V-derivative integration step, with and without the "
            "minimal available outer factor A*T."
        ),
        "records": records,
        "warning": (
            "Cone membership proves the candidate only after the exact "
            "integration identity and the m-target alignment are audited."
        ),
    }
    Path(
        "path_isolate_p4_group_affine_parameter_monotonicity_"
        "integration_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
