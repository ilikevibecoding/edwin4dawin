#!/usr/bin/env python3
"""Test whether the exact affine tail enters a global HCU cone.

For the reciprocal two-kernel expression W^r(B^vee+rP^vee), shift
c=1+C and m=3+M, then audit every parameter-homogeneous rank row.
This is an exact sufficient-certificate search, not a positivity proof
when the audit fails.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_group_grouped_tail_symbolic import (
    Sparse,
    add,
    hcu_audit,
    reciprocal,
    shift_parameters,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import (
    A,
    T,
    V,
    to_sparse,
    x,
)
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def multiply_w(source: Sparse) -> Sparse:
    result: Sparse = {}
    for (pz, pw, pc, pm, px), coefficient in source.items():
        for dz, dw in ((1, 0), (0, 1), (1, 1)):
            key = (pz + dz, pw + dw, pc, pm, px)
            result[key] = result.get(key, 0) + coefficient
    return {key: value for key, value in result.items() if value}


def main() -> None:
    records = []
    maximum_r = 40
    for parity in (0, 1):
        constant, slope = split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        kernel = sp.Poly(sp.cancel((constant - slope) / T**3), x)
        affine_kernel = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_source = to_sparse(sp.expand(slope * A))
        b_source = to_sparse(sp.expand(T**3 * affine_kernel * V + slope * A))
        p_reciprocal, p_degree = reciprocal(p_source)
        b_reciprocal, b_degree = reciprocal(b_source)
        assert p_degree == b_degree
        p_shifted = shift_parameters(p_reciprocal, 1, 3)
        b_shifted = shift_parameters(b_reciprocal, 1, 3)
        p_tail = dict(p_shifted)
        b_tail = dict(b_shifted)
        for r in range(maximum_r + 1):
            combined = add(b_tail, p_tail, r)
            audit = hcu_audit(combined)
            records.append(
                {
                    "parity": parity,
                    "r": r,
                    "term_count": len(combined),
                    "ordinary_negative_term_count": sum(
                        value < 0 for value in combined.values()
                    ),
                    **audit,
                }
            )
            print(parity, r, audit["hcu"], audit["negative_schur_coefficient_count"], flush=True)
            p_tail = multiply_w(p_tail)
            b_tail = multiply_w(b_tail)
    passed_orders = {
        str(parity): [
            record["r"]
            for record in records
            if record["parity"] == parity and record["hcu"]
        ]
        for parity in (0, 1)
    }
    report = {
        "status": "ANALYSIS",
        "identity": "W^r*(B^vee+r*P^vee), W=z+w+zw",
        "domain_shift": "c=1+C,m=3+M",
        "r_range": [0, maximum_r],
        "passed_orders": passed_orders,
        "records": records,
    }
    Path(
        "path_isolate_p4_group_affine_w_tail_hcu_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
