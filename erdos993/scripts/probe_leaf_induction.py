#!/usr/bin/env python3
"""Structural probe of the leaf-deletion induction for ISO_r on forests (Erdős #993 audit).

Setting.  For a tree (or forest) T with a leaf l whose neighbour is v put
A = T - l, B = T - l - v, C = T - N[v] (so A = B + v, I(A) = I(B) + x I(C)) and

    I(T) = I(A) + x I(B),      p_r(T) = a_r + b_{r-1} = b_r + b_{r-1} + c_{r-1}.

With Q_r(p) = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} (ISO_r is Q_r >= 0) one has the
exact identity (checked on every instance)

    Q_r(T) = Q_r(a) + Q_{r-1}(b) + R,      R = LC_{r-1}(b) + CROSS,
    LC_{r-1}(b) = b_{r-1}^2 - b_{r-2} b_r,
    CROSS = 2r a_r b_{r-1} + 2 a_{r-1} b_{r-2} - (r+1)(a_{r-1} b_r + a_{r+1} b_{r-2}).

A leaf-deletion induction proves ISO_r(T) from ISO_r(A) and ISO_{r-1}(B) iff the
*leaf lemma* R >= 0 holds.  This script measures, with exact integer arithmetic:

  (1) signs of CROSS and R on all trees n <= 16, every leaf, every r (all indices and the
      prefix r <= L(alpha)-1), worst normalised residuals R / (p_{r-1} p_r), witnesses, and
      the closed form on stars;
  (2) which candidate "payment" terms are universally non-negative on the data, the
      payment capacities and a payment LP (HiGHS, rationalised and re-verified exactly),
      an IH-usage LP, and an exact *certificate* LP that tries to write R as a
      non-negative combination of provably non-negative quadratic forms in the
      (b, c)-coordinates (this is the symbolic proof attempt);
  (3) the descent-conditional (p_r <= p_{r-1}) and r >= 3 restrictions of (2);
  (4) the strengthened targets FLC (Q_r >= p_{r-1}^2) and PLC (p_r^2 >= p_{r-1} p_{r+1}) on all
      trees n <= 18 (prefix and all indices), on the named non-log-concave families, and the
      closing inequalities of their leaf inductions;
  (5) closure of ISO / FLC / PLC under convolution (forests versus trees).

Usage: python3 scripts/probe_leaf_induction.py [--nmax 16] [--nmax-flc 18]
       [--out reports/leaf_induction_probe.json] [--seed 993]

Single process, exact integers / Fractions everywhere except inside the LP solver
(HiGHS via scipy); every LP solution is rationalised and re-verified exactly.
"""

from __future__ import annotations

import argparse
import itertools
import math
import os
import random
import sys
import time
from fractions import Fraction
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from erdos993lib.checks import tail_cutoff  # noqa: E402
from erdos993lib.families import T3mn, T3mn_star, bush, star  # noqa: E402
from erdos993lib.indpoly import indpoly_forest, indpoly_parent_array, poly_mul  # noqa: E402
from erdos993lib.report import provenance, write_report  # noqa: E402
from erdos993lib.trees import A000055, forest_polys, free_trees, parent_to_edges  # noqa: E402

try:
    from scipy.optimize import linprog as _scipy_linprog

    HAVE_SCIPY = True
except Exception:  # pragma: no cover
    HAVE_SCIPY = False

OFF = 2  # poly index k is stored at column k + OFF so that k = -1, -2 read as 0
K = 24


def log(msg: str) -> None:
    print(msg, flush=True)


def frac_json(num: int, den: int) -> Dict[str, Any]:
    f = Fraction(int(num), int(den))
    return {"exact": str(f), "float": float(f)}


def fr_json(f: Fraction) -> Dict[str, Any]:
    return {"exact": str(f), "float": float(f)}


def coef(p: Sequence[int], k: int) -> int:
    return int(p[k]) if 0 <= k < len(p) else 0


def Q(p: Sequence[int], r: int) -> int:
    return r * coef(p, r) ** 2 + coef(p, r - 1) ** 2 - (r + 1) * coef(p, r - 1) * coef(p, r + 1)


def strip(p: List[int]) -> List[int]:
    p = list(p)
    while len(p) > 1 and p[-1] == 0:
        p.pop()
    return p


def sub_forest_poly(n: int, edges: Sequence[Tuple[int, int]], removed: set) -> List[int]:
    keep = [u for u in range(n) if u not in removed]
    idx = {u: i for i, u in enumerate(keep)}
    e2 = [(idx[u], idx[w]) for u, w in edges if u not in removed and w not in removed]
    return indpoly_forest(len(keep), e2)


# ----------------------------------------------------------------------------------------
# Instance data (trees n <= NMAX, every leaf)
# ----------------------------------------------------------------------------------------


class Instances:
    """All (tree, leaf) instances for 3 <= n <= nmax, polys stored as padded int64 rows."""

    def __init__(self, nmax: int) -> None:
        t0 = time.time()
        self.nmax = nmax
        self.parents: List[List[int]] = []
        self.tree_n: List[int] = []
        meta: List[Tuple[int, int, int, int, int, int]] = []  # (tree_id, n, leaf, v, alpha, L)
        P: List[List[int]] = []
        A: List[List[int]] = []
        B: List[List[int]] = []
        C: List[List[int]] = []
        self.count_by_n: Dict[int, int] = {}
        self.trees_by_n: Dict[int, int] = {}
        for n in range(3, nmax + 1):
            cnt = 0
            tcount = 0
            for parent in free_trees(n):
                tcount += 1
                tid = len(self.parents)
                self.parents.append(list(parent))
                self.tree_n.append(n)
                edges = parent_to_edges(parent)
                adj: List[List[int]] = [[] for _ in range(n)]
                for u, w in edges:
                    adj[u].append(w)
                    adj[w].append(u)
                pT = indpoly_parent_array(parent)
                alpha = len(pT) - 1
                L = tail_cutoff(alpha)
                for leaf in range(n):
                    if len(adj[leaf]) != 1:
                        continue
                    v = adj[leaf][0]
                    a = sub_forest_poly(n, edges, {leaf})
                    b = sub_forest_poly(n, edges, {leaf, v})
                    c = sub_forest_poly(n, edges, {leaf, v} | set(adj[v]))
                    meta.append((tid, n, leaf, v, alpha, L))
                    P.append(pT)
                    A.append(a)
                    B.append(b)
                    C.append(c)
                    cnt += 1
            self.count_by_n[n] = cnt
            self.trees_by_n[n] = tcount
            assert tcount == A000055[n], (n, tcount)
        self.M = len(meta)
        self.meta = np.array(meta, dtype=np.int64)
        self.P = self._pad(P)
        self.A = self._pad(A)
        self.B = self._pad(B)
        self.C = self._pad(C)
        # exact identity checks p_r = a_r + b_{r-1}, a_r = b_r + c_{r-1}
        assert np.array_equal(self.P[:, OFF:], self.A[:, OFF:] + self.B[:, OFF - 1 : K - 1])
        assert np.array_equal(self.A[:, OFF:], self.B[:, OFF:] + self.C[:, OFF - 1 : K - 1])
        self.seconds = time.time() - t0

    @staticmethod
    def _pad(polys: List[List[int]]) -> np.ndarray:
        arr = np.zeros((len(polys), K), dtype=np.int64)
        for i, p in enumerate(polys):
            arr[i, OFF : OFF + len(p)] = p
        return arr

    def col(self, arr: np.ndarray, k: int) -> np.ndarray:
        return arr[:, k + OFF]

    def witness(self, i: int, r: int) -> Dict[str, Any]:
        tid, n, leaf, v, alpha, L = (int(x) for x in self.meta[i])
        parent = self.parents[tid]
        return {
            "n": n,
            "edges": [list(e) for e in parent_to_edges(parent)],
            "parent_array": parent,
            "leaf": leaf,
            "leaf_neighbour": v,
            "r": r,
            "alpha": alpha,
            "L": L,
            "p_T": strip(list(self.P[i, OFF:])),
            "a": strip(list(self.A[i, OFF:])),
            "b": strip(list(self.B[i, OFF:])),
            "c": strip(list(self.C[i, OFF:])),
            "shape": describe_shape(parent),
        }


def describe_shape(parent: Sequence[int]) -> str:
    n = len(parent)
    deg = [0] * n
    for v in range(1, n):
        deg[v] += 1
        deg[parent[v]] += 1
    leaves = sum(1 for d in deg if d == 1)
    if leaves == n - 1:
        return "star K_{1,%d}" % (n - 1)
    if leaves == 2:
        return "path P_%d" % n
    internal = sorted((d for d in deg if d >= 2), reverse=True)
    if len(internal) == 2:
        return "double star / broom-like (internal degrees %s)" % internal
    return "leaves=%d, internal degrees=%s" % (leaves, internal[:6])


# ----------------------------------------------------------------------------------------
# Per-r coordinate bundles (vectorised, int64 -- all magnitudes < 2^62 for n <= 18)
# ----------------------------------------------------------------------------------------


