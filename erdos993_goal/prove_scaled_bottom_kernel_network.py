#!/usr/bin/env python3
"""Certificate for the all-order scaled-binomial extension of the bottom network.

The proof itself is algebraic: the two rectangular factors were already
proved TN in the bottom theorem.  This script replays the new middle-matrix
identity, its positive weights on 0<=t<=1, the universal Q^2 nesting
identity, and finite independent Schur-tail audits at the needed t=1/2.
"""

from __future__ import annotations

import json
from fractions import Fraction as F
from itertools import combinations
from math import comb
from pathlib import Path

import sympy as sp

from fast_bottom_forward import catalan, eye, matmul
from probe_group_catalan_square_core import matrix, schur_tail


OUT = Path("scaled_bottom_kernel_network_proof_20260803.json")


def diagonal(values):
    size = len(values)
    return [[values[i] if i == j else F(0) for j in range(size)] for i in range(size)]


def add(*matrices):
    return [
        [sum(matrix[i][j] for matrix in matrices) for j in range(len(matrices[0][0]))]
        for i in range(len(matrices[0]))
    ]


def scale(value, matrix):
    return [[value * entry for entry in row] for row in matrix]


def binomial_antidiagonal(order: int, limit: int) -> sp.Matrix:
    out = sp.zeros(limit + 1, limit + 1)
    for row in range(limit + 1):
        column = order - row
        if 0 <= column <= limit:
            out[row, column] = sp.binomial(order, row)
    return out


def catalan_u_toeplitz(limit: int) -> sp.Matrix:
    # U(z)=z*C(z)^2 has [z^k]U=C_k for k>=1.
    return sp.Matrix(
        limit + 1,
        limit + 1,
        lambda row, column: sp.catalan(row - column) if row > column else 0,
    )


def minor_audit_strict_positive(matrix_: sp.Matrix) -> int:
    count = 0
    for order in range(1, matrix_.rows + 1):
        for rows in combinations(range(matrix_.rows), order):
            for columns in combinations(range(matrix_.cols), order):
                assert matrix_.extract(rows, columns).det() > 0
                count += 1
    return count


def main() -> None:
    middle_identity_checks = 0
    positive_weight_checks = 0
    for q in range(1, 41):
        d = q + 1
        r = [
            [
                F((-1) ** (j - i) * catalan(j - i + 1)) if j >= i else F(0)
                for j in range(q)
            ]
            for i in range(q)
        ]
        ident = eye(q)
        p = [[ident[i][j] - r[i][j] for j in range(q)] for i in range(q)]
        d0_values = [F(1, comb(d - 2, i)) for i in range(q)]
        d1_values = [F(1, comb(d, i + 1)) for i in range(q)]
        d0, d1 = diagonal(d0_values), diagonal(d1_values)

        # Compare constant and linear coefficients in t.
        lhs_constant = d0
        lhs_linear = scale(F(-1), matmul(matmul(r, d1), r))
        rhs_constant = d0
        rhs_linear = add(
            scale(F(-1), d1),
            matmul(matmul(p, d1), r),
            matmul(d1, p),
        )
        assert lhs_constant == rhs_constant
        assert lhs_linear == rhs_linear
        middle_identity_checks += 2 * q * q

        # D0-tD1 is positive throughout 0<=t<=1 because D0-D1>0.
        for a, b in zip(d0_values, d1_values):
            assert a > b > 0
            positive_weight_checks += 2

    # Universal nesting: A2_d=B_d+T_U(-B_(d-2)-A1_(d-2))T_U^T.
    nesting_checks = 0
    for d in range(5, 21):
        for extra in range(6):
            limit = d + extra
            toeplitz = catalan_u_toeplitz(limit)
            first = binomial_antidiagonal(d, limit)
            middle = -binomial_antidiagonal(d - 2, limit) - sp.Matrix(
                matrix(d - 2, power=1, limit=limit)
            )
            recovered = first + toeplitz * middle * toeplitz.T
            actual = sp.Matrix(matrix(d, power=2, limit=limit))
            assert recovered == actual
            nesting_checks += (limit + 1) ** 2

    # At t=1/2, scaling by 2 gives B+A1.  Its reversed negative Schur
    # tail is independently STP in every exhaustively tractable size here.
    schur_minor_checks = 0
    schur_records = []
    for m in range(1, 8):
        d = 2 * m + 5
        order = d - 2
        limit = 3 * m + 4
        plus_kernel = binomial_antidiagonal(order, limit) + sp.Matrix(
            matrix(order, power=1, limit=limit)
        )
        residual = -schur_tail(plus_kernel, order)[:, ::-1]
        local = minor_audit_strict_positive(residual)
        schur_minor_checks += local
        schur_records.append({"m": m, "size": m + 1, "positive_minors": local})

    report = {
        "status": "PASS_SCALED_BOTTOM_NETWORK_AND_Q2_NESTING",
        "all_order_middle_identity": (
            "D0-t R D1 R=(D0-t D1)+t P D1 R+t D1 P"
        ),
        "parameter_range": "0<=t<=1",
        "needed_middle_specialization": "t=1/2, equivalently B+A1 after scaling",
        "middle_identity_entry_checks_q_le_40": middle_identity_checks,
        "positive_diagonal_weight_checks_q_le_40": positive_weight_checks,
        "universal_q2_nesting_identity_checks": nesting_checks,
        "finite_positive_schur_minor_checks_m_le_7": schur_minor_checks,
        "schur_records": schur_records,
        "scope": (
            "The middle identity and positivity argument are all-order formulas; "
            "combined with the already-proved TN rectangular factors they prove "
            "the scaled bottom kernel for 0<=t<=1.  The Q2 nesting identity is "
            "also all-order by formal series multiplication.  The listed Schur "
            "minor enumeration is an independent finite audit."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "schur_records"}, indent=2))


if __name__ == "__main__":
    main()
