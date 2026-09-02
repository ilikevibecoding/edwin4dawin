"""Exact enumeration of unlabeled (free) trees.

Two independent generators are provided so that they can be cross-validated:

1. ``wrom_level_sequences(n)`` -- the Wright-Richmond-Odlyzko-McKay algorithm
   (SIAM J. Comput. 15 (1986) 540-548) producing canonical level sequences.
   Ported from the pure-Python implementation in ``networkx`` (BSD-3), returning
   the raw level sequence instead of a ``Graph`` object.

2. ``center_rooted_trees(n)`` -- direct construction from canonical rooted
   trees (nested sorted tuples) using the centre criterion: every free tree has
   a unique centre, which is either one vertex (unicentral: the root has at
   least two child subtrees of maximal height) or two adjacent vertices
   (bicentral: two rooted trees of equal height joined by an edge).

Both generators are exact and use only integers / tuples.  ``canonical_form``
converts a level sequence into the same nested-tuple canonical form used by
generator 2 so that the two outputs can be compared as multisets.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Iterator, List, Tuple

# ---------------------------------------------------------------------------
# Generator 1: WROM level sequences (parent array recovered separately)
# ---------------------------------------------------------------------------


def _next_rooted_tree(pred: List[int], p: int | None = None) -> List[int] | None:
    """One iteration of the Beyer-Hedetniemi algorithm on a level sequence."""
    if p is None:
        p = len(pred) - 1
        while pred[p] == 1:
            p -= 1
    if p == 0:
        return None
    q = p - 1
    while pred[q] != pred[p] - 1:
        q -= 1
    result = list(pred)
    for i in range(p, len(result)):
        result[i] = result[i - p + q]
    return result


def _split_tree(layout: List[int]) -> Tuple[List[int], List[int]]:
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


def _next_tree(candidate: List[int]) -> List[int] | None:
    """One iteration of the WROM algorithm."""
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
    if candidate[p] > 2:
        new_left, _ = _split_tree(new_candidate)
        new_left_height = max(new_left)
        suffix = list(range(1, new_left_height + 2))
        new_candidate[-len(suffix):] = suffix
    return new_candidate


def wrom_level_sequences(n: int) -> Iterator[List[int]]:
    """Yield the canonical level sequence of every free tree on ``n`` vertices."""
    if n <= 0:
        return
    if n == 1:
        yield [0]
        return
    layout = list(range(n // 2 + 1)) + list(range(1, (n + 1) // 2))
    while layout is not None:
        layout = _next_tree(layout)
        if layout is not None:
            yield layout
            layout = _next_rooted_tree(layout)


def level_sequence_to_parents(layout: List[int]) -> List[int]:
    """Convert a level sequence (root has level 0) to a parent array.

    Vertex ``i`` has parent ``parents[i]``; the root has parent ``-1``.
    Vertices appear in preorder, so ``parents[i] < i`` for ``i > 0``.
    """
    parents = [-1] * len(layout)
    stack: List[int] = []
    for i, lev in enumerate(layout):
        while stack and layout[stack[-1]] >= lev:
            stack.pop()
        parents[i] = stack[-1] if stack else -1
        stack.append(i)
    return parents


# ---------------------------------------------------------------------------
# Generator 2: canonical rooted trees and the centre criterion
# ---------------------------------------------------------------------------

Rooted = Tuple  # nested tuple of children, each itself a Rooted; leaf == ()


def rooted_size(t: Rooted) -> int:
    return 1 + sum(rooted_size(c) for c in t)


def rooted_height(t: Rooted) -> int:
    return 0 if not t else 1 + max(rooted_height(c) for c in t)


@lru_cache(maxsize=None)
def rooted_trees(n: int) -> Tuple[Rooted, ...]:
    """All canonical rooted trees on ``n`` vertices, as sorted nested tuples."""
    if n <= 0:
        return ()
    if n == 1:
        return ((),)
    out = []
    for forest in _rooted_forests(n - 1):
        out.append(tuple(sorted(forest)))
    return tuple(out)


@lru_cache(maxsize=None)
def _rooted_forests(m: int, max_tree: Rooted | None = None) -> Tuple[Tuple[Rooted, ...], ...]:
    """All multisets of rooted trees with total size ``m``.

    Multisets are produced as tuples in non-increasing order with respect to
    the key ``(size, tuple)`` so every multiset is produced exactly once.
    ``max_tree`` bounds the first element (the largest one).
    """
    if m == 0:
        return ((),)
    out = []
    for size in range(m, 0, -1):
        for t in rooted_trees(size):
            if max_tree is not None and (size, t) > (rooted_size(max_tree), max_tree):
                continue
            for rest in _rooted_forests(m - size, t):
                out.append((t,) + rest)
    return tuple(out)


def center_rooted_trees(n: int) -> Iterator[Rooted]:
    """Yield a canonical rooted representative of every free tree on ``n`` vertices.

    Unicentral trees are rooted at their centre; the canonical form is the
    sorted tuple of child subtrees.  Bicentral trees are rooted at the
    lexicographically smaller of the two centres (the other centre becomes
    one of its children), which makes the representative unique.
    """
    if n <= 0:
        return
    if n == 1:
        yield ()
        return
    # unicentral: root with >= 2 children of maximal height
    for t in rooted_trees(n):
        if len(t) >= 2:
            h = rooted_height(t)
            top = sum(1 for c in t if rooted_height(c) == h - 1)
            if top >= 2:
                yield t
    # bicentral: two rooted trees of equal height (arbitrary sizes summing to n)
    for s in range(1, n // 2 + 1):
        left_by_height = {}
        for t in rooted_trees(s):
            left_by_height.setdefault(rooted_height(t), []).append(t)
        right_by_height = {}
        for t in rooted_trees(n - s):
            right_by_height.setdefault(rooted_height(t), []).append(t)
        for h, lefts in left_by_height.items():
            rights = right_by_height.get(h)
            if not rights:
                continue
            for a in lefts:
                for b in rights:
                    if s == n - s and b < a:
                        continue  # unordered pair, count once
                    lo, hi = (a, b) if a <= b else (b, a)
                    # attach the larger (in tuple order) centre subtree as a child of the smaller
                    yield tuple(sorted(lo + (hi,)))


def canonical_form(parents: List[int]) -> Rooted:
    """Canonical nested-tuple form of the free tree given by ``parents``.

    The tree is re-rooted at its centre.  For bicentral trees the representative
    is chosen exactly as in :func:`center_rooted_trees` so that both generators
    produce identical objects.
    """
    n = len(parents)
    adj = [[] for _ in range(n)]
    for v, p in enumerate(parents):
        if p >= 0:
            adj[v].append(p)
            adj[p].append(v)
    centres = _centres(adj)

    def rooted(v: int, parent: int) -> Rooted:
        return tuple(sorted(rooted(w, v) for w in adj[v] if w != parent))

    if len(centres) == 1:
        return rooted(centres[0], -1)
    c1, c2 = centres
    a = rooted(c1, c2)
    b = rooted(c2, c1)
    if b < a:
        a, b = b, a
    return tuple(sorted(a + (b,)))


def _centres(adj: List[List[int]]) -> List[int]:
    n = len(adj)
    if n == 1:
        return [0]
    degree = [len(a) for a in adj]
    layer = [v for v in range(n) if degree[v] == 1]
    remaining = n
    while remaining > 2:
        remaining -= len(layer)
        nxt = []
        for v in layer:
            for w in adj[v]:
                degree[w] -= 1
                if degree[w] == 1:
                    nxt.append(w)
        layer = nxt
    return sorted(layer)


def rooted_to_parents(t: Rooted) -> List[int]:
    """Parent array (preorder) for a canonical rooted tree."""
    parents: List[int] = []

    def walk(node: Rooted, parent: int) -> None:
        me = len(parents)
        parents.append(parent)
        for c in node:
            walk(c, me)

    walk(t, -1)
    return parents


def parents_to_edges(parents: List[int]) -> List[Tuple[int, int]]:
    return [(p, v) for v, p in enumerate(parents) if p >= 0]
