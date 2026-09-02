#!/usr/bin/env python3
"""
Exact census of ALL nonisomorphic forests of order n = 1..NMAX for the
Erdős #993 prefix framework (WR_r / ISO_r / TAIL), built on forest_indep.py.

Every isomorphism class of forests of order n is visited exactly once, as a
multiset of canonical WROM trees (``components`` = tuple of (size, index)
pairs indexing the trees of ``tree_level_sequences(size)`` in generator
order).  Its independence sequence p_0..p_alpha is computed exactly and
audited with

    prefix    : 1 <= r <= L(alpha) - 1,   L(alpha) = ceil((2 alpha - 1)/3)
    WR_r      : p_{r-1} <= r p_r                slack = r p_r - p_{r-1}
    ISO_r     : Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0
    ISO ratio : (r p_r^2 + p_{r-1}^2) / ((r+1) p_{r-1} p_{r+1})
    TAIL      : p_r >= p_{r+1} for r >= L(alpha)   (Levit–Mandrescu)

Per order the script records: forest count (asserted against OEIS A005195),
non-unimodal / tail / WR-prefix / ISO-prefix failure counts with every
offender dumped, non-log-concave count, running minima (WR slack, Q_r, ISO
ratio) with argmin forests -- overall and restricted to (a) connected,
(b) at least two components each of order >= 2, (c) forests with an
isolated vertex -- the five tightest ISO ratios, and wall times.

All arithmetic is exact (Python ints; ``fractions.Fraction`` only to print
ratios).  Finite enumeration is falsification evidence only: nothing here
proves anything about forests of larger order.

Usage
-----
    python3 census_forests.py --nmax 20 [--workers 2] [--budget-minutes 40]
    python3 census_forests.py --selftest

Output: results/census_forests_n{N}.json (one per order) and
results/census_forests_summary.json.  Deterministic and re-runnable.
"""

from __future__ import annotations

import argparse
import json
import multiprocessing as mp
import os
import platform
import sys
import time
from fractions import Fraction
from functools import lru_cache
from math import comb

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from forest_indep import (  # noqa: E402
    OEIS_A000055,
    OEIS_A005195,
    L_cutoff,
    audit_sequence,
    count_forests_upto,
    count_trees,
    forests,
    indep_poly_tree,
    level_sequence_to_parent,
    poly_mul,
    tree_level_sequences,
    tree_polys_upto,
)

TOP_K = 5                       # tightest-ratio forests kept per order
OFFENDER_CAP = 2000             # offenders dumped per category (counts stay exact)
TREE_CHUNK = 5000               # level sequences per "trees" task
TARGET_FORESTS_PER_TASK = 25000  # rough load per "rest" task

CLASS_NAMES = ("all", "connected", "multi_nontrivial", "has_isolated")
CLASS_DOC = {
    "all": "every forest of order n",
    "connected": "(a) connected: a single tree",
    "multi_nontrivial": "(b) at least two components, each of order >= 2 "
                        "(no isolated vertex): the disjoint-union class",
    "has_isolated": "(c) at least one isolated vertex (for n = 1 this is K1, "
                    "which is also connected)",
}

# Exact independence polynomials of all trees of order k, in generator
# order: TREE_POLYS[k][i].  Filled order by order in the parent process;
# a worker pool is forked per order so workers inherit it read-only.
TREE_POLYS: list[list[list[int]]] = [[]]


# ---------------------------------------------------------------------------
# Counting helpers (independent of the enumeration; used for chunking/audit)
# ---------------------------------------------------------------------------


@lru_cache(None)
def forests_bounded_count(m: int, k: int) -> int:
    """Number of forests of order m all of whose components have order <= k."""
    f = [1] + [0] * m
    for j in range(1, min(k, m) + 1):
        t = count_trees(j)
        g = [0] * (m + 1)
        for s in range(m + 1):
            if f[s]:
                c = 0
                while s + c * j <= m:
                    g[s + c * j] += f[s] * comb(t + c - 1, c)
                    c += 1
        f = g
    return f[m]


def expected_forest_counts(nmax: int) -> list[int]:
    counts = count_forests_upto(nmax)
    # the module's recurrence must reproduce the published values
    assert counts[: min(nmax, 20) + 1] == OEIS_A005195[: min(nmax, 20) + 1]
    return counts


# ---------------------------------------------------------------------------
# Running extremes
# ---------------------------------------------------------------------------


def _ratio_less(x, y) -> bool:
    """Exact order on ratio records (num, den, r, comps, poly): smaller
    ratio first, ties broken by the components tuple (deterministic)."""
    lhs = x[0] * y[1]
    rhs = y[0] * x[1]
    return lhs < rhs or (lhs == rhs and x[3] < y[3])


def _value_less(x, y) -> bool:
    """Order on (value, r, comps, poly) records: value, then components."""
    return x[0] < y[0] or (x[0] == y[0] and x[2] < y[2])


