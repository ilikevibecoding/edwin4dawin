#!/usr/bin/env python3
"""
check_known_hard_trees.py -- independent, pure-Python (exact integer) test of
the WR/ISO "target theorem" of the Erdős #993 proof framework on the trees
that are known to be hard for log-concavity, plus classical families.

Everything here is self-contained: an independence-polynomial DP for forests,
the inequality checks, and explicit constructors for every family.  Nothing
from /workspace/erdos993_goal is imported; the only file read from there is
the PatternBoost polynomial corpus (data only), whose Prüfer codes are decoded
and whose polynomials are RECOMPUTED here and compared with the stored ones.

Definitions (p_r = number of independent sets of size r, alpha = deg I):
    L(alpha) = ceil((2 alpha - 1)/3)
    WR_r  : p_{r-1} <= r p_r                                  target: 1 <= r < L
    ISO_r : Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0
                                                               target: 2 <= r < L
    descent-conditional ISO: ISO_r only at target r with p_{r-1} > p_r
    normalized slack of a cell: Q_r / (p_{r-1} p_{r+1})  (exact Fraction)

Families (all constructed explicitly below; see the constructors' docstrings):
  * T_{3,m,n} and T*_{3,m,n} (Kadrawi–Levit–Yosef–Mizrachi; arXiv:2603.03025):
      root v0 with children v1, v2, v3; v1 has 3 children, v2 has m children,
      v3 has n children; every grandchild v_ij carries one pendant child v'_ij.
      |T_{3,m,n}| = 10 + 2m + 2n.  T*_{3,m,n}: the edge v13 v'13 is replaced by
      the path v13 - v'13 - x - y (two extra vertices), |T*| = 12 + 2m + 2n.
      T_{3,4,4} and T*_{3,3,4} are the two non-log-concave trees on 26 vertices.
  * Galvin's T_{m,t} (arXiv:2502.10654, as described in arXiv:2510.18826):
      root with m children, each child the torso of a spider with t legs of
      length 2;  1 + m + 2mt vertices, alpha = m(t+1), LC breaks at mt+2.
  * brooms B(k, L): hub with k pendant leaves and a handle path of L further
      vertices attached to the hub;  n = 1 + k + L.
  * double brooms DB(a, b, L): path on L >= 2 vertices, a pendant leaves at one
      end, b at the other;  n = a + b + L.
  * spiders S(l_1, ..., l_k), k <= 6 legs of lengths l_i >= 1.
  * multi-arm stars MS(k, j): root with k children, each having j pendant
      leaves (spiders with legs of length 1 hung on a root; = Galvin T_{k,t}
      with legs of length 1) and uniform spiders US(k, l) (k legs of length l).
  * paths P_n (p_r = C(n-r+1, r), used as a sanity check).
  * the PatternBoost n=60 corpus (Prüfer codes + stored polynomials).

Output: reports/hard_trees_iso_report_20260902.json
"""
from __future__ import annotations

import json
import os
import random
import sys
import time
from fractions import Fraction
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REPORT = os.path.join(ROOT, "reports", "hard_trees_iso_report_20260902.json")
CORPUS = os.path.join(ROOT, "erdos993_goal", "patternboost60_polynomial_corpus_20260726.json")
SCAN26 = os.path.join(ROOT, "reports", "tree_scan_n26_20260902.json")

Edge = Tuple[int, int]


