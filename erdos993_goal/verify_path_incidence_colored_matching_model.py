#!/usr/bin/env python3
"""Replay the path-incidence colored-matching model for the defect-one seed.

Let B be the unsigned edge/vertex incidence matrix of the path on N
vertices.  Then C=B B^T=tridiag(1,2,1), and A_N=0 direct-sum C.  The
elementary principal-minor sum e_k(C) counts k-matchings of the subdivision
path P_(2N-1), hence equals binom(2N-1-k,k).  Consequently

  N! g_N(X)=sum_k (N)_k binom(2N-1-k,k) X^(N-k).

The factor (N)_k injectively assigns k distinct colors to the selected
subdivision-path edges.  Differentiating r times removes r unused colors:

  D^r(N!g_N)=(N)_r sum_k (N-r)_k binom(2N-1-k,k) X^(N-r-k).

The displayed formulas are all-order continuant/counting identities.  The
finite computations below are independent transcription checks.
"""

from __future__ import annotations

import json
from math import comb, factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "path_incidence_colored_matching_model_20260804.json"
X = sp.symbols("X")


def falling(n: int, k: int) -> int:
    if k < 0 or k > n:
        return 0
    return factorial(n) // factorial(n - k)


def incidence_covariance(N: int) -> sp.Matrix:
    if N <= 1:
        return sp.zeros(0, 0)
    B = sp.zeros(N - 1, N)
    for edge in range(N - 1):
        B[edge, edge] = 1
        B[edge, edge + 1] = 1
    return B * B.T


def elementary_principal_sum(A: sp.Matrix, k: int) -> sp.Integer:
    if k == 0:
        return sp.Integer(1)
    from itertools import combinations

    return sum(
        (A.extract(indices, indices).det(method="domain-ge")
         for indices in combinations(range(A.rows), k)),
        sp.Integer(0),
    )


def seed(N: int) -> sp.Expr:
    return sp.expand(sum(
        sp.binomial(N + a - 1, N - a) * X**a / sp.factorial(a)
        for a in range(N + 1)
    ))


def colored_matching_polynomial(N: int) -> sp.Expr:
    return sp.expand(sum(
        falling(N, k) * comb(2 * N - 1 - k, k) * X ** (N - k)
        for k in range(N)
    ))


def main() -> None:
    records: list[dict[str, object]] = []
    derivative_checks = 0
    for N in range(1, 14):
        C = incidence_covariance(N)
        principal_checks = []
        for k in range(N):
            actual = elementary_principal_sum(C, k)
            expected = comb(2 * N - 1 - k, k)
            assert actual == expected
            principal_checks.append([k, int(actual)])

        colored = colored_matching_polynomial(N)
        normalized_seed = sp.expand(factorial(N) * seed(N))
        assert colored == normalized_seed

        for r in range(N + 1):
            expected_derivative = sp.expand(
                falling(N, r) * sum(
                    falling(N - r, k)
                    * comb(2 * N - 1 - k, k)
                    * X ** (N - r - k)
                    for k in range(N - r + 1)
                    if 2 * N - 1 - k >= k
                )
            )
            assert sp.expand(
                sp.diff(colored, X, r) - expected_derivative
            ) == 0
            derivative_checks += 1

        records.append({
            "N": N,
            "principal_minor_sums": principal_checks,
            "seed_identity": True,
            "derivative_orders_checked": N + 1,
        })
        print(f"N={N}: path minors, colored matchings, derivatives exact", flush=True)

    report = {
        "status": "PASS_ALL_ORDER_PATH_INCIDENCE_COLORED_MATCHING_MODEL",
        "identity": (
            "N!g_N=sum_k (N)_k binom(2N-1-k,k) X^(N-k)"
        ),
        "derivative_identity": (
            "D^r(N!g_N)=(N)_r sum_k (N-r)_k "
            "binom(2N-1-k,k) X^(N-r-k)"
        ),
        "proof": (
            "C=B B^T for the unsigned incidence matrix of P_N; its "
            "principal-minor sums count matchings of the subdivision path. "
            "The falling factorial injects distinct colors, and the "
            "derivative formula is the falling-factorial product identity."
        ),
        "finite_replays": records,
        "derivative_checks": derivative_checks,
        "scope": (
            "This is an all-order structural identity, not by itself the "
            "remaining two-endpoint stability contraction."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(REPORT)


if __name__ == "__main__":
    main()
