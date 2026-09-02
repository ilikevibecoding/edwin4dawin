#!/usr/bin/env python3
"""Analyze the bottom-pair m->m+1, r->r+1 kernel correction."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A,
    T,
    V,
    load_bottom,
    m,
    q,
    w,
    x,
    z,
)
from analyze_path_isolate_p4_group_grouped_tail_symbolic import reciprocal


r = sp.symbols("r", integer=True, nonnegative=True)


def summarize(expression: sp.Expr, variables: tuple[sp.Symbol, ...]) -> dict:
    poly = sp.Poly(sp.expand(expression), *variables)
    negative = [
        (monomial, coefficient)
        for monomial, coefficient in poly.terms()
        if coefficient < 0
    ]
    return {
        "term_count": len(poly.terms()),
        "degree_list": list(map(int, poly.degree_list())),
        "negative_term_count": len(negative),
        "minimum_coefficient": int(min(poly.coeffs())),
        "first_negative_terms": [
            {"monomial": list(map(int, monomial)), "coefficient": int(coefficient)}
            for monomial, coefficient in negative[:12]
        ],
    }


def main() -> None:
    records = []
    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_kernel = sp.expand(slope * A)
        b_kernel = sp.expand(q**2 * T**3 * affine * V + slope * A)
        p_recip, degree = reciprocal(
            {
                monomial[:2] + (0, monomial[2], monomial[3]): int(coefficient)
                for monomial, coefficient in sp.Poly(
                    p_kernel, z, w, m, x
                ).terms()
            }
        )
        b_recip, b_degree = reciprocal(
            {
                monomial[:2] + (0, monomial[2], monomial[3]): int(coefficient)
                for monomial, coefficient in sp.Poly(
                    b_kernel, z, w, m, x
                ).terms()
            }
        )
        assert degree == b_degree == 26
        p_expr = sum(
            coefficient * z**pz * w**pw * m**pm * x**px
            for (pz, pw, _pc, pm, px), coefficient in p_recip.items()
        )
        b_expr = sum(
            coefficient * z**pz * w**pw * m**pm * x**px
            for (pz, pw, _pc, pm, px), coefficient in b_recip.items()
        )
        correction = sp.expand(
            b_expr.subs(m, m + 1)
            - b_expr
            + (r + 1) * p_expr.subs(m, m + 1)
            - r * p_expr
        )
        for offset in range(-1, 9):
            # r=m-offset includes the experimentally relevant offsets 4 and 3.
            specialized = sp.expand(correction.subs({r: m - offset, x: 0}))
            records.append(
                {
                    "parity": parity,
                    "r_specialization": f"m-{offset}",
                    **summarize(specialized, (z, w, m)),
                }
            )
        records.append(
            {
                "parity": parity,
                "r_specialization": "general_r_x0",
                **summarize(correction.subs(x, 0), (z, w, m, r)),
            }
        )
        print(parity, flush=True)
    report = {
        "status": "PROBE",
        "identity": (
            "Q=B(m+1)-B(m)+(r+1)P(m+1)-rP(m) for the "
            "reciprocal bottom-pair kernels"
        ),
        "records": records,
    }
    Path(
        "path_isolate_p4_bottom_pair_moving_entry_correction_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