class Coords:
    def __init__(self, inst: Instances, r: int) -> None:
        self.r = r
        g = inst.col
        self.p0, self.p1, self.p2 = g(inst.P, r - 1), g(inst.P, r), g(inst.P, r + 1)
        self.a0, self.a1, self.a2 = g(inst.A, r - 1), g(inst.A, r), g(inst.A, r + 1)
        self.bm, self.b0, self.b1, self.b2 = g(inst.B, r - 2), g(inst.B, r - 1), g(inst.B, r), g(inst.B, r + 1)
        self.cm, self.c0, self.c1, self.c2 = g(inst.C, r - 2), g(inst.C, r - 1), g(inst.C, r), g(inst.C, r + 1)
        self.am = g(inst.A, r - 2)
        self.QT = r * self.p1 * self.p1 + self.p0 * self.p0 - (r + 1) * self.p0 * self.p2
        self.Qa = r * self.a1 * self.a1 + self.a0 * self.a0 - (r + 1) * self.a0 * self.a2
        self.Qb_prev = (r - 1) * self.b0 * self.b0 + self.bm * self.bm - r * self.bm * self.b1
        self.Qb = r * self.b1 * self.b1 + self.b0 * self.b0 - (r + 1) * self.b0 * self.b2
        self.Qc_prev = (r - 1) * self.c0 * self.c0 + self.cm * self.cm - r * self.cm * self.c1
        self.Qc = r * self.c1 * self.c1 + self.c0 * self.c0 - (r + 1) * self.c0 * self.c2
        self.CROSS = 2 * r * self.a1 * self.b0 + 2 * self.a0 * self.bm - (r + 1) * (self.a0 * self.b1 + self.a2 * self.bm)
        self.LCb_prev = self.b0 * self.b0 - self.bm * self.b1
        self.R = self.QT - self.Qa - self.Qb_prev
        assert np.array_equal(self.R, self.LCb_prev + self.CROSS)
        self.N = self.p0 * self.p1
        alpha = inst.meta[:, 4]
        L = inst.meta[:, 5]
        self.valid = r <= alpha - 1
        self.prefix = self.valid & (r <= L - 1)
        self.descent = self.valid & (self.p1 <= self.p0)
        # closing inequalities of strengthened leaf inductions
        self.E_FLC = self.R - 2 * self.a0 * self.bm
        self.E_PLC = self.E_FLC + self.a0 * self.b1 + self.bm * self.a2
        # IH range bookkeeping for prefix statements
        alphaA = np.count_nonzero(inst.A, axis=1) - 1
        alphaB = np.count_nonzero(inst.B, axis=1) - 1
        self.alphaA, self.alphaB = alphaA, alphaB
        LA = np.array([tail_cutoff(int(x)) for x in alphaA])
        LB = np.array([tail_cutoff(int(x)) for x in alphaB])
        self.ih_range_ok = (r <= LA - 1) & ((r - 1 <= LB - 1) | (r == 1))
        # descent propagation
        self.descent_A = self.a1 <= self.a0
        self.descent_B = self.b0 <= self.bm

    def payment_terms(self) -> Dict[str, np.ndarray]:
        s = self
        t: Dict[str, np.ndarray] = {}
        t["Q_r(b)"] = s.Qb
        t["Q_{r-1}(c)"] = s.Qc_prev
        t["Q_r(c)"] = s.Qc
        t["LC_{r-1}(b)=b_{r-1}^2-b_{r-2}b_r"] = s.LCb_prev
        t["LC_r(b)=b_r^2-b_{r-1}b_{r+1}"] = s.b1 * s.b1 - s.b0 * s.b2
        t["LC_{r-1}(c)"] = s.c0 * s.c0 - s.cm * s.c1
        t["LC_r(c)"] = s.c1 * s.c1 - s.c0 * s.c2
        t["c_{r-1}*b_{r-1}"] = s.c0 * s.b0
        t["c_{r-1}*b_{r-2}"] = s.c0 * s.bm
        t["c_{r-1}*b_r"] = s.c0 * s.b1
        t["c_{r-1}*a_{r-1}"] = s.c0 * s.a0
        t["c_{r-1}^2"] = s.c0 * s.c0
        t["c_{r-1}*c_{r-2}"] = s.c0 * s.cm
        t["(b_{r-1}-c_{r-1})*b_{r-1}"] = (s.b0 - s.c0) * s.b0
        t["(b_{r-1}-c_{r-1})*c_{r-1}"] = (s.b0 - s.c0) * s.c0
        t["(b_{r-2}-c_{r-2})*b_r"] = (s.bm - s.cm) * s.b1
        t["(a_r-b_r-b_{r-1})^2=(c_{r-1}-b_{r-1})^2"] = (s.c0 - s.b0) ** 2
        t["(b_{r-1}-b_{r-2})^2"] = (s.b0 - s.bm) ** 2
        t["(a_r-p_{r-1})^2"] = (s.a1 - s.p0) ** 2
        # synchronisation (ratio-ordering) differences, both directions
        t["sync: a_r*b_{r-1}-a_{r-1}*b_r"] = s.a1 * s.b0 - s.a0 * s.b1
        t["sync: a_{r-1}*b_r-a_r*b_{r-1}"] = s.a0 * s.b1 - s.a1 * s.b0
        t["sync: a_{r+1}*b_r-a_r*b_{r+1}"] = s.a2 * s.b1 - s.a1 * s.b2
        t["sync: a_r*b_{r+1}-a_{r+1}*b_r"] = s.a1 * s.b2 - s.a2 * s.b1
        t["sync: b_r*c_{r-1}-b_{r-1}*c_r"] = s.b1 * s.c0 - s.b0 * s.c1
        t["sync: b_{r-1}*c_r-b_r*c_{r-1}"] = s.b0 * s.c1 - s.b1 * s.c0
        t["sync: b_{r-1}*c_{r-2}-b_{r-2}*c_{r-1}"] = s.b0 * s.cm - s.bm * s.c0
        t["sync: b_{r-2}*c_{r-1}-b_{r-1}*c_{r-2}"] = s.bm * s.c0 - s.b0 * s.cm
        t["sync: p_r*a_{r-1}-p_{r-1}*a_r"] = s.p1 * s.a0 - s.p0 * s.a1
        t["sync: p_{r-1}*a_r-p_r*a_{r-1}"] = s.p0 * s.a1 - s.p1 * s.a0
        t["sync: p_r*b_{r-1}-p_{r-1}*b_r"] = s.p1 * s.b0 - s.p0 * s.b1
        t["sync: p_{r-1}*b_r-p_r*b_{r-1}"] = s.p0 * s.b1 - s.p1 * s.b0
        t["sync: a_{r-1}*c_{r-1}-a_r*c_{r-2}"] = s.a0 * s.c0 - s.a1 * s.cm
        t["sync: a_r*c_{r-2}-a_{r-1}*c_{r-1}"] = s.a1 * s.cm - s.a0 * s.c0
        t["FLC_{r-1}(b)=(r-1)b_{r-1}^2-r*b_{r-2}b_r"] = (s.r - 1) * s.b0 * s.b0 - s.r * s.bm * s.b1
        t["FLC_r(b)=r*b_r^2-(r+1)b_{r-1}b_{r+1}"] = s.r * s.b1 * s.b1 - (s.r + 1) * s.b0 * s.b2
        t["FLC_{r-1}(c)"] = (s.r - 1) * s.c0 * s.c0 - s.r * s.cm * s.c1
        t["ULC: (r+1)b_{r-1}b_r-(r-1)b_{r-2}b_{r+1}"] = (s.r + 1) * s.b0 * s.b1 - (s.r - 1) * s.bm * s.b2
        return t


PROVABLE_TERMS = {
    "Q_r(b)": "ISO_r(B): induction hypothesis on the forest B",
    "Q_{r-1}(c)": "ISO_{r-1}(C): induction hypothesis on the forest C",
    "Q_r(c)": "ISO_r(C): induction hypothesis on the forest C",
    "c_{r-1}*b_{r-1}": "product of non-negative counts",
    "c_{r-1}*b_{r-2}": "product of non-negative counts",
    "c_{r-1}*b_r": "product of non-negative counts",
    "c_{r-1}*a_{r-1}": "product of non-negative counts",
    "c_{r-1}^2": "square",
    "c_{r-1}*c_{r-2}": "product of non-negative counts",
    "(b_{r-1}-c_{r-1})*b_{r-1}": "C is an induced subgraph of B, so c_k <= b_k",
    "(b_{r-1}-c_{r-1})*c_{r-1}": "C is an induced subgraph of B, so c_k <= b_k",
    "(b_{r-2}-c_{r-2})*b_r": "C is an induced subgraph of B, so c_k <= b_k",
    "(a_r-b_r-b_{r-1})^2=(c_{r-1}-b_{r-1})^2": "square",
    "(b_{r-1}-b_{r-2})^2": "square",
    "(a_r-p_{r-1})^2": "square",
}


# ----------------------------------------------------------------------------------------
# exact extremal helpers
# ----------------------------------------------------------------------------------------


def exact_min_ratio(num: np.ndarray, den: np.ndarray, mask: np.ndarray) -> Optional[Tuple[Fraction, int]]:
    """Exact argmin of num/den over mask (den > 0 required on mask). Uses floats to find a
    candidate and then an exact int64 cross-multiplication check (|num*den| < 2^63 here)."""
    idx = np.flatnonzero(mask)
    if idx.size == 0:
        return None
    n = num[idx].astype(np.float64)
    d = den[idx].astype(np.float64)
    j = idx[int(np.argmin(n / d))]
    for _ in range(20):
        better = idx[(num[idx] * int(den[j])) < (int(num[j]) * den[idx])]
        if better.size == 0:
            break
        j = better[int(np.argmin(num[better].astype(np.float64) / den[better].astype(np.float64)))]
    return Fraction(int(num[j]), int(den[j])), int(j)


def frac_stats(values: np.ndarray, mask: np.ndarray) -> Dict[str, Any]:
    m = int(np.count_nonzero(mask))
    neg = int(np.count_nonzero(values[mask] < 0))
    zero = int(np.count_nonzero(values[mask] == 0))
    return {"count": m, "negative": neg, "zero": zero, "fraction_negative": (neg / m) if m else None}


# ----------------------------------------------------------------------------------------
# LP helpers (HiGHS) with exact re-verification
# ----------------------------------------------------------------------------------------


def rationalise_down(x: float, max_den: int = 10**6) -> Fraction:
    if x <= 0:
        return Fraction(0)
    f = Fraction(x).limit_denominator(max_den)
    # nudge down by a relative 1e-9 so that float round-off cannot make a tight
    # constraint infeasible in exact arithmetic
    g = f * (1 - Fraction(1, 10**9))
    return g if g > 0 else Fraction(0)


