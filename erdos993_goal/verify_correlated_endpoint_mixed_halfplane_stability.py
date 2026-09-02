#!/usr/bin/env python3
"""Exact replay for correlated endpoint mixed half-plane stability."""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "correlated_endpoint_mixed_halfplane_stability_exact_20260810.json"
X, Y, U = sp.symbols("x y u")


def path_poly(M: int, z: sp.Symbol) -> sp.Expr:
    return sp.expand(sum(comb(2 * M - i - 1, i) * z**i for i in range(M)))


def path_matrix(size: int) -> sp.Matrix:
    return sp.Matrix(
        size,
        size,
        lambda i, j: 2 if i == j else (1 if abs(i - j) == 1 else 0),
    )


def digest(expr: sp.Expr) -> str:
    return hashlib.sha256(str(sp.expand(expr)).encode("utf-8")).hexdigest()


def main() -> None:
    cases = []
    for N in range(3, 7):
        m = N - 1
        a = sp.symbols(f"a0:{m}")
        b = sp.symbols(f"b0:{m}")
        C = path_matrix(m)
        da = sp.det(sp.diag(*a) + X * C)
        db = sp.det(sp.diag(*b) + Y * C)

        assert sp.expand(da.subs(dict(zip(a, [1] * m))) - path_poly(N, X)) == 0
        assert sp.expand(db.subs(dict(zip(b, [1] * m))) - path_poly(N, Y)) == 0

        value = da * db
        for ai, bi in ((a[0], b[0]), (a[-1], b[-1])):
            value = sp.expand(value - U * sp.diff(value, ai, bi))

        special = value.subs(dict(zip(a, [1] * m))).subs(dict(zip(b, [-1] * m)))
        recovered = sp.expand((-1) ** m * special.subs(Y, -Y))
        expected = sp.expand(
            path_poly(N, X) * path_poly(N, Y)
            + 2 * U * path_poly(N - 1, X) * path_poly(N - 1, Y)
            + U**2 * path_poly(N - 2, X) * path_poly(N - 2, Y)
        )
        assert sp.expand(recovered - expected) == 0

        # The elementary stability symbol of 1-u d_r d_s.
        r, s, R, S = sp.symbols("r s R S")
        symbol = sp.expand((r + R) * (s + S) - U)
        direct = sp.expand(
            (r + R) * (s + S)
            - U * sp.diff((r + R) * (s + S), r, s)
        )
        assert direct == symbol
        cases.append({"N": N, "degree": sp.Poly(expected, X, Y).total_degree(), "sha256": digest(expected)})

    payload = {
        "status": "PASS_EXACT_CORRELATED_ENDPOINT_MIXED_HALFPLANE_STABILITY_REPLAY",
        "cases": len(cases),
        "range": "3<=N<=6",
        "cases_detail": cases,
        "all_order_proof": (
            "PSD determinant stability, two disjoint finite-symbol contractions "
            "1-u*d_a*d_b, real specialization, and endpoint principal-minor identities."
        ),
        "remaining_gap": (
            "Prove same-half-plane stability of every fixed total-degree antidiagonal "
            "for this specific kernel; generic homogeneous-component closure is not used."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
