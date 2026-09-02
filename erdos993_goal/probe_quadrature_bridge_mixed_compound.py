"""Probe the mixed exterior-power weight of the quadrature bridge reduction.

Equation (573) uses d directions in a 2N dimensional determinant:

    I (d-4 times), B1, B1, B2, B2.

The two bridge matrices differ from I only on the four-dimensional span of
the endpoint vectors.  Spectral factorization fixes their Gram data:

    ||u||^2=||v||^2=N, |u*v|^2=N.

This script computes the exact mixed-compound blocks on that active
four-space and numerically records their smallest eigenvalues.  Positivity is
a structural signal only; an additional theorem would be needed to turn it
into real stability of the contracted determinant.
"""

from __future__ import annotations

import argparse
import itertools
import json
from math import comb, factorial
from pathlib import Path

import numpy as np
import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "quadrature_bridge_mixed_compound_probe_20260804.json"
x, y1, y2 = sp.symbols("x y1 y2")


def multinomial3(total: int, a: int, b: int, c: int) -> int:
    if min(a, b, c) < 0 or a + b + c != total:
        return 0
    return factorial(total) // (factorial(a) * factorial(b) * factorial(c))


def bridge_matrices(N: int):
    u = sp.Matrix([sp.sqrt(N), 0])
    v = sp.Matrix([1, sp.sqrt(N - 1)])
    zero = sp.zeros(2)
    identity = sp.eye(4)
    cross1 = u * u.T / sp.sqrt(2)
    cross2 = sp.I * v * v.T / sp.sqrt(2)
    K1 = zero.row_join(cross1).col_join(cross1.T.row_join(zero))
    K2 = zero.row_join(cross2).col_join(sp.conjugate(cross2.T).row_join(zero))
    return identity + K1, identity + K2


def exterior_coefficients(B1: sp.Matrix, B2: sp.Matrix, order: int):
    subsets = list(itertools.combinations(range(4), order))
    if order == 0:
        return subsets, {(0, 0, 0): sp.Matrix([[1]])}
    pencil = x * sp.eye(4) + y1 * B1 + y2 * B2
    coefficient_matrices = {
        powers: sp.zeros(len(subsets))
        for powers in itertools.product(range(order + 1), repeat=3)
        if sum(powers) == order
    }
    for row_index, rows in enumerate(subsets):
        for column_index, columns in enumerate(subsets):
            minor = sp.Poly(
                pencil.extract(rows, columns).det().expand(),
                x,
                y1,
                y2,
            )
            for powers, matrix in coefficient_matrices.items():
                matrix[row_index, column_index] = minor.coeff_monomial(
                    x ** powers[0] * y1 ** powers[1] * y2 ** powers[2]
                )
    return subsets, coefficient_matrices


def mixed_block(N: int, d: int, active_order: int, coefficient_matrices):
    outside_order = d - active_order
    outside_dimension = 2 * N - 4
    if outside_order < 0 or outside_order > outside_dimension:
        return None
    size = next(iter(coefficient_matrices.values())).rows
    block = sp.zeros(size)
    for (a, b, c), matrix in coefficient_matrices.items():
        multiplier = multinomial3(
            outside_order,
            d - 4 - a,
            2 - b,
            2 - c,
        )
        if multiplier:
            block += multiplier * matrix
    return block


def minimum_eigenvalue(matrix: sp.Matrix) -> float:
    numeric = np.array(matrix.evalf(50).tolist(), dtype=np.complex128)
    numeric = (numeric + numeric.conjugate().T) / 2
    return float(np.linalg.eigvalsh(numeric)[0])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-n", type=int, default=30)
    args = parser.parse_args()
    checks = []
    first_cone_failure = None
    first_below_success = None
    for N in range(4, args.max_n + 1):
        B1, B2 = bridge_matrices(N)
        exterior = {
            order: exterior_coefficients(B1, B2, order)[1]
            for order in range(5)
        }
        for d in range(4, N + 1):
            minima = []
            for active_order in range(5):
                block = mixed_block(N, d, active_order, exterior[active_order])
                if block is not None and block.rows:
                    minima.append((active_order, minimum_eigenvalue(block)))
            minimum = min(value for _, value in minima)
            in_cone = 2 * d - N >= 5
            positive_semidefinite = minimum >= -1e-8
            item = {
                "N": N,
                "d": d,
                "two_d_minus_N": 2 * d - N,
                "in_candidate_cone": in_cone,
                "positive_semidefinite": positive_semidefinite,
                "minimum_eigenvalue": minimum,
                "block_minima": [{"active_order": order, "minimum": value} for order, value in minima],
            }
            checks.append(item)
            if in_cone and not positive_semidefinite and first_cone_failure is None:
                first_cone_failure = item
            if not in_cone and positive_semidefinite and first_below_success is None:
                first_below_success = item
        print(f"N={N}", flush=True)

    report = {
        "status": "CONE_PSD_PROBE" if first_cone_failure is None else "CONE_FAILURE",
        "N_range": [4, args.max_n],
        "checks": checks,
        "first_cone_failure": first_cone_failure,
        "first_below_cone_success": first_below_success,
        "scope": (
            "Mixed-compound positivity is tested numerically on exact symbolic blocks. "
            "Even a clean result would still require a closure theorem."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "first_cone_failure": first_cone_failure,
        "first_below_cone_success": first_below_success,
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
