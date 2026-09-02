"""Named tree families used for stress tests.

Every constructor returns ``(n, edges)`` with vertices ``0..n-1``.
"""

from __future__ import annotations

import random
from typing import List, Sequence, Tuple

Graph = Tuple[int, List[Tuple[int, int]]]


class TreeBuilder:
    def __init__(self) -> None:
        self.n = 0
        self.edges: List[Tuple[int, int]] = []

    def root(self) -> int:
        v = self.n
        self.n += 1
        return v

    def attach(self, parent: int) -> int:
        v = self.n
        self.n += 1
        self.edges.append((parent, v))
        return v

    def attach_path(self, parent: int, length: int) -> int:
        """Attach a path of ``length`` new vertices hanging from ``parent``; return its end."""
        cur = parent
        for _ in range(length):
            cur = self.attach(cur)
        return cur

    def graph(self) -> Graph:
        return self.n, list(self.edges)


def path(n: int) -> Graph:
    return n, [(i, i + 1) for i in range(n - 1)]


def star(n: int) -> Graph:
    return n, [(0, i) for i in range(1, n)]


def spider(legs: Sequence[int]) -> Graph:
    b = TreeBuilder()
    c = b.root()
    for length in legs:
        b.attach_path(c, length)
    return b.graph()


def broom(path_len: int, leaves: int) -> Graph:
    """Path on ``path_len`` vertices with ``leaves`` pendant vertices at one end."""
    b = TreeBuilder()
    v = b.root()
    end = b.attach_path(v, path_len - 1) if path_len > 1 else v
    for _ in range(leaves):
        b.attach(end)
    return b.graph()


def double_broom(a: int, k: int, b_leaves: int) -> Graph:
    """Path on ``k`` vertices with ``a`` leaves at one end and ``b_leaves`` at the other."""
    b = TreeBuilder()
    v = b.root()
    for _ in range(a):
        b.attach(v)
    end = b.attach_path(v, k - 1) if k > 1 else v
    for _ in range(b_leaves):
        b.attach(end)
    return b.graph()


def caterpillar(leaf_counts: Sequence[int]) -> Graph:
    b = TreeBuilder()
    prev = None
    for c in leaf_counts:
        v = b.root() if prev is None else b.attach(prev)
        for _ in range(c):
            b.attach(v)
        prev = v
    return b.graph()


def bush(counts: Sequence[int], pendant_len: int = 1) -> Graph:
    """Root; child ``v_i`` for each entry with ``counts[i]`` grandchildren, each
    grandchild carrying a pendant path of ``pendant_len`` vertices.

    ``bush([3, m, n])`` is the Kadrawi-Levit-Yosef-Mizrachi tree ``T_{3,m,n}``.
    """
    b = TreeBuilder()
    r = b.root()
    for c in counts:
        v = b.attach(r)
        for _ in range(c):
            g = b.attach(v)
            b.attach_path(g, pendant_len)
    return b.graph()


def T3mn(m: int, n: int) -> Graph:
    """``T_{3,m,n}`` (order 10 + 2m + 2n); ``T_{3,4,4}`` is a non-log-concave tree of order 26."""
    return bush([3, m, n])


def T3mn_star(m: int, n: int) -> Graph:
    """``T*_{3,m,n}``: ``T_{3,m,n}`` with the edge ``v13 v'13`` replaced by a path
    ``v13, v'13, x, y`` (order 12 + 2m + 2n); ``T*_{3,3,4}`` is non-log-concave of order 26."""
    b = TreeBuilder()
    r = b.root()
    v1 = b.attach(r)
    grand = [b.attach(v1) for _ in range(3)]
    b.attach(grand[0])
    b.attach(grand[1])
    b.attach_path(grand[2], 3)  # v'13, x, y
    for c in (m, n):
        v = b.attach(r)
        for _ in range(c):
            g = b.attach(v)
            b.attach(g)
    return b.graph()


def multi_arm_star(arms: Sequence[Tuple[int, int]]) -> Graph:
    """Centre with arms; arm ``(k, leaves)`` is a path of ``k`` vertices ending in ``leaves`` pendants."""
    b = TreeBuilder()
    c = b.root()
    for k, leaves in arms:
        end = b.attach_path(c, k)
        for _ in range(leaves):
            b.attach(end)
    return b.graph()


def random_tree(n: int, rng: random.Random) -> Graph:
    """Uniform random labelled tree via a random Prüfer sequence (n >= 2)."""
    if n <= 2:
        return path(n)
    prufer = [rng.randrange(n) for _ in range(n - 2)]
    degree = [1] * n
    for v in prufer:
        degree[v] += 1
    edges: List[Tuple[int, int]] = []
    import heapq

    leaves = [v for v in range(n) if degree[v] == 1]
    heapq.heapify(leaves)
    for v in prufer:
        leaf = heapq.heappop(leaves)
        edges.append((leaf, v))
        degree[v] -= 1
        if degree[v] == 1:
            heapq.heappush(leaves, v)
    u = heapq.heappop(leaves)
    w = heapq.heappop(leaves)
    edges.append((u, w))
    return n, edges


def random_attachment_tree(n: int, rng: random.Random, heavy: float = 0.0) -> Graph:
    """Random recursive tree; ``heavy`` in [0,1] biases attachment to high-degree vertices."""
    b = TreeBuilder()
    b.root()
    deg = [0]
    for _ in range(n - 1):
        if heavy > 0 and rng.random() < heavy:
            total = sum(d + 1 for d in deg)
            x = rng.randrange(total)
            acc = 0
            for v, d in enumerate(deg):
                acc += d + 1
                if x < acc:
                    parent = v
                    break
        else:
            parent = rng.randrange(b.n)
        w = b.attach(parent)
        deg[parent] += 1
        deg.append(0)
    return b.graph()
