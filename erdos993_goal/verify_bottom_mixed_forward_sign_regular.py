#!/usr/bin/env python3
"""Exact audit of the symmetric mixed-forward-difference reduction.

For q=2m+2, let A contain the first m forward differences at zero of
the cleared beta basis and put T=A K J A^T.  Evaluation of the same basis
at 0,...,m-1 gives the exact factorization

    D = (T J_m) (J_m P_m^T J_m) S,

where D is the actual forward matrix, P_m is Pascal, and S is positive
diagonal (listed in decreasing-node order).  Hence STP of T J_m implies
STP of D.  The script checks the identity and the predicted strict sign
regularity of T exactly over the rationals.
"""

from __future__ import annotations

import json
from fractions import Fraction as F
from itertools import combinations
from math import comb
from pathlib import Path

from fast_bottom_forward import (
    beta_coefficients,
    catalan,
    central_k,
    determinant,
    eye,
    factorial,
    matmul,
    shifted_forward,
    stirling_second,
    zeros,
)


OUT = Path("bottom_mixed_forward_sign_regular_certificate_20260803.json")


def reverse_identity(n: int):
    return [row[::-1] for row in eye(n)]


def transpose(matrix):
    return [list(row) for row in zip(*matrix)]


def forward_beta(m: int):
    q = 2 * m + 2
    beta = beta_coefficients(q)
    out = zeros(m, q)
    for order in range(m):
        for column in range(q):
            out[order][column] = factorial(order) * sum(
                beta[degree][column] * stirling_second(degree, order)
                for degree in range(order, q)
            )
    return out


def mixed_core(m: int):
    q = 2 * m + 2
    a = forward_beta(m)
    return matmul(
        matmul(a, central_k(q + 1)),
        matmul(reverse_identity(q), transpose(a)),
    )


def pascal(n: int):
    return [[F(comb(i, j)) if j <= i else F(0) for j in range(n)] for i in range(n)]


def catalan_scales_decreasing(m: int):
    q = 2 * m + 2
    scales = []
    for node in range(m - 1, -1, -1):
        denominator = F(1)
        for r in range(q - 1):
            denominator *= node + 5 + r
        scales.append(F(catalan(node + 3), 1) / denominator)
    return scales


def factorized_forward(m: int, core):
    j = reverse_identity(m)
    middle = matmul(matmul(j, transpose(pascal(m))), j)
    out = matmul(matmul(core, j), middle)
    scales = catalan_scales_decreasing(m)
    return [[out[i][k] * scales[k] for k in range(m)] for i in range(m)]


def audit_sign_regular(matrix):
    n = len(matrix)
    counts = []
    total = 0
    for order in range(1, n + 1):
        expected = 1 if (order * (order - 1) // 2) % 2 == 0 else -1
        local = 0
        for rows in combinations(range(n), order):
            for columns in combinations(range(n), order):
                value = determinant([[matrix[i][j] for j in columns] for i in rows])
                assert value != 0 and (1 if value > 0 else -1) == expected
                local += 1
        counts.append(local)
        total += local
    return total, counts


def main() -> None:
    records = []
    identity_entries = 0
    total_minors = 0
    for m in range(1, 11):
        core = mixed_core(m)
        reconstructed = factorized_forward(m, core)
        target = shifted_forward(m, 0)
        assert reconstructed == target
        identity_entries += m * m
        count, by_order = audit_sign_regular(core)
        assert count == comb(2 * m, m) - 1
        total_minors += count
        records.append({"m": m, "strict_signed_minors": count, "by_order": by_order})
        print(f"m={m} strict_signed_minors={count}", flush=True)

    report = {
        "kind": "bottom_mixed_forward_sign_regular_certificate",
        "status": "PASS_EXACT_MIXED_FORWARD_SIGN_REGULAR_AUDIT",
        "range": [1, 10],
        "factorization_identity_entries": identity_entries,
        "strict_signed_minors": total_minors,
        "signature": "epsilon_k=(-1)^(k(k-1)/2)",
        "records": records,
        "scope": (
            "All arithmetic is exact.  The factorization is an all-size algebraic "
            "identity; the sign-regularity audit through m=10 is finite evidence, "
            "not an all-size proof."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])


if __name__ == "__main__":
    main()
