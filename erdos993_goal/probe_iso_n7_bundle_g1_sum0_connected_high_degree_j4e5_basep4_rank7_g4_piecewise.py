#!/usr/bin/env python3
"""Coupled J4/E5 profile scan using only the universal P4>=m-3 floor."""

from __future__ import annotations

import probe_iso_n7_bundle_g1_sum0_connected_high_degree_j4e5_profiles_rank7_g4_piecewise as cone


cone.p4_floor = lambda order, increments: order-3


def admissible(parts):
    return parts and parts[0] >= 3 and sum(value >= 2 for value in parts) >= 3


def main() -> None:
    for order in range(35, 46):
        minimum = None
        negatives = 0
        profiles = 0
        for parts in cone.partitions(order-2):
            if not admissible(parts):
                continue
            value, degrees, controls, p4, jmax = cone.relaxed(order, parts)
            candidate = (value, degrees, controls.index(value), jmax)
            minimum = candidate if minimum is None else min(minimum, candidate)
            negatives += sum(control < 0 for control in controls)
            profiles += 1
        print(order, "MIN", minimum, "NEG_CONTROLS", negatives,
              "PROFILES", profiles)


if __name__ == "__main__":
    main()
