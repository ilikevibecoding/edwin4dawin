#!/usr/bin/env python3
"""Reparameterize the affine two-kernel bridge by its natural exponents.

The common reciprocal multiplier is A^a S^b and the fixed diagonal
target is N.  Here

  a=2c+m+x-3,  b=2m+epsilon-4,
  N=2c+4m+x+2epsilon+8=a+(3b+epsilon+34)/2.

Substitute m=(b-epsilon+4)/2 and x=a-2c-m+3 into B and P and audit
the resulting parameter degrees and elementary divisibilities.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import (
    A,
    T,
    V,
    c,
    m,
    x,
)
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


z, w = sp.symbols("z w")
a, b, C = sp.symbols("a b C")


def poly_summary(expression: sp.Expr) -> dict:
    poly = sp.Poly(sp.expand(expression), z, w, a, b, C)
    return {
        "term_count": len(poly.terms()),
        "degrees_z_w_a_b_C": [int(value) for value in poly.degree_list()],
        "ordinary_negative_term_count": len(
            [value for value in poly.coeffs() if value < 0]
        ),
        "ordinary_positive_term_count": len(
            [value for value in poly.coeffs() if value > 0]
        ),
    }


def exact_divides(expression: sp.Expr, factor: sp.Expr) -> bool:
    quotient, remainder = sp.div(
        sp.Poly(expression, z, w, a, b, C),
        sp.Poly(factor, z, w, a, b, C),
    )
    return remainder.is_zero


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
        p_source = sp.expand(slope * A)
        b_source = sp.expand(T**3 * affine_kernel * V + slope * A)
        m_sub = (b - parity + 4) / 2
        x_sub = a - 2 * (C + 1) - m_sub + 3
        substitutions = {c: C + 1, m: m_sub, x: x_sub}
        # Multiplication by 4 clears every denominator because the source
        # has parameter degree at most two.
        for kind, source in (("P", p_source), ("B", b_source)):
            natural = sp.cancel(source.subs(substitutions) * 4)
            assert sp.denom(natural) == 1
            natural = sp.expand(natural)
            record = {
                "parity": parity,
                "kind": kind,
                **poly_summary(natural),
                "divisibility": {
                    "A": exact_divides(natural, A),
                    "T": exact_divides(natural, T),
                    "V": exact_divides(natural, V),
                    "z_w": exact_divides(natural, z * w),
                    "e1": exact_divides(natural, z + w),
                    "p2": exact_divides(natural, z**2 + w**2),
                },
            }
            records.append(record)
            print(record, flush=True)
    report = {
        "status": "ANALYSIS",
        "substitution": {
            "m": "(b-epsilon+4)/2",
            "c": "C+1",
            "x": "a-2(C+1)-m+3",
            "target": "N=a+(3b+epsilon+34)/2",
            "clearing_multiplier": 4,
        },
        "records": records,
    }
    Path(
        "path_isolate_p4_group_affine_natural_parameters_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
