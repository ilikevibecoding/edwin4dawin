"""Self-contained exact-integer helpers for the ISO_r falsification test on
"hard" trees (non-log-concave and near-extremal families).

Everything here uses Python ints / Fractions only.  No imports from the
erdos993 package (it is being written concurrently).

Conventions
-----------
A forest is given as (n, edges) with vertices 0..n-1 and edges as (u, v)
pairs.  I(F; x) = sum_r p_r x^r is returned as a list of ints
[p_0, p_1, ..., p_alpha] (no trailing zeros; p_0 = 1).

alpha = degree of I,  L(alpha) = ceil((2 alpha - 1) / 3).
WR_r  : p_{r-1} <= r p_r                                   (1 <= r <= alpha)
ISO_r : Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0   (1 <= r <= alpha-1)
descent-conditional ISO_r : ISO_r restricted to r with p_{r-1} >= p_r.
"""

from __future__ import annotations

import itertools
import math
import sys
from fractions import Fraction
from functools import lru_cache
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

sys.setrecursionlimit(1_000_000)

Edge = Tuple[int, int]
Poly = List[int]


# ---------------------------------------------------------------------------
# Polynomial helpers
# ---------------------------------------------------------------------------

def poly_mul(a: Poly, b: Poly) -> Poly:
    if not a or not b:
        return []
    out = [0] * (len(a) + len(b) - 1)
    for i, ai in enumerate(a):
        if ai == 0:
            continue
        for j, bj in enumerate(b):
            out[i + j] += ai * bj
    return out


def poly_add(a: Poly, b: Poly) -> Poly:
    if len(a) < len(b):
        a, b = b, a
    out = list(a)
    for i, x in enumerate(b):
        out[i] += x
    return out


def poly_shift(a: Poly, k: int = 1) -> Poly:
    return [0] * k + list(a)


def poly_trim(a: Poly) -> Poly:
    a = list(a)
    while len(a) > 1 and a[-1] == 0:
        a.pop()
    return a


# ---------------------------------------------------------------------------
# Graph helpers
# ---------------------------------------------------------------------------

def adjacency(n: int, edges: Iterable[Edge]) -> List[List[int]]:
    adj: List[List[int]] = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    return adj


def is_forest(n: int, edges: Sequence[Edge]) -> bool:
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for u, v in edges:
        ru, rv = find(u), find(v)
        if ru == rv:
            return False
        parent[ru] = rv
    return True


def is_tree(n: int, edges: Sequence[Edge]) -> bool:
    return len(edges) == n - 1 and is_forest(n, edges)


def degree_sequence(n: int, edges: Sequence[Edge]) -> List[int]:
    deg = [0] * n
    for u, v in edges:
        deg[u] += 1
        deg[v] += 1
    return deg


# ---------------------------------------------------------------------------
# Independence polynomial: primary rooted-tree DP
# ---------------------------------------------------------------------------

def indep_poly(n: int, edges: Sequence[Edge]) -> Poly:
    """Independence polynomial of a forest by an iterative rooted DP.

    For every vertex v (processed children-first) we keep
        f_in[v]  = I(subtree(v); x) restricted to sets containing v,
        f_out[v] = I(subtree(v); x) restricted to sets avoiding v.
    Then f_in[v] = x * prod f_out[c],  f_out[v] = prod (f_in[c] + f_out[c]).
    The polynomial of the forest is the product over components.
    """
    adj = adjacency(n, edges)
    seen = [False] * n
    total: Poly = [1]
    for root in range(n):
        if seen[root]:
            continue
        # iterative DFS to get an order with children before parents
        order: List[int] = []
        parent = [-1] * n
        stack = [root]
        seen[root] = True
        while stack:
            v = stack.pop()
            order.append(v)
            for w in adj[v]:
                if not seen[w]:
                    seen[w] = True
                    parent[w] = v
                    stack.append(w)
        f_in: Dict[int, Poly] = {}
        f_out: Dict[int, Poly] = {}
        for v in reversed(order):
            pin: Poly = [1]
            pout: Poly = [1]
            for w in adj[v]:
                if w == parent[v]:
                    continue
                pin = poly_mul(pin, f_out[w])
                pout = poly_mul(pout, poly_add(f_in[w], f_out[w]))
            f_in[v] = poly_shift(pin, 1)
            f_out[v] = pout
        comp = poly_add(f_in[root], f_out[root])
        total = poly_mul(total, comp)
    return poly_trim(total)


