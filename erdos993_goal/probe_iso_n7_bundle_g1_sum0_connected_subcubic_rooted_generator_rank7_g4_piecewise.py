#!/usr/bin/env python3
"""Count canonical planted subcubic branches and rooted free candidates."""

from __future__ import annotations

import itertools
from functools import lru_cache


def planted(maximum: int):
    rows: list[list[tuple]] = [[] for _ in range(maximum + 1)]
    rows[1] = [()]
    for order in range(2, maximum + 1):
        current = [(child,) for child in rows[order - 1]]
        for left_order in range(1, (order - 1)//2 + 1):
            right_order = order - 1 - left_order
            if left_order < right_order:
                current.extend(
                    (left, right)
                    for left in rows[left_order]
                    for right in rows[right_order]
                )
            else:
                current.extend(itertools.combinations_with_replacement(
                    rows[left_order], 2
                ))
        rows[order] = current
        print("PLANTED", order, len(current))
    return rows


def rooted_candidate_count(rows, order: int) -> int:
    count = len(rows[order - 1])
    for left_order in range(1, (order - 1)//2 + 1):
        right_order = order - 1 - left_order
        if left_order < right_order:
            count += len(rows[left_order])*len(rows[right_order])
        else:
            count += len(rows[left_order])*(len(rows[left_order])+1)//2
    for first_order in range(1, order - 2):
        for second_order in range(first_order, order - 1):
            third_order = order - 1 - first_order - second_order
            if third_order < second_order:
                continue
            sizes = [first_order, second_order, third_order]
            multiplicities = {size: sizes.count(size) for size in set(sizes)}
            factor = 1
            for size, multiplicity in multiplicities.items():
                number = len(rows[size])
                factor *= (
                    number if multiplicity == 1
                    else number*(number+1)//2 if multiplicity == 2
                    else number*(number+1)*(number+2)//6
                )
            count += factor
    return count


@lru_cache(maxsize=None)
def height(tree: tuple) -> int:
    return 1 + max((height(child) for child in tree), default=0)


def polynomial_add(left: tuple[int, ...], right: tuple[int, ...]):
    return tuple(
        (left[index] if index < len(left) else 0)
        +(right[index] if index < len(right) else 0)
        for index in range(max(len(left), len(right)))
    )


def polynomial_multiply(left: tuple[int, ...], right: tuple[int, ...]):
    result = [0]*(len(left)+len(right)-1)
    for left_index, left_value in enumerate(left):
        for right_index, right_value in enumerate(right):
            result[left_index+right_index] += left_value*right_value
    return tuple(result)


@lru_cache(maxsize=None)
def rooted_states(tree: tuple):
    excluded = (1,)
    included = (0, 1)
    for child in tree:
        child_excluded, child_included = rooted_states(child)
        excluded = polynomial_multiply(
            excluded, polynomial_add(child_excluded, child_included)
        )
        included = polynomial_multiply(included, child_excluded)
    return excluded, included


def group_choices(rows, sizes):
    if max(sizes) >= len(rows):
        return
    groups = []
    for size, values in itertools.groupby(sizes):
        multiplicity = len(list(values))
        groups.append(itertools.combinations_with_replacement(
            rows[size], multiplicity
        ))
    for choices in itertools.product(*groups):
        yield tuple(sorted(itertools.chain.from_iterable(choices)))


def centered_trees(rows, order: int):
    # Unique vertex center: the two tallest incident branches have equal
    # height.  The center decomposition is canonical.
    for first in range(1, (order-1)//2+1):
        second = order-1-first
        if first > second:
            continue
        for branches in group_choices(rows, (first, second)):
            if height(branches[0]) == height(branches[1]):
                yield ("vertex", branches)
    for first in range(1, order-2):
        for second in range(first, order-1):
            third = order-1-first-second
            if third < second:
                continue
            for branches in group_choices(rows, (first, second, third)):
                heights = sorted(height(branch) for branch in branches)
                if heights[-1] == heights[-2]:
                    yield ("vertex", branches)
    # Central edge: the two rooted halves have equal height.
    for first in range(1, order//2+1):
        second = order-first
        if first > second:
            continue
        for halves in group_choices(rows, (first, second)):
            if height(halves[0]) == height(halves[1]):
                yield ("edge", halves)


def independence_polynomial(kind: str, pieces: tuple):
    if kind == "vertex":
        excluded, included = rooted_states(pieces)
        return polynomial_add(excluded, included)
    (left_excluded, left_included), (right_excluded, right_included) = (
        rooted_states(piece) for piece in pieces
    )
    return polynomial_add(
        polynomial_multiply(left_excluded, right_excluded),
        polynomial_add(
            polynomial_multiply(left_included, right_excluded),
            polynomial_multiply(left_excluded, right_included),
        ),
    )


def g1_value(polynomial: tuple[int, ...]) -> int:
    rows = list(polynomial)+[0]*9
    w3, w4, w5, w6, w7, w8 = rows[3:9]
    return (
        8*w3*w3+24*w3*w4-64*w3*w5-106*w3*w6-51*w3*w7
        -8*w3*w8+80*w4*w4+90*w4*w5-12*w4*w6-10*w4*w7
        +39*w5*w5+10*w5*w6
    )


def main() -> None:
    rows = planted(18)
    for order in range(2, 24):
        minimum = None
        count = 0
        negative = 0
        for kind, pieces in centered_trees(rows, order):
            value = g1_value(independence_polynomial(kind, pieces))
            minimum = value if minimum is None else min(minimum, value)
            negative += value < 0
            count += 1
        print("CENTERED", order, count, "MINIMUM", minimum, "NEGATIVE", negative)


if __name__ == "__main__":
    main()
