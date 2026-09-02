#!/usr/bin/env python3
"""Exact degree-profile scan with the connected J4/E5 coupling.

The support domain is

    0 <= J=E4 <= Jmax,
    J/2 <= L=-E5 <= (m-4)J,
    E6 <= (m-5)L/3.

After raising E6,E7,E8 to their exact safe upper faces, parameterize the
remaining trapezoid by J=Jmax*s and
L=J*(1/2+(m-9/2)t).  The reduced G1 form is biquadratic on the unit square;
all nine tensor Bernstein controls are computed exactly.
"""

from __future__ import annotations

from fractions import Fraction

from probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_rank7_g4_piecewise import (
    choose,
    partitions,
    q,
)
from probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_p4_rank7_g4_piecewise import (
    p4_floor,
)


def axis_controls(values):
    assert len(values) == 3
    return (
        values[0],
        2*values[1]-(values[0]+values[2])/2,
        values[2],
    )


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
    jmax = disjoint_edge_pairs-p4
    assert jmax >= 0

    def at(s, t):
        j4 = jmax*s
        l5 = j4*(Fraction(1, 2)+Fraction(2*order-9, 2)*t)
        correction = {
            4: j4,
            5: -l5,
            6: Fraction(order-5, 3)*l5,
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
        return q(rows)

    grid = [
        [at(Fraction(i, 2), Fraction(j, 2)) for j in range(3)]
        for i in range(3)
    ]
    s_controls = [axis_controls([grid[i][j] for i in range(3)]) for j in range(3)]
    controls = tuple(
        axis_controls([s_controls[j][i] for j in range(3)])[k]
        for i in range(3)
        for k in range(3)
    )
    return min(controls), degrees, controls, p4, jmax


def main() -> None:
    for order in range(18, 51):
        minimum = None
        profiles = 0
        negative_controls = 0
        for increments in partitions(order-2):
            if increments[0] < 3:
                continue
            if sum(value >= 2 for value in increments) < 3:
                continue
            value, degrees, controls, p4, jmax = relaxed(order, increments)
            candidate = (
                value,
                degrees,
                controls.index(value),
                p4,
                jmax,
            )
            minimum = candidate if minimum is None else min(minimum, candidate)
            negative_controls += sum(control < 0 for control in controls)
            profiles += 1
        print(order, "MIN", minimum, "NEG_CONTROLS", negative_controls,
              "PROFILES", profiles)


if __name__ == "__main__":
    main()
