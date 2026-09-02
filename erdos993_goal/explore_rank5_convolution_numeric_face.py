#!/usr/bin/env python3
"""Numerically minimize the difficult rank-5 convolution boundary."""

from __future__ import annotations

import numpy as np
from scipy.optimize import differential_evolution

from explore_rank5_three_halves_convolution import low_high


def main() -> int:
    margin, _ = low_high()
    kept = (0, 1, 2, 7)  # a,b,t_a,t_b
    terms = [
        (
            tuple(int(monomial[index]) for index in kept),
            float(coefficient),
        )
        for monomial, coefficient in margin.terms()
        if all(
            exponent == 0
            for index, exponent in enumerate(monomial)
            if index not in kept
        )
    ]

    def objective(raw):
        total = float(np.sum(raw))
        if total == 0:
            return 0.0
        point = raw / total
        value = 0.0
        for monomial, coefficient in terms:
            term = coefficient
            for coordinate, exponent in zip(point, monomial):
                term *= coordinate**exponent
            value += term
        return value

    result = differential_evolution(
        objective,
        [(0, 1)] * 4,
        seed=993,
        popsize=35,
        maxiter=1200,
        polish=True,
        tol=1e-12,
    )
    point = result.x / np.sum(result.x)
    print(
        f"terms={len(terms)} minimum={result.fun} "
        f"simplex_point={tuple(point)} success={result.success}"
    )

    def scaled_objective(raw):
        x, log_ta, log_tb = raw
        scaled_point = (
            x,
            1.0 - x,
            float(np.expm1(log_ta)),
            float(np.expm1(log_tb)),
        )
        value = 0.0
        for monomial, coefficient in terms:
            term = coefficient
            for coordinate, exponent in zip(scaled_point, monomial):
                term *= coordinate**exponent
            value += term
        return value

    scaled_result = differential_evolution(
        scaled_objective,
        [(0, 1), (0, np.log1p(1e6)), (0, np.log1p(1e6))],
        seed=994,
        popsize=45,
        maxiter=1600,
        polish=True,
        tol=1e-12,
    )
    x, log_ta, log_tb = scaled_result.x
    print(
        f"a_plus_b_fixed minimum={scaled_result.fun} "
        f"point={(x, 1.0 - x, np.expm1(log_ta), np.expm1(log_tb))} "
        f"success={scaled_result.success}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
