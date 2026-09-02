#!/usr/bin/env python3
"""Probe the high-degree G1 cone with E7/E8 coupled to the actual J4."""

from __future__ import annotations

from fractions import Fraction

from probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_rank7_g4_piecewise import (
    choose,
    partitions,
    q,
)


def p4_floor(order, increments):
    # x_i=d_i-1, y_i=x_i-1.  In the nonleaf core, start every vertex
    # with degree one and assign its r-2 remaining degree units to the
    # cheapest capacity slots.  Separately, at least h-1-z hub--hub core
    # edges remain after z degree-two core vertices mediate hub connections.
    remaining = len(increments)-2
    slot_cost = 0
    for excess in reversed(increments):
        used = min(remaining, excess)
        slot_cost += used*(excess-1)
        remaining -= used
        if remaining == 0:
            break
    assert remaining == 0
    hub_weights = [excess-1 for excess in increments if excess >= 2]
    degree_two_core = increments.count(1)
    direct_hub_edges = max(0, len(hub_weights)-1-degree_two_core)
    pair_costs = sorted(
        left*right
        for index, left in enumerate(hub_weights)
        for right in hub_weights[index+1:]
    )
    return order-3+slot_cost+sum(pair_costs[:direct_hub_edges])


def relaxed(order, increments):
    degrees = [value+1 for value in increments]+[1]*(order-len(increments))
    edges = order-1
    moments = {
        rank: sum(choose(degree, rank) for degree in degrees)
        for rank in range(2, 8)
    }
    stars = {
        rank: (
            choose(order, rank)-edges*choose(order-2, rank-2)
            +sum(
                (-1)**support*moments[support]
                *choose(order-support-1, rank-support-1)
                for support in range(2, rank)
            )
        )
        for rank in range(3, 9)
    }
    disjoint_pairs = choose(edges, 2)-moments[2]
    p4 = p4_floor(order, increments)
    jmax = disjoint_pairs-p4
    assert jmax >= 0

    def at(s, t):
        j4 = Fraction(jmax)*s
        l5 = j4*(Fraction(1, 2)+(order-Fraction(9, 2))*t)
        correction = {
            4: j4,
            5: -l5,
            6: Fraction(order-5, 3)*l5,
            7: j4*choose(order-4, 3),
            8: j4*choose(order-4, 4),
        }
        rows = {
            rank: stars[rank]+sum(
                correction[support]*choose(order-support, rank-support)
                for support in range(4, rank+1)
            )
            for rank in range(3, 9)
        }
        return q(rows)

    grid = [[at(Fraction(i, 2), Fraction(j, 2)) for j in range(3)] for i in range(3)]

    def axis(values):
        return values[0], 2*values[1]-(values[0]+values[2])/2, values[2]

    first = [axis([grid[i][j] for i in range(3)]) for j in range(3)]
    controls = tuple(
        axis([first[j][i] for j in range(3)])[k]
        for i in range(3)
        for k in range(3)
    )
    return min(controls), controls, p4, jmax


def main():
    for order in range(11, 42):
        minimum = None
        profiles = 0
        for increments in partitions(order-2):
            if increments[0] < 3 or sum(value >= 2 for value in increments) < 3:
                continue
            value, controls, p4, jmax = relaxed(order, increments)
            candidate = (value, increments, controls.index(value), p4, jmax)
            minimum = candidate if minimum is None else min(minimum, candidate)
            profiles += 1
        print(order, "MIN", minimum, "PROFILES", profiles, flush=True)


if __name__ == "__main__":
    main()
