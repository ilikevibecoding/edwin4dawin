#!/usr/bin/env python3
"""Test whether the lower beta-moment LU factor repairs the compressed core."""

from fractions import Fraction as F

from fast_bottom_forward import matmul, zeros
from probe_beta_newton_compressed_factor import (
    moment_v,
    neville_pair,
    reversal,
    transpose,
)
from probe_newton_compressed_chebyshev import compressed_factor


def lu_nopivot(matrix):
    n = len(matrix)
    lower = zeros(n, n)
    upper = zeros(n, n)
    for i in range(n):
        lower[i][i] = F(1)
    for k in range(n):
        for j in range(k, n):
            upper[k][j] = matrix[k][j] - sum(
                lower[k][s] * upper[s][j] for s in range(k)
            )
        assert upper[k][k] > 0
        for i in range(k + 1, n):
            lower[i][k] = (
                matrix[i][k]
                - sum(lower[i][s] * upper[s][k] for s in range(k))
            ) / upper[k][k]
    assert matmul(lower, upper) == matrix
    return lower, upper


def statuses(matrix):
    forward, transpose = neville_pair(matrix)
    return forward["status"], transpose["status"], forward, transpose


def upper_bidiagonal_chain(upper):
    """Return D and upper bidiagonals whose product is upper."""
    work = transpose(upper)
    n = len(work)
    operations = []
    for column in range(n - 1):
        for row in range(n - 1, column, -1):
            multiplier = work[row][column] / work[row - 1][column]
            assert multiplier > 0
            operations.append((row, multiplier))
            for j in range(column, n):
                work[row][j] -= multiplier * work[row - 1][j]
    assert all(work[i][j] == 0 for i in range(n) for j in range(n) if i != j)
    diagonal = zeros(n, n)
    for i in range(n):
        diagonal[i][i] = work[i][i]
        assert diagonal[i][i] > 0
    factors = []
    for row, multiplier in reversed(operations):
        factor = zeros(n, n)
        for i in range(n):
            factor[i][i] = F(1)
        factor[row - 1][row] = multiplier
        factors.append((row, multiplier, factor))
    reconstruction = diagonal
    for _, _, factor in factors:
        reconstruction = matmul(reconstruction, factor)
    assert reconstruction == upper
    return diagonal, factors


def main():
    for q in range(2, 21):
        j = reversal(q)
        moment = matmul(matmul(j, moment_v(q)), j)
        lower, upper = lu_nopivot(moment)
        repaired = matmul(compressed_factor(q), lower)
        lower_status = statuses(lower)
        upper_status = statuses(upper)
        repaired_status = statuses(repaired)
        diagonal, factors = upper_bidiagonal_chain(upper)
        partial = matmul(repaired, diagonal)
        chain_statuses = [statuses(partial)[:2]]
        descriptors = []
        for row, multiplier, factor in factors:
            partial = matmul(partial, factor)
            chain_statuses.append(statuses(partial)[:2])
            descriptors.append((row, multiplier))
        assert partial == matmul(repaired, upper)
        assert chain_statuses[-1] == ("PASS", "PASS")
        failing = [index for index, status in enumerate(chain_statuses) if status != ("PASS", "PASS")]
        last_failure = max(failing) if failing else -1
        print(
            f"q={q} L={lower_status[:2]} U={upper_status[:2]} "
            f"F_L={repaired_status[:2]} moment_upper_layers={len(factors)} "
            f"last_failure_after_layers={last_failure}"
        )
        if failing and q <= 10:
            repair_index = last_failure + 1
            print(
                f"  repair_layer={repair_index} "
                f"descriptor={descriptors[repair_index - 1][:1]}"
            )


if __name__ == "__main__":
    main()
