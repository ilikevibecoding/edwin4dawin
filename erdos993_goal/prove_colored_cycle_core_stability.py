#!/usr/bin/env python3
"""Prove the unsmoothed colored-cycle endpoint core is real stable.

Put

    p_N(T) = sum_a binom(N+a-1, N-a) T^a,
    F_N(T) = N! g_N(T),

and let B_N(T^a)=N!/a! T^a.  Then B_N p_j=(N!/j!)F_j.
Consequently the normalized endpoint core

    C_N = F_N(X)F_N(Y)-2N^2F_(N-1)(X)F_(N-1)(Y)
          +N^2(N-1)^2F_(N-2)(X)F_(N-2)(Y)

is (B_N tensor B_N) applied to

    R_N = p_N(X)p_N(Y)-2p_(N-1)(X)p_(N-1)(Y)
          +p_(N-2)(X)p_(N-2)(Y).

If D_r(T)=det((T+2)I_r+A(P_r)), then p_N(T)=T D_(N-1)(T).
Splitting the cycle C_(2N-2) at its two interface edges gives

    R_N/(XY) = mu_C(X+2,...,X+2,Y+2,...,Y+2),

where each block has N-1 consecutive vertices and mu_C is the multivariate
matching polynomial.  Heilmann--Lieb makes this polynomial real stable.
Finally B_N is a finite-degree stability preserver because its algebraic
symbol is

    N! Y^N L_N(-X/Y),

a product of stable positive linear forms (the Laguerre zeros are positive).
Thus C_N is real stable for every N>=3.

The proof is formal and all-order; the computations below independently
replay its coefficient identities over a substantial exact range.
"""

from __future__ import annotations

import json
from math import comb, factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "colored_cycle_core_stability_theorem_20260804.json"
X, Y = sp.symbols("X Y")


def p(N: int, variable: sp.Symbol) -> sp.Expr:
    if N < 0:
        return sp.S.Zero
    return sp.Add(*[
        sp.Integer(comb(N + a - 1, N - a)) * variable**a
        for a in range(N + 1)
    ])


def F(N: int, variable: sp.Symbol) -> sp.Expr:
    if N < 0:
        return sp.S.Zero
    return sp.Add(*[
        sp.Rational(factorial(N) * comb(N + a - 1, N - a), factorial(a))
        * variable**a
        for a in range(N + 1)
    ])


def B_N(expression: sp.Expr, variable: sp.Symbol, N: int) -> sp.Expr:
    polynomial = sp.Poly(expression, variable, domain=sp.EX)
    return sp.Add(*[
        coefficient * sp.Rational(factorial(N), factorial((degree := monomial[0])))
        * variable**degree
        for monomial, coefficient in polynomial.terms()
    ])


def continuants(variable: sp.Symbol, largest: int) -> list[sp.Expr]:
    values = [sp.Integer(1)]
    if largest == 0:
        return values
    values.append(variable + 2)
    for _ in range(2, largest + 1):
        values.append(sp.expand((variable + 2) * values[-1] - values[-2]))
    return values


def raw_core(N: int) -> sp.Expr:
    return sp.expand(
        p(N, X) * p(N, Y)
        - 2 * p(N - 1, X) * p(N - 1, Y)
        + p(N - 2, X) * p(N - 2, Y)
    )


def normalized_core(N: int) -> sp.Expr:
    return sp.expand(
        F(N, X) * F(N, Y)
        - 2 * N**2 * F(N - 1, X) * F(N - 1, Y)
        + N**2 * (N - 1)**2 * F(N - 2, X) * F(N - 2, Y)
    )


def main() -> None:
    records = []
    for N in range(3, 31):
        dx = continuants(X, N - 1)
        dy = continuants(Y, N - 1)
        cycle_split = sp.expand(X * Y * (
            dx[N - 1] * dy[N - 1]
            - 2 * dx[N - 2] * dy[N - 2]
            + dx[N - 3] * dy[N - 3]
        ))
        path_identity = all(
            sp.Poly(sp.expand(p(j, X) - X * dx[j - 1]), X).is_zero
            for j in range(1, N + 1)
        )
        cycle_identity = sp.Poly(
            sp.expand(raw_core(N) - cycle_split), X, Y
        ).is_zero
        scaling_identity = all(
            sp.Poly(
                sp.expand(
                    B_N(p(N - shift, X), X, N)
                    - sp.Rational(factorial(N), factorial(N - shift))
                    * F(N - shift, X)
                ),
                X,
            ).is_zero
            for shift in range(3)
        )
        transformed = B_N(B_N(raw_core(N), X, N), Y, N)
        core_identity = sp.Poly(
            sp.expand(transformed - normalized_core(N)), X, Y
        ).is_zero
        assert path_identity and cycle_identity and scaling_identity and core_identity
        records.append({
            "N": N,
            "path_continuant_identity": path_identity,
            "cycle_split_identity": cycle_identity,
            "normalization_scaling_identity": scaling_identity,
            "normalized_core_identity": core_identity,
        })

    # The finite-degree algebraic symbol of B_N is the homogenized Laguerre
    # polynomial.  This exact coefficient check is independent of the theorem
    # that all zeros of L_N are positive.
    symbol_checks = []
    for N in range(1, 31):
        symbol = sp.Add(*[
            sp.binomial(N, a) * sp.Rational(factorial(N), factorial(a))
            * X**a * Y**(N - a)
            for a in range(N + 1)
        ])
        laguerre_symbol = factorial(N) * Y**N * sp.laguerre(N, -X / Y)
        ok = sp.Poly(sp.cancel(symbol - laguerre_symbol), X, Y).is_zero
        assert ok
        symbol_checks.append({"N": N, "homogenized_laguerre_symbol": ok})

    report = {
        "status": "ALL_ORDER_THEOREM_WITH_EXACT_REPLAY",
        "theorem": (
            "The normalized unsmoothed colored-cycle endpoint core C_N is "
            "real stable for every N>=3."
        ),
        "proof_chain": [
            "path continuant identity p_N=T D_(N-1)",
            "two-interface matching decomposition on C_(2N-2)",
            "Heilmann-Lieb multivariate matching stability",
            "finite Laguerre multiplier B_N preserves real stability",
        ],
        "identity_replay": records,
        "symbol_replay": symbol_checks,
        "scope": (
            "This proves the unsmoothed endpoint core.  The nonuniform "
            "fixed-grade derivative contraction required for G_(N,d) "
            "remains a separate step."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "identity_sizes": len(records),
        "symbol_sizes": len(symbol_checks),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
