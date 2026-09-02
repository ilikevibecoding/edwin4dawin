#!/usr/bin/env python3
"""Analyze the two-term grouped tail after removing the proved x^2 part."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_group_grouped_tail_symbolic import (
    Sparse,
    add,
    divisible_by_e1,
    divide_by_e1,
    hcu_audit,
    paired_cone_audit,
    reciprocal,
    shift_parameters,
)
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


z, w, c, m, x = sp.symbols("z w c m x")
A = (1 + z) * (1 + w)
T = z * (1 + z) + w * (1 + w)
V = 1 + z + w


def to_sparse(expression: sp.Expr) -> Sparse:
    return {
        tuple(map(int, monomial)): int(coefficient)
        for monomial, coefficient in sp.Poly(
            sp.expand(expression), z, w, c, m, x
        ).terms()
    }


def analyze(source: Sparse) -> dict:
    reversed_source, bidegree = reciprocal(source)
    shifted = shift_parameters(reversed_source, 1, 3)
    hcu = hcu_audit(shifted)
    e1 = divisible_by_e1(shifted)
    result = {
        "bidegree": bidegree,
        "term_count_after_shift": len(shifted),
        "ordinary_negative_term_count": sum(
            1 for value in shifted.values() if value < 0
        ),
        "hcu": hcu,
        "divisible_by_e1": e1,
    }
    if e1:
        quotient = divide_by_e1(shifted)
        result["e1_quotient_hcu"] = hcu_audit(quotient)
        result["e1_quotient_paired_cone"] = paired_cone_audit(quotient)
    return result


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
        affine_kernel = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_kernel = to_sparse(sp.expand(slope * A))
        base_kernel = to_sparse(
            sp.expand(T**3 * affine_kernel * V + slope * A)
        )
        sources = [("P", p_kernel), ("base", base_kernel)]
        sources.extend(
            (f"base_plus_{scalar}_P", add(base_kernel, p_kernel, scalar))
            for scalar in (1, 2, 3, 4, 5, 6, 8, 10, 16, 32)
        )
        for kind, source in sources:
            records.append(
                {
                    "parity_epsilon": parity,
                    "kind": kind,
                    **analyze(source),
                }
            )
    report = {
        "status": "ANALYSIS",
        "identity": (
            "For k=r+1>=1, affine contribution is "
            "V^r*(B+rP), P=J*A, B=T^3*K_aff*V+J*A."
        ),
        "records": records,
    }
    Path(
        "path_isolate_p4_group_affine_grouped_tail_symbolic_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
