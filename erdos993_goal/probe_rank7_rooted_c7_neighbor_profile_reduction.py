#!/usr/bin/env python3
"""Exact low-memory rooted-C7 refinement by the root-neighbour excess profile.

This is a structural enumeration, not a tree census.  For every surviving
triple (n,r,lambda), it enumerates the possible multiset

    (deg(u)-1 : u in N(root))

and retains three pieces of literal placement information:

* the forced weighted-core edges incident with a positive-excess root;
* the brooms and length-two pairs forced at that root; and
* a degree-capacity/rearrangement upper bound for the weighted-core edge
  correlation.  For a leaf root the last item uses the leaf slot forced at
  its support.

All arithmetic used in the rooted-C7 scalar is exact rational arithmetic.
"""

from __future__ import annotations

from collections import Counter
from fractions import Fraction
from functools import lru_cache
from itertools import combinations
from math import comb

import probe_rank7_rooted_c7_degree_partition_cone as cone


class InfeasibleProfile(ValueError):
    """The exact lower and upper structural bounds do not overlap."""


def choose(value: int, rank: int) -> int:
    return comb(value, rank) if value >= rank else 0


def remove_values(values: tuple[int, ...], removed: tuple[int, ...]) -> list[int]:
    left = list(values)
    for value in removed:
        left.remove(value)
    return left


def positive_neighbour_profiles(
    partition: tuple[int, ...], root_degree: int
):
    """Yield each distinct literal neighbour-excess multiset.

    Zero entries are the leaf neighbours of the root.  This is a safe outer
    list: every literal tree profile occurs, while a yielded multiset need not
    admit a complete weighted-core placement.
    """
    if root_degree == 1:
        for support in sorted(set(partition), reverse=True):
            yield (support,)
        return

    root_weight = root_degree - 1
    remaining = list(partition)
    remaining.remove(root_weight)
    q = len(partition)
    minimum = 0 if q == 1 else 1
    maximum = min(root_degree, len(remaining))
    counts = sorted(Counter(remaining).items(), reverse=True)

    def visit(position: int, left: int, selected: list[int]):
        if position == len(counts):
            size = len(selected)
            if minimum <= size <= maximum:
                yield tuple(selected) + (0,) * (root_degree - size)
            return
        value, multiplicity = counts[position]
        for take in range(min(multiplicity, left), -1, -1):
            selected.extend([value] * take)
            yield from visit(position + 1, left - take, selected)
            if take:
                del selected[-take:]

    yield from visit(0, maximum, [])


def rearrangement_sum(children: list[int], slots: list[int]) -> int | None:
    if len(slots) < len(children):
        return None
    children.sort(reverse=True)
    slots.sort(reverse=True)
    return sum(x * y for x, y in zip(children, slots))


@lru_cache(maxsize=32768)
def edge_correlation_upper(
    partition: tuple[int, ...], root_degree: int, xs: tuple[int, ...]
) -> int:
    """Capacity/rearrangement upper bound for E=sum_(uv) x_u x_v.

    Orient the positive-excess core away from a maximum-weight vertex.  Each
    nonroot weight is a child exactly once.  A vertex of core-degree cap c
    supplies c parent slots at the orientation root and c-1 elsewhere.
    After consuming the directions of the forced root edges, rearrangement
    bounds the remaining child-parent products.  Maximising over the possible
    maximum vertex and (when needed) the branch containing it gives a bound
    valid for every compatible placement.
    """
    maximum = partition[0]

    if root_degree == 1:
        support_weight = xs[0]
        weights = list(partition)
        support = weights.index(support_weight)
        caps = [weight + 1 for weight in weights]
        caps[support] -= 1  # the specified root occupies one leaf slot
        candidates = []
        for z, weight in enumerate(weights):
            if weight != maximum:
                continue
            slots = []
            for i, parent_weight in enumerate(weights):
                count = caps[i] if i == z else caps[i] - 1
                if count < 0:
                    break
                slots.extend([parent_weight] * count)
            else:
                children = [weights[i] for i in range(len(weights)) if i != z]
                value = rearrangement_sum(children, slots)
                if value is not None:
                    candidates.append(value)
        assert candidates
        return max(candidates)

    root_weight = root_degree - 1
    selected_weights = tuple(value for value in xs if value > 0)
    unselected = remove_values(partition, (root_weight,) + selected_weights)
    weights = [root_weight, *selected_weights, *unselected]
    root = 0
    selected = tuple(range(1, 1 + len(selected_weights)))
    caps = [len(selected), *(weight + 1 for weight in weights[1:])]
    candidates = []

    for z, weight in enumerate(weights):
        if weight != maximum:
            continue
        if z == root:
            cases = (None,)
        else:
            # If z itself is a selected neighbour, its branch is forced.
            cases = (z,) if z in selected else selected
        for branch in cases:
            if z == root:
                directed = [(child, root) for child in selected]
            else:
                if branch is None:
                    continue
                directed = [(root, branch)] + [
                    (child, root) for child in selected if child != branch
                ]

            child_slots = [
                caps[i] if i == z else caps[i] - 1
                for i in range(len(weights))
            ]
            valid = True
            forced_value = 0
            forced_children = set()
            for child, parent in directed:
                child_slots[parent] -= 1
                if child_slots[parent] < 0 or child in forced_children:
                    valid = False
                    break
                forced_children.add(child)
                forced_value += weights[child] * weights[parent]
            if not valid:
                continue
            slots = [
                weights[i]
                for i, count in enumerate(child_slots)
                for _ in range(count)
            ]
            children = [
                weights[i]
                for i in range(len(weights))
                if i != z and i not in forced_children
            ]
            remainder = rearrangement_sum(children, slots)
            if remainder is not None:
                candidates.append(forced_value + remainder)

    assert candidates, (partition, root_degree, xs)
    return max(candidates)


