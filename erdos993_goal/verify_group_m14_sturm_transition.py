#!/usr/bin/env python3
"""Exact Sturm checks of the fixed group endpoint at the m=14 sign transition."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


OUT = Path("group_m14_sturm_transition_20260803.json")
t = sp.symbols("t")


def line_group(N: int, d: int, ax: int, bx: int, ay: int, by: int) -> sp.Poly:
    result = sp.Poly(0, t, domain=sp.QQ)
    for shift, weight in ((0, 1), (1, -2), (2, 1)):
        seed = hypergeometric_form(N - shift, 1)
        order = d - 2 * shift
        x_chain = [
            sp.Poly(sp.diff(seed, X, r).subs(X, ax + bx * t), t, domain=sp.QQ)
            for r in range(order + 1)
        ]
        y_chain = [
            sp.Poly(sp.diff(seed, X, r).subs(X, ay + by * t), t, domain=sp.QQ)
            for r in range(order + 1)
        ]
        block = sum(
            (
                sp.binomial(order, r) * x_chain[r] * y_chain[order - r]
                for r in range(order + 1)
            ),
            sp.Poly(0, t, domain=sp.QQ),
        )
        result += weight * block
    return result


def digest(poly: sp.Poly) -> str:
    primitive = sp.Poly(sp.primitive(poly.as_expr(), t)[1], t)
    return hashlib.sha256(str(primitive.all_coeffs()).encode("ascii")).hexdigest()


def main() -> None:
    m = 14
    N, d = 3 * m + 4, 2 * m + 5
    lines = [(1, 2, 2, 3), (-10, 5, 17, 7), (100, 1, -100, 2)]
    records = []
    for ax, bx, ay, by in lines:
        polynomial = line_group(N, d, ax, bx, ay, by)
        real_roots = polynomial.count_roots(-sp.oo, sp.oo)
        assert polynomial.degree() == 59
        assert real_roots == 59
        records.append(
            {
                "X": f"{ax}+{bx}t",
                "Y": f"{ay}+{by}t",
                "degree": int(polynomial.degree()),
                "exact_real_root_count": int(real_roots),
                "primitive_coefficient_sha256": digest(polynomial),
            }
        )

    report = {
        "status": "PASS_EXACT_M14_FIXED_GROUP_STURM_CHECKS",
        "m": m,
        "N": N,
        "d": d,
        "lines": records,
        "scope": (
            "These exact restrictions show that the m=14 Schur-sign transition "
            "does not produce a failure on the tested lines; they are finite "
            "evidence, not a real-stability proof."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
