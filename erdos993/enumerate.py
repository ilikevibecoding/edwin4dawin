"""Enumeration of trees and forests up to isomorphism.

Trees of order ``n`` are streamed from ``nauty-gentreeg`` (``-p -q``: one
parent array per line; ``res/mod`` splitting is supported) with a
``networkx.nonisomorphic_trees`` fallback.  Forests are enumerated by
combining trees over the integer partitions of ``n``: for a part size ``k``
occurring ``m`` times, choose a multiset of ``m`` trees of order ``k``.
Since isomorphism classes of forests correspond exactly to multisets of
isomorphism classes of trees, this yields every forest exactly once.

Reference counts (OEIS): :data:`A000055` (trees) and :data:`A005195`
(forests), indexed by ``n = 0, 1, 2, ...``.
"""

from __future__ import annotations

import shutil
import subprocess
from collections import Counter
from collections.abc import Iterable, Iterator, Sequence
from itertools import combinations_with_replacement, product
from math import comb

from .indpoly import (
    Poly,
    independence_polynomial_parent_array,
    parent_array_to_edges,
    poly_prod,
    validate_parent_array,
)

ParentArray = tuple[int, ...]

A000055 = (1, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741)
"""Number of trees with ``n`` unlabelled nodes, ``n = 0 .. 15`` (``A000055[n]``)."""

A005195 = (1, 1, 2, 3, 6, 10, 20, 37, 76, 153, 329, 710, 1601, 3658, 8599, 20514)
"""Number of forests with ``n`` unlabelled nodes, ``n = 0 .. 15`` (``A005195[n]``)."""

GENTREEG_CANDIDATES = ("nauty-gentreeg", "gentreeg")


# ---------------------------------------------------------------------------
# Trees
# ---------------------------------------------------------------------------


def gentreeg_executable() -> str | None:
    """Return the path of the gentreeg binary, or ``None`` if not installed."""
    for name in GENTREEG_CANDIDATES:
        path = shutil.which(name)
        if path:
            return path
    return None


def _check_order(n: int) -> None:
    if isinstance(n, bool) or not isinstance(n, int):
        raise TypeError("n must be an int")
    if n < 1:
        raise ValueError("n must be at least 1")


def _check_split(res: int | None, mod: int | None) -> None:
    if (res is None) != (mod is None):
        raise ValueError("res and mod must be given together")
    if mod is not None and not (mod >= 1 and 0 <= res < mod):
        raise ValueError("need mod >= 1 and 0 <= res < mod")


def iter_trees_gentreeg(
    n: int, res: int | None = None, mod: int | None = None, executable: str | None = None
) -> Iterator[ParentArray]:
    """Stream the trees of order ``n`` from gentreeg as parent arrays.

    ``res``/``mod`` select the ``res``-th of ``mod`` disjoint slices of the
    output, exactly as gentreeg's ``res/mod`` argument does.  Raises
    :class:`FileNotFoundError` if no gentreeg binary is available and
    :class:`RuntimeError` if it exits with an error.
    """
    _check_order(n)
    _check_split(res, mod)
    exe = executable or gentreeg_executable()
    if exe is None:
        raise FileNotFoundError("nauty-gentreeg is not installed")
    cmd = [exe, "-p", "-q", str(n)]
    if mod is not None:
        cmd.append(f"{res}/{mod}")
    proc = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1
    )
    assert proc.stdout is not None and proc.stderr is not None
    try:
        for line in proc.stdout:
            fields = line.split()
            if not fields:
                continue
            if len(fields) != n:
                raise RuntimeError(f"unexpected gentreeg output line: {line!r}")
            yield validate_parent_array(tuple(int(f) for f in fields))
        proc.stdout.close()
        stderr = proc.stderr.read()
        returncode = proc.wait()
        if returncode != 0:
            raise RuntimeError(f"gentreeg failed with code {returncode}: {stderr.strip()}")
    finally:
        if proc.poll() is None:
            proc.kill()
            proc.wait()
        proc.stdout.close()
        proc.stderr.close()


