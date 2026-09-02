#!/usr/bin/env python3
"""Exact replay for the collapsed determinant-selector no-go theorem.

This script does not test the group polynomial.  It audits the unique
coordinate-polarized constant-coefficient selector that would turn the
spectral determinant parent into the exact hard-group operator, and proves
that selector is not real stable.  It also records the independent PSD
obstruction for the one-direction quadrature bridge of Section 91.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUT = HERE / "collapsed_determinant_selector_nogo_exact_20260810.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def falling(m: int, k: int) -> int:
    ans = 1
    for j in range(k):
        ans *= m - j
    return ans


def symbolic_rayleigh_identity() -> bool:
    A, B, C, x, a1, b1, a2, b2 = sp.symbols(
        "A B C x a1 b1 a2 b2", real=True
    )
    f = A * x**4 - B * x**2 * (a1 * b1 + a2 * b2) + C * a1 * b1 * a2 * b2
    delta = sp.diff(f, a1) * sp.diff(f, b1) - f * sp.diff(f, a1, b1)
    claimed = (A * x**4 - B * x**2 * a2 * b2) * (
        B * x**2 - C * a2 * b2
    )
    return sp.expand(delta - claimed) == 0


def main() -> None:
    assert symbolic_rayleigh_identity()

    witnesses = []
    for M in range(4, 41):
        for d in range(4, M + 1):
            A = falling(M, d)
            B = falling(M, d - 2)
            C = falling(M, d - 4)
            left = Fraction(A, B)
            right = Fraction(B, C)
            assert left == (M - d + 2) * (M - d + 1)
            assert right == (M - d + 4) * (M - d + 3)
            assert left < right
            t = (left + right) / 2
            delta = (Fraction(A) - Fraction(B) * t) * (
                Fraction(B) - Fraction(C) * t
            )
            assert delta < 0
            witnesses.append(
                {
                    "M": M,
                    "d": d,
                    "A": A,
                    "B": B,
                    "C": C,
                    "left_root": str(left),
                    "right_root": str(right),
                    "t_midpoint": str(t),
                    "rayleigh_delta": str(delta),
                }
            )

    bridge = []
    for N in range(2, 41):
        # B(alpha,beta)=alpha I+beta K is PSD only if alpha>=|beta|N.
        # Exact quadrature ratio requires alpha^2=2 beta^2, hence N^2<=2.
        assert N * N > 2
        bridge.append(
            {
                "N": N,
                "endpoint_outer_product_singular_value": N,
                "quadrature_requires_alpha_sq_over_beta_sq": 2,
                "psd_requires_alpha_sq_over_beta_sq_at_least": N * N,
                "psd_impossible": True,
                "inertia_of_I_plus_K_over_sqrt2": {
                    "positive": 2 * N - 1,
                    "negative": 1,
                    "zero": 0,
                },
            }
        )

    report = {
        "status": "PASS",
        "scope": "no-go theorem for collapsed coordinate selector and one-direction PSD bridge",
        "symbolic_rayleigh_identity": True,
        "selector_definition": (
            "d! e_d(x) -(d-2)! e_(d-2)(x)(a1*b1+a2*b2) "
            "+(d-4)! e_(d-4)(x)a1*b1*a2*b2"
        ),
        "all_order_witness": {
            "left_root": "(M-d+2)(M-d+1)",
            "right_root": "(M-d+4)(M-d+3)",
            "choice": "x=1, a2=midpoint(left,right), b2=1",
            "conclusion": "Rayleigh difference Delta_(a1,b1)<0 for every M>=d>=4",
        },
        "finite_exact_replay": {
            "cells": len(witnesses),
            "range": "4<=M<=40, 4<=d<=M",
            "witnesses": witnesses,
        },
        "bridge_no_go": {
            "statement": (
                "For endpoint vectors of squared norm N, a direction alpha I+beta K "
                "with the exact quadrature ratio alpha^2=2 beta^2 cannot be PSD for N>=2."
            ),
            "cells": bridge,
        },
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "PASS", "report": str(OUT), "cells": len(witnesses)}))


if __name__ == "__main__":
    main()
