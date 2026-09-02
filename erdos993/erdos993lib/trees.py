"""Enumeration of non-isomorphic free trees and forests.

Free trees are generated as *level sequences* with the constant-amortised-time
algorithm of Wright, Richmond, Odlyzko and McKay, "Constant time generation of
free trees", SIAM J. Comput. 15 (1986) 540-548.  The implementation follows the
structure of the (BSD-licensed) NetworkX implementation
``networkx.generators.nonisomorphic_trees`` and is validated against OEIS
A000055 and against an independent canonical-form enumeration in the tests.

A level sequence ``layout`` lists vertex depths in preorder; ``layout[0] == 0``
is the root and the parent of ``i`` is the last ``j < i`` with
``layout[j] == layout[i] - 1``.
"""

from __future__ import annotations

from itertools import combinations_with_replacement
from typing import Dict, Iterator, List, Sequence, Tuple

from .indpoly import Poly, indpoly_parent_array, poly_mul

# OEIS A000055: number of free (unlabelled) trees with n nodes, n = 0, 1, ...
A000055 = [
    1, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741, 19320,
    48629, 123867, 317955, 823065, 2144505, 5623756, 14828074, 39299897,
    104636890, 279793450, 751065460, 2023443032, 5469566585,
]

# OEIS A005195: number of forests with n unlabelled nodes, n = 0, 1, ...
A005195 = [
    1, 1, 2, 3, 6, 10, 20, 37, 76, 153, 329, 710, 1601, 3658, 8599, 20514,
    49905, 122963, 307199, 775529, 1977100, 5086403, 13184041, 34435771,
    90479678, 238943352,
]


def _split_tree(layout: Sequence[int]) -> Tuple[List[int], List[int]]:
    one_found = False
    m = None
    for i in range(len(layout)):
        if layout[i] == 1:
            if one_found:
                m = i
                break
            one_found = True
    if m is None:
        m = len(layout)
    left = [layout[i] - 1 for i in range(1, m)]
    rest = [0] + [layout[i] for i in range(m, len(layout))]
    return left, rest


def _next_rooted_tree(predecessor: Sequence[int], p: int | None = None) -> List[int] | None:
    if p is None:
        p = len(predecessor) - 1
        while predecessor[p] == 1:
            p -= 1
    if p == 0:
        return None
    q = p - 1
    while predecessor[q] != predecessor[p] - 1:
        q -= 1
    result = list(predecessor)
    for i in range(p, len(result)):
        result[i] = result[i - p + q]
    return result


def _next_tree(candidate: List[int]) -> List[int] | None:
    left, rest = _split_tree(candidate)
    left_height = max(left)
    rest_height = max(rest)
    valid = rest_height >= left_height
    if valid and rest_height == left_height:
        if len(left) > len(rest):
            valid = False
        elif len(left) == len(rest) and left > rest:
            valid = False
    if valid:
        return candidate
    p = len(left)
    new_candidate = _next_rooted_tree(candidate, p)
    if new_candidate is None:
        return None
    if candidate[p] > 2:
        new_left, _ = _split_tree(new_candidate)
        new_left_height = max(new_left)
        suffix = list(range(1, new_left_height + 2))
        new_candidate[-len(suffix):] = suffix
    return new_candidate


