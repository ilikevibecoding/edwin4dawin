"""Exact independence polynomials of forests.

A polynomial is a list of Python ints ``p`` with ``p[k]`` = number of
independent sets of size ``k``.  Trailing entries are never zero, so
``len(p) - 1`` is the independence number.
"""

from __future__ import annotations

from collections import deque
from typing import Iterable, List, Sequence, Tuple

Poly = List[int]


def poly_mul(a: Sequence[int], b: Sequence[int]) -> Poly:
    if not a or not b:
        return []
    res = [0] * (len(a) + len(b) - 1)
    for i, ai in enumerate(a):
        if ai == 0:
            continue
        for j, bj in enumerate(b):
            res[i + j] += ai * bj
    return res


def poly_add(a: Sequence[int], b: Sequence[int]) -> Poly:
    if len(a) < len(b):
        a, b = b, a
    res = list(a)
    for j, bj in enumerate(b):
        res[j] += bj
    return res


def indpoly_parent_array(parent: Sequence[int]) -> Poly:
    """Independence polynomial of a rooted tree given as a parent array.

    ``parent[0] == -1`` and ``parent[v] < v`` for ``v >= 1`` (any BFS/DFS
    order works).  Standard in/out dynamic programme:
    ``out[v] = prod_c (in[c] + out[c])`` and ``in[v] = x * prod_c out[c]``.
    """
    n = len(parent)
    if n == 0:
        return [1]
    f_out: List[Poly] = [[1] for _ in range(n)]
    f_in: List[Poly] = [[0, 1] for _ in range(n)]
    for v in range(n - 1, 0, -1):
        p = parent[v]
        f_out[p] = poly_mul(f_out[p], poly_add(f_in[v], f_out[v]))
        f_in[p] = poly_mul(f_in[p], f_out[v])
    return poly_add(f_in[0], f_out[0])


def components_as_parent_arrays(n: int, edges: Iterable[Tuple[int, int]]) -> List[List[int]]:
    """Split a forest on vertices ``0..n-1`` into BFS parent arrays.

    Raises ``ValueError`` if the graph is not a forest.
    """
    adj: List[List[int]] = [[] for _ in range(n)]
    m = 0
    for u, v in edges:
        if u == v:
            raise ValueError("loop edge")
        adj[u].append(v)
        adj[v].append(u)
        m += 1
    seen = [False] * n
    comps: List[List[int]] = []
    for root in range(n):
        if seen[root]:
            continue
        order = [root]
        seen[root] = True
        parent_of = {root: -1}
        dq = deque([root])
        while dq:
            u = dq.popleft()
            for w in adj[u]:
                if not seen[w]:
                    seen[w] = True
                    parent_of[w] = u
                    order.append(w)
                    dq.append(w)
                elif w != parent_of[u]:
                    raise ValueError("graph contains a cycle (or a multi-edge)")
        index = {v: i for i, v in enumerate(order)}
        comps.append([-1] + [index[parent_of[v]] for v in order[1:]])
    if m != n - len(comps):
        raise ValueError("edge count inconsistent with a forest")
    return comps


def indpoly_forest(n: int, edges: Iterable[Tuple[int, int]]) -> Poly:
    """Independence polynomial of the forest with vertex set ``range(n)``."""
    result: Poly = [1]
    for parent in components_as_parent_arrays(n, list(edges)):
        result = poly_mul(result, indpoly_parent_array(parent))
    return result


def indpoly_bruteforce(n: int, edges: Iterable[Tuple[int, int]]) -> Poly:
    """Independent reference implementation by enumerating all 2^n subsets.

    Works for any graph (no forest assumption); intended for ``n <= 22``.
    """
    nb = [0] * n
    for u, v in edges:
        nb[u] |= 1 << v
        nb[v] |= 1 << u
    counts = [0] * (n + 1)
    for mask in range(1 << n):
        ok = True
        s = mask
        while s:
            low = s & -s
            v = low.bit_length() - 1
            if nb[v] & mask:
                ok = False
                break
            s ^= low
        if ok:
            counts[bin(mask).count("1")] += 1
    while counts and counts[-1] == 0:
        counts.pop()
    return counts
