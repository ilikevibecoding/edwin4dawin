#!/usr/bin/env python3
"""Probe the homogeneous path kernel that retains Laguerre normalization.

Let

  p_n(X,T)=sum_a binom(n+a-1,n-a) X^a T^(n-a)
          =det(X I_n+T A_n),

with A_n=0 direct-sum C_(n-1).  Then

  n! g_n(X)=n! [T^n] exp(T) p_n(X,T).

Using the common ambient normalization N!, the endpoint states are represented
by T p_(N-1) and T^2 p_(N-2).  Consequently the unsmoothed group source is the
coefficient extraction of the four-variable homogeneous kernel

  K_N = S^4(p_N(X,T)p_N(Y,U))
        -2 T U S^2(p_(N-1)(X,T)p_(N-1)(Y,U))
        +T^2 U^2 p_(N-2)(X,T)p_(N-2)(Y,U),

where S=D_X+D_Y.  If K_N is real stable in X,Y,T,U for every N, multiplication
by exp(T+U), coefficient extraction, and the remaining S derivatives prove the
actual group endpoint.  Exact positive-direction line failures disprove this
lift; clean finite tests are evidence only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from math import comb, factorial
from pathlib import Path

import sympy as sp

from verify_quadratic_component_square_root_lowering import group


HERE = Path(__file__).resolve().parent
X, Y, T, U, Z = sp.symbols("X Y T U Z")
VARIABLES = (X, Y, T, U)


def path_homogeneous(n: int, x: sp.Symbol, t: sp.Symbol) -> sp.Expr:
    if n < 0:
        return sp.S.Zero
    return sp.expand(sum(
        comb(n + a - 1, n - a) * x**a * t ** (n - a)
        for a in range(1, n + 1)
    ))


def S(expression: sp.Expr, order: int) -> sp.Expr:
    return sp.expand(sum(
        sp.binomial(order, k) * sp.diff(expression, X, k, Y, order - k)
        for k in range(order + 1)
    ))


def kernel(N: int, smoothing: int = 0) -> sp.Poly:
    p0 = path_homogeneous(N, X, T) * path_homogeneous(N, Y, U)
    p1 = path_homogeneous(N - 1, X, T) * path_homogeneous(N - 1, Y, U)
    p2 = path_homogeneous(N - 2, X, T) * path_homogeneous(N - 2, Y, U)
    answer = sp.expand(
        S(p0, 4) - 2 * T * U * S(p1, 2) + T**2 * U**2 * p2
    )
    if smoothing:
        answer = S(answer, smoothing)
    return sp.Poly(
        answer,
        *VARIABLES,
        domain=sp.QQ,
    )


def normalized_coefficient(expression: sp.Expr, N: int) -> sp.Expr:
    """Return (N!)^2 [T^N U^N] exp(T+U) expression."""
    polynomial = sp.Poly(expression, T, U)
    answer = sp.S.Zero
    for (i, j), coefficient in polynomial.terms():
        if i <= N and j <= N:
            answer += (
                sp.Rational(factorial(N), factorial(N - i))
                * sp.Rational(factorial(N), factorial(N - j))
                * coefficient
            )
    return sp.expand(answer)


def digest(poly: sp.Poly) -> str:
    _, integer = poly.clear_denoms(convert=True)
    _, primitive = integer.primitive()
    values = primitive.all_coeffs()
    if values and values[0] < 0:
        values = [-value for value in values]
    return hashlib.sha256(
        ",".join(map(str, values)).encode("ascii")
    ).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-N", type=int, default=4)
    parser.add_argument("--max-N", type=int, default=16)
    parser.add_argument("--trials", type=int, default=100)
    parser.add_argument("--bound", type=int, default=31)
    parser.add_argument("--seed", type=int, default=993_732_20260804)
    parser.add_argument(
        "--endpoint",
        action="store_true",
        help="test N=3m+4 after the actual smoothing S^(2m+1)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "homogeneous_path_normalization_kernel_probe_20260804.json",
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)
    records: list[dict[str, object]] = []
    identity_checks: list[int] = []
    first_failure = None

    sizes = list(range(args.min_N, args.max_N + 1))
    if args.endpoint:
        sizes = [N for N in sizes if N >= 4 and (N - 4) % 3 == 0]
    for N in sizes:
        smoothing = (2 * ((N - 4) // 3) + 1) if args.endpoint else 0
        polynomial = kernel(N, smoothing)
        if N <= 10:
            expected = factorial(N) ** 2 * group(N, 4 + smoothing)
            actual = normalized_coefficient(polynomial.as_expr(), N)
            assert sp.expand(actual - expected) == 0
            identity_checks.append(N)

        for trial in range(args.trials):
            bases = [rng.randint(-args.bound, args.bound) for _ in VARIABLES]
            directions = [rng.randint(1, 17) for _ in VARIABLES]
            line = sp.Poly(
                sp.expand(polynomial.as_expr().subs({
                    variable: base + direction * Z
                    for variable, base, direction
                    in zip(VARIABLES, bases, directions)
                })),
                Z,
                domain=sp.QQ,
            )
            real = int(line.count_roots(-sp.oo, sp.oo))
            record = {
                "N": N,
                "smoothing": smoothing,
                "trial": trial,
                "degree": line.degree(),
                "distinct_real_roots": real,
                "bases": bases,
                "directions": directions,
                "sha256": digest(line),
            }
            records.append(record)
            if real != line.degree():
                first_failure = record
                print(
                    f"N={N} trial={trial}: exact failure "
                    f"{real}/{line.degree()} real roots",
                    flush=True,
                )
                break
        if first_failure is not None:
            break
        print(
            f"N={N} smoothing={smoothing}: {args.trials} exact lines clean",
            flush=True,
        )

    report = {
        "status": (
            "EXACT_HOMOGENEOUS_PATH_KERNEL_LINE_OBSTRUCTION"
            if first_failure is not None
            else "FINITE_EXACT_HOMOGENEOUS_PATH_KERNEL_LINES_CLEAN"
        ),
        "identity": (
            "(N!)^2 H_N=[T^N U^N]exp(T+U)K_N"
        ),
        "identity_checks_N": identity_checks,
        "lines_checked": len(records),
        "first_failure": first_failure,
        "records": records,
        "scope": (
            "The coefficient identity is exact.  An exact positive-direction "
            "line failure disproves stability of K_N; clean finite lines do "
            "not prove all-order stability."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
