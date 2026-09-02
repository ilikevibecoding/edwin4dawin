#!/usr/bin/env python3
"""Evolutionary falsifier for the prefix sigma >= 3/2 candidate.

This reuses the tree mutation engine from unit_extension_drift_evolution
but changes fitness to maximize the exact extension-mean drift only at
ranks 3 <= k < floor((2 alpha + 1)/3).  A witness has sigma_k < 3/2.
"""

from __future__ import annotations

import unit_extension_drift_evolution as engine


def prefix_three_halves_score(
    polynomial: list[int],
) -> tuple[float, dict]:
    alpha = len(polynomial) - 1
    cutoff = (2 * alpha + 1) // 3
    champion = None
    for rank in range(3, cutoff):
        lower, middle, upper = polynomial[rank - 1 : rank + 2]
        # drift = mu_k - mu_(k-1) = 1 - sigma_k.
        numerator = (
            (rank + 1) * lower * upper - rank * middle * middle
        )
        denominator = lower * middle
        threshold_numerator = 2 * numerator + denominator
        record = {
            "rank": rank,
            "cutoff": cutoff,
            "alpha": alpha,
            "drift_numerator": numerator,
            "drift_denominator": denominator,
            "drift_float": numerator / denominator,
            "unit_drift_gap": -threshold_numerator,
            "three_halves_gap_twice_scaled": -threshold_numerator,
            "sigma_float": 1 - numerator / denominator,
            "coefficient_window": [lower, middle, upper],
            "witness": threshold_numerator > 0,
        }
        if (
            champion is None
            or numerator * champion["drift_denominator"]
            > champion["drift_numerator"] * denominator
        ):
            champion = record

    if champion is None:
        champion = {
            "rank": None,
            "cutoff": cutoff,
            "alpha": alpha,
            "drift_numerator": -10**100,
            "drift_denominator": 1,
            "drift_float": -1e100,
            "unit_drift_gap": 10**100,
            "three_halves_gap_twice_scaled": 10**100,
            "sigma_float": 1e100,
            "coefficient_window": None,
            "witness": False,
        }
    return champion["drift_float"], champion


engine.drift_score = prefix_three_halves_score


if __name__ == "__main__":
    raise SystemExit(engine.main())
