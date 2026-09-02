#!/usr/bin/env python3
"""Exact identities behind the Wishart-cut interpretation of the endpoint."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_group_reserve_reverse_borel_laguerre_identity import (
    A,
    G,
    T,
    X,
    Y,
    base_family,
    laguerre_seed,
    w,
    z,
)


OUT = Path("wishart_cut_laguerre_identity_certificate_20260802.json")


def wishart_polynomial(n: int, a: int, variable: sp.Symbol) -> sp.Expr:
    return sp.expand(sp.factorial(n) * laguerre_seed(n, a, variable))


def main() -> None:
    checks = []

    wishart_cases = 0
    for n in range(1, 11):
        for a in range(0, 13):
            chi = sp.Poly(wishart_polynomial(n, a, X), X)
            for k in range(n + 1):
                expected = sp.binomial(n, k) * sp.prod(a - j for j in range(k))
                assert chi.coeff_monomial(X ** (n - k)) == expected
            wishart_cases += 1
    checks.append(
        {
            "name": "Gaussian_Wishart_characteristic_coefficients",
            "cases": wishart_cases,
            "passed": True,
        }
    )

    cut_cases = 0
    for n, a, b in ((6, 2, 3), (9, 5, 5), (12, 8, 7), (10, 6, 4)):
        direct = base_family(n, a, b)
        cut_sum = sp.S.Zero
        for k in range(b + 1):
            cut_sum += (
                sp.factorial(b)
                / sp.factorial(n) ** 2
                * sp.binomial(n, k)
                * sp.binomial(n, b - k)
                * wishart_polynomial(n - k, a + k, X)
                * wishart_polynomial(n - b + k, a + b - k, Y)
            )
        assert sp.expand(direct - cut_sum) == 0
        cut_cases += 1
    checks.append(
        {
            "name": "Wishart_cut_binomial_convolution",
            "cases": cut_cases,
            "passed": True,
        }
    )

    uz = z * (1 + z)
    uw = w * (1 + w)
    phi0_z, phi0_w = 1 + z, 1 + w
    phi1_z, phi1_w = z * (1 + z) ** 2, w * (1 + w) ** 2
    phi2_z, phi2_w = z**2 * (1 + z) ** 3, w**2 * (1 + w) ** 3
    rank_four = sp.expand(
        phi2_z * phi0_w
        + phi0_z * phi2_w
        + 2 * phi1_z * phi1_w
        - z * w
    )
    assert sp.expand(G - rank_four) == 0
    assert sp.expand(uz + uw - T) == 0
    checks.append({"name": "G_rank_four_separable_identity", "cases": 1, "passed": True})

    shift_cases = 0
    for n in range(4, 14):
        f = laguerre_seed(n, n - 4, X)
        h0 = sp.expand(f + sp.diff(f, X))
        h1 = sp.expand(sp.diff(f + 2 * sp.diff(f, X) + sp.diff(f, X, 2), X))
        raised3 = sp.expand(f + 3 * sp.diff(f, X) + 3 * sp.diff(f, X, 2) + sp.diff(f, X, 3))
        h2 = sp.expand(sp.diff(raised3, X, 2))
        hm = sp.diff(f, X)
        assert sp.expand(h0 - laguerre_seed(n, n - 3, X)) == 0
        assert sp.expand(h1 - laguerre_seed(n - 1, n - 2, X)) == 0
        assert sp.expand(h2 - laguerre_seed(n - 2, n - 1, X)) == 0
        assert sp.expand(hm - laguerre_seed(n - 1, n - 4, X)) == 0
        assert sp.expand(h1 - X * h2 / (n - 1)) == 0
        shift_cases += 1
    checks.append(
        {
            "name": "fixed_defect_rank_four_Laguerre_shifts",
            "cases": shift_cases,
            "passed": True,
        }
    )

    report = {
        "kind": "wishart_cut_laguerre_identity_certificate",
        "date": "2026-08-02",
        "status": "PASS_EXACT_IDENTITIES",
        "wishart_identity": (
            "n!*P_n^a(X)=E det(X I_n+Z Z^T), Z an n-by-a standard Gaussian matrix"
        ),
        "cut_identity": (
            "B_N^(a,b)=b!/(N!)^2 sum_k C(N,k)C(N,b-k) "
            "chi_(N-k,a+k)(X) chi_(N-b+k,a+b-k)(Y)"
        ),
        "G_rank_four": (
            "G=phi2(z)phi0(w)+phi0(z)phi2(w)+2phi1(z)phi1(w)-zw, "
            "phi0=1+z, phi1=z(1+z)^2, phi2=z^2(1+z)^3"
        ),
        "conclusion": (
            "The complete T^b transform is a weighted two-cut Wishart mixture; "
            "G is a signed rank-four Christoffel correction, not a PSD Gram kernel."
        ),
        "checks": checks,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "checks": checks, "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
