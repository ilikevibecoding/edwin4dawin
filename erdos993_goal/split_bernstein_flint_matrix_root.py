#!/usr/bin/env python3
"""Exact chunked FLINT-matrix midpoint subdivision of Bernstein tensors."""

from __future__ import annotations

import math

import numpy as np
from flint import fmpq, fmpq_mat


def split_bernstein_midpoint_flint_matrix(
    coefficients, axis: int, chunk_columns: int = 2048
):
    moved = np.moveaxis(coefficients, axis, 0)
    degree = moved.shape[0] - 1
    remaining_shape = moved.shape[1:]
    flat = moved.reshape((degree + 1, -1))
    left_flat = np.empty_like(flat)
    right_flat = np.empty_like(flat)
    left_matrix = fmpq_mat(
        [
            [
                fmpq(math.comb(row, column), 2**row)
                if column <= row
                else fmpq(0)
                for column in range(degree + 1)
            ]
            for row in range(degree + 1)
        ]
    )
    right_matrix = fmpq_mat(
        [
            [
                fmpq(
                    math.comb(degree - row, column - row),
                    2 ** (degree - row),
                )
                if column >= row
                else fmpq(0)
                for column in range(degree + 1)
            ]
            for row in range(degree + 1)
        ]
    )
    for start in range(0, flat.shape[1], chunk_columns):
        stop = min(flat.shape[1], start + chunk_columns)
        width = stop - start
        block = fmpq_mat(
            [list(flat[row, start:stop]) for row in range(degree + 1)]
        )
        left_entries = (left_matrix * block).entries()
        right_entries = (right_matrix * block).entries()
        for row in range(degree + 1):
            left_flat[row, start:stop] = left_entries[
                row * width : (row + 1) * width
            ]
            right_flat[row, start:stop] = right_entries[
                row * width : (row + 1) * width
            ]
    left = left_flat.reshape((degree + 1, *remaining_shape))
    right = right_flat.reshape((degree + 1, *remaining_shape))
    return np.moveaxis(left, 0, axis), np.moveaxis(right, 0, axis)


def self_test() -> None:
    from explore_rank4_three_halves_grouped import split_bernstein_midpoint

    coefficients = np.empty((4, 3, 2), dtype=object)
    for index in range(coefficients.size):
        coefficients.flat[index] = fmpq(3 * index - 17, index + 5)
    for axis in range(3):
        expected_left, expected_right = split_bernstein_midpoint(coefficients, axis)
        for chunk in (1, 2, 5, 64):
            actual_left, actual_right = split_bernstein_midpoint_flint_matrix(
                coefficients, axis, chunk_columns=chunk
            )
            assert actual_left.shape == expected_left.shape
            assert actual_right.shape == expected_right.shape
            assert all(
                actual_left.flat[index] == expected_left.flat[index]
                for index in range(actual_left.size)
            )
            assert all(
                actual_right.flat[index] == expected_right.flat[index]
                for index in range(actual_right.size)
            )
    print("PASS_EXACT_FLINT_MATRIX_BERNSTEIN_MIDPOINT_SUBDIVISION_SELF_TEST")


if __name__ == "__main__":
    self_test()