def exact_verify_payment(R: np.ndarray, terms: List[np.ndarray], lam: List[Fraction], mask: np.ndarray) -> Tuple[bool, int]:
    """Check R - sum lam_i t_i >= 0 exactly (Python ints) on all rows in mask; returns (ok, #violations)."""
    idx = np.flatnonzero(mask)
    D = 1
    for f in lam:
        D = D * f.denominator // math.gcd(D, f.denominator)
    lamD = [int(f * D) for f in lam]
    Rl = R[idx].tolist()
    tl = [t[idx].tolist() for t in terms]
    viol = 0
    for k in range(len(idx)):
        s = D * Rl[k]
        for i in range(len(lam)):
            if lamD[i]:
                s -= lamD[i] * tl[i][k]
        if s < 0:
            viol += 1
    return viol == 0, viol


def payment_lp(R: np.ndarray, N: np.ndarray, terms: Dict[str, np.ndarray], mask: np.ndarray, inst: Instances, r: int) -> Dict[str, Any]:
    """maximise sum_i w_i lambda_i  s.t.  sum_i lambda_i t_i(row) <= R(row) for all rows, lambda >= 0,
    with w_i = mean over rows of t_i / N (typical normalised size of the term).  Rows are
    normalised by N and de-duplicated.  Returns the rationalised, exactly verified solution and the
    binding rows (dual certificate)."""
    names = list(terms)
    idx = np.flatnonzero(mask)
    if idx.size == 0 or not names:
        return {"status": "no_rows_or_terms"}
    Nf = N[idx].astype(np.float64)
    Tm = np.stack([terms[nm][idx].astype(np.float64) / Nf for nm in names], axis=1)
    Rn = R[idx].astype(np.float64) / Nf
    rows = np.concatenate([Tm, Rn[:, None]], axis=1)
    rows_u, inv = np.unique(np.round(rows, 12), axis=0, return_inverse=True)
    A_ub = rows_u[:, :-1]
    b_ub = rows_u[:, -1]
    w = Tm.mean(axis=0)
    w = np.where(w > 0, w, 1e-9)
    if not HAVE_SCIPY:
        return {"status": "scipy_missing"}
    res = _scipy_linprog(-w, A_ub=A_ub, b_ub=b_ub, bounds=[(0, None)] * len(names), method="highs")
    out: Dict[str, Any] = {"status": res.status, "message": res.message, "rows": int(idx.size), "distinct_rows": int(rows_u.shape[0])}
    if res.status != 0:
        return out
    lam_f = [float(x) for x in res.x]
    lam = [rationalise_down(x) for x in lam_f]
    term_arrays = [terms[nm] for nm in names]
    ok, viol = exact_verify_payment(R, term_arrays, lam, mask)
    shrink = 0
    while not ok and shrink < 12:
        lam = [f * Fraction(999, 1000) for f in lam]
        ok, viol = exact_verify_payment(R, term_arrays, lam, mask)
        shrink += 1
    out["lambda_float"] = {nm: x for nm, x in zip(names, lam_f) if x > 1e-9}
    out["lambda_exact_verified"] = {nm: str(f) for nm, f in zip(names, lam) if f > 0}
    out["exact_verification"] = {"ok": ok, "violations": viol, "shrink_steps": shrink}
    out["objective_float"] = float(-res.fun)
    # binding rows via duals (marginals of the inequality constraints)
    marg = getattr(res, "ineqlin", None)
    binding: List[Dict[str, Any]] = []
    if marg is not None:
        duals = np.asarray(marg.marginals)
        active = np.flatnonzero(np.abs(duals) > 1e-9)
        order = active[np.argsort(-np.abs(duals[active]))][:8]
        for u in order:
            members = np.flatnonzero(inv == u)
            i = int(idx[members[0]])
            binding.append({"dual": float(duals[u]), "instances_in_row": int(members.size), "witness": inst.witness(i, r)})
    out["binding_rows"] = binding
    # residual slack of the exact solution
    lamD = lam
    resid = R[idx].astype(np.float64) - sum(float(f) * terms[nm][idx].astype(np.float64) for f, nm in zip(lamD, names))
    out["min_residual_normalised_float"] = float(np.min(resid / Nf))
    return out


def ih_usage(coords: Coords, mask: np.ndarray, inst: Instances) -> Dict[str, Any]:
    """How much of the induction hypotheses can be used: exact extremal ratios."""
    c = coords
    out: Dict[str, Any] = {}
    # lambda_a^max with lambda_b = 1: min (Q_T - Q_bprev)/Q_a over Q_a > 0
    m = mask & (c.Qa > 0)
    res = exact_min_ratio(c.QT - c.Qb_prev, c.Qa, m)
    if res:
        out["max_lambda_a_given_lambda_b=1"] = {**fr_json(res[0]), "witness": inst.witness(res[1], c.r)}
    m = mask & (c.Qb_prev > 0)
    res = exact_min_ratio(c.QT - c.Qa, c.Qb_prev, m)
    if res:
        out["max_lambda_b_given_lambda_a=1"] = {**fr_json(res[0]), "witness": inst.witness(res[1], c.r)}
    # joint LP: max lambda_a + lambda_b s.t. lambda_a Q_a + lambda_b Q_bprev <= Q_T, 0 <= lambda <= 1
    if HAVE_SCIPY:
        idx = np.flatnonzero(mask)
        if idx.size:
            Nf = c.N[idx].astype(np.float64)
            A_ub = np.stack([c.Qa[idx] / Nf, c.Qb_prev[idx] / Nf], axis=1)
            b_ub = c.QT[idx] / Nf
            A_ub, uniq = np.unique(np.round(np.concatenate([A_ub, b_ub[:, None]], axis=1), 12), axis=0, return_index=True)
            b_ub = A_ub[:, -1]
            A_ub = A_ub[:, :-1]
            res_lp = _scipy_linprog([-1.0, -1.0], A_ub=A_ub, b_ub=b_ub, bounds=[(0, 1), (0, 1)], method="highs")
            out["joint_lp_max_lambda_a_plus_lambda_b"] = {"status": int(res_lp.status), "lambda": [float(x) for x in res_lp.x] if res_lp.status == 0 else None}
            if res_lp.status == 0:
                la, lb = (rationalise_down(float(x)) for x in res_lp.x)
                if float(res_lp.x[0]) > 1 - 1e-9:
                    la = Fraction(1)
                if float(res_lp.x[1]) > 1 - 1e-9:
                    lb = Fraction(1)
                ok, viol = exact_verify_payment(c.QT, [c.Qa, c.Qb_prev], [la, lb], mask)
                out["joint_lp_max_lambda_a_plus_lambda_b"]["exact"] = {"lambda_a": str(la), "lambda_b": str(lb), "verified": ok, "violations": viol}
    return out


# ----------------------------------------------------------------------------------------
# exact certificate LP (symbolic proof attempt)
# ----------------------------------------------------------------------------------------


