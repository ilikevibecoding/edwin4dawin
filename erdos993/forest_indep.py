"""
Exact, dependency-free tools for Erdős Problem #993
(unimodality of the independent-set sequence of trees and forests).

Contents
--------
* ``tree_level_sequences(n)``: every nonisomorphic free tree of order ``n``
  exactly once, as a level sequence (Wright–Richmond–Odlyzko–McKay
  algorithm; port of the NetworkX implementation, BSD-3-Clause).
* ``indep_poly_tree(parent)``: exact independence polynomial of a rooted
  tree given by a parent array (Python integers, no floating point).
* ``indep_poly_bruteforce(n, edges)``: bitmask enumeration for cross-checks.
* ``forests(n, tree_polys)``: every nonisomorphic forest of order ``n``
  exactly once, as a multiset of trees, together with its exact polynomial.
* Framework quantities from the project handoff:
    L(alpha)   = ceil((2 alpha - 1) / 3)
    WR_r(F)    : p_{r-1} <= r p_r
    ISO_r(F)   : Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0
    TAIL       : p_r >= p_{r+1} for r >= L(alpha)   (Levit–Mandrescu)
  and ``audit_sequence`` which evaluates all of them exactly.

Every quantity is an exact integer or ``fractions.Fraction``.  Nothing in
this module proves anything about infinitely many forests: finite
enumeration is falsification evidence only.
"""

from __future__ import annotations

from fractions import Fraction
from functools import lru_cache
from itertools import product as _product

# ---------------------------------------------------------------------------
# Counting (independent of the generator; used to audit the generator)
# ---------------------------------------------------------------------------


@lru_cache(None)
def count_rooted_trees(n: int) -> int:
    """OEIS A000081: number of unlabeled rooted trees on n vertices."""
    if n < 2:
        return n
    value = 0
    for j in range(1, n):
        for d in range(1, n):
            if j % d == 0:
                value += d * count_rooted_trees(d) * count_rooted_trees(n - j)
    return value // (n - 1)


@lru_cache(None)
def count_trees(n: int) -> int:
    """OEIS A000055: number of unlabeled free trees on n vertices."""
    if n == 0:
        return 1
    value = 0
    for k in range(n + 1):
        value += count_rooted_trees(k) * count_rooted_trees(n - k)
    if n % 2 == 0:
        value -= count_rooted_trees(n // 2)
    return count_rooted_trees(n) - value // 2


def count_forests_upto(nmax: int) -> list[int]:
    """OEIS A005195 (forests on n unlabeled vertices) for n = 0..nmax,
    computed as the Euler transform of the tree counts."""
    t = [count_trees(k) for k in range(nmax + 1)]
    # Euler transform: prod_{k>=1} (1 - x^k)^{-t_k}
    f = [0] * (nmax + 1)
    f[0] = 1
    for k in range(1, nmax + 1):
        for _ in range(t[k]):
            for m in range(k, nmax + 1):
                f[m] += f[m - k]
    return f


# ---------------------------------------------------------------------------
# WROM generator of nonisomorphic free trees (level sequences)
# ---------------------------------------------------------------------------


def _next_rooted_tree(predecessor, p=None):
    """One step of the Beyer–Hedetniemi successor for rooted level sequences."""
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


def _split_tree(layout):
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


def _next_tree(candidate):
    """One step of the WROM algorithm: return ``candidate`` if it is the
    canonical level sequence of a free tree, else jump to the next one."""
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
        new_left, _new_rest = _split_tree(new_candidate)
        new_left_height = max(new_left)
        suffix = range(1, new_left_height + 2)
        new_candidate[-len(suffix):] = suffix
    return new_candidate


def tree_level_sequences(n: int):
    """Yield the canonical level sequence of every nonisomorphic free tree
    of order ``n`` exactly once.  Vertex ``i`` has depth ``seq[i]`` and the
    sequence is a preorder (DFS) listing, so the parent of ``i`` is the
    nearest ``j < i`` with ``seq[j] == seq[i] - 1``."""
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


def level_sequence_to_parent(seq) -> list[int]:
    """Parent array of a level sequence (root has parent -1)."""
    parent = [-1] * len(seq)
    stack = []
    for i, lev in enumerate(seq):
        while stack and seq[stack[-1]] >= lev:
            stack.pop()
        if stack:
            parent[i] = stack[-1]
        stack.append(i)
    return parent


def parent_to_edges(parent) -> list[tuple[int, int]]:
    return [(parent[i], i) for i in range(len(parent)) if parent[i] >= 0]


# ---------------------------------------------------------------------------
# Exact polynomial arithmetic
# ---------------------------------------------------------------------------


def poly_mul(a, b):
    if not a or not b:
        return []
    out = [0] * (len(a) + len(b) - 1)
    for i, ai in enumerate(a):
        if ai:
            for j, bj in enumerate(b):
                out[i + j] += ai * bj
    return out


def poly_add(a, b):
    if len(a) < len(b):
        a, b = b, a
    out = list(a)
    for i, bi in enumerate(b):
        out[i] += bi
    return out


def poly_strip(a):
    a = list(a)
    while len(a) > 1 and a[-1] == 0:
        a.pop()
    return a


def indep_poly_tree(parent) -> list[int]:
    """Exact independence polynomial of a rooted tree (parent array, root
    first, children after parents), coefficient list p_0..p_alpha."""
    n = len(parent)
    f = [[1] for _ in range(n)]      # root of subtree excluded
    g = [[0, 1] for _ in range(n)]   # root of subtree included
    for v in range(n - 1, 0, -1):
        p = parent[v]
        f[p] = poly_mul(f[p], poly_add(f[v], g[v]))
        g[p] = poly_mul(g[p], f[v])
    return poly_strip(poly_add(f[0], g[0]))


def indep_poly_from_edges(n: int, edges) -> list[int]:
    """Exact independence polynomial of a forest given by an edge list on
    vertices 0..n-1 (validated to be acyclic).  Works component-wise."""
    adj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)
    seen = [False] * n
    total = [1]
    for root in range(n):
        if seen[root]:
            continue
        order = [root]
        par = {root: -1}
        seen[root] = True
        i = 0
        while i < len(order):
            v = order[i]
            i += 1
            for w in adj[v]:
                if w == par[v]:
                    continue
                if seen[w]:
                    raise ValueError("edge list contains a cycle")
                seen[w] = True
                par[w] = v
                order.append(w)
        index = {v: k for k, v in enumerate(order)}
        parent = [index[par[v]] if par[v] >= 0 else -1 for v in order]
        total = poly_mul(total, indep_poly_tree(parent))
    return poly_strip(total)


