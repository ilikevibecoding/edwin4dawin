#!/usr/bin/env python3
"""Exact finite replay of the four-vertex vertical-separator reduction."""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "codim2_mixed_vertical_separator_exact_20260810.json"
z = sp.symbols("z")


def q(n: int, i: int) -> int:
    return comb(n - i, i) if 0 <= i <= n // 2 else 0


def F(n: int, m: int, s: int) -> sp.Poly:
    return sp.Poly(sum(q(n, i) * q(m, s - i) * z**i
                          for i in range(s + 1)), z, domain=sp.QQ)


def intervals_allow_zero(poly: sp.Poly):
    data = poly.intervals(eps=sp.Rational(1, 10**30))
    assert sum(mult for _, mult in data) == poly.degree()
    assert all(mult == 1 for _, mult in data)
    return [ab for ab, _ in data]


def strict_alt_allow_zero(p: sp.Poly, qpoly: sp.Poly) -> bool:
    tagged = [(a, b, 0) for a, b in intervals_allow_zero(p)]
    tagged += [(a, b, 1) for a, b in intervals_allow_zero(qpoly)]
    tagged.sort(key=lambda item: item[0])
    assert all(tagged[j][1] < tagged[j + 1][0]
               for j in range(len(tagged) - 1))
    return all(tagged[j][2] != tagged[j + 1][2]
               for j in range(len(tagged) - 1))


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    cases = 0
    algebraic_signs = 0
    max_numeric_ratio = 0.0
    for s in range(2, 13):
        for excess in (0, 3):
            n = 4 * s + 9 + 2 * excess
            # Both orientations are needed.  m=n proves the mixed slice
            # interlaces the large diagonal; m=n-4 and reciprocal reflection
            # prove that it interlaces the small diagonal.
            for m in (n, n - 4):
                A = F(n, m, s)
                C = F(n - 4, m, s)
                lower = F(n, m, s - 1)
                V = sp.Poly(z * lower.as_expr(), z)
                H = sp.Poly(sum(F(n - j, m, s - 1).as_expr()
                                for j in range(2, 6)), z)
                assert sp.expand(A.as_expr() - C.as_expr() - z * H.as_expr()) == 0
                assert strict_alt_allow_zero(A, V)
                assert strict_alt_allow_zero(C, V)

                # Exact sign retention at every nonzero separator root.
                for idx in range(lower.degree()):
                    xi = sp.CRootOf(lower, idx)
                    prod = A.as_expr().subs(z, xi) * C.as_expr().subs(z, xi)
                    assert sp.ask(sp.Q.positive(prod)) is True
                    algebraic_signs += 1
                    ratio = abs(complex(sp.N(
                        xi * H.as_expr().subs(z, xi) /
                        A.as_expr().subs(z, xi), 40
                    )).real)
                    assert ratio < 1.0
                    max_numeric_ratio = max(max_numeric_ratio, ratio)
                cases += 1

    payload = {
        "status": "PASS_EXACT_CODIM2_VERTICAL_SEPARATOR_REDUCTION_REPLAY",
        "cases": cases,
        "exact_algebraic_sign_retention_checks": algebraic_signs,
        "range": "2<=s<=12, n=4s+9+2e, e in {0,3}, m in {n,n-4}",
        "max_numeric_ratio_companion": max_numeric_ratio,
        "remaining_all_order_target": (
            "At every negative root xi of F_(n,m,s-1), prove "
            "0 < xi*sum_(j=2)^5 F_(n-j,m,s-1)(xi)/F_(n,m,s)(xi) < 1."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    payload["source_sha256"] = sha(Path(__file__).resolve())
    payload["report_sha256"] = sha(REPORT)
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