def certificate_lp(r: int, target: str, menu_level: int, extra_forms: Optional[List[Tuple[str, Any]]] = None) -> Dict[str, Any]:
    """Try to write the closing polynomial (R, E_FLC or E_PLC at index r) identically as a
    non-negative combination of provably (or hypothetically) non-negative quadratic forms in the
    free coordinates x = (b_{r-2}, b_{r-1}, b_r, b_{r+1}, c_{r-2}, c_{r-1}, c_r).

    menu_level 0: pairwise products of the cone forms {b_k, c_k, b_k - c_k}
               1: + ISO_r(b), ISO_{r-1}(c)                (induction hypotheses on B, C)
               2: + LC_{r-1}(b), LC_r(b), LC_{r-1}(c)        (log-concavity hypotheses)
               3: + FLC_{r-1}(b), FLC_r(b), FLC_{r-1}(c)     (fractional LC hypotheses)
    extra_forms: additional (name, sympy expr) quadratic forms assumed non-negative.
    The float LP (HiGHS) is followed by rationalisation and an exact sympy identity check."""
    import sympy as sp

    bm, b0, b1, b2, cm, c0, c1 = sp.symbols("bm b0 b1 b2 cm c0 c1")
    x = [bm, b0, b1, b2, cm, c0, c1]
    if r == 1:  # b_{-1} = c_{-1} = 0
        subs0 = {bm: 0, cm: 0}
    else:
        subs0 = {}
    a0 = b0 + cm
    a1 = b1 + c0
    a2 = b2 + c1
    p0 = a0 + bm
    p1 = a1 + b0
    p2 = a2 + b1
    QT = r * p1**2 + p0**2 - (r + 1) * p0 * p2
    Qa = r * a1**2 + a0**2 - (r + 1) * a0 * a2
    Qbp = (r - 1) * b0**2 + bm**2 - r * bm * b1
    R = sp.expand(QT - Qa - Qbp)
    if target == "R":
        tgt = R
    elif target == "E_FLC":
        tgt = sp.expand(R - 2 * a0 * bm)
    elif target == "E_PLC":
        tgt = sp.expand(R - 2 * a0 * bm + a0 * b1 + bm * a2)
    else:
        raise ValueError(target)
    forms: List[Tuple[str, Any]] = []
    cone = [("b_{r-2}", bm), ("b_{r-1}", b0), ("b_r", b1), ("b_{r+1}", b2), ("c_{r-2}", cm), ("c_{r-1}", c0), ("c_r", c1),
            ("b_{r-2}-c_{r-2}", bm - cm), ("b_{r-1}-c_{r-1}", b0 - c0), ("b_r-c_r", b1 - c1)]
    for i in range(len(cone)):
        for j in range(i, len(cone)):
            forms.append((f"({cone[i][0]})*({cone[j][0]})", cone[i][1] * cone[j][1]))
    if menu_level >= 1:
        forms.append(("ISO_r(b)", r * b1**2 + b0**2 - (r + 1) * b0 * b2))
        forms.append(("ISO_{r-1}(c)", (r - 1) * c0**2 + cm**2 - r * cm * c1))
    if menu_level >= 2:
        forms.append(("LC_{r-1}(b)", b0**2 - bm * b1))
        forms.append(("LC_r(b)", b1**2 - b0 * b2))
        forms.append(("LC_{r-1}(c)", c0**2 - cm * c1))
    if menu_level >= 3:
        forms.append(("FLC_{r-1}(b)", (r - 1) * b0**2 - r * bm * b1))
        forms.append(("FLC_r(b)", r * b1**2 - (r + 1) * b0 * b2))
        forms.append(("FLC_{r-1}(c)", (r - 1) * c0**2 - r * cm * c1))
    if extra_forms:
        forms.extend(extra_forms)
    # apply r = 1 degeneracy and drop identically-zero forms
    forms = [(nm, sp.expand(f.subs(subs0))) for nm, f in forms]
    forms = [(nm, f) for nm, f in forms if f != 0]
    tgt = sp.expand(tgt.subs(subs0))
    monos = [xi * xj for i, xi in enumerate(x) for xj in x[i:]]
    monos = [m for m in monos if not (subs0 and m.subs(subs0) == 0)]

    def vec(poly) -> List[Fraction]:
        P = sp.Poly(poly, *x)
        d = {tuple(k): Fraction(int(v.p), int(v.q)) for k, v in zip(P.monoms(), P.coeffs())}
        out = []
        for m in monos:
            mk = tuple(sp.Poly(m, *x).monoms()[0])
            out.append(d.get(mk, Fraction(0)))
        return out

    tvec = vec(tgt)
    fvecs = [vec(f) for _, f in forms]
    A_eq = np.array([[float(fv[k]) for fv in fvecs] for k in range(len(monos))])
    b_eq = np.array([float(t) for t in tvec])
    result: Dict[str, Any] = {"r": r, "target": target, "menu_level": menu_level, "num_forms": len(forms), "num_monomials": len(monos),
                              "target_polynomial": str(tgt)}
    if not HAVE_SCIPY:
        result["status"] = "scipy_missing"
        return result
    cost = np.array([0.0 if nm.startswith("(") else 1.0 for nm, _ in forms])
    res = _scipy_linprog(cost, A_eq=A_eq, b_eq=b_eq, bounds=[(0, None)] * len(forms), method="highs")
    result["float_lp_status"] = int(res.status)
    result["float_lp_message"] = res.message
    if res.status != 0:
        result["certificate"] = None
        return result
    # exact recovery: rationalise the support, then solve the exact system on the support
    nu_f = np.asarray(res.x)
    support = [i for i in range(len(forms)) if nu_f[i] > 1e-9]
    exact_ok = False
    nu_exact: Dict[str, Fraction] = {}
    for max_den in (10**3, 10**6, 10**9, 10**12):
        cand = [Fraction(float(nu_f[i])).limit_denominator(max_den) for i in support]
        resid = [tvec[k] - sum(cand[s] * fvecs[support[s]][k] for s in range(len(support))) for k in range(len(monos))]
        if all(rr == 0 for rr in resid) and all(cv >= 0 for cv in cand):
            exact_ok = True
            nu_exact = {forms[support[s]][0]: cand[s] for s in range(len(support)) if cand[s] != 0}
            break
    if not exact_ok:
        # exact linear solve restricted to the support (sympy rationals)
        M = sp.Matrix([[sp.Rational(fvecs[i][k].numerator, fvecs[i][k].denominator) for i in support] for k in range(len(monos))])
        rhs = sp.Matrix([sp.Rational(t.numerator, t.denominator) for t in tvec])
        try:
            sol, params = M.gauss_jordan_solve(rhs)
            sol0 = sol.subs({p: 0 for p in params})
            vals = [Fraction(int(v.p), int(v.q)) for v in sol0]
            if all(v >= 0 for v in vals):
                exact_ok = True
                nu_exact = {forms[support[s]][0]: vals[s] for s in range(len(support)) if vals[s] != 0}
        except ValueError:
            pass
    result["certificate"] = {nm: str(v) for nm, v in nu_exact.items()} if exact_ok else None
    result["exact_certificate_recovered"] = exact_ok
    if exact_ok:
        # final independent symbolic check
        total = sum(sp.Rational(v.numerator, v.denominator) * dict(forms)[nm] for nm, v in nu_exact.items())
        result["symbolic_identity_check"] = bool(sp.expand(total - tgt) == 0)
    return result


# ----------------------------------------------------------------------------------------
# Task 4: FLC / PLC on trees n <= nmax_flc and named families
# ----------------------------------------------------------------------------------------


def flc_plc_scan(nmax: int) -> Dict[str, Any]:
    """FLC_r: p_r^2 >= (1+1/r) p_{r-1} p_{r+1}  (<=> Q_r >= p_{r-1}^2); PLC_r: p_r^2 >= p_{r-1} p_{r+1}.
    Normalised slacks: FLC: 1 - (1+1/r) p_{r-1}p_{r+1}/p_r^2 ; PLC: 1 - p_{r-1}p_{r+1}/p_r^2."""
    t0 = time.time()
    res: Dict[str, Any] = {"nmax": nmax, "per_n": {}}
    glob: Dict[str, Any] = {}

    def upd(key: str, val: Fraction, info: Dict[str, Any]) -> None:
        cur = glob.get(key)
        if cur is None or val < cur[0]:
            glob[key] = (val, info)

    for n in range(3, nmax + 1):
        cnt = 0
        flc_fail_prefix = plc_fail_prefix = flc_fail_all = plc_fail_all = 0
        min_flc_prefix = min_plc_prefix = None
        for parent in free_trees(n):
            p = indpoly_parent_array(parent)
            alpha = len(p) - 1
            L = tail_cutoff(alpha)
            cnt += 1
            for r in range(1, alpha):
                pr2 = p[r] * p[r]
                cross = p[r - 1] * p[r + 1]
                flc_num = r * pr2 - (r + 1) * cross  # >= 0 iff FLC
                plc_num = pr2 - cross
                in_prefix = r <= L - 1
                if flc_num < 0:
                    flc_fail_all += 1
                    if in_prefix:
                        flc_fail_prefix += 1
                if plc_num < 0:
                    plc_fail_all += 1
                    if in_prefix:
                        plc_fail_prefix += 1
                if in_prefix:
                    fs = Fraction(flc_num, r * pr2)
                    ps = Fraction(plc_num, pr2)
                    info = {"n": n, "r": r, "parent_array": list(parent), "poly": list(p), "shape": describe_shape(parent)}
                    if min_flc_prefix is None or fs < min_flc_prefix[0]:
                        min_flc_prefix = (fs, info)
                    if min_plc_prefix is None or ps < min_plc_prefix[0]:
                        min_plc_prefix = (ps, info)
                    upd("min_flc_slack_prefix", fs, info)
                    upd("min_plc_slack_prefix", ps, info)
                    upd("min_iso_margin_prefix", Fraction(Q(p, r), p[r - 1] * p[r]), info)
                if r >= L:
                    upd("min_flc_slack_tail", Fraction(flc_num, r * pr2), {"n": n, "r": r, "parent_array": list(parent), "poly": list(p), "shape": describe_shape(parent)})
                    upd("min_plc_slack_tail", Fraction(plc_num, pr2), {"n": n, "r": r, "parent_array": list(parent), "poly": list(p), "shape": describe_shape(parent)})
        res["per_n"][str(n)] = {
            "trees": cnt,
            "flc_failures_prefix": flc_fail_prefix,
            "plc_failures_prefix": plc_fail_prefix,
            "flc_failures_all_indices": flc_fail_all,
            "plc_failures_all_indices": plc_fail_all,
            "min_flc_slack_prefix": fr_json(min_flc_prefix[0]) if min_flc_prefix else None,
            "min_plc_slack_prefix": fr_json(min_plc_prefix[0]) if min_plc_prefix else None,
        }
        log(f"  FLC/PLC n={n}: trees={cnt} FLC fails prefix/all={flc_fail_prefix}/{flc_fail_all} PLC fails prefix/all={plc_fail_prefix}/{plc_fail_all} "
            f"min FLC slack prefix={float(min_flc_prefix[0]) if min_flc_prefix else None}")
    for key, (val, info) in glob.items():
        res[key] = {**fr_json(val), "witness": info}
    res["seconds"] = round(time.time() - t0, 1)
    return res


def leaf_instances_of(n: int, edges: List[Tuple[int, int]]) -> List[Dict[str, Any]]:
    """All (leaf, r) rows of the leaf identity for one explicit tree/forest: R, E_FLC, E_PLC and the
    FLC/PLC status of T, A (at r) and B (at r-1)."""
    adj: List[List[int]] = [[] for _ in range(n)]
    for u, w in edges:
        adj[u].append(w)
        adj[w].append(u)
    pT = indpoly_forest(n, edges)
    alpha = len(pT) - 1
    L = tail_cutoff(alpha)
    rows: List[Dict[str, Any]] = []
    seen = set()
    for leaf in range(n):
        if len(adj[leaf]) != 1:
            continue
        v = adj[leaf][0]
        a = sub_forest_poly(n, edges, {leaf})
        b = sub_forest_poly(n, edges, {leaf, v})
        key = (tuple(a), tuple(b))
        if key in seen:
            continue
        seen.add(key)
        for r in range(1, alpha):
            R = Q(pT, r) - Q(a, r) - Q(b, r - 1)
            e_flc = R - 2 * coef(a, r - 1) * coef(b, r - 2)
            e_plc = e_flc + coef(a, r - 1) * coef(b, r) + coef(b, r - 2) * coef(a, r + 1)

            def flc(p: Sequence[int], k: int) -> bool:
                return k * coef(p, k) ** 2 >= (k + 1) * coef(p, k - 1) * coef(p, k + 1)

            def plc(p: Sequence[int], k: int) -> bool:
                return coef(p, k) ** 2 >= coef(p, k - 1) * coef(p, k + 1)

            rows.append({
                "leaf": leaf, "r": r, "in_prefix": r <= L - 1, "R": R, "E_FLC": e_flc, "E_PLC": e_plc,
                "FLC": {"T_r": flc(pT, r), "A_r": flc(a, r), "B_r-1": flc(b, r - 1)},
                "PLC": {"T_r": plc(pT, r), "A_r": plc(a, r), "B_r-1": plc(b, r - 1)},
            })
    return rows


