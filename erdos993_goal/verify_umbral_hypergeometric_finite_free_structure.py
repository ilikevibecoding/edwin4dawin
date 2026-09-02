#!/usr/bin/env python3
"""Exact hypergeometric form of the fixed-defect umbral Laguerre seeds.

The formulas expose each nonzero factor as a 2F2 polynomial which, up to
normalization, is the degree-n multiplicative finite-free convolution of a
Jacobi polynomial and a Laguerre polynomial.  The script also records exact
root-isolation evidence for the consecutive-degree interlacing used by the
transformed endpoint kernels.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from verify_group_reserve_reverse_borel_laguerre_identity import X, laguerre_seed


OUT = Path("umbral_hypergeometric_finite_free_structure_certificate_20260802.json")


def umbral(poly: sp.Expr) -> sp.Expr:
    return sp.expand(
        sum(
            X**k / sp.factorial(k) * sp.diff(poly, X, 2 * k)
            for k in range(sp.degree(poly, X) // 2 + 1)
        )
    )


def terminating_2f2(n: int, a: int, b: sp.Rational, c: int) -> sp.Expr:
    return sp.expand(
        sum(
            sp.rf(-n, k)
            * sp.rf(a, k)
            / (sp.rf(b, k) * sp.rf(c, k))
            * (-X / 4) ** k
            / sp.factorial(k)
            for k in range(n + 1)
        )
    )


def hypergeometric_form(N: int, defect: int) -> sp.Expr:
    if defect == 1:
        n = N - 1
        return sp.expand(
            N * X * terminating_2f2(n, n + 2, sp.Rational(3, 2), 2)
        )
    if defect == 3:
        n = N - 2
        return sp.expand(
            sp.Rational(N - 1, 2)
            * X**2
            * terminating_2f2(n, n + 2, sp.Rational(3, 2), 3)
        )
    if defect == 4:
        n = N - 2
        return sp.expand(
            sp.Rational(1, 2)
            * X**2
            * terminating_2f2(n, n + 1, sp.Rational(1, 2), 3)
        )
    raise ValueError(defect)


def cleared_flint(poly: sp.Poly) -> fmpz_poly:
    denominator = sp.ilcm(*[sp.denom(value) for value in poly.all_coeffs()])
    return fmpz_poly(
        [int(poly.nth(k) * denominator) for k in range(poly.degree() + 1)]
    )


def real_midpoints(poly: sp.Poly) -> list[float]:
    roots = []
    for root, multiplicity in cleared_flint(poly).complex_roots():
        if not root.imag.is_zero():
            continue
        roots.extend([float(root.real)] * multiplicity)
    return sorted(roots)


def alternating_without_zero(first: list[float], second: list[float]) -> bool:
    merged = sorted(
        [(value, "first") for value in first if abs(value) > 1e-18]
        + [(value, "second") for value in second if abs(value) > 1e-18]
    )
    return all(merged[k][1] != merged[k + 1][1] for k in range(len(merged) - 1))


def main() -> None:
    ctx.prec = 160
    identity_cases = 0
    for defect in (1, 3, 4):
        for N in range(max(defect, 2), 18):
            direct = umbral(laguerre_seed(N, N - defect, X))
            assert sp.expand(direct - hypergeometric_form(N, defect)) == 0
            identity_cases += 1

    interlacing_records = []
    for defect in (1, 3, 4):
        zero_power = (defect + 1) // 2
        for N in range(max(defect + 1, 4), 31):
            current = sp.Poly(
                sp.cancel(hypergeometric_form(N, defect) / X**zero_power), X
            )
            previous = sp.Poly(
                sp.cancel(
                    X * hypergeometric_form(N - 1, defect) / X**zero_power
                ),
                X,
            )
            current_roots = real_midpoints(current)
            previous_roots = real_midpoints(previous)
            passed = (
                len(current_roots) == current.degree()
                and len(previous_roots) == previous.degree()
                and all(root < 0 for root in current_roots)
                and all(root <= 0 for root in previous_roots)
                and alternating_without_zero(current_roots, previous_roots)
            )
            assert passed
            interlacing_records.append(
                {
                    "defect": defect,
                    "N": N,
                    "degree": current.degree(),
                    "passed_certified_root_isolation": True,
                }
            )

    report = {
        "kind": "umbral_hypergeometric_finite_free_structure_certificate",
        "date": "2026-08-02",
        "status": "PASS_EXACT_IDENTITIES_AND_FINITE_ROOT_ISOLATION",
        "identity_cases": identity_cases,
        "forms": {
            "defect1": "N X * 2F2(-(N-1),N+1;3/2,2;-X/4)",
            "defect3": "(N-1)X^2/2 * 2F2(-(N-2),N;3/2,3;-X/4)",
            "defect4": "X^2/2 * 2F2(-(N-2),N-1;1/2,3;-X/4)",
        },
        "finite_free_factorization": {
            "defect1": "Jacobi(alpha=1/2,beta=1/2) boxtimes Laguerre(alpha=1)",
            "defect3": "Jacobi(alpha=1/2,beta=1/2) boxtimes Laguerre(alpha=2)",
            "defect4": "Jacobi(alpha=-1/2,beta=1/2) boxtimes Laguerre(alpha=2)",
        },
        "interlacing_range": [4, 30],
        "interlacing_cases": len(interlacing_records),
        "interlacing_records": interlacing_records,
        "warning": (
            "The hypergeometric identities are exact. Published finite-free "
            "convolution theorems prove real-rootedness of the nonzero factors; "
            "the consecutive-degree interlacing here is finite certified evidence."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "identity_cases": identity_cases,
                "interlacing_cases": len(interlacing_records),
                "output": str(OUT.resolve()),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
