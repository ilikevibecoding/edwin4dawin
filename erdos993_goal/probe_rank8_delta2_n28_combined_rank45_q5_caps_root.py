#!/usr/bin/env python3
"""Numerical scout for the n=28 tau, rank-(4,5), and quantitative-Q5 caps."""

from __future__ import annotations

import json
import math
from fractions import Fraction
from pathlib import Path

from probe_rank8_delta2_n28_tau_partition_bound_root import tau_partition_bound
from verify_rank7_terminal_broom_middle_differences import D4_CEILING


def main() -> None:
    data = json.loads(
        (Path(__file__).resolve().parent / "rank8_delta2_lcross_k1_source_sparse_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    terms = [
        (tuple(monomial), float(Fraction(coefficient)))
        for monomial, coefficient in data["numerator_terms"]
    ]
    degrees = data["numerator_degrees"]

    def evaluate(point: tuple[float, ...]) -> float:
        powers = [
            [coordinate**power for power in range(degree + 1)]
            for coordinate, degree in zip(point, degrees)
        ]
        total = 0.0
        for monomial, coefficient in terms:
            value = coefficient
            for axis, power in enumerate(monomial):
                value *= powers[axis][power]
            total += value
        return total

    order = 28
    path_ratio = Fraction((order - 7) * (order - 8), 5 * (order - 3))
    z_floor = Fraction(order - 19, order - 12)
    alphas = (Fraction(0), Fraction(3, 20), Fraction(1, 5), Fraction(1, 4))
    negatives = {str(alpha): [] for alpha in alphas}
    for excess in range(6, 51):
        tau, _ = tau_partition_bound(order, excess)
        c3 = math.comb(order - 2, 3) + excess
        c4 = math.comb(order - 3, 4) + (order - 4) * excess - tau
        w = Fraction(math.comb(order - 1, 2), c3)
        x = Fraction(c3, c4)
        d4_low = (2 + x) / 10
        two_extension = (1 + 3 * x) / 5
        rank45 = 1 - path_ratio * x
        d4_high = min(two_extension, rank45)
        U = (d4_high - d4_low) / (Fraction(D4_CEILING) - d4_low)
        row = []
        for alpha in alphas:
            V = 1 - alpha / 5
            value = evaluate(tuple(map(float, (order, w, x, U, V, z_floor))))
            row.append(value)
            if value < 0:
                negatives[str(alpha)].append(excess)
        print(
            "E", excess,
            "J_CAP", float((d4_high - d4_low) / (two_extension - d4_low)),
            *(f"A{alpha}={value:.8e}" for alpha, value in zip(alphas, row)),
            flush=True,
        )
    print("NEGATIVES", negatives)


if __name__ == "__main__":
    main()
