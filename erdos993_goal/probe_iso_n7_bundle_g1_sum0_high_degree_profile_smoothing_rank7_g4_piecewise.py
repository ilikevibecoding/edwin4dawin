#!/usr/bin/env python3
"""Test discrete profile smoothing moves in the high-degree relaxation."""

from __future__ import annotations

from probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_rank7_g4_piecewise import (
    partitions,
    relaxed,
)


def admissible(parts):
    return parts and parts[0] >= 3 and sum(value >= 2 for value in parts) >= 3


def main() -> None:
    for order in range(42, 47):
        cache = {}
        for parts in partitions(order-2):
            if admissible(parts):
                cache[parts] = relaxed(order, parts)[3]
        merge_bad = []
        balance_bad = []
        balance_pure_bad = []
        strata = {}
        for parts, controls in cache.items():
            key = (parts.count(1), sum(value >= 2 for value in parts))
            candidate = (min(controls), parts, controls.index(min(controls)))
            strata[key] = min(strata.get(key, candidate), candidate)
            if parts[-1] == 1:
                target = tuple(sorted((parts[0]+1,)+parts[1:-1], reverse=True))
                target_controls = cache[target]
                differences = tuple(left-right for left, right in zip(controls, target_controls))
                if min(differences) < 0:
                    merge_bad.append((min(differences), parts, target, differences))
            indices = [index for index, value in enumerate(parts) if value >= 2]
            if parts[indices[0]] >= parts[indices[-1]]+2:
                values = list(parts)
                values[indices[0]] -= 1
                values[indices[-1]] += 1
                target = tuple(sorted(values, reverse=True))
                target_controls = cache[target]
                differences = tuple(left-right for left, right in zip(controls, target_controls))
                if min(differences) < 0:
                    balance_bad.append((min(differences), parts, target, differences))
                    if parts[-1] >= 2:
                        balance_pure_bad.append((min(differences), parts, target, differences))
        print(order, "PROFILES", len(cache), "MERGE_BAD", len(merge_bad),
              min(merge_bad) if merge_bad else None, "BALANCE_BAD", len(balance_bad),
              min(balance_bad) if balance_bad else None)
        print(order, "BALANCE_PURE_BAD", len(balance_pure_bad),
              min(balance_pure_bad) if balance_pure_bad else None)
        print(order, "BEST_STRATA", sorted(strata.items(), key=lambda item: item[1])[:12])


if __name__ == "__main__":
    main()