def named_tree_leaf_rows() -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for name, (n, edges) in (("T3mn(4,4)", T3mn(4, 4)), ("T3mn_star(3,4)", T3mn_star(3, 4)), ("bush([3,3,3])", bush([3, 3, 3]))):
        rows = leaf_instances_of(n, edges)
        p = indpoly_forest(n, edges)
        alpha = len(p) - 1
        out[name] = {
            "n": n, "alpha": alpha, "L": tail_cutoff(alpha),
            "rows": len(rows),
            "R_negative_rows": [dict(row, R_only=True) for row in rows if row["R"] < 0][:10],
            "E_FLC_negative_rows": [row for row in rows if row["E_FLC"] < 0][:10],
            "E_PLC_negative_rows": [row for row in rows if row["E_PLC"] < 0][:10],
            "E_FLC_negative_count": sum(1 for row in rows if row["E_FLC"] < 0),
            "E_PLC_negative_count": sum(1 for row in rows if row["E_PLC"] < 0),
            "E_FLC_negative_in_prefix": sum(1 for row in rows if row["E_FLC"] < 0 and row["in_prefix"]),
            "E_PLC_negative_in_prefix": sum(1 for row in rows if row["E_PLC"] < 0 and row["in_prefix"]),
            "rows_where_T_fails_FLC_but_A_and_B_satisfy_it": [row for row in rows if not row["FLC"]["T_r"] and row["FLC"]["A_r"] and row["FLC"]["B_r-1"]][:10],
            "rows_where_T_fails_PLC_but_A_and_B_satisfy_it": [row for row in rows if not row["PLC"]["T_r"] and row["PLC"]["A_r"] and row["PLC"]["B_r-1"]][:10],
        }
    return out


def families_scan() -> Dict[str, Any]:
    fams: List[Tuple[str, Tuple[int, List[Tuple[int, int]]]]] = [("T3mn(4,4)", T3mn(4, 4)), ("T3mn_star(3,4)", T3mn_star(3, 4))]
    for m in range(1, 7):
        for nn in range(m, 7):
            fams.append((f"bush([3,{m},{nn}])", bush([3, m, nn])))
    for m in (6, 8, 10):
        fams.append((f"T3mn({m},{m})", T3mn(m, m)))
    out: Dict[str, Any] = {}
    for name, (n, edges) in fams:
        p = indpoly_forest(n, edges)
        alpha = len(p) - 1
        L = tail_cutoff(alpha)
        flc_fail = [r for r in range(1, alpha) if r * p[r] ** 2 < (r + 1) * p[r - 1] * p[r + 1]]
        plc_fail = [r for r in range(1, alpha) if p[r] ** 2 < p[r - 1] * p[r + 1]]
        iso_fail = [r for r in range(1, alpha) if Q(p, r) < 0]
        out[name] = {
            "n": n, "alpha": alpha, "L": L, "poly": p,
            "flc_failures": flc_fail, "plc_failures": plc_fail, "iso_failures_all_indices": iso_fail,
            "flc_fails_only_in_tail": all(r >= L for r in flc_fail),
            "plc_fails_only_in_tail": all(r >= L for r in plc_fail),
            "min_flc_slack_prefix": fr_json(min(Fraction(r * p[r] ** 2 - (r + 1) * p[r - 1] * p[r + 1], r * p[r] ** 2) for r in range(1, L))) if L > 1 else None,
            "min_plc_slack_prefix": fr_json(min(Fraction(p[r] ** 2 - p[r - 1] * p[r + 1], p[r] ** 2) for r in range(1, L))) if L > 1 else None,
        }
    return out


# ----------------------------------------------------------------------------------------
# Task 5: convolution closure
# ----------------------------------------------------------------------------------------


def iso_all(p: Sequence[int]) -> bool:
    return all(Q(p, r) >= 0 for r in range(1, len(p) - 1))


def flc_all(p: Sequence[int]) -> bool:
    return all(r * p[r] ** 2 >= (r + 1) * p[r - 1] * p[r + 1] for r in range(1, len(p) - 1))


def plc_all(p: Sequence[int]) -> bool:
    return all(p[r] ** 2 >= p[r - 1] * p[r + 1] for r in range(1, len(p) - 1))


def first_iso_failure(p: Sequence[int]) -> Optional[int]:
    for r in range(1, len(p) - 1):
        if Q(p, r) < 0:
            return r
    return None


