#!/usr/bin/env python3
"""Probe the algebraic symbol of normalization followed by endpoint contraction.

Let B_N be the finite-degree Laguerre multiplier

    B_N(X^k) = N!/k! X^k.

Its algebraic symbol is

    F_N(X,U)=B_N[(X+U)^N]
            =N! sum_k binom(N,k) X^k U^(N-k)/k!.

On two copies and four multi-affine endpoint markers, apply the unsmoothed
group contraction

    C=(S^2-D_(z1)D_(w1))(S^2-D_(z2)D_(w2)),
    S=D_X+D_Y,

then set the endpoint variables to zero.  The algebraic symbol of C after
B_N tensor B_N is, up to a positive scalar,

    A1*A2*B1*B2*S^4(F_X F_Y)
      -(A1*B1+A2*B2)*S^2(F_X F_Y)+F_X F_Y.

If this polynomial were real stable for every N, the finite-degree
Borcea--Branden symbol theorem would make the composite a universal
stability preserver and would transport the raw path determinant directly
to the normalized group source.  Exact positive-direction line failures
rigorously disprove this shortcut; clean finite tests are evidence only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from math import comb, factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
X, Y, U, V, A1, A2, B1, B2, T = sp.symbols(
    "X Y U V A1 A2 B1 B2 T"
)
VARIABLES = (X, Y, U, V, A1, A2, B1, B2)


def laguerre_symbol(N: int, x: sp.Symbol, u: sp.Symbol) -> sp.Expr:
    return sp.expand(sum(
        sp.Rational(factorial(N) * comb(N, k), factorial(k))
        * x**k * u ** (N - k)
        for k in range(N + 1)
    ))


def S(expr: sp.Expr, order: int) -> sp.Expr:
    return sp.expand(sum(
        sp.binomial(order, k) * sp.diff(expr, X, k, Y, order - k)
        for k in range(order + 1)
    ))


def contraction_symbol(N: int, smoothing: int = 0) -> sp.Poly:
    base = laguerre_symbol(N, X, U) * laguerre_symbol(N, Y, V)
    answer = (
        A1 * A2 * B1 * B2 * S(base, 4)
        - (A1 * B1 + A2 * B2) * S(base, 2)
        + base
    )
    if smoothing:
        answer = S(answer, smoothing)
    return sp.Poly(sp.expand(answer), *VARIABLES, domain=sp.QQ)


def primitive_digest(poly: sp.Poly) -> str:
    _, integer = poly.clear_denoms(convert=True)
    _, primitive = integer.primitive()
    values = primitive.all_coeffs()
    if values and values[0] < 0:
        values = [-value for value in values]
    return hashlib.sha256(
        ",".join(map(str, values)).encode("ascii")
    ).hexdigest()


def one_line(
    poly: sp.Poly,
    rng: random.Random,
    bound: int,
) -> tuple[sp.Poly, list[int], list[int]]:
    bases = [rng.randint(-bound, bound) for _ in VARIABLES]
    directions = [rng.randint(1, 13) for _ in VARIABLES]
    expression = poly.as_expr().subs({
        variable: base + direction * T
        for variable, base, direction in zip(VARIABLES, bases, directions)
    })
    return sp.Poly(sp.expand(expression), T, domain=sp.QQ), bases, directions


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-N", type=int, default=2)
    parser.add_argument("--max-N", type=int, default=8)
    parser.add_argument("--trials", type=int, default=30)
    parser.add_argument("--bound", type=int, default=23)
    parser.add_argument("--seed", type=int, default=993_730_20260804)
    parser.add_argument(
        "--endpoint",
        action="store_true",
        help=(
            "test only N=3m+4 and apply the actual endpoint smoothing "
            "S^(2m+1)"
        ),
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "laguerre_normalized_contraction_symbol_probe_20260804.json",
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)
    records: list[dict[str, object]] = []
    first_failure = None

    sizes = list(range(args.min_N, args.max_N + 1))
    if args.endpoint:
        sizes = [N for N in sizes if (N - 4) % 3 == 0 and N >= 4]
    for N in sizes:
        smoothing = (2 * ((N - 4) // 3) + 1) if args.endpoint else 0
        symbol = contraction_symbol(N, smoothing)
        for trial in range(args.trials):
            line, bases, directions = one_line(symbol, rng, args.bound)
            real = int(line.count_roots(-sp.oo, sp.oo))
            record = {
                "N": N,
                "smoothing": smoothing,
                "trial": trial,
                "degree": line.degree(),
                "distinct_real_roots": real,
                "bases": bases,
                "directions": directions,
                "sha256": primitive_digest(line),
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
            "EXACT_SYMBOL_LINE_OBSTRUCTION"
            if first_failure is not None
            else "FINITE_EXACT_SYMBOL_LINES_CLEAN"
        ),
        "symbol": (
            "A1*A2*B1*B2*S^4(F_N(X,U)F_N(Y,V))"
            "-(A1*B1+A2*B2)*S^2(F_N(X,U)F_N(Y,V))"
            "+F_N(X,U)F_N(Y,V)"
        ),
        "laguerre_symbol": (
            "F_N(X,U)=N!*sum_k binom(N,k)X^kU^(N-k)/k!"
        ),
        "parameters": {
            "min_N": args.min_N,
            "max_N": args.max_N,
            "trials": args.trials,
            "bound": args.bound,
            "seed": args.seed,
            "endpoint": args.endpoint,
        },
        "lines_checked": len(records),
        "first_failure": first_failure,
        "records": records,
        "scope": (
            "An exact positive-direction line with fewer real roots than its "
            "degree disproves stability of the universal composite symbol.  "
            "Clean finite lines do not prove all-order stability."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
