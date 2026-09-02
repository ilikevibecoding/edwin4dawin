#!/usr/bin/env python3
"""Test (2m+x)/(2m+x+C) scales in the direct integration kernel."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_affine_direct_integration_kernel import (
    derivative_sum,
    summarize,
)
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A,
    T,
    V,
    load_bottom,
    m,
    q,
    x,
    z,
    w,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from analyze_path_isolate_p4_group_grouped_tail_symbolic import (
    divisible_by_e1,
    divide_by_e1,
    hcu_audit,
    paired_cone_audit,
    reciprocal,
    shift_parameters,
)
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


c, C, M = sp.symbols("c C M")
e1 = z + w


def scaled_kernel(
    base: sp.Expr,
    reserve: sp.Expr,
    a: sp.Expr,
    b: sp.Expr,
    delta: int,
) -> sp.Expr:
    derivative_block = (
        A * T * V * derivative_sum(reserve)
        + a * T * (2 + e1) * reserve * V
        + 2 * b * A * reserve * V**2
    )
    scaled_excess = 2 * m + x
    return sp.expand(
        2 * (scaled_excess + delta) * A * T * base
        - scaled_excess * derivative_block
    )


def compact_cone(audit: dict) -> dict:
    return {
        key: value
        for key, value in audit.items()
        if key != "atom_certificates"
    }


def cone_summary(value: sp.Expr, c_shift: int) -> dict:
    reversed_source, bidegree = reciprocal(to_sparse(value))
    shifted = shift_parameters(reversed_source, c_shift, 3)
    result = {
        "reciprocal_bidegree": bidegree,
        "reciprocal_hcu": hcu_audit(shifted),
        "reciprocal_paired_cone": compact_cone(paired_cone_audit(shifted)),
        "reciprocal_divisible_by_e1": divisible_by_e1(shifted),
    }
    if result["reciprocal_divisible_by_e1"]:
        quotient = divide_by_e1(shifted)
        result["e1_quotient_hcu"] = hcu_audit(quotient)
        result["e1_quotient_paired_cone"] = compact_cone(
            paired_cone_audit(quotient)
        )
    return result


def main() -> None:
    records = []
    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        reserve = sp.expand(slope * A)
        base = sp.expand(q**2 * T**3 * affine * V + reserve)
        value = scaled_kernel(
            base, reserve, m + x - 3, 2 * m + parity - 5, 66
        )
        records.append(
            {
                "package": "bottom",
                "parity": parity,
                "constant_C": 66,
                **summarize(value.subs(m, M + 3), (z, w, M, x)),
                **cone_summary(value, 0),
            }
        )
        print("bottom", parity, flush=True)

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
        value = scaled_kernel(
            base,
            reserve,
            2 * c + m + x - 3,
            2 * m + parity - 4,
            79,
        )
        records.append(
            {
                "package": "group",
                "parity": parity,
                "constant_C": 79,
                **summarize(
                    value.subs({c: C + 1, m: M + 3}),
                    (z, w, C, M, x),
                ),
                **cone_summary(value, 1),
            }
        )
        print("group", parity, flush=True)

    report = {
        "status": "ANALYSIS",
        "candidate_scales": {
            "bottom": "(2m+x)/(2m+x+66)",
            "group": "(2m+x)/(2m+x+79)",
        },
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_parameter_bound_integration_kernel_"
        "20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
