#!/usr/bin/env python3
"""Exact degree-profile relaxation scan for connected max-degree>=4 G1."""

from __future__ import annotations

import math
from fractions import Fraction


def partitions(total, ceiling=None):
    if total == 0:
        yield ()
        return
    ceiling = min(total, ceiling if ceiling is not None else total)
    for first in range(ceiling, 0, -1):
        for rest in partitions(total-first, first):
            yield (first,)+rest


def choose(value, rank):
    return math.comb(value, rank) if value >= rank >= 0 else 0


def q(rows):
    w3, w4, w5, w6, w7, w8 = (rows[index] for index in range(3, 9))
    return (
        8*w3*w3+24*w3*w4-64*w3*w5-106*w3*w6-51*w3*w7
        -8*w3*w8+80*w4*w4+90*w4*w5-12*w4*w6-10*w4*w7
        +39*w5*w5+10*w5*w6
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
    upper6 = (
        sum(choose(degree, 3)*(edges-degree) for degree in degrees)
        +wedge_pairs
    )
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
    e4_upper = disjoint_edge_pairs-(order-3)
    magnitude_upper = max(0, e4_upper*(order-4))

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

    value0, rows0 = at(Fraction(0))
    value1, rows1 = at(Fraction(magnitude_upper))
    value_half, _ = at(Fraction(magnitude_upper, 2))
    middle = 2*value_half-(value0+value1)/2
    controls = (value0, middle, value1)
    return min(controls), degrees, rows0, controls


def derivative4(order, rows):
    direction = {
        rank: choose(order-4, rank-4) for rank in range(3, 9)
    }
    moved = {rank: rows[rank]+direction[rank] for rank in rows}
    pure = {rank: direction[rank] for rank in rows}
    return q(moved)-q(rows)-q(pure)


def main() -> None:
    for order in range(41, 44):
        values = []
        derivative_maximum = None
        for increments in partitions(order-2):
            if increments[0] < 3:
                continue
            if len(increments) == 1:
                continue
            if sum(value >= 2 for value in increments) < 3:
                continue
            value, degrees, rows, controls = relaxed(order, increments)
            values.append((value, degrees, controls.index(value)))
            derivative = derivative4(order, rows)
            derivative_maximum = (
                derivative if derivative_maximum is None
                else max(derivative_maximum, derivative)
            )
        values.sort(key=lambda row: row[0])
        if not values:
            continue
        print(order, "MIN", values[0], "D4MAX", derivative_maximum, "PROFILES", len(values))


if __name__ == "__main__":
    main()
