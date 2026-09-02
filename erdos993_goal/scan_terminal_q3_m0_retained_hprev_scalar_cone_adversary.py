#!/usr/bin/env python3
"""Numerical/exact diagnostic for a coarse all-order retained-Hprev cone.

Search evidence only.  It adds the shadow h_(j-1)/b >= j(h_j/b)/(N-j)
to the two earlier scalar U0 bounds and tests exact balanced motifs at all
rectangle corners in the remaining y/tau relaxation.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from math import comb

import sympy as sp

from derive_terminal_q3_low_newton_m0_shared_q3_adversary import symbolic_data


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def balanced_motifs(d: int, R: int) -> tuple[int, int, int, int, int]:
    q, high = divmod(R, d)
    A2 = d * C(q, 2) + high * q
    A3 = d * C(q, 3) + high * C(q, 2)
    B2 = C(d - 1, 2) + A2
    B3 = C(d - 1, 3) + A3
    high_arms = high * (q + 1)
    low_arms = R - high_arms
    return A2, B2, B3, low_arms, high_arms


def build_functions():
    data = symbolic_data()
    N, d, R, B2, tau, A2, Y, j, y = data["symbols"]
    a, A0 = data["exact"]["a"], data["exact"]["A0"]
    reserve = sp.cancel((j + 1) * a * A0 * j * y / (N - j))
    repaired = {
        name: sp.cancel(gap + reserve)
        for name, gap in data["gaps"].items()
    }
    functions = {
        name: sp.lambdify((N, j, d, R, B2, tau, A2, Y, y), gap, "math")
        for name, gap in repaired.items()
    }
    return data["symbols"], repaired, functions


def scan(maximum_order: int) -> dict[str, object]:
    _, _, functions = build_functions()
    minima = {name: None for name in functions}
    negatives = defaultdict(list)
    checks = 0
    for N in range(15, maximum_order + 1):
        for j in range(4, N):
            for d in range(1, N - 1):
                for R in range(1, N - d):
                    T = N - d - R
                    if T <= 0:
                        continue
                    A2, B2, B3, low_arms, high_arms = balanced_motifs(d, R)
                    q, _ = divmod(R, d)
                    base_tau = B3 + (d - 1) * R + T - (N - 2)
                    for Y in range(1, min(R, T) + 1):
                        # Exact min/max occupied-arm weights at fixed Y.
                        low_take = min(Y, low_arms)
                        tau_min = base_tau + (q - 1) * low_take + q * (Y - low_take)
                        high_take = min(Y, high_arms)
                        tau_max = base_tau + q * high_take + (q - 1) * (Y - high_take)
                        assert tau_min <= tau_max
                        for tau in {tau_min, tau_max}:
                            for y in (0, 1):
                                for name, function in functions.items():
                                    value = function(N, j, d, R, B2, tau, A2, Y, y)
                                    record = (value, N, j, d, R, T, Y, tau, y)
                                    if minima[name] is None or record < minima[name]:
                                        minima[name] = record
                                    if value < 0 and len(negatives[name]) < 20:
                                        negatives[name].append(record)
                                checks += 1
    return {
        "orders": [15, maximum_order],
        "corner_cells": checks,
        "minima": minima,
        "negative_examples": dict(negatives),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--order", type=int, default=60)
    args = parser.parse_args()
    result = scan(args.order)
    for key, value in result.items():
        print(key, value)


if __name__ == "__main__":
    main()
