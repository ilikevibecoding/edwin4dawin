#!/usr/bin/env python3
"""Deterministic exact sign probe for adding a retained common isolate to D."""

from __future__ import annotations

from math import comb
import random

from probe_iso_n6_bundle_g1_adjacent_star_actual_d_g1_nonadjacent import evaluate_function


def rows(total, x, y, ku, kv):
    answer = []
    for remove_u, remove_v in ((0, 0), (1, 0), (0, 1), (1, 1)):
        left = ku and not remove_u
        right = kv and not remove_v
        answer.append(tuple(
            (comb(total, rank) if rank <= total else 0)
            + int(left) * (comb(total-x, rank-1) if 0 <= rank-1 <= total-x else 0)
            + int(right) * (comb(total-y, rank-1) if 0 <= rank-1 <= total-y else 0)
            for rank in range(8)
        ))
    return tuple(answer)


def main():
    rng = random.Random(993611)
    evaluate = evaluate_function()
    signs = {"negative": 0, "zero": 0, "positive": 0}
    minimum = None
    second_signs = {"negative": 0, "zero": 0, "positive": 0}
    second_minimum = None
    higher_signs = {degree: {"negative": 0, "zero": 0, "positive": 0} for degree in range(1, 7)}
    for trial in range(50000):
        x = rng.randrange(0, 151)
        y = rng.randrange(0, 151)
        z = rng.randrange(1, 151)
        m = x+y+z
        crows = rows(m, x, y, 1, 1)
        rx, ry = rng.randrange(x+1), rng.randrange(y+1)
        rz = rng.randrange(z)
        ku, kv = rng.randrange(2), rng.randrange(2)
        before = evaluate(crows, rows(rx+ry+rz, rx, ry, ku, kv))
        after = evaluate(crows, rows(rx+ry+rz+1, rx, ry, ku, kv))
        delta = after-before
        key = "negative" if delta < 0 else "positive" if delta > 0 else "zero"
        signs[key] += 1
        record = (delta, x, y, z, rx, ry, rz, ku, kv, before, after)
        minimum = record if minimum is None or record < minimum else minimum
        if rz + 1 < z:
            after2 = evaluate(crows, rows(rx+ry+rz+2, rx, ry, ku, kv))
            second = after2 - 2*after + before
            second_key = "negative" if second < 0 else "positive" if second > 0 else "zero"
            second_signs[second_key] += 1
            second_record = (second, x, y, z, rx, ry, rz, ku, kv)
            second_minimum = second_record if second_minimum is None or second_record < second_minimum else second_minimum
        maximum_degree = min(6, z-rz)
        sequence = [evaluate(crows, rows(rx+ry+rz+offset, rx, ry, ku, kv)) for offset in range(maximum_degree+1)]
        for degree in range(1, maximum_degree+1):
            sequence = [sequence[index+1]-sequence[index] for index in range(len(sequence)-1)]
            item = sequence[0]
            higher_signs[degree]["negative" if item < 0 else "positive" if item > 0 else "zero"] += 1
    print("SIGNS", signs)
    print("MINIMUM", minimum)
    print("SECOND_SIGNS", second_signs)
    print("SECOND_MINIMUM", second_minimum)
    print("HIGHER_SIGNS", higher_signs)
    print("PROBE_EXACT_ISO_N6_BUNDLE_G1_ADJACENT_DOUBLE_STAR_ISOLATE_DIFFERENCE_G1_NONADJACENT")


if __name__ == "__main__":
    main()
