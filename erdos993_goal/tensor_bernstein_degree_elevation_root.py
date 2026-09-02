#!/usr/bin/env python3
"""Exact tensor Bernstein transform at caller-specified elevated degrees."""

from __future__ import annotations

import math

import numpy as np
from flint import fmpq, fmpq_mat


def tensor_bernstein_degree_elevated(
    poly, dimension: int, target_degrees, chunk_columns: int = 4096
):
    terms = list(poly.terms())
    native = tuple(max((monomial[axis] for monomial, _ in terms), default=0)
                   for axis in range(dimension))
    degrees = tuple(map(int, target_degrees))
    assert len(degrees) == dimension
    assert all(target >= source for target, source in zip(degrees, native))
    coefficients = np.empty(tuple(degree+1 for degree in degrees), dtype=object)
    coefficients.fill(fmpq(0))
    for monomial, coefficient in terms:
        coefficients[monomial] = coefficient
    for axis, degree in enumerate(degrees):
        if degree == 0:
            continue
        moved = np.moveaxis(coefficients, axis, 0)
        remaining_shape = moved.shape[1:]
        flat = moved.reshape((degree+1, -1))
        transformed = np.empty_like(flat)
        matrix = fmpq_mat([
            [fmpq(math.comb(index, exponent), math.comb(degree, exponent))
             if exponent <= index else fmpq(0)
             for exponent in range(degree+1)]
            for index in range(degree+1)
        ])
        for start in range(0, flat.shape[1], chunk_columns):
            stop = min(flat.shape[1], start+chunk_columns)
            block = fmpq_mat([list(flat[row, start:stop]) for row in range(degree+1)])
            entries = (matrix*block).entries()
            width = stop-start
            for row in range(degree+1):
                transformed[row, start:stop] = entries[row*width:(row+1)*width]
        coefficients = np.moveaxis(
            transformed.reshape((degree+1, *remaining_shape)), 0, axis
        )
    return degrees, coefficients, len(terms)


def self_test():
    from flint import fmpq_mpoly_ctx
    from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix
    context = fmpq_mpoly_ctx.get(("x", "y"))
    x, y = context.gens()
    polynomial = 3 - 2*x + 5*x*x + 7*y - 11*x*y
    native_degrees, native, _ = tensor_bernstein_from_flint_matrix(polynomial, 2)
    degrees, elevated, _ = tensor_bernstein_degree_elevated(polynomial, 2, (5, 4))
    assert native_degrees == (2, 1) and degrees == (5, 4)
    # Endpoints are invariant under degree elevation.
    assert elevated[0, 0] == native[0, 0]
    assert elevated[-1, -1] == native[-1, -1]
    print("PASS_EXACT_TENSOR_BERNSTEIN_DEGREE_ELEVATION_ROOT")


if __name__ == "__main__":
    self_test()