# --------------------------------------------------------------------------
# exact independence polynomial of a forest
# --------------------------------------------------------------------------
def poly_mul(a: Sequence[int], b: Sequence[int]) -> List[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        if x:
            for j, y in enumerate(b):
                out[i + j] += x * y
    return out


def poly_add(a: Sequence[int], b: Sequence[int]) -> List[int]:
    n = max(len(a), len(b))
    return [(a[i] if i < len(a) else 0) + (b[i] if i < len(b) else 0) for i in range(n)]


def indpoly_forest(n: int, edges: Iterable[Edge]) -> List[int]:
    """Coefficients p_0..p_alpha of I(F;x) for the forest on vertices 0..n-1.

    Standard rooted DP: for every vertex v, EX[v] = polynomial of the subtree
    with v excluded, IN[v] = with v included (so IN[v] has a factor x).
    Components are multiplied together.  Raises ValueError if the edge set is
    not acyclic (i.e. the input is not a forest).
    """
    adj = [[] for _ in range(n)]
    m = 0
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
        m += 1
    seen = [False] * n
    total = [1]
    comps = 0
    for root in range(n):
        if seen[root]:
            continue
        comps += 1
        # iterative DFS order
        order = []
        parent = {root: -1}
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
                elif w != parent[v]:
                    raise ValueError("edge set contains a cycle")
        EX = {v: [1] for v in order}
        IN = {v: [0, 1] for v in order}
        for v in reversed(order):
            p = parent[v]
            if p >= 0:
                EX[p] = poly_mul(EX[p], poly_add(EX[v], IN[v]))
                IN[p] = poly_mul(IN[p], EX[v])
        total = poly_mul(total, poly_add(EX[root], IN[root]))
    if n - comps != m:
        raise ValueError("not a forest")
    while len(total) > 1 and total[-1] == 0:
        total.pop()
    return total


def indpoly_from_parents(par: Sequence[int]) -> List[int]:
    """gentreeg parent array (1-indexed values, par[0]==0 is the root)."""
    n = len(par)
    return indpoly_forest(n, [(i, par[i] - 1) for i in range(1, n)])


def prufer_to_edges(code: Sequence[int], one_based: bool = True) -> Tuple[int, List[Edge]]:
    n = len(code) + 2
    code0 = [c - 1 for c in code] if one_based else list(code)
    degree = [1] * n
    for c in code0:
        degree[c] += 1
    edges: List[Edge] = []
    import heapq
    leaves = [v for v in range(n) if degree[v] == 1]
    heapq.heapify(leaves)
    for c in code0:
        leaf = heapq.heappop(leaves)
        edges.append((leaf, c))
        degree[c] -= 1
        if degree[c] == 1:
            heapq.heappush(leaves, c)
    u = heapq.heappop(leaves)
    v = heapq.heappop(leaves)
    edges.append((u, v))
    return n, edges


# --------------------------------------------------------------------------
# the inequalities
# --------------------------------------------------------------------------
def L_of(alpha: int) -> int:
    return -((-(2 * alpha - 1)) // 3)  # ceil((2 alpha - 1)/3)


def analyze(p: Sequence[int]) -> Dict:
    alpha = len(p) - 1
    L = L_of(alpha)
    res: Dict = {"alpha": alpha, "L": L}
    mode = max(range(len(p)), key=lambda i: (p[i], -i))
    res["mode"] = mode
    rising, uni = True, True
    for i in range(1, len(p)):
        if rising:
            if p[i] < p[i - 1]:
                rising = False
        elif p[i] > p[i - 1]:
            uni = False
            break
    res["unimodal"] = uni
    res["lc_breaks"] = [k for k in range(1, alpha) if p[k - 1] * p[k + 1] > p[k] * p[k]]
    res["wr_fail_target"] = [r for r in range(1, min(L, alpha + 1)) if p[r - 1] > r * p[r]]
    res["wr_fail_all"] = [r for r in range(1, alpha + 1) if p[r - 1] > r * p[r]]
    iso_t, iso_o, iso_d = [], [], []
    best = None       # (Fraction, r, Q)
    best_desc = None
    best_open = None
    for r in range(1, alpha):
        Q = r * p[r] * p[r] + p[r - 1] * p[r - 1] - (r + 1) * p[r - 1] * p[r + 1]
        D = p[r - 1] * p[r + 1]
        target = 2 <= r < L
        descent = p[r - 1] > p[r]
        if target:
            if Q < 0:
                iso_t.append((r, Q))
                if descent:
                    iso_d.append((r, Q))
            if D > 0:
                fr = Fraction(Q, D)
                if best is None or fr < best[0]:
                    best = (fr, r, Q)
                if descent and (best_desc is None or fr < best_desc[0]):
                    best_desc = (fr, r, Q)
                if r >= 9 and (best_open is None or fr < best_open[0]):
                    best_open = (fr, r, Q)
        elif Q < 0:
            iso_o.append((r, Q))
    res["iso_fail_target"] = iso_t
    res["iso_fail_desc_target"] = iso_d
    res["iso_fail_outside"] = iso_o
    res["target_descents"] = [r for r in range(1, min(L, alpha + 1)) if p[r - 1] > p[r]]
    res["min_slack_target"] = best
    res["min_slack_target_descent"] = best_desc
    res["min_slack_target_r_ge_9"] = best_open
    return res


# --------------------------------------------------------------------------
# aggregation over a family
# --------------------------------------------------------------------------
class FamilyStats:
    def __init__(self, name: str):
        self.name = name
        self.count = 0
        self.nonunimodal = 0
        self.lc_fail_trees = 0
        self.lc_fail_cells = 0
        self.lc_by_k_minus_alpha: Dict[int, int] = {}
        self.iso_fail_target_trees = 0
        self.iso_fail_target_cells = 0
        self.iso_fail_desc_target_cells = 0
        self.iso_fail_outside_cells = 0
        self.wr_fail_target_trees = 0
        self.wr_fail_target_cells = 0
        self.wr_fail_all_trees = 0
        self.trees_with_target_descent = 0
        self.max_n = 0
        self.max_alpha = 0
        self.tightest: Optional[Dict] = None
        self.tightest_desc: Optional[Dict] = None
        self.tightest_open: Optional[Dict] = None
        self.violators: List[Dict] = []
        self.lc_examples: List[Dict] = []
        self.notes: List[str] = []

    def add(self, label: str, n: int, edges, p: Sequence[int], a: Optional[Dict] = None):
        """`edges` may be an edge list, None, or a zero-argument callable producing the edge list
        (evaluated only when the tree has to be recorded as a violator / tightest cell)."""
        if a is None:
            a = analyze(p)
        if callable(edges):
            needed = (a["iso_fail_target"] or a["wr_fail_target"] or not a["unimodal"]
                      or any(a[k] is not None and (getattr(self, attr) is None or a[k][0] < getattr(self, attr)["_frac"])
                             for k, attr in (("min_slack_target", "tightest"), ("min_slack_target_descent", "tightest_desc"),
                                             ("min_slack_target_r_ge_9", "tightest_open"))))
            edges = edges() if needed else None
        self.count += 1
        self.max_n = max(self.max_n, n)
        self.max_alpha = max(self.max_alpha, a["alpha"])
        if not a["unimodal"]:
            self.nonunimodal += 1
        if a["lc_breaks"]:
            self.lc_fail_trees += 1
            self.lc_fail_cells += len(a["lc_breaks"])
            for k in a["lc_breaks"]:
                d = k - a["alpha"]
                self.lc_by_k_minus_alpha[d] = self.lc_by_k_minus_alpha.get(d, 0) + 1
            if len(self.lc_examples) < 12:
                self.lc_examples.append({"label": label, "n": n, "alpha": a["alpha"], "L": a["L"],
                                         "lc_breaks_k": a["lc_breaks"], "poly": [str(c) for c in p]})
        if a["iso_fail_target"]:
            self.iso_fail_target_trees += 1
            self.iso_fail_target_cells += len(a["iso_fail_target"])
        self.iso_fail_desc_target_cells += len(a["iso_fail_desc_target"])
        self.iso_fail_outside_cells += len(a["iso_fail_outside"])
        if a["wr_fail_target"]:
            self.wr_fail_target_trees += 1
            self.wr_fail_target_cells += len(a["wr_fail_target"])
        if a["wr_fail_all"]:
            self.wr_fail_all_trees += 1
        if a["target_descents"]:
            self.trees_with_target_descent += 1
        if a["iso_fail_target"] or a["wr_fail_target"] or not a["unimodal"]:
            self.violators.append({"label": label, "n": n, "edges": list(map(list, edges)) if edges is not None else None,
                                   "poly": [str(c) for c in p], "alpha": a["alpha"], "L": a["L"],
                                   "iso_fail_target": [[r, str(Q)] for r, Q in a["iso_fail_target"]],
                                   "wr_fail_target": a["wr_fail_target"], "unimodal": a["unimodal"]})
        for key, attr in (("min_slack_target", "tightest"), ("min_slack_target_descent", "tightest_desc"),
                          ("min_slack_target_r_ge_9", "tightest_open")):
            cell = a[key]
            if cell is None:
                continue
            fr, r, Q = cell
            cur = getattr(self, attr)
            if cur is None or fr < cur["_frac"]:
                setattr(self, attr, {"_frac": fr, "label": label, "n": n, "alpha": a["alpha"], "L": a["L"], "r": r,
                                     "Q_r": str(Q), "p_prev_times_p_next": str(fr.denominator if False else p[r - 1] * p[r + 1]),
                                     "slack_num": str(fr.numerator), "slack_den": str(fr.denominator),
                                     "slack": float(fr), "descent": p[r - 1] > p[r],
                                     "edges": list(map(list, edges)) if edges is not None and n <= 130 else None,
                                     "poly": [str(c) for c in p]})

    def to_json(self) -> Dict:
        def clean(c):
            if c is None:
                return None
            c = dict(c)
            c.pop("_frac", None)
            return c
        return {
            "family": self.name, "count": self.count, "max_n": self.max_n, "max_alpha": self.max_alpha,
            "nonunimodal": self.nonunimodal,
            "lc_fail_trees": self.lc_fail_trees, "lc_fail_cells": self.lc_fail_cells,
            "lc_break_k_minus_alpha_hist": dict(sorted(self.lc_by_k_minus_alpha.items())),
            "iso_fail_target_trees": self.iso_fail_target_trees, "iso_fail_target_cells": self.iso_fail_target_cells,
            "iso_fail_desc_target_cells": self.iso_fail_desc_target_cells,
            "iso_fail_outside_target_cells": self.iso_fail_outside_cells,
            "wr_fail_target_trees": self.wr_fail_target_trees, "wr_fail_target_cells": self.wr_fail_target_cells,
            "wr_fail_any_r_trees": self.wr_fail_all_trees,
            "trees_with_descent_before_L": self.trees_with_target_descent,
            "tightest_iso_cell_target": clean(self.tightest),
            "tightest_iso_cell_target_descent": clean(self.tightest_desc),
            "tightest_iso_cell_target_r_ge_9": clean(self.tightest_open),
            "violators": self.violators, "lc_examples": self.lc_examples, "notes": self.notes,
        }


# --------------------------------------------------------------------------
# constructors (all return (n, edges) with vertices 0..n-1)
# --------------------------------------------------------------------------
class Builder:
    def __init__(self):
        self.n = 0
        self.edges: List[Edge] = []

    def new(self, parent: Optional[int] = None) -> int:
        v = self.n
        self.n += 1
        if parent is not None:
            self.edges.append((parent, v))
        return v

    def path(self, start: int, length: int) -> int:
        """append a path of `length` new vertices hanging from start; return its end"""
        cur = start
        for _ in range(length):
            cur = self.new(cur)
        return cur

    def out(self) -> Tuple[int, List[Edge]]:
        return self.n, list(self.edges)


def T3mn(m: int, n: int, star: bool = False) -> Tuple[int, List[Edge]]:
    """T_{3,m,n} (star=False) or T*_{3,m,n} (star=True); see module docstring."""
    b = Builder()
    v0 = b.new()
    for idx, k in enumerate((3, m, n)):
        vi = b.new(v0)
        for j in range(k):
            vij = b.new(vi)
            vpij = b.new(vij)
            if star and idx == 0 and j == 2:
                # replace edge v13 v'13 by the path v13 - v'13 - x - y
                x = b.new(vpij)
                b.new(x)
    return b.out()


def galvin_Tmt(m: int, t: int) -> Tuple[int, List[Edge]]:
    b = Builder()
    root = b.new()
    for _ in range(m):
        c = b.new(root)
        for _ in range(t):
            leg = b.new(c)
            b.new(leg)
    return b.out()


def broom(k: int, L: int) -> Tuple[int, List[Edge]]:
    """hub + k leaves + handle of L vertices (n = 1 + k + L)"""
    b = Builder()
    hub = b.new()
    for _ in range(k):
        b.new(hub)
    b.path(hub, L)
    return b.out()


def double_broom(a: int, bb: int, L: int) -> Tuple[int, List[Edge]]:
    """path on L >= 2 vertices; a leaves at the first vertex, bb at the last (n = a + bb + L)"""
    b = Builder()
    first = b.new()
    last = b.path(first, L - 1)
    for _ in range(a):
        b.new(first)
    for _ in range(bb):
        b.new(last)
    return b.out()


def spider(legs: Sequence[int]) -> Tuple[int, List[Edge]]:
    b = Builder()
    c = b.new()
    for l in legs:
        b.path(c, l)
    return b.out()


def multi_arm_star(k: int, j: int) -> Tuple[int, List[Edge]]:
    """root with k children each carrying j pendant leaves (n = 1 + k + kj)"""
    b = Builder()
    root = b.new()
    for _ in range(k):
        c = b.new(root)
        for _ in range(j):
            b.new(c)
    return b.out()


def path_graph(n: int) -> Tuple[int, List[Edge]]:
    return n, [(i, i + 1) for i in range(n - 1)]


def partitions_max_parts(total: int, parts: int, maxpart: Optional[int] = None):
    """partitions of `total` into at most `parts` positive parts, nonincreasing"""
    if maxpart is None:
        maxpart = total
    if total == 0:
        yield ()
        return
    if parts == 0:
        return
    for first in range(min(total, maxpart), 0, -1):
        for rest in partitions_max_parts(total - first, parts - 1, first):
            yield (first,) + rest


# --------------------------------------------------------------------------
# canonical form (AHU) for isomorphism checks of small trees
# --------------------------------------------------------------------------
def tree_canonical(n: int, edges: Sequence[Edge]) -> str:
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    # centers
    deg = [len(a) for a in adj]
    leaves = [v for v in range(n) if deg[v] <= 1]
    removed = len(leaves)
    layer = leaves
    while removed < n:
        nxt = []
        for v in layer:
            for w in adj[v]:
                deg[w] -= 1
                if deg[w] == 1:
                    nxt.append(w)
        removed += len(nxt)
        layer = nxt

    def enc(v, p):
        return "(" + "".join(sorted(enc(w, v) for w in adj[v] if w != p)) + ")"
    sys.setrecursionlimit(max(10000, 4 * n))
    return min(enc(c, -1) for c in layer)


# --------------------------------------------------------------------------
# PatternBoost corpus streaming
# --------------------------------------------------------------------------
def stream_records(path: str):
    """yield the objects of the top-level "records" array without json.load-ing the file"""
    dec = json.JSONDecoder()
    with open(path, "r") as fh:
        text = fh.read()          # 79 MB of text; the parsed objects are never all alive at once
    i = text.index('"records"')
    i = text.index("[", i) + 1
    while True:
        while text[i] in " \t\r\n,":
            i += 1
        if text[i] == "]":
            break
        obj, j = dec.raw_decode(text, i)
        yield obj
        i = j


def corpus_meta(path: str) -> Dict:
    with open(path, "r") as fh:
        head = fh.read(4000)
    i = head.index('"records"')
    return json.loads(head[:i].rstrip().rstrip(",") + "}")


# --------------------------------------------------------------------------
def run_family(fs: FamilyStats, items):
    for label, (n, edges) in items:
        p = indpoly_forest(n, edges)
        fs.add(label, n, edges, p)
    return fs


def main(argv: Sequence[str]) -> int:
    t0 = time.time()
    quick = "--quick" in argv
    families: List[Dict] = []
    log = lambda *a: print(*a, flush=True)

    # ---- the two n=26 trees ------------------------------------------------
    fs = FamilyStats("two_n26_non_log_concave_trees")
    two = {"T_{3,4,4}": T3mn(4, 4), "T*_{3,3,4}": T3mn(3, 4, star=True)}
    for name, (n, edges) in two.items():
        assert n == 26, (name, n)
        p = indpoly_forest(n, edges)
        a = analyze(p)
        fs.add(name, n, edges, p, a)
        fs.notes.append(f"{name}: n={n} alpha={a['alpha']} L={a['L']} lc_breaks_k={a['lc_breaks']} poly={p}")
    # cross-check against the C scanner's LC_FAIL lines for n=26 (if the scan has run)
    if os.path.exists(SCAN26):
        scan = json.load(open(SCAN26))
        canon = {tree_canonical(*two[k]): k for k in two}
        matched = []
        for line in scan.get("lc_fail_lines", []):
            fields = dict(tok.split("=", 1) for tok in line.split()[1:] if "=" in tok)
            par = [int(x) for x in fields["par"].split(",")]
            n = len(par)
            edges = [(i, par[i] - 1) for i in range(1, n)]
            poly = [int(x) for x in fields["poly"].split(",")]
            assert indpoly_forest(n, edges) == poly, "python DP disagrees with C scanner on an LC failure"
            c = tree_canonical(n, edges)
            matched.append(canon.get(c, "UNKNOWN"))
        fs.notes.append(f"C-scanner n=26 LC_FAIL trees identified by canonical form: {matched}")
        fs.notes.append(f"scan n=26 lc_fail_trees={scan['lc_fail_trees']} lc_by_k={scan['lc_by_k']}")
    else:
        fs.notes.append("tree_scan_n26_20260902.json not present at run time; no cross-check")
    families.append(fs.to_json())
    log("done: two n=26 trees", fs.notes)

    # ---- T_{3,m,n}, T*_{3,m,n}, 1 <= m,n <= 20 ------------------------------
    M = 8 if quick else 20
    fs = FamilyStats("T_{3,m,n}_1<=m,n<=20")
    run_family(fs, ((f"T_{{3,{m},{n}}}", T3mn(m, n)) for m in range(1, M + 1) for n in range(1, M + 1)))
    families.append(fs.to_json()); log("done:", fs.name, fs.count, time.time() - t0)
    fs = FamilyStats("T*_{3,m,n}_1<=m,n<=20")
    run_family(fs, ((f"T*_{{3,{m},{n}}}", T3mn(m, n, star=True)) for m in range(1, M + 1) for n in range(1, M + 1)))
    families.append(fs.to_json()); log("done:", fs.name, fs.count, time.time() - t0)

    # ---- Galvin T_{m,t} -----------------------------------------------------
    fs = FamilyStats("Galvin_T_{m,t}_1<=m,t<=10")
    G = 5 if quick else 10
    run_family(fs, ((f"Galvin_T_{{{m},{t}}}", galvin_Tmt(m, t)) for m in range(1, G + 1) for t in range(1, G + 1)))
    families.append(fs.to_json()); log("done:", fs.name, fs.count, time.time() - t0)

    # ---- brooms n <= 80 ----------------------------------------------------
    NB = 40 if quick else 80
    fs = FamilyStats("brooms_B(k,L)_n<=80")
    run_family(fs, ((f"B({k},{L})", broom(k, L)) for n in range(3, NB + 1) for k in range(1, n) for L in [n - 1 - k] if L >= 0))
    families.append(fs.to_json()); log("done:", fs.name, fs.count, time.time() - t0)

    # ---- double brooms -----------------------------------------------------
    ND = 30 if quick else 50
    fs = FamilyStats("double_brooms_DB(a,b,L)_a<=b_n<=50")
    run_family(fs, ((f"DB({a},{bb},{L})", double_broom(a, bb, L))
                    for n in range(4, ND + 1) for L in range(2, n - 1) for a in range(1, n - L) for bb in [n - L - a] if a <= bb))
    families.append(fs.to_json()); log("done:", fs.name, fs.count, time.time() - t0)

    # ---- spiders up to 6 legs ----------------------------------------------
    NS = 24 if quick else 40
    fs = FamilyStats("spiders_<=6_legs_n<=40")
    run_family(fs, ((f"S{legs}", spider(legs)) for n in range(3, NS + 1) for legs in partitions_max_parts(n - 1, 6) if len(legs) >= 3))
    families.append(fs.to_json()); log("done:", fs.name, fs.count, time.time() - t0)

    # ---- multi-arm stars / uniform spiders --------------------------------
    fs = FamilyStats("multi_arm_stars_MS(k,j)_1<=k<=30_1<=j<=8_n<=120_and_uniform_spiders_US(k,l)_n<=100")
    items = [(f"MS({k},{j})", multi_arm_star(k, j)) for k in range(1, 31) for j in range(1, 9) if 1 + k + k * j <= 120]
    items += [(f"US({k},{l})", spider([l] * k)) for k in range(3, 60) for l in range(1, 12) if 1 + k * l <= 100]
    if quick:
        items = items[::4]
    run_family(fs, items)
    families.append(fs.to_json()); log("done:", fs.name, fs.count, time.time() - t0)

    # ---- paths -------------------------------------------------------------
    fs = FamilyStats("paths_P_n_1<=n<=100")
    from math import comb
    for n in range(1, 101):
        p = indpoly_forest(*path_graph(n))
        assert p == [comb(n - r + 1, r) for r in range(0, (n + 1) // 2 + 1)], n
        fs.add(f"P_{n}", n, None, p)
    fs.notes.append("all P_n polynomials verified against C(n-r+1, r)")
    families.append(fs.to_json()); log("done:", fs.name, fs.count, time.time() - t0)

    # ---- PatternBoost paper: explicit trees ---------------------------------
    fs = FamilyStats("arxiv_2510.18826_explicit_trees")
    fs.notes.append("The text dump /tmp/erdos993_refs/arxiv_2510.18826_patternboost.txt contains the appendix examples "
                    "5.1-5.13 only as figure captions (no Prüfer codes / edge lists survive in the text), so no explicit tree "
                    "can be reconstructed from it; the paper's 60-vertex output is covered by the corpus below and Galvin's "
                    "T_{m,t} (which the paper describes explicitly, Example 5.13 = T_{4,4}) is covered above.")
    families.append(fs.to_json())

    # ---- PatternBoost corpus ----------------------------------------------
    fs = FamilyStats("patternboost60_polynomial_corpus_20260726")
    if os.path.exists(CORPUS):
        meta = corpus_meta(CORPUS)
        fs.notes.append(f"corpus header: {json.dumps({k: v for k, v in meta.items() if k != 'records'})}")
        recompute_every = 1
        if quick:
            recompute_every = 50
        mism = 0
        checked = 0
        stored_lc_trees = 0
        mult_total = 0
        for idx, rec in enumerate(stream_records(CORPUS)):
            code = rec["prufer_code_one_based"]
            n, edges = prufer_to_edges(code, one_based=True)
            stored = [int(c) for c in rec["polynomial"]]
            mult_total += int(rec.get("multiplicity", 1))
            if idx % recompute_every == 0:
                p = indpoly_forest(n, edges)
                checked += 1
                if p != stored:
                    mism += 1
                    fs.notes.append(f"record {idx} (first_line {rec.get('first_line')}): recomputed polynomial differs from stored")
            else:
                p = stored
            a = analyze(p)
            if rec.get("log_concavity_failures"):
                stored_lc_trees += 1
                ks = sorted(f["k"] for f in rec["log_concavity_failures"])
                if ks != a["lc_breaks"]:
                    fs.notes.append(f"record {idx}: stored LC failure indices {ks} != recomputed {a['lc_breaks']}")
            fs.add(f"pb60_rec{idx}_line{rec.get('first_line')}", n, edges if (a["iso_fail_target"] or a["wr_fail_target"] or not a["unimodal"]) else None, p, a)
            if fs.tightest and fs.tightest["label"].startswith(f"pb60_rec{idx}_"):
                fs.tightest["prufer_code_one_based"] = list(code)
            if fs.tightest_desc and fs.tightest_desc["label"].startswith(f"pb60_rec{idx}_"):
                fs.tightest_desc["prufer_code_one_based"] = list(code)
            if fs.tightest_open and fs.tightest_open["label"].startswith(f"pb60_rec{idx}_"):
                fs.tightest_open["prufer_code_one_based"] = list(code)
            if idx % 5000 == 0:
                log(f"  corpus record {idx} ... {time.time() - t0:.1f}s")
        fs.notes.append(f"records={fs.count}, total multiplicity={mult_total}, polynomials recomputed from Prüfer code={checked}, "
                        f"mismatches={mism}, records with stored LC failures={stored_lc_trees}")
    else:
        fs.notes.append(f"corpus not found at {CORPUS}")
    families.append(fs.to_json()); log("done:", fs.name, fs.count, time.time() - t0)

    tot_iso = sum(f["iso_fail_target_cells"] for f in families)
    tot_wr = sum(f["wr_fail_target_cells"] for f in families)
    tot_nu = sum(f["nonunimodal"] for f in families)
    report = {
        "date": "2026-09-02",
        "script": "scripts/check_known_hard_trees.py (pure Python exact integers, independent of erdos993_goal code)",
        "definitions": {"L": "ceil((2 alpha - 1)/3)", "WR_r": "p_{r-1} <= r p_r, 1 <= r < L",
                        "ISO_r": "r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0, 2 <= r < L",
                        "slack": "Q_r / (p_{r-1} p_{r+1})"},
        "headline": ("NO target-range ISO_r / WR_r violation and no non-unimodal polynomial in any family or corpus"
                     if tot_iso == 0 and tot_wr == 0 and tot_nu == 0 else "VIOLATION FOUND -- see violators"),
        "totals": {"trees": sum(f["count"] for f in families), "nonunimodal": tot_nu,
                   "lc_fail_trees": sum(f["lc_fail_trees"] for f in families),
                   "iso_fail_target_cells": tot_iso, "wr_fail_target_cells": tot_wr,
                   "iso_fail_desc_target_cells": sum(f["iso_fail_desc_target_cells"] for f in families)},
        "families": families,
        "elapsed_seconds": round(time.time() - t0, 1),
    }
    os.makedirs(os.path.dirname(REPORT), exist_ok=True)
    with open(REPORT, "w") as fh:
        json.dump(report, fh, indent=1)
    log("HEADLINE:", report["headline"])
    for f in families:
        t = f["tightest_iso_cell_target"]
        log(f"{f['family']}: count={f['count']} nonuni={f['nonunimodal']} lc_fail={f['lc_fail_trees']} "
            f"iso_target_fail={f['iso_fail_target_cells']} wr_target_fail={f['wr_fail_target_cells']} "
            f"iso_desc_fail={f['iso_fail_desc_target_cells']} "
            f"tightest={'NA' if t is None else (t['label'], 'r=%d' % t['r'], 'Q=%s' % t['Q_r'], 'slack=%.4g' % t['slack'])}")
    log("report ->", REPORT)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
