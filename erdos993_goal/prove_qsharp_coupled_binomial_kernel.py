#!/usr/bin/env python3
"""Exact replay for the single coupled binomial kernel in Q-sharp."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_lower_qsharp_reduction import (
    gamma_to_palindromic,
    qsharp_binary,
    selector_gamma,
)


HERE = Path(__file__).resolve().parent
OUT = HERE / "qsharp_coupled_binomial_kernel_exact_20260810.json"
z = sp.symbols("z")


def main() -> None:
    legendre_checks = 0
    root_checks = 0
    for P in range(1, 41):
        kernel = sp.Poly(sum(sp.binomial(P, j) ** 2 * z**j for j in range(P + 1)), z)
        transformed = sp.Poly(
            sp.cancel((1 - z) ** P * sp.legendre(P, (1 + z) / (1 - z))),
            z,
        )
        assert kernel == transformed
        assert sp.gcd(kernel, kernel.diff()).degree() == 0
        assert kernel.count_roots(-sp.oo, 0) == P
        legendre_checks += 1
        root_checks += P

    coefficient_checks = 0
    cases = 0
    for d in range(5, 13):
        for r in range(d - 4):
            N = d + r
            for s in range(r + 1, N + r + 1):
                P = d + s
                gamma = selector_gamma(N, s)
                pre = gamma_to_palindromic(gamma, P)
                coupled = [sp.binomial(P, j) * pre[j] for j in range(P + 1)]
                assert coupled == qsharp_binary(P, gamma)
                coefficient_checks += P + 1
                cases += 1

    # Generic multivariate total-degree lift is not a preserver.  For P=2,
    # f=(x+1)(y-1) is stable, while degree scaling [1,2,1] gives g below.
    x, y = sp.symbols("x y")
    f = sp.expand((x + 1) * (y - 1))
    g = x * y - 2 * x + 2 * y - 1
    rayleigh = sp.expand(sp.diff(g, x) * sp.diff(g, y) - g * sp.diff(g, x, y))
    assert f == x * y - x + y - 1
    assert rayleigh == -3

    report = {
        "status": "PASS",
        "single_kernel": "lambda_j=binom(P,j)",
        "finite_symbol": "J_P(z)=sum_j binom(P,j)^2 z^j",
        "legendre_identity": (
            "J_P(z)=(1-z)^P Legendre_P((1+z)/(1-z)); its P roots are simple and negative"
        ),
        "valid_operator": (
            "On symmetric multiaffine f=sum c_j e_j, B_P f=sum binom(P,j)c_j e_j "
            "preserves stability by diagonal finite Polya-Schur plus polarization."
        ),
        "generic_lift_nogo": (
            "The same total-degree scaling on arbitrary multiaffine polynomials is not "
            "a preserver: at P=2, (x+1)(y-1) maps to xy-2x+2y-1 with Rayleigh -3."
        ),
        "generic_lift_rayleigh": int(rayleigh),
        "legendre_identity_checks": legendre_checks,
        "negative_root_checks": root_checks,
        "qsharp_cases": cases,
        "qsharp_coefficient_checks": coefficient_checks,
        "remaining_lemma": (
            "Realize the all-grade path/raw-selector expression as a jointly stable, "
            "symmetric P-choice-slot ordered-partition parent and apply B_P before the "
            "fixed-s projection."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "PASS", "report": str(OUT)}))


if __name__ == "__main__":
    main()
