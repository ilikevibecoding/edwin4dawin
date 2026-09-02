#!/usr/bin/env python3
"""Exact abstract convolution witness for the certified non-LC tree.

This does not claim a graph counterexample.  It verifies an explicit integer
unimodal sequence b, with b[0]=1, such that the convolution of b with the
102-vertex tree's independence sequence has a strict valley.  It also records
the immediate obstruction to realizing b as an independence polynomial:
b[1]=1 would force the graph to have one vertex, while deg(b)>1.
"""

from __future__ import annotations

from verify_perfect_matching_lc_failure import decorated_polynomial


def convolve(left: list[int], right: list[int]) -> list[int]:
    result = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            result[i + j] += a * b
    return result


def main() -> None:
    a = decorated_polynomial()
    j = 50
    defect = a[j - 1] * a[j + 1] - a[j] ** 2
    assert defect == 217118746959920758784

    upward_jump = a[j - 1] + a[j]
    downward_jump = a[j] + a[j + 1]
    assert 0 < downward_jump < upward_jump

    # Keep every other first difference farther than deg(a) from the two
    # central jumps.  The initial plateau also makes b[0]=b[1]=1.
    jump_index = len(a) + 1
    b = [1] * jump_index
    b.append(1 + upward_jump)
    b.extend(
        [1 + upward_jump - downward_jump] * (len(a) + 1)
    )

    mode = jump_index
    assert all(b[k] <= b[k + 1] for k in range(mode))
    assert all(b[k] >= b[k + 1] for k in range(mode, len(b) - 1))
    assert b[0] == b[1] == 1
    assert len(b) - 1 > 1

    product = convolve(a, b)
    valley = jump_index + j
    left_slope = product[valley] - product[valley - 1]
    right_slope = product[valley + 1] - product[valley]
    assert left_slope == -defect
    assert right_slope == defect
    assert product[valley - 1] > product[valley] < product[valley + 1]

    # For every finite graph G, [x]I(G;x)=|V(G)|.  Thus b[1]=1 would force
    # |V(G)|=1 and deg I(G;x)<=1, contrary to deg(b)>1.
    assert b[1] == 1 and len(b) - 1 > 1

    print(f"tree degree: {len(a) - 1}")
    print(f"abstract kernel degree: {len(b) - 1}")
    print(f"valley index: {valley}")
    print(f"left slope: {left_slope}")
    print(f"right slope: {right_slope}")
    print("kernel is integer and unimodal")
    print("kernel is not a graph independence polynomial")
    print("all exact assertions passed")


if __name__ == "__main__":
    main()