def free_tree_layouts(order: int) -> Iterator[List[int]]:
    """Yield one level sequence per isomorphism class of free trees on ``order`` vertices."""
    if order < 1:
        raise ValueError("order must be >= 1")
    if order == 1:
        yield [0]
        return
    layout: List[int] | None = list(range(order // 2 + 1)) + list(range(1, (order + 1) // 2))
    while layout is not None:
        layout = _next_tree(layout)
        if layout is not None:
            yield list(layout)
            layout = _next_rooted_tree(layout)


def layout_to_parent(layout: Sequence[int]) -> List[int]:
    parent = [-1] * len(layout)
    stack: List[int] = []
    for i, lev in enumerate(layout):
        del stack[lev:]
        if lev > 0:
            parent[i] = stack[lev - 1]
        stack.append(i)
    return parent


def parent_to_edges(parent: Sequence[int]) -> List[Tuple[int, int]]:
    return [(parent[v], v) for v in range(1, len(parent))]


def free_trees(order: int) -> Iterator[List[int]]:
    """Yield parent arrays of all non-isomorphic free trees on ``order`` vertices."""
    for layout in free_tree_layouts(order):
        yield layout_to_parent(layout)


def tree_polys(order: int) -> List[Poly]:
    return [indpoly_parent_array(p) for p in free_trees(order)]


def _partitions(n: int, max_part: int | None = None) -> Iterator[List[int]]:
    if max_part is None or max_part > n:
        max_part = n
    if n == 0:
        yield []
        return
    for k in range(max_part, 0, -1):
        for rest in _partitions(n - k, k):
            yield [k] + rest


def forest_polys(order: int, cache: Dict[int, List[Poly]] | None = None) -> Iterator[Tuple[Tuple[int, ...], Tuple[int, ...], Poly]]:
    """Yield ``(part_sizes, tree_indices, poly)`` for every non-isomorphic forest.

    A forest is a multiset of trees; for each integer partition of ``order`` and
    each part size ``s`` with multiplicity ``k`` we take a ``k``-multiset of the
    trees of order ``s``.  ``tree_indices`` refers to ``free_trees(s)`` order.
    """
    if cache is None:
        cache = {}
    for parts in _partitions(order):
        sizes: Dict[int, int] = {}
        for s in parts:
            sizes[s] = sizes.get(s, 0) + 1
        for s in sizes:
            if s not in cache:
                cache[s] = tree_polys(s)
        choices_per_size = []
        for s in sorted(sizes, reverse=True):
            choices_per_size.append([(s, combo) for combo in combinations_with_replacement(range(len(cache[s])), sizes[s])])
        for combo in _product(choices_per_size):
            poly: Poly = [1]
            part_sizes: List[int] = []
            idxs: List[int] = []
            for s, trees in combo:
                for t in trees:
                    poly = poly_mul(poly, cache[s][t])
                    part_sizes.append(s)
                    idxs.append(t)
            yield tuple(part_sizes), tuple(idxs), poly


def _product(lists: List[list]) -> Iterator[tuple]:
    if not lists:
        yield ()
        return
    head, *tail = lists
    for h in head:
        for t in _product(tail):
            yield (h,) + t


def canonical_form(parent: Sequence[int]) -> str:
    """AHU canonical string of a free tree (rooted at its centre(s))."""
    n = len(parent)
    adj: List[List[int]] = [[] for _ in range(n)]
    for v in range(1, n):
        adj[v].append(parent[v])
        adj[parent[v]].append(v)
    centers = _centers(adj)
    return min(_ahu(adj, c) for c in centers)


def _centers(adj: List[List[int]]) -> List[int]:
    n = len(adj)
    if n <= 2:
        return list(range(n))
    deg = [len(a) for a in adj]
    leaves = [v for v in range(n) if deg[v] == 1]
    remaining = n
    while remaining > 2:
        remaining -= len(leaves)
        new_leaves = []
        for v in leaves:
            for w in adj[v]:
                deg[w] -= 1
                if deg[w] == 1:
                    new_leaves.append(w)
            deg[v] = 0
        leaves = new_leaves
    return leaves


def _ahu(adj: List[List[int]], root: int) -> str:
    # iterative post-order to avoid recursion limits
    order: List[int] = []
    parent = {root: -1}
    stack = [root]
    while stack:
        v = stack.pop()
        order.append(v)
        for w in adj[v]:
            if w != parent[v]:
                parent[w] = v
                stack.append(w)
    label: Dict[int, str] = {}
    children: Dict[int, List[str]] = {v: [] for v in order}
    for v in reversed(order):
        label[v] = "(" + "".join(sorted(children[v])) + ")"
        if parent[v] != -1:
            children[parent[v]].append(label[v])
    return label[root]
