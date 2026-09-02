#!/usr/bin/env python3
"""Probe the fully slot-resolved path/Laguerre mixed-characteristic lift.

For the path determinant Delta_N(X,U,e1,e2), retain the N labeled factors
in the mixed-characteristic operator instead of diagonalizing their marker
variables:

  L_N = [prod_(j=1)^N
         (h_j + D_U + a_j D_e1 + b_j D_e2) Delta_N]_(U=e1=e2=0).

Setting every h_j=1, a_j=z1, b_j=z2 recovers N! Phi_N.  If L_N is stable,
then a stable differential selector on the labeled slots can potentially be
composed before diagonalization, preserving the without-replacement
normalization.  An exact positive-direction line failure disproves this
particular lift; clean finite lines are evidence only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path

import sympy as sp

from verify_defect1_path_laguerre_model import endpoint_determinant


HERE = Path(__file__).resolve().parent
X, U, E1, E2, T = sp.symbols("T U e1 e2 tau")


def slot_lift(N: int) -> tuple[sp.Poly, tuple[sp.Symbol, ...]]:
    h = sp.symbols(f"h0:{N}")
    a = sp.symbols(f"a0:{N}")
    b = sp.symbols(f"b0:{N}")
    expression = endpoint_determinant(N).subs({
        sp.Symbol("T"): X,
        sp.Symbol("U"): U,
        sp.Symbol("e1"): E1,
        sp.Symbol("e2"): E2,
    })
    for j in range(N):
        expression = sp.expand(
            h[j] * expression
            + sp.diff(expression, U)
            + a[j] * sp.diff(expression, E1)
            + b[j] * sp.diff(expression, E2)
        )
    expression = sp.expand(expression.subs({U: 0, E1: 0, E2: 0}))
    variables = (X, *h, *a, *b)
    return sp.Poly(expression, *variables, domain=sp.QQ), variables


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
    parser.add_argument("--min-N", type=int, default=2)
    parser.add_argument("--max-N", type=int, default=6)
    parser.add_argument("--trials", type=int, default=40)
    parser.add_argument("--bound", type=int, default=19)
    parser.add_argument("--seed", type=int, default=993_731_20260804)
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "slot_resolved_mixed_characteristic_lift_probe_20260804.json",
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)
    records: list[dict[str, object]] = []
    first_failure = None

    for N in range(args.min_N, args.max_N + 1):
        lift, variables = slot_lift(N)
        for trial in range(args.trials):
            bases = [rng.randint(-args.bound, args.bound) for _ in variables]
            directions = [rng.randint(1, 11) for _ in variables]
            line = sp.Poly(
                sp.expand(lift.as_expr().subs({
                    variable: base + direction * T
                    for variable, base, direction
                    in zip(variables, bases, directions)
                })),
                T,
                domain=sp.QQ,
            )
            real = int(line.count_roots(-sp.oo, sp.oo))
            record = {
                "N": N,
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
        print(f"N={N}: {args.trials} exact lines clean", flush=True)

    report = {
        "status": (
            "EXACT_SLOT_LIFT_LINE_OBSTRUCTION"
            if first_failure is not None
            else "FINITE_EXACT_SLOT_LIFT_LINES_CLEAN"
        ),
        "lift": (
            "[prod_j(h_j+D_U+a_jD_e1+b_jD_e2)Delta_N]_(U=e1=e2=0)"
        ),
        "lines_checked": len(records),
        "first_failure": first_failure,
        "records": records,
        "scope": (
            "An exact positive-direction line failure disproves stability of "
            "the fully independent slot lift.  Clean finite tests do not "
            "prove all-order stability."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