def indep_poly_bruteforce(n: int, edges) -> list[int]:
    """Independence polynomial by explicit enumeration of all 2^n subsets."""
    nb = [0] * n
    for a, b in edges:
        nb[a] |= 1 << b
        nb[b] |= 1 << a
    counts = [0] * (n + 1)
    for mask in range(1 << n):
        ok = True
        m = mask
        while m:
            v = (m & -m).bit_length() - 1
            if nb[v] & mask:
                ok = False
                break
            m &= m - 1
        if ok:
            counts[bin(mask).count("1")] += 1
    return poly_strip(counts)


# ---------------------------------------------------------------------------
# Canonical forms (for auditing the generator on small orders)
# ---------------------------------------------------------------------------


def tree_canonical_form(n: int, edges) -> str:
    """AHU canonical string of a free tree, rooted at its center(s)."""
    adj = [set() for _ in range(n)]
    for a, b in edges:
        adj[a].add(b)
        adj[b].add(a)
    if n == 1:
        return "()"
    # peel leaves to find the center(s)
    deg = [len(adj[v]) for v in range(n)]
    layer = [v for v in range(n) if deg[v] <= 1]
    remaining = n
    removed = [False] * n
    while remaining > 2:
        nxt = []
        for v in layer:
            removed[v] = True
            remaining -= 1
            for w in adj[v]:
                if not removed[w]:
                    deg[w] -= 1
                    if deg[w] == 1:
                        nxt.append(w)
        layer = nxt
    centers = [v for v in range(n) if not removed[v]]

    def enc(v, parent):
        subs = sorted(enc(w, v) for w in adj[v] if w != parent)
        return "(" + "".join(subs) + ")"

    return min(enc(c, -1) for c in centers)


def prufer_to_edges(seq, n: int):
    """Labeled tree on n vertices from a Prüfer sequence of length n-2."""
    degree = [1] * n
    for v in seq:
        degree[v] += 1
    edges = []
    for v in seq:
        for leaf in range(n):
            if degree[leaf] == 1:
                edges.append((leaf, v))
                degree[leaf] -= 1
                degree[v] -= 1
                break
    u = [v for v in range(n) if degree[v] == 1]
    edges.append((u[0], u[1]))
    return edges


# ---------------------------------------------------------------------------
# Forest enumeration
# ---------------------------------------------------------------------------