class Extremes:
    """Running minima of the prefix quantities over one class of forests.

    Records: value records are (value, r, comps, poly); ratio records are
    (num, den, r, comps, poly).  ``wr`` (slack over the whole prefix) is
    always attained at r = 1 with slack p_1 - p_0 = n - 1, so ``wr2`` (slack
    over 2 <= r <= L-1) and ``wr_ratio`` (r p_r / p_{r-1}) are kept too."""

    __slots__ = ("count", "prefix_empty", "wr", "wr2", "wr_ratio", "q", "ratio")

    def __init__(self):
        self.count = 0
        self.prefix_empty = 0   # forests with L(alpha) <= 1 (no prefix index)
        self.wr = None          # min slack r p_r - p_{r-1}, 1 <= r <= L-1
        self.wr2 = None         # min slack over 2 <= r <= L-1 (None if L <= 2)
        self.wr_ratio = None    # min r p_r / p_{r-1} over the prefix
        self.q = None           # min Q_r over the prefix
        self.ratio = None       # min ISO ratio over the prefix

    def update(self, recs):
        self.count += 1
        if recs is None:
            self.prefix_empty += 1
            return
        wr_rec, wr2_rec, wrr_rec, q_rec, ratio_rec = recs
        if self.wr is None or _value_less(wr_rec, self.wr):
            self.wr = wr_rec
        if wr2_rec is not None and (self.wr2 is None or _value_less(wr2_rec, self.wr2)):
            self.wr2 = wr2_rec
        if self.wr_ratio is None or _ratio_less(wrr_rec, self.wr_ratio):
            self.wr_ratio = wrr_rec
        if self.q is None or _value_less(q_rec, self.q):
            self.q = q_rec
        if self.ratio is None or _ratio_less(ratio_rec, self.ratio):
            self.ratio = ratio_rec

    def merge(self, other: "Extremes"):
        self.count += other.count
        self.prefix_empty += other.prefix_empty
        for attr, less in (("wr", _value_less), ("wr2", _value_less),
                           ("wr_ratio", _ratio_less), ("q", _value_less),
                           ("ratio", _ratio_less)):
            mine, theirs = getattr(self, attr), getattr(other, attr)
            if theirs is not None and (mine is None or less(theirs, mine)):
                setattr(self, attr, theirs)


