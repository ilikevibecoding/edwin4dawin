#!/usr/bin/env python3
"""Independent exact tensor-grid identity audit for the gap-1 product rows.

The producer caches are rational functions of k,x,y.  This audit evaluates a
separately implemented coefficient-array convolution using Fraction arithmetic
and compares every cached row on a determining tensor grid.  The explicit
degree envelope is deliberately much larger than the structural bound obtained
after clearing the displayed universal denominator.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import pickle
from fractions import Fraction
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_right_gap1_rows_interpolation_audit_root_20260827.json"
PRODUCTS = (("T", "T"), ("T", "L"), ("T", "R"),
            ("L", "L"), ("L", "R"), ("R", "R"))
CACHES = {
    degree: HERE / f"uniform_low_high_right_gap1_s{degree}_product_coefficients_root.pkl"
    for degree in range(1, 5)
}
# The independently mirrored rational-degree DAG computes the actual bound at
# runtime.  The envelope below is deliberately much larger and fails closed if
# the mechanically propagated bound ever exceeds it.
DEGREE_ENVELOPE = (32, 24, 32)
FACTOR_DEGREES = (
    (1, 1, 0),  # N=k+x
    (1, 0, 1),  # M=k+y
    (2, 0, 2),  # D=(k+y)^2-1
    (0, 1, 0),  # x+2
    (0, 0, 1),  # y+2
    (0, 0, 1),  # y+3
)
N_FACTOR, M_FACTOR, D_FACTOR, X2_FACTOR, Y2_FACTOR, Y3_FACTOR = range(6)


class RationalDegree:
    """Conservative separate-degree bound with a factored denominator."""

    def __init__(self, numerator=(0, 0, 0), denominator=None):
        self.numerator = None if numerator is None else tuple(map(int, numerator))
        self.denominator = tuple(denominator or (0,) * len(FACTOR_DEGREES))

    @classmethod
    def zero(cls):
        return cls(None)

    @classmethod
    def constant(cls):
        return cls((0, 0, 0))

    def divide_factor(self, factor, power=1):
        if self.numerator is None:
            return self
        denominator = list(self.denominator)
        denominator[factor] += power
        return RationalDegree(self.numerator, denominator)

    @staticmethod
    def coerce(value):
        if isinstance(value, RationalDegree):
            return value
        return RationalDegree.zero() if value == 0 else RationalDegree.constant()

    def __add__(self, other):
        other = self.coerce(other)
        if self.numerator is None:
            return other
        if other.numerator is None:
            return self
        lcm = tuple(max(a, b) for a, b in zip(self.denominator, other.denominator))

        def lifted_degree(item):
            result = list(item.numerator)
            for exponent, old, factor_degree in zip(lcm, item.denominator, FACTOR_DEGREES):
                for axis in range(3):
                    result[axis] += (exponent - old) * factor_degree[axis]
            return tuple(result)

        first = lifted_degree(self)
        second = lifted_degree(other)
        return RationalDegree(tuple(max(a, b) for a, b in zip(first, second)), lcm)

    __radd__ = __add__

    def __neg__(self):
        return self

    def __sub__(self, other):
        return self + (-self.coerce(other))

    def __rsub__(self, other):
        return self.coerce(other) + self

    def __mul__(self, other):
        other = self.coerce(other)
        if self.numerator is None or other.numerator is None:
            return RationalDegree.zero()
        return RationalDegree(
            tuple(a + b for a, b in zip(self.numerator, other.numerator)),
            tuple(a + b for a, b in zip(self.denominator, other.denominator)),
        )

    __rmul__ = __mul__

    def __pow__(self, power):
        assert isinstance(power, int) and power >= 0
        if power == 0:
            return RationalDegree.constant()
        if self.numerator is None:
            return RationalDegree.zero()
        return RationalDegree(
            tuple(power * value for value in self.numerator),
            tuple(power * value for value in self.denominator),
        )

    def denominator_degree(self):
        result = [0, 0, 0]
        for exponent, factor_degree in zip(self.denominator, FACTOR_DEGREES):
            for axis in range(3):
                result[axis] += exponent * factor_degree[axis]
        return tuple(result)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add_poly(*rows):
    size = max(len(row) for row in rows)
    return tuple(
        sum([
            row[index] if index < len(row) else Fraction(0)
            for row in rows
        ], Fraction(0))
        for index in range(size)
    )


def scale_poly(row, scalar):
    scalar = Fraction(scalar)
    return tuple(scalar * value for value in row)


def multiply_poly(first, second):
    result = [Fraction(0)] * (len(first) + len(second) - 1)
    for i, left in enumerate(first):
        for j, right in enumerate(second):
            result[i + j] += left * right
    return tuple(result)


def quadratic_poly(row):
    return add_poly(
        multiply_poly(row[1], row[1]),
        scale_poly(multiply_poly(row[0], row[2]), -1),
        scale_poly(multiply_poly(row[0], row[1]), -1),
    )


def bilinear_poly(first, second):
    return add_poly(
        scale_poly(multiply_poly(first[1], second[1]), 2),
        scale_poly(multiply_poly(first[0], second[2]), -1),
        scale_poly(multiply_poly(first[2], second[0]), -1),
        scale_poly(multiply_poly(first[0], second[1]), -1),
        scale_poly(multiply_poly(first[1], second[0]), -1),
    )


def build_rows_numeric(k: int, x: int, y: int):
    N, M = k + x, k + y
    D = M * M - 1
    zero = (Fraction(0),) * 3
    rs, rl, rr = N + M - k + 1, x + 1, y + 1
    base = {
        "T": tuple(Fraction((N + 1) * (M + 1) * value, N * M)
                   for value in (1, rs, rs * (rs - 1))),
        "L": tuple(Fraction(-(N + 1) * value, N * M)
                   for value in (1, rl, rl * (rl - 1))),
        "R": tuple(Fraction(-(M + 1) * value, N * M)
                   for value in (1, rr, rr * (rr - 1))),
    }
    left_previous = Fraction(N + 1, N)
    left_high = {
        "T": zero,
        "L": (left_previous, left_previous * (x + 1),
              left_previous * x * (x + 1)),
        "R": zero,
    }
    prior = (left_previous / (x + 2), left_previous,
             left_previous * (x + 1))
    first = {
        "T": zero,
        "L": tuple((k - 1 + index) * prior[index] for index in range(3)),
        "R": zero,
    }
    right_previous = Fraction(M + 1, M)
    removed = {
        "T": zero,
        "L": zero,
        "R": (
            right_previous * (
                1 + Fraction((k - 1) * (N + 1), y + 2)
                + Fraction((k - 1) * (k - 2) * (N * N - 1),
                           2 * (y + 2) * (y + 3))
            ),
            right_previous * (
                y + 1 + k * (N + 1)
                + Fraction(k * (k - 1) * (N * N - 1), 2 * (y + 2))
            ),
            right_previous * (
                y * (y + 1) + (k + 1) * (N + 1) * (y + 1)
                + Fraction(k * (k + 1) * (N * N - 1), 2)
            ),
        ),
    }
    base_tail = {
        basis: tuple(base[basis][index] - removed[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    whole_remainder = {
        basis: tuple(base[basis][index] - left_high[basis][index]
                     - (M + 1) * first[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    tail_remainder = {
        basis: tuple(base_tail[basis][index] - left_high[basis][index]
                     - (M + 1) * first[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    whole = {}
    tail = {}
    for basis in ("T", "L", "R"):
        whole[basis] = tuple((
            base[basis][index],
            first[basis][index] + Fraction(2 * M, D) * whole_remainder[basis][index],
            Fraction(whole_remainder[basis][index], D),
        ) for index in range(3))
        tail[basis] = tuple((
            base_tail[basis][index],
            first[basis][index] + Fraction(2 * M, D) * tail_remainder[basis][index],
            Fraction(tail_remainder[basis][index], D),
        ) for index in range(3))

    rows = {(degree, product): Fraction(0)
            for degree in range(1, 5) for product in PRODUCTS}
    for first_basis, second_basis in PRODUCTS:
        if first_basis == second_basis:
            polynomial = add_poly(
                scale_poly(quadratic_poly(whole[first_basis]), N - 2),
                bilinear_poly(whole[first_basis], tail[first_basis]),
            )
        else:
            polynomial = add_poly(
                scale_poly(bilinear_poly(whole[first_basis], whole[second_basis]), N - 2),
                bilinear_poly(whole[first_basis], tail[second_basis]),
                bilinear_poly(whole[second_basis], tail[first_basis]),
            )
        for degree in range(1, 5):
            scale = (N * M) ** 2 * (D if degree == 1 else D**2)
            rows[(degree, (first_basis, second_basis))] = polynomial[degree] * scale
    return rows


def degree_add_poly(*rows):
    size = max(len(row) for row in rows)
    return tuple(
        sum((row[index] if index < len(row) else RationalDegree.zero()
             for row in rows), RationalDegree.zero())
        for index in range(size)
    )


def degree_scale_poly(row, scalar):
    return tuple(value * scalar for value in row)


def degree_multiply_poly(first, second):
    result = [RationalDegree.zero()
              for _ in range(len(first) + len(second) - 1)]
    for i, left in enumerate(first):
        for j, right in enumerate(second):
            result[i + j] = result[i + j] + left * right
    return tuple(result)


def degree_quadratic_poly(row):
    return degree_add_poly(
        degree_multiply_poly(row[1], row[1]),
        degree_multiply_poly(row[0], row[2]),
        degree_multiply_poly(row[0], row[1]),
    )


def degree_bilinear_poly(first, second):
    return degree_add_poly(
        degree_multiply_poly(first[1], second[1]),
        degree_multiply_poly(first[0], second[2]),
        degree_multiply_poly(first[2], second[0]),
        degree_multiply_poly(first[0], second[1]),
        degree_multiply_poly(first[1], second[0]),
    )


def build_rows_degree_bounds():
    """Mirror build_rows_numeric using only rational multidegree envelopes."""
    one = RationalDegree.constant()
    zero = RationalDegree.zero()
    k = RationalDegree((1, 0, 0))
    x = RationalDegree((0, 1, 0))
    y = RationalDegree((0, 0, 1))
    N = RationalDegree((1, 1, 0))
    M = RationalDegree((1, 0, 1))
    D = RationalDegree((2, 0, 2))
    rs = RationalDegree((1, 1, 1))
    rl = RationalDegree((0, 1, 0))
    rr = RationalDegree((0, 0, 1))

    def divided(value, *factors):
        for factor in factors:
            value = value.divide_factor(factor)
        return value

    base = {
        "T": tuple(divided((N + one) * (M + one) * value,
                            N_FACTOR, M_FACTOR)
                   for value in (one, rs, rs * rs)),
        "L": tuple(divided((N + one) * value, N_FACTOR, M_FACTOR)
                   for value in (one, rl, rl * rl)),
        "R": tuple(divided((M + one) * value, N_FACTOR, M_FACTOR)
                   for value in (one, rr, rr * rr)),
    }
    left_previous = divided(N + one, N_FACTOR)
    left_high = {
        "T": (zero, zero, zero),
        "L": (left_previous, left_previous * (x + one),
              left_previous * x * (x + one)),
        "R": (zero, zero, zero),
    }
    prior = (divided(left_previous, X2_FACTOR), left_previous,
             left_previous * (x + one))
    first = {
        "T": (zero, zero, zero),
        "L": tuple((k + one) * prior[index] for index in range(3)),
        "R": (zero, zero, zero),
    }
    right_previous = divided(M + one, M_FACTOR)
    n_square_minus_one = RationalDegree((2, 2, 0))
    k_linear = RationalDegree((1, 0, 0))
    removed = {
        "T": (zero, zero, zero),
        "L": (zero, zero, zero),
        "R": (
            right_previous * (
                one
                + divided(k_linear * (N + one), Y2_FACTOR)
                + divided(k_linear * k_linear * n_square_minus_one,
                          Y2_FACTOR, Y3_FACTOR)
            ),
            right_previous * (
                y + one + k * (N + one)
                + divided(k_linear * k_linear * n_square_minus_one, Y2_FACTOR)
            ),
            right_previous * (
                y * (y + one) + (k + one) * (N + one) * (y + one)
                + k_linear * k_linear * n_square_minus_one
            ),
        ),
    }
    base_tail = {
        basis: tuple(base[basis][index] + removed[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    whole_remainder = {
        basis: tuple(base[basis][index] + left_high[basis][index]
                     + (M + one) * first[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    tail_remainder = {
        basis: tuple(base_tail[basis][index] + left_high[basis][index]
                     + (M + one) * first[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    two_m_over_d = divided(M, D_FACTOR)
    one_over_d = divided(one, D_FACTOR)
    whole = {}
    tail = {}
    for basis in ("T", "L", "R"):
        whole[basis] = tuple((
            base[basis][index],
            first[basis][index] + two_m_over_d * whole_remainder[basis][index],
            one_over_d * whole_remainder[basis][index],
        ) for index in range(3))
        tail[basis] = tuple((
            base_tail[basis][index],
            first[basis][index] + two_m_over_d * tail_remainder[basis][index],
            one_over_d * tail_remainder[basis][index],
        ) for index in range(3))

    scale_d1 = (N * M) ** 2 * D
    scale_d2 = (N * M) ** 2 * D**2
    rows = {}
    for first_basis, second_basis in PRODUCTS:
        if first_basis == second_basis:
            polynomial = degree_add_poly(
                degree_scale_poly(degree_quadratic_poly(whole[first_basis]), N),
                degree_bilinear_poly(whole[first_basis], tail[first_basis]),
            )
        else:
            polynomial = degree_add_poly(
                degree_scale_poly(
                    degree_bilinear_poly(whole[first_basis], whole[second_basis]), N
                ),
                degree_bilinear_poly(whole[first_basis], tail[second_basis]),
                degree_bilinear_poly(whole[second_basis], tail[first_basis]),
            )
        for degree in range(1, 5):
            rows[(degree, (first_basis, second_basis))] = (
                polynomial[degree] * (scale_d1 if degree == 1 else scale_d2)
            )
    return rows


def compile_rational(expression, k, x, y):
    numerator, denominator = sp.fraction(sp.cancel(expression))
    numerator_function = sp.lambdify((k, x, y), numerator, modules="math", cse=True)
    denominator_function = sp.lambdify((k, x, y), denominator, modules="math", cse=True)

    def evaluate(k_value, x_value, y_value):
        return Fraction(
            int(numerator_function(k_value, x_value, y_value)),
            int(denominator_function(k_value, x_value, y_value)),
        )

    return evaluate


def main() -> int:
    k_symbol, x_symbol, y_symbol = sp.symbols("k x y", real=True)
    evaluators = {}
    cache_hashes = {}
    cache_degrees = {}
    cache_degree_pairs = {}
    for degree, path in CACHES.items():
        cache_hashes[path.name] = sha256(path)
        with path.open("rb") as stream:
            rows = pickle.load(stream)
        assert set(rows) == set(PRODUCTS)
        for product, expression in rows.items():
            evaluators[(degree, product)] = compile_rational(
                expression, k_symbol, x_symbol, y_symbol
            )
            numerator, denominator = sp.fraction(sp.cancel(expression))
            if numerator:
                numerator_degrees = tuple(map(int, sp.Poly(
                    numerator, k_symbol, x_symbol, y_symbol
                ).degree_list()))
            else:
                numerator_degrees = (0, 0, 0)
            denominator_degrees = tuple(map(int, sp.Poly(
                denominator, k_symbol, x_symbol, y_symbol
            ).degree_list()))
            cache_degrees[f"s{degree}_{product[0]}_{product[1]}"] = {
                "numerator": list(numerator_degrees),
                "denominator": list(denominator_degrees),
            }
            cache_degree_pairs[(degree, product)] = (
                numerator_degrees, denominator_degrees
            )

    direct_degree_rows = build_rows_degree_bounds()
    maximum_denominator_factor_powers = [
        max(row.denominator[index] for row in direct_degree_rows.values())
        for index in range(len(FACTOR_DEGREES))
    ]
    assert all(power <= 2 for power in maximum_denominator_factor_powers)
    cross_difference_bounds = {}
    maximum_bound = [0, 0, 0]
    for key, direct_bound in direct_degree_rows.items():
        cached_numerator, cached_denominator = cache_degree_pairs[key]
        label = f"s{key[0]}_{key[1][0]}_{key[1][1]}"
        if direct_bound.numerator is None:
            bound = (0, 0, 0)
        else:
            direct_denominator = direct_bound.denominator_degree()
            first = tuple(a + b for a, b in zip(
                direct_bound.numerator, cached_denominator
            ))
            second = tuple(a + b for a, b in zip(
                cached_numerator, direct_denominator
            ))
            bound = tuple(max(a, b) for a, b in zip(first, second))
        assert all(value <= limit for value, limit in zip(bound, DEGREE_ENVELOPE)), (
            label, bound, DEGREE_ENVELOPE
        )
        cross_difference_bounds[label] = list(bound)
        maximum_bound = [max(a, b) for a, b in zip(maximum_bound, bound)]
    print("MECHANICAL_MAXIMUM_DEGREE_BOUND", maximum_bound, flush=True)

    comparisons = 0
    ordered_digest = hashlib.sha256()
    for k_value in range(8, 8 + DEGREE_ENVELOPE[0] + 1):
        print("GRID_K", k_value, flush=True)
        for x_value in range(DEGREE_ENVELOPE[1] + 1):
            for y_value in range(DEGREE_ENVELOPE[2] + 1):
                direct = build_rows_numeric(k_value, x_value, y_value)
                for key, value in direct.items():
                    cached = evaluators[key](k_value, x_value, y_value)
                    assert value == cached, (key, k_value, x_value, y_value, value, cached)
                    ordered_digest.update(
                        f"{key[0]}:{key[1][0]}:{key[1][1]}:{k_value}:{x_value}:{y_value}:{value}\n"
                        .encode("ascii")
                    )
                    comparisons += 1

    grid_points = math.prod(value + 1 for value in DEGREE_ENVELOPE)
    assert comparisons == grid_points * 24
    payload = {
        "schema": "uniform-low-high-right-gap1-rows-interpolation-audit-root-v1",
        "status": "PASS_INDEPENDENT_EXACT_RIGHT_GAP1_ROWS_TENSOR_INTERPOLATION_AUDIT",
        "identity_argument": {
            "universal_clearing_denominator": (
                "((k+x)(k+y)((k+y)^2-1)(x+2)(y+2)(y+3))^2"
            ),
            "maximum_direct_denominator_factor_powers": (
                maximum_denominator_factor_powers
            ),
            "mechanically_propagated_cross_difference_degree_bound": maximum_bound,
            "audited_degree_envelope": list(DEGREE_ENVELOPE),
            "tensor_grid": {
                "k": [8, 8 + DEGREE_ENVELOPE[0]],
                "x": [0, DEGREE_ENVELOPE[1]],
                "y": [0, DEGREE_ENVELOPE[2]],
                "points": grid_points,
            },
            "principle": (
                "A polynomial of separate degrees at most (dk,dx,dy) that vanishes "
                "on a (dk+1)*(dx+1)*(dy+1) tensor grid is identically zero."
            ),
        },
        "rows": 24,
        "exact_comparisons": comparisons,
        "ordered_comparisons_sha256": ordered_digest.hexdigest().upper(),
        "cache_expression_degrees": cache_degrees,
        "cross_difference_degree_bounds": cross_difference_bounds,
        "cache_sha256": cache_hashes,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This independently identifies all 24 rational product rows.  The "
            "separate payment-certificate audit is still required for positivity."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("COMPARISONS", comparisons, flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
