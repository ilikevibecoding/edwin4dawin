#!/usr/bin/env python3
"""Split each symmetric affine kernel into center value plus (z-w)^2 curvature."""

from __future__ import annotations

import hashlib
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


c, C, M, u = sp.symbols("c C M u")


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


def split_center_curvature(expression: sp.Expr) -> tuple[sp.Expr, sp.Expr]:
    assert sp.expand(expression.xreplace({z: w, w: z}) - expression) == 0
    center = sp.expand(expression.subs({z: u / 2, w: u / 2}, simultaneous=True))
    center_zw = sp.expand(center.subs(u, z + w))
    quotient = sp.cancel((expression - center_zw) / (z - w) ** 2)
    assert sp.denom(quotient) == 1
    assert sp.expand(expression - center_zw - (z - w) ** 2 * quotient) == 0
    return center, sp.expand(quotient)


def main() -> None:
    records = []
    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = sp.expand(
            kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        )
        center, curvature = split_center_curvature(affine)
        shifted_center = sp.expand(center.subs(m, M + 3))
        shifted_negative_curvature = sp.expand(-curvature.subs(m, M + 3))
        records.append(
            {
                "package": "bottom",
                "parity": parity,
                "center": summarize(shifted_center, (u, M, x)),
                "negative_curvature": summarize(
                    shifted_negative_curvature, (z, w, M, x)
                ),
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
        affine = sp.expand(
            kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        )
        center, curvature = split_center_curvature(affine)
        shift = {c: C + 1, m: M + 3}
        records.append(
            {
                "package": "group",
                "parity": parity,
                "center": summarize(
                    sp.expand(center.subs(shift)), (u, C, M, x)
                ),
                "negative_curvature": summarize(
                    sp.expand(-curvature.subs(shift)), (z, w, C, M, x)
                ),
            }
        )
        print("group", parity, flush=True)

    report = {
        "status": "ANALYSIS",
        "identity": "K_aff=K_aff(u/2,u/2)|u=z+w+(z-w)^2*Q",
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_center_curvature_split_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
