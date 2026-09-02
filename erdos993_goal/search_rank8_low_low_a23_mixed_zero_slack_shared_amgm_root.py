#!/usr/bin/env python3
"""Search shared-capacity exact midpoint AM-GM payments on mixed faces.

For an allocation y to a midpoint pair u,w with u+w=2v, the certificate uses
(y/2)x^u+(y/2)x^w >= y*x^v.  Capacities are tracked in doubled integer units,
so every successful search is immediately exact despite being a discovery
script.
"""

from __future__ import annotations

import argparse
import json
import random

from diagnose_rank8_low_low_a23_mixed_faces_zero_slack_exact_root import build


def pair_map(positive, negative):
    result = {}
    positive_keys = set(positive)
    for target in negative:
        pairs = []
        for low in positive:
            high = tuple(2 * target[i] - low[i] for i in range(len(target)))
            if min(high) < 0 or low >= high or high not in positive_keys:
                continue
            pairs.append((low, high))
        result[target] = sorted(pairs)
    return result


def greedy(positive, negative, pairs, seed):
    rng = random.Random(seed)
    capacity = {source: 2 * value for source, value in positive.items()}
    remaining_targets = set(negative)
    allocations = []
    while remaining_targets:
        available = {
            target: [
                (low, high)
                for low, high in pairs[target]
                if capacity[low] and capacity[high]
            ]
            for target in remaining_targets
        }
        target = min(
            remaining_targets,
            key=lambda item: (
                len(available[item]),
                sum(min(capacity[low], capacity[high]) for low, high in available[item]),
                -negative[item],
                item,
            ),
        )
        demand = negative[target]
        options = available[target]
        rng.shuffle(options)
        options.sort(
            key=lambda pair: (
                -min(capacity[pair[0]], capacity[pair[1]]),
                -(capacity[pair[0]] + capacity[pair[1]]),
            )
        )
        target_rows = []
        for low, high in options:
            paid = min(demand, capacity[low], capacity[high])
            if not paid:
                continue
            capacity[low] -= paid
            capacity[high] -= paid
            demand -= paid
            target_rows.append((low, high, paid))
            if not demand:
                break
        if demand:
            return None
        allocations.append((target, target_rows))
        remaining_targets.remove(target)
    return allocations, capacity


def verify(positive, negative, allocations):
    used = {source: 0 for source in positive}
    seen = set()
    for target, rows in allocations:
        assert target not in seen
        seen.add(target)
        assert sum(paid for _, _, paid in rows) == negative[target]
        for low, high, paid in rows:
            assert low < high and paid > 0
            assert tuple(low[i] + high[i] for i in range(len(target))) == tuple(
                2 * item for item in target
            )
            used[low] += paid
            used[high] += paid
    assert seen == set(negative)
    assert all(used[source] <= 2 * positive[source] for source in positive)
    return used


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--attempts", type=int, default=1000)
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
            answer = ([], {source: 2 * value for source, value in positive.items()}) if not negative else None
            winning_seed = None
            for seed in range(args.attempts):
                answer = greedy(positive, negative, pairs, seed)
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
                        "pairs": [
                            {
                                "source_low": list(low),
                                "source_high": list(high),
                                "paid_demand": paid,
                                "allocation_each_source": [paid, 2],
                            }
                            for low, high, paid in rows
                        ],
                    }
                    for target, rows in allocations
                ]
            face_rows[label] = row
            print(face, label, len(negative), row["candidate_minimum"], row["success"], winning_seed, flush=True)
        report[",".join(map(str, face))] = face_rows
    print(json.dumps(report, separators=(",", ":")), flush=True)


if __name__ == "__main__":
    main()
