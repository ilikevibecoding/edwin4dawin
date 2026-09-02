#!/usr/bin/env python3
"""Probe a coupled signed-support cone for connected high-degree rank-7 G1.

This is exploratory and fail-closed.  It strengthens the frozen J4/E5 cone
by the exact incidences

    E7^+ <= C(m-5,2)(-E5)/2,
    E8^+(non-4K2) <= C(m-5,3)(-E5)/10,
    #(4K2 supports) <= C(m-4,4)J4/6.

The incidence constants come from the exhaustive no-isolate forest-type
catalog through support order eight.  No theorem is promoted by this file.
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
        2 * values[1] - (values[0] + values[2]) / 2,
        values[2],
    )


def relaxed(order, increments, alpha7=Fraction(0), alpha8r=Fraction(0), alpha8m=Fraction(0)):
    degrees = [value + 1 for value in increments] + [1] * (
        order - len(increments)
    )
    edges = order - 1
    moments = {
        rank: sum(choose(degree, rank) for degree in degrees)
        for rank in range(2, 8)
    }
    square = {
        rank: sum(choose(degree, rank) ** 2 for degree in degrees)
        for rank in range(2, 4)
    }
    star = {
        rank: (
            choose(order, rank)
            - edges * choose(order - 2, rank - 2)
            + sum(
                (-1) ** support
                * moments[support]
                * choose(order - support - 1, rank - support - 1)
                for support in range(2, rank)
            )
        )
        for rank in range(3, 9)
    }
    disjoint_edge_pairs = choose(edges, 2) - moments[2]
    wedge_pairs = Fraction(moments[2] ** 2 - square[2], 2)
    degree_upper7 = sum(
        choose(degree, 2) * choose(edges - degree, 2)
        for degree in degrees
    )
    degree_upper8_rest = (
        sum(choose(degree, 5) * (edges - degree) for degree in degrees)
        + sum(
            choose(degree, 4) * (moments[2] - choose(degree, 2))
            for degree in degrees
        )
        + Fraction(moments[3] ** 2 - square[3], 2)
        + sum(
            choose(degree, 3) * choose(edges - degree, 2)
            for degree in degrees
        )
        + wedge_pairs * edges
    )
    degree_upper8_matching = (
        Fraction(disjoint_edge_pairs * choose(edges - 2, 2), 6)
    )
    p4 = p4_floor(order, increments)
    jmax = disjoint_edge_pairs - p4
    assert jmax >= 0

    def at(s, t):
        j4 = jmax * s
        l5 = j4 * (Fraction(1, 2) + Fraction(2 * order - 9, 2) * t)
        correction = {
            4: j4,
            5: -l5,
            6: Fraction(order - 5, 3) * l5,
            7: (
                alpha7 * degree_upper7
                + (1 - alpha7)
                * Fraction(choose(order - 5, 2), 2)
                * l5
            ),
            8: (
                alpha8m * degree_upper8_matching
                + (1 - alpha8m)
                * Fraction(choose(order - 4, 4), 6)
                * j4
                + alpha8r * degree_upper8_rest
                + (1 - alpha8r)
                * Fraction(choose(order - 5, 3), 10)
                * l5
            ),
        }
        rows = {
            rank: star[rank]
            + sum(
                correction[support] * choose(order - support, rank - support)
                for support in range(4, rank + 1)
            )
            for rank in range(3, 9)
        }
        return q(rows)

    grid = [
        [at(Fraction(i, 2), Fraction(j, 2)) for j in range(3)]
        for i in range(3)
    ]
    s_controls = [
        axis_controls([grid[i][j] for i in range(3)]) for j in range(3)
    ]
    controls = tuple(
        axis_controls([s_controls[j][i] for j in range(3)])[k]
        for i in range(3)
        for k in range(3)
    )
    return min(controls), degrees, controls, p4, jmax


def main():
    alpha_grid = tuple(Fraction(value, 2) for value in range(3))
    for order in range(11, 32):
        minimum = None
        profiles = 0
        negative_controls = 0
        for increments in partitions(order - 2):
            if increments[0] < 3:
                continue
            if sum(value >= 2 for value in increments) < 3:
                continue
            best = None
            for alpha7 in alpha_grid:
                for alpha8r in alpha_grid:
                    for alpha8m in alpha_grid:
                        result = relaxed(
                            order, increments, alpha7, alpha8r, alpha8m
                        )
                        value = result[0]
                        candidate_bound = (
                            value, alpha7, alpha8r, alpha8m, result
                        )
                        best = (
                            candidate_bound
                            if best is None or value > best[0]
                            else best
                        )
            value, alpha7, alpha8r, alpha8m, result = best
            _, degrees, controls, p4, jmax = result
            candidate = (
                value,
                degrees,
                controls.index(value),
                p4,
                jmax,
                alpha7,
                alpha8r,
                alpha8m,
            )
            minimum = candidate if minimum is None else min(minimum, candidate)
            negative_controls += sum(control < 0 for control in controls)
            profiles += 1
        print(
            order,
            "MIN",
            minimum,
            "NEG_CONTROLS",
            negative_controls,
            "PROFILES",
            profiles,
            flush=True,
        )


if __name__ == "__main__":
    main()
