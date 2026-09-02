#!/usr/bin/env python3
"""Exact line probe for the multivariate endpoint Wishart lift.

For a PSD N by N matrix A and distinguished coordinates e,f, form

  K_A(x,z1,z2) = P_A(x) + z1 Q_e(x) + z2 Q_f(x) + z1 z2 R_ef(x),

where P is the row-multiaffine square-Wishart polynomial and Q,R delete
one/two distinguished rows together with one/two distinct labeled columns,
at the common scale.  Stability of this lift would give a direct way to
transport the endpoint markers through the factorial normalization.

Each reported line uses an exact rational PSD Gram matrix, an integer real
base, and a strictly positive integer direction.  A non-real-rooted line is
an exact obstruction; clean lines are evidence only.
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
T = sp.symbols("T")


def falling(n: int, k: int) -> int:
    return factorial(n) // factorial(n - k)


def principal_minor(matrix: sp.Matrix, subset: tuple[int, ...]) -> sp.Expr:
    if not subset:
        return sp.Integer(1)
    return matrix.extract(subset, subset).det(method="domain-ge")


def complement_monomial(
    variables: tuple[sp.Symbol, ...],
    subset: tuple[int, ...],
    omitted: frozenset[int] = frozenset(),
) -> sp.Expr:
    selected = set(subset)
    answer = sp.S.One
    for index, variable in enumerate(variables):
        if index not in selected and index not in omitted:
            answer *= variable
    return answer


def endpoint_lift(matrix: sp.Matrix) -> tuple[sp.Expr, tuple[sp.Symbol, ...]]:
    N = matrix.rows
    x = sp.symbols(f"x0:{N}")
    z1, z2 = sp.symbols("z1 z2")
    e, f = 0, N - 1
    p = sp.S.Zero
    q1 = sp.S.Zero
    q2 = sp.S.Zero
    r = sp.S.Zero
    for size in range(N + 1):
        for subset in itertools.combinations(range(N), size):
            minor = principal_minor(matrix, subset)
            if minor == 0:
                continue
            p += falling(N, size) * minor * complement_monomial(x, subset)
            if e not in subset and size <= N - 1:
                q1 += (
                    N
                    * falling(N - 1, size)
                    * minor
                    * complement_monomial(x, subset, frozenset({e}))
                )
            if f not in subset and size <= N - 1:
                q2 += (
                    N
                    * falling(N - 1, size)
                    * minor
                    * complement_monomial(x, subset, frozenset({f}))
                )
            if e not in subset and f not in subset and size <= N - 2:
                r += (
                    N
                    * (N - 1)
                    * falling(N - 2, size)
                    * minor
                    * complement_monomial(x, subset, frozenset({e, f}))
                )
    return sp.expand(p + z1 * q1 + z2 * q2 + z1 * z2 * r), (*x, z1, z2)


def digest(poly: sp.Poly) -> str:
    _, integer = poly.clear_denoms(convert=True)
    _, primitive = integer.primitive()
    values = primitive.all_coeffs()
    if values and values[0] < 0:
        values = [-value for value in values]
    return hashlib.sha256(",".join(map(str, values)).encode("ascii")).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials", type=int, default=80)
    parser.add_argument("--lines", type=int, default=20)
    parser.add_argument("--sizes", default="3,4,5,6")
    parser.add_argument("--seed", type=int, default=993_811_20260804)
    parser.add_argument(
        "--path-only",
        action="store_true",
        help="use the permuted path covariance instead of random Gram matrices",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "multivariate_endpoint_wishart_lift_probe_20260804.json",
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)
    sizes = [int(value) for value in args.sizes.split(",")]
    records: list[dict[str, object]] = []
    failure = None

    for trial in range(args.trials):
        N = rng.choice(sizes)
        if args.path_only:
            original = sp.zeros(N)
            for index in range(1, N):
                original[index, index] = 2
                if index + 1 < N:
                    original[index, index + 1] = 1
                    original[index + 1, index] = 1
            order = [1, *range(2, N - 1), 0, N - 1] if N > 2 else [0, 1]
            matrix = original.extract(order, order)
            base_record = None
        else:
            base = sp.Matrix(N, N, [rng.randint(-3, 4) for _ in range(N * N)])
            matrix = base * base.T
            base_record = [list(map(int, row)) for row in base.tolist()]
        lift, variables = endpoint_lift(matrix)
        for line_index in range(args.lines):
            bases = [rng.randint(-30, 30) for _ in variables]
            directions = [rng.randint(1, 13) for _ in variables]
            substitution = {
                variable: base_value + direction * T
                for variable, base_value, direction in zip(
                    variables, bases, directions, strict=True
                )
            }
            line = sp.Poly(sp.expand(lift.subs(substitution)), T, domain=sp.QQ)
            real = int(line.count_roots(-sp.oo, sp.oo))
            record = {
                "trial": trial,
                "line_index": line_index,
                "N": N,
                "base_matrix": base_record,
                "bases": bases,
                "directions": directions,
                "degree": line.degree(),
                "distinct_real_roots": real,
                "sha256": digest(line),
            }
            records.append(record)
            if real != line.degree():
                failure = record
                print(
                    f"trial={trial} N={N} line={line_index}: "
                    f"FAIL {real}/{line.degree()}",
                    flush=True,
                )
                break
        if failure is not None:
            break
        print(f"trial={trial} N={N}: clean", flush=True)

    report = {
        "status": "EXACT_OBSTRUCTION" if failure else "FINITE_EXACT_LINES_CLEAN",
        "sizes": sizes,
        "lines_checked": len(records),
        "first_failure": failure,
        "records": records,
        "scope": (
            "A failure disproves stability of the multivariate endpoint lift. "
            "Clean finite lines do not prove it."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
