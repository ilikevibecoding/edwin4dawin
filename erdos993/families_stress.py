#!/usr/bin/env python3
"""
families_stress.py -- exact ISO / WR stress test on structured tree and
forest families and on random large trees (Erdős Problem #993 toolkit).

Framework (see forest_indep.py):
    L(alpha)  = ceil((2 alpha - 1)/3)
    prefix    = indices 1 <= r <= L(alpha) - 1
    WR_r      : p_{r-1} <= r p_r                       (slack = r p_r - p_{r-1})
    ISO_r     : Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0
    ISO ratio : (r p_r^2 + p_{r-1}^2) / ((r+1) p_{r-1} p_{r+1})   (ISO_r <=> ratio >= 1)
    TAIL      : p_r >= p_{r+1} for r >= L(alpha)      (Levit-Mandrescu)

Every quantity is an exact Python integer or Fraction.  All randomness is
seeded (SEED = 993).  Single process.  Nothing here proves anything: finite
testing is falsification evidence only.

Usage:
    python3 families_stress.py            # full run (~4-6 min on one core)
    python3 families_stress.py --quick    # reduced sizes, smoke test
    python3 families_stress.py --pb PATH  # PatternBoost 60-vertex Prüfer codes
        (default PATH = /tmp/pb_search_output_11.txt; use --download to fetch
         it from the Ramos-Sun GitHub repository if it is missing)

Writes results/families_stress.json next to this file.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import random
import sys
import time
from fractions import Fraction
from math import comb

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import forest_indep as fi  # noqa: E402
from forest_indep import (  # noqa: E402
    KLYM_T1_POLY,
    L_cutoff,
    Q_iso,
    audit_sequence,
    indep_poly_from_edges,
    is_log_concave,
    klym_3kk_tree,
    poly_mul,
    prufer_to_edges,
)

SEED = 993
PB_URL = ("https://raw.githubusercontent.com/ericgramos/TreeUnimodalityPatternBoost/"
          "main/60_vertex_output/search_output_11.txt")
PB_DEFAULT_PATH = "/tmp/pb_search_output_11.txt"
MAX_R_TRACK = 8          # per-r minima are tracked for r = 1..MAX_R_TRACK
STAR_CMP_R = (2, 3, 4)   # per-order minima at these r are compared with the star K_{1,n-1}

# compact per-member rows stored in the JSON (families with keep_members=True)
MEMBER_COLUMNS = ["label", "n", "alpha", "L", "mode", "ratio_min_r", "ratio_min", "ratio_min_excess",
                  "Q_min_r", "Q_min", "wr_slack_min_r", "wr_slack_min", "lc_breaks_first12"]
MEMBER_COL = {name: i for i, name in enumerate(MEMBER_COLUMNS)}

# ---------------------------------------------------------------------------
# Exact per-sequence analysis
# ---------------------------------------------------------------------------


def analyze(p):
    """Exact audit of one independence sequence plus argmin bookkeeping.

    Returns a dict with the audit_sequence() record, the prefix argmin of the
    ISO ratio / Q_r / WR slack / WR ratio (found by exact cross-multiplication),
    per-r ISO ratios for r <= MAX_R_TRACK, log-concavity break positions and
    the list of prefix failures (expected empty)."""
    a = audit_sequence(p, with_ratio=True)
    alpha, L = a["alpha"], a["L"]
    best = qbest = wbest = wrbest = None
    per_r = {}
    failures = []
    for r in range(1, L):
        pm, pr, pp = p[r - 1], p[r], p[r + 1]
        num = r * pr * pr + pm * pm
        den = (r + 1) * pm * pp
        if best is None or num * best[1] < best[0] * den:
            best = (num, den, r)
        Q = num - den
        if qbest is None or Q < qbest[0]:
            qbest = (Q, r)
        s = r * pr - pm
        if wbest is None or s < wbest[0]:
            wbest = (s, r)
        if wrbest is None or r * pr * wrbest[1] < wrbest[0] * pm:
            wrbest = (r * pr, pm, r)
        if r <= MAX_R_TRACK:
            per_r[r] = (num, den)
        if Q < 0:
            failures.append({"kind": "ISO", "r": r, "coeffs": [pm, pr, pp], "Q": Q})
        if s < 0:
            failures.append({"kind": "WR", "r": r, "coeffs": [pm, pr, pp], "slack": s})
    if best is not None:
        # consistency with the library's own evaluation
        assert Fraction(best[0], best[1]) == a["iso_prefix_ratio_min"]
        assert qbest[0] == a["iso_prefix_min"]
        assert wbest[0] == a["wr_prefix_min"]
    lc_breaks = [r for r in range(1, alpha) if p[r] * p[r] < p[r - 1] * p[r + 1]]
    mode = max(range(alpha + 1), key=lambda i: (p[i], -i))
    first_descent = next((r for r in range(alpha) if p[r] > p[r + 1]), None)
    return {
        "audit": a,
        "alpha": alpha,
        "L": L,
        "ratio_argmin": best,        # (num, den, r) or None
        "Q_argmin": qbest,           # (Q, r) or None
        "wr_argmin": wbest,          # (slack, r) or None
        "wr_ratio_argmin": wrbest,   # (r p_r, p_{r-1}, r) or None
        "per_r": per_r,
        "lc_breaks": lc_breaks,
        "mode": mode,
        "first_descent": first_descent,
        "failures": failures,
    }


def ratio_record(num, den):
    return {"num": str(num), "den": str(den), "decimal": float(Fraction(num, den)),
            "excess_decimal": float(Fraction(num - den, den))}


# ---------------------------------------------------------------------------
# Family accumulator
# ---------------------------------------------------------------------------


class Family:
    def __init__(self, key, description, keep_members=True, member_cap=2500):
        self.key = key
        self.description = description
        self.keep_members = keep_members
        self.member_cap = member_cap
        self.count = 0
        self.n_min = self.n_max = None
        self.alpha_min = self.alpha_max = None
        self.ratio_min = None       # (num, den, r, label, params, n, alpha, L, coeffs, Q, poly)
        self.Q_min = None           # (Q, r, label, params, n, alpha, L, coeffs)
        self.wr_min = None          # (slack, r, label, params, n, alpha, L, coeffs)
        self.wr_ratio_min = None    # (num, den, r, label, params, n, alpha, L)
        self.per_r_min = {}         # r -> (num, den, label, n, alpha)
        self.min_by_n_r = {}        # (n, r) -> (num, den, label) for r in STAR_CMP_R (all members)
        self.min_by_n_r_tree = {}   # same, trees only (e = C(n,2) - p_2 == n - 1)
        self.argmin_r_hist = {}
        self.non_lc = 0
        self.lc_break_offsets = {}  # alpha - r -> count
        self.lc_break_rel_L_min = None   # min over breaks of r - L
        self.members_with_prefix_lc_break = 0
        self.not_unimodal = 0
        self.tail_fail = 0
        self.empty_prefix = 0
        self.failures = []
        self.members = []
        self.notes = []
        self.seconds = 0.0

    def add(self, label, params, n, p, edges=None):
        t0 = time.perf_counter()
        res = analyze(p)
        a = res["audit"]
        alpha, L = res["alpha"], res["L"]
        self.count += 1
        self.n_min = n if self.n_min is None else min(self.n_min, n)
        self.n_max = n if self.n_max is None else max(self.n_max, n)
        self.alpha_min = alpha if self.alpha_min is None else min(self.alpha_min, alpha)
        self.alpha_max = alpha if self.alpha_max is None else max(self.alpha_max, alpha)
        if not a["unimodal"]:
            self.not_unimodal += 1
        if not a["tail_ok"]:
            self.tail_fail += 1
        if not a["log_concave"]:
            self.non_lc += 1
        prefix_break = False
        for r in res["lc_breaks"]:
            off = alpha - r
            self.lc_break_offsets[off] = self.lc_break_offsets.get(off, 0) + 1
            rel = r - L
            self.lc_break_rel_L_min = rel if self.lc_break_rel_L_min is None else min(self.lc_break_rel_L_min, rel)
            if r < L:
                prefix_break = True
        if prefix_break:
            self.members_with_prefix_lc_break += 1
        for f in res["failures"]:
            rec = dict(f)
            rec.update({"family": self.key, "label": label, "params": params, "n": n,
                        "alpha": alpha, "L": L, "poly": [str(c) for c in p]})
            if edges is not None and n <= 400:
                rec["edges"] = [list(e) for e in edges]
            rec["coeffs"] = [str(c) for c in rec["coeffs"]]
            if "Q" in rec:
                rec["Q"] = str(rec["Q"])
            if "slack" in rec:
                rec["slack"] = str(rec["slack"])
            self.failures.append(rec)
        best = res["ratio_argmin"]
        # a forest on n vertices with e edges has p_2 = C(n,2) - e; it is a tree iff e = n - 1
        is_tree = n >= 2 and len(p) > 2 and comb(n, 2) - p[2] == n - 1
        if best is None:
            self.empty_prefix += 1
        else:
            num, den, r = best
            self.argmin_r_hist[r] = self.argmin_r_hist.get(r, 0) + 1
            if self.ratio_min is None or num * self.ratio_min[1] < self.ratio_min[0] * den:
                self.ratio_min = (num, den, r, label, params, n, alpha, L,
                                  [p[r - 1], p[r], p[r + 1]], num - den, p)
            Q, rq = res["Q_argmin"]
            if self.Q_min is None or Q < self.Q_min[0]:
                self.Q_min = (Q, rq, label, params, n, alpha, L, [p[rq - 1], p[rq], p[rq + 1]])
            s, rw = res["wr_argmin"]
            if self.wr_min is None or s < self.wr_min[0]:
                self.wr_min = (s, rw, label, params, n, alpha, L, [p[rw - 1], p[rw], p[rw + 1]])
            wn, wd, rwr = res["wr_ratio_argmin"]
            if self.wr_ratio_min is None or wn * self.wr_ratio_min[1] < self.wr_ratio_min[0] * wd:
                self.wr_ratio_min = (wn, wd, rwr, label, params, n, alpha, L)
            for rr, (nn, dd) in res["per_r"].items():
                cur = self.per_r_min.get(rr)
                if cur is None or nn * cur[1] < cur[0] * dd:
                    self.per_r_min[rr] = (nn, dd, label, n, alpha)
                if rr in STAR_CMP_R:
                    cur = self.min_by_n_r.get((n, rr))
                    if cur is None or nn * cur[1] < cur[0] * dd:
                        self.min_by_n_r[(n, rr)] = (nn, dd, label)
                    if is_tree:
                        cur = self.min_by_n_r_tree.get((n, rr))
                        if cur is None or nn * cur[1] < cur[0] * dd:
                            self.min_by_n_r_tree[(n, rr)] = (nn, dd, label)
        if self.keep_members and len(self.members) < self.member_cap:
            if best is not None:
                row = [label, n, alpha, L, res["mode"], best[2],
                       float(Fraction(best[0], best[1])), float(Fraction(best[0] - best[1], best[1])),
                       res["Q_argmin"][1], str(res["Q_argmin"][0]),
                       res["wr_argmin"][1], str(res["wr_argmin"][0]), res["lc_breaks"][:12]]
            else:
                row = [label, n, alpha, L, res["mode"], None, None, None, None, None, None, None, res["lc_breaks"][:12]]
            self.members.append(row)
        self.seconds += time.perf_counter() - t0
        return res

    def summary(self):
        out = {
            "description": self.description,
            "count": self.count,
            "n_range": [self.n_min, self.n_max],
            "alpha_range": [self.alpha_min, self.alpha_max],
            "prefix_failures": self.failures,
            "prefix_failure_count": len(self.failures),
            "all_unimodal": self.not_unimodal == 0,
            "all_tail_ok": self.tail_fail == 0,
            "members_with_empty_prefix": self.empty_prefix,
            "non_log_concave_count": self.non_lc,
            "lc_break_offsets_from_alpha": {str(k): v for k, v in sorted(self.lc_break_offsets.items())},
            "lc_break_min_of_r_minus_L": self.lc_break_rel_L_min,
            "members_with_lc_break_inside_prefix": self.members_with_prefix_lc_break,
            "argmin_r_histogram": {str(k): v for k, v in sorted(self.argmin_r_hist.items())},
            "notes": self.notes,
            "seconds_analysis": round(self.seconds, 3),
        }
        if self.ratio_min is not None:
            num, den, r, label, params, n, alpha, L, coeffs, Q, p = self.ratio_min
            rec = ratio_record(num, den)
            rec.update({"r": r, "label": label, "params": params, "n": n, "alpha": alpha,
                        "L": L, "coeffs": [str(c) for c in coeffs], "Q": str(Q)})
            if alpha <= 400:
                rec["poly"] = [str(c) for c in p]
            out["iso_prefix_ratio_min"] = rec
            Q, rq, label, params, n, alpha, L, coeffs = self.Q_min
            out["iso_prefix_Q_min"] = {"Q": str(Q), "r": rq, "label": label, "params": params,
                                       "n": n, "alpha": alpha, "L": L,
                                       "coeffs": [str(c) for c in coeffs]}
            s, rw, label, params, n, alpha, L, coeffs = self.wr_min
            out["wr_prefix_slack_min"] = {"slack": str(s), "r": rw, "label": label, "params": params,
                                          "n": n, "alpha": alpha, "L": L,
                                          "coeffs": [str(c) for c in coeffs]}
            wn, wd, rwr, label, params, n, alpha, L = self.wr_ratio_min
            out["wr_prefix_ratio_min"] = {"num": str(wn), "den": str(wd),
                                          "decimal": float(Fraction(wn, wd)), "r": rwr,
                                          "label": label, "params": params, "n": n,
                                          "alpha": alpha, "L": L}
            out["iso_ratio_min_by_r"] = {
                str(rr): dict(ratio_record(nn, dd), label=label, n=n, alpha=alpha)
                for rr, (nn, dd, label, n, alpha) in sorted(self.per_r_min.items())}
        if self.keep_members:
            out["member_columns"] = MEMBER_COLUMNS
            out["members"] = self.members
        return out

    def one_line(self):
        if self.ratio_min is None:
            return f"{self.key:28s} count={self.count:6d}  (no nonempty prefix)"
        num, den, r, label = self.ratio_min[:4]
        return (f"{self.key:28s} count={self.count:6d} n<={self.n_max:5d} "
                f"min_ratio={float(Fraction(num, den)):.9f} (1+{float(Fraction(num - den, den)):.3e}) "
                f"at r={r} [{label}]  nonLC={self.non_lc} prefixLCbreaks={self.members_with_prefix_lc_break} "
                f"FAILURES={len(self.failures)}")


# ---------------------------------------------------------------------------
# Graph builders (edge lists on vertices 0..n-1)
# ---------------------------------------------------------------------------


def star_edges(m):
    return m + 1, [(0, i) for i in range(1, m + 1)]


def path_edges(n):
    return n, [(i, i + 1) for i in range(n - 1)]


def matching_edges(m):
    return 2 * m, [(2 * i, 2 * i + 1) for i in range(m)]


def spider_edges(k, leg):
    edges = []
    nxt = 1
    for _ in range(k):
        prev = 0
        for _ in range(leg):
            edges.append((prev, nxt))
            prev = nxt
            nxt += 1
    return nxt, edges


def broom_edges(h, m):
    """Path on h vertices; the last path vertex carries m pendant leaves."""
    n, edges = path_edges(h)
    for i in range(m):
        edges.append((h - 1, n + i))
    return n + m, edges


def double_broom_edges(h, m1, m2):
    n, edges = path_edges(h)
    for i in range(m1):
        edges.append((0, n + i))
    for i in range(m2):
        edges.append((h - 1, n + m1 + i))
    return n + m1 + m2, edges


def caterpillar_edges(legs):
    """Spine of len(legs) vertices; spine vertex i carries legs[i] leaves."""
    s = len(legs)
    n, edges = path_edges(s)
    for i, c in enumerate(legs):
        for _ in range(c):
            edges.append((i, n))
            n += 1
    return n, edges


def complete_dary_edges(d, depth):
    edges = []
    level = [0]
    nxt = 1
    for _ in range(depth):
        new = []
        for v in level:
            for _ in range(d):
                edges.append((v, nxt))
                new.append(nxt)
                nxt += 1
        level = new
    return nxt, edges


def klym_tree(v1_cluster, k2, k3):
    """Generalised Kadrawi-Levit structure.  Centre 0 joined to 1, 2, 3.
    Vertex 1 carries the pendant pieces listed in v1_cluster, each either
    'K2' (a K2 attached by one endpoint), 'P4end' (a P4 attached at an END
    vertex) or 'P4inner' (a P4 attached at an inner vertex); vertices 2 and 3
    carry k2 resp. k3 pendant K2's."""
    edges = [(0, 1), (0, 2), (0, 3)]
    nxt = 4

    def pendant_k2(hub):
        nonlocal nxt
        a, b = nxt, nxt + 1
        nxt += 2
        edges.extend([(hub, a), (a, b)])

    for piece in v1_cluster:
        if piece == "K2":
            pendant_k2(1)
        elif piece in ("P4end", "P4inner"):
            a, b, c, d = nxt, nxt + 1, nxt + 2, nxt + 3
            nxt += 4
            edges.extend([(a, b), (b, c), (c, d)])
            edges.append((1, a) if piece == "P4end" else (1, b))
        else:
            raise ValueError(piece)
    for _ in range(k2):
        pendant_k2(2)
    for _ in range(k3):
        pendant_k2(3)
    return nxt, edges


