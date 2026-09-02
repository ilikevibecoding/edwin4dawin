#!/usr/bin/env python3
"""Test a single Hermitian tridiagonal-pencil model for centered group targets.

Write the centered endpoint polynomial as

    Q(x,c) = G(x+c,x-c) = sum_s Q_s(x,c),

where Q_s has total degree n-s and n=2N-d.  A representation

    Q(x,c) = kappa det(x I + c B + A)

with real symmetric A,B would prove that Q(.,c) is real-rooted for every
real c.  Diagonalize B.  This probe tests the particularly rigid ansatz that
A is tridiagonal in that eigenbasis.

The top layer determines the diagonal entries of B.  The next layer
determines diag(A), and the second-next layer uniquely determines the squares
of the n-1 tridiagonal couplings.  The script then rebuilds every remaining
homogeneous layer by the continuant recurrence and reports the residual.

This is a numerical structure-discovery probe, not a proof.
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


def centered_layers(m: int) -> tuple[int, sp.Rational, list[sp.Poly]]:
    N = 3 * m + 4
    d = 2 * m + 5
    centered_c = sp.Poly(sp.expand(group(N, d).subs({X: x + c, Y: x - c})), x)
    centered_a = sp.Poly(
        sum(even_polynomial(coefficient).as_expr() * x**degree
            for (degree,), coefficient in centered_c.terms()),
        x,
        a,
    )
    n = centered_c.degree()
    layers = []
    for deficit in range(n + 1):
        expression = sum(
            coefficient * x**x_degree
            for (x_degree, a_degree), coefficient in centered_a.terms()
            if x_degree + 2 * a_degree == n - deficit
        )
        layers.append(sp.Poly(sp.expand(expression), x, domain=sp.QQ))
    kappa = layers[0].LC()
    normalized = [sp.Poly(layer.as_expr() / kappa, x) for layer in layers]
    assert normalized[0].LC() == 1
    return n, kappa, normalized


def evaluate(poly: sp.Poly, value: mp.mpf) -> mp.mpf:
    result = mp.mpf("0")
    for coefficient in poly.all_coeffs():
        result = result * value + mp.mpf(str(coefficient.p)) / mp.mpf(str(coefficient.q))
    return result


def multiply(first: list[mp.mpf], second: list[mp.mpf]) -> list[mp.mpf]:
    result = [mp.mpf("0")] * (len(first) + len(second) - 1)
    for i, left in enumerate(first):
        for j, right in enumerate(second):
            result[i + j] += left * right
    return result


def add_scaled(target: list[mp.mpf], source: list[mp.mpf], scale: mp.mpf) -> None:
    if len(target) < len(source):
        target.extend([mp.mpf("0")] * (len(source) - len(target)))
    for index, value in enumerate(source):
        target[index] += scale * value


def product_excluding(b_values: list[mp.mpf], excluded: set[int]) -> list[mp.mpf]:
    # Ascending powers of x.
    result = [mp.mpf("1")]
    for index, value in enumerate(b_values):
        if index not in excluded:
            result = multiply(result, [value, mp.mpf("1")])
    return result


def exact_layer_coefficients(poly: sp.Poly) -> list[mp.mpf]:
    return [
        mp.mpf(str(poly.nth(power).p)) / mp.mpf(str(poly.nth(power).q))
        for power in range(poly.degree() + 1)
    ] if not poly.is_zero else [mp.mpf("0")]


def reconstruct(m: int, digits: int) -> dict:
    mp.mp.dps = digits
    n, kappa, layers = centered_layers(m)
    roots_sp = sp.nroots(layers[0].as_expr(), n=digits, maxsteps=1000)
    roots = sorted(mp.mpf(str(sp.re(root))) for root in roots_sp)
    max_root_imag = max(abs(mp.mpf(str(sp.im(root)))) for root in roots_sp)
    b_values = [-root for root in roots]

    derivative = layers[0].diff()
    a_diagonal = [evaluate(layers[1], root) / evaluate(derivative, root) for root in roots]

    diagonal_second = [mp.mpf("0")] * (n - 1)
    for i in range(n):
        for j in range(i + 1, n):
            add_scaled(
                diagonal_second,
                product_excluding(b_values, {i, j}),
                a_diagonal[i] * a_diagonal[j],
            )
    target_second = exact_layer_coefficients(layers[2])
    target_second.extend([mp.mpf("0")] * (n - 1 - len(target_second)))
    residual_second = [
        diagonal_second[index] - target_second[index]
        for index in range(n - 1)
    ]

    # The adjacent-exclusion basis has n-1 elements and degree at most n-2.
    basis = [product_excluding(b_values, {i, i + 1}) for i in range(n - 1)]
    matrix = mp.matrix(n - 1, n - 1)
    rhs = mp.matrix(n - 1, 1)
    for row in range(n - 1):
        rhs[row] = residual_second[row]
        for column in range(n - 1):
            matrix[row, column] = basis[column][row]
    coupling_squares_matrix = mp.lu_solve(matrix, rhs)
    coupling_squares = [coupling_squares_matrix[index] for index in range(n - 1)]

    # Polynomial in ascending (x,t) powers, represented by a dictionary.
    def linear(index: int) -> dict[tuple[int, int], mp.mpf]:
        return {
            (1, 0): mp.mpf("1"),
            (0, 0): b_values[index],
            (0, 1): a_diagonal[index],
        }

    def product2(
        first: dict[tuple[int, int], mp.mpf],
        second: dict[tuple[int, int], mp.mpf],
    ) -> dict[tuple[int, int], mp.mpf]:
        out: dict[tuple[int, int], mp.mpf] = {}
        for (ix, it), left in first.items():
            for (jx, jt), right in second.items():
                key = (ix + jx, it + jt)
                out[key] = out.get(key, mp.mpf("0")) + left * right
        return out

    previous = {(0, 0): mp.mpf("1")}
    current = linear(0)
    for index in range(1, n):
        following = product2(linear(index), current)
        for (ix, it), value in previous.items():
            key = (ix, it + 2)
            following[key] = following.get(key, mp.mpf("0")) - coupling_squares[index - 1] * value
        previous, current = current, following

    max_absolute_residual = mp.mpf("0")
    max_relative_residual = mp.mpf("0")
    layer_residuals = []
    for deficit, target in enumerate(layers):
        target_coefficients = exact_layer_coefficients(target)
        degree = n - deficit
        absolute = mp.mpf("0")
        relative = mp.mpf("0")
        for power in range(max(degree, target.degree()) + 1):
            actual = current.get((power, deficit), mp.mpf("0"))
            expected = target_coefficients[power] if power < len(target_coefficients) else mp.mpf("0")
            error = abs(actual - expected)
            absolute = max(absolute, error)
            relative = max(relative, error / max(mp.mpf("1"), abs(expected)))
        max_absolute_residual = max(max_absolute_residual, absolute)
        max_relative_residual = max(max_relative_residual, relative)
        layer_residuals.append(mp.nstr(relative, 12))

    return {
        "m": m,
        "N": 3 * m + 4,
        "d": 2 * m + 5,
        "degree": n,
        "kappa": str(kappa),
        "max_top_root_imaginary_part": mp.nstr(max_root_imag, 12),
        "minimum_coupling_square": mp.nstr(min(coupling_squares), 20),
        "maximum_coupling_square": mp.nstr(max(coupling_squares), 20),
        "all_coupling_squares_positive": all(value > 0 for value in coupling_squares),
        "max_absolute_residual": mp.nstr(max_absolute_residual, 12),
        "max_relative_residual": mp.nstr(max_relative_residual, 12),
        "layer_relative_residuals": layer_residuals,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-m", type=int, default=2)
    parser.add_argument("--digits", type=int, default=100)
    parser.add_argument(
        "--output",
        type=Path,
        default=HERE / "centered_tridiagonal_pencil_probe_20260804.json",
    )
    args = parser.parse_args()
    records = []
    for m in range(args.max_m + 1):
        record = reconstruct(m, args.digits)
        records.append(record)
        print(
            f"m={m} degree={record['degree']} positive={record['all_coupling_squares_positive']} "
            f"residual={record['max_relative_residual']}",
            flush=True,
        )
    report = {
        "status": "TRIDIAGONAL_PENCIL_DISCOVERY_PROBE",
        "ansatz": "Q(x,c)=kappa det(xI+c diag(b)+tridiag(A))",
        "scope": "Numerical reconstruction; small residual is evidence, not proof.",
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