# ---------------------------------------------------------------------------
# Independence polynomial: second, independent implementation
# (vertex deletion recurrence I(G) = I(G - v) + x I(G - N[v]) with
#  memoisation on the vertex subset and factorisation over components).
# ---------------------------------------------------------------------------

def indep_poly_alt(n: int, edges: Sequence[Edge]) -> Poly:
    adj = adjacency(n, edges)
    nbr_mask = [0] * n
    for v in range(n):
        m = 0
        for w in adj[v]:
            m |= 1 << w
        nbr_mask[v] = m

    def components(mask: int) -> List[int]:
        comps: List[int] = []
        rem = mask
        while rem:
            start = (rem & -rem).bit_length() - 1
            comp = 1 << start
            frontier = comp
            while frontier:
                nxt = 0
                f = frontier
                while f:
                    v = (f & -f).bit_length() - 1
                    f &= f - 1
                    nxt |= nbr_mask[v] & mask
                frontier = nxt & ~comp
                comp |= frontier
            comps.append(comp)
            rem &= ~comp
        return comps

    @lru_cache(maxsize=None)
    def I_conn(mask: int) -> Tuple[int, ...]:
        # mask is a connected induced subgraph
        cnt = bin(mask).count("1")
        if cnt == 0:
            return (1,)
        if cnt == 1:
            return (1, 1)
        # choose vertex of maximum degree inside mask
        best_v, best_d = -1, -1
        m = mask
        while m:
            v = (m & -m).bit_length() - 1
            m &= m - 1
            d = bin(nbr_mask[v] & mask).count("1")
            if d > best_d:
                best_v, best_d = v, d
        v = best_v
        a = I_any(mask & ~(1 << v))
        b = I_any(mask & ~(1 << v) & ~nbr_mask[v])
        res = poly_add(list(a), poly_shift(list(b), 1))
        return tuple(res)

    def I_any(mask: int) -> Tuple[int, ...]:
        out: Poly = [1]
        for comp in components(mask):
            out = poly_mul(out, list(I_conn(comp)))
        return tuple(out)

    full = (1 << n) - 1
    return poly_trim(list(I_any(full)))


def indep_poly_bruteforce(n: int, edges: Sequence[Edge]) -> Poly:
    """Count independent sets by explicit backtracking enumeration (n <= ~24)."""
    adj = adjacency(n, edges)
    nbr_mask = [0] * n
    for v in range(n):
        for w in adj[v]:
            nbr_mask[v] |= 1 << w
    counts = [0] * (n + 1)

    def rec(v: int, blocked: int, size: int) -> None:
        if v == n:
            counts[size] += 1
            return
        # exclude v
        rec(v + 1, blocked, size)
        # include v if allowed
        if not (blocked >> v) & 1:
            rec(v + 1, blocked | nbr_mask[v], size + 1)

    rec(0, 0, 0)
    return poly_trim(counts)


# ---------------------------------------------------------------------------
# graph6 decoding (standard format, n <= 62 or the 3-byte extension)
# ---------------------------------------------------------------------------

def graph6_to_edges(s: str) -> Tuple[int, List[Edge]]:
    s = s.strip()
    if s.startswith(">>graph6<<"):
        s = s[len(">>graph6<<"):]
    data = [ord(c) - 63 for c in s]
    if data[0] <= 62:
        n = data[0]
        idx = 1
    elif data[1] <= 62:
        n = (data[1] << 12) | (data[2] << 6) | data[3]
        idx = 4
    else:
        n = ((data[2] << 30) | (data[3] << 24) | (data[4] << 18)
             | (data[5] << 12) | (data[6] << 6) | data[7])
        idx = 8
    bits: List[int] = []
    for d in data[idx:]:
        for k in range(5, -1, -1):
            bits.append((d >> k) & 1)
    edges: List[Edge] = []
    b = 0
    for j in range(1, n):
        for i in range(j):
            if bits[b]:
                edges.append((i, j))
            b += 1
    return n, edges


