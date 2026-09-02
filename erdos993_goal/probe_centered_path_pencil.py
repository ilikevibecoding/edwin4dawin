#!/usr/bin/env python3
"""Test whether each centered group endpoint is a weighted path determinant.

For Q(x,c)=G(x+c,x-c), put a=c^2 and normalize Q to be monic in x.
The ansatz is

    Q(x,c) = kappa det(x I + diag(lambda_1,...,lambda_n) + c A_path),

where A_path has edge weights w_1,...,w_(n-1).  Equivalently,

    Q/kappa = sum_M (-a)^|M| prod_(e in M) w_e^2
                      prod_(v not covered by M) (x+lambda_v),

summed over path matchings.  The specialization a=0 fixes the lambda values.
The coefficient of a then uniquely fixes the edge-weight squares once the
lambda values are ordered.  Every higher coefficient is a prediction.

An exact all-order identity of this form would immediately prove the
equal-direction real-rootedness obligation.  This script is a numerical
structure-discovery probe only.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import mpmath as mp
import sympy as sp

from probe_group_equal_direction_subdiscriminants import a, c, even_polynomial, x
from verify_quadratic_component_square_root_lowering import X, Y, group


HERE = Path(__file__).resolve().parent


def centered_polynomial(m: int) -> tuple[sp.Rational, sp.Poly]:
    N = 3 * m + 4
    d = 2 * m + 5
    centered_c = sp.Poly(sp.expand(group(N, d).subs({X: x + c, Y: x - c})), x)
    centered_a = sp.Poly(
        sum(even_polynomial(coefficient).as_expr() * x**degree
            for (degree,), coefficient in centered_c.terms()),
        x,
        a,
    )
    kappa = sp.Poly(centered_a.as_expr(), x).LC()
    normalized = sp.Poly(centered_a.as_expr() / kappa, x, a)
    return kappa, normalized


def multiply(first: list[mp.mpf], second: list[mp.mpf]) -> list[mp.mpf]:
    result = [mp.mpf("0")] * (len(first) + len(second) - 1)
    for i, left in enumerate(first):
        for j, right in enumerate(second):
            result[i + j] += left * right
    return result


def product_excluding(values: list[mp.mpf], excluded: set[int]) -> list[mp.mpf]:
    result = [mp.mpf("1")]
    for index, value in enumerate(values):
        if index not in excluded:
            result = multiply(result, [value, mp.mpf("1")])
    return result


def rational_to_mpf(value: sp.Rational) -> mp.mpf:
    return mp.mpf(str(value.p)) / mp.mpf(str(value.q))


def reconstruct(m: int, digits: int, reverse_alternate: bool) -> dict:
    mp.mp.dps = digits
    kappa, polynomial = centered_polynomial(m)
    at_zero = sp.Poly(polynomial.as_expr().subs(a, 0), x, domain=sp.QQ)
    roots_sp = sp.nroots(at_zero.as_expr(), n=digits, maxsteps=1000)
    roots = sorted(mp.mpf(str(sp.re(root))) for root in roots_sp)
    max_root_imag = max(abs(mp.mpf(str(sp.im(root)))) for root in roots_sp)
    lambdas = [-root for root in roots]
    if reverse_alternate:
        # A second natural path order: take roots alternately from the two
        # ends.  It is useful when the ordinary sorted order fails.
        reordered = []
        left, right = 0, len(lambdas) - 1
        while left <= right:
            reordered.append(lambdas[left])
            left += 1
            if left <= right:
                reordered.append(lambdas[right])
                right -= 1
        lambdas = reordered

    n = len(lambdas)
    coefficient_a1 = sp.Poly(polynomial.as_expr(), a).coeff_monomial(a)
    target_a1 = sp.Poly(-coefficient_a1, x, domain=sp.QQ)
    target_coefficients = [rational_to_mpf(target_a1.nth(power)) for power in range(n - 1)]
    basis = [product_excluding(lambdas, {i, i + 1}) for i in range(n - 1)]
    matrix = mp.matrix(n - 1, n - 1)
    rhs = mp.matrix(n - 1, 1)
    for row in range(n - 1):
        rhs[row] = target_coefficients[row]
        for column in range(n - 1):
            matrix[row, column] = basis[column][row]
    weights_matrix = mp.lu_solve(matrix, rhs)
    weights = [weights_matrix[index] for index in range(n - 1)]

    # Continuant with coefficients keyed by ascending (x,a) powers.
    def linear(value: mp.mpf) -> dict[tuple[int, int], mp.mpf]:
        return {(1, 0): mp.mpf("1"), (0, 0): value}

    def product2(first, second):
        result = {}
        for (ix, ia), left in first.items():
            for (jx, ja), right in second.items():
                key = (ix + jx, ia + ja)
                result[key] = result.get(key, mp.mpf("0")) + left * right
        return result

    previous = {(0, 0): mp.mpf("1")}
    current = linear(lambdas[0])
    for index in range(1, n):
        following = product2(linear(lambdas[index]), current)
        for (ix, ia), value in previous.items():
            key = (ix, ia + 1)
            following[key] = following.get(key, mp.mpf("0")) - weights[index - 1] * value
        previous, current = current, following

    max_relative_residual = mp.mpf("0")
    residual_by_a_degree = []
    for a_degree in range(polynomial.degree(a) + 1):
        relative = mp.mpf("0")
        for x_degree in range(n - 2 * a_degree + 1):
            expected = rational_to_mpf(polynomial.coeff_monomial(x**x_degree * a**a_degree))
            actual = current.get((x_degree, a_degree), mp.mpf("0"))
            relative = max(relative, abs(actual - expected) / max(mp.mpf("1"), abs(expected)))
        max_relative_residual = max(max_relative_residual, relative)
        residual_by_a_degree.append(mp.nstr(relative, 12))

    return {
        "m": m,
        "N": 3 * m + 4,
        "d": 2 * m + 5,
        "degree": n,
        "kappa": str(kappa),
        "root_order": "alternating_ends" if reverse_alternate else "increasing",
        "max_a0_root_imaginary_part": mp.nstr(max_root_imag, 12),
        "minimum_edge_weight_square": mp.nstr(min(weights), 20),
        "maximum_edge_weight_square": mp.nstr(max(weights), 20),
        "all_edge_weight_squares_positive": all(value > 0 for value in weights),
        "max_relative_residual": mp.nstr(max_relative_residual, 12),
        "residual_by_a_degree": residual_by_a_degree,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-m", type=int, default=2)
    parser.add_argument("--digits", type=int, default=100)
    parser.add_argument("--alternating-ends", action="store_true")
    parser.add_argument(
        "--output",
        type=Path,
        default=HERE / "centered_path_pencil_probe_20260804.json",
    )
    args = parser.parse_args()
    records = []
    for m in range(args.max_m + 1):
        record = reconstruct(m, args.digits, args.alternating_ends)
        records.append(record)
        print(
            f"m={m} degree={record['degree']} positive={record['all_edge_weight_squares_positive']} "
            f"residual={record['max_relative_residual']}",
            flush=True,
        )
    report = {
        "status": "CENTERED_PATH_PENCIL_DISCOVERY_PROBE",
        "ansatz": "Q/kappa=det(xI+diag(lambda)+c A_path)",
        "scope": "Numerical reconstruction; small residual is evidence, not proof.",
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
