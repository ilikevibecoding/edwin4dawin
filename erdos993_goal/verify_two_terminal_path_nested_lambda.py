#!/usr/bin/env python3
"""Prove the two-terminal path base for nested sharp Lambda pruning.

Let P_n have endpoint leaves l,w.  Write E_q(P_n,l) for the sharp
Lambda leaf-recursion remainder.  The strong two-terminal remainder is

    N_q(n) =
      E_q(P_n,l)-E_q(P_(n-1),l)-E_(q-1)(P_(n-2),l).

For q>=4 this script proves symbolically that q!^2 N_q(n) factors as

    2q(q-1)(n-q-2)(n-2q+1)
      (n-q-3)_(q-4)^2 Q_q(n),

and proves Q_q(n)>=0 on the path support n>=2q-1.  At q=3, where the
lower-rank term is not part of the induction, it proves the separate
nonnegative endpoint increment.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp
from sympy.functions.combinatorial.factorials import (
    FallingFactorial as FF,
)

from verify_factorial_sharp_lambda_recursion_identity import (
    sharp_lambda_remainder,
)


def path_f(order, rank):
    return FF(order - rank + 1, rank)


def path_g(order, rank):
    return FF(order - rank + 1, rank - 1)


def endpoint_remainder(order, rank):
    """Return rank!^2 E_rank(P_order, endpoint)."""
    return sharp_lambda_remainder(
        rank,
        path_f(order - 1, rank),
        path_f(order - 1, rank + 1),
        path_f(order - 1, rank + 2),
        path_g(order - 1, rank + 2),
        path_f(order - 2, rank - 1),
        path_f(order - 2, rank),
        path_f(order - 2, rank + 1),
        path_g(order - 2, rank + 1),
        path_f(order - 3, rank),
    )


def symbolic_factorization() -> tuple[sp.Expr, sp.Expr]:
    n, q = sp.symbols("n q", integer=True, positive=True)
    nested = (
        endpoint_remainder(n, q)
        - endpoint_remainder(n - 1, q)
        - q**2 * endpoint_remainder(n - 2, q - 1)
    )
    Q = (
        2 * (2 * q - 1) * n**4
        + (-26 * q**2 - 4 * q + 11) * n**3
        + (66 * q**3 + 47 * q**2 - 37 * q - 16) * n**2
        + (
            -78 * q**4
            - 83 * q**3
            + 22 * q**2
            + 61 * q
            + 7
        )
        * n
        + 2
        * q
        * (
            18 * q**4
            + 22 * q**3
            + 3 * q**2
            - 21 * q
            - 11
        )
    )
    prefactor = (
        2
        * q
        * (q - 1)
        * (n - q - 2)
        * (n - 2 * q + 1)
        * FF(n - q - 3, q - 4) ** 2
    )
    assert sp.simplify(sp.combsimp(nested / prefactor) - Q) == 0
    return Q, prefactor


def positivity_verification(Q: sp.Expr) -> dict:
    symbols_by_name = {symbol.name: symbol for symbol in Q.free_symbols}
    n = symbols_by_name["n"]
    q = symbols_by_name["q"]
    x = sp.symbols("x", integer=True, nonnegative=True)
    shifted = sp.Poly(
        sp.expand(Q.subs(n, 2 * q - 1 + x)), x
    )
    expected_coefficients = [
        4 * q - 2,
        6 * q**2 - 36 * q + 19,
        6 * q**3 - 43 * q**2 + 113 * q - 61,
        (q - 1) * (2 * q**3 - 17 * q**2 + 57 * q - 80),
        3 * (q - 3) * (q - 2) ** 2,
    ]
    assert all(
        sp.expand(left - right) == 0
        for left, right in zip(
            shifted.all_coeffs(), expected_coefficients
        )
    )

    # For q>=6 all five coefficients are positive.  The derivative
    # checks below certify monotonicity from q=6 (or q=4 where noted).
    a3 = expected_coefficients[1]
    a2 = expected_coefficients[2]
    cubic = 2 * q**3 - 17 * q**2 + 57 * q - 80
    assert a3.subs(q, 6) > 0
    assert sp.diff(a3, q).subs(q, 6) > 0
    assert sp.diff(a3, q, 2) > 0
    assert a2.subs(q, 4) > 0
    assert sp.diff(a2, q).subs(q, 4) > 0
    assert sp.diff(a2, q, 2).subs(q, 4) > 0
    assert sp.diff(a2, q, 3) > 0
    assert cubic.subs(q, 4) > 0
    assert sp.diff(cubic, q).subs(q, 4) > 0
    assert sp.diff(cubic, q, 2).subs(q, 4) > 0
    assert sp.diff(cubic, q, 3) > 0

    q4 = sp.Poly(sp.expand(shifted.as_expr().subs(q, 4)), x)
    q5 = sp.Poly(sp.expand(shifted.as_expr().subs(q, 5)), x)
    assert q4.as_expr() == (
        14 * x**4 - 29 * x**3 + 87 * x**2 + 12 * x + 12
    )
    assert q5.as_expr() == (
        18 * x**4 - 11 * x**3 + 179 * x**2 + 120 * x + 54
    )
    assert (-29) ** 2 - 4 * 14 * 87 < 0
    assert (-11) ** 2 - 4 * 18 * 179 < 0

    # At q=3 the induction uses only the plain endpoint increment.
    endpoint_q3 = sp.factor(
        endpoint_remainder(n, 3)
        - endpoint_remainder(n - 1, 3)
    )
    expected_q3 = (
        6
        * (n - 6)
        * (n - 5)
        * (20 * n**2 - 238 * n + 707)
    )
    assert sp.expand(endpoint_q3 - expected_q3) == 0
    assert (20 * n**2 - 238 * n + 707).subs(n, 7) > 0
    assert sp.diff(
        20 * n**2 - 238 * n + 707, n
    ).subs(n, 7) > 0

    return {
        "shifted_Q_coefficients": [
            str(value) for value in expected_coefficients
        ],
        "q4_shifted_Q": str(q4.as_expr()),
        "q5_shifted_Q": str(q5.as_expr()),
        "q3_endpoint_increment": str(endpoint_q3),
    }


def finite_replay(maximum_order: int) -> dict:
    checks = failures = 0
    minimum = None
    for n_value in range(3, maximum_order + 1):
        maximum_rank = (n_value + 1) // 2
        for q_value in range(3, maximum_rank + 1):
            if q_value == 3:
                value = sp.Integer(
                    endpoint_remainder(n_value, q_value)
                    - endpoint_remainder(n_value - 1, q_value)
                )
            else:
                value = sp.Integer(
                    endpoint_remainder(n_value, q_value)
                    - endpoint_remainder(n_value - 1, q_value)
                    - q_value**2
                    * endpoint_remainder(
                        n_value - 2, q_value - 1
                    )
                )
            checks += 1
            if value < 0:
                failures += 1
            record = {
                "path_order": n_value,
                "rank_q": q_value,
                "factorial_nested_remainder": int(value),
            }
            if minimum is None or value < minimum[0]:
                minimum = (value, record)
    return {
        "finite_maximum_path_order": maximum_order,
        "finite_checks": checks,
        "finite_failures": failures,
        "finite_minimum": minimum[1] if minimum else None,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-order", type=int, default=500)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "two_terminal_path_nested_lambda_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    Q, prefactor = symbolic_factorization()
    positivity = positivity_verification(Q)
    replay = finite_replay(args.maximum_order)
    report = {
        "status": (
            "PASS_TWO_TERMINAL_PATH_NESTED_LAMBDA_THEOREM"
            if not replay["finite_failures"]
            else "FAIL_TWO_TERMINAL_PATH_NESTED_LAMBDA_THEOREM"
        ),
        "symbolic_general_q_factorization": True,
        "prefactor": str(prefactor),
        "quartic_Q": str(Q),
        "positivity_domain": (
            "q>=4 and n>=2q-1; q=3 is handled by the separate "
            "endpoint-increment factorization."
        ),
        **positivity,
        **replay,
        "conclusion": (
            "The strong nested sharp-Lambda remainder is "
            "nonnegative for every path with its two endpoints "
            "designated, at every supported rank."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