def tree_polys_upto(nmax: int) -> list[list[list[int]]]:
    """tree_polys[k] = exact polynomials of all nonisomorphic trees of order k."""
    out = [[] for _ in range(nmax + 1)]
    for k in range(1, nmax + 1):
        out[k] = [indep_poly_tree(level_sequence_to_parent(s))
                  for s in tree_level_sequences(k)]
    return out


def forests(n: int, tree_polys):
    """Yield ``(components, poly)`` for every nonisomorphic forest of order
    ``n`` exactly once.  ``components`` is a tuple of ``(size, index)``
    pairs, non-increasing in size and non-decreasing in index within a
    size, indexing into ``tree_polys``; ``poly`` is the exact product."""

    def rec(remaining, last_size, last_idx, poly):
        if remaining == 0:
            yield (), poly
            return
        for k in range(min(remaining, last_size), 0, -1):
            polys = tree_polys[k]
            i0 = last_idx if k == last_size else 0
            for i in range(i0, len(polys)):
                newpoly = poly_mul(poly, polys[i])
                for comps, P in rec(remaining - k, k, i, newpoly):
                    yield ((k, i),) + comps, P

    yield from rec(n, n, 0, [1])


# ---------------------------------------------------------------------------
# Framework quantities
# ---------------------------------------------------------------------------


