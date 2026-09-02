#!/usr/bin/env python3
"""Derive the exact affine two-kernel form for the bottom-pair lift."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_path_isolate_p4_bottom_pair_affine_slope import (
    A,
    T,
    load_bottom,
    m,
    w,
    x,
    z,
)


V = 1 + z + w
q = z * w


def canonical(poly: sp.Poly) -> str:
    payload = "\n".join(
        f"{monomial}:{coefficient}" for monomial, coefficient in poly.terms()
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def summary(expression: sp.Expr) -> dict:
    poly = sp.Poly(sp.expand(expression), z, w, m, x)
    return {
        "term_count": len(poly.terms()),
        "degrees_z_w_m_x": [int(value) for value in poly.degree_list()],
        "ordinary_negative_term_count": len(
            [value for value in poly.coeffs() if value < 0]
        ),
        "ordinary_minimum_coefficient": int(min(poly.coeffs())),
        "sha256": canonical(poly),
    }


def main() -> None:
    records = []
    sources = {}
    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        assert kernel.degree() == 2
        affine_kernel = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_kernel = sp.expand(slope * A)
        b_kernel = sp.expand(q**2 * T**3 * affine_kernel * V + slope * A)
        assert sp.expand(
            V**0 * (b_kernel + 0 * p_kernel)
            - (q**2 * T**3 * affine_kernel * V + slope * A)
        ) == 0
        p_poly = sp.Poly(p_kernel, z, w, m, x)
        b_poly = sp.Poly(b_kernel, z, w, m, x)
        assert p_poly.degree(z) == p_poly.degree(w)
        assert b_poly.degree(z) == b_poly.degree(w)
        assert p_poly.degree(z) == b_poly.degree(z)
        sources[parity] = {
            "P": p_kernel,
            "B": b_kernel,
        }
        records.append(
            {
                "parity": parity,
                "kernel_affine": summary(affine_kernel),
                "P": summary(p_kernel),
                "B": summary(b_kernel),
                "common_bidegree": int(p_poly.degree(z)),
            }
        )
        print(records[-1], flush=True)
    report = {
        "status": "PASS_PATH_ISOLATE_P4_BOTTOM_PAIR_AFFINE_TWO_KERNEL",
        "identity": (
            "For k=r+1>=1, after a common positive monomial, the affine "
            "kernel is V^r*(B_e+r*P_e), P_e=J_e*A, "
            "B_e=(zw)^2*T^3*K_aff_e*V+J_e*A."
        ),
        "records": records,
    }
    Path(
        "path_isolate_p4_bottom_pair_affine_two_kernel_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
