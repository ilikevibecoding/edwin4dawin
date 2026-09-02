#!/usr/bin/env python3
"""Numerically minimize the hard seven-variable rank-5 convolution face."""

from __future__ import annotations

import numpy as np
from numba import njit
from scipy.optimize import differential_evolution

from explore_rank5_three_halves_convolution import low_high


def main() -> int:
    margin, _ = low_high()
    kept = (0, 1, 2, 5, 6, 7, 8)
    coefficients: list[float] = []
    exponents: list[tuple[int, ...]] = []
    for monomial, coefficient in margin.terms():
        if any(
            exponent != 0
            for index, exponent in enumerate(monomial)
            if index not in kept
        ):
            continue
        coefficients.append(float(coefficient))
        exponents.append(tuple(int(monomial[index]) for index in kept))
    coefficient_array = np.asarray(coefficients)
    exponent_array = np.asarray(exponents, dtype=np.int16)

    @njit(cache=True)
    def evaluate(point: np.ndarray) -> float:
        total = 0.0
        for term_index in range(coefficient_array.shape[0]):
            term = coefficient_array[term_index]
            for variable_index in range(point.shape[0]):
                term *= point[variable_index] ** exponent_array[
                    term_index, variable_index
                ]
            total += term
        return total

    def simplex_objective(raw: np.ndarray) -> float:
        total = float(np.sum(raw))
        if total == 0:
            return 0.0
        return evaluate(raw / total)

    print(f"terms={len(coefficients)}", flush=True)
    evaluate(np.ones(len(kept)))
    simplex_result = differential_evolution(
        simplex_objective,
        [(0, 1)] * len(kept),
        seed=995,
        popsize=24,
        maxiter=700,
        polish=True,
        tol=1e-12,
    )
    simplex_point = simplex_result.x / np.sum(simplex_result.x)
    print(
        f"terms={len(coefficients)} simplex_minimum={simplex_result.fun} "
        f"point={tuple(simplex_point)} success={simplex_result.success}",
        flush=True,
    )

    # Homogeneity lets us impose a+b=1 away from the degenerate face
    # a=b=0.  The other five coordinates are logarithmically searched.
    def scaled_objective(raw: np.ndarray) -> float:
        x = raw[0]
        point = np.concatenate(
            (
                np.asarray((x, 1.0 - x)),
                np.expm1(raw[1:]),
            )
        )
        return evaluate(point)

    scaled_result = differential_evolution(
        scaled_objective,
        [(0, 1)] + [(0, np.log1p(1e4))] * (len(kept) - 2),
        seed=996,
        popsize=28,
        maxiter=900,
        polish=True,
        tol=1e-12,
    )
    x = scaled_result.x[0]
    scaled_point = np.concatenate(
        (
            np.asarray((x, 1.0 - x)),
            np.expm1(scaled_result.x[1:]),
        )
    )
    print(
        f"a_plus_b_fixed minimum={scaled_result.fun} "
        f"point={tuple(scaled_point)} success={scaled_result.success}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
