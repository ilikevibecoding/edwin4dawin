#!/usr/bin/env python3
"""
Independent auditor for ``forest_indep.py`` (Erdős Problem #993 exact toolkit).

Everything the core library produces is re-derived here with separately
written code and *different algorithms*, then compared exactly:

* independence polynomials: the vertex recurrence
  I(G) = I(G - v) + x I(G - N[v]) with v a vertex of maximum degree, memoised
  on the bitmask of remaining vertices (the core uses a rooted bottom-up DP);
* independent-set counts by explicit enumeration (increasing-index extension)
  and via networkx (independent sets of G = cliques of the complement,
  ``enumerate_all_cliques``);
* polynomial products by Kronecker substitution (one big-integer multiply),
  cross-checked against ``sympy.Poly``;
* nonisomorphic trees from ``networkx.nonisomorphic_trees``;
* canonical forms: AHU bracket strings rooted at the centre(s) found on a
  double-BFS diameter path (the core peels leaves);
* forests: integer partitions x combinations-with-replacement of tree indices;
* framework quantities recomputed from their definitions with ``Fraction``
  and ``math.ceil``;
* the KLYM tree T1 rebuilt by hand from the paper's description and, in
  addition, its polynomial in closed form (sympy).

Only the objects under test are imported from ``forest_indep``; none of its
polynomial, canonical-form or counting routines are used.

Run:  python3 audit_forest_indep_independent.py
Prints PASS_INDEPENDENT_FOREST_INDEP_CORE on complete success, else FAIL with
the first mismatch in full; writes results/audit_forest_indep_independent.json.
Exceptions raised by the object under test are recorded as failures.
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
import random
import sys
import time
import traceback
from collections import Counter
from fractions import Fraction
from itertools import combinations, combinations_with_replacement, product
from math import ceil, comb
from types import SimpleNamespace

import networkx as nx
import sympy

HERE = os.path.dirname(os.path.abspath(__file__))
CORE_PATH = os.path.join(HERE, "forest_indep.py")
RESULT_PATH = os.path.join(HERE, "results", "audit_forest_indep_independent.json")

sys.dont_write_bytecode = True
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from forest_indep import (  # noqa: E402  -- objects under test only
    KLYM_T1_POLY,
    L_cutoff,
    Q_iso,
    audit_sequence,
    forests,
    klym_3kk_tree,
    level_sequence_to_parent,
    parent_to_edges,
    tree_level_sequences,
    tree_polys_upto,
    wr_slack,
)

# Published reference values, typed here from OEIS (not taken from the core).
A000055 = [1, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741, 19320]
A005195 = [1, 1, 2, 3, 6, 10, 20, 37, 76, 153, 329, 710, 1601]

N_TREES = 16            # trees: polynomials + level sequences compared for n <= 16
N_CANON = 12            # trees: canonical forms compared for n <= 12
N_FORESTS = 12          # forests enumerated independently for n <= 12
NX_FULL_CHECK_UPTO = 12  # networkx clique / enumeration check on every tree n <= 12
NX_SAMPLE_PER_N = 300    # ... and on a seeded sample of this many trees for 13..16
N_RANDOM_SEQ = 3000
L_RANGE = 2000
SEED = 993


# ---------------------------------------------------------------------------
# bookkeeping
# ---------------------------------------------------------------------------


def jsonable(obj):
    if isinstance(obj, Fraction):
        return {"fraction": f"{obj.numerator}/{obj.denominator}"}
    if isinstance(obj, dict):
        return {str(k): jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [jsonable(v) for v in obj]
    if isinstance(obj, (set, frozenset)):
        return sorted(jsonable(v) for v in obj)
    if isinstance(obj, (bool, int, float, str)) or obj is None:
        return obj
    return repr(obj)


class Audit:
    def __init__(self):
        self.comparisons = []
        self.first_mismatch = None
        self.n_failed = 0

    def check(self, name, ok, *, count=None, seconds=None, detail=None, **extra):
        ok = bool(ok)
        entry = {"name": name, "match": ok}
        if count is not None:
            entry["count"] = count
        if seconds is not None:
            entry["seconds"] = round(seconds, 3)
        entry.update(jsonable(extra))
        self.comparisons.append(entry)
        if not ok:
            self.n_failed += 1
            if self.first_mismatch is None:
                self.first_mismatch = {"name": name, "detail": jsonable(detail)}
        tag = "ok  " if ok else "FAIL"
        cnt = "" if count is None else f"  [count={count}]"
        print(f"{tag} {name}{cnt}", flush=True)
        return ok


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        h.update(fh.read())
    return h.hexdigest()


# ---------------------------------------------------------------------------
# independent implementations
# ---------------------------------------------------------------------------


def edges_to_masks(n, edges):
    adj = [0] * n
    for a, b in edges:
        if a == b or not (0 <= a < n and 0 <= b < n):
            raise ValueError(f"bad edge {(a, b)}")
        adj[a] |= 1 << b
        adj[b] |= 1 << a
    return adj


def graph_to_masks(G):
    """Bitmask adjacency of a networkx graph, vertices renumbered in sorted
    label order (so hand-built graphs with string labels get a different
    vertex order from the core's constructions)."""
    nodes = sorted(G.nodes())
    idx = {v: i for i, v in enumerate(nodes)}
    n = len(nodes)
    adj = [0] * n
    for a, b in G.edges():
        adj[idx[a]] |= 1 << idx[b]
        adj[idx[b]] |= 1 << idx[a]
    return n, adj


def masks_to_lists(n, adj):
    return [[w for w in range(n) if adj[v] >> w & 1] for v in range(n)]


def indep_poly_rec(n, adj):
    """Exact independence polynomial by the vertex recurrence
    I(G) = I(G - v) + x * I(G - N[v]), v of maximum degree in the remaining
    induced subgraph (lowest index on ties), memoised on the vertex bitmask.
    Edgeless remainders on k vertices contribute (1 + x)^k.
    Returns (coefficient list p_0..p_alpha, number of memoised states)."""
    memo = {}

    def rec(mask):
        if mask == 0:
            return [1]
        cached = memo.get(mask)
        if cached is not None:
            return cached
        best_v, best_d = -1, -1
        m = mask
        while m:
            low = m & -m
            v = low.bit_length() - 1
            d = (adj[v] & mask).bit_count()
            if d > best_d:
                best_v, best_d = v, d
            m ^= low
        if best_d == 0:
            k = mask.bit_count()
            res = [comb(k, i) for i in range(k + 1)]
        else:
            a = rec(mask & ~(1 << best_v))
            b = rec(mask & ~((1 << best_v) | adj[best_v]))
            res = a + [0] * max(0, len(b) + 1 - len(a))
            for i, c in enumerate(b):
                res[i + 1] += c
        memo[mask] = res
        return res

    return rec((1 << n) - 1), len(memo)


def indep_counts_enum(n, adj):
    """Independent sets counted by explicit enumeration: every independent
    set is generated exactly once by adding vertices in increasing index."""
    counts = [0] * (n + 1)

    def rec(free, size):
        counts[size] += 1
        m = free
        while m:
            low = m & -m
            v = low.bit_length() - 1
            m ^= low
            rec(m & ~adj[v], size + 1)

    rec((1 << n) - 1, 0)
    while len(counts) > 1 and counts[-1] == 0:
        counts.pop()
    return counts


def nx_indep_poly_via_cliques(G):
    """networkx route: independent sets of G are the cliques of complement(G)."""
    c = Counter(len(cl) for cl in nx.enumerate_all_cliques(nx.complement(G)))
    top = max(c) if c else 0
    return [1] + [c[k] for k in range(1, top + 1)]


def kron_mul(a, b):
    """Exact product of two polynomials with nonnegative integer coefficients
    by Kronecker substitution: pack into big integers with slot width w such
    that every product coefficient (<= sum(a) * sum(b)) fits, multiply once."""
    if not a or not b:
        return []
    if min(a) < 0 or min(b) < 0:
        raise ValueError("kron_mul assumes nonnegative coefficients")
    w = (sum(a) * sum(b)).bit_length() + 1
    A = 0
    for i, c in enumerate(a):
        A += c << (i * w)
    B = 0
    for j, c in enumerate(b):
        B += c << (j * w)
    C = A * B
    slot = (1 << w) - 1
    return [(C >> (k * w)) & slot for k in range(len(a) + len(b) - 1)]


def kron_product(polys):
    out = [1]
    for p in polys:
        out = kron_mul(out, p)
    return out


_X = sympy.Symbol("x")


def sympy_product(polys):
    P = sympy.Poly(1, _X, domain="ZZ")
    for p in polys:
        P = P * sympy.Poly(list(reversed(p)), _X, domain="ZZ")
    return [int(c) for c in reversed(P.all_coeffs())]


def sympy_coeffs(expr):
    return [int(c) for c in reversed(sympy.Poly(sympy.expand(expr), _X, domain="ZZ").all_coeffs())]


def valid_level_sequence(seq):
    if not seq or seq[0] != 0:
        return False
    for i in range(1, len(seq)):
        if seq[i] < 1 or seq[i] > seq[i - 1] + 1:
            return False
    return True


def my_parent_from_levels(seq):
    """Parent of i = nearest j < i with seq[j] == seq[i] - 1 (backward scan)."""
    par = [-1] * len(seq)
    for i in range(1, len(seq)):
        j = i - 1
        while seq[j] != seq[i] - 1:
            j -= 1
        par[i] = j
    return par


def levels_from_nx_tree(G):
    """Depth of every vertex from vertex 0 (BFS), listed by vertex label."""
    n = G.number_of_nodes()
    depth = [-1] * n
    depth[0] = 0
    order = [0]
    for u in order:
        for w in G[u]:
            if depth[w] < 0:
                depth[w] = depth[u] + 1
                order.append(w)
    return depth


def tree_canon(n, adj_lists):
    """AHU canonical string of a free tree given by adjacency lists.
    Centre(s) = middle vertex/vertices of a diameter path found by two BFS
    passes; rooted encoding '[' + ','.join(sorted(children)) + ']'; the result
    is the lexicographic minimum over the (one or two) centres."""
    if n == 1:
        return "[]"

    def bfs(src):
        dist = [-1] * n
        par = [-1] * n
        dist[src] = 0
        order = [src]
        for u in order:
            for w in adj_lists[u]:
                if dist[w] < 0:
                    dist[w] = dist[u] + 1
                    par[w] = u
                    order.append(w)
        if len(order) != n:
            raise ValueError("graph is not connected")
        return par, order[-1]

    _, a = bfs(0)
    par, b = bfs(a)
    path = [b]
    while par[path[-1]] >= 0:
        path.append(par[path[-1]])
    d = len(path) - 1
    centres = [path[d // 2]] if d % 2 == 0 else [path[d // 2], path[d // 2 + 1]]

    def enc(v, p):
        return "[" + ",".join(sorted(enc(w, v) for w in adj_lists[v] if w != p)) + "]"

    return min(enc(c, -1) for c in centres)


def relabel_masks(n, adj, perm):
    """Adjacency masks after relabelling vertex v -> perm[v]."""
    new = [0] * n
    for v in range(n):
        m = adj[v]
        while m:
            low = m & -m
            w = low.bit_length() - 1
            m ^= low
            new[perm[v]] |= 1 << perm[w]
    return new


def partitions(n, maxpart=None):
    """Integer partitions of n with parts <= maxpart, non-increasing."""
    if maxpart is None or maxpart > n:
        maxpart = n
    if n == 0:
        yield ()
        return
    for k in range(maxpart, 0, -1):
        for rest in partitions(n - k, k):
            yield (k,) + rest


def my_forests(n, tree_count):
    """Every nonisomorphic forest of order n exactly once, as a tuple of
    (size, tree_index) pairs (sizes non-increasing, indices non-decreasing
    within a size), tree_index referring to networkx.nonisomorphic_trees(size)."""
    for part in partitions(n):
        mult = Counter(part)
        sizes = sorted(mult, reverse=True)
        choices = [list(combinations_with_replacement(range(tree_count[k]), mult[k])) for k in sizes]
        for combo in product(*choices):
            yield tuple((k, j) for k, js in zip(sizes, combo) for j in js)


def union_masks(components, tree_masks):
    """Bitmask adjacency of the disjoint union of the given trees."""
    total = sum(k for k, _ in components)
    adj = [0] * total
    off = 0
    for k, j in components:
        for v, m in enumerate(tree_masks[k][j]):
            adj[off + v] = m << off
        off += k
    return total, adj


# framework quantities, from the definitions -------------------------------


def my_L(alpha):
    return ceil(Fraction(2 * alpha - 1, 3))


def my_unimodal(p):
    m = p.index(max(p))
    return all(p[i] <= p[i + 1] for i in range(m)) and all(p[i] >= p[i + 1] for i in range(m, len(p) - 1))


def my_log_concave(p):
    return all(p[r] * p[r] >= p[r - 1] * p[r + 1] for r in range(1, len(p) - 1))


def my_wr(p, r):
    return r * p[r] - p[r - 1]


def my_Q(p, r):
    return r * p[r] * p[r] + p[r - 1] * p[r - 1] - (r + 1) * p[r - 1] * p[r + 1]


def my_ratio(p, r):
    return Fraction(r * p[r] * p[r] + p[r - 1] * p[r - 1], (r + 1) * p[r - 1] * p[r + 1])


def my_audit(p, with_ratio=False):
    p = list(p)
    alpha = len(p) - 1
    L = my_L(alpha)
    prefix = [r for r in range(1, alpha + 1) if 1 <= r <= L - 1]
    out = {
        "alpha": alpha,
        "L": L,
        "unimodal": my_unimodal(p),
        "log_concave": my_log_concave(p),
        "tail_ok": all(p[r] >= p[r + 1] for r in range(alpha) if r >= L),
        "wr_prefix_min": min([my_wr(p, r) for r in prefix], default=None),
        "iso_prefix_min": min([my_Q(p, r) for r in prefix], default=None),
        "wr_all_min": min([my_wr(p, r) for r in range(1, alpha + 1)], default=None),
        "iso_all_min": min([my_Q(p, r) for r in range(1, alpha)], default=None),
    }
    if with_ratio:
        out["iso_prefix_ratio_min"] = min([my_ratio(p, r) for r in prefix], default=None)
    return out


def dicts_equal_exact(a, b):
    """Same keys, same Python type and equal value for every field."""
    if set(a) != set(b):
        return False
    return all(type(a[k]) is type(b[k]) and a[k] == b[k] for k in a)


def build_T1_by_hand():
    """KLYM T1 from the paper's description, without klym_3kk_tree: centre v0
    joined to v1, v2, v3; v1 carries three pendant K2's, v2 and v3 four each,
    every K2 attached to its hub by one endpoint."""
    G = nx.Graph()
    for hub in ("v1", "v2", "v3"):
        G.add_edge("v0", hub)
    for hub, count in (("v1", 3), ("v2", 4), ("v3", 4)):
        for i in range(1, count + 1):
            a, b = f"{hub}_a{i}", f"{hub}_b{i}"
            G.add_edge(hub, a)
            G.add_edge(a, b)
    return G


def klym_closed_form(left, k):
    """I(T; x) for the (left, k, k) structure: a hub with m pendant K2's has
    f = (1+2x)^m (hub excluded) and g = x(1+x)^m (hub included); the centre
    excluded gives prod(f+g), included gives x prod f."""
    hub = lambda m: (1 + 2 * _X) ** m + _X * (1 + _X) ** m  # noqa: E731
    expr = hub(left) * hub(k) ** 2 + _X * (1 + 2 * _X) ** (left + 2 * k)
    return sympy_coeffs(expr)


def handcrafted_sequences():
    from math import comb as C
    seqs = [[1], [1, 1], [1, 2], [1, 2, 1], [1, 2, 2, 1], [1, 3, 2, 3, 1], [1, 2, 3, 3, 2, 1],
            [1, 5, 5, 1], [2, 1, 2], [1, 1, 1, 1], [3, 3, 2, 2, 3], [1, 3, 3, 1], [1, 4, 6, 4, 1],
            [5, 4, 3, 2, 1], [1, 2, 3, 4, 5], [1, 1, 2, 1, 1], [1, 10, 1, 10, 1], [7], [1, 1, 1],
            [1, 3, 4, 4, 4, 2, 1], [1, 3, 3, 4, 2], list(KLYM_T1_POLY)]
    seqs += [[C(n, r) for r in range(n + 1)] for n in range(1, 30)]
    return seqs


def random_sequences(rng, count):
    seqs = []
    for _ in range(count):
        length = rng.randint(1, 15)
        u = rng.random()
        hi = 6 if u < 0.4 else (1000 if u < 0.7 else 10 ** 9)
        seqs.append([rng.randint(1, hi) for _ in range(length)])
    return seqs


# ---------------------------------------------------------------------------
# audit stages (S = shared state, A = comparison recorder)
# ---------------------------------------------------------------------------


def stage_core_generator(S, A):
    """Core generator: counts, validity of level sequences, parent arrays."""
    S.core_seqs, S.core_par, S.core_edges = {}, {}, {}
    for n in range(1, N_TREES + 1):
        S.core_seqs[n] = [list(s) for s in tree_level_sequences(n)]
        S.core_par[n] = [level_sequence_to_parent(s) for s in S.core_seqs[n]]
        S.core_edges[n] = [parent_to_edges(p) for p in S.core_par[n]]
    S.core_counts = {n: len(S.core_seqs[n]) for n in S.core_seqs}
    total = sum(S.core_counts.values())
    A.check("core_tree_counts_vs_A000055_n1_16",
            all(S.core_counts[n] == A000055[n] for n in S.core_counts),
            count=total, detail={"core": S.core_counts, "oeis": A000055}, per_n=S.core_counts)
    bad = [(n, s) for n in S.core_seqs for s in S.core_seqs[n] if len(s) != n or not valid_level_sequence(s)]
    A.check("core_level_sequences_are_valid_preorder_depth_sequences", not bad,
            count=total, detail={"first_bad": bad[:3]})
    bad = [(n, i) for n in S.core_seqs for i, s in enumerate(S.core_seqs[n])
           if my_parent_from_levels(s) != list(S.core_par[n][i]) or S.core_par[n][i][0] != -1
           or len(S.core_edges[n][i]) != n - 1]
    A.check("level_sequence_to_parent_vs_independent_backward_scan", not bad, count=total,
            detail={"first_bad": [(n, i, S.core_seqs[n][i], list(S.core_par[n][i]),
                                   my_parent_from_levels(S.core_seqs[n][i])) for n, i in bad[:3]]})
    t = time.time()
    S.tp = tree_polys_upto(N_TREES)
    A.check("tree_polys_upto_shape_and_counts", len(S.tp) == N_TREES + 1 and S.tp[0] == []
            and all(len(S.tp[n]) == A000055[n] for n in range(1, N_TREES + 1)),
            count=sum(len(x) for x in S.tp), seconds=time.time() - t,
            detail={"lengths": [len(x) for x in S.tp]})


def stage_networkx_trees(S, A):
    """Stream networkx.nonisomorphic_trees(n): level sequences, edge sets,
    recurrence polynomials (per index and as multisets), canonical forms,
    networkx-clique and enumeration checks on a sample."""
    rng = S.rng
    tp = S.tp
    S.tree_masks, S.my_tree_polys, S.nx_canons, S.nx_counts = {}, {}, {}, {}
    seq_mm, edge_mm, nx_poly_mm, invariant_bad, clique_mm, enum_mm = [], [], [], [], [], []
    states_total = states_max = sample_checked = 0
    sample_idx = {}
    for n in range(1, N_TREES + 1):
        if n <= NX_FULL_CHECK_UPTO:
            sample_idx[n] = None
        else:
            sample_idx[n] = set(rng.sample(range(A000055[n]), min(NX_SAMPLE_PER_N, A000055[n])))
    for n in range(1, N_TREES + 1):
        masks_n, polys_n, canons_n = [], [], []
        cnt = 0
        for i, G in enumerate(nx.nonisomorphic_trees(n)):
            cnt += 1
            if sorted(G.nodes()) != list(range(n)) or not nx.is_tree(G):
                invariant_bad.append((n, i, "networkx graph not a tree on 0..n-1"))
                continue
            nn, adj = graph_to_masks(G)
            masks_n.append(adj)
            P, st = indep_poly_rec(nn, adj)
            states_total += st
            states_max = max(states_max, st)
            polys_n.append(P)
            # invariants of my own polynomial: p0 = 1, p1 = n, p2 = #non-edges, alpha >= n/2
            if not (P[0] == 1 and (n == 1 or P[1] == n) and (n <= 2 or P[2] == comb(n, 2) - (n - 1))
                    and len(P) - 1 >= (n + 1) // 2 and all(c > 0 for c in P)):
                invariant_bad.append((n, i, P))
            if i < len(S.core_seqs[n]):
                lv = levels_from_nx_tree(G)
                if lv != S.core_seqs[n][i]:
                    seq_mm.append((n, i, lv, S.core_seqs[n][i]))
                if {frozenset(e) for e in G.edges()} != {frozenset(e) for e in S.core_edges[n][i]}:
                    edge_mm.append((n, i, sorted(map(sorted, G.edges())), S.core_edges[n][i]))
                if not (list(tp[n][i]) == P and all(type(c) is int for c in tp[n][i])):
                    nx_poly_mm.append((n, i, list(tp[n][i]), P))
            if n <= N_CANON:
                canons_n.append(tree_canon(nn, masks_to_lists(nn, adj)))
            if sample_idx[n] is None or i in sample_idx[n]:
                sample_checked += 1
                Q = nx_indep_poly_via_cliques(G)
                if Q != P:
                    clique_mm.append((n, i, P, Q))
                R = indep_counts_enum(nn, adj)
                if R != P:
                    enum_mm.append((n, i, P, R))
        S.nx_counts[n] = cnt
        S.tree_masks[n] = masks_n
        S.my_tree_polys[n] = polys_n
        if n <= N_CANON:
            S.nx_canons[n] = canons_n
    total = sum(S.nx_counts.values())
    A.check("networkx_tree_counts_vs_A000055_n1_16", all(S.nx_counts[n] == A000055[n] for n in S.nx_counts),
            count=total, detail={"networkx": S.nx_counts, "oeis": A000055}, per_n=S.nx_counts)
    A.check("networkx_graphs_are_trees_and_recurrence_poly_invariants", not invariant_bad,
            count=total, detail={"first_bad": invariant_bad[:3]})
    A.check("level_sequences_core_vs_networkx_bfs_depths_in_order_n1_16", not seq_mm,
            count=total, detail={"first_mismatch": seq_mm[:1]})
    A.check("parent_to_edges_vs_networkx_edge_sets_per_index_n1_16", not edge_mm,
            count=total, detail={"first_mismatch": edge_mm[:1]})
    A.check("tree_polys_upto_vs_recurrence_on_networkx_trees_per_index_n1_16", not nx_poly_mm,
            count=total, detail={"first_mismatch": nx_poly_mm[:1]},
            recurrence_states_total=states_total, recurrence_states_max=states_max)
    A.check("recurrence_vs_networkx_complement_cliques_sample", not clique_mm,
            count=sample_checked, detail={"first_mismatch": clique_mm[:1]},
            sample=f"all trees n<={NX_FULL_CHECK_UPTO} plus {NX_SAMPLE_PER_N} seeded per n in "
                   f"{NX_FULL_CHECK_UPTO + 1}..{N_TREES}")
    A.check("recurrence_vs_explicit_enumeration_sample", not enum_mm,
            count=sample_checked, detail={"first_mismatch": enum_mm[:1]})

    # recurrence on the core's own trees (its edge lists), per index
    t = time.time()
    core_poly_mm = []
    for n in range(1, N_TREES + 1):
        for i, edges in enumerate(S.core_edges[n]):
            P, _ = indep_poly_rec(n, edges_to_masks(n, edges))
            if list(tp[n][i]) != P:
                core_poly_mm.append((n, i, S.core_seqs[n][i], list(tp[n][i]), P))
    A.check("tree_polys_upto_vs_recurrence_on_core_level_sequences_per_index_n1_16", not core_poly_mm,
            count=sum(S.core_counts.values()), seconds=time.time() - t,
            detail={"first_mismatch": core_poly_mm[:1]})

    # multisets of polynomials, core vs networkx-derived, per n
    ms_bad = {}
    for n in range(1, N_TREES + 1):
        a = sorted(tuple(p) for p in tp[n])
        b = sorted(tuple(p) for p in S.my_tree_polys[n])
        if a != b:
            ms_bad[n] = {"only_core": sorted(set(a) - set(b))[:3], "only_networkx": sorted(set(b) - set(a))[:3],
                         "len_core": len(a), "len_networkx": len(b)}
    A.check("tree_poly_multisets_core_vs_networkx_n1_16", not ms_bad, count=total, detail=ms_bad,
            distinct_polys_per_n={n: len(set(tuple(p) for p in tp[n])) for n in range(1, N_TREES + 1)})


def stage_canonical_forms(S, A):
    """Canonical forms (my AHU/diameter-centre form) of the core's trees vs
    networkx's trees, n <= 12; soundness checks of the canonical form."""
    rng = S.rng
    S.core_canons = {}
    idx_bad, ms_bad, cnt_bad = [], {}, {}
    for n in range(1, N_CANON + 1):
        S.core_canons[n] = [tree_canon(n, masks_to_lists(n, edges_to_masks(n, e))) for e in S.core_edges[n]]
        cc, nc = S.core_canons[n], S.nx_canons[n]
        for i, (a, b) in enumerate(zip(cc, nc)):
            if a != b:
                idx_bad.append((n, i, a, b))
        if sorted(cc) != sorted(nc):
            ms_bad[n] = {"only_core": sorted(set(cc) - set(nc))[:3], "only_networkx": sorted(set(nc) - set(cc))[:3]}
        if not (len(set(cc)) == A000055[n] == len(set(nc)) == len(cc) == len(nc)):
            cnt_bad[n] = (len(set(cc)), len(set(nc)), A000055[n])
    n_canon = sum(len(S.core_canons[n]) for n in S.core_canons)
    A.check("canonical_forms_core_vs_networkx_per_index_n1_12", not idx_bad, count=n_canon,
            detail={"first_mismatch": idx_bad[:1]})
    A.check("canonical_form_multisets_core_vs_networkx_n1_12", not ms_bad, count=n_canon, detail=ms_bad)
    A.check("canonical_forms_pairwise_distinct_count_vs_A000055_n1_12", not cnt_bad, count=n_canon, detail=cnt_bad)
    relabel_bad = []
    for n in range(1, N_CANON + 1):
        for i, adj in enumerate(S.tree_masks[n]):
            perm = list(range(n))
            rng.shuffle(perm)
            if tree_canon(n, masks_to_lists(n, relabel_masks(n, adj, perm))) != S.nx_canons[n][i]:
                relabel_bad.append((n, i, perm))
    A.check("canonical_form_invariant_under_random_relabelling_n1_12", not relabel_bad, count=n_canon,
            detail={"first_bad": relabel_bad[:1]})
    pair_bad, pairs = [], 0
    for n in range(1, 9):
        graphs = list(nx.nonisomorphic_trees(n))
        for i, j in combinations(range(len(graphs)), 2):
            pairs += 1
            iso = nx.is_isomorphic(graphs[i], graphs[j])
            same = S.nx_canons[n][i] == S.nx_canons[n][j]
            if iso or same:
                pair_bad.append((n, i, j, iso, same))
    A.check("canonical_form_vs_nx_is_isomorphic_all_pairs_n1_8", not pair_bad, count=pairs, detail=pair_bad[:3])


def stage_forests(S, A):
    """Independent forest enumeration (partitions x combinations with
    replacement of networkx tree indices) vs the core's forests(), n <= 12."""
    tp12 = tree_polys_upto(N_FORESTS)
    S.my_forest_polys, S.all_forest_polys = {}, []
    counts_mine, counts_core = {}, {}
    kron_vs_union, kron_vs_sympy, struct_bad, per_forest_bad = [], [], [], []
    comps_set_bad, poly_ms_bad, canon_ms_bad = {}, {}, {}
    for n in range(1, N_FORESTS + 1):
        mine = {}
        for comps in my_forests(n, A000055):
            polys = [S.my_tree_polys[k][j] for k, j in comps]
            P = kron_product(polys)
            nn, adj = union_masks(comps, S.tree_masks)
            Pu, _ = indep_poly_rec(nn, adj)
            if Pu != P:
                kron_vs_union.append((n, comps, P, Pu))
            if sympy_product(polys) != P:
                kron_vs_sympy.append((n, comps, P))
            mine[comps] = P
            S.all_forest_polys.append((n, comps, P))
        S.my_forest_polys[n] = mine
        counts_mine[n] = len(mine)
        core_list = [(tuple(c), list(P)) for c, P in forests(n, tp12)]
        counts_core[n] = len(core_list)
        seen = set()
        for comps, P in core_list:
            ok = (comps not in seen and sum(k for k, _ in comps) == n
                  and all(0 <= j < A000055[k] for k, j in comps)
                  and all(comps[i][0] > comps[i + 1][0]
                          or (comps[i][0] == comps[i + 1][0] and comps[i][1] <= comps[i + 1][1])
                          for i in range(len(comps) - 1))
                  and all(type(c) is int for c in P))
            seen.add(comps)
            if not ok:
                struct_bad.append((n, comps, P))
            if comps not in mine or P != mine[comps]:
                per_forest_bad.append((n, comps, P, mine.get(comps)))
        core_set = {c for c, _ in core_list}
        if core_set != set(mine):
            comps_set_bad[n] = {"only_core": sorted(core_set - set(mine))[:3],
                                "only_mine": sorted(set(mine) - core_set)[:3]}
        a = sorted(tuple(P) for _, P in core_list)
        b = sorted(tuple(P) for P in mine.values())
        if a != b:
            poly_ms_bad[n] = {"only_core": sorted(set(a) - set(b))[:3], "only_mine": sorted(set(b) - set(a))[:3]}
        ca = sorted(tuple(sorted(S.core_canons[k][j] for k, j in c)) for c, _ in core_list)
        cb = sorted(tuple(sorted(S.nx_canons[k][j] for k, j in c)) for c in mine)
        if ca != cb or len(set(cb)) != len(cb):
            canon_ms_bad[n] = {"only_core": sorted(set(ca) - set(cb))[:3], "only_mine": sorted(set(cb) - set(ca))[:3],
                               "distinct_mine": len(set(cb)), "total_mine": len(cb)}
    n_forests = sum(counts_mine.values())
    n_core = sum(counts_core.values())
    A.check("forest_counts_independent_enumeration_vs_A005195_n1_12",
            all(counts_mine[n] == A005195[n] for n in counts_mine), count=n_forests,
            detail={"mine": counts_mine, "oeis": A005195}, per_n=counts_mine)
    A.check("forest_counts_core_vs_A005195_n1_12", all(counts_core[n] == A005195[n] for n in counts_core),
            count=n_core, detail={"core": counts_core, "oeis": A005195}, per_n=counts_core)
    A.check("forest_poly_kronecker_product_vs_recurrence_on_union_graph", not kron_vs_union, count=n_forests,
            detail=kron_vs_union[:1])
    A.check("forest_poly_kronecker_product_vs_sympy_product", not kron_vs_sympy, count=n_forests,
            detail=kron_vs_sympy[:1])
    A.check("core_forest_components_valid_distinct_int_coefficients", not struct_bad, count=n_core,
            detail=struct_bad[:1])
    A.check("forest_component_tuples_core_vs_independent_as_sets_n1_12", not comps_set_bad, count=n_forests,
            detail=comps_set_bad)
    A.check("forest_polys_core_vs_independent_per_forest_n1_12", not per_forest_bad, count=n_core,
            detail=per_forest_bad[:1])
    A.check("forest_poly_multisets_core_vs_independent_n1_12", not poly_ms_bad, count=n_forests, detail=poly_ms_bad,
            distinct_forest_polys_per_n={n: len(set(tuple(P) for P in S.my_forest_polys[n].values()))
                                         for n in S.my_forest_polys})
    A.check("forest_canonical_form_multisets_core_vs_independent_n1_12", not canon_ms_bad, count=n_forests,
            detail=canon_ms_bad)


def stage_framework(S, A):
    """L, WR_r, ISO_r, unimodality, log-concavity, tail, prefix minima and the
    exact minimal ISO prefix ratio, recomputed and compared field by field."""
    rng = S.rng
    L_bad = [(a, L_cutoff(a), my_L(a)) for a in range(0, L_RANGE + 1)
             if L_cutoff(a) != my_L(a) or type(L_cutoff(a)) is not int]
    A.check("L_cutoff_vs_ceil_fraction_alpha_0_2000", not L_bad, count=L_RANGE + 1, detail=L_bad[:3])
    helper_bad, helper_cnt, audit_bad, key_bad = [], 0, [], []
    forest_audits = []
    for n, comps, P in S.all_forest_polys:
        alpha = len(P) - 1
        for r in range(1, alpha + 1):
            helper_cnt += 1
            if wr_slack(P, r) != my_wr(P, r):
                helper_bad.append(("wr_slack", n, comps, P, r, wr_slack(P, r), my_wr(P, r)))
            if r <= alpha - 1 and Q_iso(P, r) != my_Q(P, r):
                helper_bad.append(("Q_iso", n, comps, P, r, Q_iso(P, r), my_Q(P, r)))
        core_a = audit_sequence(P, with_ratio=True)
        mine_a = my_audit(P, with_ratio=True)
        forest_audits.append((n, comps, P, mine_a))
        if not dicts_equal_exact(core_a, mine_a):
            audit_bad.append((n, comps, P, core_a, mine_a))
        core_b = audit_sequence(P)
        if set(core_b) != set(mine_a) - {"iso_prefix_ratio_min"} or not dicts_equal_exact(core_b, my_audit(P)):
            key_bad.append((n, comps, P, core_b, my_audit(P)))
    n_f = len(S.all_forest_polys)
    A.check("wr_slack_and_Q_iso_vs_independent_on_all_forests_n1_12", not helper_bad, count=helper_cnt,
            detail=helper_bad[:1])
    A.check("audit_sequence_with_ratio_all_fields_exact_on_all_forests_n1_12", not audit_bad, count=n_f,
            detail=audit_bad[:1])
    A.check("audit_sequence_without_ratio_keys_and_fields_on_all_forests_n1_12", not key_bad, count=n_f,
            detail=key_bad[:1])
    # random + handcrafted sequences exercise the non-unimodal / non-log-concave branches
    seqs = handcrafted_sequences() + random_sequences(rng, N_RANDOM_SEQ)
    rnd_bad, rnd_helper_bad = [], []
    n_uni_false = n_lc_false = n_tail_false = 0
    for p in seqs:
        core_a = audit_sequence(p, with_ratio=True)
        mine_a = my_audit(p, with_ratio=True)
        if not dicts_equal_exact(core_a, mine_a) or not dicts_equal_exact(audit_sequence(p), my_audit(p)):
            rnd_bad.append((p, core_a, mine_a))
        n_uni_false += not mine_a["unimodal"]
        n_lc_false += not mine_a["log_concave"]
        n_tail_false += not mine_a["tail_ok"]
        alpha = len(p) - 1
        for r in range(1, alpha + 1):
            if wr_slack(p, r) != my_wr(p, r) or (r < alpha and Q_iso(p, r) != my_Q(p, r)):
                rnd_helper_bad.append((p, r))
    A.check("audit_sequence_all_fields_exact_on_random_and_handcrafted_sequences", not rnd_bad, count=len(seqs),
            detail=rnd_bad[:1], sequences_not_unimodal=n_uni_false, sequences_not_log_concave=n_lc_false,
            sequences_tail_fails=n_tail_false)
    A.check("wr_slack_and_Q_iso_vs_independent_on_random_sequences", not rnd_helper_bad, count=len(seqs),
            detail=rnd_helper_bad[:1])
    # informational facts about forests n <= 12 (independent computation)
    ratios = [(a["iso_prefix_ratio_min"], n, comps) for n, comps, P, a in forest_audits
              if a["iso_prefix_ratio_min"] is not None]
    mr = min(ratios) if ratios else None
    S.notes.append({
        "forests_n1_12_all_unimodal": all(a["unimodal"] for *_, a in forest_audits),
        "forests_n1_12_all_log_concave": all(a["log_concave"] for *_, a in forest_audits),
        "forests_n1_12_all_tail_ok": all(a["tail_ok"] for *_, a in forest_audits),
        "forests_n1_12_min_wr_prefix": min((a["wr_prefix_min"] for *_, a in forest_audits
                                            if a["wr_prefix_min"] is not None), default=None),
        "forests_n1_12_min_iso_prefix_Q": min((a["iso_prefix_min"] for *_, a in forest_audits
                                               if a["iso_prefix_min"] is not None), default=None),
        "forests_n1_12_min_iso_prefix_ratio": jsonable(mr[0]) if mr else None,
        "forests_n1_12_min_iso_prefix_ratio_float": float(mr[0]) if mr else None,
        "forests_n1_12_min_iso_prefix_ratio_attained_at_(n,components)": jsonable(mr[1:]) if mr else None,
        "forests_n1_12_with_nonempty_prefix": len(ratios)})


def stage_klym(S, A):
    """KLYM T1: structure, polynomial by recurrence / enumeration / networkx
    cliques / hand-built graph / sympy closed form vs KLYM_T1_POLY."""
    pub = list(KLYM_T1_POLY)
    n1, e1 = klym_3kk_tree(4)
    G1 = nx.Graph(e1)
    adj1 = edges_to_masks(n1, e1)
    deg1 = Counter(sorted(d for _, d in G1.degree()))
    A.check("klym_3kk_tree_4_structure_26_vertices_tree_degree_multiset",
            n1 == 26 and G1.number_of_nodes() == 26 and G1.number_of_edges() == 25 and nx.is_tree(G1)
            and deg1 == Counter({1: 11, 2: 11, 3: 1, 4: 1, 5: 2}),
            detail={"n": n1, "edges": len(e1), "degrees": dict(deg1)})
    P1, st1 = indep_poly_rec(n1, adj1)
    A.check("klym_T1_recurrence_vs_published_KLYM_T1_POLY", P1 == pub,
            detail={"recurrence": P1, "published": pub}, recurrence_states=st1)
    H = build_T1_by_hand()
    nh, adjh = graph_to_masks(H)
    Ph, sth = indep_poly_rec(nh, adjh)
    A.check("klym_T1_handbuilt_from_paper_description_recurrence_vs_published",
            nh == 26 and H.number_of_edges() == 25 and nx.is_tree(H) and Ph == pub,
            detail={"n": nh, "edges": H.number_of_edges(), "poly": Ph, "published": pub}, recurrence_states=sth)
    canon_h = tree_canon(nh, masks_to_lists(nh, adjh))
    canon_1 = tree_canon(n1, masks_to_lists(n1, adj1))
    A.check("klym_T1_handbuilt_isomorphic_to_klym_3kk_tree_4_vf2_and_canonical_form",
            nx.is_isomorphic(H, G1) and canon_h == canon_1,
            detail={"canon_hand": canon_h, "canon_core": canon_1})
    E1 = indep_counts_enum(n1, adj1)
    A.check("klym_T1_explicit_enumeration_vs_published", E1 == pub, count=sum(E1),
            detail={"enumeration": E1, "published": pub})
    C1 = nx_indep_poly_via_cliques(G1)
    A.check("klym_T1_networkx_complement_cliques_vs_published", C1 == pub, count=sum(C1),
            detail={"cliques": C1, "published": pub})
    S1 = klym_closed_form(3, 4)
    A.check("klym_T1_sympy_closed_form_vs_published", S1 == pub, detail={"closed_form": S1, "published": pub})
    fam_bad, fam_cnt = [], 0
    for left in (1, 2, 3):
        for k in (1, 2, 3, 4):
            nn, ee = klym_3kk_tree(k, left=left)
            Gk = nx.Graph(ee)
            Pk, _ = indep_poly_rec(nn, edges_to_masks(nn, ee))
            fam_cnt += 1
            if not (nn == 4 + 2 * (left + 2 * k) and Gk.number_of_edges() == nn - 1 and nx.is_tree(Gk)
                    and Pk == klym_closed_form(left, k)):
                fam_bad.append((left, k, nn, Pk, klym_closed_form(left, k)))
    A.check("klym_3kk_tree_family_recurrence_vs_sympy_closed_form_left1_3_k1_4", not fam_bad, count=fam_cnt,
            detail=fam_bad[:1])
    a1 = my_audit(pub, with_ratio=True)
    core_a1 = audit_sequence(pub, with_ratio=True)
    A.check("klym_T1_unimodal_not_log_concave_and_audit_sequence_fields_exact",
            a1["unimodal"] and not a1["log_concave"] and a1["alpha"] == 14 and a1["L"] == 9
            and dicts_equal_exact(core_a1, a1),
            detail={"mine": a1, "core": core_a1})
    S.notes.append({"klym_T1_audit": jsonable(a1),
                    "klym_T1_log_concavity_violations_r": [r for r in range(1, 14)
                                                           if pub[r] ** 2 < pub[r - 1] * pub[r + 1]]})


STAGES = [
    ("1_core_generator_and_tree_polys", stage_core_generator),
    ("2_networkx_trees_polynomials", stage_networkx_trees),
    ("3_canonical_forms", stage_canonical_forms),
    ("4_forests", stage_forests),
    ("5_framework_quantities", stage_framework),
    ("6_klym_T1", stage_klym),
]


def main():
    T0 = time.time()
    A = Audit()
    S = SimpleNamespace(rng=random.Random(SEED), notes=[])
    hashes = {"forest_indep.py": sha256_file(CORE_PATH),
              "audit_forest_indep_independent.py": sha256_file(os.path.abspath(__file__))}
    env = {"python": platform.python_version(), "networkx": nx.__version__,
           "sympy": sympy.__version__, "platform": platform.platform()}
    stage_seconds = {}
    for name, fn in STAGES:
        t = time.time()
        try:
            fn(S, A)
        except Exception as exc:  # a crash inside the object under test is a failure, not a pass
            A.check(f"{name}_raised_exception", False,
                    detail={"exception": repr(exc), "traceback": traceback.format_exc()})
        stage_seconds[name] = round(time.time() - t, 3)
        print(f"     stage {name}: {stage_seconds[name]} s", flush=True)

    total = time.time() - T0
    verdict = "PASS_INDEPENDENT_FOREST_INDEP_CORE" if A.n_failed == 0 else "FAIL"
    result = {
        "auditor": os.path.basename(__file__),
        "object_under_audit": "forest_indep.py",
        "sha256": hashes,
        "environment": env,
        "parameters": {"N_TREES": N_TREES, "N_CANON": N_CANON, "N_FORESTS": N_FORESTS,
                       "NX_FULL_CHECK_UPTO": NX_FULL_CHECK_UPTO, "NX_SAMPLE_PER_N": NX_SAMPLE_PER_N,
                       "N_RANDOM_SEQ": N_RANDOM_SEQ, "L_RANGE": L_RANGE, "SEED": SEED},
        "reference_values": {"A000055_n0_16": A000055, "A005195_n0_12": A005195},
        "methods": ["vertex recurrence I(G)=I(G-v)+xI(G-N[v]), max-degree v, bitmask memo",
                    "explicit independent-set enumeration (increasing-index extension)",
                    "networkx enumerate_all_cliques on the complement graph",
                    "Kronecker-substitution polynomial products, cross-checked with sympy.Poly",
                    "networkx.nonisomorphic_trees as the independent tree generator",
                    "AHU canonical strings rooted at double-BFS diameter centres",
                    "forests = integer partitions x combinations_with_replacement of tree indices",
                    "framework quantities from definitions with Fraction/ceil",
                    "KLYM T1 hand-built from the paper's description + sympy closed form"],
        "comparisons": A.comparisons,
        "notes": jsonable(S.notes),
        "stage_seconds": stage_seconds,
        "summary": {"n_comparisons": len(A.comparisons), "n_failed": A.n_failed,
                    "all_pass": A.n_failed == 0, "total_seconds": round(total, 3)},
        "first_mismatch": A.first_mismatch,
        "verdict": verdict,
    }
    os.makedirs(os.path.dirname(RESULT_PATH), exist_ok=True)
    with open(RESULT_PATH, "w") as fh:
        json.dump(result, fh, indent=1)
        fh.write("\n")
    print(f"comparisons: {len(A.comparisons)}, failed: {A.n_failed}, total seconds: {total:.1f}")
    print(f"results written to {RESULT_PATH}")
    if A.n_failed:
        print("FAIL first mismatch:")
        print(json.dumps(A.first_mismatch, indent=1))
        print("FAIL")
        return 1
    print("PASS_INDEPENDENT_FOREST_INDEP_CORE")
    return 0


if __name__ == "__main__":
    sys.exit(main())
