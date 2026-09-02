"""Seek closed formulas in m for Neville parameters of the actual residual."""

from __future__ import annotations

import sympy as sp

from verify_bottom_universal_schur_tp import (
    reverse_identity,
    schur_tail,
    universal_matrix,
)


M = sp.symbols("m")


def actual(m: int) -> sp.Matrix:
    d = 2 * m + 3
    return -schur_tail(universal_matrix(d + m, d), d) * reverse_identity(m)


def indexed_neville(matrix: sp.Matrix):
    work = sp.Matrix(matrix)
    multipliers = {}
    for column in range(work.cols - 1):
        for row in range(work.rows - 1, column, -1):
            multiplier = sp.cancel(work[row, column] / work[row - 1, column])
            multipliers[(row, column)] = multiplier
            work[row, :] -= multiplier * work[row - 1, :]
    pivots = {index: sp.factor(work[index, index]) for index in range(work.rows)}
    return multipliers, pivots


def rational_guess(data, max_total_degree: int = 12):
    """Return the first low-total-degree rational interpolant surviving holdout."""
    if len(data) < 5:
        return None
    for used in range(5, len(data)):
        train = data[:used]
        test = data[used:]
        for numerator_degree in range(used):
            denominator_degree = used - numerator_degree - 1
            if numerator_degree + denominator_degree > max_total_degree:
                continue
            try:
                candidate = sp.factor(sp.rational_interpolate(train, numerator_degree, M))
            except Exception:
                continue
            if all(sp.cancel(candidate.subs(M, x) - y) == 0 for x, y in test):
                return candidate
    return None


def main() -> None:
    cache = {}
    for m in range(2, 15):
        cache[m] = indexed_neville(actual(m))
        print(f"computed m={m}", flush=True)

    indices = [(1, 0), (2, 0), (2, 1), (3, 0), (3, 1), (3, 2)]
    for index in indices:
        data = [
            (m, cache[m][0][index])
            for m in cache
            if index in cache[m][0]
        ]
        guess = rational_guess(data)
        print(f"multiplier index={index} points={len(data)} guess={guess}", flush=True)
        print(" values=", [(m, sp.factor(v)) for m, v in data[:4]], flush=True)

    # Also index rows from the bottom, since the family grows at that edge.
    bottom_indices = [(1, 0), (2, 0), (1, 1), (3, 0), (2, 1), (1, 2)]
    for bottom, column in bottom_indices:
        data = []
        for m, (multipliers, _) in cache.items():
            index = (m - bottom, column)
            if index in multipliers:
                data.append((m, multipliers[index]))
        guess = rational_guess(data)
        print(
            f"bottom_multiplier bottom={bottom} column={column} "
            f"points={len(data)} guess={guess}",
            flush=True,
        )
        print(" values=", [(m, sp.factor(v)) for m, v in data[:4]], flush=True)


if __name__ == "__main__":
    main()
