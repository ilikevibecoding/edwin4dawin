"""Independence polynomials by the vertex deletion recursion (audit version).

For any finite simple graph ``G`` and any vertex ``v``::

    I(G) = I(G - v) + x * I(G - N[v])        (N[v] = closed neighbourhood)

because an independent set either avoids ``v`` or contains ``v`` (and then
none of its neighbours).  Together with ``I(empty graph) = 1`` and
``I(G1 + G2) = I(G1) * I(G2)`` for disjoint unions this determines ``I``.

The graph is given as ``n`` and an edge list on ``range(n)``; the current
induced subgraph is a vertex bitmask and results are memoised per bitmask.
The pivot ``v`` is always a vertex of maximum degree in the current induced
subgraph (ties broken by smallest label); for trees this vertex is the
neighbour of a leaf as soon as the maximum degree is 1, so the recursion
collapses quickly.  Disconnected induced subgraphs are split into connected
components whose polynomials are multiplied (this can be switched off to run
the bare recursion, e.g. in tests).

Polynomials follow the toolkit convention: a list of Python ints ``p`` with
``p[k]`` the number of independent ``k``-sets, no trailing zeros, and
``len(p) - 1`` the independence number.  Only exact integer arithmetic is
used.  This module imports nothing from ``erdos993lib``.
"""

from __future__ import annotations

from math import comb
from typing import Dict, Iterable, List, Sequence, Tuple

Poly = List[int]
Edge = Tuple[int, int]


# --------------------------------------------------------------------------- #
# polynomial helpers (own implementation, exact ints)
# --------------------------------------------------------------------------- #
def poly_add(a: Sequence[int], b: Sequence[int]) -> Poly:
    """Coefficient-wise sum; trailing zeros stripped."""
    n = max(len(a), len(b))
    out = [0] * n
    for i, c in enumerate(a):
        out[i] += c
    for i, c in enumerate(b):
        out[i] += c
    return strip_trailing_zeros(out)


def poly_mul(a: Sequence[int], b: Sequence[int]) -> Poly:
    """Cauchy product; trailing zeros stripped."""
    if not a or not b:
        return []
    out = [0] * (len(a) + len(b) - 1)
    for i, ai in enumerate(a):
        if ai:
            for j, bj in enumerate(b):
                out[i + j] += ai * bj
    return strip_trailing_zeros(out)


def poly_times_x(a: Sequence[int]) -> Poly:
    """Multiply by ``x`` (shift coefficients up by one)."""
    return [0] + list(a) if a else []


def strip_trailing_zeros(p: List[int]) -> Poly:
    while p and p[-1] == 0:
        p.pop()
    return p


def binomial_poly(k: int) -> Poly:
    """``(1 + x)^k`` = independence polynomial of ``k`` isolated vertices."""
    return [comb(k, i) for i in range(k + 1)]


# --------------------------------------------------------------------------- #
# graph helpers on bitmasks
# --------------------------------------------------------------------------- #
def neighbour_masks(n: int, edges: Iterable[Edge]) -> List[int]:
    """Closed-form adjacency as bitmasks; rejects loops and out-of-range labels.

    Parallel edges are tolerated (they carry no extra information for
    independent sets) but :func:`is_forest` will reject them.
    """
    if n < 0:
        raise ValueError("negative number of vertices")
    nb = [0] * n
    for u, v in edges:
        if not (0 <= u < n and 0 <= v < n):
            raise ValueError("edge (%r, %r) not inside range(%d)" % (u, v, n))
        if u == v:
            raise ValueError("loop at vertex %r" % (u,))
        nb[u] |= 1 << v
        nb[v] |= 1 << u
    return nb


def _lowest_vertex(mask: int) -> int:
    return (mask & -mask).bit_length() - 1


def components_of_mask(nb: Sequence[int], mask: int) -> List[int]:
    """Connected components of the subgraph induced by ``mask`` (as bitmasks)."""
    comps: List[int] = []
    rest = mask
    while rest:
        seed = rest & -rest
        comp = seed
        frontier = seed
        while frontier:
            reach = 0
            f = frontier
            while f:
                low = f & -f
                f ^= low
                reach |= nb[low.bit_length() - 1]
            frontier = reach & rest & ~comp
            comp |= frontier
        comps.append(comp)
        rest &= ~comp
    return comps


def connected_components(n: int, edges: Iterable[Edge]) -> List[List[int]]:
    """Vertex lists (sorted) of the connected components of the whole graph."""
    nb = neighbour_masks(n, edges)
    full = (1 << n) - 1
    out: List[List[int]] = []
    for comp in components_of_mask(nb, full):
        verts = []
        m = comp
        while m:
            low = m & -m
            m ^= low
            verts.append(low.bit_length() - 1)
        out.append(verts)
    return out