class Census:
    """Exact per-order statistics; ``visit`` is called once per forest."""

    def __init__(self, n: int):
        self.n = n
        self.classes = {name: Extremes() for name in CLASS_NAMES}
        self.non_unimodal = 0
        self.tail_fail = 0
        self.wr_prefix_fail = 0
        self.iso_prefix_fail = 0
        self.non_log_concave = 0
        self.offenders = {"non_unimodal": [], "tail_fail": [],
                          "wr_prefix_fail": [], "iso_prefix_fail": []}
        self.top = []           # <= TOP_K ratio records, ascending

    def _offend(self, kind, comps, P):
        bucket = self.offenders[kind]
        if len(bucket) < OFFENDER_CAP:
            bucket.append((comps, P))

    def visit(self, comps, P):
        alpha = len(P) - 1
        L = -((1 - 2 * alpha) // 3) if alpha >= 1 else 0

        i = 0
        while i < alpha and P[i] <= P[i + 1]:
            i += 1
        while i < alpha and P[i] >= P[i + 1]:
            i += 1
        unimodal = i == alpha

        tail_ok = True
        for r in range(L, alpha):
            if P[r] < P[r + 1]:
                tail_ok = False
                break

        log_concave = True
        for r in range(1, alpha):
            if P[r] * P[r] < P[r - 1] * P[r + 1]:
                log_concave = False
                break

        recs = ratio_rec = None
        if L >= 2:
            wr_min = wr2_min = q_min = rat_num = rat_den = wrr_num = wrr_den = None
            wr_r = wr2_r = q_r = rat_r = wrr_r = 0
            for r in range(1, L):
                a = P[r - 1]
                b = P[r]
                c = P[r + 1]
                rb = r * b
                s = rb - a
                if wr_min is None or s < wr_min:
                    wr_min, wr_r = s, r
                if r >= 2 and (wr2_min is None or s < wr2_min):
                    wr2_min, wr2_r = s, r
                if wrr_den is None or rb * wrr_den < wrr_num * a:
                    wrr_num, wrr_den, wrr_r = rb, a, r
                num = rb * b + a * a
                den = (r + 1) * a * c
                Q = num - den
                if q_min is None or Q < q_min:
                    q_min, q_r = Q, r
                if rat_den is None or num * rat_den < rat_num * den:
                    rat_num, rat_den, rat_r = num, den, r
            ratio_rec = (rat_num, rat_den, rat_r, comps, P)
            recs = ((wr_min, wr_r, comps, P),
                    None if wr2_min is None else (wr2_min, wr2_r, comps, P),
                    (wrr_num, wrr_den, wrr_r, comps, P),
                    (q_min, q_r, comps, P),
                    ratio_rec)
            if wr_min < 0:
                self.wr_prefix_fail += 1
                self._offend("wr_prefix_fail", comps, P)
            if q_min < 0:
                self.iso_prefix_fail += 1
                self._offend("iso_prefix_fail", comps, P)

        if not unimodal:
            self.non_unimodal += 1
            self._offend("non_unimodal", comps, P)
        if not tail_ok:
            self.tail_fail += 1
            self._offend("tail_fail", comps, P)
        if not log_concave:
            self.non_log_concave += 1

        classes = self.classes
        classes["all"].update(recs)
        if len(comps) == 1:
            classes["connected"].update(recs)
        if comps[-1][0] == 1:
            classes["has_isolated"].update(recs)
        elif len(comps) >= 2:
            classes["multi_nontrivial"].update(recs)

        if ratio_rec is not None:
            top = self.top
            if len(top) < TOP_K or _ratio_less(ratio_rec, top[-1]):
                pos = len(top)
                while pos > 0 and _ratio_less(ratio_rec, top[pos - 1]):
                    pos -= 1
                top.insert(pos, ratio_rec)
                if len(top) > TOP_K:
                    top.pop()

    def merge(self, other: "Census"):
        assert other.n == self.n
        for name in CLASS_NAMES:
            self.classes[name].merge(other.classes[name])
        self.non_unimodal += other.non_unimodal
        self.tail_fail += other.tail_fail
        self.wr_prefix_fail += other.wr_prefix_fail
        self.iso_prefix_fail += other.iso_prefix_fail
        self.non_log_concave += other.non_log_concave
        for kind, bucket in other.offenders.items():
            mine = self.offenders[kind]
            room = OFFENDER_CAP - len(mine)
            if room > 0:
                mine.extend(bucket[:room])
        merged = list(self.top) + list(other.top)
        # exact selection sort of <= 2*TOP_K records (order-independent result)
        out = []
        while merged and len(out) < TOP_K:
            best = 0
            for j in range(1, len(merged)):
                if _ratio_less(merged[j], merged[best]):
                    best = j
            out.append(merged.pop(best))
        self.top = out


# ---------------------------------------------------------------------------
# Enumeration (same order as forest_indep.forests, split by largest tree)
# ---------------------------------------------------------------------------


def enumerate_rest(n: int, k: int, i_lo: int, i_hi: int, visit):
    """Visit every forest of order n whose largest component is the tree
    (k, i) with i_lo <= i < i_hi, k < n.  Components are non-increasing in
    size and non-decreasing in index within a size, exactly as in
    ``forest_indep.forests``."""
    tp = TREE_POLYS
    polys_k = tp[k]
    rem0 = n - k

    def rec(remaining, last_size, last_idx, poly, comps):
        for size in range(min(remaining, last_size), 0, -1):
            polys = tp[size]
            i0 = last_idx if size == last_size else 0
            if size == remaining:
                for i in range(i0, len(polys)):
                    visit(comps + ((size, i),), poly_mul(poly, polys[i]))
            else:
                for i in range(i0, len(polys)):
                    rec(remaining - size, size, i, poly_mul(poly, polys[i]),
                        comps + ((size, i),))

    for i in range(i_lo, i_hi):
        rec(rem0, k, i, polys_k[i], ((k, i),))


def _run_task(task, visit):
    """Execute one task; returns the polynomials for a "trees" task."""
    kind, n = task[0], task[1]
    if kind == "trees":
        start, seqs = task[2], task[3]
        polys = []
        for j, seq in enumerate(seqs):
            P = indep_poly_tree(level_sequence_to_parent(seq))
            polys.append(P)
            visit(((n, start + j),), P)
        return polys
    k, i_lo, i_hi = task[2], task[3], task[4]
    enumerate_rest(n, k, i_lo, i_hi, visit)
    return None


def _worker(task):
    census = Census(task[1])
    polys = _run_task(task, census.visit)
    return task[0], task[2], polys, census


def make_tasks(n: int):
    """Tasks for order n: chunks of order-n trees streamed from the WROM
    generator (single-component forests), then index ranges of the largest
    component for forests with >= 2 components."""
    assert len(TREE_POLYS) == n, "orders must be processed in sequence"
    chunk, start = [], 0
    for seq in tree_level_sequences(n):
        chunk.append(seq)
        if len(chunk) == TREE_CHUNK:
            yield ("trees", n, start, chunk)
            start += len(chunk)
            chunk = []
    if chunk:
        yield ("trees", n, start, chunk)
    for k in range(n - 1, 0, -1):
        per_tree = forests_bounded_count(n - k, k)   # upper bound on forests per tree
        per_task = max(1, TARGET_FORESTS_PER_TASK // per_tree)
        count_k = len(TREE_POLYS[k])
        for i_lo in range(0, count_k, per_task):
            yield ("rest", n, k, i_lo, min(count_k, i_lo + per_task))


def run_order(n: int, workers: int, store_polys: bool = True) -> Census:
    """Census of all forests of order n; appends TREE_POLYS[n]."""
    census = Census(n)
    polys_n = [None] * count_trees(n)

    def absorb(result):
        kind, start, polys, part = result
        if kind == "trees":
            polys_n[start:start + len(polys)] = polys
        census.merge(part)

    if workers <= 1:
        for task in make_tasks(n):
            absorb(_worker(task))
    else:
        ctx = mp.get_context("fork")
        with ctx.Pool(workers) as pool:
            for result in pool.imap_unordered(_worker, make_tasks(n)):
                absorb(result)
    assert all(P is not None for P in polys_n), "missing tree polynomials"
    TREE_POLYS.append(polys_n if store_polys else [])
    return census


def reset_state():
    del TREE_POLYS[1:]


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------


def _diameter(adj) -> int:
    def bfs(src):
        dist = {src: 0}
        order = [src]
        for v in order:
            for w in adj[v]:
                if w not in dist:
                    dist[w] = dist[v] + 1
                    order.append(w)
        far = order[-1]
        return far, dist[far]

    far, _ = bfs(0)
    _, d = bfs(far)
    return d


def describe_tree(seq) -> str:
    """Human-readable label of a tree given by its level sequence."""
    n = len(seq)
    if n == 1:
        return "K1"
    if n == 2:
        return "K2 (n=2)"
    parent = level_sequence_to_parent(seq)
    adj = [[] for _ in range(n)]
    for v in range(1, n):
        adj[v].append(parent[v])
        adj[parent[v]].append(v)
    deg = [len(a) for a in adj]
    leaves = sum(1 for d in deg if d == 1)
    maxdeg = max(deg)
    diam = _diameter(adj)
    internal = [v for v in range(n) if deg[v] >= 2]
    branch = [v for v in range(n) if deg[v] >= 3]
    if maxdeg == n - 1:
        name = f"star K_{{1,{n - 1}}}"
    elif maxdeg <= 2:
        name = f"path P_{n}"
    elif len(internal) == 2:
        a, b = internal
        name = f"double star S({deg[a] - 1},{deg[b] - 1})"
    elif len(branch) == 1:
        c = branch[0]
        legs = []
        for w in adj[c]:
            prev, cur, length = c, w, 1
            while deg[cur] == 2:
                nxt = adj[cur][0] if adj[cur][0] != prev else adj[cur][1]
                prev, cur, length = cur, nxt, length + 1
            legs.append(length)
        name = f"spider with legs {sorted(legs, reverse=True)}"
    elif all(sum(1 for w in adj[v] if deg[w] >= 2) <= 2 for v in internal):
        name = "caterpillar"
    else:
        name = "tree"
    return f"{name} (n={n}, maxdeg={maxdeg}, leaves={leaves}, diameter={diam})"


def collect_tree_refs(census: Census) -> set:
    refs = set()
    for ex in census.classes.values():
        for rec in (ex.wr, ex.wr2, ex.q):
            if rec is not None:
                refs.update(rec[2])
        for rec in (ex.wr_ratio, ex.ratio):
            if rec is not None:
                refs.update(rec[3])
    for rec in census.top:
        refs.update(rec[3])
    for bucket in census.offenders.values():
        for comps, _ in bucket:
            refs.update(comps)
    return refs


def level_sequences_for(refs) -> dict:
    """Level sequences of the referenced trees, one generator pass per order."""
    by_k = {}
    for k, i in refs:
        by_k.setdefault(k, set()).add(i)
    out = {}
    for k, idxs in by_k.items():
        want = sorted(idxs)
        pos = 0
        for i, seq in enumerate(tree_level_sequences(k)):
            if i == want[pos]:
                out[(k, i)] = list(seq)
                pos += 1
                if pos == len(want):
                    break
        assert pos == len(want), (k, want)
    return out


def forest_json(comps, P, seqs) -> dict:
    alpha = len(P) - 1
    return {
        "components": [[k, i] for k, i in comps],
        "component_descriptions": [describe_tree(seqs[(k, i)]) for k, i in comps],
        "level_sequences": [seqs[(k, i)] for k, i in comps],
        "poly": list(P),
        "alpha": alpha,
        "L": L_cutoff(alpha) if alpha >= 1 else 0,
    }


def ratio_json(rec, seqs) -> dict | None:
    if rec is None:
        return None
    num, den, r, comps, P = rec
    fr = Fraction(num, den)
    return {
        "ratio_exact": f"{fr.numerator}/{fr.denominator}",
        "ratio_approx": float(fr),
        "r": r,
        "forest": forest_json(comps, P, seqs),
    }


def value_json(rec, key, seqs) -> dict | None:
    if rec is None:
        return None
    value, r, comps, P = rec
    return {key: value, "r": r, "forest": forest_json(comps, P, seqs)}


def extremes_json(ex: Extremes, seqs) -> dict:
    return {
        "count": ex.count,
        "prefix_empty_count": ex.prefix_empty,
        "min_wr_prefix_slack": value_json(ex.wr, "slack", seqs),
        "min_wr_prefix_slack_r_ge_2": value_json(ex.wr2, "slack", seqs),
        "min_wr_prefix_ratio": ratio_json(ex.wr_ratio, seqs),
        "min_iso_prefix_Q": value_json(ex.q, "Q", seqs),
        "min_iso_prefix_ratio": ratio_json(ex.ratio, seqs),
    }


def census_json(census: Census, expected_forests: int, expected_trees: int,
                wall_time: float, workers: int) -> dict:
    seqs = level_sequences_for(collect_tree_refs(census))
    n = census.n
    total = census.classes["all"].count
    classes = {name: extremes_json(census.classes[name], seqs) for name in CLASS_NAMES}
    offenders = {}
    for kind, bucket in census.offenders.items():
        offenders[kind] = [forest_json(c, P, seqs) for c, P in bucket]
    return {
        "n": n,
        "forest_count": total,
        "expected_A005195": expected_forests,
        "forest_count_matches_A005195": total == expected_forests,
        "tree_count": census.classes["connected"].count,
        "expected_A000055": expected_trees,
        "non_unimodal_count": census.non_unimodal,
        "tail_fail_count": census.tail_fail,
        "wr_prefix_fail_count": census.wr_prefix_fail,
        "iso_prefix_fail_count": census.iso_prefix_fail,
        "non_log_concave_count": census.non_log_concave,
        "prefix_empty_count": census.classes["all"].prefix_empty,
        "offenders": offenders,
        "offenders_truncated": {kind: census_count > len(census.offenders[kind])
                                for kind, census_count in (
                                    ("non_unimodal", census.non_unimodal),
                                    ("tail_fail", census.tail_fail),
                                    ("wr_prefix_fail", census.wr_prefix_fail),
                                    ("iso_prefix_fail", census.iso_prefix_fail))},
        "min_wr_prefix_slack": classes["all"]["min_wr_prefix_slack"],
        "min_wr_prefix_slack_r_ge_2": classes["all"]["min_wr_prefix_slack_r_ge_2"],
        "min_wr_prefix_ratio": classes["all"]["min_wr_prefix_ratio"],
        "min_iso_prefix_Q": classes["all"]["min_iso_prefix_Q"],
        "min_iso_prefix_ratio": classes["all"]["min_iso_prefix_ratio"],
        "top5_iso_prefix_ratio": [ratio_json(rec, seqs) for rec in census.top],
        "classes": classes,
        "class_definitions": CLASS_DOC,
        "tightest_disjoint_union_iso_ratio": classes["multi_nontrivial"]["min_iso_prefix_ratio"],
        "tightest_disjoint_union_note": "argmin ISO prefix ratio among forests with no "
                                        "isolated vertex and >= 2 components "
                                        "(identical to classes.multi_nontrivial)",
        "wall_time_seconds": wall_time,
        "workers": workers,
        "definitions": {
            "prefix": "1 <= r <= L(alpha)-1, L(alpha) = ceil((2 alpha - 1)/3)",
            "WR_r": "p_{r-1} <= r p_r; slack = r p_r - p_{r-1} (at r = 1 the slack is "
                    "p_1 - p_0 = n - 1 for every forest of order n, hence the extra "
                    "r >= 2 and ratio r p_r / p_{r-1} fields)",
            "ISO_r": "Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0",
            "ISO_ratio": "(r p_r^2 + p_{r-1}^2) / ((r+1) p_{r-1} p_{r+1})",
            "TAIL": "p_r >= p_{r+1} for r >= L(alpha)",
            "components": "(size, index) pairs; index into tree_level_sequences(size) "
                          "in generator order (forest_indep.py, WROM)",
            "ratio_approx": "approximate (float) value of ratio_exact",
            "tie_break": "ties in a minimum are broken by the lexicographically "
                         "smallest components tuple",
        },
        "note": "Exact arithmetic; finite enumeration is falsification evidence only.",
    }


def _short_forest(fj: dict) -> str:
    """Compact label: identical consecutive components are grouped as 'k x label'."""
    parts = []
    for comp, desc in zip(fj["components"], fj["component_descriptions"]):
        if parts and parts[-1][0] == comp:
            parts[-1][2] += 1
        else:
            parts.append([comp, desc, 1])
    return " + ".join(desc if cnt == 1 else f"{cnt} x {desc}" for _, desc, cnt in parts)


def table_line(rec: dict) -> str:
    mr = rec["min_iso_prefix_ratio"]
    du = rec["tightest_disjoint_union_iso_ratio"]
    ratio = (f"{mr['ratio_approx']:.6f} @r={mr['r']} [{_short_forest(mr['forest'])}]"
             if mr else "n/a (empty prefix)")
    dus = (f"{du['ratio_approx']:.6f} @r={du['r']} [{_short_forest(du['forest'])}]"
           if du else "n/a")
    return (f"n={rec['n']:2d} forests={rec['forest_count']:8d} "
            f"(A005195 {'ok' if rec['forest_count_matches_A005195'] else 'MISMATCH'}) "
            f"nonuni={rec['non_unimodal_count']} tailfail={rec['tail_fail_count']} "
            f"WRfail={rec['wr_prefix_fail_count']} ISOfail={rec['iso_prefix_fail_count']} "
            f"nonLC={rec['non_log_concave_count']} minISOratio~{ratio} "
            f"| disjoint-union~{dus} | {rec['wall_time_seconds']:.1f}s")


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------


def run(nmax: int, workers: int, budget_minutes: float, results_dir: str,
        verbose: bool = True) -> dict:
    os.makedirs(results_dir, exist_ok=True)
    reset_state()
    expected = expected_forest_counts(max(nmax, 20) + 1)
    summary = {
        "script": "census_forests.py",
        "nmax_requested": nmax,
        "workers": workers,
        "budget_minutes_per_order": budget_minutes,
        "python": platform.python_version(),
        "cpu_count": os.cpu_count(),
        "started_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "orders": [],
        "table_lines": [],
        "note": "Exact arithmetic; finite enumeration is falsification evidence only.",
    }
    times = {}
    completed = 0
    for n in range(1, nmax + 1):
        if n >= 3 and times[n - 1] > 1.0:
            growth = expected[n] / expected[n - 1]
            cost_growth = 1.0
            if times[n - 2] > 0.5:
                cost_growth = (times[n - 1] / times[n - 2]) / (expected[n - 1] / expected[n - 2])
                cost_growth = min(max(cost_growth, 1.0), 2.0)
            projected = times[n - 1] * growth * cost_growth
            summary.setdefault("projections", {})[str(n)] = {
                "projected_seconds": projected, "growth_factor": growth,
                "cost_growth_factor": cost_growth}
            if projected > budget_minutes * 60:
                summary["stopped_before_order"] = n
                summary["stop_reason"] = (f"order {n} projected to take {projected / 60:.1f} min "
                                          f"> budget {budget_minutes} min")
                if verbose:
                    print(summary["stop_reason"], flush=True)
                break
        t0 = time.perf_counter()
        census = run_order(n, workers, store_polys=(n < nmax))
        wall = time.perf_counter() - t0
        times[n] = wall
        t1 = time.perf_counter()
        rec = census_json(census, expected[n], count_trees(n), wall, workers)
        rec["report_time_seconds"] = time.perf_counter() - t1
        assert rec["forest_count"] == expected[n], (n, rec["forest_count"], expected[n])
        assert rec["tree_count"] == count_trees(n), (n, rec["tree_count"])
        if n <= 20:
            assert expected[n] == OEIS_A005195[n] and count_trees(n) == OEIS_A000055[n]
        path = os.path.join(results_dir, f"census_forests_n{n}.json")
        with open(path, "w") as fh:
            json.dump(rec, fh, indent=1)
        line = table_line(rec)
        summary["table_lines"].append(line)
        summary["orders"].append({
            "n": n,
            "forest_count": rec["forest_count"],
            "forest_count_matches_A005195": rec["forest_count_matches_A005195"],
            "non_unimodal_count": rec["non_unimodal_count"],
            "tail_fail_count": rec["tail_fail_count"],
            "wr_prefix_fail_count": rec["wr_prefix_fail_count"],
            "iso_prefix_fail_count": rec["iso_prefix_fail_count"],
            "non_log_concave_count": rec["non_log_concave_count"],
            "min_wr_prefix_slack": _summary_value(rec["min_wr_prefix_slack"], "slack"),
            "min_wr_prefix_slack_r_ge_2": _summary_value(
                rec["min_wr_prefix_slack_r_ge_2"], "slack"),
            "min_wr_prefix_ratio": _summary_ratio(rec["min_wr_prefix_ratio"]),
            "min_iso_prefix_Q": _summary_value(rec["min_iso_prefix_Q"], "Q"),
            "min_iso_prefix_ratio": _summary_ratio(rec["min_iso_prefix_ratio"]),
            "min_iso_prefix_ratio_connected": _summary_ratio(
                rec["classes"]["connected"]["min_iso_prefix_ratio"]),
            "min_iso_prefix_ratio_multi_nontrivial": _summary_ratio(
                rec["classes"]["multi_nontrivial"]["min_iso_prefix_ratio"]),
            "min_iso_prefix_ratio_has_isolated": _summary_ratio(
                rec["classes"]["has_isolated"]["min_iso_prefix_ratio"]),
            "wall_time_seconds": wall,
            "report_time_seconds": rec["report_time_seconds"],
            "file": os.path.basename(path),
        })
        completed = n
        if verbose:
            print(line, flush=True)
        with open(os.path.join(results_dir, "census_forests_summary.json"), "w") as fh:
            json.dump(summary, fh, indent=1)
    summary["nmax_completed"] = completed
    summary["total_census_seconds"] = sum(times.values())
    summary["finished_utc"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    summary["all_counts_match_A005195"] = all(o["forest_count_matches_A005195"]
                                              for o in summary["orders"])
    summary["total_offenders"] = {
        kind: sum(o[kind] for o in summary["orders"])
        for kind in ("non_unimodal_count", "tail_fail_count",
                     "wr_prefix_fail_count", "iso_prefix_fail_count")}
    with open(os.path.join(results_dir, "census_forests_summary.json"), "w") as fh:
        json.dump(summary, fh, indent=1)
    return summary


def _summary_ratio(rj: dict | None) -> dict | None:
    if rj is None:
        return None
    return {"ratio_exact": rj["ratio_exact"], "ratio_approx": rj["ratio_approx"],
            "r": rj["r"], "forest": _short_forest(rj["forest"]),
            "components": rj["forest"]["components"]}


def _summary_value(vj: dict | None, key: str) -> dict | None:
    if vj is None:
        return None
    return {key: vj[key], "r": vj["r"], "forest": _short_forest(vj["forest"]),
            "components": vj["forest"]["components"]}


# ---------------------------------------------------------------------------
# Self-test against forest_indep.forests / audit_sequence (n <= 11)
# ---------------------------------------------------------------------------


def _reference_census(n: int, tp) -> dict:
    """Straightforward re-computation of the per-order statistics using
    forest_indep.forests and audit_sequence (Fractions), same tie-breaks."""
    ref = {name: {"count": 0, "wr": None, "wr2": None, "wr_ratio": None, "q": None,
                  "ratio": None} for name in CLASS_NAMES}
    counts = {"non_unimodal": 0, "tail_fail": 0, "wr_prefix_fail": 0,
              "iso_prefix_fail": 0, "non_log_concave": 0, "total": 0}
    top = []
    for comps, P in forests(n, tp):
        a = audit_sequence(P, with_ratio=True)
        counts["total"] += 1
        counts["non_unimodal"] += not a["unimodal"]
        counts["tail_fail"] += not a["tail_ok"]
        counts["non_log_concave"] += not a["log_concave"]
        members = ["all"]
        if len(comps) == 1:
            members.append("connected")
        if comps[-1][0] == 1:
            members.append("has_isolated")
        elif len(comps) >= 2:
            members.append("multi_nontrivial")
        for name in members:
            ref[name]["count"] += 1
        if a["wr_prefix_min"] is None:
            continue
        counts["wr_prefix_fail"] += a["wr_prefix_min"] < 0
        counts["iso_prefix_fail"] += a["iso_prefix_min"] < 0
        L = a["L"]
        wr_key = (a["wr_prefix_min"], comps)
        q_key = (a["iso_prefix_min"], comps)
        rat_key = (a["iso_prefix_ratio_min"], comps)
        # argmin r (smallest r attaining the minimum)
        wr_r = min(range(1, L), key=lambda r: (r * P[r] - P[r - 1], r))
        q_r = min(range(1, L), key=lambda r: (r * P[r] ** 2 + P[r - 1] ** 2
                                             - (r + 1) * P[r - 1] * P[r + 1], r))
        rat_r = min(range(1, L), key=lambda r: (Fraction(r * P[r] ** 2 + P[r - 1] ** 2,
                                                         (r + 1) * P[r - 1] * P[r + 1]), r))
        wrr = min((Fraction(r * P[r], P[r - 1]), r) for r in range(1, L))
        wrr_key, wrr_r = (wrr[0], comps), wrr[1]
        wr2 = min(((r * P[r] - P[r - 1], r) for r in range(2, L)), default=None)
        for name in members:
            e = ref[name]
            if e["wr"] is None or wr_key < e["wr"][0]:
                e["wr"] = (wr_key, wr_r, P)
            if wr2 is not None:
                wr2_key = (wr2[0], comps)
                if e["wr2"] is None or wr2_key < e["wr2"][0]:
                    e["wr2"] = (wr2_key, wr2[1], P)
            if e["wr_ratio"] is None or wrr_key < e["wr_ratio"][0]:
                e["wr_ratio"] = (wrr_key, wrr_r, P)
            if e["q"] is None or q_key < e["q"][0]:
                e["q"] = (q_key, q_r, P)
            if e["ratio"] is None or rat_key < e["ratio"][0]:
                e["ratio"] = (rat_key, rat_r, P)
        top.append((rat_key, rat_r, P))
    top.sort(key=lambda t: t[0])
    return ref, counts, top[:TOP_K]


def selftest(verbose: bool = True) -> None:
    log = print if verbose else (lambda *a, **k: None)
    for m in range(0, 21):
        assert forests_bounded_count(m, m) == OEIS_A005195[m], m
        assert forests_bounded_count(m, 1) == 1, m
    assert forests_bounded_count(4, 2) == 3 and forests_bounded_count(6, 3) == 7
    log("counting: forests_bounded_count agrees with A005195 and small cases")

    NMAX = 12
    tp = tree_polys_upto(NMAX)
    for workers in (1, 2):
        reset_state()
        for n in range(1, NMAX + 1):
            # 1. the census visits exactly the forests of forest_indep.forests
            seen = {}

            def collect(comps, P):
                assert comps not in seen, comps
                seen[comps] = list(P)

            assert len(TREE_POLYS) == n
            for task in make_tasks(n):
                _run_task(task, collect)
            expected = {comps: list(P) for comps, P in forests(n, tp)}
            assert seen == expected, n

            # 2. statistics agree with the Fraction-based reference
            census = run_order(n, workers)
            assert TREE_POLYS[n] == tp[n], n
            ref, counts, top = _reference_census(n, tp)
            assert census.classes["all"].count == counts["total"] == OEIS_A005195[n]
            assert census.non_unimodal == counts["non_unimodal"]
            assert census.tail_fail == counts["tail_fail"]
            assert census.wr_prefix_fail == counts["wr_prefix_fail"]
            assert census.iso_prefix_fail == counts["iso_prefix_fail"]
            assert census.non_log_concave == counts["non_log_concave"]
            for name in CLASS_NAMES:
                ex, e = census.classes[name], ref[name]
                assert ex.count == e["count"], (n, name)
                if e["wr"] is None:
                    assert ex.wr is None and ex.q is None and ex.ratio is None
                    assert ex.wr2 is None and ex.wr_ratio is None
                    continue
                (slack, comps), r, P = e["wr"]
                assert ex.wr == (slack, r, comps, P), (n, name, ex.wr, e["wr"])
                if e["wr2"] is None:
                    assert ex.wr2 is None, (n, name, ex.wr2)
                else:
                    (slack, comps), r, P = e["wr2"]
                    assert ex.wr2 == (slack, r, comps, P), (n, name, ex.wr2, e["wr2"])
                (Q, comps), r, P = e["q"]
                assert ex.q == (Q, r, comps, P), (n, name)
                for attr in ("ratio", "wr_ratio"):
                    (fr, comps), r, P = e[attr]
                    num, den, rr, cc, PP = getattr(ex, attr)
                    assert Fraction(num, den) == fr and (rr, cc, PP) == (r, comps, P), \
                        (n, name, attr)
            got = [(Fraction(t[0], t[1]), t[3], t[2], t[4]) for t in census.top]
            want = [(fr, comps, r, P) for (fr, comps), r, P in top]
            assert got == want, (n, got, want)
        log(f"census: matches forest_indep.forests and audit_sequence for n <= {NMAX} "
            f"(workers={workers})")

    # 3. level-sequence lookup and descriptions
    seqs = level_sequences_for({(7, 0), (7, 10), (5, 2), (1, 0)})
    all7 = list(tree_level_sequences(7))
    assert seqs[(7, 0)] == all7[0] and seqs[(7, 10)] == all7[10]
    assert seqs[(1, 0)] == [0]
    assert describe_tree([0, 1, 1, 1, 1]).startswith("star K_{1,4}")
    assert describe_tree([0, 1, 2, 3, 4]).startswith("path P_5")
    assert describe_tree([0, 1, 2, 2, 1, 1]).startswith("double star S(2,2)")
    assert describe_tree([0, 1, 2, 1, 2, 1, 2]).startswith("spider with legs [2, 2, 2]")
    log("reporting: level-sequence lookup and tree descriptions")

    # 4. end-to-end run into a scratch directory, determinism across workers
    import tempfile
    with tempfile.TemporaryDirectory() as d1, tempfile.TemporaryDirectory() as d2:
        run(9, 1, 1e9, d1, verbose=False)
        run(9, 2, 1e9, d2, verbose=False)
        for n in range(1, 10):
            with open(os.path.join(d1, f"census_forests_n{n}.json")) as fh:
                a = json.load(fh)
            with open(os.path.join(d2, f"census_forests_n{n}.json")) as fh:
                b = json.load(fh)
            for key in ("wall_time_seconds", "report_time_seconds", "workers"):
                a.pop(key), b.pop(key)
            assert a == b, n
            assert a["forest_count"] == OEIS_A005195[n]
        with open(os.path.join(d1, "census_forests_summary.json")) as fh:
            s = json.load(fh)
        assert s["nmax_completed"] == 9 and s["all_counts_match_A005195"]
    log("end-to-end: JSON output identical for workers=1 and workers=2 (n <= 9)")
    reset_state()
    log("SELFTEST PASS")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--nmax", type=int, default=20, help="largest order (default 20)")
    ap.add_argument("--workers", type=int, default=2,
                    help="worker processes (default 2; the shared machine allows at most 2)")
    ap.add_argument("--budget-minutes", type=float, default=40.0,
                    help="stop before an order projected to exceed this wall time")
    ap.add_argument("--results-dir", default=os.path.join(HERE, "results"))
    ap.add_argument("--selftest", action="store_true", help="run the self-test and exit")
    args = ap.parse_args(argv)
    if args.selftest:
        selftest()
        return 0
    summary = run(args.nmax, args.workers, args.budget_minutes, args.results_dir)
    print(f"completed n <= {summary['nmax_completed']} in "
          f"{summary['total_census_seconds']:.1f}s census time; "
          f"counts match A005195: {summary['all_counts_match_A005195']}; "
          f"offenders: {summary['total_offenders']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
