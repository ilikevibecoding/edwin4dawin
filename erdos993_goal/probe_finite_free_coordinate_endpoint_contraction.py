#!/usr/bin/env python3
"""Probe the finite-free coordinate-endpoint class behind the path model.

For a positive-semidefinite N by N covariance A define

  P_A(X)=sum_(R subset [N]) (N)_(|R|) det(A[R]) X^(N-|R|).

This is the expected characteristic polynomial of a square complex Wishart
sample with covariance A.  If e is a distinguished coordinate, deleting that
row and one Gaussian column while restoring the common N! scale gives

  Q_e(X)=N sum_(R subset [N] excluding e) (N-1)_(|R|) det(A[R])
         X^(N-1-|R|).

Deleting two distinguished coordinates and two columns gives R_(e,f) with
the factor N(N-1).  The two-copy endpoint contraction is

  S^d(PP)-S^(d-2)(Q_e Q_e+Q_f Q_f)+S^(d-4)(RR).

For the path covariance this is exactly the defect-one group target (up to a
positive common scalar).  This script checks whether the same stability
phenomenon extends to arbitrary exact PSD covariances.  A line failure is an
exact obstruction to that generalization; clean tests are evidence only.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import random
from math import factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
X, Y, T = sp.symbols("X Y T")


def falling(n: int, k: int) -> int:
    return factorial(n) // factorial(n - k)


def principal_minor(matrix: sp.Matrix, subset: tuple[int, ...]) -> sp.Expr:
    if not subset:
        return sp.Integer(1)
    return matrix.extract(subset, subset).det(method="domain-ge")


def wishart_polynomial(
    matrix: sp.Matrix,
    ambient: int,
    scale: int,
    variable: sp.Symbol,
) -> sp.Expr:
    n = matrix.rows
    answer = sp.S.Zero
    for size in range(n + 1):
        for subset in itertools.combinations(range(n), size):
            answer += (
                scale * falling(ambient, size)
                * principal_minor(matrix, subset)
                * variable ** (n - size)
            )
    return sp.expand(answer)


def states(matrix: sp.Matrix) -> tuple[sp.Expr, sp.Expr, sp.Expr, sp.Expr]:
    N = matrix.rows
    keep_left = list(range(1, N))
    keep_right = list(range(N - 1))
    keep_both = list(range(1, N - 1))
    p = wishart_polynomial(matrix, N, 1, X)
    q_left = wishart_polynomial(matrix.extract(keep_left, keep_left), N - 1, N, X)
    q_right = wishart_polynomial(matrix.extract(keep_right, keep_right), N - 1, N, X)
    r = wishart_polynomial(
        matrix.extract(keep_both, keep_both),
        N - 2,
        N * (N - 1),
        X,
    )
    return p, q_left, q_right, r


def S(expression: sp.Expr, order: int) -> sp.Expr:
    return sp.expand(sum(
        sp.binomial(order, k) * sp.diff(expression, X, k, Y, order - k)
        for k in range(order + 1)
    ))


def group_expression(matrix: sp.Matrix, d: int) -> sp.Poly:
    p, q_left, q_right, r = states(matrix)
    swap = {X: Y}
    answer = (
        S(p * p.xreplace(swap), d)
        - S(
            q_left * q_left.xreplace(swap)
            + q_right * q_right.xreplace(swap),
            d - 2,
        )
        + S(r * r.xreplace(swap), d - 4)
    )
    return sp.Poly(sp.expand(answer), X, Y, domain=sp.QQ)


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
    parser.add_argument("--trials", type=int, default=120)
    parser.add_argument("--lines", type=int, default=12)
    parser.add_argument("--seed", type=int, default=993_733_20260804)
    parser.add_argument("--sizes", default="4,5,6,7")
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "finite_free_coordinate_endpoint_contraction_probe_20260804.json",
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)
    sizes = [int(value) for value in args.sizes.split(",")]
    records: list[dict[str, object]] = []
    first_failure = None

    for trial in range(args.trials):
        N = rng.choice(sizes)
        minimum_d = max(4, (N + 6) // 2)
        d = rng.randint(minimum_d, max(minimum_d, N))
        base = sp.Matrix(N, N, [rng.randint(-3, 4) for _ in range(N * N)])
        matrix = base * base.T
        polynomial = group_expression(matrix, d)
        for line_index in range(args.lines):
            ax, ay = rng.randint(-35, 35), rng.randint(-35, 35)
            bx, by = rng.randint(1, 13), rng.randint(1, 13)
            line = sp.Poly(
                sp.expand(polynomial.as_expr().subs({
                    X: ax + bx * T,
                    Y: ay + by * T,
                })),
                T,
                domain=sp.QQ,
            )
            real = int(line.count_roots(-sp.oo, sp.oo))
            record = {
                "trial": trial,
                "line_index": line_index,
                "N": N,
                "d": d,
                "two_d_minus_N": 2 * d - N,
                "base_matrix": [list(map(int, row)) for row in base.tolist()],
                "line": [ax, bx, ay, by],
                "degree": line.degree(),
                "distinct_real_roots": real,
                "sha256": digest(line),
            }
            records.append(record)
            if real != line.degree():
                first_failure = record
                print(
                    f"trial={trial} N={N} d={d} line={line_index}: "
                    f"exact failure {real}/{line.degree()} real roots",
                    flush=True,
                )
                break
        if first_failure is not None:
            break
        print(f"trial={trial} N={N} d={d}: clean", flush=True)

    report = {
        "status": (
            "EXACT_FINITE_FREE_COORDINATE_CLASS_OBSTRUCTION"
            if first_failure is not None
            else "FINITE_EXACT_COORDINATE_CLASS_LINES_CLEAN"
        ),
        "trials_requested": args.trials,
        "lines_per_trial": args.lines,
        "sizes": sizes,
        "lines_checked": len(records),
        "first_failure": first_failure,
        "records": records,
        "scope": (
            "A line failure disproves generic closure for finite-free PSD "
            "covariances with two coordinate endpoints.  Clean finite tests "
            "do not prove the class theorem."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
