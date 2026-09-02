"""Numerically search positive-root Toeplitz gauges in larger sizes."""

from __future__ import annotations

from itertools import combinations

import numpy as np
from scipy.optimize import differential_evolution

from explore_bottom_jordan_toeplitz_gauge import jordan_data


def coefficients_from_roots(roots: np.ndarray) -> np.ndarray:
    # np.poly returns coefficients of prod(z-root); instead convolve prod(1-a z).
    coefficients = np.array([1.0])
    for root in roots:
        coefficients = np.convolve(coefficients, np.array([1.0, -root]))
    return coefficients


def toeplitz_numeric(coefficients: np.ndarray) -> np.ndarray:
    q = len(coefficients)
    matrix = np.zeros((q, q))
    for i in range(q):
        for j in range(i, q):
            matrix[i, j] = coefficients[j - i]
    return matrix


def normalized_minors(matrix: np.ndarray):
    q = matrix.shape[0]
    row_scale = np.maximum(np.max(np.abs(matrix), axis=1), 1e-300)
    column_scale = np.maximum(np.max(np.abs(matrix), axis=0), 1e-300)
    scaled = matrix / np.sqrt(row_scale[:, None] * column_scale[None, :])
    for order in range(1, q + 1):
        for rows in combinations(range(q), order):
            for columns in combinations(range(q), order):
                yield float(np.linalg.det(scaled[np.ix_(rows, columns)]))


def search(d: int):
    m0, s = jordan_data(d)
    left0 = np.array(m0 * s, dtype=float)
    right0 = np.array(s.inv(), dtype=float)
    q = d - 1

    def objective(log_roots):
        roots = np.exp(log_roots)
        coefficients = coefficients_from_roots(roots)
        p = toeplitz_numeric(coefficients)
        left = left0 @ p
        right = np.linalg.solve(p, right0)
        values = list(normalized_minors(left)) + list(normalized_minors(right))
        negative = [-value for value in values if value < -1e-11]
        # Reward a positive buffer on non-structurally-zero minors once feasible.
        if not negative:
            positives = [value for value in values if value > 1e-10]
            return -min(positives) if positives else 0.0
        return max(negative) + sum(negative) / len(values)

    result = differential_evolution(
        objective,
        bounds=[(-4.0, 4.0)] * (q - 1),
        seed=993,
        maxiter=1200,
        popsize=20,
        tol=1e-10,
        polish=True,
        workers=1,
        updating="immediate",
    )
    roots = np.exp(result.x)
    coefficients = coefficients_from_roots(roots)
    p = toeplitz_numeric(coefficients)
    left = left0 @ p
    right = np.linalg.solve(p, right0)
    values = list(normalized_minors(left)) + list(normalized_minors(right))
    return result, roots, coefficients, min(values), left, right


def search_coefficients(d: int):
    """Search the full real unit upper-Toeplitz gauge, without root signs."""
    m0, s = jordan_data(d)
    left0 = np.array(m0 * s, dtype=float)
    right0 = np.array(s.inv(), dtype=float)
    q = d - 1

    def objective(parameters):
        coefficients = np.concatenate(([1.0], parameters))
        p = toeplitz_numeric(coefficients)
        left = left0 @ p
        right = np.linalg.solve(p, right0)
        values = list(normalized_minors(left)) + list(normalized_minors(right))
        negative = [-value for value in values if value < -1e-10]
        if not negative:
            positives = [value for value in values if value > 1e-9]
            return -min(positives) if positives else 0.0
        return max(negative) + sum(negative) / len(values)

    scales = [10.0 ** (1 + index / 2) for index in range(q - 1)]
    result = differential_evolution(
        objective,
        bounds=[(-scale, scale) for scale in scales],
        seed=1993,
        maxiter=1800,
        popsize=30,
        tol=1e-11,
        polish=True,
        workers=1,
        updating="immediate",
    )
    coefficients = np.concatenate(([1.0], result.x))
    p = toeplitz_numeric(coefficients)
    left = left0 @ p
    right = np.linalg.solve(p, right0)
    values = list(normalized_minors(left)) + list(normalized_minors(right))
    return result, coefficients, min(values), left, right


def main() -> None:
    for d in (5,):
        result, coefficients, minimum, _, _ = search_coefficients(d)
        print(
            f"d={d} success={result.success} objective={result.fun:.6e} "
            f"min_minor={minimum:.6e}",
            flush=True,
        )
        print(f" coefficients={coefficients.tolist()}", flush=True)


if __name__ == "__main__":
    main()
