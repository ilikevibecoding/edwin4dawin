#!/usr/bin/env python3
"""Degree-profile relaxation with a degree-capacity P4 floor.

For the nonleaf core K, write x_v=d_W(v)-1.  Then

    P4(W)=sum_{uv in E(K)} x_u x_v
          >= x_min/2 * sum_v d_K(v)x_v.

The core degrees satisfy 1<=d_K(v)<=x_v+1 and sum d_K=2(r-1).
Starting each core vertex at degree one, the remaining r-2 degree units
have total x-weight at least the cheapest capacity-constrained slot sum.
This gives a degree-profile-aware floor that is exact for equal-weight
core stars and strictly improves the old P4>=m-3 floor when x_min>1.
"""

from __future__ import annotations

import math
from fractions import Fraction

from probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_rank7_g4_piecewise import (
    choose,
    derivative4,
    partitions,
    q,
)


def p4_floor(order, increments):
    assert sum(increments) == order-2
    assert len(increments) >= 2
    smallest = increments[-1]
    remaining = len(increments)-2
    slot_cost = 0
    for weight in reversed(increments):
        used = min(remaining, weight)
        slot_cost += used*weight
        remaining -= used
        if remaining == 0:
            break
    assert remaining == 0
    weighted_degree_floor = order-2+slot_cost
    degree_capacity_floor = math.ceil(
        Fraction(smallest*weighted_degree_floor, 2)
    )
    hubs = [weight for weight in increments if weight >= 2]
    degree_twos = increments.count(1)
    # In the nonleaf-core tree, at most 2t edges touch the t vertices of
    # weight one.  Hence at least k-1-t edges join two hubs.  After expanding
    # x_u x_v=(x_u+x_v-1)+(x_u-1)(x_v-1), the first terms sum to at least
    # m-3, while every hub-hub edge contributes the displayed positive extra.
    direct_hub_edges = max(0, len(hubs)-1-degree_twos)
    pair_extras = sorted(
        (left-1)*(right-1)
        for index, left in enumerate(hubs)
        for right in hubs[index+1:]
    )
    hub_edge_floor = order-3+sum(pair_extras[:direct_hub_edges])
    return max(order-3, degree_capacity_floor, hub_edge_floor)


def relaxed(order, increments):
    degrees = [value+1 for value in increments]+[1]*(order-len(increments))
    edges = order-1
    moments = {
        rank: sum(choose(degree, rank) for degree in degrees)
        for rank in range(2, 8)
    }
    square = {
        rank: sum(choose(degree, rank)**2 for degree in degrees)
        for rank in range(2, 6)
    }
    star = {
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
    disjoint_edge_pairs = choose(edges, 2)-moments[2]
    wedge_pairs = (moments[2]**2-square[2])//2
    upper7 = sum(
        choose(degree, 2)*choose(edges-degree, 2) for degree in degrees
    )
    upper8 = (
        sum(choose(degree, 5)*(edges-degree) for degree in degrees)
        +sum(
            choose(degree, 4)*(moments[2]-choose(degree, 2))
            for degree in degrees
        )
        +(moments[3]**2-square[3])//2
        +sum(
            choose(degree, 3)*choose(edges-degree, 2) for degree in degrees
        )
        +wedge_pairs*edges
        +disjoint_edge_pairs*choose(edges-2, 2)//6
    )
    p4 = p4_floor(order, increments)
    e4_upper = disjoint_edge_pairs-p4
    magnitude_lower = Fraction(e4_upper, 2)
    magnitude_upper = max(magnitude_lower, e4_upper*(order-4))

    def at(magnitude):
        correction = {
            4: e4_upper,
            5: -magnitude,
            6: Fraction(order-5, 3)*magnitude,
            7: upper7,
            8: upper8,
        }
        rows = {
            rank: star[rank]+sum(
                correction[support]*choose(order-support, rank-support)
                for support in range(4, rank+1)
            )
            for rank in range(3, 9)
        }
        return q(rows), rows

    value0, rows0 = at(magnitude_lower)
    value1, _ = at(Fraction(magnitude_upper))
    value_half, _ = at((magnitude_lower+magnitude_upper)/2)
    middle = 2*value_half-(value0+value1)/2
    controls = (value0, middle, value1)
    return min(controls), degrees, rows0, controls, p4


def main() -> None:
    for order in range(18, 51):
        minimum = None
        profiles = 0
        derivative_maximum = None
        for increments in partitions(order-2):
            if increments[0] < 3:
                continue
            if sum(value >= 2 for value in increments) < 3:
                continue
            value, degrees, rows, controls, p4 = relaxed(order, increments)
            candidate = (value, degrees, controls.index(value), p4)
            minimum = candidate if minimum is None else min(minimum, candidate)
            derivative = derivative4(order, rows)
            derivative_maximum = (
                derivative if derivative_maximum is None
                else max(derivative_maximum, derivative)
            )
            profiles += 1
        print(order, "MIN", minimum, "D4MAX", derivative_maximum,
              "PROFILES", profiles)


if __name__ == "__main__":
    main()
