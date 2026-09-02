#!/usr/bin/env python3
"""Search-only audit of the K_Z one-step residual-ratio comparison."""

from __future__ import annotations

import argparse
from fractions import Fraction
from math import comb


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def multiply(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            out[i + j] += a * b
    return out


def power(row: list[int], exponent: int) -> list[int]:
    out = [1]
    for _ in range(exponent):
        out = multiply(out, row)
    return out


def path(vertices: int) -> list[int]:
    if vertices == -1:
        return [1]
    assert vertices >= 0
    return [C(vertices + 1 - k, k) for k in range((vertices + 1) // 2 + 1)]


def coeff(row: list[int], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def tangent_ratio(T: int, rank: int) -> Fraction:
    vertices = max(0, T - 8)
    residual_rank = rank - 4
    den = C(vertices + 1 - residual_rank, residual_rank)
    num = C(vertices - residual_rank, residual_rank + 1)
    return Fraction(num, den) if den else Fraction(0)


def scan(maximum_T: int, maximum_rank: int):
    checks = 0
    negatives = []
    minimum = None
    ratio_pairs = 0
    ratio_increases = []
    ratio_decreases = []
    for T in range(2, maximum_T + 1):
        for Y in range(2, T):
            zmax = min(Y, T - Y)
            previous_ratios = {}
            for Z in range(1, zmax):
                L = T - Y - Z + 2
                assert L >= 3
                D = power([1, 1], Y - Z - 1)
                D = multiply(D, power([1, 2], Z - 1))
                D = multiply(D, path(L - 4))
                for rank in range(4, min(maximum_rank, T + 1) + 1):
                    rho = tangent_ratio(T, rank - 1)
                    value = Fraction(coeff(D, rank - 3)) - rho * coeff(D, rank - 4)
                    record = (value, T, Y, Z, L, rank, rho)
                    minimum = record if minimum is None else min(minimum, record)
                    if value < 0:
                        negatives.append(record)
                    denominator = coeff(D, rank - 4)
                    if denominator:
                        current_ratio = Fraction(coeff(D, rank - 3), denominator)
                        if rank in previous_ratios:
                            old_ratio, old_Z, old_L = previous_ratios[rank]
                            ratio_pairs += 1
                            pair = (
                                current_ratio - old_ratio,
                                T,
                                Y,
                                old_Z,
                                Z,
                                old_L,
                                L,
                                rank,
                                old_ratio,
                                current_ratio,
                            )
                            if current_ratio > old_ratio:
                                ratio_increases.append(pair)
                            elif current_ratio < old_ratio:
                                ratio_decreases.append(pair)
                        previous_ratios[rank] = (current_ratio, Z, L)
                    checks += 1
    return (
        checks,
        minimum,
        negatives,
        ratio_pairs,
        ratio_increases,
        ratio_decreases,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--T", type=int, default=200)
    parser.add_argument("--rank", type=int, default=60)
    args = parser.parse_args()
    (
        checks,
        minimum,
        negatives,
        ratio_pairs,
        ratio_increases,
        ratio_decreases,
    ) = scan(args.T, args.rank)
    print("checks", checks)
    print("minimum", minimum)
    print("negative_checks", len(negatives))
    print("first_negatives", negatives[:20])
    print("residual_ratio_adjacent_Z_pairs", ratio_pairs)
    print("residual_ratio_increases", len(ratio_increases))
    print("first_ratio_increases", ratio_increases[:20])
    print("residual_ratio_decreases", len(ratio_decreases))
    print("first_ratio_decreases", ratio_decreases[:20])
    print("SEARCH_ONLY_D1_KZ_ONE_STEP_RESIDUAL_RATIO")


if __name__ == "__main__":
    main()
