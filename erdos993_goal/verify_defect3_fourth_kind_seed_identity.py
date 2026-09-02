#!/usr/bin/env python3
"""Exact fourth-kind Chebyshev form of the defect-three sum seed.

For n=N-2 and W_n the Chebyshev polynomial of the fourth kind,

  g_N+g_{N-1} = X^2/2 * T_3[W_n(1+X/2)],

where T_3(X^k)=X^k/(3)_k.  This exposes the actual aligned rank-one
eigenvalue seed as a Laguerre multiplier image of an explicitly rooted
path polynomial.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import (
    X,
    hypergeometric_form,
    terminating_2f2,
)


OUT = Path("defect3_fourth_kind_seed_identity_certificate_20260802.json")
Z = sp.symbols("Z")


def fourth_kind(n: int, variable: sp.Expr) -> sp.Expr:
    """W_n with W_0=1, W_1=2x+1."""
    if n == 0:
        return sp.Integer(1)
    previous, current = sp.Integer(1), 2*variable+1
    for _ in range(2, n+1):
        previous, current = current, sp.expand(2*variable*current-previous)
    return sp.expand(current)


def T3(poly: sp.Expr) -> sp.Expr:
    source = sp.Poly(sp.expand(poly), X)
    return sp.expand(sum(
        source.nth(k)*X**k/sp.rf(3, k)
        for k in range(source.degree()+1)
    ))


def main() -> None:
    checks = []
    recurrence_checks = 0
    for N in range(3, 61):
        n = N-2
        L = 2*N-3
        g = hypergeometric_form(N, 3)
        h = hypergeometric_form(N-1, 3)
        a = sp.expand(g+h)

        contiguous = sp.expand(
            sp.Rational(L, 2)*X**2
            * terminating_2f2(n, n+1, sp.Rational(3, 2), 3)
        )
        W = fourth_kind(n, 1+X/2)
        transformed = sp.expand(X**2*T3(W)/2)
        assert sp.expand(a-contiguous) == 0
        assert sp.expand(a-transformed) == 0

        # The classical identity before T_3 is
        # W_n(1+X/2)=L*2F1(-n,n+1;3/2;-X/4).
        two_f_one = sp.expand(sum(
            sp.rf(-n, k)*sp.rf(n+1, k)
            / (sp.rf(sp.Rational(3, 2), k)*sp.factorial(k))
            * (-X/4)**k
            for k in range(n+1)
        ))
        assert sp.expand(W-L*two_f_one) == 0

        # The displayed hypergeometric normalization has leading coefficient
        # 1/N!.  Multiplication by N! is the monic normalization used in the
        # rank-one lift.
        ap = sp.Poly(sp.factorial(N)*a, X)
        assert ap.LC() == 1
        assert ap.nth(N-1) == N*L
        checks.append(N)

        if n >= 2:
            W0 = fourth_kind(n, Z)
            W1 = fourth_kind(n-1, Z)
            W2 = fourth_kind(n-2, Z)
            assert sp.expand(W0-2*Z*W1+W2) == 0
            recurrence_checks += 1

    report = {
        "kind": "defect3_fourth_kind_seed_identity",
        "date": "2026-08-02",
        "status": "PASS_EXACT_FOURTH_KIND_IDENTITY",
        "notation": (
            "n=N-2, L=2N-3, T3(X^k)=X^k/(3)_k; the displayed "
            "a_N has leading coefficient 1/N!, and N!a_N is monic"
        ),
        "contiguous_identity": (
            "g_N(defect3)+g_(N-1)(defect3)="
            "(L/2)X^2 2F2(-n,n+1;3/2,3;-X/4)"
        ),
        "fourth_kind_identity": (
            "a_N=X^2/2*T3[W_n(1+X/2)], "
            "W_n(cos theta)=sin((n+1/2)theta)/sin(theta/2)"
        ),
        "explicit_preimage_roots": (
            "X_k=2(cos(2*pi*k/(2n+1))-1)="
            "-4 sin^2(pi*k/(2n+1)), 1<=k<=n"
        ),
        "exact_N_range": [checks[0], checks[-1]],
        "identity_cases": len(checks),
        "recurrence_checks": recurrence_checks,
        "significance": (
            "The actual normalized deletion-contraction seed is the T3 "
            "multiplier image of an explicitly rooted fourth-kind/path "
            "polynomial, a possible route to an interlacing-family proof."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "identity_cases": len(checks),
        "output": str(OUT.resolve()),
    }, indent=2))


if __name__ == "__main__":
    main()
