#!/usr/bin/env python3
"""Analyze exact common factors of group affine coordinate increments."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


z, w, c, m, x = sp.symbols("z w c m x")
A = (1 + z) * (1 + w)
T = z * (1 + z) + w * (1 + w)
V = 1 + z + w
factors = {
    "z": z,
    "w": w,
    "zw": z * w,
    "e1": z + w,
    "p2": z**2 + w**2,
    "T": T,
    "A_minus_1": A - 1,
    "z_minus_w_squared": (z - w) ** 2,
}


def divides(expression: sp.Expr, factor: sp.Expr) -> bool:
    polynomial = sp.Poly(expression, z, w, c, m, x)
    divisor = sp.Poly(factor, z, w, c, m, x)
    return polynomial.rem(divisor).is_zero


def record(name: str, expression: sp.Expr) -> dict:
    poly = sp.Poly(sp.expand(expression), z, w, c, m, x)
    return {
        "name": name,
        "term_count": len(poly.terms()),
        "degrees_z_w_c_m_x": list(map(int, poly.degree_list())),
        "ordinary_negative_term_count": sum(1 for _, value in poly.terms() if value < 0),
        "divisible_by": [label for label, factor in factors.items() if divides(expression, factor)],
    }


def main() -> None:
    parity_records = []
    for parity in (0, 1):
        constant, slope = split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        kernel = sp.Poly(sp.cancel((constant - slope) / T**3), x)
        k0 = kernel.coeff_monomial(1)
        k1 = kernel.coeff_monomial(x)
        affine = k0 + x * k1
        x_increment = sp.expand(A * affine.subs(x, x + 1) - affine)
        c_increment = sp.expand(A**2 * affine.subs(c, c + 1) - affine)
        parity_records.append(
            {
                "parity_epsilon": parity,
                "K1": record("K1", k1),
                "x_affine_increment": record("A*Kaff(x+1)-Kaff(x)", x_increment),
                "c_affine_increment": record("A^2*Kaff(c+1)-Kaff(c)", c_increment),
            }
        )
    print(json.dumps({"status": "ANALYSIS", "records": parity_records}, indent=2))


if __name__ == "__main__":
    main()