def is_forest(n: int, edges: Iterable[Edge]) -> bool:
    """A simple graph is a forest iff ``#edges == n - #components`` and it has
    no repeated edge (a repeated edge would be a 2-cycle)."""
    edges = list(edges)
    seen = set()
    for u, v in edges:
        key = (u, v) if u < v else (v, u)
        if key in seen:
            return False
        seen.add(key)
    comps = connected_components(n, edges)
    return len(edges) == n - len(comps)


# --------------------------------------------------------------------------- #
# the recursion
# --------------------------------------------------------------------------- #
class DeletionRecursion:
    """Memoised ``I(G) = I(G - v) + x I(G - N[v])`` on the graph ``(n, edges)``.

    ``poly(mask)`` returns the independence polynomial of the subgraph induced
    by the vertex bitmask ``mask`` (default: all vertices).
    """

    def __init__(self, n: int, edges: Iterable[Edge], split_components: bool = True) -> None:
        self.n = n
        self.nb = neighbour_masks(n, edges)
        self.split_components = split_components
        self.memo: Dict[int, Poly] = {}
        self.calls = 0  # number of non-memoised evaluations (for diagnostics)

    def full_mask(self) -> int:
        return (1 << self.n) - 1

    def pivot(self, mask: int) -> Tuple[int, int]:
        """Vertex of maximum degree inside ``mask`` (smallest label on ties) and its degree."""
        best_v = -1
        best_deg = -1
        m = mask
        nb = self.nb
        while m:
            low = m & -m
            m ^= low
            v = low.bit_length() - 1
            deg = (nb[v] & mask).bit_count()
            if deg > best_deg:
                best_v, best_deg = v, deg
        return best_v, best_deg

    def poly(self, mask: int | None = None) -> Poly:
        if mask is None:
            mask = self.full_mask()
        if mask < 0 or mask >> self.n:
            raise ValueError("mask has bits outside range(%d)" % self.n)
        return self._eval(mask)

    def _eval(self, mask: int) -> Poly:
        if mask == 0:
            return [1]
        hit = self.memo.get(mask)
        if hit is not None:
            return hit
        self.calls += 1
        if self.split_components:
            comps = components_of_mask(self.nb, mask)
            if len(comps) > 1:
                result: Poly = [1]
                for comp in comps:
                    result = poly_mul(result, self._eval(comp))
                self.memo[mask] = result
                return result
        v, deg = self.pivot(mask)
        if deg == 0:
            # every remaining vertex is isolated: (1 + x)^k
            result = binomial_poly(mask.bit_count())
        else:
            without_v = self._eval(mask & ~(1 << v))
            without_closed_nbhd = self._eval(mask & ~(self.nb[v] | (1 << v)))
            result = poly_add(without_v, poly_times_x(without_closed_nbhd))
        self.memo[mask] = result
        return result


def indpoly_recursive(n: int, edges: Iterable[Edge], split_components: bool = True) -> Poly:
    """Independence polynomial of an arbitrary simple graph on ``range(n)``."""
    return DeletionRecursion(n, list(edges), split_components=split_components).poly()


def indpoly_forest_recursive(n: int, edges: Iterable[Edge], require_forest: bool = True) -> Poly:
    """Independence polynomial of a forest as the product of the polynomials
    of its connected components, each computed by a fresh deletion recursion
    on the component's own (relabelled, hence small) bitmask universe.

    With ``require_forest=False`` the function works for any graph (it is
    simply the component factorisation); with the default it raises
    ``ValueError`` for graphs that are not forests.
    """
    edges = list(edges)
    if require_forest and not is_forest(n, edges):
        raise ValueError("graph is not a forest")
    result: Poly = [1]
    for comp in connected_components(n, edges):
        local = {v: i for i, v in enumerate(comp)}
        comp_set = set(comp)
        comp_edges = [(local[u], local[v]) for u, v in edges if u in comp_set and v in comp_set]
        result = poly_mul(result, indpoly_recursive(len(comp), comp_edges))
    return result


def parent_array_to_edges(parent: Sequence[int]) -> List[Edge]:
    """Edges of a rooted tree given as a parent array (``parent[root] == -1``)."""
    return [(parent[v], v) for v in range(len(parent)) if parent[v] >= 0]


def indpoly_parent_array_recursive(parent: Sequence[int]) -> Poly:
    """Convenience wrapper: deletion recursion on a tree given as a parent array."""
    return indpoly_recursive(len(parent), parent_array_to_edges(parent))
