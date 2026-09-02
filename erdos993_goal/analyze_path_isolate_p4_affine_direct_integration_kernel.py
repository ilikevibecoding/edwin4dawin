#!/usr/bin/env python3
"""Analyze direct affine kernels after the V-derivative integration step."""

from __future__ import annotations

import hashlib
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
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


c, C, M = sp.symbols("c C M")
e1 = z + w


def derivative_sum(expression: sp.Expr) -> sp.Expr:
    return sp.diff(expression, z) + sp.diff(expression, w)


def summarize(expression: sp.Expr, variables: tuple[sp.Symbol, ...]) -> dict:
    poly = sp.Poly(sp.expand(expression), *variables)
    negative = [
        (monomial, coefficient)
        for monomial, coefficient in poly.terms()
        if coefficient < 0
    ]
    payload = "\n".join(
        f"{monomial}:{coefficient}" for monomial, coefficient in poly.terms()
    )
    return {
        "term_count": len(poly.terms()),
        "degree_list": list(map(int, poly.degree_list())),
        "negative_term_count": len(negative),
        "minimum_coefficient": str(min(poly.coeffs())),
        "first_negative": [
            {"monomial": list(map(int, monomial)), "coefficient": str(coefficient)}
            for monomial, coefficient in negative[:20]
        ],
        "sha256": hashlib.sha256(payload.encode("utf-8")).hexdigest(),
    }


def finite_kernel(
    base: sp.Expr,
    reserve: sp.Expr,
    a: sp.Expr,
    b: sp.Expr,
    reserve_numerator: int,
    reserve_denominator: int,
) -> sp.Expr:
    # Clear the reserve denominator in
    # R=2AT*base-lambda*(ATV*dP+a*T*(2+e1)*P*V+2b*A*P*V^2).
    derivative_block = (
        A * T * V * derivative_sum(reserve)
        + a * T * (2 + e1) * reserve * V
        + 2 * b * A * reserve * V**2
    )
    return sp.expand(
        2 * reserve_denominator * A * T * base
        - reserve_numerator * derivative_block
    )


def main() -> None:
    records = []
    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        reserve = sp.expand(slope * A)
        base = sp.expand(q**2 * T**3 * affine * V + reserve)
        a = m + x - 3
        b = 2 * m + parity - 5
        for numerator, denominator in ((1, 1), (3, 8)):
            value = finite_kernel(base, reserve, a, b, numerator, denominator)
            records.append(
                {
                    "package": "bottom",
                    "parity": parity,
                    "reserve_scale": f"{numerator}/{denominator}",
                    **summarize(value.subs(m, M + 3), (z, w, M, x)),
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
        a = 2 * c + m + x - 3
        b = 2 * m + parity - 4
        for numerator, denominator in ((1, 1), (3, 8)):
            value = finite_kernel(base, reserve, a, b, numerator, denominator)
            records.append(
                {
                    "package": "group",
                    "parity": parity,
                    "reserve_scale": f"{numerator}/{denominator}",
                    **summarize(
                        value.subs({c: C + 1, m: M + 3}),
                        (z, w, C, M, x),
                    ),
                }
            )
        print("group", parity, flush=True)

    report = {
        "status": "ANALYSIS",
        "identity_tested": (
            "R=2*A*T*B-lambda*(A*T*V*(d_z+d_w)P"
            "+a*T*(2+z+w)*P*V+2*b*A*P*V^2)"
        ),
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_direct_integration_kernel_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
