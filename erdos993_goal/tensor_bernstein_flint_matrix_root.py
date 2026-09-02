#!/usr/bin/env python3
"""Chunked FLINT-matrix tensor Bernstein transform with an exact self-test."""

from __future__ import annotations

import math

import numpy as np
from flint import fmpq, fmpq_mat


def tensor_bernstein_from_flint_matrix(poly, dimension: int, chunk_columns: int = 4096):
    """Return tensor Bernstein coefficients using C-level rational matrices.

    This is algebraically identical to the established axis-by-axis transform,
    but it moves each bounded column chunk through an fmpq_mat multiplication.
    The chunk bound prevents simultaneous dense input/output FLINT matrices from
    doubling the full tensor's peak memory.
    """
    terms = list(poly.terms())
    degrees = tuple(
        max((monomial[axis] for monomial, _ in terms), default=0)
        for axis in range(dimension)
    )
    coefficients = np.empty(tuple(degree + 1 for degree in degrees), dtype=object)
    coefficients.fill(fmpq(0))
    for monomial, coefficient in terms:
        coefficients[monomial] = coefficient

    for axis, degree in enumerate(degrees):
        if degree == 0:
            continue
        moved = np.moveaxis(coefficients, axis, 0)
        remaining_shape = moved.shape[1:]
        flat = moved.reshape((degree + 1, -1))
        transformed = np.empty_like(flat)
        matrix = fmpq_mat(
            [
                [
                    fmpq(math.comb(index, exponent), math.comb(degree, exponent))
                    if exponent <= index
                    else fmpq(0)
                    for exponent in range(degree + 1)
                ]
                for index in range(degree + 1)
            ]
        )
        for start in range(0, flat.shape[1], chunk_columns):
            stop = min(flat.shape[1], start + chunk_columns)
            block = fmpq_mat(
                [list(flat[row, start:stop]) for row in range(degree + 1)]
            )
            entries = (matrix * block).entries()
            width = stop - start
            for row in range(degree + 1):
                transformed[row, start:stop] = entries[row * width:(row + 1) * width]
        coefficients = np.moveaxis(
            transformed.reshape((degree + 1, *remaining_shape)), 0, axis
        )
    return degrees, coefficients, len(terms)


def _reference(poly, dimension: int):
    from certify_rank8_delta4_junction_coupled_box import tensor_bernstein_from_flint

    return tensor_bernstein_from_flint(poly, dimension)


def self_test() -> None:
    from flint import fmpq_mpoly_ctx

    context = fmpq_mpoly_ctx.get(["A", "B", "C"])
    polynomial = context.from_dict(
        {
            (0, 0, 0): fmpq(7, 11),
            (1, 0, 2): fmpq(-5, 13),
            (2, 3, 0): fmpq(19, 17),
            (4, 1, 1): fmpq(-23, 29),
            (3, 2, 2): fmpq(31, 37),
        }
    )
    expected_degrees, expected, expected_terms = _reference(polynomial, 3)
    for chunk in (1, 2, 3, 7, 64):
        degrees, actual, terms = tensor_bernstein_from_flint_matrix(
            polynomial, 3, chunk
        )
        assert degrees == expected_degrees
        assert terms == expected_terms
        assert actual.shape == expected.shape
        assert all(actual.flat[j] == expected.flat[j] for j in range(actual.size))
    print("PASS_EXACT_FLINT_MATRIX_TENSOR_BERNSTEIN_SELF_TEST")


if __name__ == "__main__":
    self_test()