def edge_correlation_lower(
    partition: tuple[int, ...], root_degree: int, xs: tuple[int, ...]
) -> int:
    baseline = len(partition) - 1
    if root_degree == 1:
        return baseline
    root_weight = root_degree - 1
    return baseline + sum(
        root_weight * value - 1 for value in xs if value > 0
    )


def forced_connected_four(
    partition: tuple[int, ...], root_degree: int, xs: tuple[int, ...]
) -> int:
    """Stars plus the brooms and root-centred paths forced by the profile."""
    b2, b3, b4 = cone.stats(partition)
    del b2
    stars = b3 + b4
    if root_degree == 1:
        return stars
    root_weight = root_degree - 1
    positive = [value for value in xs if value > 0]
    brooms = sum(
        choose(root_weight, 2) * value
        + choose(value, 2) * root_weight
        for value in positive
    )
    paths = sum(left * right for left, right in combinations(positive, 2))
    return stars + brooms + paths


def ratio_lower(
    n: int, root_degree: int, partition: tuple[int, ...], xs: tuple[int, ...]
) -> Fraction:
    b2, b3, _ = cone.stats(partition)
    edge_lo = edge_correlation_lower(partition, root_degree, xs)
    edge_slot = edge_correlation_upper(partition, root_degree, xs)
    edge_zagreb = Fraction(
        7 * (n - 3) + 2 * (n - 4) * b2 - 6 * b3, 7
    )
    edge_hi = min(Fraction(edge_slot), edge_zagreb)
    if edge_lo > edge_hi:
        raise InfeasibleProfile(
            (n, root_degree, partition, xs, edge_lo, edge_hi)
        )
    X = edge_hi - (n - 3)

    A = Fraction(3 * n**3 - 40 * n**2 + 133 * n - 40, 2)
    B = 4 * n**2 - 35 * n + 49
    C = 4 * n**2 - 30 * n + 34
    D = 5 * (n - 3)
    local_W = forced_connected_four(partition, root_degree, xs) - (n - 4)
    W = max(Fraction(b2 + b3) + max(Fraction(0), X), Fraction(local_W))
    L = A * b2 - B * b3 - C * X + D * W
    assert L >= 0

    triples_min = b2 + b3 + edge_lo
    i4_cap = (
        comb(n, 4)
        - (n - 1) * comb(n - 2, 2)
        + (n - 2 + b2) * (n - 4)
        + comb(n - 1, 2)
        - triples_min
    )
    i4_cap = min(i4_cap, comb(n - 1, 4))
    assert i4_cap > 0
    return Fraction((n - 7) * (n - 8), n - 3) + L / ((n - 3) * i4_cap)


def scalar(
    n: int, root_degree: int, partition: tuple[int, ...], xs: tuple[int, ...]
) -> Fraction:
    x = cone.transfer(ratio_lower(n, root_degree, partition, xs)) / 6
    extension_ceiling = Fraction(n - root_degree - 5, 5)
    return 1 + 2 * x - 28 * (extension_ceiling - x) / (1 + extension_ceiling)


if __name__ == "__main__":
    # Tiny smoke row; the full exact assembler is separate.
    example = (3, 2, 2) + (1,) * 16
    for profile in positive_neighbour_profiles(example, 2):
        print(profile, scalar(25, 2, example, profile))
