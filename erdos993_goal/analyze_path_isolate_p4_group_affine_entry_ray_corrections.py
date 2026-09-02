#!/usr/bin/env python3
"""Analyze correction kernels on the two observed linear entry rays.

At c=1,x=0 the sampled late entry law has r(m+1)-r(m)=1, so the
kernel correction is B(m+1)-B(m)+P.  At m=3,x=0 and large c the law
has r(c+1)-r(c)=2, giving B(c+1)-B(c)+2P.
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
    to_sparse,
    x,
)
from analyze_path_isolate_p4_group_grouped_tail_symbolic import (
    hcu_audit,
    reciprocal,
    shift_parameters,
)
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def summarize(source, parameter: str, shift: int) -> dict:
    reciprocal_source, degree = reciprocal(source)
    if parameter == "m":
        shifted = shift_parameters(reciprocal_source, 0, shift)
    else:
        shifted = shift_parameters(reciprocal_source, shift, 0)
    return {
        "reciprocal_bidegree": degree,
        "term_count_after_shift": len(shifted),
        "ordinary_negative_term_count": sum(value < 0 for value in shifted.values()),
        "ordinary_minimum_coefficient": min(shifted.values()),
        "hcu": hcu_audit(shifted),
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
        affine_kernel = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_expr = sp.expand(slope * A)
        b_expr = sp.expand(T**3 * affine_kernel * V + slope * A)

        m_base = 10 if parity == 0 else 9
        m_ray = sp.expand(
            b_expr.subs({c: 1, x: 0, m: m + 1})
            - b_expr.subs({c: 1, x: 0})
            + p_expr
        )
        records.append(
            {
                "parity": parity,
                "ray": "c=1,x=0,m increasing",
                "entry_increment": 1,
                "parameter_shift": f"m={m_base}+M",
                **summarize(to_sparse(m_ray), "m", m_base),
            }
        )

        c_base = 15
        c_ray = sp.expand(
            b_expr.subs({m: 3, x: 0, c: c + 1})
            - b_expr.subs({m: 3, x: 0})
            + 2 * p_expr
        )
        records.append(
            {
                "parity": parity,
                "ray": "m=3,x=0,c increasing",
                "entry_increment": 2,
                "parameter_shift": f"c={c_base}+C",
                **summarize(to_sparse(c_ray), "c", c_base),
            }
        )
        for record in records[-2:]:
            print(
                record["parity"],
                record["ray"],
                record["ordinary_negative_term_count"],
                record["hcu"]["negative_schur_coefficient_count"],
                flush=True,
            )
    report = {
        "status": "ANALYSIS",
        "records": records,
    }
    Path(
        "path_isolate_p4_group_affine_entry_ray_corrections_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
