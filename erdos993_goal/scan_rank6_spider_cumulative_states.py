#!/usr/bin/env python3
"""Exact scan of the cumulative four-coordinate spider state space.

Coordinates:

    M = number of arms,
    T = number of arms of length at least 2,
    U = number of arms of length at least 3,
    R = sum(max(length - 3, 0)).

Thus M >= T >= U >= 0 and n - 1 = M + T + U + R.
Deleting a leaf from an arm of type L1, L2, L3, or L4+ subtracts one
from M, T, U, or R, respectively.
"""

from __future__ import annotations

import argparse
from math import comb


def choose(n, k):
    return comb(n, k) if n >= k >= 0 else 0


def independent_4_5(state):
    m, t, u, r = state
    q = t + u + r
    n = 1 + m + q
    wedge = choose(m, 2) + q
    connected_three = choose(m, 3) + (m - 1) * t + u + r
    disconnected = (
        (n + 1) * wedge
        - m * choose(m, 2)
        - 2 * q
        - (m * (m - 1) + 2 * m * t + 4 * u + 4 * r)
    )
    connected_four = (
        choose(m, 4)
        + choose(m - 1, 2) * t
        + choose(t, 2)
        + (m - 1) * u
        + r
    )
    i4 = (
        choose(n, 4)
        - (n - 1) * choose(n - 2, 2)
        + wedge * (n - 4)
        + choose(n - 1, 2)
        - connected_three
    )
    i5 = (
        choose(n, 5)
        - (n - 1) * choose(n - 2, 3)
        + wedge * choose(n - 3, 2)
        + (choose(n - 1, 2) - wedge) * (n - 4)
        - connected_three * (n - 4)
        - disconnected
        + connected_four
    )
    return i4, i5


ROOT_AXIS = {"L1": 0, "L2": 1, "L3": 2, "L4+": 3}


def root_feasible(state, label):
    m, t, u, r = state
    if label == "L1":
        return m > t
    if label == "L2":
        return t > u
    if label == "L3":
        # Some arm can have length exactly 3.  When u=1 and r>0,
        # the unique long arm must absorb all excess and is not length 3.
        return u >= 1 and (u >= 2 or r == 0)
    if label == "L4+":
        return u >= 1 and r >= 1
    raise ValueError(label)


def strong_value(state, label):
    d, e = independent_4_5(state)
    deleted = list(state)
    deleted[ROOT_AXIS[label]] -= 1
    h, k = independent_4_5(tuple(deleted))
    return d * (2 * e + d) - 24 * (e * h - d * k)


def states_of_weight(weight):
    for m in range(3, weight + 1):
        for t in range(min(m, weight - m) + 1):
            for u in range(min(t, weight - m - t) + 1):
                r = weight - m - t - u
                if r < 0:
                    continue
                if u == 0 and r != 0:
                    continue
                yield (m, t, u, r)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimum-order", type=int, default=18)
    parser.add_argument("--maximum-order", type=int, default=150)
    args = parser.parse_args()

    global_minimum = None
    global_witness = None
    root_dominance_failures = []
    coordinate_increment_minima = {
        (label, axis): None
        for label in ROOT_AXIS
        for axis in range(4)
    }
    coordinate_increment_witnesses = {}

    for order in range(args.minimum_order, args.maximum_order + 1):
        weight = order - 1
        order_minimum = None
        order_witness = None
        states = 0
        rooted = 0
        for state in states_of_weight(weight):
            states += 1
            values = {}
            for label in ROOT_AXIS:
                if root_feasible(state, label):
                    value = strong_value(state, label)
                    values[label] = value
                    rooted += 1
                    if order_minimum is None or value < order_minimum:
                        order_minimum = value
                        order_witness = (state, label)
            if "L1" in values:
                for label, value in values.items():
                    if value < values["L1"]:
                        root_dominance_failures.append(
                            (state, label, value, values["L1"])
                        )
                        if len(root_dominance_failures) >= 10:
                            break

            # Fixed-root coordinate increments.  Feasibility in the larger
            # state is checked; this diagnostic intentionally includes some
            # increments that may extend the rooted arm and hence change its
            # label, so it is only a necessary algebraic probe.
            for label in values:
                before = values[label]
                for axis in range(4):
                    larger = list(state)
                    larger[axis] += 1
                    larger = tuple(larger)
                    if not (larger[0] >= larger[1] >= larger[2] >= 0):
                        continue
                    if larger[2] == 0 and larger[3] != 0:
                        continue
                    if not root_feasible(larger, label):
                        continue
                    increment = strong_value(larger, label) - before
                    key = (label, axis)
                    old = coordinate_increment_minima[key]
                    if old is None or increment < old:
                        coordinate_increment_minima[key] = increment
                        coordinate_increment_witnesses[key] = (
                            state,
                            larger,
                        )

        if global_minimum is None or order_minimum < global_minimum:
            global_minimum = order_minimum
            global_witness = (order, order_witness)
        if (
            order == args.minimum_order
            or order == args.maximum_order
            or order <= args.minimum_order + 4
            or order % 10 == 0
        ):
            print(
                f"n={order} states={states:,} rooted={rooted:,} "
                f"minimum={order_minimum} witness={order_witness}",
                flush=True,
            )
        if len(root_dominance_failures) >= 10:
            break

    print("global minimum:", global_minimum, global_witness)
    print("first L1-dominance failures:", root_dominance_failures)
    print("fixed-label coordinate increment minima:")
    for key in sorted(coordinate_increment_minima):
        print(
            f"  {key}: {coordinate_increment_minima[key]} "
            f"{coordinate_increment_witnesses.get(key)}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