# ---------------------------------------------------------------------------
# Tree canonical form (AHU encoding rooted at the centre(s))
# ---------------------------------------------------------------------------

def tree_centers(n: int, adj: List[List[int]]) -> List[int]:
    if n == 1:
        return [0]
    deg = [len(a) for a in adj]
    leaves = [v for v in range(n) if deg[v] <= 1]
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


def _ahu(adj: List[List[int]], v: int, p: int) -> str:
    subs = sorted(_ahu(adj, w, v) for w in adj[v] if w != p)
    return "(" + "".join(subs) + ")"


def tree_canonical(n: int, edges: Sequence[Edge]) -> str:
    adj = adjacency(n, edges)
    return min(_ahu(adj, c, -1) for c in tree_centers(n, adj))


# ---------------------------------------------------------------------------
# Analysis of a polynomial
# ---------------------------------------------------------------------------

def L_of_alpha(alpha: int) -> int:
    return -((-(2 * alpha - 1)) // 3)  # ceil((2 alpha - 1)/3)


def analyze_poly(p: Poly) -> dict:
    alpha = len(p) - 1
    L = L_of_alpha(alpha)
    pmax = max(p)
    mode = p.index(pmax)                      # first index attaining the max
    modes = [i for i, c in enumerate(p) if c == pmax]
    # first descent: smallest k with p_k > p_{k+1}
    first_descent = next((k for k in range(alpha) if p[k] > p[k + 1]), None)
    # unimodal: non-decreasing then non-increasing
    unimodal = True
    k = 0
    while k < alpha and p[k] <= p[k + 1]:
        k += 1
    while k < alpha and p[k] >= p[k + 1]:
        k += 1
    unimodal = k == alpha

    lc_failures = []
    for k in range(1, alpha):
        lhs = p[k - 1] * p[k + 1]
        rhs = p[k] * p[k]
        if lhs > rhs:
            fr = Fraction(lhs, rhs)
            # ISO_k fails iff  rho_k > (k + b^2)/(k+1)  with b = p_{k-1}/p_k.
            b = Fraction(p[k - 1], p[k])
            rho_star = (k + b * b) / (k + 1)
            Qk = k * p[k] * p[k] + p[k - 1] * p[k - 1] - (k + 1) * p[k - 1] * p[k + 1]
            lc_failures.append({
                "k": k, "ratio": str(fr), "ratio_float": float(fr),
                "b_prev_over_pk": str(b), "b_float": float(b),
                "iso_threshold_ratio": str(rho_star), "iso_threshold_float": float(rho_star),
                "iso_margin_factor": float(rho_star / fr),
                "Qnorm_at_break": str(Fraction(Qk, p[k - 1] * p[k])),
                "Qnorm_at_break_float": float(Fraction(Qk, p[k - 1] * p[k])),
                "descent": p[k - 1] >= p[k],
            })
    worst_lc = None
    if alpha >= 2:
        best = None
        for k in range(1, alpha):
            fr = Fraction(p[k - 1] * p[k + 1], p[k] * p[k])
            if best is None or fr > best[1]:
                best = (k, fr)
        worst_lc = {"k": best[0], "ratio": str(best[1]), "ratio_float": float(best[1])}

    wr_viol = [r for r in range(1, alpha + 1) if p[r - 1] > r * p[r]]
    wr_viol_below_L = [r for r in wr_viol if r < L]

    iso_viol = []
    iso_viol_desc = []
    min_q = None
    for r in range(1, alpha):
        Q = r * p[r] * p[r] + p[r - 1] * p[r - 1] - (r + 1) * p[r - 1] * p[r + 1]
        q_norm = Fraction(Q, p[r - 1] * p[r])
        if min_q is None or q_norm < min_q[1]:
            min_q = (r, q_norm)
        if Q < 0:
            iso_viol.append({"r": r, "Q": str(Q), "Q_norm": str(q_norm),
                             "descent": p[r - 1] >= p[r]})
            if p[r - 1] >= p[r]:
                iso_viol_desc.append(r)
    # descent-conditional normalised minimum (only r with p_{r-1} >= p_r)
    min_q_desc = None
    for r in range(1, alpha):
        if p[r - 1] >= p[r]:
            Q = r * p[r] * p[r] + p[r - 1] * p[r - 1] - (r + 1) * p[r - 1] * p[r + 1]
            q_norm = Fraction(Q, p[r - 1] * p[r])
            if min_q_desc is None or q_norm < min_q_desc[1]:
                min_q_desc = (r, q_norm)

    return {
        "alpha": alpha,
        "L_alpha": L,
        "mode": mode,
        "modes": modes,
        "first_descent": first_descent,
        "unimodal": unimodal,
        "log_concave": not lc_failures,
        "lc_failures": lc_failures,
        "worst_lc": worst_lc,
        "wr_violations": wr_viol,
        "wr_violation_below_L": bool(wr_viol_below_L),
        "wr_violations_below_L": wr_viol_below_L,
        "iso_violations": [d["r"] for d in iso_viol],
        "iso_violations_detail": iso_viol,
        "iso_violations_descent": iso_viol_desc,
        "min_Qnorm": {"r": min_q[0], "value": str(min_q[1]), "value_float": float(min_q[1])} if min_q else None,
        "min_Qnorm_descent": ({"r": min_q_desc[0], "value": str(min_q_desc[1]),
                               "value_float": float(min_q_desc[1])} if min_q_desc else None),
    }


# ---------------------------------------------------------------------------
# Tree builders.  Each returns (n, edges).
# ---------------------------------------------------------------------------

class TreeBuilder:
    def __init__(self) -> None:
        self.n = 0
        self.edges: List[Edge] = []

    def new(self) -> int:
        v = self.n
        self.n += 1
        return v

    def child(self, parent: int) -> int:
        v = self.new()
        self.edges.append((parent, v))
        return v

    def path_from(self, v: int, length: int) -> int:
        """Attach a path of `length` new vertices hanging from v; return its end."""
        for _ in range(length):
            v = self.child(v)
        return v

    def result(self) -> Tuple[int, List[Edge]]:
        return self.n, list(self.edges)


def build_T3(m: int, n: int, star: bool = False) -> Tuple[int, List[Edge]]:
    """T_{3,m,n} (star=False) or T*_{3,m,n} (star=True) of Kadrawi--Levit.

    Root v0 with children v1, v2, v3.  v1 has 3 children v11, v12, v13,
    v2 has m children, v3 has n children, and each grandchild v_ij has a
    single child v'_ij (pendant P2's).  In T*, the edge v13 v'13 is
    replaced by a path v13, v'13, x, y (i.e. two extra vertices).
    """
    b = TreeBuilder()
    v0 = b.new()
    for i, size in enumerate((3, m, n)):
        vi = b.child(v0)
        for j in range(size):
            vij = b.child(vi)
            vpij = b.child(vij)
            if star and i == 0 and j == 2:
                x = b.child(vpij)
                b.child(x)
    return b.result()


def build_galvin(m: int, t: int) -> Tuple[int, List[Edge]]:
    """Galvin's T_{m,t}: root with m children, each carrying t pendant P2's.
    1 + m + 2mt vertices, alpha = m(t+1), LC break expected at m t + 2."""
    b = TreeBuilder()
    r = b.new()
    for _ in range(m):
        w = b.child(r)
        for _ in range(t):
            x = b.child(w)
            b.child(x)
    return b.result()


def build_bautista_ramos(m: int, t: int) -> Tuple[int, List[Edge]]:
    """TG_{m,t}: new root v0 with one extra leaf, joined to the roots of m
    disjoint copies of Galvin's T_{3,t}."""
    b = TreeBuilder()
    v0 = b.new()
    b.child(v0)
    for _ in range(m):
        r = b.child(v0)
        for _ in range(3):
            w = b.child(r)
            for _ in range(t):
                x = b.child(w)
                b.child(x)
    return b.result()


def build_path(n: int) -> Tuple[int, List[Edge]]:
    return n, [(i, i + 1) for i in range(n - 1)]


def build_star(n: int) -> Tuple[int, List[Edge]]:
    return n, [(0, i) for i in range(1, n)]


def build_broom(k: int, L: int) -> Tuple[int, List[Edge]]:
    """Broom B(k, L): a path on L vertices (L-1 edges) with k pendant leaves
    attached to one end vertex.  n = L + k."""
    b = TreeBuilder()
    v = b.new()
    end = b.path_from(v, L - 1)
    for _ in range(k):
        b.child(end)
    return b.result()


def build_double_broom(k1: int, k2: int, L: int) -> Tuple[int, List[Edge]]:
    """Path on L vertices with k1 leaves at one end and k2 at the other."""
    b = TreeBuilder()
    v = b.new()
    end = b.path_from(v, L - 1)
    for _ in range(k1):
        b.child(v)
    for _ in range(k2):
        b.child(end)
    return b.result()


def build_spider(legs: Sequence[int]) -> Tuple[int, List[Edge]]:
    """Spider with legs of the given lengths (number of vertices per leg)."""
    b = TreeBuilder()
    c = b.new()
    for ln in legs:
        b.path_from(c, ln)
    return b.result()


def build_multi_arm_star(arms: Sequence[int], s: int) -> Tuple[int, List[Edge]]:
    """Reynolds' multi-arm star T(a_1..a_k; s): hub with k paths of a_i
    vertices each plus s pendant leaves.  n = 1 + sum(a_i) + s."""
    return build_spider(list(arms) + [1] * s)


def build_caterpillar(leaf_counts: Sequence[int]) -> Tuple[int, List[Edge]]:
    """Spine v_1..v_s; spine vertex i gets leaf_counts[i] pendant leaves."""
    b = TreeBuilder()
    v = b.new()
    spine = [v]
    for _ in range(len(leaf_counts) - 1):
        v = b.child(v)
        spine.append(v)
    for v, c in zip(spine, leaf_counts):
        for _ in range(c):
            b.child(v)
    return b.result()


def build_complete_binary(depth: int) -> Tuple[int, List[Edge]]:
    n = 2 ** (depth + 1) - 1
    return n, [(i, (i - 1) // 2) for i in range(1, n)]


# ---------------------------------------------------------------------------
# Local moves
# ---------------------------------------------------------------------------

def leaf_attachments(n: int, edges: Sequence[Edge]) -> Iterable[Tuple[int, List[Edge]]]:
    for v in range(n):
        yield n + 1, list(edges) + [(v, n)]


def leaf_moves(n: int, edges: Sequence[Edge]) -> Iterable[Tuple[int, List[Edge]]]:
    """Detach a leaf and reattach it to any other vertex (same n)."""
    deg = degree_sequence(n, edges)
    for idx, (u, v) in enumerate(edges):
        for leaf, nb in ((u, v), (v, u)):
            if deg[leaf] != 1:
                continue
            rest = [e for j, e in enumerate(edges) if j != idx]
            for w in range(n):
                if w == leaf or w == nb:
                    continue
                yield n, rest + [(w, leaf)]


# ---------------------------------------------------------------------------
# Convenience: full record for a tree
# ---------------------------------------------------------------------------

def tree_record(name: str, family: str, n: int, edges: Sequence[Edge],
                params: Optional[dict] = None, cross_check: bool = False,
                include_edges: bool = False, include_poly: bool = True) -> dict:
    assert is_forest(n, edges), f"{name}: not a forest"
    p = indep_poly(n, edges)
    rec = {"name": name, "family": family, "n": n, "is_tree": len(edges) == n - 1}
    if params:
        rec["params"] = params
    rec.update(analyze_poly(p))
    if include_poly:
        rec["poly"] = [str(c) for c in p]
    if include_edges:
        rec["edges"] = [list(e) for e in edges]
    if cross_check:
        alt = indep_poly_alt(n, edges)
        rec["alt_dp_agrees"] = (alt == p)
        if n <= 22:
            bf = indep_poly_bruteforce(n, edges)
            rec["bruteforce_agrees"] = (bf == p)
    return rec
