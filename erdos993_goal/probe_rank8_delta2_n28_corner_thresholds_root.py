#!/usr/bin/env python3
"""Numerically locate which realizability coordinates drive the n=28 relaxed gap."""

from __future__ import annotations

import json
import math
from fractions import Fraction
from pathlib import Path

import numpy as np

from probe_rank8_delta2_n28_tau_partition_bound_root import tau_partition_bound
from verify_rank7_terminal_broom_middle_differences import D4_CEILING


def real_crossings(coefficients: list[float], low: float, high: float) -> list[float]:
    roots = np.polynomial.Polynomial(coefficients).roots()
    return sorted(
        float(root.real)
        for root in roots
        if abs(root.imag) < 1e-8 and low - 1e-10 <= root.real <= high + 1e-10
    )


def main() -> None:
    data = json.loads(
        (Path(__file__).resolve().parent / "rank8_delta2_lcross_k1_source_sparse_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    terms = [
        (tuple(monomial), float(Fraction(coefficient)))
        for monomial, coefficient in data["numerator_terms"]
    ]

    def univariate(point: list[float], axis: int, scale: float = 1.0) -> list[float]:
        degree = data["numerator_degrees"][axis]
        coefficients = [0.0] * (degree + 1)
        powers = [
            [coordinate**power for power in range(maximum + 1)]
            for coordinate, maximum in zip(point, data["numerator_degrees"])
        ]
        for monomial, coefficient in terms:
            value = coefficient * scale ** monomial[axis]
            for other_axis, power in enumerate(monomial):
                if other_axis != axis:
                    value *= powers[other_axis][power]
            coefficients[monomial[axis]] += value
        return coefficients

    order = 28
    z_floor = (order - 19) / (order - 12)
    print("e value_at_floor z_last_crossing v_last_crossing j_last_crossing q rank6_induced_z")
    for excess in range(6, 51):
        tau, _ = tau_partition_bound(order, excess)
        c3 = math.comb(order - 2, 3) + excess
        c4 = math.comb(order - 3, 4) + (order - 4) * excess - tau
        w = math.comb(order - 1, 2) / c3
        x = c3 / c4
        d4_low = (2 + x) / 10
        d4_high = (1 + 3 * x) / 5
        u = (d4_high - d4_low) / (float(D4_CEILING) - d4_low)

        point = [order, w, x, u, 1.0, z_floor]
        z_poly = univariate(point, 5)
        v_poly = univariate(point, 4)
        j_poly = univariate(point, 3, u)
        at_floor = float(np.polynomial.polynomial.polyval(z_floor, z_poly))
        z_roots = real_crossings(z_poly, z_floor, 1.0)
        v_roots = real_crossings(v_poly, 0.0, 1.0)
        j_roots = real_crossings(j_poly, 0.0, 1.0)
        z_cross = max(z_roots) if z_roots else None
        v_cross = max(v_roots) if v_roots else None
        j_cross = max(j_roots) if j_roots else None

        x5 = (1 / x) / ((1 - d4_high) / x**2)
        q = (30 / x5 - 18 - 3 + 15) / (7 * (order - 7))
        rank6_z = 1 - (1 - (order - 16) / (order - 10)) / q
        print(
            excess,
            f"{at_floor:.8e}",
            "-" if z_cross is None else f"{z_cross:.9f}",
            "-" if v_cross is None else f"{v_cross:.9f}",
            "-" if j_cross is None else f"{j_cross:.9f}",
            f"{q:.9f}",
            f"{rank6_z:.9f}",
            flush=True,
        )


if __name__ == "__main__":
    main()
