"""Exact independence polynomials of forests (integer arithmetic only)."""

from __future__ import annotations

from typing import Iterable, List, Sequence

Poly = List[int]  # coefficient list, index r = number of independent sets of size r


def poly_mul(a: Sequence[int], b: Sequence[int]) -> Poly:
    out = [0] * (len(a) + len(b) - 1)
    for i, ai in enumerate(a):
        if ai:
            for j, bj in enumerate(b):
                out[i + j] += ai * bj
    return out


def poly_add(a: Sequence[int], b: Sequence[int]) -> Poly:
    n = max(len(a), len(b))
    out = [0] * n
    for i, v in enumerate(a):
        out[i] += v
    for i, v in enumerate(b):
        out[i] += v
    return out


def tree_independence_polynomial(parents: Sequence[int]) -> Poly:
    """Independence polynomial of the tree given by a preorder parent array.

    ``parents[v] < v`` for every non-root vertex ``v`` and ``parents[root] == -1``.
    Standard rooted DP: for each vertex ``v``

        A_v = prod_{c child of v} (A_c + B_c)      (sets avoiding v)
        B_v = x * prod_{c child of v} A_c          (sets containing v)

    and ``I(T) = A_root + B_root``.
    """
    n = len(parents)
    A: List[Poly] = [[1] for _ in range(n)]
    B: List[Poly] = [[0, 1] for _ in range(n)]
    roots = []
    for v in range(n - 1, -1, -1):
        p = parents[v]
        if p < 0:
            roots.append(v)
            continue
        A[p] = poly_mul(A[p], poly_add(A[v], B[v]))
        B[p] = poly_mul(B[p], A[v])
    result: Poly = [1]
    for r in roots:  # a parent array may describe a forest (several roots)
        result = poly_mul(result, poly_add(A[r], B[r]))
    return result


def forest_independence_polynomial(components: Iterable[Sequence[int]]) -> Poly:
    """Product of the component polynomials."""
    result: Poly = [1]
    for c in components:
        result = poly_mul(result, c)
    return result


def brute_force_independence_polynomial(n: int, edges: Sequence[tuple]) -> Poly:
    """Reference implementation by enumerating all 2^n subsets (small n only)."""
    adj = [0] * n
    for u, v in edges:
        adj[u] |= 1 << v
        adj[v] |= 1 << u
    coeffs = [0] * (n + 1)
    for mask in range(1 << n):
        ok = True
        m = mask
        while m:
            v = (m & -m).bit_length() - 1
            if adj[v] & mask:
                ok = False
                break
            m &= m - 1
        if ok:
            coeffs[bin(mask).count("1")] += 1
    while len(coeffs) > 1 and coeffs[-1] == 0:
        coeffs.pop()
    return coeffs
