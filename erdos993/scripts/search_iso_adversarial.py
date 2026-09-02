#!/usr/bin/env python3
"""Heuristic adversarial search against the WR + ISO + TAIL framework (Erdős #993 audit).

For a forest with independence polynomial ``p`` (``p[k]`` = number of independent
``k``-sets, ``alpha = len(p) - 1``, ``L = ceil((2*alpha - 1)/3)``) the framework
needs, for every ``1 <= r <= L-1``::

    WR_r : p[r-1] <= r*p[r]                                (ratio  w_r = p[r-1]/(r*p[r]) <= 1)
    ISO_r: Q_r = r*p[r]^2 + p[r-1]^2 - (r+1)*p[r-1]*p[r+1] >= 0   (margin m_r = Q_r/(p[r-1]*p[r]))

together with TAIL: ``p[r] >= p[r+1]`` for all ``r >= L``.  A negative ``Q_r`` for
some ``r <= L-1`` on any forest would refute the framework's key inequality; a
non-unimodal polynomial would solve the Erdős problem itself.

This script hunts for such counterexamples with exact integer arithmetic over
trees and forests of orders 20..300 and records the extremal (smallest) ISO
margins for ``r >= 3`` and the largest WR ratios encountered:

  (a) deterministic parameter sweeps over structured families (stars with pendant
      paths, spiders, brooms, double brooms, caterpillars, bushes, T_{3,m,n},
      T*_{3,m,n}, multi-arm stars, complete k-ary trees, subdivided stars, two-hub
      trees with pendant P2's);
  (b) simulated annealing / hill climbing on trees of orders 24..120 with leaf and
      small-subtree prune-regraft moves (objectives: min_{3<=r<=L-1} m_r, the same
      restricted to descent indices p[r] <= p[r-1], and max_{1<=r<=L-1} w_r);
  (c) random trees (uniform Prüfer, preferential attachment);
  (d) forests: disjoint unions of the most extremal trees found and of copies of
      T_{3,4,4} with paths / isolated vertices / stars (poly_mul on components);
  (e) the double-broom r = 4 trend for n = 40, 80, 160, 320, 640 and an exhaustive
      recomputation of the n = 20 minima of m_3 and m_4 (cross-check with the
      exhaustive scan: 54883/50502 and 1983/1760).

Usage::

    python3 scripts/search_iso_adversarial.py --minutes 35 [--seed 993]
        [--out reports/iso_adversarial_search.json] [--skip-n20-check]

Partial reports are written every ~5 minutes and on interruption (SIGINT/SIGTERM).
Single process, standard library + erdos993lib only.
"""

from __future__ import annotations

import argparse
import math
import os
import random
import signal
import sys
import time
import traceback
from collections import deque
from fractions import Fraction
from itertools import combinations_with_replacement, product
from typing import Any, Callable, Dict, Iterable, Iterator, List, Optional, Sequence, Tuple

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from erdos993lib.checks import tail_cutoff  # noqa: E402
from erdos993lib.families import (  # noqa: E402
    T3mn,
    T3mn_star,
    TreeBuilder,
    broom,
    bush,
    caterpillar,
    double_broom,
    multi_arm_star,
    path,
    random_attachment_tree,
    random_tree,
    spider,
    star,
)
from erdos993lib.indpoly import indpoly_forest, indpoly_parent_array, poly_mul  # noqa: E402
from erdos993lib.report import provenance, write_report  # noqa: E402
from erdos993lib.trees import A000055, canonical_form, free_tree_layouts, layout_to_parent, parent_to_edges  # noqa: E402

Edges = List[Tuple[int, int]]
Poly = List[int]
Graph = Tuple[int, Edges]

MIN_ORDER = 20
MAX_ORDER = 300
ORDERS_FINE = list(range(20, 121))
ORDERS_COARSE = [140, 160, 180, 200, 220, 240, 260, 280, 300]
ORDERS_ALL = ORDERS_FINE + ORDERS_COARSE
SA_ORDERS = [24, 30, 40, 60, 80, 120]
RANDOM_ORDERS = [30, 50, 100, 200]
RANDOM_SAMPLES_PER_CELL = 400
TREND_ORDERS = [40, 80, 160, 320, 640]
STAR_R2_ORDERS = [20, 24, 30, 50, 100, 200, 300]

EXPECTED_N20_MIN_M3 = Fraction(54883, 50502)
EXPECTED_N20_MIN_M4_HINT = Fraction(1983, 1760)

SENTINEL = Fraction(10**6)  # objective value when the objective is undefined


def frac_json(num: int, den: int) -> Dict[str, Any]:
    f = Fraction(num, den)
    return {"exact": str(f), "float": float(f)}


def fraction_json(f: Fraction) -> Dict[str, Any]:
    return {"exact": str(f), "float": float(f)}


def log(msg: str) -> None:
    print(msg, flush=True)


# --------------------------------------------------------------------------------------
# Wall-clock budget with phase deadlines and periodic partial reports
# --------------------------------------------------------------------------------------


class PhaseTimeout(Exception):
    pass


class Clock:
    def __init__(self, total_seconds: float, partial_writer: Callable[[], None], partial_every: float) -> None:
        self.t0 = time.monotonic()
        self.total = total_seconds
        self.deadline = self.t0 + total_seconds
        self.phase_deadline = self.deadline
        self.partial_writer = partial_writer
        self.partial_every = partial_every
        self.last_partial = self.t0
        self._calls = 0

    def elapsed(self) -> float:
        return time.monotonic() - self.t0

    def remaining(self) -> float:
        return self.deadline - time.monotonic()

    def set_phase(self, seconds: float) -> None:
        self.phase_deadline = min(self.deadline, time.monotonic() + max(0.0, seconds))

    def phase_remaining(self) -> float:
        return self.phase_deadline - time.monotonic()

    def tick(self) -> None:
        """Cheap per-polynomial hook: partial report every ``partial_every`` s, phase timeout."""
        self._calls += 1
        if self._calls & 0xF:
            return
        now = time.monotonic()
        if now - self.last_partial >= self.partial_every:
            self.last_partial = now
            self.partial_writer()
        if now >= self.phase_deadline:
            raise PhaseTimeout()


# --------------------------------------------------------------------------------------
# Exact statistics accumulator (integer arithmetic on the hot path)
# --------------------------------------------------------------------------------------

Record = List[Any]  # [num, den, r, witness]


def _better_min(rec: Optional[Record], q: int, d: int) -> bool:
    return rec is None or q * rec[1] < rec[0] * d


def _better_max(rec: Optional[Record], q: int, d: int) -> bool:
    return rec is None or q * rec[1] > rec[0] * d


