#!/usr/bin/env python3
"""Exact regression check for the sparse tensor-Bernstein implementation."""

import itertools
import copy

import sympy as sp

from probe_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_rank4_ratio_g1_nonadjacent import (
    multinomial,
    rows_hash,
    shift_and_homogenize,
    tensor_bernstein_general,
    weak_compositions,
)


def reference(polynomial, power_count, cube_count):
    terms = polynomial.terms()
    degrees = [
        max(monomial[power_count + index] for monomial, _ in terms)
        for index in range(cube_count)
    ]
    rows = []
    for indices in itertools.product(*(range(degree + 1) for degree in degrees)):
        row = {}
        for monomial, coefficient in terms:
            powers = monomial[power_count:power_count + cube_count]
            if any(power > index for power, index in zip(powers, indices)):
                continue
            factor = sp.prod(
                sp.binomial(index, power) / sp.binomial(degree, power)
                for index, power, degree in zip(indices, powers, degrees)
            )
            key = (*monomial[:power_count], *monomial[power_count + cube_count:])
            row[key] = row.get(key, 0) + coefficient * factor
        rows.append({key: sp.cancel(value) for key, value in row.items() if value})
    return degrees, rows


def reference_shift(rows, power_count, simplex_length, threshold=13):
    output = []
    minimum = None
    positive = negative = 0
    for row in rows:
        shifted = {}
        for key, coefficient in row.items():
            n_power = key[0]
            for new_power in range(n_power + 1):
                new_key = (new_power, *key[1:])
                shifted[new_key] = shifted.get(new_key, 0) + (
                    coefficient * sp.binomial(n_power, new_power)
                    * threshold ** (n_power - new_power)
                )
        shifted = {key: sp.cancel(value) for key, value in shifted.items() if value}
        degree = max(sum(key[power_count:]) for key in shifted)
        homogeneous = {}
        for key, coefficient in shifted.items():
            missing = degree - sum(key[power_count:])
            for extra in weak_compositions(missing, simplex_length):
                new_key = (
                    *key[:power_count],
                    *(left + right for left, right in zip(key[power_count:], extra)),
                )
                homogeneous[new_key] = homogeneous.get(new_key, 0) + (
                    coefficient * multinomial(missing, extra)
                )
        homogeneous = {key: sp.cancel(value) for key, value in homogeneous.items() if value}
        for value in homogeneous.values():
            if value >= 0:
                positive += 1
            else:
                negative += 1
            minimum = value if minimum is None or value < minimum else minimum
        output.append(homogeneous)
    return positive, negative, minimum, rows_hash(output)


def main():
    variables = sp.symbols("N h A B w tau z0 z1")
    N, h, A, B, w, tau, z0, z1 = variables
    expression = sp.expand(
        7 * N**3 * A**2 * w * z0
        - 5 * h * B**3 * tau**2 * z1
        + 11 * N * h**2 * A * B * w**2 * tau
        + 13 * A**2 * B**2 * tau**3 * z0 * z1
        - 17 * N**2 * w**2 * z1**2
        + 19
    )
    polynomial = sp.Poly(expression, *variables)
    expected = reference(polynomial, 2, 4)
    actual = tensor_bernstein_general(polynomial, 2, 4)
    assert actual == expected
    expected_shift = reference_shift(expected[1], 2, 2)
    actual_shift = shift_and_homogenize(
        copy.deepcopy(actual[1]), 2, 2, progress=False
    )
    assert actual_shift == expected_shift
    print("PASS_EXACT_TENSOR_BERNSTEIN_GENERAL_SPARSE_STREAM_EQUIVALENCE")


if __name__ == "__main__":
    main()
