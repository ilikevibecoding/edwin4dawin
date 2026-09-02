#!/usr/bin/env python3
"""Find common factors between affine danger and curvature reserve kernels."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    T,
    load_bottom,
    m,
    q,
    w,
    x,
    z,
)
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


c = sp.symbols("c")
A = (1 + z) * (1 + w)
V = 1 + z + w
Lambda = (
    2 * z**2 * w**2
    + 4 * z**2 * w
    + 3 * z**2
    + 4 * z * w**2
    + 8 * z * w
    + 6 * z
    + 3 * w**2
    + 6 * w
    + 4
)


def factor_record(expression: sp.Expr, variables: tuple[sp.Symbol, ...]) -> dict:
    factored = sp.factor(expression)
    factors = sp.factor_list(expression, *variables)
    return {
        "factored": str(factored),
        "factor_list": [
            {"factor": str(factor), "multiplicity": int(multiplicity)}
            for factor, multiplicity in factors[1]
        ],
    }


def main() -> None:
    records = []

    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        k0 = sp.expand(kernel.coeff_monomial(1))
        k1 = sp.expand(kernel.coeff_monomial(x))
        k2 = sp.expand(kernel.coeff_monomial(x**2))
        d = sp.cancel(slope / (q**2 * T**3 * Lambda))
        assert sp.expand(k2 + (z - w) ** 2 * d) == 0
        gcd_01 = sp.gcd(sp.Poly(k0, z, w, m), sp.Poly(k1, z, w, m)).as_expr()
        gcd_0d = sp.gcd(sp.Poly(k0, z, w, m), sp.Poly(d, z, w, m)).as_expr()
        gcd_1d = sp.gcd(sp.Poly(k1, z, w, m), sp.Poly(d, z, w, m)).as_expr()
        records.append(
            {
                "package": "bottom",
                "parity": parity,
                "gcd_K0_K1": factor_record(gcd_01, (z, w, m)),
                "gcd_K0_D": factor_record(gcd_0d, (z, w, m)),
                "gcd_K1_D": factor_record(gcd_1d, (z, w, m)),
                "K0_factor": factor_record(k0, (z, w, m)),
                "K1_factor": factor_record(k1, (z, w, m)),
            }
        )
        print("bottom", parity, flush=True)

    group_T = z * (1 + z) + w * (1 + w)
    for parity in (0, 1):
        constant, slope = split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        kernel = sp.Poly(sp.cancel((constant - slope) / group_T**3), x)
        k0 = sp.expand(kernel.coeff_monomial(1))
        k1 = sp.expand(kernel.coeff_monomial(x))
        k2 = sp.expand(kernel.coeff_monomial(x**2))
        d = sp.cancel(slope / (group_T**3 * Lambda))
        assert sp.expand(k2 + (z - w) ** 2 * d) == 0
        variables = (z, w, c, m)
        gcd_01 = sp.gcd(sp.Poly(k0, *variables), sp.Poly(k1, *variables)).as_expr()
        gcd_0d = sp.gcd(sp.Poly(k0, *variables), sp.Poly(d, *variables)).as_expr()
        gcd_1d = sp.gcd(sp.Poly(k1, *variables), sp.Poly(d, *variables)).as_expr()
        records.append(
            {
                "package": "group",
                "parity": parity,
                "gcd_K0_K1": factor_record(gcd_01, variables),
                "gcd_K0_D": factor_record(gcd_0d, variables),
                "gcd_K1_D": factor_record(gcd_1d, variables),
                "K0_factor": factor_record(k0, variables),
                "K1_factor": factor_record(k1, variables),
            }
        )
        print("group", parity, flush=True)

    report = {"status": "ANALYSIS", "records": records}
    Path(
        "path_isolate_p4_affine_common_factors_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