class Tracker:
    """Records violations and extremal witnesses over every polynomial it sees.

    ``add`` returns the polynomial's own ``(min ISO margin r>=3, min ISO margin at
    descent indices r>=3, max WR ratio)`` as ``(num, den, r)`` triples (or ``None``)
    so that the local search can reuse them as objectives.
    """

    MAX_VIOLATIONS = 100
    HASH_CAP = 3_000_000

    def __init__(self, name: str, track_hashes: bool = True) -> None:
        self.name = name
        self.count = 0
        self.hashes: set = set()
        if not track_hashes:
            self.HASH_CAP = 0
        self.min_margin: Optional[Record] = None
        self.min_desc_margin: Optional[Record] = None
        self.max_wr: Optional[Record] = None
        self.min_tail_ratio: Optional[Record] = None
        self.per_n: Dict[int, Dict[str, Any]] = {}
        self.per_nr: Dict[Tuple[int, int], Record] = {}
        self.family_stats: Dict[str, Dict[str, Any]] = {}
        self.violations: Dict[str, List[Dict[str, Any]]] = {"iso": [], "wr": [], "tail": [], "unimodality": []}
        self.violation_counts: Dict[str, int] = {"iso": 0, "wr": 0, "tail": 0, "unimodality": 0}

    @staticmethod
    def _witness(p: Sequence[int], n: int, edges: Sequence[Tuple[int, int]], family: str, label: str) -> Dict[str, Any]:
        return {"n": n, "family": family, "label": label, "edges": [[int(u), int(v)] for u, v in edges], "poly": [int(c) for c in p]}

    def _violation(self, kind: str, entry: Dict[str, Any]) -> None:
        self.violation_counts[kind] += 1
        if len(self.violations[kind]) < self.MAX_VIOLATIONS:
            self.violations[kind].append(entry)

    def add(self, p: Sequence[int], n: int, edges: Sequence[Tuple[int, int]], family: str, label: str):
        self.count += 1
        if len(self.hashes) < self.HASH_CAP:
            self.hashes.add(hash(tuple(p)))
        fs = self.family_stats.get(family)
        if fs is None:
            fs = self.family_stats[family] = {"count": 0, "min": None, "min_desc": None, "max_wr": None}
        fs["count"] += 1
        pn = self.per_n.get(n)
        if pn is None:
            pn = self.per_n[n] = {"count": 0, "min": None, "min_desc": None, "max_wr": None}
        pn["count"] += 1

        a = len(p) - 1
        L = tail_cutoff(a)
        wit: Optional[Dict[str, Any]] = None

        # unimodality (the Erdős problem itself)
        i = 0
        while i < a and p[i] <= p[i + 1]:
            i += 1
        while i < a and p[i] >= p[i + 1]:
            i += 1
        if i != a:
            wit = wit or self._witness(p, n, edges, family, label)
            self._violation("unimodality", {"n": n, "first_bad_index": i, "witness": wit})

        # prefix 1 <= r <= L-1 (and r <= alpha)
        best_q = best_d = best_r = None
        desc_q = desc_d = desc_r = None
        wr_num = wr_den = wr_r = None
        top = min(L, a + 1)
        for r in range(1, top):
            pr1 = p[r - 1]
            pr = p[r]
            rpr = r * pr
            if pr1 > rpr:
                wit = wit or self._witness(p, n, edges, family, label)
                self._violation("wr", {"n": n, "r": r, "p_r_minus_1": pr1, "r_times_p_r": rpr, "witness": wit})
            if wr_num is None or pr1 * wr_den > wr_num * rpr:
                wr_num, wr_den, wr_r = pr1, rpr, r
            if r < a:
                q = rpr * pr + pr1 * pr1 - (r + 1) * pr1 * p[r + 1]
                if q < 0:
                    wit = wit or self._witness(p, n, edges, family, label)
                    self._violation("iso", {"n": n, "r": r, "Q": q, "witness": wit})
                if r >= 3:
                    d = pr1 * pr
                    cur = self.per_nr.get((n, r))
                    if cur is None or q * cur[1] < cur[0] * d:
                        wit = wit or self._witness(p, n, edges, family, label)
                        self.per_nr[(n, r)] = [q, d, r, wit]
                    if best_q is None or q * best_d < best_q * d:
                        best_q, best_d, best_r = q, d, r
                    if pr <= pr1 and (desc_q is None or q * desc_d < desc_q * d):
                        desc_q, desc_d, desc_r = q, d, r

        # tail theorem range r >= L
        for r in range(L, a):
            if p[r] < p[r + 1]:
                wit = wit or self._witness(p, n, edges, family, label)
                self._violation("tail", {"n": n, "r": r, "p_r": p[r], "p_r_plus_1": p[r + 1], "witness": wit})
            if _better_min(self.min_tail_ratio, p[r], p[r + 1]):
                wit = wit or self._witness(p, n, edges, family, label)
                self.min_tail_ratio = [p[r], p[r + 1], r, wit]

        # extremal records
        if best_q is not None:
            for holder, key in ((self.__dict__, "min_margin"), (pn, "min"), (fs, "min")):
                if _better_min(holder[key], best_q, best_d):
                    wit = wit or self._witness(p, n, edges, family, label)
                    holder[key] = [best_q, best_d, best_r, wit]
        if desc_q is not None:
            for holder, key in ((self.__dict__, "min_desc_margin"), (pn, "min_desc"), (fs, "min_desc")):
                if _better_min(holder[key], desc_q, desc_d):
                    wit = wit or self._witness(p, n, edges, family, label)
                    holder[key] = [desc_q, desc_d, desc_r, wit]
        if wr_num is not None:
            for holder, key in ((self.__dict__, "max_wr"), (pn, "max_wr"), (fs, "max_wr")):
                if _better_max(holder[key], wr_num, wr_den):
                    wit = wit or self._witness(p, n, edges, family, label)
                    holder[key] = [wr_num, wr_den, wr_r, wit]

        return (
            (best_q, best_d, best_r) if best_q is not None else None,
            (desc_q, desc_d, desc_r) if desc_q is not None else None,
            (wr_num, wr_den, wr_r) if wr_num is not None else None,
        )

    def any_violation(self) -> bool:
        return any(v > 0 for v in self.violation_counts.values())


# --------------------------------------------------------------------------------------
# Report helpers
# --------------------------------------------------------------------------------------


RECONSTRUCTIBLE_PREFIXES = ("double_broom", "T3mn", "bush", "star_pendant_paths", "broom", "caterpillar", "multi_arm_star",
                            "subdivided_star", "complete_kary", "two_hub_pendants", "spider", "forest_", "n20_exhaustive")


class WitnessTable:
    """Deduplicated witness storage for the JSON report.

    Edge lists are always kept for witnesses that cannot be rebuilt from their label
    (local search, random trees) and for the extremal records; for label-reconstructible
    structured witnesses of the large per-(n, r) table they are kept up to ``edge_cap``.
    """

    def __init__(self, edge_cap: int = 800) -> None:
        self.ids: Dict[Tuple[int, Tuple[Tuple[int, int], ...]], int] = {}
        self.entries: Dict[str, Dict[str, Any]] = {}
        self.edge_cap = edge_cap
        self.with_edges = 0

    def register(self, wit: Dict[str, Any], keep_poly: bool = False, force_edges: bool = False) -> str:
        key = (wit["n"], tuple(sorted((min(u, v), max(u, v)) for u, v in wit["edges"])))
        wid = self.ids.get(key)
        if wid is None:
            wid = len(self.ids)
            self.ids[key] = wid
            entry: Dict[str, Any] = {"n": wit["n"], "family": wit["family"], "label": wit["label"]}
            reconstructible = wit["family"].startswith(RECONSTRUCTIBLE_PREFIXES)
            if force_edges or not reconstructible or self.with_edges < self.edge_cap:
                entry["edges"] = wit["edges"]
                self.with_edges += 1
            else:
                entry["edges"] = None
                entry["edges_omitted"] = True
            if keep_poly:
                entry["poly"] = wit["poly"]
            self.entries[str(wid)] = entry
        else:
            entry = self.entries[str(wid)]
            if keep_poly and "poly" not in entry:
                entry["poly"] = wit["poly"]
            if force_edges and entry.get("edges") is None:
                entry["edges"] = wit["edges"]
                entry.pop("edges_omitted", None)
        return str(wid)


def record_json(rec: Optional[Record], table: Optional[WitnessTable] = None, keep_poly: bool = False, inline_edges: bool = False) -> Optional[Dict[str, Any]]:
    if rec is None:
        return None
    num, den, r, wit = rec
    out = frac_json(num, den)
    out.update({"r": r, "n": wit["n"], "family": wit["family"], "label": wit["label"]})
    if inline_edges:
        out["edges"] = wit["edges"]
        if keep_poly:
            out["poly"] = wit["poly"]
    elif table is not None:
        out["witness_id"] = table.register(wit, keep_poly=keep_poly, force_edges=True)
    return out


def violations_json(tracker: Tracker, table: WitnessTable) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for kind, entries in tracker.violations.items():
        lst = []
        for e in entries:
            e2 = {k: v for k, v in e.items() if k != "witness"}
            e2["witness"] = {
                "n": e["witness"]["n"],
                "family": e["witness"]["family"],
                "label": e["witness"]["label"],
                "edges": e["witness"]["edges"],
                "poly": e["witness"]["poly"],
            }
            e2["source"] = tracker.name
            lst.append(e2)
        out[kind] = lst
    return out


def canonical_edges(n: int, edges: Sequence[Tuple[int, int]]) -> str:
    adj: List[List[int]] = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    parent = [-1] * n
    seen = [False] * n
    seen[0] = True
    dq = deque([0])
    while dq:
        u = dq.popleft()
        for w in adj[u]:
            if not seen[w]:
                seen[w] = True
                parent[w] = u
                dq.append(w)
    if not all(seen):
        raise ValueError("not connected")
    return canonical_form(parent)


def union_graphs(graphs: Sequence[Graph]) -> Graph:
    n = 0
    edges: Edges = []
    for cn, ce in graphs:
        edges.extend((u + n, v + n) for u, v in ce)
        n += cn
    return n, edges


# --------------------------------------------------------------------------------------
# (a) structured families: generators of (label, n, edges)
# --------------------------------------------------------------------------------------


def in_range(n: int) -> bool:
    return MIN_ORDER <= n <= MAX_ORDER


