#!/usr/bin/env python3
"""Exact identities for the super-ballot compression.

For

    Tau[a,p] = (2a+1)/(p+1) binom(2a,a) binom(2p-2a,p-a),

write A_a=(2a+1)binom(2a,a), c_n=binom(2n,n), and let U_c be
the upper Toeplitz matrix with entries c_(p-a).  Then

    Tau = diag(A_a) U_c diag(1/(p+1)).

Since sum c_n z^n=(1-4z)^(-1/2), its reciprocal coefficients are
s_0=1 and s_n=-2 Catalan_(n-1).  This gives a closed inverse of Tau.

The same triangle maps the beta-moment vector
w_a(y)=1/((y+a+3)(y+a+4)) to

    (Tau^T w(y))_p = 4^p (y+7/2)_p/(y+3)_(p+2).

The latter identity follows in all orders from Pfaff--Saalschutz.  The
finite symbolic checks here provide a replayable audit of the formulas.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import super_ballot


OUT = Path("bottom_super_ballot_inverse_moment_certificate_20260803.json")
Y = sp.symbols("y")


def central_binomial(index: int) -> sp.Integer:
    return sp.binomial(2 * index, index)


def row_scale(index: int) -> sp.Integer:
    return (2 * index + 1) * central_binomial(index)


def reciprocal_coefficient(index: int) -> sp.Integer:
    if index == 0:
        return sp.Integer(1)
    return -2 * sp.catalan(index - 1)


def closed_inverse(size: int) -> sp.Matrix:
    return sp.Matrix(
        size,
        size,
        lambda row, column: (
            (row + 1) * reciprocal_coefficient(column - row) / row_scale(column)
            if row <= column
            else 0
        ),
    )


def main() -> None:
    factorization_entry_checks = 0
    inverse_entry_checks = 0
    moment_identity_checks = 0
    adjacent_crossing_checks = 0

    for size in range(1, 61):
        ballot = super_ballot(size)
        toeplitz = sp.Matrix(
            size,
            size,
            lambda row, column: (
                central_binomial(column - row) if row <= column else 0
            ),
        )
        factored = (
            sp.diag(*[row_scale(row) for row in range(size)])
            * toeplitz
            * sp.diag(*[sp.Rational(1, column + 1) for column in range(size)])
        )
        assert ballot == factored
        factorization_entry_checks += size * size

        inverse = closed_inverse(size)
        assert ballot * inverse == sp.eye(size)
        assert inverse * ballot == sp.eye(size)
        inverse_entry_checks += 2 * size * size

        for row in range(1, size):
            assert ballot[row, row - 1] == 0
            assert ballot[row - 1, row - 1] > 0
            adjacent_crossing_checks += 2
            for column in range(row, size):
                difference = sp.factor(ballot[row, column] - ballot[row - 1, column])
                closed = sp.factor(
                    ballot[row - 1, column]
                    * (column + 1)
                    / (row * (2 * (column - row) + 1))
                )
                assert difference == closed
                assert difference > 0
                adjacent_crossing_checks += 2

    # This identity is independent of the truncation size, so audit it by p.
    # The note gives its all-p Pfaff--Saalschutz derivation.
    for column in range(21):
        total = sum(
            sp.Rational(2 * row + 1, column + 1)
            * sp.binomial(2 * row, row)
            * sp.binomial(2 * (column - row), column - row)
            / ((Y + row + 3) * (Y + row + 4))
            for row in range(column + 1)
        )
        closed = 4**column * sp.rf(Y + sp.Rational(7, 2), column) / sp.rf(
            Y + 3, column + 2
        )
        assert sp.cancel(total - closed) == 0
        moment_identity_checks += 1

    report = {
        "kind": "bottom_super_ballot_inverse_moment_certificate",
        "status": "PASS_EXACT_SUPER_BALLOT_INVERSE_MOMENT",
        "size_range_inverse_factorization": [1, 60],
        "column_range_symbolic_moment": [0, 20],
        "factorization_entry_checks": factorization_entry_checks,
        "two_sided_inverse_entry_checks": inverse_entry_checks,
        "adjacent_single_crossing_checks": adjacent_crossing_checks,
        "symbolic_rational_moment_identity_checks": moment_identity_checks,
        "all_order_formulas": {
            "inverse": (
                "Tau^{-1}[a,p]=(a+1)s[p-a]/((2p+1)binom(2p,p)), "
                "where s[0]=1 and s[n]=-2 Catalan(n-1) for n>=1."
            ),
            "moment": (
                "(Tau^T w(y))[p]=4^p (y+7/2)_p/(y+3)_(p+2), "
                "w_a(y)=1/((y+a+3)(y+a+4))."
            ),
            "adjacent_crossing": (
                "Tau[a,p]-Tau[a-1,p]=Tau[a-1,p](p+1)/"
                "(a(2(p-a)+1))>0 for p>=a, with the sole negative "
                "entry -Tau[a-1,a-1] at p=a-1."
            ),
        },
        "scope": (
            "The displayed identities have direct generating-function, "
            "Pfaff--Saalschutz, and algebraic proofs for all indices. The "
            "finite exact ranges are replayable audits. They reduce but do "
            "not prove the remaining weighted-tail inequality or higher-order TP."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
