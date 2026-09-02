"""Exact replay for the odd path-block Gegenbauer interlacing proof.

This is an independent companion to
ODD_PATH_BLOCK_GEGENBAUER_PROOF_2026-08-10.md.  It does not edit the master
research notebook.  All structural checks are exact over ZZ/QQ.
"""

from __future__ import annotations

import json
from math import comb, factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "odd_path_block_gegenbauer_exact_20260810.json"


def chebyshev_u_poly(n: int, t: sp.Symbol) -> sp.Poly:
    if n == 0:
        return sp.Poly(1, t, domain=sp.ZZ)
    if n == 1:
        return sp.Poly(2 * t, t, domain=sp.ZZ)
    u0 = sp.Poly(1, t, domain=sp.ZZ)
    u1 = sp.Poly(2 * t, t, domain=sp.ZZ)
    for _ in range(2, n + 1):
        u0, u1 = u1, sp.Poly(2 * t * u1.as_expr() - u0.as_expr(), t)
    return u1


def block(n: int, s: int, x: sp.Symbol) -> sp.Poly:
    expr = sum(
        (-1) ** i
        * sp.factorial(s)
        / sp.factorial(s - i)
        * sp.binomial(n - i, i)
        * (x / 4) ** i
        for i in range(s + 1)
    )
    return sp.Poly(expr, x, domain=sp.QQ)


def strictly_prec(p: sp.Poly, q: sp.Poly) -> bool:
    """Check p_1 < q_1 < ... < p_s < q_s by exact root intervals."""
    pi = p.intervals(eps=sp.Rational(1, 10**30))
    qi = q.intervals(eps=sp.Rational(1, 10**30))
    if len(pi) != p.degree() or len(qi) != q.degree():
        return False
    if any(mult != 1 for _, mult in pi + qi):
        return False
    intervals = []
    for iv, _ in pi:
        intervals.append((iv, "p"))
    for iv, _ in qi:
        intervals.append((iv, "q"))
    intervals.sort(key=lambda item: item[0][0])
    for (left, _), (right, _) in zip(intervals, intervals[1:]):
        if not left[1] < right[0]:
            return False
    return [tag for _, tag in intervals] == [tag for _ in range(p.degree()) for tag in ("p", "q")]