def gen_star_pendant_paths() -> Iterator[Tuple[str, int, Edges]]:
    """Centre with ``leaves`` leaves and ``k`` pendant paths of length 2 or 3."""
    for n in ORDERS_ALL:
        for ell in (2, 3):
            for k in range(0, (n - 1) // ell + 1):
                leaves = n - 1 - k * ell
                if leaves < 0 or (k == 0 and ell == 3):
                    continue
                g = spider([1] * leaves + [ell] * k)
                yield f"star_pendant_paths(n={n},leaves={leaves},k={k},len={ell})", g[0], g[1]


def gen_spider_mixed() -> Iterator[Tuple[str, int, Edges]]:
    """Spiders with c1, c2, c3, c4 legs of lengths 1..4 (at least one leg of length >= 3)."""
    for n in ORDERS_ALL:
        stride = 1 if n <= 120 else 5
        for c4 in range(0, 3):
            for c3 in range(0, 4):
                if c3 == 0 and c4 == 0:
                    continue
                rest = n - 1 - 4 * c4 - 3 * c3
                if rest < 0:
                    continue
                for c2 in range(0, rest // 2 + 1, stride):
                    c1 = rest - 2 * c2
                    g = spider([1] * c1 + [2] * c2 + [3] * c3 + [4] * c4)
                    yield f"spider(n={n},legs1={c1},legs2={c2},legs3={c3},legs4={c4})", g[0], g[1]
    # uniform spiders with long legs
    for ell in range(2, 40):
        for t in range(2, 100):
            n = 1 + t * ell
            if n > MAX_ORDER:
                break
            if n < MIN_ORDER or ell in (2, 3):
                continue
            g = spider([ell] * t)
            yield f"spider_uniform(n={n},legs={t},len={ell})", g[0], g[1]


def gen_broom() -> Iterator[Tuple[str, int, Edges]]:
    for n in ORDERS_ALL:
        stride = 1 if n <= 120 else 2
        for path_len in range(1, n, stride):
            g = broom(path_len, n - path_len)
            yield f"broom(n={n},path_len={path_len},leaves={n - path_len})", g[0], g[1]


def gen_double_broom() -> Iterator[Tuple[str, int, Edges]]:
    for n in ORDERS_ALL:
        step = 1 if n <= 120 else max(1, n // 60)
        for k in range(1, 7):
            m = n - k
            if m < 2:
                continue
            a_values = set(range(1, m // 2 + 1, step))
            a_values.add(m // 2)
            for a in sorted(a_values):
                b = m - a
                g = double_broom(a, k, b)
                yield f"double_broom(a={a},k={k},b={b})", g[0], g[1]


def gen_caterpillar() -> Iterator[Tuple[str, int, Edges]]:
    """Caterpillars with 3-4 hubs (uniform / non-uniform spacing) and balanced caterpillars."""
    D3 = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80]
    D4 = [1, 2, 4, 8, 16, 32, 64]
    for s in range(0, 4):
        for d1 in D3:
            for d2 in D3:
                for d3 in D3:
                    if d1 > d3:
                        continue
                    n = 3 + 2 * s + d1 + d2 + d3
                    if not in_range(n):
                        continue
                    counts = [d1] + [0] * s + [d2] + [0] * s + [d3]
                    g = caterpillar(counts)
                    yield f"caterpillar(hubs=[{d1},{d2},{d3}],spacing={s})", g[0], g[1]
        for d1, d2, d3, d4 in product(D4, repeat=4):
            if (d1, d2) > (d4, d3):
                continue
            n = 4 + 3 * s + d1 + d2 + d3 + d4
            if not in_range(n):
                continue
            counts = [d1] + [0] * s + [d2] + [0] * s + [d3] + [0] * s + [d4]
            g = caterpillar(counts)
            yield f"caterpillar(hubs=[{d1},{d2},{d3},{d4}],spacing={s})", g[0], g[1]
    D3b = [1, 2, 4, 8, 16, 32]
    for s1 in range(0, 3):
        for s2 in range(0, 3):
            if s1 == s2:
                continue
            for d1, d2, d3 in product(D3b, repeat=3):
                n = 3 + s1 + s2 + d1 + d2 + d3
                if not in_range(n):
                    continue
                counts = [d1] + [0] * s1 + [d2] + [0] * s2 + [d3]
                g = caterpillar(counts)
                yield f"caterpillar(hubs=[{d1},{d2},{d3}],spacings=[{s1},{s2}])", g[0], g[1]
    for h in range(2, 7):
        for s in range(0, 4):
            for d in range(1, MAX_ORDER):
                n = h + (h - 1) * s + h * d
                if n > MAX_ORDER:
                    break
                if n < MIN_ORDER:
                    continue
                counts: List[int] = []
                for i in range(h):
                    counts.append(d)
                    if i < h - 1:
                        counts.extend([0] * s)
                g = caterpillar(counts)
                yield f"caterpillar_balanced(hubs={h},degree={d},spacing={s})", g[0], g[1]


def gen_bush() -> Iterator[Tuple[str, int, Edges]]:
    for pendant_len in (1, 2, 3):
        for length in range(2, 6):
            for counts in combinations_with_replacement(range(1, 13), length):
                n = 1 + length + sum(counts) * (1 + pendant_len)
                if not in_range(n):
                    continue
                g = bush(list(counts), pendant_len)
                yield f"bush(counts={list(counts)},pendant_len={pendant_len})", g[0], g[1]


def gen_T3mn() -> Iterator[Tuple[str, int, Edges]]:
    for m in range(1, 13):
        for nn in range(m, 13):
            g = T3mn(m, nn)
            if in_range(g[0]):
                yield f"T3mn(m={m},n={nn})", g[0], g[1]
            g = T3mn_star(m, nn)
            if in_range(g[0]):
                yield f"T3mn_star(m={m},n={nn})", g[0], g[1]


def gen_multi_arm_star() -> Iterator[Tuple[str, int, Edges]]:
    leaf_choices = list(range(1, 13)) + [16, 20, 30, 40, 50]
    for t in range(2, 9):
        for k in range(1, 5):
            for ell in leaf_choices:
                for c in (0, 1, 2, 4, 8, 16, 32):
                    n = 1 + c + t * (k + ell)
                    if not in_range(n):
                        continue
                    arms = [(k, ell)] * t + [(1, 0)] * c
                    g = multi_arm_star(arms)
                    yield f"multi_arm_star(arms={t},arm_len={k},arm_leaves={ell},centre_leaves={c})", g[0], g[1]
    for t1 in range(1, 4):
        for t2 in range(1, 4):
            for k1 in (1, 2):
                for k2 in (1, 2):
                    for l1 in (2, 4, 8, 16):
                        for l2 in (2, 4, 8, 16):
                            if (k1, l1) >= (k2, l2):
                                continue
                            n = 1 + t1 * (k1 + l1) + t2 * (k2 + l2)
                            if not in_range(n):
                                continue
                            g = multi_arm_star([(k1, l1)] * t1 + [(k2, l2)] * t2)
                            yield f"multi_arm_star_mixed(arms=[{t1}x({k1},{l1}),{t2}x({k2},{l2})])", g[0], g[1]


def gen_complete_kary() -> Iterator[Tuple[str, int, Edges]]:
    for k in range(2, 13):
        for d in range(1, 12):
            n = (k ** (d + 1) - 1) // (k - 1)
            if n > MAX_ORDER:
                break
            if n < MIN_ORDER:
                continue
            yield f"perfect_kary(k={k},depth={d},n={n})", n, [((i - 1) // k, i) for i in range(1, n)]
    for k in range(2, 7):
        for n in ORDERS_ALL:
            yield f"complete_kary(k={k},n={n})", n, [((i - 1) // k, i) for i in range(1, n)]


def gen_subdivided_star() -> Iterator[Tuple[str, int, Edges]]:
    for m in range(1, MAX_ORDER):
        n = 1 + 2 * m
        if n > MAX_ORDER:
            break
        if in_range(n):
            g = spider([2] * m)
            yield f"subdivided_star(m={m})", g[0], g[1]
    for m in range(1, MAX_ORDER):
        n = 1 + 3 * m
        if n > MAX_ORDER:
            break
        if in_range(n):
            g = spider([3] * m)
            yield f"twice_subdivided_star(m={m})", g[0], g[1]


def two_hub(a: int, c: int, k: int, b: int, d: int) -> Graph:
    """Hubs joined by a path of ``k`` vertices; hub 1 has ``a`` leaves and ``c`` pendant P2's,
    hub 2 has ``b`` leaves and ``d`` pendant P2's."""
    tb = TreeBuilder()
    u = tb.root()
    for _ in range(a):
        tb.attach(u)
    for _ in range(c):
        tb.attach_path(u, 2)
    w = tb.attach_path(u, k - 1) if k > 1 else u
    for _ in range(b):
        tb.attach(w)
    for _ in range(d):
        tb.attach_path(w, 2)
    return tb.graph()


def gen_two_hub_pendants() -> Iterator[Tuple[str, int, Edges]]:
    for n in (30, 40, 50, 60, 80, 100, 120):
        for k in range(1, 5):
            for c in (0, 1, 2, 4):
                for d in (0, 1, 2, 4):
                    if c > d or (c == 0 and d == 0):
                        continue
                    rest = n - k - 2 * c - 2 * d
                    if rest < 0:
                        continue
                    for a in range(0, rest + 1):
                        b = rest - a
                        if c == d and a > b:
                            continue
                        g = two_hub(a, c, k, b, d)
                        yield f"two_hub_pendants(a={a},p2_a={c},k={k},b={b},p2_b={d})", g[0], g[1]


STRUCTURED_FAMILIES: List[Tuple[str, Callable[[], Iterator[Tuple[str, int, Edges]]]]] = [
    ("double_broom", gen_double_broom),
    ("T3mn", gen_T3mn),
    ("bush", gen_bush),
    ("star_pendant_paths", gen_star_pendant_paths),
    ("broom", gen_broom),
    ("caterpillar", gen_caterpillar),
    ("multi_arm_star", gen_multi_arm_star),
    ("subdivided_star", gen_subdivided_star),
    ("complete_kary", gen_complete_kary),
    ("two_hub_pendants", gen_two_hub_pendants),
    ("spider", gen_spider_mixed),
]


# --------------------------------------------------------------------------------------
# (b) local search
# --------------------------------------------------------------------------------------


class TreeState:
    def __init__(self, n: int, edges: Iterable[Tuple[int, int]]) -> None:
        self.n = n
        self.adj: List[set] = [set() for _ in range(n)]
        for u, v in edges:
            self.adj[u].add(v)
            self.adj[v].add(u)

    def edge_list(self) -> Edges:
        adj = self.adj
        return [(u, v) for u in range(self.n) for v in adj[u] if u < v]

    def snapshot(self) -> List[set]:
        return [set(s) for s in self.adj]

    def side(self, v: int, u: int, limit: int) -> Optional[set]:
        """Vertices on ``v``'s side of the edge ``(u, v)``; ``None`` if more than ``limit``."""
        seen = {v}
        stack = [v]
        while stack:
            x = stack.pop()
            for y in self.adj[x]:
                if x == v and y == u:
                    continue
                if y not in seen:
                    if len(seen) >= limit:
                        return None
                    seen.add(y)
                    stack.append(y)
        return seen

    def target(self, rng: random.Random, excluded: set, mode: str) -> Optional[int]:
        n = self.n
        adj = self.adj
        if mode == "hub":
            order = sorted(range(n), key=lambda x: -len(adj[x]))
            for w in order[:3]:
                if w not in excluded:
                    return w
            return None
        weights = [len(adj[x]) for x in range(n)] if mode == "pref" else None
        for _ in range(64):
            w = rng.choices(range(n), weights=weights)[0] if weights else rng.randrange(n)
            if w not in excluded:
                return w
        return None

    def reattach(self, v: int, u: int, w: int) -> None:
        self.adj[v].discard(u)
        self.adj[u].discard(v)
        self.adj[v].add(w)
        self.adj[w].add(v)

    def random_move(self, rng: random.Random) -> str:
        n = self.n
        adj = self.adj
        x = rng.random()
        mode = "uniform" if rng.random() < 0.5 else "pref"
        if x < 0.5:  # leaf prune-regraft
            leaves = [v for v in range(n) if len(adj[v]) == 1]
            v = rng.choice(leaves)
            u = next(iter(adj[v]))
            w = self.target(rng, {v, u}, mode)
            if w is None:
                return "noop"
            self.reattach(v, u, w)
            return "leaf"
        if x < 0.8:  # small-subtree prune-regraft
            v = rng.randrange(n)
            u = rng.choice(tuple(adj[v]))
            side = self.side(v, u, 8)
            if side is None:
                side = self.side(u, v, 8)
                if side is None:
                    return "noop"
                u, v = v, u
            excluded = set(side)
            excluded.add(u)
            w = self.target(rng, excluded, mode)
            if w is None:
                return "noop"
            self.reattach(v, u, w)
            return "subtree"
        if x < 0.9:  # contract an internal edge; the freed vertex becomes a leaf elsewhere
            internal = [v for v in range(n) if len(adj[v]) >= 2]
            if not internal:
                return "noop"
            v = rng.choice(internal)
            nbrs = [u for u in adj[v] if len(adj[u]) >= 2]
            if not nbrs:
                return "noop"
            u = rng.choice(nbrs)
            for y in list(adj[v]):
                if y == u:
                    continue
                adj[v].discard(y)
                adj[y].discard(v)
                adj[y].add(u)
                adj[u].add(y)
            w = self.target(rng, {v, u}, mode)
            if w is not None:
                self.reattach(v, u, w)
            return "contract"
        leaves = [v for v in range(n) if len(adj[v]) == 1]  # leaf to a hub
        v = rng.choice(leaves)
        u = next(iter(adj[v]))
        w = self.target(rng, {v, u}, "hub")
        if w is None:
            return "noop"
        self.reattach(v, u, w)
        return "leaf_to_hub"


class TopK:
    def __init__(self, k: int = 10) -> None:
        self.k = k
        self.items: Dict[str, Tuple[Fraction, int, str, Edges]] = {}
        self.worst: Optional[Fraction] = None

    def offer(self, value: Fraction, r: int, n: int, edges: Edges, label: str) -> None:
        if len(self.items) >= self.k and self.worst is not None and value >= self.worst:
            return
        try:
            canon = canonical_edges(n, edges)
        except ValueError:
            return
        if canon in self.items:
            return
        self.items[canon] = (value, r, label, list(edges))
        if len(self.items) > self.k:
            worst_key = max(self.items, key=lambda c: self.items[c][0])
            del self.items[worst_key]
        self.worst = max(v[0] for v in self.items.values())

    def to_json(self, value_name: str) -> List[Dict[str, Any]]:
        out = []
        for canon, (value, r, label, edges) in sorted(self.items.items(), key=lambda kv: kv[1][0]):
            out.append({value_name: str(value), "float": float(value), "r": r, "label": label, "n": len(edges) + 1, "edges": [list(e) for e in edges]})
        return out


def objective_from_stats(kind: str, stats) -> Tuple[Fraction, Optional[int]]:
    best, desc, wr = stats
    if kind == "iso":
        return (Fraction(best[0], best[1]), best[2]) if best else (SENTINEL, None)
    if kind == "iso_desc":
        return (Fraction(desc[0], desc[1]), desc[2]) if desc else (SENTINEL, None)
    if kind == "wr":
        return (Fraction(-wr[0], wr[1]), wr[2]) if wr else (SENTINEL, None)
    raise ValueError(kind)


SA_TEMPERATURES = {"iso": (0.15, 0.001), "iso_desc": (0.15, 0.001), "wr": (0.01, 0.0001)}


def anneal(
    n: int,
    start: Edges,
    kind: str,
    seconds: float,
    rng: random.Random,
    tracker: Tracker,
    clock: Clock,
    topk: TopK,
    label: str,
) -> Dict[str, Any]:
    state = TreeState(n, start)
    edges = state.edge_list()
    p = indpoly_forest(n, edges)
    cur, cur_r = objective_from_stats(kind, tracker.add(p, n, edges, "local_search", label + "[start]"))
    best, best_r, best_edges = cur, cur_r, edges
    topk.offer(cur, cur_r if cur_r is not None else -1, n, edges, label + "[start]")
    T0, T1 = SA_TEMPERATURES[kind]
    t_start = time.monotonic()
    iters = evals = accepted = improvements = 0
    move_counts: Dict[str, int] = {}
    timed_out = False
    try:
        while True:
            frac = (time.monotonic() - t_start) / seconds if seconds > 0 else 1.0
            if frac >= 1.0:
                break
            temp = T0 * (T1 / T0) ** frac
            iters += 1
            snap = state.snapshot()
            mv = state.random_move(rng)
            move_counts[mv] = move_counts.get(mv, 0) + 1
            if mv == "noop":
                continue
            edges = state.edge_list()
            try:
                p = indpoly_forest(n, edges)
            except ValueError:
                state.adj = snap
                continue
            evals += 1
            val, val_r = objective_from_stats(kind, tracker.add(p, n, edges, "local_search", f"{label}[iter={iters}]"))
            clock.tick()
            delta = float(val - cur)
            if delta <= 0 or rng.random() < math.exp(-delta / temp):
                cur, cur_r = val, val_r
                accepted += 1
                if val < best:
                    best, best_r, best_edges = val, val_r, edges
                    improvements += 1
                topk.offer(val, val_r if val_r is not None else -1, n, edges, f"{label}[iter={iters}]")
            else:
                state.adj = snap
    except PhaseTimeout:
        timed_out = True
    value_name = "max_wr_ratio" if kind == "wr" else "min_margin"
    best_report = -best if kind == "wr" else best
    return {
        "n": n,
        "objective": kind,
        "label": label,
        "seconds": round(time.monotonic() - t_start, 2),
        "iterations": iters,
        "evaluations": evals,
        "accepted": accepted,
        "improvements": improvements,
        "moves": move_counts,
        "timed_out": timed_out,
        value_name: str(best_report) if best != SENTINEL else None,
        "float": float(best_report) if best != SENTINEL else None,
        "r": best_r,
        "best_edges": [list(e) for e in best_edges],
    }


# --------------------------------------------------------------------------------------
# Main driver
# --------------------------------------------------------------------------------------


class Search:
    def __init__(self, args: argparse.Namespace) -> None:
        self.args = args
        self.seed = args.seed
        self.rng = random.Random(args.seed)
        self.trees = Tracker("trees")  # structured + random + local search (orders 20..300)
        self.forests = Tracker("forests")
        self.trend = Tracker("double_broom_trend", track_hashes=False)
        self.n20 = Tracker("n20_exhaustive", track_hashes=False)
        self.phase_log: List[Dict[str, Any]] = []
        self.structured: Dict[str, Any] = {}
        self.random_report: Dict[str, Any] = {}
        self.local_search_runs: List[Dict[str, Any]] = []
        self.local_search_comparison: Dict[str, Any] = {}
        self.topk: Dict[Tuple[int, str], TopK] = {}
        self.forest_report: Dict[str, Any] = {}
        self.trend_report: Dict[str, Any] = {}
        self.n20_report: Dict[str, Any] = {"status": "not_run"}
        self.star_r2: Dict[str, Any] = {}
        self.partial_writes = 0
        self.status = "running"
        self.total_seconds = args.minutes * 60.0
        self.clock = Clock(self.total_seconds, self.write_partial, args.partial_every)

    # ---------------- report ----------------

    def all_trackers(self) -> List[Tracker]:
        return [self.trees, self.forests, self.trend, self.n20]

    def build_payload(self, status: str) -> Dict[str, Any]:
        table = WitnessTable()
        trees, forests = self.trees, self.forests

        def overall_min(key: str, better) -> Tuple[Optional[Record], Optional[str]]:
            best, src = None, None
            for tr in (trees, forests):
                rec = getattr(tr, key)
                if rec is not None and (best is None or better(best, rec[0], rec[1])):
                    best, src = rec, tr.name
            return best, src

        gmin, gmin_src = overall_min("min_margin", _better_min)
        gdesc, gdesc_src = overall_min("min_desc_margin", _better_min)
        gwr, gwr_src = overall_min("max_wr", _better_max)

        per_n_minima: Dict[str, Any] = {}
        for n in sorted(trees.per_n):
            pn = trees.per_n[n]
            rec = pn["min"]
            entry: Dict[str, Any] = {"count": pn["count"]}
            if rec is not None:
                entry["min_margin_r3plus"] = str(Fraction(rec[0], rec[1]))
                entry["min_margin_r3plus_float"] = float(Fraction(rec[0], rec[1]))
                entry["argmin_r"] = rec[2]
                entry["family"] = rec[3]["family"]
                entry["label"] = rec[3]["label"]
                entry["witness_id"] = table.register(rec[3], keep_poly=True, force_edges=True)
            rec = pn["min_desc"]
            if rec is not None:
                entry["min_margin_r3plus_at_descent"] = str(Fraction(rec[0], rec[1]))
                entry["min_margin_r3plus_at_descent_float"] = float(Fraction(rec[0], rec[1]))
                entry["argmin_r_at_descent"] = rec[2]
                entry["label_at_descent"] = rec[3]["label"]
                entry["witness_id_at_descent"] = table.register(rec[3], force_edges=True)
            rec = pn["max_wr"]
            if rec is not None:
                entry["max_wr_ratio"] = str(Fraction(rec[0], rec[1]))
                entry["max_wr_ratio_float"] = float(Fraction(rec[0], rec[1]))
                entry["argmax_wr_r"] = rec[2]
                entry["label_wr"] = rec[3]["label"]
                entry["witness_id_wr"] = table.register(rec[3], force_edges=True)
            per_n_minima[str(n)] = entry

        per_nr: Dict[str, Dict[str, Any]] = {}
        for (n, r) in sorted(trees.per_nr):
            num, den, _r, wit = trees.per_nr[(n, r)]
            per_nr.setdefault(str(n), {})[str(r)] = {
                "margin": str(Fraction(num, den)),
                "float": float(Fraction(num, den)),
                "family": wit["family"],
                "label": wit["label"],
                "witness_id": table.register(wit),
            }

        forest_per_n: Dict[str, Any] = {}
        for n in sorted(forests.per_n):
            pn = forests.per_n[n]
            forest_per_n[str(n)] = {
                "count": pn["count"],
                "min_margin_r3plus": record_json(pn["min"], table),
                "min_margin_r3plus_at_descent": record_json(pn["min_desc"], table),
                "max_wr_ratio": record_json(pn["max_wr"], table),
            }

        def family_json(tr: Tracker) -> Dict[str, Any]:
            out = {}
            for fam, fs in sorted(tr.family_stats.items()):
                out[fam] = {
                    "count": fs["count"],
                    "min_margin_r3plus": record_json(fs["min"], table),
                    "min_margin_r3plus_at_descent": record_json(fs["min_desc"], table),
                    "max_wr_ratio": record_json(fs["max_wr"], table),
                }
            return out

        violations: Dict[str, List[Any]] = {"iso": [], "wr": [], "tail": [], "unimodality": []}
        violation_counts: Dict[str, int] = {"iso": 0, "wr": 0, "tail": 0, "unimodality": 0}
        for tr in self.all_trackers():
            vj = violations_json(tr, table)
            for kind in violations:
                violations[kind].extend(vj[kind])
                violation_counts[kind] += tr.violation_counts[kind]

        search_polys = trees.count + forests.count
        total_all = search_polys + self.trend.count + self.n20.count
        elapsed = self.clock.elapsed()

        topk_json: Dict[str, Dict[str, Any]] = {}
        for (n, kind), tk in sorted(self.topk.items()):
            topk_json.setdefault(str(n), {})[kind] = tk.to_json("max_wr_ratio_negated" if kind == "wr" else "min_margin")

        summary: Dict[str, Any] = {
            "total_polys": search_polys,
            "total_polys_by_phase": {
                "trees_structured_random_local_search": trees.count,
                "forests": forests.count,
                "double_broom_trend": self.trend.count,
                "n20_exhaustive_check": self.n20.count,
            },
            "total_polys_all_phases": total_all,
            "distinct_poly_hashes_trees": len(trees.hashes),
            "distinct_poly_hashes_forests": len(forests.hashes),
            "min_margin_r3plus": record_json(gmin, table, keep_poly=True, inline_edges=True),
            "min_margin_r3plus_source": gmin_src,
            "min_margin_r3plus_trees_only": record_json(trees.min_margin, table, keep_poly=True),
            "min_margin_r3plus_forests_only": record_json(forests.min_margin, table, keep_poly=True),
            "min_margin_r3plus_at_descent": record_json(gdesc, table, keep_poly=True, inline_edges=True),
            "min_margin_r3plus_at_descent_source": gdesc_src,
            "max_wr_ratio": record_json(gwr, table, keep_poly=True, inline_edges=True),
            "max_wr_ratio_source": gwr_src,
            "min_tail_ratio_trees": record_json(trees.min_tail_ratio, table),
            "min_tail_ratio_forests": record_json(forests.min_tail_ratio, table),
            "per_n_minima": per_n_minima,
            "double_broom_r4_trend": self.trend_report,
            "star_r2_margin_reference": self.star_r2,
            "n20_exhaustive_check": self.n20_report,
            "iso_violations": violations["iso"],
            "wr_violations": violations["wr"],
            "tail_violations": violations["tail"],
            "unimodality_violations": violations["unimodality"],
            "violation_counts": violation_counts,
            "any_violation": any(v > 0 for v in violation_counts.values()),
            "status": status,
            "budget": {"minutes_requested": self.args.minutes, "seconds_elapsed": round(elapsed, 1)},
        }

        payload: Dict[str, Any] = {
            "title": "Heuristic adversarial search for negative/small ISO margins, WR/TAIL failures and non-unimodality (trees and forests, orders 20..300)",
            "status": status,
            "definitions": {
                "L": "ceil((2*alpha-1)/3)",
                "WR_r": "p[r-1] <= r*p[r] for 1 <= r <= L-1; ratio w_r = p[r-1]/(r*p[r])",
                "ISO_r": "Q_r = r*p[r]^2 + p[r-1]^2 - (r+1)*p[r-1]*p[r+1] >= 0 for 1 <= r <= L-1",
                "iso_margin": "m_r = Q_r/(p[r-1]*p[r]) (exact Fraction)",
                "min_margin_r3plus": "min over 3 <= r <= L-1 of m_r",
                "descent_index": "r with p[r] <= p[r-1]",
                "TAIL": "p[r] >= p[r+1] for L <= r <= alpha-1",
                "orders": "trees/forests of orders 20..300 (trend phase additionally uses 320 and 640)",
            },
            "budget": {
                "minutes_requested": self.args.minutes,
                "seconds_total": self.total_seconds,
                "seconds_elapsed": round(elapsed, 1),
                "seed": self.seed,
                "partial_writes": self.partial_writes,
                "phase_log": self.phase_log,
            },
            "summary": summary,
            "iso_violations": violations["iso"],
            "wr_violations": violations["wr"],
            "tail_violations": violations["tail"],
            "unimodality_violations": violations["unimodality"],
            "structured_families": {
                "orders_fine": [ORDERS_FINE[0], ORDERS_FINE[-1]],
                "orders_coarse": ORDERS_COARSE,
                "sweeps": self.structured,
                "family_stats": family_json(trees),
            },
            "random_trees": self.random_report,
            "local_search": {
                "orders": SA_ORDERS,
                "objectives": {
                    "iso": "minimise min_{3<=r<=L-1} m_r",
                    "iso_desc": "minimise min m_r over descent indices 3<=r<=L-1 (p[r] <= p[r-1])",
                    "wr": "maximise max_{1<=r<=L-1} w_r",
                },
                "moves": "leaf prune-regraft (uniform / degree-preferential target), small-subtree (<=8 vertices) prune-regraft, internal-edge contraction, leaf-to-hub",
                "runs": self.local_search_runs,
                "per_n_comparison_with_structured": self.local_search_comparison,
                "top_witnesses_by_canonical_form": topk_json,
            },
            "forests": {**self.forest_report, "per_n": forest_per_n, "family_stats": family_json(forests)},
            "per_n_r_minima": per_nr,
            "witnesses": table.entries,
            "caveat": "Heuristic search over finite orders: falsification evidence only; it proves nothing about all forests.",
            "provenance": provenance(os.path.abspath(__file__)),
        }
        return payload

    def write(self, status: str) -> str:
        payload = self.build_payload(status)
        digest = write_report(self.args.out, payload)
        return digest

    def write_partial(self) -> None:
        try:
            self.partial_writes += 1
            digest = self.write("partial")
            log(f"[{self.clock.elapsed():7.1f}s] partial report written ({self.args.out}) SHA256 {digest}")
        except Exception:  # never let reporting kill the search
            log("[partial report failed]\n" + traceback.format_exc())

    def phase(self, name: str, **info: Any) -> None:
        entry = {"phase": name, "t_start": round(self.clock.elapsed(), 1)}
        entry.update(info)
        self.phase_log.append(entry)

    def phase_done(self, **info: Any) -> None:
        self.phase_log[-1]["t_end"] = round(self.clock.elapsed(), 1)
        self.phase_log[-1].update(info)

    # ---------------- (a) structured ----------------

    def run_structured(self, cap_seconds: float) -> None:
        self.phase("structured_families", cap_seconds=round(cap_seconds, 1))
        self.clock.set_phase(cap_seconds)
        stopped = False
        for fam, gen_fn in STRUCTURED_FAMILIES:
            if stopped or self.clock.phase_remaining() <= 0:
                self.structured[fam] = {"count": 0, "status": "skipped_by_time"}
                continue
            t0 = time.monotonic()
            count = 0
            skipped = 0
            errors: List[str] = []
            status = "complete"
            try:
                for label, n, edges in gen_fn():
                    if not in_range(n):
                        skipped += 1
                        continue
                    try:
                        p = indpoly_forest(n, edges)
                    except Exception as exc:  # malformed construction: record and continue
                        if len(errors) < 10:
                            errors.append(f"{label}: {exc!r}")
                        continue
                    self.trees.add(p, n, edges, fam, label)
                    count += 1
                    self.clock.tick()
            except PhaseTimeout:
                status = "truncated_by_time"
                stopped = True
            except Exception:
                status = "error"
                errors.append(traceback.format_exc())
            fs = self.trees.family_stats.get(fam)
            self.structured[fam] = {
                "count": count,
                "skipped_out_of_range": skipped,
                "status": status,
                "seconds": round(time.monotonic() - t0, 1),
                "errors": errors,
            }
            if fs and fs["min"]:
                m = Fraction(fs["min"][0], fs["min"][1])
                w = Fraction(fs["max_wr"][0], fs["max_wr"][1]) if fs["max_wr"] else None
                log(
                    f"[{self.clock.elapsed():7.1f}s] structured {fam:20s} count={count:6d} status={status} "
                    f"min_m(r>=3)={float(m):.6f} @ n={fs['min'][3]['n']} r={fs['min'][2]} {fs['min'][3]['label']} "
                    f"max_wr={float(w) if w is not None else None:.4f}"
                )
            else:
                log(f"[{self.clock.elapsed():7.1f}s] structured {fam:20s} count={count} status={status}")
        self.phase_done(polys=self.trees.count)

    # ---------------- star r=2 reference ----------------

    def run_star_reference(self) -> None:
        out = {}
        for n in STAR_R2_ORDERS:
            gn, edges = star(n)
            p = indpoly_forest(gn, edges)
            m2 = Fraction(2 * p[2] * p[2] + p[1] * p[1] - 3 * p[1] * p[3], p[1] * p[2])
            formula = Fraction(2, n) + Fraction(2 * n, (n - 1) * (n - 2))
            L = tail_cutoff(len(p) - 1)
            m_min = min((Fraction(r * p[r] * p[r] + p[r - 1] * p[r - 1] - (r + 1) * p[r - 1] * p[r + 1], p[r - 1] * p[r]), r) for r in range(3, L))
            out[str(n)] = {
                "m2": fraction_json(m2),
                "formula_2_over_n_plus_2n_over_(n-1)(n-2)": fraction_json(formula),
                "formula_matches": m2 == formula,
                "min_margin_r3plus": fraction_json(m_min[0]),
                "argmin_r3plus": m_min[1],
            }
        out["note"] = "m_2(K_{1,n-1}) = 2/n + 2n/((n-1)(n-2)) -> 0 is proved positive; r=2 is excluded from the adversarial objective"
        self.star_r2 = out

    # ---------------- n=20 exhaustive cross-check ----------------

    def run_n20_check(self, cap_seconds: float) -> None:
        self.phase("n20_exhaustive_check", cap_seconds=round(cap_seconds, 1))
        self.clock.set_phase(cap_seconds)
        n = 20
        t0 = time.monotonic()
        count = 0
        best3: Optional[Tuple[int, int, List[int]]] = None
        best4: Optional[Tuple[int, int, List[int]]] = None
        best_all: Optional[Tuple[int, int, int, List[int]]] = None
        status = "complete"
        try:
            for layout in free_tree_layouts(n):
                parent = layout_to_parent(layout)
                p = indpoly_parent_array(parent)
                count += 1
                self.n20.add(p, n, parent_to_edges(parent), "n20_exhaustive", f"level_sequence={layout}")
                q3 = 3 * p[3] * p[3] + p[2] * p[2] - 4 * p[2] * p[4]
                d3 = p[2] * p[3]
                if best3 is None or q3 * best3[1] < best3[0] * d3:
                    best3 = (q3, d3, list(layout))
                q4 = 4 * p[4] * p[4] + p[3] * p[3] - 5 * p[3] * p[5]
                d4 = p[3] * p[4]
                if best4 is None or q4 * best4[1] < best4[0] * d4:
                    best4 = (q4, d4, list(layout))
                L = tail_cutoff(len(p) - 1)
                for r in range(3, L):
                    q = r * p[r] * p[r] + p[r - 1] * p[r - 1] - (r + 1) * p[r - 1] * p[r + 1]
                    d = p[r - 1] * p[r]
                    if best_all is None or q * best_all[1] < best_all[0] * d:
                        best_all = (q, d, r, list(layout))
                self.clock.tick()
        except PhaseTimeout:
            status = "truncated_by_time"

        # identify the argmin trees among double brooms of order 20 by canonical form
        db_canon: Dict[str, str] = {}
        for k in range(1, 10):
            for a in range(1, n - k):
                b = n - k - a
                if b < 1:
                    continue
                gn, ge = double_broom(a, k, b)
                db_canon.setdefault(canonical_edges(gn, ge), f"double_broom(a={a},k={k},b={b})")

        def describe(best, expected: Optional[Fraction], key: str) -> Dict[str, Any]:
            if best is None:
                return {"status": "not_available"}
            q, d, layout = best[0], best[1], best[-1]
            f = Fraction(q, d)
            parent = layout_to_parent(layout)
            edges = parent_to_edges(parent)
            canon = canonical_form(parent)
            rec = self.trees.per_nr.get((n, int(key)))
            out = {
                "exact": str(f),
                "float": float(f),
                "argmin_level_sequence": layout,
                "argmin_edges": [list(e) for e in edges],
                "argmin_identified_as": db_canon.get(canon, "not a double broom with k<=9"),
                "structured_sweep_min_at_n20": str(Fraction(rec[0], rec[1])) if rec else None,
                "structured_sweep_matches_exhaustive": (Fraction(rec[0], rec[1]) == f) if rec else None,
            }
            if expected is not None:
                out["expected"] = str(expected)
                out["matches_expected"] = f == expected
            return out

        self.n20_report = {
            "status": status,
            "trees_enumerated": count,
            "oeis_A000055_n20": A000055[20],
            "count_matches_oeis": count == A000055[20],
            "seconds": round(time.monotonic() - t0, 1),
            "min_m3": describe(best3, EXPECTED_N20_MIN_M3, "3"),
            "min_m4": describe(best4, EXPECTED_N20_MIN_M4_HINT, "4"),
            "min_margin_r3plus": (
                {"exact": str(Fraction(best_all[0], best_all[1])), "float": float(Fraction(best_all[0], best_all[1])), "argmin_r": best_all[2], "argmin_level_sequence": best_all[3]}
                if best_all
                else None
            ),
            "violations_in_n20_exhaustive": dict(self.n20.violation_counts),
            "note_on_m4_hint": "the hint for the m_4 argmin was uncertain (a=10?,k=3,b=9 would have order 22); the minimum is recomputed exhaustively here and its argmin identified by canonical form",
        }
        r = self.n20_report
        log(
            f"[{self.clock.elapsed():7.1f}s] n=20 exhaustive: {count} trees (oeis_ok={r['count_matches_oeis']}) status={status} "
            f"min_m3={r['min_m3'].get('exact')} ({r['min_m3'].get('argmin_identified_as')}, expected_ok={r['min_m3'].get('matches_expected')}) "
            f"min_m4={r['min_m4'].get('exact')} ({r['min_m4'].get('argmin_identified_as')}, hint_ok={r['min_m4'].get('matches_expected')}) "
            f"violations={dict(self.n20.violation_counts)}"
        )
        self.phase_done(polys=count, status=status)

    # ---------------- double broom r=4 trend ----------------

    def run_trend(self, cap_seconds: float) -> None:
        self.phase("double_broom_r4_trend", cap_seconds=round(cap_seconds, 1))
        self.clock.set_phase(cap_seconds)
        per_n: Dict[str, Any] = {}
        status = "complete"
        try:
            for n in TREND_ORDERS:
                m = n - 3
                best4: Optional[Tuple[int, int, int, int]] = None
                best3: Optional[Tuple[int, int, int, int]] = None
                best_all: Optional[Tuple[int, int, int, int, int]] = None
                count = 0
                for a in range(1, m // 2 + 1):
                    b = m - a
                    gn, ge = double_broom(a, 3, b)
                    p = indpoly_forest(gn, ge)
                    stats = self.trend.add(p, gn, ge, "double_broom_trend", f"double_broom(a={a},k=3,b={b})")
                    count += 1
                    q4 = 4 * p[4] * p[4] + p[3] * p[3] - 5 * p[3] * p[5]
                    d4 = p[3] * p[4]
                    if best4 is None or q4 * best4[1] < best4[0] * d4:
                        best4 = (q4, d4, a, b)
                    q3 = 3 * p[3] * p[3] + p[2] * p[2] - 4 * p[2] * p[4]
                    d3 = p[2] * p[3]
                    if best3 is None or q3 * best3[1] < best3[0] * d3:
                        best3 = (q3, d3, a, b)
                    if stats[0] is not None:
                        bq, bd, br = stats[0]
                        if best_all is None or bq * best_all[1] < best_all[0] * bd:
                            best_all = (bq, bd, br, a, b)
                    self.clock.tick()
                f4 = Fraction(best4[0], best4[1])
                f3 = Fraction(best3[0], best3[1])
                fa = Fraction(best_all[0], best_all[1])
                per_n[str(n)] = {
                    "splits_examined": count,
                    "min_m4": {"exact": str(f4), "float": float(f4), "a": best4[2], "k": 3, "b": best4[3], "excess_over_7_8": float(f4 - Fraction(7, 8))},
                    "min_m3": {"exact": str(f3), "float": float(f3), "a": best3[2], "k": 3, "b": best3[3]},
                    "min_margin_r3plus": {"exact": str(fa), "float": float(fa), "r": best_all[2], "a": best_all[3], "k": 3, "b": best_all[4]},
                }
                log(
                    f"[{self.clock.elapsed():7.1f}s] trend n={n}: min m4={float(f4):.6f} ({f4}) at (a,b)=({best4[2]},{best4[3]}); "
                    f"min m3={float(f3):.6f}; min r>=3: {float(fa):.6f} at r={best_all[2]}"
                )
        except PhaseTimeout:
            status = "truncated_by_time"
        values = [per_n[str(n)]["min_m4"]["float"] for n in TREND_ORDERS if str(n) in per_n]
        decreasing = all(values[i] > values[i + 1] for i in range(len(values) - 1))
        self.trend_report = {
            "status": status,
            "family": "double_broom(a, 3, b), min over all splits a + b = n - 3",
            "orders": TREND_ORDERS,
            "per_n": per_n,
            "min_m4_sequence": values,
            "monotone_decreasing": decreasing,
            "all_positive": all(v > 0 for v in values),
            "analytic_limit_balanced": {
                "statement": "for a = b -> infinity and k = 3, m_r -> 1 + (3 - r)/2^(r-1); at r = 4 (and r = 5) the limit is 7/8 = 0.875",
                "r4_limit": {"exact": "7/8", "float": 0.875},
                "excess_over_limit_by_n": {str(n): per_n[str(n)]["min_m4"]["excess_over_7_8"] for n in TREND_ORDERS if str(n) in per_n},
            },
        }
        self.phase_done(polys=self.trend.count, status=status)

    # ---------------- (c) random trees ----------------

    def run_random(self, cap_seconds: float) -> None:
        self.phase("random_trees", cap_seconds=round(cap_seconds, 1))
        self.clock.set_phase(cap_seconds)
        cells: Dict[str, Any] = {}
        status = "complete"
        kinds = [("random_prufer", None), ("random_attachment_h0.5", 0.5), ("random_attachment_h0.9", 0.9)]
        try:
            for n in RANDOM_ORDERS:
                for fam, heavy in kinds:
                    cell_rng = random.Random(f"{self.seed}:{fam}:{n}")
                    cnt = 0
                    for idx in range(RANDOM_SAMPLES_PER_CELL):
                        if heavy is None:
                            gn, ge = random_tree(n, cell_rng)
                        else:
                            gn, ge = random_attachment_tree(n, cell_rng, heavy)
                        p = indpoly_forest(gn, ge)
                        self.trees.add(p, gn, ge, fam, f"{fam}(n={n},seed={self.seed},idx={idx})")
                        cnt += 1
                        self.clock.tick()
                    fs = self.trees.family_stats[fam]
                    cells[f"{fam}:n={n}"] = {"count": cnt}
                    log(f"[{self.clock.elapsed():7.1f}s] random {fam:24s} n={n:3d} samples={cnt} family_min_m(r>=3)={float(Fraction(fs['min'][0], fs['min'][1])):.6f}")
        except PhaseTimeout:
            status = "truncated_by_time"
        self.random_report = {"status": status, "orders": RANDOM_ORDERS, "samples_per_cell": RANDOM_SAMPLES_PER_CELL, "cells": cells}
        self.phase_done(status=status)

    # ---------------- (b) local search ----------------

    def run_local_search(self, cap_seconds: float) -> None:
        self.phase("local_search", cap_seconds=round(cap_seconds, 1))
        self.clock.set_phase(cap_seconds + 5.0)
        plan = [
            ("iso", "random_prufer", 1.0),
            ("iso", "star", 1.0),
            ("iso", "best_structured", 1.0),
            ("iso", "random_prufer", 1.0),
            ("iso", "random_attachment_h0.9", 1.0),
            ("iso_desc", "random_prufer", 0.6),
            ("iso_desc", "best_structured", 0.6),
            ("wr", "random_prufer", 0.6),
            ("wr", "star", 0.6),
        ]
        units = sum(w for _, _, w in plan)
        per_n_budget = cap_seconds / len(SA_ORDERS)
        status = "complete"
        before: Dict[int, Optional[Record]] = {n: (self.trees.per_n[n]["min"] if n in self.trees.per_n else None) for n in SA_ORDERS}
        try:
            for n in SA_ORDERS:
                for run_idx, (kind, start_kind, weight) in enumerate(plan):
                    seconds = per_n_budget * weight / units
                    if self.clock.phase_remaining() <= 1.0:
                        raise PhaseTimeout()
                    seconds = min(seconds, max(1.0, self.clock.phase_remaining() - 1.0))
                    if start_kind == "random_prufer":
                        start = random_tree(n, self.rng)[1]
                    elif start_kind == "star":
                        start = star(n)[1]
                    elif start_kind == "random_attachment_h0.9":
                        start = random_attachment_tree(n, self.rng, 0.9)[1]
                    else:
                        pn = self.trees.per_n.get(n)
                        rec = pn["min"] if pn else None
                        if rec is None:
                            start = double_broom((n - 3) // 2, 3, n - 3 - (n - 3) // 2)[1]
                        else:
                            start = [(u, v) for u, v in rec[3]["edges"]]
                    label = f"sa[n={n},obj={kind},start={start_kind},run={run_idx}]"
                    tk = self.topk.setdefault((n, kind), TopK(10))
                    try:
                        res = anneal(n, start, kind, seconds, self.rng, self.trees, self.clock, tk, label)
                    except PhaseTimeout:
                        raise
                    except Exception:
                        res = {"n": n, "objective": kind, "label": label, "error": traceback.format_exc()}
                    res["start"] = start_kind
                    self.local_search_runs.append(res)
                    val = res.get("min_margin") or res.get("max_wr_ratio")
                    log(
                        f"[{self.clock.elapsed():7.1f}s] SA n={n:3d} obj={kind:8s} start={start_kind:22s} "
                        f"iters={res.get('iterations', 0):7d} evals={res.get('evaluations', 0):7d} acc={res.get('accepted', 0):6d} "
                        f"best={res.get('float')} ({val}) r={res.get('r')} {'ERROR' if 'error' in res else ''}"
                    )
                    if res.get("timed_out"):
                        raise PhaseTimeout()
        except PhaseTimeout:
            status = "truncated_by_time"
        comparison: Dict[str, Any] = {}
        for n in SA_ORDERS:
            b = before.get(n)
            after = self.trees.per_n[n]["min"] if n in self.trees.per_n else None
            sa_best = None
            for tk_key, tk in self.topk.items():
                if tk_key == (n, "iso") and tk.items:
                    sa_best = min(v[0] for v in tk.items.values())
            comparison[str(n)] = {
                "structured_min_before_sa": str(Fraction(b[0], b[1])) if b else None,
                "structured_min_before_sa_label": b[3]["label"] if b else None,
                "sa_best_min_margin": str(sa_best) if sa_best is not None else None,
                "sa_best_float": float(sa_best) if sa_best is not None else None,
                "sa_improved_on_structured": (sa_best < Fraction(b[0], b[1])) if (b and sa_best is not None) else None,
                "overall_min_after_sa": str(Fraction(after[0], after[1])) if after else None,
                "overall_min_after_sa_label": after[3]["label"] if after else None,
            }
        self.local_search_comparison = comparison
        self.phase_done(status=status, runs=len(self.local_search_runs))

    # ---------------- (d) forests ----------------

    def extremal_trees(self, per_band: int = 4) -> List[Tuple[str, Graph, Poly]]:
        """Most extremal trees found (smallest min margin r>=3), a few per order band so
        that unions of 2..4 components stay within order 300."""
        bands = [(20, 40), (41, 75), (76, 150)]
        cands = []
        for n, pn in self.trees.per_n.items():
            for key in ("min", "min_desc"):
                rec = pn[key]
                if rec is not None:
                    cands.append((Fraction(rec[0], rec[1]), rec[3]))
        for (n, kind), tk in self.topk.items():
            if kind == "iso":
                for canon, (value, r, label, edges) in tk.items.items():
                    cands.append((value, {"n": n, "label": label, "edges": edges, "poly": None}))
        cands.sort(key=lambda c: c[0])
        out: List[Tuple[str, Graph, Poly]] = []
        seen: set = set()
        for lo, hi in bands:
            taken = 0
            for value, wit in cands:
                n = wit["n"]
                if not (lo <= n <= hi):
                    continue
                edges = [(int(u), int(v)) for u, v in wit["edges"]]
                p = wit["poly"] or indpoly_forest(n, edges)
                key = tuple(p)
                if key in seen:
                    continue
                seen.add(key)
                out.append((f"{wit['label']}", (n, edges), list(p)))
                taken += 1
                if taken >= per_band:
                    break
        return out

    def run_forests(self, cap_seconds: float) -> None:
        self.phase("forests", cap_seconds=round(cap_seconds, 1))
        self.clock.set_phase(cap_seconds)
        status = "complete"
        groups: Dict[str, int] = {}
        crosschecked = 0
        crosscheck_ok = True
        t44 = T3mn(4, 4)
        p44 = indpoly_forest(*t44)
        ts34 = T3mn_star(3, 4)
        ps34 = indpoly_forest(*ts34)
        extremal = self.extremal_trees()
        self.forest_report["extremal_trees_used"] = [{"label": lab, "n": g[0]} for lab, g, _ in extremal]

        _component_cache: Dict[str, Tuple[Graph, Poly]] = {}

        def comp(label: str, g: Graph, p: Optional[Poly] = None) -> Tuple[str, Graph, Poly]:
            if label not in _component_cache:
                _component_cache[label] = (g, p if p is not None else indpoly_forest(*g))
            return label, _component_cache[label][0], _component_cache[label][1]

        def evaluate(group: str, comps: List[Tuple[str, Graph, Poly]]) -> None:
            nonlocal crosschecked, crosscheck_ok
            n, edges = union_graphs([g for _, g, _ in comps])
            if n > MAX_ORDER or n < MIN_ORDER:
                return
            poly: Poly = [1]
            for _, _, cp in comps:
                poly = poly_mul(poly, cp)
            if crosschecked < 8:
                crosschecked += 1
                if indpoly_forest(n, edges) != poly:
                    crosscheck_ok = False
            label = "forest{" + " + ".join(lab for lab, _, _ in comps) + "}"
            self.forests.add(poly, n, edges, f"forest_{group}", label)
            groups[group] = groups.get(group, 0) + 1
            self.clock.tick()

        def P(j: int) -> Tuple[str, Graph, Poly]:
            return comp(f"P{j}", path(j))

        def S(j: int) -> Tuple[str, Graph, Poly]:
            return comp(f"star{j}", star(j))

        c44 = comp("T3mn(4,4)", t44, p44)
        cs34 = comp("T3mn_star(3,4)", ts34, ps34)
        try:
            for c in range(1, 5):
                evaluate("T3mn44_copies_plus_path", [c44] * c)
                for j in range(1, 41):
                    evaluate("T3mn44_copies_plus_path", [c44] * c + [P(j)])
            for c in range(1, 4):
                for j in range(2, 41):
                    evaluate("T3mn44_copies_plus_isolated", [c44] * c + [P(1)] * j)
            for c in range(1, 3):
                for i in range(1, 16):
                    for j in range(i, 16):
                        evaluate("T3mn44_copies_plus_two_paths", [c44] * c + [P(i), P(j)])
                for j in range(3, 61):
                    evaluate("T3mn44_copies_plus_star", [c44] * c + [S(j)])
            for c in range(1, 4):
                evaluate("T3mn_star34_copies_plus_path", [cs34] * c)
                for j in range(1, 41):
                    evaluate("T3mn_star34_copies_plus_path", [cs34] * c + [P(j)])
            for j in range(0, 41):
                evaluate("T3mn44_plus_T3mn_star34_plus_path", [c44, cs34] + ([P(j)] if j else []))
            ext = [comp(lab, g, p) for lab, g, p in extremal]
            for size in (2, 3, 4):
                for combo in combinations_with_replacement(range(len(ext)), size):
                    evaluate(f"extremal_union_{size}", [ext[i] for i in combo])
            for e in ext:
                for j in range(1, 31):
                    evaluate("extremal_plus_path", [e, P(j)])
                    evaluate("extremal_plus_isolated", [e] + [P(1)] * j)
                for j in range(3, 31):
                    evaluate("extremal_plus_star", [e, S(j)])
                evaluate("extremal_plus_T3mn44", [e, c44])
                for i in range(1, 9):
                    for j in range(i, 9):
                        evaluate("extremal_plus_two_paths", [e, P(i), P(j)])
        except PhaseTimeout:
            status = "truncated_by_time"
        self.forest_report.update(
            {
                "status": status,
                "groups": groups,
                "count": self.forests.count,
                "poly_mul_crosscheck_against_indpoly_forest": {"checked": crosschecked, "all_equal": crosscheck_ok},
                "min_margin_r3plus": record_json(self.forests.min_margin, inline_edges=True),
                "max_wr_ratio": record_json(self.forests.max_wr, inline_edges=True),
            }
        )
        fm = self.forests.min_margin
        log(
            f"[{self.clock.elapsed():7.1f}s] forests: {self.forests.count} polys, groups={groups}, crosscheck_ok={crosscheck_ok}, "
            f"min_m(r>=3)={float(Fraction(fm[0], fm[1])) if fm else None} {fm[3]['label'] if fm else ''}"
        )
        self.phase_done(status=status, polys=self.forests.count)

    # ---------------- orchestration ----------------

    def run(self) -> None:
        total = self.total_seconds
        log(f"budget {self.args.minutes} min, seed {self.seed}, orders {MIN_ORDER}..{MAX_ORDER}, SA orders {SA_ORDERS}, out {self.args.out}")
        self.run_star_reference()
        self.run_structured(0.30 * total)
        self.write_partial()
        do_n20 = self.args.n20_check or (not self.args.skip_n20_check and self.args.minutes >= 12)
        if do_n20:
            self.run_n20_check(min(0.12 * total, max(30.0, self.clock.remaining() - 0.5 * total)))
        else:
            self.n20_report = {"status": "skipped (budget < 12 min; pass --n20-check to force)"}
        self.run_trend(min(max(0.06 * total, 45.0), max(20.0, self.clock.remaining() - 0.45 * total)))
        self.run_random(min(max(0.05 * total, 30.0), max(10.0, self.clock.remaining() - 0.40 * total)))
        self.write_partial()
        forest_reserve = max(40.0, 0.04 * total)
        final_reserve = 30.0
        sa_budget = self.clock.remaining() - forest_reserve - final_reserve
        if sa_budget > 10.0:
            self.run_local_search(sa_budget)
        else:
            self.phase("local_search", skipped="insufficient time")
            self.phase_done()
        self.run_forests(max(5.0, self.clock.remaining() - final_reserve))

    def print_summary(self, digest: str) -> None:
        payload_summary = self.build_payload(self.status)["summary"]
        s = payload_summary
        print()
        print("=" * 100)
        print("ISO adversarial search summary  (status: %s, %.1f s of %.0f s budget)" % (self.status, self.clock.elapsed(), self.total_seconds))
        print("=" * 100)
        print(f"polynomials examined: {s['total_polys']} (trees {s['total_polys_by_phase']['trees_structured_random_local_search']}, forests {s['total_polys_by_phase']['forests']}); "
              f"+ trend {s['total_polys_by_phase']['double_broom_trend']} + n20 exhaustive {s['total_polys_by_phase']['n20_exhaustive_check']} = {s['total_polys_all_phases']} total")
        mm = s["min_margin_r3plus"]
        if mm:
            print(f"smallest ISO margin (3 <= r <= L-1): {mm['exact']} = {mm['float']:.9f}  at n={mm['n']} r={mm['r']}  family={mm['family']}  {mm['label']}  [source: {s['min_margin_r3plus_source']}]")
        md = s["min_margin_r3plus_at_descent"]
        if md:
            print(f"smallest ISO margin at descent indices:  {md['exact']} = {md['float']:.9f}  at n={md['n']} r={md['r']}  {md['label']}")
        mw = s["max_wr_ratio"]
        if mw:
            print(f"largest WR ratio p[r-1]/(r p[r]) (1 <= r <= L-1): {mw['exact']} = {mw['float']:.9f}  at n={mw['n']} r={mw['r']}  {mw['label']}")
        tr = s["double_broom_r4_trend"]
        if tr and tr.get("per_n"):
            print("double-broom r=4 trend (min over splits, k=3):")
            for n in TREND_ORDERS:
                e = tr["per_n"].get(str(n))
                if e:
                    print(f"   n={n:4d}: min m4 = {e['min_m4']['float']:.9f} = {e['min_m4']['exact']}  at (a,b)=({e['min_m4']['a']},{e['min_m4']['b']})   excess over 7/8: {e['min_m4']['excess_over_7_8']:.6f}")
            print(f"   monotone decreasing: {tr['monotone_decreasing']}, analytic limit for a=b->inf: 7/8 = 0.875")
        n20 = s["n20_exhaustive_check"]
        if n20.get("min_m3"):
            print(f"n=20 exhaustive: {n20['trees_enumerated']} trees; min m3 = {n20['min_m3']['exact']} ({n20['min_m3']['argmin_identified_as']}; expected 54883/50502: {n20['min_m3'].get('matches_expected')}); "
                  f"min m4 = {n20['min_m4']['exact']} ({n20['min_m4']['argmin_identified_as']}; hint 1983/1760: {n20['min_m4'].get('matches_expected')})")
        print(f"violations: ISO={s['violation_counts']['iso']}  WR={s['violation_counts']['wr']}  TAIL={s['violation_counts']['tail']}  unimodality={s['violation_counts']['unimodality']}  -> any: {s['any_violation']}")
        print(f"report: {self.args.out}  SHA256 {digest}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--minutes", type=float, default=35.0, help="wall-clock budget in minutes (default 35)")
    ap.add_argument("--seed", type=int, default=993)
    ap.add_argument("--out", default="reports/iso_adversarial_search.json")
    ap.add_argument("--partial-every", type=float, default=300.0, help="seconds between partial report writes")
    ap.add_argument("--skip-n20-check", action="store_true", help="skip the exhaustive n=20 recomputation")
    ap.add_argument("--n20-check", action="store_true", help="force the exhaustive n=20 recomputation even for short budgets")
    args = ap.parse_args()

    search = Search(args)

    def on_signal(signum, frame):  # noqa: ARG001
        raise KeyboardInterrupt(f"signal {signum}")

    signal.signal(signal.SIGTERM, on_signal)
    signal.signal(signal.SIGINT, on_signal)

    exit_code = 0
    try:
        search.run()
        search.status = "complete"
    except KeyboardInterrupt as exc:
        search.status = f"interrupted ({exc})"
        exit_code = 130
    except Exception:
        search.status = "error: " + traceback.format_exc()
        exit_code = 1
    finally:
        try:
            digest = search.write(search.status)
            search.print_summary(digest)
        except Exception:
            log("[final report failed]\n" + traceback.format_exc())
            exit_code = exit_code or 1
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
