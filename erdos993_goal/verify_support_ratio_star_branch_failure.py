#!/usr/bin/env python3
"""Independent replay of the 29-vertex support-ratio counterexample."""

from math import comb


def add(a: list[int], b: list[int]) -> list[int]:
    out = [0] * max(len(a), len(b))
    for i, value in enumerate(a):
        out[i] += value
    for i, value in enumerate(b):
        out[i] += value
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def mul(a: list[int], b: list[int]) -> list[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, ai in enumerate(a):
        for j, bj in enumerate(b):
            out[i + j] += ai * bj
    return out


def shift(a: list[int]) -> list[int]:
    return [0] + a


def rooted_dp(adj: list[list[int]], vertex: int, parent: int) -> tuple[list[int], list[int]]:
    """Return (A,B): root excluded, and root included with x removed."""
    excluded = [1]
    included_without_x = [1]
    for child in adj[vertex]:
        if child == parent:
            continue
        child_a, child_b = rooted_dp(adj, child, vertex)
        child_full = add(child_a, shift(child_b))
        excluded = mul(excluded, child_full)
        included_without_x = mul(included_without_x, child_a)
    return excluded, included_without_x


def build_tree(branches: list[int]) -> list[list[int]]:
    # Vertex 0 is the support vertex.  Vertex 1 is its pendant leaf.
    # Each other neighbour is the centre of a star with the listed number
    # of leaves.
    order = 2 + sum(1 + m for m in branches)
    adj = [[] for _ in range(order)]

    def edge(u: int, v: int) -> None:
        adj[u].append(v)
        adj[v].append(u)

    edge(0, 1)
    next_vertex = 2
    for m in branches:
        centre = next_vertex
        next_vertex += 1
        edge(0, centre)
        for _ in range(m):
            edge(centre, next_vertex)
            next_vertex += 1
    assert next_vertex == order
    assert sum(map(len, adj)) == 2 * (order - 1)
    return adj


def verify_all_rank_witness() -> None:
    adj = build_tree([2] * 9)
    e, j = rooted_dp(adj, 0, -1)

    # Structural formula: E=(1+x)(1+3x+x^2)^9, J=(1+x)^18.
    expected_e = [1, 1]
    for _ in range(9):
        expected_e = mul(expected_e, [1, 3, 1])
    expected_j = [comb(18, k) for k in range(19)]
    assert e == expected_e
    assert j == expected_j

    k = 12
    assert (e[k], e[k + 1], j[k], j[k + 1]) == (355890, 164136, 18564, 8568)
    minor = e[k + 1] * j[k] - e[k] * j[k + 1]
    assert minor == -2244816

    polynomial = add(e, shift(j))
    expected_polynomial = [
        1, 29, 378, 2970, 15810, 60552, 172704, 374454, 624843,
        808146, 813008, 636777, 387714, 182700, 66060, 18054,
        3633, 513, 46, 2,
    ]
    assert polynomial == expected_polynomial

    # This defeats only the proposed ratio invariant, not tree unimodality.
    mode = max(range(len(polynomial)), key=polynomial.__getitem__)
    assert mode == 10
    assert all(polynomial[i] <= polynomial[i + 1] for i in range(mode))
    assert all(polynomial[i] >= polynomial[i + 1] for i in range(mode, len(polynomial) - 1))
    assert all(
        polynomial[i] ** 2 >= polynomial[i - 1] * polynomial[i + 1]
        for i in range(1, len(polynomial) - 1)
    )

    alpha = len(polynomial) - 1
    cutoff = (2 * alpha + 1) // 3
    gsb = [
        k * polynomial[k] ** 2
        + polynomial[k - 1] * polynomial[k]
        - (k + 1) * polynomial[k - 1] * polynomial[k + 1]
        for k in range(1, cutoff)
    ]
    assert min(gsb) > 0

    print("PASS")
    print("tree order:", len(adj))
    print("support-ratio failure rank:", k)
    print("minor:", minor)
    print("mode:", mode)
    print("alpha:", alpha, "prefix-GSB cutoff:", cutoff)


def verify_prefix_witness() -> None:
    branches = [3] * 7 + [4]
    adj = build_tree(branches)
    e, j = rooted_dp(adj, 0, -1)

    expected_e = [1, 1]
    for m in branches:
        factor = [comb(m, q) for q in range(m + 1)]
        factor[1] += 1
        expected_e = mul(expected_e, factor)
    expected_j = [comb(25, q) for q in range(26)]
    assert e == expected_e
    assert j == expected_j

    polynomial = add(e, shift(j))
    mode = max(range(len(polynomial)), key=polynomial.__getitem__)
    assert mode == 13

    k = 12
    assert (e[k], e[k + 1], j[k], j[k + 1]) == (
        25606914,
        25517086,
        5200300,
        5200300,
    )
    minor = e[k + 1] * j[k] - e[k] * j[k + 1]
    assert minor == -467132548400
    assert k < mode

    expected_polynomial = [
        1, 35, 561, 5511, 37375, 186734, 716198, 2170333, 5310206,
        10670632, 17852774, 25143031, 30064314, 30717386, 26933413,
        20312040, 13177314, 7337798, 3490472, 1407111, 475013, 131965,
        29414, 5062, 632, 51, 2,
    ]
    assert polynomial == expected_polynomial
    assert all(polynomial[q] <= polynomial[q + 1] for q in range(mode))
    assert all(
        polynomial[q] >= polynomial[q + 1]
        for q in range(mode, len(polynomial) - 1)
    )

    alpha = len(polynomial) - 1
    cutoff = (2 * alpha + 1) // 3
    gsb = [
        q * polynomial[q] ** 2
        + polynomial[q - 1] * polynomial[q]
        - (q + 1) * polynomial[q - 1] * polynomial[q + 1]
        for q in range(1, cutoff)
    ]
    assert min(gsb) > 0

    print("PASS prefix witness")
    print("tree order:", len(adj))
    print("support-ratio failure rank:", k, "mode:", mode)
    print("minor:", minor)
    print("alpha:", alpha, "prefix-GSB cutoff:", cutoff)


def main() -> None:
    verify_all_rank_witness()
    verify_prefix_witness()


if __name__ == "__main__":
    main()