def main() -> None:
    s, lam, t, w = sp.symbols("s lam t w")
    D = 1 - 2 * t * w + w**2

    # Generating-function proof of
    # 4(t+1)^2 C_{s-2}^lam + 4(t+1)C_{s-1}^{lam-1}
    # + C_s^{lam-2} = sum_{j=0}^4 binom(4,j)C_{s-j}^lam.
    gf_residual = sp.expand(
        4 * (t + 1) ** 2 * w**2 + 4 * (t + 1) * w * D + D**2 - (1 + w) ** 4
    )
    assert gf_residual == 0

    # At a zero of C_s^lam, express C_{s-j}/C_{s-1} by the recurrence.
    r2 = 2 * (s + lam - 1) * t / (s + 2 * lam - 2)
    r3 = (2 * (s + lam - 2) * t * r2 - (s - 1)) / (s + 2 * lam - 3)
    r4 = (2 * (s + lam - 3) * t * r3 - (s - 2) * r2) / (s + 2 * lam - 4)
    phi = sp.factor(4 + 6 * r2 + 4 * r3 + r4)
    phi_num, phi_den = map(sp.factor, sp.together(phi).as_numer_denom())
    expected_den = (2 * lam + s - 4) * (2 * lam + s - 3) * (2 * lam + s - 2)
    assert sp.factor(phi_den - expected_den) == 0

    p, h, u = sp.symbols("p h u")
    positive_num = sp.Poly(
        sp.expand(phi_num.subs({s: p + 2, lam: p + h + 7, t: u - 1})),
        h,
        p,
        u,
        domain=sp.ZZ,
    )
    assert positive_num.total_degree() == 6
    assert len(positive_num.terms()) == 38
    assert all(coef > 0 for _, coef in positive_num.terms())

    x, y = sp.symbols("x y")
    cases = []
    derivative_checks = 0
    block_checks = 0
    laguerre_checks = 0
    interlacing_checks = 0

    for ss in range(2, 13):
        for excess in (0, 1, 5, 17):
            N = 2 * ss + 4 + excess
            nn = 2 * N + 1
            mm = N - ss
            ll = mm + 1

            chi = sp.Poly(
                chebyshev_u_poly(N, t).as_expr().subs(t, (y - 2) / 2),
                y,
                domain=sp.ZZ,
            )
            chi_small = sp.Poly(
                chebyshev_u_poly(N - 2, t).as_expr().subs(t, (y - 2) / 2),
                y,
                domain=sp.ZZ,
            )
            padded = sp.Poly(y**2 * chi_small.as_expr(), y, domain=sp.ZZ)

            dchi = sp.expand(sp.diff(chi.as_expr(), y, mm) / sp.factorial(mm))
            dpadded = sp.expand(sp.diff(padded.as_expr(), y, mm) / sp.factorial(mm))
            gegen = sp.gegenbauer(ss, ll, (y - 2) / 2)
            hsum = sum(
                sp.binomial(4, j) * sp.gegenbauer(ss - j, ll, (y - 2) / 2)
                for j in range(5)
                if ss - j >= 0
            )
            assert sp.Poly(dchi - gegen, y, domain=sp.QQ).is_zero
            assert sp.Poly(dpadded - hsum, y, domain=sp.QQ).is_zero
            derivative_checks += 2

            # Normalized derivative -> reciprocal -> falling-factorial
            # multiplier gives precisely the path block.
            norm = sp.Rational(factorial(ss), factorial(N))
            for source, nblock in ((chi, nn), (padded, nn - 4)):
                dnorm = sp.Poly(norm * sp.diff(source.as_expr(), y, mm), y, domain=sp.QQ)
                reciprocal = sp.Poly(sp.expand(x**ss * dnorm.as_expr().subs(y, 1 / x)), x)
                scaled = sp.Poly(reciprocal.as_expr().subs(x, x / 4), x, domain=sp.QQ)
                multiplied = sp.Poly(
                    sum(
                        scaled.nth(i)
                        * (factorial(N) // factorial(N - i))
                        * x**i
                        for i in range(ss + 1)
                    ),
                    x,
                    domain=sp.QQ,
                )
                assert multiplied == block(nblock, ss, x)
                block_checks += 1

            multiplier_poly = sp.Poly(
                sum(
                    (-1) ** i
                    * comb(ss, i)
                    * (factorial(N) // factorial(N - i))
                    * x**i
                    for i in range(ss + 1)
                ),
                x,
                domain=sp.ZZ,
            )
            laguerre_form = sp.Poly(
                sp.factorial(ss)
                * (-x) ** ss
                * sp.assoc_laguerre(ss, N - ss, 1 / x),
                x,
                domain=sp.ZZ,
            )
            assert multiplier_poly == laguerre_form
            laguerre_checks += 1

            bn = block(nn, ss, x)
            bn4 = block(nn - 4, ss, x)
            assert strictly_prec(bn, bn4)
            interlacing_checks += 1
            cases.append({"s": ss, "N": N, "n": nn, "lambda": ll, "excess": excess})

    report = {
        "status": "PASS_EXACT_ODD_PATH_BLOCK_GEGENBAUER_REPLAY",
        "theorem_status": (
            "all-order strict directed block interlacing B_(n,s) prec B_(n-4,s) "
            "for odd n and n>=4s+9"
        ),
        "generic_identities": {
            "gegenbauer_generating_function_residual": str(gf_residual),
            "phi_denominator": str(expected_den),
            "positive_phi_numerator_term_count": len(positive_num.terms()),
            "positive_phi_numerator_min_coefficient": min(
                int(coef) for _, coef in positive_num.terms()
            ),
        },
        "exact_finite_replay": {
            "cases": len(cases),
            "derivative_identities": derivative_checks,
            "block_transform_identities": block_checks,
            "laguerre_multiplier_identities": laguerre_checks,
            "directed_interlacings": interlacing_checks,
            "case_parameters": cases,
        },
        "logical_note": (
            "Finite cases replay the identities and direction.  The all-order proof is the "
            "generic positive-coefficient Phi certificate plus classical Gegenbauer, "
            "Rolle, Laguerre, and strict finite-multiplicative-convolution theorems."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"cases={len(cases)} phi_terms={len(positive_num.terms())}")
    print(REPORT.name)


if __name__ == "__main__":
    main()