def galvin_edges(m, t):
    """Galvin's T_{m,t,1}: root with m children w_i; each w_i has t children
    x_i^j; each x_i^j has exactly one child y_i^j.  Order 1 + m + 2mt."""
    edges = []
    nxt = 1
    for _ in range(m):
        w = nxt
        nxt += 1
        edges.append((0, w))
        for _ in range(t):
            x, y = nxt, nxt + 1
            nxt += 2
            edges.extend([(w, x), (x, y)])
    return nxt, edges


def bencs_edges(m, nn):
    """Spherically symmetric T(2^m 1^n): vertices at distance 0..m-1 from the
    root have two children, those at distance m..m+n-1 have one child."""
    edges = []
    level = [0]
    nxt = 1
    for d in range(m + nn):
        c = 2 if d < m else 1
        new = []
        for v in level:
            for _ in range(c):
                edges.append((v, nxt))
                new.append(nxt)
                nxt += 1
        level = new
    return nxt, edges


def spider_star_edges(a, b):
    """Centre with a pendant K2's and b pendant leaves."""
    edges = []
    nxt = 1
    for _ in range(a):
        edges.extend([(0, nxt), (nxt, nxt + 1)])
        nxt += 2
    for _ in range(b):
        edges.append((0, nxt))
        nxt += 1
    return nxt, edges


