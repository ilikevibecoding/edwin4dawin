#!/usr/bin/env python3
"""Exact replay of the matching-block reduction on all small trees."""

from __future__ import annotations

import sys
from itertools import product
from pathlib import Path

import networkx as nx


PUBLIC_REPO = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(PUBLIC_REPO))

from indpoly import independence_poly  # noqa: E402


def poly_add(a: list[int], b: list[int]) -> list[int]:
    out = [0] * max(len(a), len(b))
    for j, value in enumerate(a):
        out[j] += value
    for j, value in enumerate(b):
        out[j] += value
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def shifted_binomial(shift: int, exponent: int) -> list[int]:
    row = [1]
    for _ in range(exponent):
        row = poly_add(row, [0] + row)
    return [0] * shift + row


def adjacency(g: nx.Graph) -> list[list[int]]:
    vertices = list(g.nodes())
    index = {v: j for j, v in enumerate(vertices)}
    out = [[] for _ in vertices]
    for u, v in g.edges():
        out[index[u]].append(index[v])
        out[index[v]].append(index[u])
    return out


def exact_independence_poly(g: nx.Graph) -> list[int]:
    adj = adjacency(g)
    return independence_poly(len(adj), adj)


def leaf_defect_maximum_matching(g: nx.Graph) -> set[frozenset[int]]:
    internal = {v for v in g if g.degree(v) > 1}
    scale = len(g) + 1
    weighted = g.copy()
    for u, v in weighted.edges():
        weighted[u][v]["weight"] = (
            scale + int(u in internal) + int(v in internal)
        )
    raw = nx.max_weight_matching(
        weighted,
        maxcardinality=True,
        weight="weight",
    )
    matching = {frozenset(edge) for edge in raw}
    covered = set().union(*matching) if matching else set()
    assert all(g.degree(v) <= 1 for v in set(g) - covered)
    return matching


def matching_dictionary(
    matching: set[frozenset[int]],
) -> dict[int, int]:
    out = {}
    for edge in matching:
        u, v = tuple(edge)
        out[u] = v
        out[v] = u
    return out


def minimum_cover(
    g: nx.Graph,
    matching: set[frozenset[int]],
) -> set[int]:
    coloring = nx.algorithms.bipartite.color(g)
    top = {v for v, color in coloring.items() if color == 0}
    return set(
        nx.algorithms.bipartite.to_vertex_cover(
            g,
            matching_dictionary(matching),
            top,
        )
    )


def matching_block_poly(g: nx.Graph) -> tuple[list[int], dict]:
    matching = leaf_defect_maximum_matching(g)
    cover = minimum_cover(g, matching)
    independent_side = set(g) - cover
    assert all(u in cover or v in cover for u, v in g.edges())
    assert len(cover) == len(matching)
    assert all(len(edge & cover) == 1 for edge in matching)

    blocks: list[dict] = []
    vertex_block: dict[int, int] = {}
    matching_edges = set(matching)

    for edge in sorted(matching, key=lambda e: sorted(e)):
        c = next(iter(edge & cover))
        m = next(iter(edge - cover))
        block_id = len(blocks)
        blocks.append({"C": c, "M": m, "singleton": False})
        vertex_block[c] = block_id
        vertex_block[m] = block_id

    covered = set(vertex_block)
    for m in sorted(set(g) - covered):
        assert m in independent_side
        block_id = len(blocks)
        blocks.append({"M": m, "singleton": True})
        vertex_block[m] = block_id

    core_count = len(matching)
    singleton_ids = set(range(core_count, len(blocks)))
    core_edges = []
    singleton_parent: dict[int, int] = {}

    for u, v in g.edges():
        if frozenset((u, v)) in matching_edges:
            continue
        bu, bv = vertex_block[u], vertex_block[v]
        assert bu != bv
        if bu in singleton_ids or bv in singleton_ids:
            singleton = bu if bu in singleton_ids else bv
            parent = bv if singleton == bu else bu
            singleton_vertex = blocks[singleton]["M"]
            parent_vertex = v if singleton == bu else u
            assert g.degree(singleton_vertex) <= 1
            assert parent < core_count
            assert blocks[parent]["C"] == parent_vertex
            singleton_parent[singleton] = parent
        else:
            color_u = "C" if blocks[bu]["C"] == u else "M"
            color_v = "C" if blocks[bv]["C"] == v else "M"
            core_edges.append((bu, color_u, bv, color_v))

    assert len(singleton_parent) == sum(
        1
        for block_id in singleton_ids
        if g.degree(blocks[block_id]["M"]) == 1
    )
    r = [0] * core_count
    isolated_singletons = 0
    for block_id in singleton_ids:
        if block_id in singleton_parent:
            r[singleton_parent[block_id]] += 1
        else:
            assert g.degree(blocks[block_id]["M"]) == 0
            isolated_singletons += 1

    total = [0]
    states = (0, 1, 2)  # empty, M, C
    for state in product(states, repeat=core_count):
        valid = True
        for u, color_u, v, color_v in core_edges:
            su = "M" if state[u] == 1 else "C" if state[u] == 2 else None
            sv = "M" if state[v] == 1 else "C" if state[v] == 2 else None
            if su == color_u and sv == color_v:
                valid = False
                break
        if not valid:
            continue
        occupied = sum(value != 0 for value in state)
        blocked_singletons = sum(
            r[v] for v, value in enumerate(state) if value == 2
        )
        optional = len(singleton_ids) - blocked_singletons
        total = poly_add(
            total,
            shifted_binomial(occupied, optional),
        )

    alpha = len(exact_independence_poly(g)) - 1
    metadata = {
        "matching_number": len(matching),
        "alpha": alpha,
        "block_count": len(blocks),
        "singleton_count": len(singleton_ids),
        "isolated_singletons": isolated_singletons,
    }
    return total, metadata


def main() -> None:
    checked = 0
    for n in range(1, 13):
        trees = (
            [nx.empty_graph(1)]
            if n == 1
            else nx.generators.nonisomorphic_trees(n)
        )
        for g in trees:
            direct = exact_independence_poly(g)
            reconstructed, data = matching_block_poly(g)
            assert reconstructed == direct
            assert data["block_count"] == data["alpha"]
            assert data["singleton_count"] == 2 * data["alpha"] - n
            alpha = data["alpha"]
            tail_start = (2 * alpha + 1) // 3
            for k in range(tail_start, alpha):
                assert (k + 1) * direct[k + 1] <= 2 * (
                    alpha - k
                ) * direct[k]
            checked += 1
        print(f"n={n}: passed")
    print(f"all {checked} nonisomorphic trees through n=12 passed")


if __name__ == "__main__":
    main()