def nx_tree_to_parent_array(tree) -> ParentArray:
    """Relabel a networkx tree in BFS order and return its parent array."""
    import networkx as nx

    nodes = list(tree.nodes)
    if not nodes:
        raise ValueError("empty graph")
    root = nodes[0]
    order = [root]
    parent_of = {root: None}
    for u, v in nx.bfs_edges(tree, root):
        parent_of[v] = u
        order.append(v)
    if len(order) != len(nodes):
        raise ValueError("graph is not connected")
    label = {v: i + 1 for i, v in enumerate(order)}
    return tuple(0 if parent_of[v] is None else label[parent_of[v]] for v in order)


def iter_trees_networkx(
    n: int, res: int | None = None, mod: int | None = None
) -> Iterator[ParentArray]:
    """Enumerate the trees of order ``n`` with networkx, as parent arrays."""
    import networkx as nx

    _check_order(n)
    _check_split(res, mod)
    if n == 1:
        trees: Iterable = [nx.empty_graph(1)]
    else:
        trees = nx.nonisomorphic_trees(n)
    for index, tree in enumerate(trees):
        if mod is not None and index % mod != res:
            continue
        yield nx_tree_to_parent_array(tree)


def iter_trees(
    n: int, res: int | None = None, mod: int | None = None, backend: str = "auto"
) -> Iterator[ParentArray]:
    """Iterate over all trees of order ``n`` up to isomorphism as parent arrays.

    ``backend`` is ``"gentreeg"``, ``"networkx"`` or ``"auto"`` (gentreeg when
    installed, networkx otherwise).
    """
    if backend not in ("auto", "gentreeg", "networkx"):
        raise ValueError(f"unknown backend {backend!r}")
    if backend == "networkx" or (backend == "auto" and gentreeg_executable() is None):
        return iter_trees_networkx(n, res, mod)
    return iter_trees_gentreeg(n, res, mod)


def count_trees(n: int, backend: str = "auto") -> int:
    """Number of trees of order ``n`` up to isomorphism (by enumeration)."""
    return sum(1 for _ in iter_trees(n, backend=backend))


def verify_tree_counts(max_n: int = 15, backend: str = "auto") -> dict[int, tuple[int, int]]:
    """Compare enumerated tree counts with :data:`A000055` for ``n <= max_n``.

    Returns ``{n: (enumerated, expected)}`` and raises :class:`AssertionError`
    on the first mismatch.
    """
    if max_n >= len(A000055):
        raise ValueError(f"reference values are available for n <= {len(A000055) - 1}")
    out: dict[int, tuple[int, int]] = {}
    for n in range(1, max_n + 1):
        found = count_trees(n, backend=backend)
        expected = A000055[n]
        out[n] = (found, expected)
        if found != expected:
            raise AssertionError(f"{found} trees of order {n} enumerated, OEIS A000055 says {expected}")
    return out


# ---------------------------------------------------------------------------
# Forests
# ---------------------------------------------------------------------------


def partitions(n: int, max_part: int | None = None) -> Iterator[tuple[int, ...]]:
    """Yield the integer partitions of ``n`` as non-increasing tuples."""
    if max_part is None or max_part > n:
        max_part = n
    if n == 0:
        yield ()
        return
    for first in range(max_part, 0, -1):
        for rest in partitions(n - first, first):
            yield (first,) + rest


def components_to_forest(components: Sequence[Sequence[int]]) -> tuple[int, list[tuple[int, int]]]:
    """Combine tree parent arrays into one ``(n, edges)`` forest on ``0 .. n-1``."""
    edges: list[tuple[int, int]] = []
    offset = 0
    for parents in components:
        for u, v in parent_array_to_edges(parents):
            edges.append((u + offset, v + offset))
        offset += len(parents)
    return offset, edges