def double_star_edges(a, b):
    edges = [(0, 1)]
    nxt = 2
    for _ in range(a):
        edges.append((0, nxt))
        nxt += 1
    for _ in range(b):
        edges.append((1, nxt))
        nxt += 1
    return nxt, edges


def star_of_stars_edges(k, m):
    """Root with k children, each carrying m pendant leaves (Galvin's
    T_{k,m,1} without the y-level)."""
    edges = []
    nxt = 1
    for _ in range(k):
        w = nxt
        nxt += 1
        edges.append((0, w))
        for _ in range(m):
            edges.append((w, nxt))
            nxt += 1
    return nxt, edges


def disjoint_union(*graphs):
    """graphs: (n, edges) pairs -> (n, edges) of the disjoint union."""
    n = 0
    edges = []
    for gn, ge in graphs:
        edges.extend((a + n, b + n) for a, b in ge)
        n += gn
    return n, edges


def prufer_edges_fast(seq, n):
    """Linear-time Prüfer decoding with the usual smallest-leaf convention
    (same labelled tree as forest_indep.prufer_to_edges)."""
    degree = [1] * n
    for v in seq:
        degree[v] += 1
    ptr = 0
    while degree[ptr] != 1:
        ptr += 1
    leaf = ptr
    edges = []
    for v in seq:
        edges.append((leaf, v))
        degree[leaf] -= 1
        degree[v] -= 1
        if degree[v] == 1 and v < ptr:
            leaf = v
        else:
            ptr += 1
            while degree[ptr] != 1:
                ptr += 1
            leaf = ptr
    edges.append((leaf, n - 1))
    return edges


def random_forest_edges(rng, n, q):
    """Random recursive forest: vertex v >= 1 is joined to a uniformly random
    earlier vertex with probability q, otherwise it starts a new component."""
    edges = []
    for v in range(1, n):
        if rng.random() < q:
            edges.append((rng.randrange(v), v))
    return n, edges


def pref_attach_edges(rng, n):
    """Random recursive tree with linear preferential attachment (hubs)."""
    tokens = [0]
    edges = []
    for v in range(1, n):
        u = tokens[rng.randrange(len(tokens))]
        edges.append((u, v))
        tokens.extend((u, v))
    return n, edges


def components(n, edge_set):
    adj = [[] for _ in range(n)]
    for e in edge_set:
        a, b = tuple(e)
        adj[a].append(b)
        adj[b].append(a)
    comp = [-1] * n
    c = 0
    for s in range(n):
        if comp[s] >= 0:
            continue
        stack = [s]
        comp[s] = c
        while stack:
            v = stack.pop()
            for w in adj[v]:
                if comp[w] < 0:
                    comp[w] = c
                    stack.append(w)
        c += 1
    return comp, c


# ---------------------------------------------------------------------------
# Families
# ---------------------------------------------------------------------------


def run_stars(F, checks, quick):
    M_MAX = 2000 if not quick else 200
    dp_set = set(range(1, (501 if not quick else 60))) | set(range(550, M_MAX + 1, 50))
    q2_ok = True
    q2_checked = 0
    closed_vs_dp = 0
    for m in range(1, M_MAX + 1):
        n = m + 1
        p = [comb(m, r) for r in range(m + 1)]
        p[1] += 1                            # I(K_{1,m}) = (1+x)^m + x
        if m in dp_set:
            pd = indep_poly_from_edges(*star_edges(m))
            assert pd == p, m
            closed_vs_dp += 1
        if m >= 3:
            q2_checked += 1
            if Q_iso(p, 2) != 2 * m * m + m + 1:
                q2_ok = False
        F.add(f"K_{{1,{m}}}", {"m": m}, n, p)
    # Where does the argmin sit?  (rows are indexed by m = 1..M_MAX; column 5 = argmin r)
    exceptions = [(m, row[MEMBER_COL["ratio_min_r"]]) for m, row in enumerate(F.members, start=1)
                  if row[MEMBER_COL["ratio_min_r"]] != 2]
    checks["stars"] = {
        "m_range": [1, M_MAX],
        "Q2_identity_2m2+m+1_holds_for_all_m>=3": q2_ok,
        "Q2_identity_checked_count": q2_checked,
        "closed_form_(1+x)^m+x_equals_DP_count": closed_vs_dp,
        "m_with_argmin_r_not_2 (m, argmin r or None)": exceptions,
        "argmin_r_is_2_for_all_m_from": (max(m for m, _ in exceptions) + 1) if exceptions else 1,
    }
    F.notes.append("I(K_{1,m}) = (1+x)^m + x used as closed form for every m; DP cross-check for "
                   f"{closed_vs_dp} values of m (all m <= 500 and multiples of 50).")
    F.notes.append(f"Q_2 = 2m^2+m+1 verified exactly for all 3 <= m <= {M_MAX}: {q2_ok}.")


