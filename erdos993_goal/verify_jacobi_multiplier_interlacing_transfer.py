#!/usr/bin/env python3
"""Exact identities behind the Jacobi-to-2F2 interlacing transfer.

For alpha,beta>-1 and c>0, let

  J_n(x) = 2F1(-n,n+alpha+beta+1;alpha+1;x),
  H_n(x) = 2F2(-n,n+alpha+beta+1;alpha+1,c;x).

The diagonal operator T_c(x^k)=x^k/(c)_k satisfies H_n=T_c J_n.
Its exponential generating function is 0F1(;c;z), whose zeros are all
negative because it is a rescaled Bessel I_{c-1}.  Thus T_c is a classical
Pólya-Schur multiplier sequence.  Applying T_c to every real linear
combination of the consecutive Jacobi pair transfers their interlacing to
H_n,H_(n-1) by Hermite-Kakeya-Obreschkoff.

The script certifies the algebraic identities for the three fixed-defect
families used in the Erdos-993 endpoint reduction.  The Pólya-Schur and HKO
steps are theorem invocations, recorded explicitly in the output.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


X = sp.symbols("X")
OUT = Path("jacobi_multiplier_interlacing_transfer_certificate_20260802.json")


def terminating_hypergeometric(
    n: int, upper: list[sp.Expr], lower: list[sp.Expr]
) -> sp.Expr:
    return sp.expand(
        sum(
            sp.prod(sp.rf(a, k) for a in upper)
            / sp.prod(sp.rf(b, k) for b in lower)
            * X**k
            / sp.factorial(k)
            for k in range(n + 1)
        )
    )


def multiplier(poly: sp.Expr, c: sp.Expr) -> sp.Expr:
    return sp.expand(
        sum(
            sp.Poly(poly, X).nth(k) * X**k / sp.rf(c, k)
            for k in range(sp.degree(poly, X) + 1)
        )
    )


def main() -> None:
    families = {
        "defect1": {
            "alpha": sp.Rational(1, 2),
            "beta": sp.Rational(1, 2),
            "c": sp.Integer(2),
        },
        "defect3": {
            "alpha": sp.Rational(1, 2),
            "beta": sp.Rational(1, 2),
            "c": sp.Integer(3),
        },
        "defect4": {
            "alpha": sp.Rational(-1, 2),
            "beta": sp.Rational(1, 2),
            "c": sp.Integer(3),
        },
    }

    records = []
    for name, pars in families.items():
        alpha = pars["alpha"]
        beta = pars["beta"]
        c = pars["c"]
        for n in range(0, 41):
            jacobi = terminating_hypergeometric(
                n,
                [-n, n + alpha + beta + 1],
                [alpha + 1],
            )
            transformed = multiplier(jacobi, c)
            target = terminating_hypergeometric(
                n,
                [-n, n + alpha + beta + 1],
                [alpha + 1, c],
            )
            assert sp.expand(transformed - target) == 0
            records.append({"family": name, "degree": n, "identity": True})

    report = {
        "kind": "jacobi_multiplier_interlacing_transfer_certificate",
        "date": "2026-08-02",
        "status": "PASS_EXACT_IDENTITIES_WITH_THEOREM_TRANSFER",
        "identity_checks": len(records),
        "degree_range": [0, 40],
        "families": {
            name: {key: str(value) for key, value in pars.items()}
            for name, pars in families.items()
        },
        "operator": "T_c(X^k)=X^k/(c)_k",
        "polya_schur_symbol": (
            "sum_{k>=0} z^k/((c)_k k!) = 0F1(;c;z) "
            "= Gamma(c) z^((1-c)/2) I_(c-1)(2 sqrt(z))"
        ),
        "symbol_zeros": "-j_(c-1,k)^2/4, hence all real and negative for c>0",
        "theorem_chain": [
            "Consecutive Jacobi polynomials interlace for alpha,beta>-1.",
            "HKO: every real linear combination of an interlacing pair is real-rooted.",
            "Polya-Schur: T_c preserves real-rootedness because 0F1(;c;z) is Laguerre-Polya.",
            "HKO again: T_c(J_n) and T_c(J_(n-1)) interlace.",
        ],
        "conclusion": (
            "The nonzero 2F2 factors in fixed defects 1, 3, and 4 "
            "interlace in consecutive degree for every admissible degree."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "identity_checks": report["identity_checks"],
                "output": str(OUT.resolve()),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
