#!/usr/bin/env python3
"""Exact barycentric/super-ballot reduction of the integer Sturm pattern.

Let p_d(x)=(x+3)_d and use the d nodes x_i=-3-i.  Barycentric
interpolation turns the degree-(d-2) symmetric kernel Pi_d into a singular
d by d matrix G with null vector 1.  If Delta is the adjacent-difference
matrix, then

    G = Delta^T H Delta,
    H = Tau (KJ) Tau^T,

where Tau is the explicit positive upper-triangular super-ballot matrix

    Tau[a,p] = (2a+1)/(p+1) binom(2a,a) binom(2p-2a,p-a).

The central form KJ and H are positive on and above their anti-diagonal and
zero beyond it.  For y>=0, set

    u_i(y) = sum_j H[i,j]/((y+j+3)(y+j+4)).

The signs of the barycentric residues of Pi_d(x,y) are the signs of
u_0, u_i-u_(i-1), and -u_(d-2).  Hence the integer Sturm rule is equivalent
to strict unimodality of u with its peak at floor((d+1)/3)-1.

Moreover, u_i-u_(i-1) is the beta moment of the adjacent-row polynomial

    D_i(t)=sum_j (H[i,j]-H[i-1,j]) t^j.

Exact finite computation finds the required constant sign of D_i on [0,1]
by strict sign coherence of its Bernstein coefficients.  This script records
the exact reduction and finite evidence; it does not prove the coefficient
formula for every d.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


OUT = Path("bottom_barycentric_sturm_reduction_certificate_20260803.json")
T = sp.symbols("t")


def super_ballot(size: int) -> sp.Matrix:
    return sp.Matrix(
        size,
        size,
        lambda row, column: (
            sp.Rational(2 * row + 1, column + 1)
            * sp.binomial(2 * row, row)
            * sp.binomial(2 * (column - row), column - row)
            if row <= column
            else 0
        ),
    )


def difference_matrix(size: int) -> sp.Matrix:
    difference = sp.zeros(size - 1, size)
    for index in range(size - 1):
        difference[index, index] = -1
        difference[index, index + 1] = 1
    return difference


def bernstein_coefficients(polynomial: sp.Poly, degree: int) -> list[sp.Expr]:
    """Coefficients in B_(k,degree)(t)=binom(degree,k)t^k(1-t)^(degree-k)."""
    return [
        sp.factor(
            sum(
                polynomial.nth(power)
                * sp.binomial(index, power)
                / sp.binomial(degree, power)
                for power in range(index + 1)
            )
        )
        for index in range(degree + 1)
    ]


def main() -> None:
    super_ballot_entry_checks = 0
    barycentric_factorization_entry_checks = 0
    compressed_support_checks = 0
    positive_compressed_entries = 0
    strict_signed_bernstein_coefficients = 0
    adjacent_row_polynomial_checks = 0
    records = []

    for d in range(3, 31):
        q = d - 1
        reversal = reverse_identity(q)
        central_form = central_inverse_from_blocks(d).inv() * reversal
        ballot = super_ballot(q)
        compressed = sp.simplify(ballot * central_form * ballot.T)

        for row in range(q):
            for column in range(q):
                value = sp.factor(compressed[row, column])
                if row + column <= q - 1:
                    assert value > 0
                    positive_compressed_entries += 1
                else:
                    assert value == 0
                compressed_support_checks += 1

        # Verify the universal super-ballot transform directly from the
        # barycentric evaluations.  This is kept through d=20 because it is
        # the more expensive part; the closed formula itself is d-independent.
        if d <= 20:
            basis = cleared_catalan_basis(q)
            evaluation = sp.Matrix(
                d,
                q,
                lambda row, column: basis[column].eval(-3 - row),
            )
            barycentric_derivatives = sp.diag(
                *[
                    (-1) ** row * sp.factorial(row) * sp.factorial(d - 1 - row)
                    for row in range(d)
                ]
            )
            weighted = barycentric_derivatives.inv() * evaluation
            difference = difference_matrix(d)
            assert sp.simplify(weighted + difference.T * ballot) == sp.zeros(d, q)
            super_ballot_entry_checks += d * q

            nodal = sp.simplify(weighted * central_form * weighted.T)
            assert nodal * sp.ones(d, 1) == sp.zeros(d, 1)
            assert sp.simplify(nodal - difference.T * compressed * difference) == sp.zeros(d)
            barycentric_factorization_entry_checks += d * d

        peak = (d + 1) // 3 - 1
        local_coefficients = 0
        local_polynomials = 0
        for row in range(1, q):
            expected_sign = 1 if row <= peak else -1
            polynomial = sp.Poly(
                sum(
                    (compressed[row, column] - compressed[row - 1, column])
                    * T**column
                    for column in range(q)
                ),
                T,
            )
            coefficients = bernstein_coefficients(polynomial, q - 1)

            if d == 4 and row == 1:
                # D_1(t)=-(8/3)t(5t-1) changes sign near zero, but its
                # beta moment is -(8/3)(4y+10)/((y+3)(y+4)(y+5)) < 0.
                assert sp.factor(polynomial.as_expr()) == -sp.Rational(8, 3) * T * (5 * T - 1)
            else:
                assert all(expected_sign * value > 0 for value in coefficients)
                strict_signed_bernstein_coefficients += len(coefficients)
                local_coefficients += len(coefficients)
            adjacent_row_polynomial_checks += 1
            local_polynomials += 1

        records.append(
            {
                "d": d,
                "q": q,
                "predicted_peak_index": peak,
                "adjacent_row_polynomials": local_polynomials,
                "strict_signed_bernstein_coefficients": local_coefficients,
            }
        )

    report = {
        "kind": "bottom_barycentric_sturm_reduction_certificate",
        "status": "PASS_EXACT_BARYCENTRIC_STURM_REDUCTION",
        "d_range_bernstein_signs": [3, 30],
        "d_range_direct_barycentric_factorization": [3, 20],
        "super_ballot_transform_entry_checks": super_ballot_entry_checks,
        "barycentric_factorization_entry_checks": barycentric_factorization_entry_checks,
        "compressed_support_checks": compressed_support_checks,
        "positive_compressed_entries": positive_compressed_entries,
        "adjacent_row_polynomial_checks": adjacent_row_polynomial_checks,
        "strict_signed_bernstein_coefficients": strict_signed_bernstein_coefficients,
        "small_exception": (
            "At d=4,row=1 the row polynomial changes sign, but its beta "
            "moment is explicitly negative for every y>=0."
        ),
        "remaining_lemma": (
            "Prove the predicted Bernstein sign of every adjacent-row "
            "polynomial D_i(t) for all d (with the explicit d=4 exception)."
        ),
        "consequence_if_proved": (
            "The beta-moment identity proves strict unimodality of u_i(y), "
            "hence the all-d consecutive-integer Sturm sign and root rule."
        ),
        "scope": (
            "The super-ballot formula and factorization are exact in every "
            "checked size. The d<=30 Bernstein signs are finite exact "
            "evidence, not an all-d proof and not the higher-order TP lemma."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