def independence_polynomial_components(
    components: Sequence[ParentArray], cache: dict[ParentArray, Poly] | None = None
) -> Poly:
    """Independence polynomial of a forest given by its component parent arrays.

    ``cache`` (a dict) can be supplied to reuse tree polynomials across many
    forests that share components.
    """
    polys = []
    for parents in components:
        key = tuple(parents)
        if cache is not None and key in cache:
            polys.append(cache[key])
            continue
        poly = independence_polynomial_parent_array(key)
        if cache is not None:
            cache[key] = poly
        polys.append(poly)
    return poly_prod(polys)


def trees_by_order(max_n: int, backend: str = "auto") -> dict[int, list[ParentArray]]:
    """Return ``{k: [trees of order k]}`` for ``1 <= k <= max_n``."""
    return {k: list(iter_trees(k, backend=backend)) for k in range(1, max_n + 1)}


def iter_forests(
    n: int, backend: str = "auto", trees: dict[int, list[ParentArray]] | None = None
) -> Iterator[tuple[ParentArray, ...]]:
    """Enumerate all forests of order ``n`` up to isomorphism.

    Each forest is yielded as a tuple of component parent arrays with
    non-increasing component sizes; :func:`components_to_forest` converts it
    into ``(n, edges)`` and :func:`independence_polynomial_components`
    computes its independence polynomial.  ``n = 0`` yields the empty forest
    ``()`` once.
    """
    if n == 0:
        yield ()
        return
    _check_order(n)
    if trees is None:
        trees = trees_by_order(n, backend=backend)
    for part in partitions(n):
        multiplicity = Counter(part)
        sizes = sorted(multiplicity, reverse=True)
        pools = [combinations_with_replacement(trees[k], multiplicity[k]) for k in sizes]
        for choice in product(*pools):
            yield tuple(tree for group in choice for tree in group)


def count_forests(n: int, backend: str = "auto") -> int:
    """Number of forests of order ``n`` up to isomorphism, by enumeration."""
    return sum(1 for _ in iter_forests(n, backend=backend))


def count_forests_formula(n: int, tree_counts: Sequence[int] = A000055) -> int:
    """Number of forests of order ``n`` from tree counts alone.

    Sums over partitions of ``n`` the product over distinct part sizes ``k``
    (with multiplicity ``m``) of ``C(T_k + m - 1, m)`` where ``T_k`` is the
    number of trees of order ``k`` (``tree_counts[k]``).
    """
    if n >= len(tree_counts):
        raise ValueError(f"tree counts are available for n <= {len(tree_counts) - 1}")
    total = 0
    for part in partitions(n):
        ways = 1
        for k, m in Counter(part).items():
            ways *= comb(tree_counts[k] + m - 1, m)
        total += ways
    return total


def verify_forest_counts(
    max_n: int = 15, method: str = "enumerate", backend: str = "auto"
) -> dict[int, tuple[int, int]]:
    """Compare forest counts with :data:`A005195` for ``0 <= n <= max_n``.

    ``method`` is ``"enumerate"`` (count the forests actually generated) or
    ``"formula"`` (:func:`count_forests_formula`).  Returns
    ``{n: (found, expected)}`` and raises :class:`AssertionError` on the
    first mismatch.
    """
    if max_n >= len(A005195):
        raise ValueError(f"reference values are available for n <= {len(A005195) - 1}")
    if method not in ("enumerate", "formula"):
        raise ValueError(f"unknown method {method!r}")
    trees = trees_by_order(max_n, backend=backend) if method == "enumerate" else None
    out: dict[int, tuple[int, int]] = {}
    for n in range(0, max_n + 1):
        if method == "enumerate":
            found = sum(1 for _ in iter_forests(n, trees=trees))
        else:
            found = count_forests_formula(n)
        expected = A005195[n]
        out[n] = (found, expected)
        if found != expected:
            raise AssertionError(f"{found} forests of order {n} counted, OEIS A005195 says {expected}")
    return out
