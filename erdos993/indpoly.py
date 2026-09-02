"""Exact independence polynomials of forests.

The independence polynomial of a graph ``G`` is

    I(G; x) = sum_{r=0}^{alpha} p_r x^r,

where ``p_r`` is the number of independent vertex sets of size ``r`` and
``alpha`` is the independence number.  Every function in this module returns
the coefficient list ``[p_0, p_1, ..., p_alpha]`` as Python ``int`` objects,
so all arithmetic is exact.

Supported inputs:

* a forest given as ``(n, edges)`` with vertices ``0 .. n-1``
  (:func:`independence_polynomial_forest`);
* a tree given as a ``nauty-gentreeg`` parent array
  (:func:`independence_polynomial_parent_array`);
* a :class:`networkx.Graph` that is a forest
  (:func:`independence_polynomial_nx`).

:func:`product` multiplies polynomials (disjoint union of forests) and
:func:`path`, :func:`star`, :func:`broom`, :func:`double_broom`,
:func:`spider`, :func:`caterpillar`, :func:`attach_leaf` build standard
forests as ``(n, edges)``.

The forest algorithms are rooted dynamic programs that perform one
polynomial multiplication per edge: for every vertex ``v`` we maintain the
independence polynomial of the subtree of ``v`` restricted to sets that
exclude ``v`` (``ex``) and to sets that include ``v`` (``inc``):

    ex[v]  = prod_{c child of v} (ex[c] + inc[c]),
    inc[v] = x * prod_{c child of v} ex[c].

:func:`independence_polynomial_bruteforce` enumerates all ``2**n`` vertex
subsets of an arbitrary graph with ``n <= 20`` vertices and is meant only as
an independent reference for tests.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from typing import Any

Poly = list[int]
Edge = tuple[int, int]

BRUTEFORCE_MAX_VERTICES = 20


def _check_int(value: Any, what: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise TypeError(f"{what} must be a Python int, got {value!r}")
    return value


# ---------------------------------------------------------------------------
# Polynomial arithmetic (coefficient lists of exact integers)
# ---------------------------------------------------------------------------


def poly_add(a: Sequence[int], b: Sequence[int]) -> Poly:
    """Return the coefficient list of ``a + b``."""
    if len(a) < len(b):
        a, b = b, a
    out = list(a)
    for i, coeff in enumerate(b):
        out[i] += coeff
    return out


def poly_mul(a: Sequence[int], b: Sequence[int]) -> Poly:
    """Return the coefficient list of ``a * b`` (schoolbook, exact)."""
    if not a or not b:
        return []
    out = [0] * (len(a) + len(b) - 1)
    for i, ai in enumerate(a):
        if ai == 0:
            continue
        for j, bj in enumerate(b):
            out[i + j] += ai * bj
    return out


def poly_prod(polys: Iterable[Sequence[int]]) -> Poly:
    """Return the product of the given polynomials (``[1]`` for no factors).

    The independence polynomial of a disjoint union is the product of the
    independence polynomials of the parts, so this is the tool for forests
    whose components are known separately.
    """
    out: Poly = [1]
    for p in polys:
        out = poly_mul(out, p)
    return out


def product(polys: Iterable[Sequence[int]]) -> Poly:
    """``I(F_1 + F_2 + ...; x) = prod I(F_i; x)`` for a disjoint union of forests."""
    return poly_prod(polys)


def poly_strip(p: Sequence[int]) -> Poly:
    """Return a copy of ``p`` without trailing zero coefficients (keeps ``[0]``)."""
    out = list(p)
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def poly_to_string(p: Sequence[int], var: str = "x") -> str:
    """Render a coefficient list as a human readable polynomial."""
    terms = []
    for k, coeff in enumerate(p):
        if coeff == 0:
            continue
        if k == 0:
            terms.append(str(coeff))
        else:
            coeff_str = "" if coeff == 1 else str(coeff)
            power = var if k == 1 else f"{var}^{k}"
            terms.append(f"{coeff_str}{power}")
    return " + ".join(terms) if terms else "0"


def independence_number(p: Sequence[int]) -> int:
    """Return ``alpha`` (the degree) for a coefficient list ``p``."""
    return len(poly_strip(p)) - 1


# ---------------------------------------------------------------------------
# Input validation and conversions
# ---------------------------------------------------------------------------


def normalize_edges(n: int, edges: Iterable[Sequence[int]]) -> list[Edge]:
    """Validate an edge list on vertices ``0 .. n-1`` and return it as pairs.

    Raises :class:`ValueError` for vertex labels outside ``range(n)``, loops
    or repeated edges (a repeated edge would be a 2-cycle, so the input could
    not be a forest anyway).
    """
    n = _check_int(n, "n")
    if n < 0:
        raise ValueError("n must be non-negative")
    out: list[Edge] = []
    seen: set[Edge] = set()
    for e in edges:
        if len(e) != 2:
            raise ValueError(f"edge {e!r} does not have two endpoints")
        u = _check_int(e[0], "vertex")
        v = _check_int(e[1], "vertex")
        if not (0 <= u < n and 0 <= v < n):
            raise ValueError(f"edge {e!r} has an endpoint outside range({n})")
        if u == v:
            raise ValueError(f"loop at vertex {u} is not allowed in a forest")
        key = (u, v) if u < v else (v, u)
        if key in seen:
            raise ValueError(f"edge {key} appears twice; the graph is not a forest")
        seen.add(key)
        out.append(key)
    return out


def adjacency_lists(n: int, edges: Iterable[Sequence[int]]) -> list[list[int]]:
    """Return adjacency lists for the (validated) edge list."""
    adj: list[list[int]] = [[] for _ in range(n)]
    for u, v in normalize_edges(n, edges):
        adj[u].append(v)
        adj[v].append(u)
    return adj


def validate_parent_array(parents: Sequence[int]) -> tuple[int, ...]:
    """Validate a ``nauty-gentreeg`` parent array and return it as a tuple.

    The format is: ``n`` integers, vertices are ``1 .. n``, ``parents[0] == 0``
    marks vertex 1 as the root and ``1 <= parents[i-1] < i`` is the parent of
    vertex ``i`` for ``i >= 2``.
    """
    par = tuple(_check_int(v, "parent entry") for v in parents)
    if not par:
        raise ValueError("a parent array must have at least one entry")
    if par[0] != 0:
        raise ValueError("the first entry of a parent array must be 0 (the root)")
    for i in range(1, len(par)):
        if not 1 <= par[i] <= i:
            raise ValueError(
                f"entry {i + 1} of the parent array is {par[i]}, expected a value in 1..{i}"
            )
    return par


def parent_array_to_edges(parents: Sequence[int]) -> list[Edge]:
    """Convert a gentreeg parent array to a 0-indexed edge list."""
    par = validate_parent_array(parents)
    return [(par[i] - 1, i) for i in range(1, len(par))]


def forest_to_nx(n: int, edges: Iterable[Sequence[int]]):
    """Build a :class:`networkx.Graph` from ``(n, edges)``."""
    import networkx as nx

    g = nx.Graph()
    g.add_nodes_from(range(n))
    g.add_edges_from(normalize_edges(n, edges))
    return g


def parent_array_to_nx(parents: Sequence[int]):
    """Build a :class:`networkx.Graph` (vertices ``0 .. n-1``) from a parent array."""
    par = validate_parent_array(parents)
    return forest_to_nx(len(par), parent_array_to_edges(par))


def nx_to_forest(graph) -> tuple[int, list[Edge]]:
    """Return ``(n, edges)`` with vertices relabelled ``0 .. n-1`` in node order."""
    nodes = list(graph.nodes)
    index = {v: i for i, v in enumerate(nodes)}
    edges = [(index[u], index[v]) for u, v in graph.edges]
    return len(nodes), edges


# ---------------------------------------------------------------------------
# Standard forests as ``(n, edges)`` on vertices ``0 .. n-1``
# ---------------------------------------------------------------------------

Forest = tuple[int, list[Edge]]


def attach_leaf(forest: Forest, v: int) -> Forest:
    """Return ``forest`` with a new pendant vertex ``n`` joined to vertex ``v``."""
    n, edges = forest
    if not 0 <= _check_int(v, "vertex") < n:
        raise ValueError(f"vertex {v} not in range({n})")
    return n + 1, [*edges, (v, n)]


def attach_leaves(forest: Forest, v: int, m: int) -> Forest:
    """Attach ``m >= 0`` pendant vertices to vertex ``v``."""
    for _ in range(m):
        forest = attach_leaf(forest, v)
    return forest


def path(n: int) -> Forest:
    """Path ``P_n`` with edges ``(i, i+1)``; ``P_0`` is the empty graph."""
    return n, [(i, i + 1) for i in range(n - 1)]


def star(m: int) -> Forest:
    """Star ``K_{1,m}``: centre ``0`` joined to the ``m`` leaves ``1 .. m``."""
    return m + 1, [(0, i) for i in range(1, m + 1)]


def caterpillar(leaf_counts: Sequence[int]) -> Forest:
    """Spine ``P_k`` on ``0 .. k-1`` (``k = len(leaf_counts)``) with ``leaf_counts[i]`` leaves at ``i``."""
    forest = path(len(leaf_counts))
    for i, m in enumerate(leaf_counts):
        forest = attach_leaves(forest, i, m)
    return forest


def broom(k: int, m: int) -> Forest:
    """Broom ``B(k, m)``: path ``P_k`` (``k >= 1``) with ``m`` leaves at its end vertex ``k-1``."""
    if k < 1:
        raise ValueError("a broom needs a handle with k >= 1 vertices")
    return caterpillar([0] * (k - 1) + [m])


def double_broom(k: int, a: int, b: int) -> Forest:
    """Path ``P_k`` (``k >= 2``) with ``a`` leaves at vertex ``0`` and ``b`` leaves at vertex ``k-1``."""
    if k < 2:
        raise ValueError("a double broom needs a path with k >= 2 vertices")
    return caterpillar([a] + [0] * (k - 2) + [b])


def spider(legs: Sequence[int]) -> Forest:
    """Spider: centre ``0`` with one path of ``leg`` new vertices attached for each ``leg`` in ``legs``."""
    n, edges = 1, []
    for leg in legs:
        prev = 0
        for _ in range(leg):
            edges.append((prev, n))
            prev, n = n, n + 1
    return n, edges


# ---------------------------------------------------------------------------
# Independence polynomials
# ---------------------------------------------------------------------------


def independence_polynomial_forest(n: int, edges: Iterable[Sequence[int]]) -> Poly:
    """Independence polynomial of the forest with vertices ``0 .. n-1``.

    Each connected component is rooted at its smallest vertex and processed
    with the ``ex``/``inc`` dynamic program described in the module
    docstring; the component polynomials are multiplied together.

    Raises :class:`ValueError` if the graph is not a forest.
    """
    adj = adjacency_lists(n, edges)
    parent = [-1] * n
    visited = [False] * n
    result: Poly = [1]
    for root in range(n):
        if visited[root]:
            continue
        order: list[int] = []
        stack = [root]
        visited[root] = True
        while stack:
            v = stack.pop()
            order.append(v)
            for w in adj[v]:
                if w == parent[v]:
                    continue
                if visited[w]:
                    raise ValueError("the graph contains a cycle; it is not a forest")
                visited[w] = True
                parent[w] = v
                stack.append(w)
        ex: dict[int, Poly] = {}
        inc: dict[int, Poly] = {}
        for v in reversed(order):
            excluded: Poly = [1]
            included: Poly = [0, 1]
            for w in adj[v]:
                if w == parent[v]:
                    continue
                included = poly_mul(included, ex[w])
                excluded = poly_mul(excluded, poly_add(ex[w], inc[w]))
                del ex[w], inc[w]
            ex[v], inc[v] = excluded, included
        result = poly_mul(result, poly_add(ex[root], inc[root]))
    return result


def independence_polynomial_parent_array(parents: Sequence[int]) -> Poly:
    """Independence polynomial of a tree given as a gentreeg parent array.

    Because ``parents[i-1] < i`` for every non-root vertex ``i``, processing
    vertices in decreasing order folds every subtree into its parent before
    the parent itself is folded, so no search is needed.
    """
    par = validate_parent_array(parents)
    n = len(par)
    ex: list[Poly] = [[1] for _ in range(n)]
    inc: list[Poly] = [[0, 1] for _ in range(n)]
    for i in range(n - 1, 0, -1):
        p = par[i] - 1
        inc[p] = poly_mul(inc[p], ex[i])
        ex[p] = poly_mul(ex[p], poly_add(ex[i], inc[i]))
    return poly_add(ex[0], inc[0])


def independence_polynomial_nx(graph) -> Poly:
    """Independence polynomial of a :class:`networkx.Graph` that is a forest.

    Raises :class:`TypeError` for directed graphs or multigraphs and
    :class:`ValueError` if the graph contains a cycle.
    """
    import networkx as nx

    if graph.is_directed() or graph.is_multigraph():
        raise TypeError("expected an undirected simple networkx.Graph")
    if graph.number_of_nodes() > 0 and not nx.is_forest(graph):
        raise ValueError("the graph is not a forest")
    n, edges = nx_to_forest(graph)
    return independence_polynomial_forest(n, edges)


def independence_polynomial(obj, edges: Iterable[Sequence[int]] | None = None) -> Poly:
    """Dispatch on the input type.

    ``independence_polynomial(n, edges)`` treats ``(n, edges)`` as a forest,
    ``independence_polynomial(parent_array)`` treats a sequence of ints as a
    gentreeg parent array and ``independence_polynomial(graph)`` accepts a
    :class:`networkx.Graph`.
    """
    if edges is not None:
        return independence_polynomial_forest(obj, edges)
    if hasattr(obj, "nodes") and hasattr(obj, "edges"):
        return independence_polynomial_nx(obj)
    return independence_polynomial_parent_array(obj)


def independence_polynomial_bruteforce(n: int, edges: Iterable[Sequence[int]]) -> Poly:
    """Reference implementation by enumerating all ``2**n`` vertex subsets.

    Works for any simple graph on ``n <= 20`` vertices (not only forests) and
    is intended only for cross-checking in tests.
    """
    n = _check_int(n, "n")
    if n < 0:
        raise ValueError("n must be non-negative")
    if n > BRUTEFORCE_MAX_VERTICES:
        raise ValueError(f"brute force is limited to n <= {BRUTEFORCE_MAX_VERTICES}")
    neighbours = [0] * n
    for u, v in normalize_edges(n, edges):
        neighbours[u] |= 1 << v
        neighbours[v] |= 1 << u
    independent = bytearray(1 << n)
    independent[0] = 1
    counts = [0] * (n + 1)
    counts[0] = 1
    for mask in range(1, 1 << n):
        low = mask & -mask
        rest = mask ^ low
        if independent[rest] and not (neighbours[low.bit_length() - 1] & rest):
            independent[mask] = 1
            counts[mask.bit_count()] += 1
    return poly_strip(counts)
