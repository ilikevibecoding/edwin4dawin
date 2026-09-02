#!/usr/bin/env python3
"""Search exact reusable weighted midpoint AM-GM payments on mixed faces."""

from __future__ import annotations

import argparse
import json
import math
import random
from fractions import Fraction

from diagnose_rank8_low_low_a23_mixed_faces_zero_slack_exact_root import build


def pair_map(positive, negative):
    keys = set(positive)
    result = {}
    for target in negative:
        rows = []
        for low in positive:
            high = tuple(2 * target[i] - low[i] for i in range(len(target)))
            if min(high) < 0 or low >= high or high not in keys:
                continue
            rows.append((low, high))
        result[target] = sorted(rows)
    return result


def exact_balanced_allocation(demand, low_capacity, high_capacity):
    demand = Fraction(demand)
    lower = demand / (2 * high_capacity)
    upper = 2 * low_capacity / demand
    if lower > upper:
        return None
    # The geometric midpoint consumes the same fraction of each capacity.
    ratio_float = math.sqrt(float(low_capacity / high_capacity))
    ratio = Fraction(ratio_float).limit_denominator(1_000_000)
    if ratio < lower or ratio > upper:
        ratio = (lower + upper) / 2
    low_used = demand * ratio / 2
    high_used = demand / (2 * ratio)
    assert low_used <= low_capacity and high_used <= high_capacity
    assert 4 * low_used * high_used == demand * demand
    return low_used, high_used


def attempt(positive, negative, pairs, seed):
    rng = random.Random(seed)
    capacity = {key: Fraction(value) for key, value in positive.items()}
    remaining = set(negative)
    allocations = []
    while remaining:
        feasible = {}
        for target in remaining:
            demand = negative[target]
            feasible[target] = [
                (low, high)
                for low, high in pairs[target]
                if 4 * capacity[low] * capacity[high] >= demand * demand
            ]
        target = min(
            remaining,
            key=lambda item: (len(feasible[item]), -negative[item], item),
        )
        if not feasible[target]:
            return None
        demand = negative[target]
        options = feasible[target]
        rng.shuffle(options)
        options.sort(
            key=lambda pair: float(
                Fraction(demand * demand, 4 * capacity[pair[0]] * capacity[pair[1]])
            )
        )
        # Vary among the strongest few pairs across restarts.
        width = min(8, len(options))
        low, high = options[rng.randrange(width)]
        allocation = exact_balanced_allocation(demand, capacity[low], capacity[high])
        assert allocation is not None
        low_used, high_used = allocation
        capacity[low] -= low_used
        capacity[high] -= high_used
        allocations.append((target, low, high, low_used, high_used))
        remaining.remove(target)
    return allocations, capacity


def verify(positive, negative, allocations):
    used = {key: Fraction(0) for key in positive}
    seen = set()
    for target, low, high, low_used, high_used in allocations:
        assert target not in seen
        seen.add(target)
        assert tuple(low[i] + high[i] for i in range(len(target))) == tuple(
            2 * value for value in target
        )
        assert 4 * low_used * high_used >= negative[target] ** 2
        used[low] += low_used
        used[high] += high_used
    assert seen == set(negative)
    assert all(used[key] <= positive[key] for key in positive)
    return used


def encode_fraction(value):
    return [value.numerator, value.denominator]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--attempts", type=int, default=10_000)
    args = parser.parse_args()
    report = {}
    for face in ((0, 1), (1, 0)):
        face_rows = {}
        for label, polynomial in build(face).items():
            terms = {
                tuple(map(int, monomial)): int(coefficient)
                for monomial, coefficient in polynomial.terms()
            }
            positive = {key: value for key, value in terms.items() if value > 0}
            negative = {key: -value for key, value in terms.items() if value < 0}
            pairs = pair_map(positive, negative)
            answer = ([], {key: Fraction(value) for key, value in positive.items()}) if not negative else None
            winning_seed = None
            for seed in range(args.attempts):
                answer = attempt(positive, negative, pairs, seed)
                if answer is not None:
                    winning_seed = seed
                    break
            row = {
                "terms": len(terms),
                "negative_terms": len(negative),
                "candidate_minimum": min(map(len, pairs.values())) if pairs else None,
                "candidate_maximum": max(map(len, pairs.values())) if pairs else None,
                "success": answer is not None,
                "winning_seed": winning_seed,
            }
            if answer is not None:
                allocations, _ = answer
                used = verify(positive, negative, allocations)
                row["source_terms_used"] = sum(value > 0 for value in used.values())
                row["allocations"] = [
                    {
                        "negative_monomial": list(target),
                        "demand": negative[target],
                        "source_low": list(low),
                        "source_high": list(high),
                        "low_used": encode_fraction(low_used),
                        "high_used": encode_fraction(high_used),
                    }
                    for target, low, high, low_used, high_used in allocations
                ]
            face_rows[label] = row
            print(face, label, len(negative), row["success"], winning_seed, flush=True)
        report[",".join(map(str, face))] = face_rows
    print(json.dumps(report, separators=(",", ":")), flush=True)


if __name__ == "__main__":
    main()
