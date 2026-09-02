#!/usr/bin/env python3
"""Exact line probe for the degree-one multiaffine component encoding.

The failed power-marker parent does not rule out the genuinely multiaffine
encoding

    F(X,Y,z,w) = sum_(i,j in supp M) C_(i,j)(X,Y) z_i w_j.

Such an encoding would be the natural input for Purbhoo's exterior-algebra
action of a totally nonnegative matrix.  This script tests necessary affine
line restrictions exactly.  A failure is a rigorous obstruction; a clean
finite run is only evidence.
"""

from __future__ import annotations

import argparse
import json
import random
from math import factorial
from pathlib import Path

import sympy as sp
from flint import fmpz_mat, fmpz_poly

from fast_group_line_sturm_search import (
    affine_power,
    digest,
    exact_distinct_real_roots,
    restrict_line,
)
from probe_quadratic_kernel_monomial_components import (
    X,
    Y,
    component_polynomial,
    seed_coefficients,
    s,
    t,
)


HERE = Path(__file__).resolve().parent


def common_integer_matrix(poly: sp.Poly, width: int, scale: int) -> fmpz_mat:
    entries = []
    for i in range(width):
        for j in range(width):
            value = sp.cancel(poly.coeff_monomial(X**i * Y**j) * scale)
            assert sp.denom(value) == 1
            entries.append(int(value))
    return fmpz_mat(width, width, entries)


def marker(rng: random.Random, bound: int) -> tuple[int, int]:
    return rng.randint(-bound, bound), rng.randint(1, 31)


def audit_line(poly: fmpz_poly) -> dict:
    real, gcd_degree, sturm_degrees = exact_distinct_real_roots(poly)
    return {
        "degree": poly.degree(),
        "distinct_real_roots": real,
        "gcd_degree": gcd_degree,
        "sturm_degrees": sturm_degrees,
        "sha256": digest(poly),
        "real_rooted": real + gcd_degree == poly.degree(),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--N", type=int, default=7)
    parser.add_argument("--d", type=int, default=7)
    parser.add_argument("--trials", type=int, default=120)
    parser.add_argument("--bound", type=int, default=300)
    parser.add_argument("--seed", type=int, default=993_609_20260804)
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "quadratic_component_multiaffine_parent_20260804.json",
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)

    a = t * (1 + t)
    b = s * (1 + s)
    L = a + b
    M = sp.Poly(sp.expand((1 + t) * (1 + s) * L**2 - t * s), t, s)
    support = sorted(monomial for monomial, coefficient in M.terms() if coefficient)
    assert len(support) == 21

    seeds_x = seed_coefficients(args.N, X, t)
    seeds_y = seed_coefficients(args.N, Y, s)
    scale = factorial(args.N) ** 2
    matrices = {
        outer: common_integer_matrix(
            component_polynomial(args.N, args.d, outer, seeds_x, seeds_y),
            args.N + 1,
            scale,
        )
        for outer in support
    }

    records = []
    failure = None
    for trial in range(args.trials):
        ax, bx = marker(rng, args.bound)
        ay, by = marker(rng, args.bound)
        z_lines = [marker(rng, args.bound) for _ in range(6)]
        w_lines = [marker(rng, args.bound) for _ in range(6)]
        base_lines = {
            outer: restrict_line(matrix, ax, bx, ay, by)
            for outer, matrix in matrices.items()
        }

        full = fmpz_poly()
        for i, j in support:
            zi = affine_power(*z_lines[i], 1)
            wj = affine_power(*w_lines[j], 1)
            full += base_lines[(i, j)] * zi * wj
        result = audit_line(full)
        record = {
            "trial": trial,
            "XY_line": [ax, bx, ay, by],
            "z_lines": z_lines,
            "w_lines": w_lines,
            **result,
        }
        records.append(record)
        print(
            f"trial={trial} degree={result['degree']} "
            f"real={result['distinct_real_roots']} gcd={result['gcd_degree']}",
            flush=True,
        )
        if not result["real_rooted"]:
            failure = record
            break

    row_records = []
    row_failure = None
    for j in range(6):
        row_support = sorted(i for i, jj in support if jj == j)
        if len(row_support) < 2:
            continue
        for trial in range(args.trials):
            ax, bx = marker(rng, args.bound)
            ay, by = marker(rng, args.bound)
            z_lines = [marker(rng, args.bound) for _ in range(6)]
            line = fmpz_poly()
            for i in row_support:
                line += (
                    restrict_line(matrices[(i, j)], ax, bx, ay, by)
                    * affine_power(*z_lines[i], 1)
                )
            result = audit_line(line)
            record = {
                "fixed_j": j,
                "trial": trial,
                "XY_line": [ax, bx, ay, by],
                "z_lines": z_lines,
                **result,
            }
            row_records.append(record)
            if not result["real_rooted"]:
                row_failure = record
                break
        if row_failure:
            break

    report = {
        "status": "EXACT_OBSTRUCTION" if failure or row_failure else "FINITE_SCREEN_CLEAN",
        "N": args.N,
        "d": args.d,
        "seed": args.seed,
        "requested_trials": args.trials,
        "support_size": len(support),
        "common_integer_scale": scale,
        "bilinear_multiaffine_failure": failure,
        "row_linear_multiaffine_failure": row_failure,
        "bilinear_records": records,
        "row_records": row_records,
        "scope": (
            "An exact non-real-rooted positive-direction affine restriction "
            "disproves the corresponding multiaffine parent.  A clean finite "
            "screen is not a proof."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