def run_paths(F_path, F_match, F_edgeless, quick):
    N = 400 if not quick else 80
    for n in range(1, N + 1):
        F_path.add(f"P_{n}", {"n": n}, n, indep_poly_from_edges(*path_edges(n)))
    for m in range(1, N // 2 + 1):
        F_match.add(f"{m}K_2", {"m": m}, 2 * m, indep_poly_from_edges(*matching_edges(m)))
    for n in range(1, N + 1):
        F_edgeless.add(f"E_{n}", {"n": n}, n, indep_poly_from_edges(n, []))


def run_spiders(F_sp, F_br, F_db, quick):
    K, LEG = (60, 6) if not quick else (12, 4)
    for k in range(1, K + 1):
        for leg in range(1, LEG + 1):
            n, e = spider_edges(k, leg)
            F_sp.add(f"S({k}x{leg})", {"legs": k, "leg_length": leg}, n, indep_poly_from_edges(n, e))
    H, M = (30, 60) if not quick else (8, 12)
    for h in range(1, H + 1):
        for m in range(1, M + 1):
            n, e = broom_edges(h, m)
            F_br.add(f"Broom(h={h},m={m})", {"h": h, "m": m}, n, indep_poly_from_edges(n, e))
    H2, M2 = (16, 30) if not quick else (6, 8)
    for h in range(2, H2 + 1):
        for m1 in range(1, M2 + 1):
            for m2 in range(m1, M2 + 1):
                n, e = double_broom_edges(h, m1, m2)
                F_db.add(f"DBroom(h={h},{m1},{m2})", {"h": h, "m1": m1, "m2": m2}, n,
                         indep_poly_from_edges(n, e))


def run_caterpillars(F, quick):
    rng = random.Random(SEED + 4)
    S = 60 if not quick else 15
    per = 5 if not quick else 1
    dists = {
        "u0-3": lambda: rng.randint(0, 3),
        "geom": lambda: min(int(math.log(1 - rng.random()) / math.log(0.5)), 40),
        "bursty": lambda: 0 if rng.random() < 0.7 else rng.randint(1, 10),
        "u0-1": lambda: rng.randint(0, 1),
    }
    for s in range(2, S + 1):
        for dname, draw in dists.items():
            for i in range(per):
                legs = [draw() for _ in range(s)]
                n, e = caterpillar_edges(legs)
                F.add(f"Cat(s={s},{dname},#{i})", {"spine": s, "legs": legs, "dist": dname}, n,
                      indep_poly_from_edges(n, e), edges=e)
        # one-hub caterpillar: a single spine vertex with many legs
        legs = [0] * s
        legs[rng.randrange(s)] = 20
        n, e = caterpillar_edges(legs)
        F.add(f"Cat(s={s},onehub20)", {"spine": s, "legs": legs, "dist": "onehub"}, n,
              indep_poly_from_edges(n, e), edges=e)
    for c in range(1, 7):
        for s in range(2, S + 1):
            legs = [c] * s
            n, e = caterpillar_edges(legs)
            F.add(f"Cat(s={s},regular c={c})", {"spine": s, "legs": legs, "dist": "regular"}, n,
                  indep_poly_from_edges(n, e))


def run_complete_dary(F, quick):
    cap = 1500 if not quick else 200
    for d in range(2, 6):
        depth = 1
        while (d ** (depth + 1) - 1) // (d - 1) <= cap:
            n, e = complete_dary_edges(d, depth)
            F.add(f"T_{d}-ary(depth={depth})", {"d": d, "depth": depth}, n, indep_poly_from_edges(n, e))
            depth += 1


def run_klym(F_3kk, F_3s, F_left, F_var, checks, quick):
    K = 150 if not quick else 20
    # (3,k,k)
    for k in range(1, K + 1):
        n, e = klym_3kk_tree(k)
        p = indep_poly_from_edges(n, e)
        if k == 4:
            assert n == 26 and p == KLYM_T1_POLY
        F_3kk.add(f"(3,{k},{k})", {"k": k}, n, p)
    # (3*,k,k+1) with P4 attached at an END vertex; T2 check at k=3
    for k in range(0, K + 1):
        n, e = klym_tree(["P4end", "K2", "K2"], k, k + 1)
        assert n == 14 + 4 * k
        p = indep_poly_from_edges(n, e)
        top2 = 3 * 2 ** k + 2 * k + 18       # derived: 17 + (2^k+k) + (2^{k+1}+k+1)
        if k == 3:
            n_in, e_in = klym_tree(["P4inner", "K2", "K2"], 3, 4)
            p_in = indep_poly_from_edges(n_in, e_in)
            end_ok = len(p) == 15 and p[-1] == 1 and p[13] == 48
            inner_ok = len(p_in) == 15 and p_in[-1] == 1 and p_in[13] == 48
            if end_ok and not inner_ok:
                verdict = ("END attachment reproduces x^14 + 48x^13 of T2 (arXiv 2305.01784); the INNER "
                           f"attachment gives x^{len(p_in) - 1} + {p_in[-2]}x^{len(p_in) - 2} + ... and does NOT match")
            elif inner_ok and not end_ok:
                verdict = "INNER attachment reproduces x^14 + 48x^13; END attachment does not"
            elif end_ok and inner_ok:
                verdict = "both attachments give x^14 + 48x^13 (top two coefficients do not discriminate)"
            else:
                verdict = "MISMATCH: neither attachment reproduces x^14 + 48x^13"
            checks["T2_attachment"] = {
                "order": n,
                "END_attachment_poly": [str(c) for c in p],
                "END_attachment_alpha": len(p) - 1,
                "END_attachment_x13_coefficient": p[13] if len(p) > 13 else None,
                "INNER_attachment_poly": [str(c) for c in p_in],
                "INNER_attachment_alpha": len(p_in) - 1,
                "INNER_attachment_x13_coefficient": p_in[13] if len(p_in) > 13 else None,
                "verdict": verdict,
                "END_log_concave": is_log_concave(p),
                "END_lc_breaks": [r for r in range(1, len(p) - 1) if p[r] ** 2 < p[r - 1] * p[r + 1]],
                "INNER_log_concave": is_log_concave(p_in),
                "INNER_lc_breaks": [r for r in range(1, len(p_in) - 1) if p_in[r] ** 2 < p_in[r - 1] * p_in[r + 1]],
            }
        if not (len(p) == 2 * k + 9 and p[-1] == 1 and p[-2] == top2):
            F_3s.notes.append(f"top-coefficient formula mismatch at k={k}: {p[-3:]}")
        F_3s.add(f"(3*,{k},{k + 1})", {"k": k}, n, p)
    # general (left,k,k)
    KL = 60 if not quick else 10
    for left in range(3, 9):
        for k in range(1, KL + 1):
            n, e = klym_3kk_tree(k, left=left)
            F_left.add(f"({left},{k},{k})", {"left": left, "k": k}, n, indep_poly_from_edges(n, e))
    # other Kadrawi-Levit structures with the paper's top coefficients
    KV = 80 if not quick else 12
    formula_checks = {}

    def variant(name, cluster, k2f, k3f, alpha_f, c1, c2):
        ok = True
        bad = []
        for k in range(1, KV + 1):
            n, e = klym_tree(cluster, k2f(k), k3f(k))
            p = indep_poly_from_edges(n, e)
            good = (len(p) - 1 == alpha_f(k) and p[-1] == 1 and p[-2] == c1(k)
                    and (c2 is None or 2 * p[-3] == 2 * c2(k)))
            if not good:
                ok = False
                bad.append(k)
            F_var.add(f"{name} k={k}", {"structure": name, "k": k}, n, p)
        formula_checks[name] = {"k_range": [1, KV], "paper_top_coefficients_reproduced": ok, "bad_k": bad}

    variant("(3,k,k+1)", ["K2"] * 3, lambda k: k, lambda k: k + 1, lambda k: 2 * k + 7,
            lambda k: 3 * 2 ** k + 2 * k + 12,
            lambda k: Fraction(2 * k * k + 23 * k + 9 * 2 ** (2 * k + 1) + 2 ** (k - 1) * (9 * k + 70) + 26))
    variant("(3,k,k+2)", ["K2"] * 3, lambda k: k, lambda k: k + 2, lambda k: 2 * k + 8,
            lambda k: 5 * 2 ** k + 2 * k + 13,
            lambda k: Fraction(2 * (61 * 2 ** k + 9 * 4 ** (k + 1) + 38) + k * (4 * k + 15 * 2 ** k + 50), 2))
    variant("(3*,k,k+2)", ["P4end", "K2", "K2"], lambda k: k, lambda k: k + 2, lambda k: 2 * k + 9,
            lambda k: 2 * k + 2 ** k + 2 ** (k + 2) + 19,
            lambda k: Fraction(4 * k * k + 15 * k * 2 ** k + 74 * k + 91 * 2 ** (k + 1) + 13 * 2 ** (2 * k + 3) + 142, 2))
    variant("(3*,k,k+3)", ["P4end", "K2", "K2"], lambda k: k, lambda k: k + 3, lambda k: 2 * k + 10,
            lambda k: 2 * k + 9 * 2 ** k + 20,
            lambda k: Fraction(k * (4 * k + 27 * 2 ** k + 78) + 13 * 4 ** (k + 2) + 21 * 2 ** (k + 4) + 180, 2))
    variant("(3*,k,k)", ["P4end", "K2", "K2"], lambda k: k, lambda k: k, lambda k: 2 * k + 7,
            lambda k: 2 * k + 2 ** (k + 1) + 17,
            lambda k: Fraction(2 * k * k + 33 * k + 13 * 4 ** k + 2 ** k * (3 * k + 34) + 36))
    checks["klym_paper_top_coefficient_formulas"] = formula_checks


def run_galvin(F, F_bencs, checks, quick):
    T_MAX, M_MAX = (12, 40) if not quick else (6, 10)
    galvin_rows = []
    ok_ttt = True
    ok_single = True
    for t in range(2, T_MAX + 1):
        for m in range(1, M_MAX + 1):
            n, e = galvin_edges(m, t)
            assert n == 1 + m + 2 * m * t
            p = indep_poly_from_edges(n, e)
            alpha = len(p) - 1
            assert alpha == (1 + t) * m, (m, t, alpha)
            res = F.add(f"T_{{{m},{t},1}}", {"m": m, "t": t}, n, p)
            br = res["lc_breaks"]
            if br and br != [m * t + 2]:
                ok_single = False
            galvin_rows.append({"m": m, "t": t, "n": n, "alpha": alpha, "L": res["L"],
                                "lc_breaks": br, "breaks_at_mt+2": br == [m * t + 2]})
            if m == t and t >= 4 and br != [t * t + 2]:
                ok_ttt = False
    # T_{t,t,1} for larger t (construction check of "breaks at t^2+2 for all t>=4")
    ttt = {}
    for t in range(2, (20 if not quick else 8) + 1):
        n, e = galvin_edges(t, t)
        p = indep_poly_from_edges(n, e)
        br = [r for r in range(1, len(p) - 1) if p[r] ** 2 < p[r - 1] * p[r + 1]]
        ttt[t] = br
        if t > T_MAX:
            F.add(f"T_{{{t},{t},1}}", {"m": t, "t": t}, n, p)
        if t >= 4 and br != [t * t + 2]:
            ok_ttt = False
    checks["galvin"] = {
        "t_range": [2, T_MAX], "m_range": [1, M_MAX],
        "order_1+m+2mt_and_alpha_(1+t)m_verified": True,
        "T_ttt_LC_breaks_by_t": {str(t): br for t, br in ttt.items()},
        "T_ttt_breaks_exactly_at_t^2+2_for_all_4<=t<=": (20 if not quick else 8) if ok_ttt else None,
        "every_non_LC_member_breaks_only_at_mt+2": ok_single,
        "rows": galvin_rows,
    }
    # Bencs' deep spherically symmetric trees T(2^m 1^n) (multiple LC breaks)
    reported = {(4, 9): 2, (5, 15): 3, (6, 17): 8, (7, 23): 16, (8, 27): 24}
    cases = [(4, 9), (5, 15), (6, 17), (7, 23)] + ([(8, 27)] if not quick else [])
    if quick:
        cases = [(4, 9), (5, 15)]
    bencs = {}
    for (m, nn) in cases:
        n, e = bencs_edges(m, nn)
        p = indep_poly_from_edges(n, e)
        res = F_bencs.add(f"T(2^{m} 1^{nn})", {"m": m, "n": nn}, n, p)
        bencs[f"T(2^{m} 1^{nn})"] = {"order": n, "alpha": res["alpha"], "L": res["L"],
                                     "lc_break_count": len(res["lc_breaks"]),
                                     "galvin_reported_count": reported[(m, nn)],
                                     "lc_breaks": res["lc_breaks"],
                                     "min_break_minus_L": min((r - res["L"] for r in res["lc_breaks"]), default=None)}
    checks["bencs_T(2^m 1^n)"] = bencs


def run_unions(F, quick):
    T1 = klym_3kk_tree(4)
    T2 = klym_tree(["P4end", "K2", "K2"], 3, 4)
    MU = 12 if not quick else 4
    for m in range(1, MU + 1):
        n, e = disjoint_union(*([T1] * m))
        F.add(f"{m}T1", {"copies_T1": m}, n, indep_poly_from_edges(n, e))
    for m in range(1, (6 if not quick else 2) + 1):
        n, e = disjoint_union(*([T2] * m))
        F.add(f"{m}T2", {"copies_T2": m}, n, indep_poly_from_edges(n, e))
    n, e = disjoint_union(T1, T2)
    F.add("T1+T2", {"T1": 1, "T2": 1}, n, indep_poly_from_edges(n, e))
    for a in range(1, 4):
        for b in range(1, 4):
            n, e = disjoint_union(*([T1] * a + [T2] * b))
            F.add(f"{a}T1+{b}T2", {"T1": a, "T2": b}, n, indep_poly_from_edges(n, e))
    M = 60 if not quick else 10
    for m in range(1, M + 1):
        n, e = disjoint_union(T1, star_edges(m))
        F.add(f"T1+K_{{1,{m}}}", {"T1": 1, "star_m": m}, n, indep_poly_from_edges(n, e))
        n, e = disjoint_union(T1, (m, []))
        F.add(f"T1+E_{m}", {"T1": 1, "isolated": m}, n, indep_poly_from_edges(n, e))
        n, e = disjoint_union(T1, path_edges(m))
        F.add(f"T1+P_{m}", {"T1": 1, "path": m}, n, indep_poly_from_edges(n, e))
        n, e = disjoint_union(T2, star_edges(m))
        F.add(f"T2+K_{{1,{m}}}", {"T2": 1, "star_m": m}, n, indep_poly_from_edges(n, e))
    for m in range(1, (30 if not quick else 5) + 1):
        n, e = disjoint_union(T1, matching_edges(m))
        F.add(f"T1+{m}K_2", {"T1": 1, "matching": m}, n, indep_poly_from_edges(n, e))
    for m in range(1, (40 if not quick else 6) + 1):
        n, e = disjoint_union(*([star_edges(5)] * m))
        F.add(f"{m}K_{{1,5}}", {"copies_K15": m}, n, indep_poly_from_edges(n, e))
    for j in range(1, (10 if not quick else 4) + 1):
        for m in range(1, (20 if not quick else 4) + 1):
            n, e = disjoint_union(*([star_edges(j)] * m))
            F.add(f"{m}K_{{1,{j}}}", {"copies": m, "star_m": j}, n, indep_poly_from_edges(n, e))
    G44 = galvin_edges(4, 4)
    for m in range(1, (30 if not quick else 5) + 1):
        n, e = disjoint_union(G44, star_edges(m))
        F.add(f"T_{{4,4,1}}+K_{{1,{m}}}", {"galvin_T441": 1, "star_m": m}, n, indep_poly_from_edges(n, e))


def run_random(F_tree, F_forest, F_pa, checks, quick):
    # Prüfer decoder equivalence check against the library (smallest-leaf convention)
    rng = random.Random(SEED + 9)
    for _ in range(300):
        n = rng.randint(3, 40)
        seq = [rng.randrange(n) for _ in range(n - 2)]
        e1 = {frozenset(e) for e in prufer_edges_fast(seq, n)}
        e2 = {frozenset(e) for e in prufer_to_edges(seq, n)}
        assert e1 == e2, (n, seq)
    checks["prufer_fast_equals_library"] = True
    sizes = [30, 50, 100, 200, 300] if not quick else [30, 50]
    per = 600 if not quick else 40
    for n in sizes:
        rng = random.Random(SEED * 1000 + n)
        for i in range(per):
            seq = [rng.randrange(n) for _ in range(n - 2)]
            e = prufer_edges_fast(seq, n)
            F_tree.add(f"prufer(n={n},#{i})", {"n": n, "index": i, "seed": SEED * 1000 + n,
                                                "prufer": seq if n <= 300 else None},
                       n, indep_poly_from_edges(n, e))
    fsizes = [30, 50, 100, 200] if not quick else [30, 50]
    fper = 200 if not quick else 20
    for n in fsizes:
        for q in (0.5, 0.8, 0.95):
            rng = random.Random(SEED * 1000 + n + int(q * 100))
            for i in range(fper):
                _, e = random_forest_edges(rng, n, q)
                F_forest.add(f"forest(n={n},q={q},#{i})", {"n": n, "q": q, "index": i,
                                                          "seed": SEED * 1000 + n + int(q * 100),
                                                          "edges": e if n <= 100 else None},
                             n, indep_poly_from_edges(n, e))
    psizes = [50, 100, 200, 300] if not quick else [50]
    pper = 200 if not quick else 20
    for n in psizes:
        rng = random.Random(SEED * 7 + n)
        for i in range(pper):
            _, e = pref_attach_edges(rng, n)
            F_pa.add(f"prefattach(n={n},#{i})", {"n": n, "index": i, "seed": SEED * 7 + n,
                                                  "edges": e if n <= 100 else None},
                     n, indep_poly_from_edges(n, e))


def run_spider_stars(F, quick):
    A = 60 if not quick else 12
    for a in range(0, A + 1):
        for b in range(0, A + 1):
            if a + b == 0:
                continue
            n, e = spider_star_edges(a, b)
            F.add(f"SS(a={a},b={b})", {"pendant_K2": a, "pendant_leaves": b}, n, indep_poly_from_edges(n, e))


def run_extras(F_sti, F_two, F_ds, F_sos, quick):
    M = 100 if not quick else 15
    for m in range(1, M + 1):
        for j in range(0, M + 1):
            n, e = disjoint_union(star_edges(m), (j, []))
            F_sti.add(f"K_{{1,{m}}}+E_{j}", {"m": m, "isolated": j}, n, indep_poly_from_edges(n, e))
    A = 60 if not quick else 10
    for a in range(1, A + 1):
        for b in range(a, A + 1):
            n, e = disjoint_union(star_edges(a), star_edges(b))
            F_two.add(f"K_{{1,{a}}}+K_{{1,{b}}}", {"a": a, "b": b}, n, indep_poly_from_edges(n, e))
            n, e = double_star_edges(a, b)
            F_ds.add(f"DS({a},{b})", {"a": a, "b": b}, n, indep_poly_from_edges(n, e))
    K = 30 if not quick else 6
    for k in range(1, K + 1):
        for m in range(1, K + 1):
            n, e = star_of_stars_edges(k, m)
            F_sos.add(f"SoS(k={k},m={m})", {"k": k, "m": m}, n, indep_poly_from_edges(n, e))


def local_search(F, n, restarts, steps, cands, seed, r_min=1, r_max=None, forest=False, tag=""):
    """Sampled steepest descent on trees (or forests) of order n minimising
    the minimum prefix ISO ratio over r_min <= r <= min(r_max, L-1).  In every
    step `cands` random edge-swap (forest: also delete / add) neighbours are
    evaluated and the best one is taken if it does not increase the
    objective.  Every evaluated graph is audited (failure detection), not
    just the winners."""
    rng = random.Random(seed)
    INF = Fraction(10 ** 9)

    def objective(edge_set):
        edges = sorted(tuple(sorted(e)) for e in edge_set)
        p = indep_poly_from_edges(n, edges)
        res = F.add(f"{tag}search(n={n},seed={seed})", {"n": n, "seed": seed, "edges": edges}, n, p,
                    edges=edges)
        L = res["L"]
        best = None
        hi = L if r_max is None else min(L, r_max + 1)
        for r in range(max(1, r_min), hi):
            num = r * p[r] ** 2 + p[r - 1] ** 2
            den = (r + 1) * p[r - 1] * p[r + 1]
            if best is None or num * best[1] < best[0] * den:
                best = (num, den, r)
        return (Fraction(best[0], best[1]) if best else INF), p, (best[2] if best else None)

    def mutate(edge_set):
        edges = set(edge_set)
        move = rng.random()
        if forest and move < 0.25 and edges:
            edges.remove(rng.choice(sorted(edges, key=lambda e: tuple(sorted(e)))))
            return edges
        if forest and move < 0.5:
            comp, c = components(n, edges)
            if c >= 2:
                a = rng.randrange(n)
                others = [v for v in range(n) if comp[v] != comp[a]]
                edges.add(frozenset((a, rng.choice(others))))
                return edges
        if not edges:
            edges.add(frozenset(rng.sample(range(n), 2)))
            return edges
        e = rng.choice(sorted(edges, key=lambda e: tuple(sorted(e))))
        edges.remove(e)
        comp, c = components(n, edges)
        u, v = tuple(e)
        if rng.random() < 0.5:
            u, v = v, u
        cu = [w for w in range(n) if comp[w] == comp[u]]
        kind = rng.random()
        if kind < 1 / 3:
            # subtree relocation: re-hang v (with its side) on a random vertex of u's side
            edges.add(frozenset((rng.choice(cu), v)))
        elif kind < 2 / 3:
            # degree-biased relocation: target chosen with probability ~ degree + 1
            deg = {w: 1 for w in cu}
            for f in edges:
                for w in f:
                    if w in deg:
                        deg[w] += 1
            edges.add(frozenset((rng.choices(cu, weights=[deg[w] for w in cu])[0], v)))
        else:
            # random edge swap between the two sides
            cv = [w for w in range(n) if comp[w] == comp[v]]
            edges.add(frozenset((rng.choice(cu), rng.choice(cv))))
        return edges

    results = []
    for restart in range(restarts + 1):
        if restart == restarts:
            # final restart from the natural reference configuration
            if forest:
                cur = set()
                start = "edgeless"
            else:
                cur = {frozenset((0, i)) for i in range(1, n)}
                start = "star"
        else:
            seq = [rng.randrange(n) for _ in range(n - 2)]
            cur = {frozenset(e) for e in prufer_edges_fast(seq, n)}
            start = "random tree"
            if forest:
                # random starting forest: drop each edge with probability 1/4
                cur = {e for e in cur if rng.random() < 0.75}
                start = "random forest"
        cur_obj, cur_p, cur_r = objective(cur)
        start_obj = cur_obj
        steps_taken = 0
        for _ in range(steps):
            best = None
            for _ in range(cands):
                cand = mutate(cur)
                obj, p, r = objective(cand)
                if best is None or obj < best[0]:
                    best = (obj, cand, p, r)
            if best[0] <= cur_obj:
                cur, cur_obj, cur_p, cur_r = best[1], best[0], best[2], best[3]
                steps_taken += 1
            else:
                break
        deg = [0] * n
        for e in cur:
            for v in e:
                deg[v] += 1
        results.append({"n": n, "r_min": r_min, "r_max": r_max, "start": start,
                        "start_ratio": float(start_obj), "final_ratio": float(cur_obj),
                        "final_ratio_exact": f"{cur_obj.numerator}/{cur_obj.denominator}",
                        "final_r": cur_r, "steps_taken": steps_taken,
                        "is_star": max(deg) == n - 1 and len(cur) == n - 1,
                        "edge_count": len(cur), "max_degree": max(deg),
                        "degree_sequence": sorted(deg, reverse=True),
                        "poly": [str(c) for c in cur_p],
                        "edges": sorted(tuple(sorted(e)) for e in cur)})
    return results


def run_search(F_tree, F_forest, F_r3, checks, quick):
    # r = 1 is uninformative (Q_1 = n + 1 + 2e for every graph on n vertices
    # with e edges, and the r=1 ratio is constant over trees of order n), and
    # Q_2 >= Q_2(K_{1,n-1}) > 0 for every forest (see FAMILIES_STRESS_NOTES.md),
    # so the searches target r >= 2 (sanity: should rediscover the star),
    # r >= 3 and r >= 4.
    # objective key -> (r_min, r_max, forest?, sizes)
    big = [20, 30, 45, 60, 100]
    plan = {
        "trees_r_ge_2": (2, None, False, [20, 30]),
        "trees_r_ge_3": (3, None, False, [20, 30, 45, 60]),
        "trees_r_ge_4": (4, None, False, [20, 30, 45, 60]),
        "forests_r_ge_3": (3, None, True, [20, 30, 45]),
        "trees_r_eq_3": (3, 3, False, big),
        "trees_r_eq_4": (4, 4, False, big),
        "forests_r_eq_3": (3, 3, True, [20, 30, 45, 60]),
    }
    if quick:
        plan = {k: (a, b, c, [20]) for k, (a, b, c, _) in plan.items()}
    restarts, cands = (4, 30) if not quick else (1, 6)
    out = {}
    for j, (key, (rmin, rmax, forest, sizes)) in enumerate(plan.items()):
        rows = []
        for n in sizes:
            fam = F_forest if forest else (F_tree if rmin == 2 else F_r3)
            steps = (80 if n <= 30 else (150 if n <= 60 else 200)) if not quick else 6
            rows += local_search(fam, n, restarts if n < 100 else 2, steps, cands, SEED + 1000 * j + n,
                                 r_min=rmin, r_max=rmax, forest=forest, tag=key + "-")
        out[key] = rows
    # references at the same n and the same r-range: star K_{1,n-1} and edgeless E_n
    for key, rows in out.items():
        rmin, rmax = plan[key][0], plan[key][1]
        for row in rows:
            n = row["n"]
            refs = {}
            for name, p in (("star", [comb(n - 1, r) for r in range(n)]), ("edgeless", [comb(n, r) for r in range(n + 1)])):
                if name == "star":
                    p[1] += 1
                L = L_cutoff(len(p) - 1)
                hi = L if rmax is None else min(L, rmax + 1)
                best = None
                for r in range(rmin, hi):
                    num = r * p[r] ** 2 + p[r - 1] ** 2
                    den = (r + 1) * p[r - 1] * p[r + 1]
                    if best is None or num * best[1] < best[0] * den:
                        best = (num, den, r)
                refs[name] = best
            fin = Fraction(row["final_ratio_exact"])
            row["star_reference_ratio"] = float(Fraction(refs["star"][0], refs["star"][1]))
            row["star_reference_r"] = refs["star"][2]
            row["beats_star"] = fin < Fraction(refs["star"][0], refs["star"][1])
            row["edgeless_reference_ratio"] = float(Fraction(refs["edgeless"][0], refs["edgeless"][1]))
            row["edgeless_reference_r"] = refs["edgeless"][2]
            row["beats_edgeless"] = fin < Fraction(refs["edgeless"][0], refs["edgeless"][1])
    checks["local_search"] = out


def run_fixed_n(F, checks, quick):
    """At fixed order n compare the ISO ratio at r = 2..6 across many
    hub-like shapes (the ratio at fixed r decays like 1/n, so shapes must be
    compared at equal n).  Records the minimiser per r."""
    R_LIST = [2, 3, 4, 5, 6]
    table = {}
    for n in ([30, 60, 100] if not quick else [30]):
        cands = []
        cands.append(("star K_{1,%d}" % (n - 1), star_edges(n - 1)))
        cands.append(("edgeless E_%d (forest)" % n, (n, [])))
        cands.append(("path P_%d" % n, path_edges(n)))
        cands.append(("K_{1,%d}+K_1 (forest)" % (n - 2), disjoint_union(star_edges(n - 2), (1, []))))
        cands.append(("K_{1,%d}+E_2 (forest)" % (n - 3), disjoint_union(star_edges(n - 3), (2, []))))
        if n % 2 == 0:
            cands.append(("matching %dK_2 (forest)" % (n // 2), matching_edges(n // 2)))
        for a in range(1, (n - 2) // 2 + 1):
            cands.append((f"double star DS({a},{n - 2 - a})", double_star_edges(a, n - 2 - a)))
        for a in range(0, (n - 1) // 2 + 1):
            cands.append((f"spider-star SS(a={a},b={n - 1 - 2 * a})", spider_star_edges(a, n - 1 - 2 * a)))
        for h in range(1, n):
            cands.append((f"broom(h={h},m={n - h})", broom_edges(h, n - h)))
        for h in range(2, n - 1):
            for m1 in range(1, (n - h) // 2 + 1):
                m2 = n - h - m1
                if m2 >= 1:
                    cands.append((f"double broom(h={h},{m1},{m2})", double_broom_edges(h, m1, m2)))
        for k in range(1, n):
            if (n - 1) % k == 0:
                cands.append((f"spider S({k}x{(n - 1) // k})", spider_edges(k, (n - 1) // k)))
                m = (n - 1) // k - 1
                if m >= 1:
                    cands.append((f"star of stars SoS(k={k},m={m})", star_of_stars_edges(k, m)))
        for s in range(2, n):
            if n % s == 0 and n // s - 1 >= 1:
                cands.append((f"regular caterpillar(s={s},c={n // s - 1})", caterpillar_edges([n // s - 1] * s)))
        for m in range(1, n):
            for t in range(1, n):
                if 1 + m + 2 * m * t == n:
                    cands.append((f"Galvin T_{{{m},{t},1}}", galvin_edges(m, t)))
        for a in range(1, n - 2):
            b = n - 2 - a
            if b >= a:
                cands.append((f"two stars K_{{1,{a}}}+K_{{1,{b}}} (forest)", disjoint_union(star_edges(a), star_edges(b))))
        for j in range(3, n - 1):
            cands.append((f"K_{{1,{n - 1 - j}}}+E_{j} (forest)", disjoint_union(star_edges(n - 1 - j), (j, []))))
        best = {r: None for r in R_LIST}
        best_tree = {r: None for r in R_LIST}
        r2_all = []
        for label, (nn, e) in cands:
            assert nn == n, (label, nn)
            p = indep_poly_from_edges(n, e)
            F.add(f"n={n}: {label}", {"n": n, "shape": label}, n, p)
            L = L_cutoff(len(p) - 1)
            is_tree = len(e) == n - 1
            for r in R_LIST:
                if r < L:
                    num = r * p[r] ** 2 + p[r - 1] ** 2
                    den = (r + 1) * p[r - 1] * p[r + 1]
                    if best[r] is None or num * best[r][1] < best[r][0] * den:
                        best[r] = (num, den, label)
                    if is_tree and (best_tree[r] is None or num * best_tree[r][1] < best_tree[r][0] * den):
                        best_tree[r] = (num, den, label)
                    if r == 2:
                        r2_all.append((Fraction(num, den), label))
        r2_all.sort()
        table[str(n)] = {
            "candidates": len(cands),
            "min_ratio_by_r": {str(r): (dict(ratio_record(b[0], b[1]), shape=b[2]) if b else None)
                               for r, b in best.items()},
            "min_ratio_by_r_trees_only": {str(r): (dict(ratio_record(b[0], b[1]), shape=b[2]) if b else None)
                                          for r, b in best_tree.items()},
            "r2_ranking_top5": [[lab, float(q), float(q - 1)] for q, lab in r2_all[:5]],
        }
        # ranking of the named references at each r
        refs = {}
        for label, (nn, e) in cands[:5]:
            p = indep_poly_from_edges(n, e)
            L = L_cutoff(len(p) - 1)
            refs[label] = {str(r): float(Fraction(r * p[r] ** 2 + p[r - 1] ** 2, (r + 1) * p[r - 1] * p[r + 1]))
                           for r in R_LIST if r < L}
        table[str(n)]["reference_ratios"] = refs
    checks["fixed_n_shape_comparison"] = table


def run_asymptotic_scans(checks, quick):
    """Closed-form large-n scans (exact rationals) of the two shapes that are
    tightest at r >= 3 in the fixed-n comparison:
      K_{1,m} + E_j  : p_r = C(N,r) + C(j,r-1),                 N = m + j = n - 1
      double broom (h=3,a,b): p_r = C(N,r) + C(N,r-1) + C(a,r-1) + C(b,r-1) + [r=2], N = a+b = n-3
    (I = ((1+x)^a + x)((1+x)^b + x) + x(1+x)^{a+b} for the spine-3 double broom).
    Reports, for r = 2,3,4, the parameter minimising the ratio at fixed n and
    n*(ratio-1); the first-order heuristic predicts n*(ratio-1) -> 0.81 (r=3)
    and 0.90 (r=4) for K_{1,m}+E_j at j/n -> 0.211 resp. 0.355."""
    out = {}
    ns = [50, 100, 200, 500, 1000, 2000, 5000, 10000] if not quick else [50, 100]

    def ratio(p, r):
        return Fraction(r * p[r] ** 2 + p[r - 1] ** 2, (r + 1) * p[r - 1] * p[r + 1])

    def star_iso(n, j, rmax=5):
        N = n - 1
        return [comb(N, r) + (comb(j, r - 1) if r >= 1 else 0) for r in range(rmax + 1)]

    def dbroom3(n, a, rmax=5):
        N = n - 3
        b = N - a
        return [comb(N, r) + (comb(N, r - 1) if r >= 1 else 0) + (comb(a, r - 1) + comb(b, r - 1) if r >= 1 else 0)
                + (1 if r == 2 else 0) for r in range(rmax + 1)]

    # cross-check closed forms against the DP on small cases
    for n in (12, 25, 40):
        for j in (0, 3, n // 3, n - 1):
            p = indep_poly_from_edges(*disjoint_union(star_edges(n - 1 - j), (j, [])))
            assert p[:6] == star_iso(n, j)[:len(p[:6])], (n, j)
        for a in (1, 5, (n - 3) // 2):
            p = indep_poly_from_edges(*double_broom_edges(3, a, n - 3 - a))
            assert p[:6] == dbroom3(n, a)[:len(p[:6])], (n, a)
    for n in ns:
        rec = {}
        for r in (2, 3, 4):
            best = None
            for j in range(0, n):
                p = star_iso(n, j)
                q = ratio(p, r)
                if best is None or q < best[0]:
                    best = (q, j)
            q, j = best
            rec[f"star+isolated r={r}"] = {"argmin_j": j, "j_over_n": j / n, "ratio": float(q),
                                          "excess": float(q - 1), "n_times_excess": float(n * (q - 1))}
            best = None
            for a in range(1, (n - 3) // 2 + 1):
                p = dbroom3(n, a)
                q = ratio(p, r)
                if best is None or q < best[0]:
                    best = (q, a)
            q, a = best
            rec[f"double_broom_h3 r={r}"] = {"argmin_a": a, "a_over_n": a / n, "ratio": float(q),
                                            "excess": float(q - 1), "n_times_excess": float(n * (q - 1))}
            ps = star_iso(n, 0)
            pe = [comb(n, k) for k in range(6)]
            rec[f"star r={r}"] = {"excess": float(ratio(ps, r) - 1), "n_times_excess": float(n * (ratio(ps, r) - 1))}
            rec[f"edgeless r={r}"] = {"excess": float(ratio(pe, r) - 1), "n_times_excess": float(n * (ratio(pe, r) - 1))}
        out[str(n)] = rec
    checks["asymptotic_scans"] = out


def run_patternboost(F, checks, path, download, limit=None):
    if not os.path.exists(path) and download:
        import urllib.request
        print(f"  downloading {PB_URL} -> {path}")
        urllib.request.urlretrieve(PB_URL, path)
    if not os.path.exists(path):
        checks["patternboost60"] = {"status": "skipped (file not found)", "path": path, "url": PB_URL}
        F.notes.append(f"skipped: {path} not found (download from {PB_URL})")
        return
    with open(path, "rb") as fh:
        data = fh.read()
    sha = hashlib.sha256(data).hexdigest()
    lines = [ln.strip() for ln in data.decode().splitlines() if ln.strip()]
    if limit is not None:
        lines = lines[:limit]
    n = 60
    invalid = 0
    dup = 0
    seen = set()
    positive_score = 0
    score_index = n // 2       # Ramos-Sun score: a_{29} a_{31} - a_{30}^2 (index N/2 = 30)
    for i, ln in enumerate(lines):
        try:
            seq = json.loads(ln)
        except json.JSONDecodeError:
            invalid += 1
            continue
        if len(seq) != n - 2 or any(not (1 <= v <= n) for v in seq):
            invalid += 1
            continue
        seq0 = [v - 1 for v in seq]
        e = prufer_edges_fast(seq0, n)
        key = tuple(sorted(tuple(sorted(x)) for x in e))
        if key in seen:
            dup += 1
        seen.add(key)
        p = indep_poly_from_edges(n, e)
        if len(p) > score_index + 1 and p[score_index - 1] * p[score_index + 1] > p[score_index] ** 2:
            positive_score += 1
        F.add(f"PB60#{i}", {"line": i, "prufer_1based": seq}, n, p)
    checks["patternboost60"] = {
        "status": "ok", "path": path, "url": PB_URL, "sha256": sha,
        "lines": len(lines), "invalid_codes": invalid, "duplicate_labelled_trees": dup,
        "trees_with_positive_score_at_index_30": positive_score,
        "non_log_concave_count": F.non_lc,
    }
    F.notes.append("Prüfer codes (1-based) from Ramos-Sun 60_vertex_output/search_output_11.txt, "
                   "decoded with the smallest-leaf convention used by their Julia code.")


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true", help="reduced sizes (smoke test)")
    ap.add_argument("--pb", default=PB_DEFAULT_PATH, help="PatternBoost Prüfer-code file")
    ap.add_argument("--download", action="store_true", help="download the PatternBoost file if missing")
    ap.add_argument("--out", default=os.path.join(HERE, "results", "families_stress.json"))
    args = ap.parse_args()
    quick = args.quick

    t_start = time.time()
    print("forest_indep self-test ...", flush=True)
    fi._selftest(verbose=False)
    print("  PASS", flush=True)

    fams = {}

    def F(key, desc, keep=True, cap=2500):
        fams[key] = Family(key, desc, keep_members=keep, member_cap=cap)
        return fams[key]

    checks = {}
    stages = []

    def stage(name, fn):
        t0 = time.time()
        print(f"[{name}] ...", flush=True)
        fn()
        dt = time.time() - t0
        stages.append({"stage": name, "seconds": round(dt, 2)})
        print(f"[{name}] done in {dt:.1f}s", flush=True)

    stage("1 stars", lambda: run_stars(F("stars", "Stars K_{1,m}; closed form (1+x)^m+x, DP cross-checked"), checks, quick))
    stage("2 paths/matchings/edgeless", lambda: run_paths(
        F("paths", "Paths P_n"), F("matchings", "Matchings mK_2 (real-rooted)"),
        F("edgeless", "Edgeless forests E_n (binomial rows, real-rooted)"), quick))
    stage("3 spiders/brooms", lambda: run_spiders(
        F("spiders", "Spiders S(k legs x length l)"), F("brooms", "Brooms: path on h vertices + star of m leaves at one end"),
        F("double_brooms", "Double brooms: path on h vertices, m1 and m2 leaves at the ends"), quick))
    stage("4 caterpillars", lambda: run_caterpillars(F("caterpillars", "Caterpillars: seeded random leg counts, one-hub and regular", cap=1500), quick))
    stage("5 complete d-ary", lambda: run_complete_dary(F("complete_dary", "Complete d-ary trees, d=2..5"), quick))
    stage("6 KLYM", lambda: run_klym(
        F("klym_3kk", "Kadrawi-Levit-Yosef-Mizrachi (3,k,k) trees"),
        F("klym_3star_k_k+1", "Kadrawi-Levit (3*,k,k+1) trees (P4 attached at an END vertex)"),
        F("klym_left_kk", "(left,k,k) trees, left=3..8"),
        F("klym_variants", "(3,k,k+1), (3,k,k+2), (3*,k,k+2), (3*,k,k+3), (3*,k,k)"), checks, quick))
    stage("7 Galvin / Bencs", lambda: run_galvin(
        F("galvin_Tmt1", "Galvin T_{m,t,1}: t=2..12, m=1..40, plus T_{t,t,1} to t=20"),
        F("bencs_T2m1n", "Bencs spherically symmetric T(2^m 1^n) with multiple LC breaks"), checks, quick))
    stage("8 unions", lambda: run_unions(F("unions", "Disjoint unions: mT1, mT2, T1+T2, T1+stars/E_m/paths/matchings, star forests"), quick))
    stage("9 random", lambda: run_random(
        F("random_trees", "Uniform random labelled trees (Prüfer), n=30,50,100,200,300, 600 each", keep=False),
        F("random_forests", "Random recursive forests (parent pointers kept w.p. q), n=30..200", keep=False),
        F("random_pref_attach", "Preferential-attachment random trees (hubs), n=50..300", keep=False), checks, quick))
    stage("10 spider-stars", lambda: run_spider_stars(F("spider_stars", "Centre with a pendant K2's and b pendant leaves, a,b<=60"), quick))
    stage("11a extras", lambda: run_extras(
        F("star_plus_isolated", "K_{1,m} + E_j (forest extremal configuration at r=2)", keep=False),
        F("two_stars", "K_{1,a} + K_{1,b}"), F("double_stars", "Double stars DS(a,b)"),
        F("star_of_stars", "Root with k children each with m leaves"), quick))
    stage("11b local search", lambda: run_search(
        F("search_trees_r_ge_2", "Sampled steepest descent over trees minimising the min prefix ISO ratio over r>=2 (every evaluated tree audited)", keep=False),
        F("search_forests_r_ge_3", "Sampled steepest descent over forests minimising the prefix ISO ratio over r>=3 / at r=3", keep=False),
        F("search_trees_r_ge_3_4", "Sampled steepest descent over trees minimising the prefix ISO ratio over r>=3, r>=4, and at r=3, r=4 exactly", keep=False),
        checks, quick))
    stage("11c fixed-n shapes", lambda: run_fixed_n(
        F("fixed_n_shapes", "All hub-like shapes at fixed n=30,60,100 (ratio compared at equal order)", keep=False),
        checks, quick))
    stage("11d asymptotic scans", lambda: run_asymptotic_scans(checks, quick))
    stage("12 PatternBoost 60", lambda: run_patternboost(
        F("patternboost60", "Ramos-Sun PatternBoost final-epoch 60-vertex trees (50k Prüfer codes)", keep=False),
        checks, args.pb, args.download, limit=(1000 if quick else None)))

    total = time.time() - t_start
    all_failures = [f for fam in fams.values() for f in fam.failures]
    print()
    print("=" * 100)
    for fam in fams.values():
        print(fam.one_line())
    print("=" * 100)
    if all_failures:
        print(f"!!! {len(all_failures)} PREFIX FAILURES (WR or ISO) -- see JSON 'prefix_failures' !!!")
        for f in all_failures[:20]:
            print("   ", f["kind"], f["family"], f["label"], "r=", f["r"], "coeffs=", f["coeffs"], f.get("Q"), f.get("slack"))
    else:
        print("No WR or ISO prefix failure in any tested tree or forest.")
    # global minimum ratio
    gmin = None
    for fam in fams.values():
        if fam.ratio_min is not None:
            num, den = fam.ratio_min[:2]
            if gmin is None or num * gmin[1] < gmin[0] * den:
                gmin = (num, den, fam.key, fam.ratio_min[3], fam.ratio_min[2])
    if gmin:
        print(f"Global min prefix ISO ratio: {float(Fraction(gmin[0], gmin[1])):.12f} "
              f"family={gmin[2]} member={gmin[3]} r={gmin[4]}")
    checks["star_comparison_by_order"] = star_comparison(fams)
    sc = checks["star_comparison_by_order"]
    for r in STAR_CMP_R:
        b, bt = sc[str(r)]['orders_where_star_beaten'], sc[str(r)]['orders_where_star_beaten_by_a_tree']
        print(f"r={r}: orders compared with K_{{1,n-1}}: {sc[str(r)]['orders_compared']}; "
              f"star beaten by some forest at {len(b)} orders {b if len(b) <= 12 else str(b[:12]) + '...'}; "
              f"by some tree at {len(bt)} orders {bt if len(bt) <= 12 else str(bt[:12]) + '...'}")
    print(f"total runtime {total:.1f}s")

    result = {
        "meta": {
            "script": "families_stress.py",
            "seed": SEED,
            "quick": quick,
            "python": sys.version.split()[0],
            "total_seconds": round(total, 1),
            "stages": stages,
            "framework": {"L": "ceil((2 alpha - 1)/3)", "prefix": "1 <= r <= L-1",
                          "WR_r": "p_{r-1} <= r p_r", "ISO_r": "r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0",
                          "ISO_ratio": "(r p_r^2 + p_{r-1}^2)/((r+1) p_{r-1} p_{r+1})"},
            "disclaimer": "Finite testing; falsification evidence only, proves nothing.",
        },
        "prefix_failures_total": len(all_failures),
        "prefix_failures": all_failures,
        "global_min_prefix_iso_ratio": (dict(ratio_record(gmin[0], gmin[1]), family=gmin[2], label=gmin[3], r=gmin[4])
                                        if gmin else None),
        "construction_checks": checks,
        "families": {k: v.summary() for k, v in fams.items()},
    }
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    text = dumps_compact(result)
    assert json.loads(text) == json.loads(json.dumps(result))   # round-trip check of the writer
    with open(args.out, "w") as fh:
        fh.write(text)
        fh.write("\n")
    print(f"wrote {args.out} ({os.path.getsize(args.out) / 1e6:.1f} MB)")


def star_comparison(fams):
    """For every order n that occurs anywhere in the run and every r in
    STAR_CMP_R, the smallest ISO ratio at that r over ALL audited sequences of
    order n (trees and forests, all families, every local-search evaluation),
    compared with the star K_{1,n-1} of the same order (closed form)."""
    out = {}
    for r in STAR_CMP_R:
        glob, glob_tree = {}, {}
        for fam in fams.values():
            for target, source in ((glob, fam.min_by_n_r), (glob_tree, fam.min_by_n_r_tree)):
                for (n, rr), (nn, dd, label) in source.items():
                    if rr != r:
                        continue
                    cur = target.get(n)
                    if cur is None or nn * cur[1] < cur[0] * dd:
                        target[n] = (nn, dd, label, fam.key)
        rows = []
        beaten, beaten_tree = [], []
        for n in sorted(glob):
            m = n - 1
            if r >= L_cutoff(m):
                continue
            # star K_{1,m}: p_k = C(m,k) except p_1 = m + 1
            p = {k: comb(m, k) + (1 if k == 1 else 0) for k in (r - 1, r, r + 1)}
            snum = r * p[r] ** 2 + p[r - 1] ** 2
            sden = (r + 1) * p[r - 1] * p[r + 1]
            nn, dd, label, fam = glob[n]
            beats = nn * sden < snum * dd
            if beats:
                beaten.append(n)
            row = [n, float(Fraction(nn, dd)), label, fam, float(Fraction(snum, sden)), beats,
                   float(Fraction(nn * sden - snum * dd, snum * dd))]
            t = glob_tree.get(n)
            if t is not None:
                tn, td, tlabel, tfam = t
                tbeats = tn * sden < snum * td
                if tbeats:
                    beaten_tree.append(n)
                row += [float(Fraction(tn, td)), tlabel, tfam, tbeats, float(Fraction(tn * sden - snum * td, snum * td))]
            else:
                row += [None, None, None, None, None]
            if n <= 400 or beats:
                rows.append(row)
        out[str(r)] = {
            "columns": ["n", "min_ratio_all_audited", "label", "family", "star_ratio", "beats_star",
                        "relative_difference_(min/star - 1)",
                        "min_ratio_trees_only", "tree_label", "tree_family", "tree_beats_star",
                        "tree_relative_difference"],
            "orders_compared": sum(1 for n in glob if r < L_cutoff(n - 1)),
            "orders_where_star_beaten": beaten,
            "orders_where_star_beaten_by_a_tree": beaten_tree,
            "rows_(n<=400_or_beaten)": rows,
        }
    return out


def _has_dict(obj):
    if isinstance(obj, dict):
        return True
    if isinstance(obj, list):
        return any(_has_dict(x) for x in obj)
    return False


def dumps_compact(obj, indent=1, level=0):
    """json.dumps with indentation for dicts, but lists that contain no dict
    are written on one line (or, if long and made of lists, one element per
    line), so member tables stay one row per line."""
    pad = " " * (indent * level)
    pad1 = " " * (indent * (level + 1))
    if isinstance(obj, dict):
        if not obj:
            return "{}"
        items = [f"{pad1}{json.dumps(str(k))}: {dumps_compact(v, indent, level + 1)}" for k, v in obj.items()]
        return "{\n" + ",\n".join(items) + f"\n{pad}}}"
    if isinstance(obj, list):
        if not obj:
            return "[]"
        if not _has_dict(obj):
            flat = json.dumps(obj, separators=(",", ":"))
            if len(flat) <= 400 or not all(isinstance(x, list) for x in obj):
                return flat
            rows = [pad1 + json.dumps(x, separators=(",", ":")) for x in obj]
            return "[\n" + ",\n".join(rows) + f"\n{pad}]"
        items = [pad1 + dumps_compact(x, indent, level + 1) for x in obj]
        return "[\n" + ",\n".join(items) + f"\n{pad}]"
    return json.dumps(obj)


if __name__ == "__main__":
    main()
