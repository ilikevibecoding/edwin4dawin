#!/usr/bin/env python3
"""Fast exact Sturm search for affine-line failures of the group endpoint.

The target is assembled as an integer coefficient matrix using the scaled
seeds p_r=r! g_r.  This avoids rebuilding every derivative after every line
substitution.  A rational Sturm chain then counts real roots exactly.

This is a counterexample search/certificate generator, not a proof of
stability when no failure is found.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from math import comb, factorial
from pathlib import Path

import sympy as sp
from flint import fmpq_poly, fmpz_mat, fmpz_poly

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


def scaled_seed_coefficients(n: int, width: int) -> list[int]:
    poly = sp.Poly(factorial(n) * hypergeometric_form(n, 1), X)
    result = [int(poly.nth(k)) for k in range(width)]
    assert all(sp.denom(poly.nth(k)) == 1 for k in range(width))
    return result


def derivative_matrix(seed: list[int], order: int) -> fmpz_mat:
    width = len(seed)
    return fmpz_mat(
        order + 1,
        width,
        [
            (
                seed[column + row]
                * factorial(column + row)
                // factorial(column)
                if column + row < width
                else 0
            )
            for row in range(order + 1)
            for column in range(width)
        ],
    )


def anti_binomial(order: int) -> fmpz_mat:
    return fmpz_mat(
        order + 1,
        order + 1,
        [
            comb(order, row) if row + column == order else 0
            for row in range(order + 1)
            for column in range(order + 1)
        ],
    )


def group_coefficient_matrix(m: int) -> fmpz_mat:
    n, d = 3 * m + 4, 2 * m + 5
    width = n + 1
    seeds = [scaled_seed_coefficients(n - shift, width) for shift in range(3)]
    orders = [d, d - 2, d - 4]
    scales = [1, -2 * n * n, n * n * (n - 1) * (n - 1)]
    result = fmpz_mat(width, width)
    for seed, order, scale in zip(seeds, orders, scales):
        derivatives = derivative_matrix(seed, order)
        result += scale * (derivatives.transpose() * anti_binomial(order) * derivatives)
    return result


def affine_power(a: int, b: int, power: int) -> fmpz_poly:
    return fmpz_poly(
        [comb(power, k) * a ** (power - k) * b**k for k in range(power + 1)]
    )


def restrict_line(
    matrix: fmpz_mat, ax: int, bx: int, ay: int, by: int
) -> fmpz_poly:
    width = matrix.nrows()
    xpowers = [affine_power(ax, bx, power) for power in range(width)]
    ypowers = [affine_power(ay, by, power) for power in range(width)]
    result = fmpz_poly()
    for row in range(width):
        right = fmpz_poly()
        for column in range(width):
            coefficient = matrix[row, column]
            if coefficient:
                right += coefficient * ypowers[column]
        if right:
            result += xpowers[row] * right
    return result


def sign(value) -> int:
    return 1 if value > 0 else -1 if value < 0 else 0


def exact_distinct_real_roots(poly: fmpz_poly) -> tuple[int, int, list[int]]:
    """Return distinct real roots, gcd degree, and Sturm degrees."""
    q = fmpq_poly(poly)
    derivative = q.derivative()
    gcd_degree = q.gcd(derivative).degree()
    sequence = [q / abs(q[q.degree()]), derivative / abs(derivative[derivative.degree()])]
    while True:
        remainder = -(sequence[-2] % sequence[-1])
        if not remainder:
            break
        remainder /= abs(remainder[remainder.degree()])
        sequence.append(remainder)

    def variations(positive_infinity: bool) -> int:
        signs = []
        for item in sequence:
            value = sign(item[item.degree()])
            if not positive_infinity and item.degree() % 2:
                value = -value
            signs.append(value)
        return sum(left != right for left, right in zip(signs, signs[1:]))

    return (
        variations(False) - variations(True),
        gcd_degree,
        [item.degree() for item in sequence],
    )


def digest(poly: fmpz_poly) -> str:
    return hashlib.sha256(str(poly).encode("ascii")).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--m", type=int, default=14)
    parser.add_argument("--trials", type=int, default=100)
    parser.add_argument("--seed", type=int, default=9931403)
    parser.add_argument("--bound", type=int, default=500)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    matrix = group_coefficient_matrix(args.m)
    expected_degree = 4 * args.m + 3
    records = []
    failure = None
    for trial in range(args.trials):
        ax = rng.randint(-args.bound, args.bound)
        ay = rng.randint(-args.bound, args.bound)
        bx = rng.randint(1, 20)
        by = rng.randint(1, 20)
        poly = restrict_line(matrix, ax, bx, ay, by)
        real, gcd_degree, sturm_degrees = exact_distinct_real_roots(poly)
        record = {
            "trial": trial,
            "line": [ax, bx, ay, by],
            "degree": poly.degree(),
            "distinct_real_roots": real,
            "gcd_degree": gcd_degree,
            "sha256": digest(poly),
        }
        records.append(record)
        print(record, flush=True)
        if poly.degree() != expected_degree or real + gcd_degree != poly.degree():
            record["sturm_degrees"] = sturm_degrees
            failure = record
            break

    report = {
        "status": "GROUP_LINE_FAILURE" if failure else "PASS_FINITE_EXACT_LINE_SEARCH",
        "m": args.m,
        "N": 3 * args.m + 4,
        "d": 2 * args.m + 5,
        "seed": args.seed,
        "requested_trials": args.trials,
        "completed_trials": len(records),
        "failure": failure,
        "records": records,
        "scope": "Finite exact line search; a pass is not a real-stability proof.",
    }
    output = Path(f"fast_group_line_sturm_search_m{args.m}_20260803.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
