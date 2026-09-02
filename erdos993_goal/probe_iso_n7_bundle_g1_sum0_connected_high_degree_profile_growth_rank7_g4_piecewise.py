#!/usr/bin/env python3
"""Test order-growth induction for coupled high-degree profile controls."""

from __future__ import annotations

from probe_iso_n7_bundle_g1_sum0_connected_high_degree_j4e5_profiles_rank7_g4_piecewise import (
    partitions,
    relaxed,
)


def admissible(parts):
    return parts and parts[0] >= 3 and sum(value >= 2 for value in parts) >= 3


def predecessors(parts):
    seen = set()
    for index, value in enumerate(parts):
        if index and parts[index-1] == value:
            continue
        if value == 1:
            candidate = parts[:index]+parts[index+1:]
        else:
            values = list(parts)
            values[index] -= 1
            candidate = tuple(sorted(values, reverse=True))
        if admissible(candidate) and candidate not in seen:
            seen.add(candidate)
            yield candidate, ("remove" if value == 1 else "decrement", value)


def main() -> None:
    previous = None
    for order in range(40, 46):
        current = {
            parts: relaxed(order, parts)[2]
            for parts in partitions(order-2)
            if admissible(parts)
        }
        if previous is not None:
            uncovered = []
            simple_uncovered = []
            largest_uncovered = []
            smallest_uncovered = []
            rule_counts = {}
            worst_best = None
            for parts, controls in current.items():
                options = []
                for candidate, rule in predecessors(parts):
                    old = previous[candidate]
                    differences = tuple(new-old_value for new, old_value in zip(controls, old))
                    options.append((min(differences), rule, candidate, differences))
                best = max(options)
                rule_counts[best[1]] = rule_counts.get(best[1], 0)+1
                worst_best = best if worst_best is None else min(worst_best, best)
                if best[0] < 0:
                    uncovered.append((best[0], parts, best))
                if parts[-1] == 1:
                    simple_index = len(parts)-1
                else:
                    simple_index = next(
                        index for index, value in enumerate(parts)
                        if value >= 2 and admissible(tuple(sorted(
                            parts[:index]+(value-1,)+parts[index+1:], reverse=True
                        )))
                    )
                simple_value = parts[simple_index]
                if simple_value == 1:
                    simple_candidate = parts[:simple_index]
                else:
                    values = list(parts)
                    values[simple_index] -= 1
                    simple_candidate = tuple(sorted(values, reverse=True))
                simple_differences = tuple(
                    new-old for new, old in zip(controls, previous[simple_candidate])
                )
                if min(simple_differences) < 0:
                    simple_uncovered.append((min(simple_differences), parts,
                                             simple_candidate, simple_differences))
                decrementable = [
                    index for index, value in enumerate(parts)
                    if value >= 2 and admissible(tuple(sorted(
                        parts[:index]+(value-1,)+parts[index+1:], reverse=True
                    )))
                ]
                if decrementable:
                    for bucket, index in (
                        (largest_uncovered, decrementable[0]),
                        (smallest_uncovered, decrementable[-1]),
                    ):
                        values = list(parts)
                        values[index] -= 1
                        candidate = tuple(sorted(values, reverse=True))
                        differences = tuple(
                            new-old for new, old in zip(controls, previous[candidate])
                        )
                        if min(differences) < 0:
                            bucket.append((min(differences), parts, candidate, differences))
            print(order, "PROFILES", len(current), "UNCOVERED", len(uncovered),
                  "WORST", min(uncovered) if uncovered else None,
                  "WORST_BEST", worst_best, "RULES", sorted(rule_counts.items()))
            print(order, "SIMPLE_BAD", len(simple_uncovered),
                  min(simple_uncovered) if simple_uncovered else None,
                  "LARGEST_BAD", len(largest_uncovered),
                  min(largest_uncovered) if largest_uncovered else None,
                  "SMALLEST_BAD", len(smallest_uncovered),
                  min(smallest_uncovered) if smallest_uncovered else None)
        previous = current


if __name__ == "__main__":
    main()