def L_cutoff(alpha: int) -> int:
    """L(alpha) = ceil((2 alpha - 1)/3)."""
    return -((1 - 2 * alpha) // 3)


def Q_iso(p, r: int) -> int:
    """ISO_r quantity Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1}."""
    return r * p[r] ** 2 + p[r - 1] ** 2 - (r + 1) * p[r - 1] * p[r + 1]


def wr_slack(p, r: int) -> int:
    """WR_r slack r p_r - p_{r-1} (>= 0 means WR_r holds)."""
    return r * p[r] - p[r - 1]


def is_unimodal(p) -> bool:
    i = 0
    while i + 1 < len(p) and p[i] <= p[i + 1]:
        i += 1
    while i + 1 < len(p) and p[i] >= p[i + 1]:
        i += 1
    return i + 1 == len(p)


def is_log_concave(p) -> bool:
    return all(p[r] ** 2 >= p[r - 1] * p[r + 1] for r in range(1, len(p) - 1))


def audit_sequence(p, with_ratio: bool = False) -> dict:
    """Exact audit of one independence sequence p_0..p_alpha.

    Prefix means 1 <= r <= L(alpha) - 1, the range of indices where the
    handoff's descent argument uses WR_r and ISO_r; tail means r >= L(alpha),
    where the Levit–Mandrescu theorem supplies p_r >= p_{r+1}."""
    alpha = len(p) - 1
    L = L_cutoff(alpha) if alpha >= 1 else 0
    rec = {
        "alpha": alpha,
        "L": L,
        "unimodal": is_unimodal(p),
        "log_concave": is_log_concave(p),
        "tail_ok": all(p[r] >= p[r + 1] for r in range(L, alpha)),
    }
    prefix = range(1, L)             # r = 1 .. L-1  (requires r+1 <= alpha)
    allr = range(1, alpha)           # r = 1 .. alpha-1
    rec["wr_prefix_min"] = min((wr_slack(p, r) for r in prefix), default=None)
    rec["iso_prefix_min"] = min((Q_iso(p, r) for r in prefix), default=None)
    rec["wr_all_min"] = min((wr_slack(p, r) for r in range(1, alpha + 1)), default=None)
    rec["iso_all_min"] = min((Q_iso(p, r) for r in allr), default=None)
    if with_ratio:
        ratios = [Fraction(r * p[r] ** 2 + p[r - 1] ** 2,
                           (r + 1) * p[r - 1] * p[r + 1]) for r in prefix]
        rec["iso_prefix_ratio_min"] = min(ratios, default=None)
    return rec


# ---------------------------------------------------------------------------
# Named test trees
# ---------------------------------------------------------------------------


def klym_3kk_tree(k: int, *, left: int = 3):
    """Kadrawi–Levit–Yosef–Mizrachi '(left, k, k) structure': a centre v0
    joined to v1, v2, v3; v1 carries ``left`` pendant K2's, v2 and v3 carry
    ``k`` pendant K2's each (each K2 attached by one endpoint).
    Order = 4 + 2(left + 2k).  k = 4 gives the 26-vertex tree T1."""
    edges = [(0, 1), (0, 2), (0, 3)]
    nxt = 4
    for hub, count in ((1, left), (2, k), (3, k)):
        for _ in range(count):
            a, b = nxt, nxt + 1
            nxt += 2
            edges += [(hub, a), (a, b)]
    return nxt, edges


KLYM_T1_POLY = [1, 26, 300, 2040, 9142, 28551, 63933, 103736, 121376, 100144,
                55499, 18683, 2979, 51, 1]

# OEIS A000055 (trees) and A005195 (forests), n = 0..20, as published.
OEIS_A000055 = [1, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159,
                7741, 19320, 48629, 123867, 317955, 823065]
OEIS_A005195 = [1, 1, 2, 3, 6, 10, 20, 37, 76, 153, 329, 710, 1601, 3658,
                8599, 20514, 49905, 122963, 307199, 775529, 1977878]


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------


def _selftest(verbose: bool = True) -> None:
    import random

    log = print if verbose else (lambda *a, **k: None)

    # 1. counting recurrences agree with the published OEIS values
    assert [count_trees(n) for n in range(21)] == OEIS_A000055
    assert count_forests_upto(20) == OEIS_A005195
    log("counts: A000055 and A005195 reproduced for n <= 20")

    # 2. generator: correct number of trees, pairwise nonisomorphic (n <= 12)
    for n in range(1, 13):
        forms = set()
        cnt = 0
        for seq in tree_level_sequences(n):
            assert len(seq) == n and seq[0] == 0
            par = level_sequence_to_parent(seq)
            forms.add(tree_canonical_form(n, parent_to_edges(par)))
            cnt += 1
        assert cnt == count_trees(n), (n, cnt)
        assert len(forms) == cnt, (n, len(forms), cnt)
    log("generator: exact counts and pairwise nonisomorphism for n <= 12")

    # 3. generator completeness against all labeled trees (Prüfer), n <= 8
    for n in range(3, 9):
        labeled = set()
        for seq in _product(range(n), repeat=n - 2):
            labeled.add(tree_canonical_form(n, prufer_to_edges(seq, n)))
        gen = {tree_canonical_form(n, parent_to_edges(level_sequence_to_parent(s)))
               for s in tree_level_sequences(n)}
        assert labeled == gen, n
    log("generator: complete against Prüfer enumeration for n <= 8")

    # 4. polynomial DP against brute force: all trees n <= 10, random forests
    for n in range(1, 11):
        for seq in tree_level_sequences(n):
            par = level_sequence_to_parent(seq)
            edges = parent_to_edges(par)
            assert indep_poly_tree(par) == indep_poly_bruteforce(n, edges)
            assert indep_poly_from_edges(n, edges) == indep_poly_tree(par)
    rng = random.Random(993)
    for _ in range(200):
        n = rng.randint(1, 14)
        # random forest: random parent pointers with some roots
        edges = []
        for v in range(1, n):
            if rng.random() < 0.8:
                edges.append((rng.randrange(v), v))
        assert indep_poly_from_edges(n, edges) == indep_poly_bruteforce(n, edges)
    log("polynomials: DP matches brute force on all trees n <= 10 and random forests")

    # 5. published polynomial of the 26-vertex non-log-concave tree T1
    n, edges = klym_3kk_tree(4)
    assert n == 26
    P = indep_poly_from_edges(n, edges)
    assert P == KLYM_T1_POLY, P
    assert not is_log_concave(P) and is_unimodal(P)
    log("KLYM T1 (26 vertices): published I(T1;x) reproduced; non-log-concave, unimodal")

    # 6. forest enumeration: counts and multiset uniqueness, n <= 12
    tp = tree_polys_upto(12)
    for n in range(1, 13):
        seen = set()
        cnt = 0
        for comps, P in forests(n, tp):
            assert comps not in seen
            seen.add(comps)
            assert sum(k for k, _ in comps) == n
            # product check
            Q = [1]
            for k, i in comps:
                Q = poly_mul(Q, tp[k][i])
            assert Q == P
            cnt += 1
        assert cnt == OEIS_A005195[n], (n, cnt)
    log("forests: exact A005195 counts, unique multisets, exact products for n <= 12")

    # 7. framework quantities on binomial (edgeless) sequences
    from math import comb
    for n in range(1, 30):
        p = [comb(n, r) for r in range(n + 1)]
        a = audit_sequence(p)
        assert a["unimodal"] and a["tail_ok"]
        if a["iso_prefix_min"] is not None:
            assert a["iso_prefix_min"] > 0 and a["wr_prefix_min"] >= 0
    assert L_cutoff(1) == 1 and L_cutoff(2) == 1 and L_cutoff(3) == 2 and L_cutoff(4) == 3
    assert L_cutoff(14) == 9
    log("framework: L(alpha), WR, ISO, TAIL evaluated on edgeless forests")
    log("SELFTEST PASS")


if __name__ == "__main__":
    _selftest()