def closure_tests(seed: int, tree_nmax: int = 14, n_random_pairs: int = 200000, n_lc_pairs: int = 100000) -> Dict[str, Any]:
    t0 = time.time()
    rng = random.Random(seed)
    polys: List[Tuple[int, List[int], List[int]]] = []
    for n in range(1, tree_nmax + 1):
        for parent in free_trees(n):
            polys.append((n, list(parent), indpoly_parent_array(parent)))
    out: Dict[str, Any] = {"tree_nmax": tree_nmax, "tree_polys": len(polys)}
    # (a) exhaustive pairs of trees with n1, n2 <= 12
    small = [t for t in polys if t[0] <= 12]
    iso_ce: List[Dict[str, Any]] = []
    flc_viol = plc_viol = 0
    flc_pairs = plc_pairs = 0
    pairs = 0
    for i in range(len(small)):
        n1, par1, p1 = small[i]
        f1, l1 = flc_all(p1), plc_all(p1)
        for j in range(i, len(small)):
            n2, par2, p2 = small[j]
            prod = poly_mul(p1, p2)
            pairs += 1
            r = first_iso_failure(prod)
            if r is not None and iso_all(p1) and iso_all(p2) and len(iso_ce) < 20:
                iso_ce.append({"n1": n1, "n2": n2, "parent1": par1, "parent2": par2, "p1": p1, "p2": p2, "product": prod, "first_failing_r": r})
            if f1 and flc_all(p2):
                flc_pairs += 1
                if not flc_all(prod):
                    flc_viol += 1
            if l1 and plc_all(p2):
                plc_pairs += 1
                if not plc_all(prod):
                    plc_viol += 1
    out["exhaustive_pairs_n_le_12"] = {"pairs": pairs, "iso_closure_counterexamples": len(iso_ce), "iso_counterexample_examples": iso_ce[:5],
                                       "flc_pairs": flc_pairs, "flc_closure_violations": flc_viol, "plc_pairs": plc_pairs, "plc_closure_violations": plc_viol}
    log(f"  closure: exhaustive pairs n<=12: {pairs} pairs, ISO-closure counterexamples={len(iso_ce)}, FLC violations={flc_viol}/{flc_pairs}, PLC violations={plc_viol}/{plc_pairs}")
    # (b) random pairs from trees n <= tree_nmax (both factors ISO at all indices, which holds for all of them)
    iso_ce_r: List[Dict[str, Any]] = []
    flc_viol_r = flc_pairs_r = 0
    for _ in range(n_random_pairs):
        n1, par1, p1 = rng.choice(polys)
        n2, par2, p2 = rng.choice(polys)
        prod = poly_mul(p1, p2)
        r = first_iso_failure(prod)
        if r is not None and len(iso_ce_r) < 20:
            iso_ce_r.append({"n1": n1, "n2": n2, "parent1": par1, "parent2": par2, "product": prod, "first_failing_r": r})
        if flc_all(p1) and flc_all(p2):
            flc_pairs_r += 1
            if not flc_all(prod):
                flc_viol_r += 1
    out["random_tree_pairs"] = {"pairs": n_random_pairs, "iso_closure_counterexamples": len(iso_ce_r), "examples": iso_ce_r[:5], "flc_pairs": flc_pairs_r, "flc_closure_violations": flc_viol_r}
    log(f"  closure: random tree pairs: ISO-closure counterexamples={len(iso_ce_r)}, FLC violations={flc_viol_r}/{flc_pairs_r}")
    # (c) random log-concave-ish integer sequences: p_k = round(exp(f(k))) with f concave (random second differences)
    #     and random sequences satisfying ISO at all indices but not necessarily log-concave
    lc_pairs = lc_iso_viol = lc_flc_pairs = lc_flc_viol = 0
    iso_pairs = iso_viol = 0
    iso_examples: List[Dict[str, Any]] = []
    plc_only_pairs = plc_only_viol = 0

    def random_lc(deg: int) -> List[int]:
        slopes = [rng.uniform(-1.5, 3.0)]
        for _ in range(deg):
            slopes.append(slopes[-1] - rng.uniform(0.0, 1.2))
        f = [0.0]
        for s in slopes[:deg]:
            f.append(f[-1] + s)
        seq = [max(1, int(round(math.exp(v)))) for v in f]
        seq[0] = 1
        return seq

    def random_iso_only(deg: int) -> Optional[List[int]]:
        for _ in range(50):
            seq = [1] + [rng.randint(1, 60) for _ in range(deg)]
            if iso_all(seq):
                return seq
        return None

    for _ in range(n_lc_pairs):
        d1, d2 = rng.randint(2, 9), rng.randint(2, 9)
        p1, p2 = random_lc(d1), random_lc(d2)
        if not (plc_all(p1) and plc_all(p2)):
            continue
        prod = poly_mul(p1, p2)
        if iso_all(p1) and iso_all(p2):
            lc_pairs += 1
            if not iso_all(prod):
                lc_iso_viol += 1
                if len(iso_examples) < 5:
                    iso_examples.append({"p1": p1, "p2": p2, "product": prod, "first_failing_r": first_iso_failure(prod), "kind": "log-concave & ISO factors"})
        if flc_all(p1) and flc_all(p2):
            lc_flc_pairs += 1
            if not flc_all(prod):
                lc_flc_viol += 1
        plc_only_pairs += 1
        if not plc_all(prod):
            plc_only_viol += 1
    for _ in range(n_lc_pairs // 4):
        p1 = random_iso_only(rng.randint(2, 6))
        p2 = random_iso_only(rng.randint(2, 6))
        if p1 is None or p2 is None:
            continue
        iso_pairs += 1
        prod = poly_mul(p1, p2)
        if not iso_all(prod):
            iso_viol += 1
            if len(iso_examples) < 10:
                iso_examples.append({"p1": p1, "p2": p2, "product": prod, "first_failing_r": first_iso_failure(prod), "kind": "ISO-only factors (not necessarily log-concave)"})
    out["random_sequences"] = {
        "log_concave_iso_pairs": lc_pairs, "iso_closure_violations_lc_factors": lc_iso_viol,
        "flc_pairs": lc_flc_pairs, "flc_closure_violations": lc_flc_viol,
        "plc_pairs": plc_only_pairs, "plc_closure_violations": plc_only_viol,
        "iso_only_pairs": iso_pairs, "iso_closure_violations_iso_only_factors": iso_viol,
        "examples": iso_examples,
    }
    log(f"  closure: random LC sequences: ISO violations={lc_iso_viol}/{lc_pairs}, FLC violations={lc_flc_viol}/{lc_flc_pairs}, PLC violations={plc_only_viol}/{plc_only_pairs}; "
        f"ISO-only factors: violations={iso_viol}/{iso_pairs}")
    # (d) multiplication by (1+x)^k (isolated vertices) for all trees n <= 12
    iso_k_viol = 0
    for n1, par1, p1 in small:
        q = list(p1)
        for k in range(1, 6):
            q = poly_mul(q, [1, 1])
            if not iso_all(q):
                iso_k_viol += 1
    out["times_(1+x)^k_k_le_5_trees_n_le_12"] = {"polys": len(small) * 5, "iso_violations": iso_k_viol}
    out["seconds"] = round(time.time() - t0, 1)
    return out


# ----------------------------------------------------------------------------------------
# Forest instances of the leaf lemma (tree instance x forest on the remaining vertices)
# ----------------------------------------------------------------------------------------


def forest_instances(inst: Instances, n0_max: int, ntot_max: int) -> Dict[str, Any]:
    t0 = time.time()
    cache: Dict[int, Any] = {}
    fpolys: Dict[int, List[List[int]]] = {}
    for k in range(1, ntot_max - 3 + 1):
        fpolys[k] = [poly for _, _, poly in forest_polys(k, cache)]
    rows = 0
    neg = 0
    worst: Optional[Tuple[Fraction, Dict[str, Any]]] = None
    worst_r: Dict[int, Tuple[Fraction, Dict[str, Any]]] = {}
    seen = set()
    for i in range(inst.M):
        tid, n0 = int(inst.meta[i, 0]), int(inst.meta[i, 1])
        if n0 > n0_max:
            continue
        a = strip(list(inst.A[i, OFF:]))
        b = strip(list(inst.B[i, OFF:]))
        c = strip(list(inst.C[i, OFF:]))
        pT = strip(list(inst.P[i, OFF:]))
        key = (tuple(a), tuple(b), tuple(c))
        if key in seen:
            continue
        seen.add(key)
        for k in range(1, ntot_max - n0 + 1):
            for f in fpolys[k]:
                P_ = poly_mul(pT, f)
                A_ = poly_mul(a, f)
                B_ = poly_mul(b, f)
                alpha = len(P_) - 1
                for r in range(1, alpha):
                    rows += 1
                    R = Q(P_, r) - Q(A_, r) - Q(B_, r - 1)
                    N = P_[r - 1] * P_[r]
                    fr = Fraction(R, N)
                    if R < 0:
                        neg += 1
                    if worst is None or fr < worst[0]:
                        worst = (fr, {"tree_instance": inst.witness(i, r), "extra_forest_poly": f, "extra_forest_order": k, "r": r, "p_F": P_})
                    w = worst_r.get(r)
                    if w is None or fr < w[0]:
                        worst_r[r] = (fr, {"tree_instance_n": n0, "tree_parent": inst.parents[tid], "leaf": int(inst.meta[i, 2]), "extra_forest_poly": f, "extra_forest_order": k})
    return {
        "description": "instances (F, l) with F = T + F', T a tree of order <= n0_max with leaf l (distinct (a,b,c) triples only), F' any forest with |T| + |F'| <= ntot_max; the identity Q_r(F) = Q_r(F-l) + Q_{r-1}(F-l-v) + R is applied to F",
        "n0_max": n0_max, "ntot_max": ntot_max, "rows": rows, "R_negative": neg,
        "worst_R_over_N": {**fr_json(worst[0]), **worst[1]} if worst else None,
        "worst_R_over_N_per_r": {str(r): {**fr_json(v[0]), **v[1]} for r, v in sorted(worst_r.items())},
        "seconds": round(time.time() - t0, 1),
    }


# ----------------------------------------------------------------------------------------
# Stars: closed forms
# ----------------------------------------------------------------------------------------


def star_closed_forms() -> Dict[str, Any]:
    import sympy as sp

    m = sp.symbols("m", positive=True)
    M = m - 1
    # r = 2, leaf l: a = (1+x)^(m-1) + x, b = (1+x)^(m-1), c = 1
    a1, a2, a3 = M + 1, sp.binomial(M, 2), sp.binomial(M, 3)
    b0, b1, b2 = 1, M, sp.binomial(M, 2)
    r = 2
    cross = sp.expand(sp.expand_func(2 * r * a2 * b1 + 2 * a1 * b0 - (r + 1) * (a1 * b2 + a3 * b0)))
    lc = sp.expand(sp.expand_func(b1**2 - b0 * b2))
    R = sp.expand(cross + lc)
    p1, p2 = m + 1, sp.expand_func(sp.binomial(m, 2))
    out = {
        "CROSS_r2_leaf": str(sp.factor(cross)),
        "CROSS_r2_leaf_expanded": str(cross),
        "CROSS_negative_iff": "m^2 - 7m + 2 > 0, i.e. m >= 7",
        "LC_1(b)": str(sp.factor(lc)),
        "R_r2_leaf": str(sp.factor(R)),
        "R_r2_over_p1p2": str(sp.simplify(R / (p1 * p2))),
        "R_r2_over_p1p2_asymptotics": "~ 6/m^2 -> 0",
        "identity_checks": {
            "CROSS == 2m - (m-1)(m-2)/2": bool(sp.simplify(cross - (2 * m - (m - 1) * (m - 2) / 2)) == 0),
            "R == 3m - 1": bool(sp.simplify(R - (3 * m - 1)) == 0),
        },
    }
    # numeric table for m = 3..40 and r = 2..6 from the actual polynomials
    table: Dict[str, Any] = {}
    for mm in range(3, 41):
        n, edges = star(mm + 1)
        pT = indpoly_forest(n, edges)
        a = sub_forest_poly(n, edges, {1})
        b = sub_forest_poly(n, edges, {1, 0})
        c = [1]
        row: Dict[str, Any] = {}
        for rr in range(2, min(7, mm)):
            cr = 2 * rr * coef(a, rr) * coef(b, rr - 1) + 2 * coef(a, rr - 1) * coef(b, rr - 2) - (rr + 1) * (coef(a, rr - 1) * coef(b, rr) + coef(a, rr + 1) * coef(b, rr - 2))
            R_ = Q(pT, rr) - Q(a, rr) - Q(b, rr - 1)
            row[str(rr)] = {"CROSS": cr, "R": R_, "R_over_N": frac_json(R_, pT[rr - 1] * pT[rr])}
        if mm in (3, 5, 6, 7, 8, 10, 15, 20, 30, 40):
            table[str(mm)] = row
        assert row["2"]["R"] == 3 * mm - 1
        assert row["2"]["CROSS"] == 2 * mm - (mm - 1) * (mm - 2) // 2
    out["numeric_table_selected_m"] = table
    out["numeric_check_m_3_to_40"] = "R(r=2) == 3m-1 and CROSS(r=2) == 2m-(m-1)(m-2)/2 verified for all 3 <= m <= 40"
    return out


# ----------------------------------------------------------------------------------------
# main
# ----------------------------------------------------------------------------------------


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--nmax", type=int, default=16)
    ap.add_argument("--nmax-flc", type=int, default=18)
    ap.add_argument("--out", default="reports/leaf_induction_probe.json")
    ap.add_argument("--seed", type=int, default=993)
    ap.add_argument("--forest-n0", type=int, default=11)
    ap.add_argument("--forest-ntot", type=int, default=16)
    ap.add_argument("--cert-rmax", type=int, default=8)
    ap.add_argument("--skip-closure", action="store_true")
    args = ap.parse_args()
    t_start = time.time()

    payload: Dict[str, Any] = {
        "title": "Leaf-deletion induction probe for ISO_r on forests: signs of CROSS and of the residual R, payment/IH-usage/certificate LPs, strengthened targets FLC/PLC, convolution closure",
        "definitions": {
            "Q_r(p)": "r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1}  (ISO_r: Q_r >= 0); p_k := 0 outside 0..alpha",
            "L(alpha)": "ceil((2 alpha - 1)/3); prefix = indices 1 <= r <= L(alpha(T)) - 1",
            "instance": "(tree T, leaf l) with neighbour v; A = T - l, B = T - l - v, C = T - N[v]; I(T) = I(A) + x I(B), I(A) = I(B) + x I(C)",
            "CROSS": "2r a_r b_{r-1} + 2 a_{r-1} b_{r-2} - (r+1)(a_{r-1} b_r + a_{r+1} b_{r-2})",
            "R": "Q_r(T) - Q_r(a) - Q_{r-1}(b) = LC_{r-1}(b) + CROSS, LC_{r-1}(b) = b_{r-1}^2 - b_{r-2} b_r (identity checked on every row)",
            "normalisation N": "p_{r-1}(T) p_r(T) (the ISO margin scale; Q_r/N is the dimensionless margin)",
            "descent instance": "p_r(T) <= p_{r-1}(T)",
            "E_FLC": "R - 2 a_{r-1} b_{r-2}: closing polynomial of the leaf induction for FLC (Q_r >= p_{r-1}^2)",
            "E_PLC": "R - 2 a_{r-1} b_{r-2} + a_{r-1} b_r + b_{r-2} a_{r+1}: closing polynomial of the leaf induction for PLC (Q_r >= p_{r-1}^2 - p_{r-1} p_{r+1})",
        },
        "status": "running",
        "provenance": provenance(os.path.abspath(__file__)),
    }

    def dump(status: str) -> None:
        payload["status"] = status
        payload["seconds_elapsed"] = round(time.time() - t_start, 1)
        digest = write_report(args.out, payload)
        log(f"[{time.time() - t_start:7.1f}s] report written ({status}) SHA256 {digest}")

    # ---------------- data ----------------
    log(f"enumerating all trees 3 <= n <= {args.nmax} with every leaf ...")
    inst = Instances(args.nmax)
    log(f"[{time.time() - t_start:7.1f}s] {inst.M} instances from {len(inst.parents)} trees ({inst.seconds:.1f}s)")
    payload["data"] = {
        "nmax": args.nmax,
        "trees_by_n": inst.trees_by_n,
        "instances_by_n": inst.count_by_n,
        "total_trees": len(inst.parents),
        "total_instances": inst.M,
        "oeis_A000055_check": True,
        "identity_checks": "p_r = a_r + b_{r-1} and a_r = b_r + c_{r-1} verified on every instance; R = LC_{r-1}(b) + CROSS verified on every (instance, r) row",
    }

    max_alpha = int(inst.meta[:, 4].max())
    coords: Dict[int, Coords] = {}
    for r in range(1, max_alpha):
        coords[r] = Coords(inst, r)

    # ---------------- Task 1 ----------------
    log("Task 1: signs of CROSS and R ...")
    task1: Dict[str, Any] = {"per_r": {}, "totals": {}}
    variants = {"all_indices": lambda c: c.valid, "prefix": lambda c: c.prefix, "descent": lambda c: c.descent,
                "prefix_and_descent": lambda c: c.prefix & c.descent}
    totals = {v: {"rows": 0, "cross_negative": 0, "R_negative": 0, "R_zero": 0} for v in variants}
    worst_global: Dict[str, Tuple[Fraction, int, int]] = {}
    for r, c in coords.items():
        entry: Dict[str, Any] = {}
        for vname, fn in variants.items():
            mask = fn(c)
            if not mask.any():
                continue
            st_cross = frac_stats(c.CROSS, mask)
            st_R = frac_stats(c.R, mask)
            totals[vname]["rows"] += st_R["count"]
            totals[vname]["cross_negative"] += st_cross["negative"]
            totals[vname]["R_negative"] += st_R["negative"]
            totals[vname]["R_zero"] += st_R["zero"]
            e: Dict[str, Any] = {"rows": st_R["count"], "cross_negative": st_cross["negative"], "cross_fraction_negative": st_cross["fraction_negative"],
                                 "R_negative": st_R["negative"], "R_fraction_negative": st_R["fraction_negative"], "R_zero": st_R["zero"]}
            res = exact_min_ratio(c.R, c.N, mask)
            if res:
                e["min_R_over_N"] = {**fr_json(res[0]), "witness": inst.witness(res[1], r)}
                cur = worst_global.get(vname)
                if cur is None or res[0] < cur[0]:
                    worst_global[vname] = (res[0], res[1], r)
            res = exact_min_ratio(c.CROSS, c.N, mask)
            if res:
                e["min_CROSS_over_N"] = {**fr_json(res[0]), "witness": inst.witness(res[1], r)}
            res = exact_min_ratio(c.QT, c.N, mask)
            if res:
                e["min_ISO_margin_Q_T_over_N"] = {**fr_json(res[0]), "witness_shape": inst.witness(res[1], r)["shape"], "n": inst.witness(res[1], r)["n"]}
            # how much of the margin the two IH terms contribute on the worst instance
            if mask.any():
                cn = np.flatnonzero(mask & (c.CROSS < 0))
                if cn.size:
                    e["cross_negative_witnesses"] = [inst.witness(int(i), r)["shape"] for i in cn[:5]]
                    shapes = {}
                    for i in cn:
                        s = inst.witness(int(i), r)["shape"].split(" (")[0]
                        shapes[s] = shapes.get(s, 0) + 1
                    e["cross_negative_shape_histogram"] = dict(sorted(shapes.items(), key=lambda kv: -kv[1])[:10])
            entry[vname] = e
        # descent propagation to A and B (needed for a descent-conditional induction)
        m = c.descent
        if m.any():
            entry["descent_propagation"] = {
                "descent_rows": int(m.sum()),
                "A_also_descends_at_r": int(np.count_nonzero(m & c.descent_A)),
                "B_also_descends_at_r-1": int(np.count_nonzero(m & c.descent_B)),
                "both": int(np.count_nonzero(m & c.descent_A & c.descent_B)),
            }
        # IH range bookkeeping for prefix statements
        m = c.prefix
        if m.any():
            entry["prefix_ih_range"] = {
                "prefix_rows": int(m.sum()),
                "rows_where_r<=L(alpha(A))-1_and_r-1<=L(alpha(B))-1": int(np.count_nonzero(m & c.ih_range_ok)),
                "rows_with_range_gap": int(np.count_nonzero(m & ~c.ih_range_ok)),
            }
        task1["per_r"][str(r)] = entry
        log(f"  r={r}: rows={entry.get('all_indices', {}).get('rows')} CROSS<0: {entry.get('all_indices', {}).get('cross_negative')} R<0: {entry.get('all_indices', {}).get('R_negative')} "
            f"min R/N={entry.get('all_indices', {}).get('min_R_over_N', {}).get('float')}")
    for vname, t in totals.items():
        t["cross_fraction_negative"] = t["cross_negative"] / t["rows"] if t["rows"] else None
        t["R_fraction_negative"] = t["R_negative"] / t["rows"] if t["rows"] else None
        if vname in worst_global:
            f, i, r = worst_global[vname]
            t["worst_R_over_N"] = {**fr_json(f), "witness": inst.witness(i, r)}
    task1["totals"] = totals
    task1["star_closed_forms"] = star_closed_forms()
    payload["task1_signs"] = task1
    dump("task1 done")

    # ---------------- Task 2 ----------------
    log("Task 2: universality of candidate payment terms, capacities, payment LP, IH usage ...")
    task2: Dict[str, Any] = {"universality": {}, "per_r": {}}
    univ_all: Dict[str, Dict[str, Any]] = {}
    for r, c in coords.items():
        terms = c.payment_terms()
        entry: Dict[str, Any] = {"universality": {}, "capacity_all_indices": {}, "capacity_prefix": {}}
        universal_names: List[str] = []
        for nm, val in terms.items():
            u = univ_all.setdefault(nm, {"rows": 0, "negative_all": 0, "negative_prefix": 0, "witness": None, "provable": nm in PROVABLE_TERMS})
            mask = c.valid
            neg = np.flatnonzero(mask & (val < 0))
            negp = np.flatnonzero(c.prefix & (val < 0))
            u["rows"] += int(mask.sum())
            u["negative_all"] += int(neg.size)
            u["negative_prefix"] += int(negp.size)
            if neg.size and u["witness"] is None:
                u["witness"] = inst.witness(int(neg[0]), r)
            entry["universality"][nm] = {"negative_all_indices": int(neg.size), "negative_prefix": int(negp.size)}
            if neg.size == 0:
                universal_names.append(nm)
                for key, msk in (("capacity_all_indices", c.valid), ("capacity_prefix", c.prefix)):
                    m2 = msk & (val > 0)
                    res = exact_min_ratio(c.R, val, m2)
                    if res:
                        entry[key][nm] = {**fr_json(res[0]), "witness_shape": inst.witness(res[1], r)["shape"], "witness_n": inst.witness(res[1], r)["n"]}
        entry["universal_terms_on_data"] = universal_names
        # payment LP over the universal & provable terms (all indices), and over all universal terms
        prov = {nm: terms[nm] for nm in universal_names if nm in PROVABLE_TERMS}
        allu = {nm: terms[nm] for nm in universal_names}
        entry["payment_lp_provable_terms_all_indices"] = payment_lp(c.R, c.N, prov, c.valid, inst, r)
        entry["payment_lp_all_universal_terms_all_indices"] = payment_lp(c.R, c.N, allu, c.valid, inst, r)
        entry["payment_lp_all_universal_terms_prefix"] = payment_lp(c.R, c.N, allu, c.prefix, inst, r)
        entry["ih_usage_all_indices"] = ih_usage(c, c.valid, inst)
        entry["ih_usage_prefix"] = ih_usage(c, c.prefix, inst)
        task2["per_r"][str(r)] = entry
        lp = entry["payment_lp_all_universal_terms_all_indices"]
        log(f"  r={r}: universal terms={len(universal_names)}/{len(terms)}; payment LP obj={lp.get('objective_float')} verified={lp.get('exact_verification')}; "
            f"IH usage: {entry['ih_usage_all_indices'].get('joint_lp_max_lambda_a_plus_lambda_b', {}).get('lambda')}")
    for nm, u in univ_all.items():
        u["universal_all_indices"] = u["negative_all"] == 0
        u["universal_prefix"] = u["negative_prefix"] == 0
    task2["universality"] = univ_all
    task2["superadditivity_note"] = (
        "For any Phi_r(p) = sum mu_i m_i(p) with mu_i >= 0 over the monomials p_i p_j (i,j in {r-1,r,r+1}) one has "
        "Phi_r(a) + Phi_{r-1}(b) - Phi_r(T) = -(cross terms) <= 0 because p_k(T) = a_k + b_{k-1} and all counts are >= 0. "
        "Hence a strengthened hypothesis Q_r >= Phi_r with Phi_r a non-negative quadratic form can never increase the closing "
        "slack of the leaf induction; only sign-indefinite strengthenings (e.g. PLC) can. Verified numerically below for FLC and PLC."
    )
    payload["task2_payment"] = task2
    dump("task2 done")

    # ---------------- Task 3 ----------------
    log("Task 3: descent-conditional and r >= 3 restrictions ...")
    task3: Dict[str, Any] = {"per_r": {}}
    for r, c in coords.items():
        terms = c.payment_terms()
        entry: Dict[str, Any] = {}
        for vname, mask in (("descent", c.descent), ("prefix_and_descent", c.prefix & c.descent)):
            if not mask.any():
                continue
            e: Dict[str, Any] = {"rows": int(mask.sum())}
            res = exact_min_ratio(c.R, c.N, mask)
            if res:
                e["min_R_over_N"] = {**fr_json(res[0]), "witness": inst.witness(res[1], r)}
            res = exact_min_ratio(c.CROSS, c.N, mask)
            if res:
                e["min_CROSS_over_N"] = fr_json(res[0])
            e["cross_negative"] = int(np.count_nonzero(mask & (c.CROSS < 0)))
            e["R_negative"] = int(np.count_nonzero(mask & (c.R < 0)))
            universal_names = [nm for nm, val in terms.items() if not np.any(c.valid & (val < 0))]
            e["capacity"] = {}
            for nm in universal_names:
                m2 = mask & (terms[nm] > 0)
                res = exact_min_ratio(c.R, terms[nm], m2)
                if res:
                    e["capacity"][nm] = fr_json(res[0])
            e["payment_lp_all_universal_terms"] = payment_lp(c.R, c.N, {nm: terms[nm] for nm in universal_names}, mask, inst, r)
            e["ih_usage"] = ih_usage(c, mask, inst)
            entry[vname] = e
        task3["per_r"][str(r)] = entry
        log(f"  r={r}: descent rows={entry.get('descent', {}).get('rows')} min R/N={entry.get('descent', {}).get('min_R_over_N', {}).get('float')} "
            f"cross<0={entry.get('descent', {}).get('cross_negative')}")
    rs = sorted(coords)
    task3["r_ge_3_summary"] = {
        "min_R_over_N_all_indices": min((Fraction(task1["per_r"][str(r)]["all_indices"]["min_R_over_N"]["exact"]) for r in rs if r >= 3 and "all_indices" in task1["per_r"][str(r)]), default=None),
        "min_R_over_N_prefix": min((Fraction(task1["per_r"][str(r)]["prefix"]["min_R_over_N"]["exact"]) for r in rs if r >= 3 and "prefix" in task1["per_r"][str(r)]), default=None),
        "cross_negative_rows_r_ge_3": sum(task1["per_r"][str(r)]["all_indices"]["cross_negative"] for r in rs if r >= 3 and "all_indices" in task1["per_r"][str(r)]),
        "R_negative_rows_r_ge_3": sum(task1["per_r"][str(r)]["all_indices"]["R_negative"] for r in rs if r >= 3 and "all_indices" in task1["per_r"][str(r)]),
    }
    for k in ("min_R_over_N_all_indices", "min_R_over_N_prefix"):
        v = task3["r_ge_3_summary"][k]
        task3["r_ge_3_summary"][k] = fr_json(v) if v is not None else None
    payload["task3_descent_and_r_ge_3"] = task3
    dump("task3 done")

    # ---------------- Task 4 ----------------
    log("Task 4: FLC / PLC as induction targets ...")
    task4: Dict[str, Any] = {}
    task4["closing_inequalities_on_instances"] = {}
    for r, c in coords.items():
        e: Dict[str, Any] = {}
        for vname, mask in (("all_indices", c.valid), ("prefix", c.prefix), ("prefix_with_ih_range_ok", c.prefix & c.ih_range_ok), ("descent", c.descent), ("prefix_and_descent", c.prefix & c.descent)):
            if not mask.any():
                continue
            ee: Dict[str, Any] = {"rows": int(mask.sum())}
            for tname, val in (("E_FLC", c.E_FLC), ("E_PLC", c.E_PLC)):
                res = exact_min_ratio(val, c.N, mask)
                neg = int(np.count_nonzero(mask & (val < 0)))
                ee[tname] = {"negative_rows": neg, "min_over_N": {**fr_json(res[0]), "witness": inst.witness(res[1], r)} if res else None}
            e[vname] = ee
        task4["closing_inequalities_on_instances"][str(r)] = e
        log(f"  r={r}: E_FLC<0 rows (all/prefix)={e.get('all_indices', {}).get('E_FLC', {}).get('negative_rows')}/{e.get('prefix', {}).get('E_FLC', {}).get('negative_rows')}; "
            f"E_PLC<0 rows (all/prefix)={e.get('all_indices', {}).get('E_PLC', {}).get('negative_rows')}/{e.get('prefix', {}).get('E_PLC', {}).get('negative_rows')}")
    task4["trees_scan"] = flc_plc_scan(args.nmax_flc)
    task4["families"] = families_scan()
    task4["leaf_identity_rows_on_non_log_concave_trees"] = named_tree_leaf_rows()
    for name, e in task4["leaf_identity_rows_on_non_log_concave_trees"].items():
        log(f"  {name}: rows={e['rows']} E_FLC<0={e['E_FLC_negative_count']} (prefix {e['E_FLC_negative_in_prefix']}) E_PLC<0={e['E_PLC_negative_count']} (prefix {e['E_PLC_negative_in_prefix']}) R<0 rows={len(e['R_negative_rows'])}")
    payload["task4_flc_plc"] = task4
    dump("task4 done")

    # ---------------- Task 5 ----------------
    if not args.skip_closure:
        log("Task 5: convolution closure ...")
        payload["task5_closure"] = closure_tests(args.seed)
        payload["task5_closure"]["flc_closure_reference"] = (
            "FLC_r for all r <=> the sequence r! p_r is log-concave (ULC(infinity) in Liggett's terminology). The ordinary convolution of p and q "
            "corresponds to the binomial convolution of r! p_r and r! q_r, and the binomial convolution of two log-concave sequences is log-concave: "
            "T. M. Liggett, Ultra logconcave sequences and negative dependence, J. Combin. Theory Ser. A 79 (1997) 315-325 (Theorem 2; ULC(infinity) case); "
            "see also Y. Wang, Y.-N. Yeh, Log-concavity and LC-positivity, J. Combin. Theory Ser. A 114 (2007) 195-210. Hence FLC at all indices is closed under "
            "disjoint union, so for FLC forests reduce to trees. Plain ISO is not the shadow of any such closed property (see the random-sequence counterexamples)."
        )
        dump("task5 done")

    # ---------------- forest instances of the leaf lemma ----------------
    log("Leaf lemma on forest instances ...")
    payload["leaf_lemma_forest_instances"] = forest_instances(inst, args.forest_n0, args.forest_ntot)
    fi = payload["leaf_lemma_forest_instances"]
    log(f"  forest-instance rows={fi['rows']} R<0={fi['R_negative']} worst R/N={fi['worst_R_over_N']['float'] if fi['worst_R_over_N'] else None}")
    dump("forest instances done")

    # ---------------- certificate LPs ----------------
    log("Certificate LPs (exact symbolic proof attempts) ...")
    certs: Dict[str, Any] = {"per_r": {}}
    for r in range(1, args.cert_rmax + 1):
        e: Dict[str, Any] = {}
        for target in ("R", "E_FLC", "E_PLC"):
            for level in (0, 1, 2, 3):
                res = certificate_lp(r, target, level)
                e[f"{target}_menu{level}"] = res
                if res.get("exact_certificate_recovered"):
                    break
        certs["per_r"][str(r)] = e
        summary = {k: ("CERT" if v.get("exact_certificate_recovered") else ("float-feasible" if v.get("float_lp_status") == 0 else "infeasible")) for k, v in e.items()}
        log(f"  r={r}: {summary}")
    # extra: menu 3 + the synchronisation inequalities that were universal on the data (hypothetical), at r = 2..cert_rmax
    import sympy as sp

    bm, b0, b1, b2, cm, c0, c1 = sp.symbols("bm b0 b1 b2 cm c0 c1")
    extra_candidates = {
        "sync: b_{r-1}*c_{r-2}-b_{r-2}*c_{r-1}": b0 * cm - bm * c0,
        "sync: b_{r-2}*c_{r-1}-b_{r-1}*c_{r-2}": bm * c0 - b0 * cm,
        "sync: b_r*c_{r-1}-b_{r-1}*c_r": b1 * c0 - b0 * c1,
        "sync: b_{r-1}*c_r-b_r*c_{r-1}": b0 * c1 - b1 * c0,
        "sync: a_r*b_{r-1}-a_{r-1}*b_r": (b1 + c0) * b0 - (b0 + cm) * b1,
        "sync: a_{r-1}*b_r-a_r*b_{r-1}": (b0 + cm) * b1 - (b1 + c0) * b0,
        "sync: a_{r-1}*c_{r-1}-a_r*c_{r-2}": (b0 + cm) * c0 - (b1 + c0) * cm,
        "sync: a_r*c_{r-2}-a_{r-1}*c_{r-1}": (b1 + c0) * cm - (b0 + cm) * c0,
        "ULC: (r+1)b_{r-1}b_r-(r-1)b_{r-2}b_{r+1}": None,
    }
    universal_extra = [(nm, ex) for nm, ex in extra_candidates.items() if ex is not None and univ_all.get(nm, {}).get("universal_all_indices")]
    certs["extra_hypothetical_forms_universal_on_data"] = [nm for nm, _ in universal_extra]
    certs["with_universal_sync_forms"] = {}
    for r in range(2, args.cert_rmax + 1):
        extra = list(universal_extra)
        if univ_all.get("ULC: (r+1)b_{r-1}b_r-(r-1)b_{r-2}b_{r+1}", {}).get("universal_all_indices"):
            extra.append(("ULC: (r+1)b_{r-1}b_r-(r-1)b_{r-2}b_{r+1}", (r + 1) * b0 * b1 - (r - 1) * bm * b2))
        res = certificate_lp(r, "R", 3, extra_forms=extra)
        certs["with_universal_sync_forms"][str(r)] = res
        log(f"  r={r} R with menu3 + universal sync forms: {'CERT' if res.get('exact_certificate_recovered') else ('float-feasible' if res.get('float_lp_status') == 0 else 'infeasible')}")
    payload["certificate_lps"] = certs
    dump("certificates done")

    payload["seconds_total"] = round(time.time() - t_start, 1)
    dump("complete")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
