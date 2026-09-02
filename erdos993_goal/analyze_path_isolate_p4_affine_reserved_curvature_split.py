#!/usr/bin/env python3
"""Test a center/curvature split after retaining the order-dependent reserve."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_affine_center_curvature_split import (
    split_center_curvature,
)
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


c, C, M, R, k, u = sp.symbols("c C M R k u")
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


def analyze_package(
    package: str,
    parity: int,
    affine: sp.Expr,
    d: sp.Expr,
    shift: dict[sp.Symbol, sp.Expr],
    parameters: tuple[sp.Symbol, ...],
) -> dict:
    bracket = sp.expand(affine * V + k * Lambda * d * A)
    center, curvature = split_center_curvature(bracket)
    late_shift = dict(shift)
    late_shift[k] = R + 7
    shifted_center = sp.expand(center.subs(late_shift))
    shifted_negative_curvature = sp.expand(-curvature.subs(late_shift))
    return {
        "package": package,
        "parity": parity,
        "order_shift": "k=7+R",
        "center": summarize(shifted_center, (u, *parameters, R, x)),
        "negative_curvature": summarize(
            shifted_negative_curvature, (z, w, *parameters, R, x)
        ),
    }


def main() -> None:
    records = []
    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = sp.expand(
            kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        )
        d = sp.cancel(slope / (q**2 * T**3 * Lambda))
        records.append(
            analyze_package(
                "bottom", parity, affine, d, {m: M + 3}, (M,)
            )
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
        d = sp.cancel(slope / (T**3 * Lambda))
        records.append(
            analyze_package(
                "group",
                parity,
                affine,
                d,
                {c: C + 1, m: M + 3},
                (C, M),
            )
        )
        print("group", parity, flush=True)

    report = {
        "status": "ANALYSIS",
        "bracket": "K_aff*V+k*Lambda*D*A",
        "identity": "bracket=center(z+w)+(z-w)^2*curvature",
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_reserved_curvature_split_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
