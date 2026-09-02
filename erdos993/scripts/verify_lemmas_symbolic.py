#!/usr/bin/env python3
"""Machine verification of docs/REDUCTION_LEMMA_AND_PROVED_CASES.md.

Every algebraic identity and inequality used in the note is checked here with
*exact* arithmetic only: sympy polynomial identities (``expand`` or
``simplify`` of a difference must return 0), Python integers and
``fractions.Fraction``.  No floating point is used anywhere; the last
sub-check of every symbolic item asserts that no ``Float`` atom occurs in any
expression that was used.

Items (numbering follows the note and the task statement):

  [1]  reduction lemma: identities (1.1)/(1.2), ratio form, brute force
  [2]  conditional unimodality theorem: L(alpha) bookkeeping, finite-domain check
  [3]  p_0..p_3 (and p_4) formulas vs erdos993lib.indpoly (trees n<=12, random forests)
  [4]  ISO_1 for every forest: Q_1 = n + 1 + 2e
  [5]  ISO_2 for every forest: Q_2 >= g(e) > 0; concavity; endpoints; star is extremal
  [6]  WR_1 and WR_2 wherever the framework needs them
  [7]  Newton => ISO_r for real-rooted I(F;x); paths; stars are not real-rooted
  [8]  all trees n<=14: reduction lemma never fails; Q_1, Q_2 formulas exact
  [9]  scope of TAIL: fails for 2K_3 (not bipartite), holds for all forests n<=12
  [10] p_4 formula and failure of the crude ISO_3 bound on stars (not-proved section)

Usage:  python3 scripts/verify_lemmas_symbolic.py [-q]
Prints PASS/FAIL per item; exit status 1 if any sub-check fails.
"""

from __future__ import annotations

import argparse
import itertools
import math
import os
import random
import sys
from fractions import Fraction
from typing import Callable, Dict, List, Sequence, Tuple

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import sympy as sp  # noqa: E402

from erdos993lib.checks import analyze, is_unimodal, iso_value, tail_cutoff, wr_slack  # noqa: E402
from erdos993lib.families import path, random_tree, star  # noqa: E402
from erdos993lib.indpoly import indpoly_bruteforce, indpoly_forest, indpoly_parent_array  # noqa: E402
from erdos993lib.trees import (  # noqa: E402
    A000055,
    A005195,
    forest_polys,
    free_tree_layouts,
    free_trees,
    layout_to_parent,
    parent_to_edges,
)

# --------------------------------------------------------------------------
# small exact helpers
# --------------------------------------------------------------------------


def comb(a: int, k: int) -> int:
    """Binomial coefficient with C(a, k) = 0 for a < 0 (only ever multiplied by 0 here)."""
    return math.comb(a, k) if a >= 0 else 0


def coef(p: Sequence[int], k: int) -> int:
    """p_k with the convention p_k = 0 for k > alpha (library lists stop at alpha)."""
    return p[k] if 0 <= k < len(p) else 0


def Q(p: Sequence[int], r: int) -> int:
    """Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} with padded coefficients."""
    return r * coef(p, r) ** 2 + coef(p, r - 1) ** 2 - (r + 1) * coef(p, r - 1) * coef(p, r + 1)


def degrees(n: int, edges: Sequence[Tuple[int, int]]) -> List[int]:
    deg = [0] * n
    for u, v in edges:
        deg[u] += 1
        deg[v] += 1
    return deg


def forest_invariants(n: int, edges: Sequence[Tuple[int, int]]) -> Tuple[int, int, int, int]:
    """(e, S, T, P): edges, pairs of edges sharing a vertex, K_{1,3} subgraphs, 3-edge paths."""
    deg = degrees(n, edges)
    e = len(edges)
    S = sum(comb(d, 2) for d in deg)
    T = sum(comb(d, 3) for d in deg)
    P = sum((deg[u] - 1) * (deg[v] - 1) for u, v in edges)
    return e, S, T, P


def formula_p0_to_p3(n: int, e: int, S: int) -> List[int]:
    return [1, n, comb(n, 2) - e, comb(n, 3) - e * (n - 2) + S]


def formula_p4(n: int, e: int, S: int, T: int, P: int) -> int:
    return comb(n, 4) - e * comb(n - 2, 2) + (n - 3) * S + (comb(e, 2) - S) - T - P


def g_int(n: int, e: int) -> int:
    """g(e) = 2 (C(n,2)-e)^2 + n^2 - 3n (C(n,3) - e(n-2) + C(e,2)); exact lower bound for Q_2."""
    return 2 * (comb(n, 2) - e) ** 2 + n * n - 3 * n * (comb(n, 3) - e * (n - 2) + comb(e, 2))


def star_q2(n: int) -> int:
    """(n-1)(n-2) + n^2 = Q_2 of the star K_{1,n-1} = g(n-1)."""
    return (n - 1) * (n - 2) + n * n


def parent_degrees(parent: Sequence[int]) -> List[int]:
    deg = [0] * len(parent)
    for v in range(1, len(parent)):
        deg[v] += 1
        deg[parent[v]] += 1
    return deg


def Cs(x, k):
    """Symbolic binomial coefficient expanded to a polynomial."""
    return sp.expand_func(sp.binomial(x, k))


def no_floats(*exprs) -> bool:
    return not any(sp.sympify(x).atoms(sp.Float) for x in exprs)


# --------------------------------------------------------------------------
# check bookkeeping
# --------------------------------------------------------------------------


class Check:
    def __init__(self, item: str, title: str) -> None:
        self.item = item
        self.title = title
        self.results: List[Tuple[bool, str]] = []

    def expect(self, cond, msg: str) -> bool:
        ok = bool(cond)
        self.results.append((ok, msg))
        return ok

    @property
    def ok(self) -> bool:
        return bool(self.results) and all(ok for ok, _ in self.results)

    @property
    def failures(self) -> List[str]:
        return [msg for ok, msg in self.results if not ok]


# --------------------------------------------------------------------------
# [1] reduction lemma
# --------------------------------------------------------------------------


def check_reduction_lemma(c: Check) -> None:
    r, a, b, cc = sp.symbols("r a b c")  # r, p_{r-1}, p_r, p_{r+1}
    Qr = r * b**2 + a**2 - (r + 1) * a * cc
    lhs = r * b**2 - (r + 1) * b * a + a**2
    c.expect(sp.expand(lhs - (r * b - a) * (b - a)) == 0,
             "(1.2)  r p_r^2 - (r+1) p_r p_{r-1} + p_{r-1}^2 = (r p_r - p_{r-1})(p_r - p_{r-1})")
    c.expect(sp.expand((r + 1) * a * (b - cc) - (Qr + (r * b - a) * (a - b))) == 0,
             "(1.1)  (r+1) p_{r-1}(p_r - p_{r+1}) = Q_r + (r p_r - p_{r-1})(p_{r-1} - p_r)")
    c.expect(sp.expand(Qr - (r * (b**2 - a * cc) + a * (a - cc))) == 0,
             "(7.3)  Q_r = r (p_r^2 - p_{r-1} p_{r+1}) + p_{r-1}(p_{r-1} - p_{r+1})")

    # ratio form: x = p_r/p_{r-1}, y = p_{r+1}/p_r
    x, y = sp.symbols("x y", positive=True)
    f = r * x + 1 / x
    c.expect(sp.simplify(Qr / (a * b) - (r * (b / a) + a / b - (r + 1) * cc / b)) == 0,
             "Q_r/(p_{r-1} p_r) = r x + 1/x - (r+1) y  (x = p_r/p_{r-1}, y = p_{r+1}/p_r)")
    c.expect(sp.simplify(f - (r + 1) - (r * x - 1) * (x - 1) / x) == 0,
             "r x + 1/x - (r+1) = (r x - 1)(x - 1)/x  (<= 0 on [1/r, 1])")
    c.expect(sp.simplify(sp.diff(f, x, 2) - 2 / x**3) == 0, "f(x) = r x + 1/x has f'' = 2/x^3 > 0 (convex)")
    c.expect(sp.simplify(f.subs(x, 1 / r) - (r + 1)) == 0 and sp.simplify(f.subs(x, 1) - (r + 1)) == 0,
             "f(1/r) = f(1) = r + 1 (equality at both endpoints)")

    # exhaustive brute force of the arithmetic statement on a box of integers
    triggered = bad = 0
    for rr in range(1, 7):
        for A in range(1, 26):
            for B in range(0, A + 1):  # hypothesis p_r <= p_{r-1}
                if A > rr * B:  # WR_r fails
                    continue
                for C_ in range(0, 61):
                    if rr * B * B + A * A - (rr + 1) * A * C_ >= 0:  # ISO_r
                        triggered += 1
                        if C_ > B:
                            bad += 1
    c.expect(bad == 0 and triggered > 0,
             f"brute force r<=6, p_(r-1)<=25, p_(r+1)<=60: WR & ISO & p_r<=p_(r-1) => p_(r+1)<=p_r "
             f"({triggered} hypothesis instances, {bad} violations)")
    c.expect(no_floats(Qr, lhs, f), "no floating point atoms in any expression used")


# --------------------------------------------------------------------------
# [2] conditional unimodality theorem
# --------------------------------------------------------------------------


def _hypotheses(p: Sequence[int]) -> Tuple[bool, bool, bool]:
    """(TAIL, full WR+ISO on 1..L-1, descent-conditional WR+ISO on 1..L-1)."""
    a = len(p) - 1
    L = tail_cutoff(a)
    tail = all(p[r] >= p[r + 1] for r in range(L, a))
    full = all(wr_slack(p, r) >= 0 and iso_value(p, r) >= 0 for r in range(1, L))
    desc = all(wr_slack(p, r) >= 0 and iso_value(p, r) >= 0 for r in range(1, L) if p[r] <= p[r - 1])
    return tail, full, desc


def check_unimodality_theorem(c: Check) -> None:
    ok = True
    for a in range(1, 300):
        L = tail_cutoff(a)
        ok &= L == int(sp.ceiling(sp.Rational(2 * a - 1, 3)))
        ok &= 1 <= L <= a and (a == 1 or L <= a - 1) and L <= tail_cutoff(a + 1)
    c.expect(ok, "L(a) = ceil((2a-1)/3) = tail_cutoff(a); 1 <= L(a) <= a; L(a) <= a-1 for a >= 2; non-decreasing (a < 300)")
    c.expect([tail_cutoff(a) for a in range(1, 10)] == [1, 1, 2, 3, 3, 4, 5, 5, 6], "table L(1..9) = 1,1,2,3,3,4,5,5,6")
    c.expect(all((tail_cutoff(a) <= 3) == (a <= 5) for a in range(1, 300)),
             "L(alpha) <= 3  <=>  alpha <= 5  (so r = 1, 2 are the only prefix indices iff alpha <= 5)")

    # finite-domain verification of Theorems 2.1 / 2.2: every sequence p_0 = 1, 1 <= p_k <= 6,
    # alpha <= 6 that satisfies the hypotheses is unimodal with its maximum at an index <= L.
    K = 6
    n_full = n_desc = n_nonuni = 0
    bad: List[Tuple[int, ...]] = []
    for alpha in range(1, 7):
        L = tail_cutoff(alpha)
        for rest in itertools.product(range(1, K + 1), repeat=alpha):
            p = (1,) + rest
            uni = is_unimodal(p)
            if not uni:
                n_nonuni += 1
            tail, full, desc = _hypotheses(p)
            if not tail:
                continue
            peak_ok = max(p) == max(p[: L + 1])
            if full:
                n_full += 1
                if not (uni and peak_ok):
                    bad.append(p)
            if desc:
                n_desc += 1
                if not (uni and peak_ok):
                    bad.append(p)
    c.expect(not bad and n_full > 0 and n_desc >= n_full and n_nonuni > 0,
             f"finite domain (alpha<=6, entries<=6): {n_full} sequences satisfy WR+ISO(1..L-1)+TAIL, "
             f"{n_desc} the descent-conditional version, all unimodal with max at index <= L "
             f"({n_nonuni} non-unimodal sequences exist in the domain; violations: {len(bad)})")

    # a non-unimodal sequence with TAIL must violate WR or ISO somewhere in the prefix
    p = (1, 5, 4, 5, 1)
    tail, full, desc = _hypotheses(p)
    rep = analyze(p)
    c.expect(not is_unimodal(p) and tail and not full and rep["iso_failures_prefix"] == [2]
             and rep["descent_conditional_iso_failures_prefix"] == [2],
             "(1,5,4,5,1): TAIL holds, not unimodal => ISO_2 fails (Q_2 = -18), as the theorem forces")


# --------------------------------------------------------------------------
# [3] low-order coefficient formulas
# --------------------------------------------------------------------------


def check_coefficient_formulas(c: Check) -> None:
    n_trees = bad = 0
    for n in range(1, 13):
        cnt = 0
        for parent in free_trees(n):
            cnt += 1
            edges = parent_to_edges(parent)
            p = indpoly_forest(n, edges)
            e, S, T, P = forest_invariants(n, edges)
            if [coef(p, k) for k in range(4)] != formula_p0_to_p3(n, e, S):
                bad += 1
            if coef(p, 4) != formula_p4(n, e, S, T, P):
                bad += 1
        if cnt != A000055[n]:
            bad += 1
        n_trees += cnt
    c.expect(bad == 0, f"p_0..p_3 formulas (and the p_4 formula of Prop. 3.3) hold for all {n_trees} trees with n <= 12")

    rng = random.Random(993)
    trials = bad = brute = 0
    seen_e: set = set()
    for _ in range(400):
        n = rng.randrange(1, 41)
        _, edges = random_tree(n, rng) if n >= 2 else (1, [])
        q = rng.random()
        edges = [uv for uv in edges if rng.random() >= q]  # delete edges at random -> forest
        p = indpoly_forest(n, edges)
        e, S, T, P = forest_invariants(n, edges)
        seen_e.add(n - 1 - e)
        trials += 1
        if [coef(p, k) for k in range(4)] != formula_p0_to_p3(n, e, S) or coef(p, 4) != formula_p4(n, e, S, T, P):
            bad += 1
        if n <= 12:
            brute += 1
            if indpoly_bruteforce(n, edges) != p:
                bad += 1
    c.expect(bad == 0 and len(seen_e) > 5,
             f"formulas hold for {trials} random forests (n <= 40, random edge deletion, {len(seen_e)} distinct "
             f"numbers of deleted edges); {brute} of them cross-checked against indpoly_bruteforce")

    # Remark 3.2: for an arbitrary graph p_3 = C(n,3) - e(n-2) + S - t, t = number of triangles
    bad = 0
    for _ in range(150):
        n = rng.randrange(1, 10)
        edges = [(u, v) for u in range(n) for v in range(u + 1, n) if rng.random() < 0.5]
        adj = [set() for _ in range(n)]
        for u, v in edges:
            adj[u].add(v)
            adj[v].add(u)
        t = sum(1 for u, v in edges for w in range(max(u, v) + 1, n) if w in adj[u] and w in adj[v])
        p = indpoly_bruteforce(n, edges)
        e, S, _T, _P = forest_invariants(n, edges)
        if [coef(p, k) for k in range(4)] != [1, n, comb(n, 2) - e, comb(n, 3) - e * (n - 2) + S - t]:
            bad += 1
    c.expect(bad == 0, "Remark 3.2: p_3 = C(n,3) - e(n-2) + S - #triangles for 150 random graphs n <= 9 (brute force)")

    c.expect(indpoly_forest(1, []) == [1, 1] and formula_p0_to_p3(1, 0, 0) == [1, 1, 0, 0],
             "n = 1: p = (1, 1); formulas give p_2 = p_3 = 0")
    c.expect(indpoly_forest(2, []) == [1, 2, 1] and formula_p0_to_p3(2, 0, 0) == [1, 2, 1, 0],
             "n = 2, e = 0: p = (1, 2, 1); formulas give p_3 = 0")
    c.expect(indpoly_forest(2, [(0, 1)]) == [1, 2] and formula_p0_to_p3(2, 1, 0) == [1, 2, 0, 0],
             "n = 2, e = 1: p = (1, 2); formulas give p_2 = p_3 = 0")
    c.expect(indpoly_forest(3, [(0, 1), (1, 2)]) == [1, 3, 1] and formula_p0_to_p3(3, 2, 1) == [1, 3, 1, 0],
             "P_3: p = (1, 3, 1), S = 1, p_3 = C(3,3) - 2*1 + 1 = 0")


# --------------------------------------------------------------------------
# [4] ISO_1
# --------------------------------------------------------------------------


def check_iso1(c: Check) -> None:
    n, e = sp.symbols("n e")
    p0, p1, p2 = sp.Integer(1), n, Cs(n, 2) - e
    Q1 = 1 * p1**2 + p0**2 - 2 * p0 * p2
    c.expect(sp.expand(Q1 - (n + 1 + 2 * e)) == 0, "Q_1 = p_1^2 + p_0^2 - 2 p_0 p_2 = n + 1 + 2e (polynomial identity)")
    c.expect(all(Q(indpoly_forest(*star(k)), 1) == k + 1 + 2 * (k - 1) for k in range(1, 20)),
             "Q_1(K_{1,n-1}) = 3n - 1 for n <= 19 (library polynomials)")
    c.expect(no_floats(Q1), "no floating point atoms")


# --------------------------------------------------------------------------
# [5] ISO_2
# --------------------------------------------------------------------------


def check_iso2(c: Check) -> None:
    n, e, S, m = sp.symbols("n e S m")
    p1, p2, p3 = n, Cs(n, 2) - e, Cs(n, 3) - e * (n - 2) + S
    Q2 = 2 * p2**2 + p1**2 - 3 * p1 * p3
    g = Q2.subs(S, Cs(e, 2))
    ge = sp.expand(g)

    c.expect(sp.expand(Q2 - g - 3 * n * (Cs(e, 2) - S)) == 0, "Q_2 - g(e) = 3n (C(e,2) - S)  (>= 0 since S <= C(e,2))")
    Pg = sp.Poly(ge, e)
    lead = Pg.coeff_monomial(e**2)
    c.expect(Pg.degree() == 2 and sp.expand(lead - (2 - sp.Rational(3, 2) * n)) == 0,
             "g is quadratic in e with e^2-coefficient 2 - 3n/2")
    c.expect(sp.expand(lead + sp.Rational(1, 2) * (3 * n - 4)) == 0 and all(2 * 2 - 3 * k < 0 for k in range(2, 400)),
             "2 - 3n/2 = -(3n-4)/2 <= -1 < 0 for every integer n >= 2 (concave in e)")
    c.expect(sp.expand(ge.subs(e, 0) - (n**2 * (n - 1) / 2 + n**2)) == 0, "g(0) = n^2 (n-1)/2 + n^2")
    c.expect(sp.expand(ge.subs(e, n - 1) - ((n - 1) * (n - 2) + n**2)) == 0, "g(n-1) = (n-1)(n-2) + n^2")
    c.expect(sp.expand(Cs(n, 2) - (n - 1) - Cs(n - 1, 2)) == 0
             and sp.expand(Cs(n, 3) - (n - 1) * (n - 2) + Cs(n - 1, 2) - Cs(n - 1, 3)) == 0,
             "C(n,2) - (n-1) = C(n-1,2) and C(n,3) - (n-1)(n-2) + C(n-1,2) = C(n-1,3) (used for g(n-1))")
    chord = (n - 1 - e) / (n - 1) * ge.subs(e, 0) + e / (n - 1) * ge.subs(e, n - 1)
    c.expect(sp.simplify(ge - chord - (sp.Rational(3, 2) * n - 2) * e * (n - 1 - e)) == 0,
             "g(e) - [chord through (0,g(0)),(n-1,g(n-1))] = (3n/2 - 2) e (n-1-e)  (>= 0 on [0, n-1], n >= 2)")
    c.expect(sp.expand(ge - ge.subs(e, n - 1) - (n - 1 - e) * ((3 * n - 4) * e + (n - 1) ** 2 + 3) / 2) == 0,
             "g(e) - g(n-1) = (n-1-e) ((3n-4) e + (n-1)^2 + 3) / 2")
    c.expect(sp.expand(ge.subs(e, 0) - ge.subs(e, n - 1) - (n - 1) * ((n - 1) ** 2 + 3) / 2) == 0,
             "g(0) - g(n-1) = (n-1)((n-1)^2 + 3)/2 >= 0, so min over [0, n-1] is g(n-1)")
    decomposition = ((n - 1) * (n - 2) + n**2) + 3 * n * (Cs(e, 2) - S) + (n - 1 - e) * ((3 * n - 4) * e + (n - 1) ** 2 + 3) / 2
    c.expect(sp.expand(Q2 - decomposition) == 0,
             "(5.3)  Q_2 = [(n-1)(n-2) + n^2] + 3n (C(e,2) - S) + (n-1-e)((3n-4)e + (n-1)^2 + 3)/2")

    ok = all(g_int(k, ee) >= g_int(k, k - 1) == star_q2(k) >= 1 for k in range(1, 61) for ee in range(0, k))
    c.expect(ok, "numeric: g(e) >= g(n-1) = (n-1)(n-2)+n^2 >= 1 for all integers 1 <= n <= 60, 0 <= e <= n-1")
    ok = all(g_int(k, ee + 1) - 2 * g_int(k, ee) + g_int(k, ee - 1) == 4 - 3 * k for k in range(2, 61) for ee in range(1, k - 1))
    c.expect(ok, "numeric: second difference of g in e equals 2(2 - 3n/2) = 4 - 3n < 0 (n >= 2)")

    # the star K_{1,m}, n = m + 1: S = C(m,2) = C(e,2), e = n - 1
    Q2star = 2 * Cs(m, 2) ** 2 + (m + 1) ** 2 - 3 * (m + 1) * Cs(m, 3)
    c.expect(sp.expand(Q2star - (m * (m - 1) + (m + 1) ** 2)) == 0,
             "Q_2(K_{1,m}) = 2 C(m,2)^2 + (m+1)^2 - 3 (m+1) C(m,3) = m(m-1) + (m+1)^2 = (n-1)(n-2) + n^2")
    margin = ((n - 1) * (n - 2) + n**2) / (n * Cs(n - 1, 2))
    c.expect(sp.simplify(margin - (2 / n + 2 * n / ((n - 1) * (n - 2)))) == 0,
             "star margin Q_2/(p_1 p_2) = 2/n + 2n/((n-1)(n-2))")
    c.expect(sp.limit(margin, n, sp.oo) == 0, "star margin -> 0 as n -> oo (ISO_2 asymptotically tight)")
    rr = sp.symbols("r")
    xb, yb = (m - rr + 1) / rr, (m - rr) / (rr + 1)  # consecutive ratios of binomial coefficients C(m, .)
    c.expect(sp.simplify(rr * xb + 1 / xb - (rr + 1) * yb - (1 + rr / (m - rr + 1))) == 0,
             "for the pure binomial sequence (1+x)^m the margin is 1 + r/(m-r+1) > 1 at every r")
    ok = True
    for k in range(2, 41):
        p = indpoly_forest(*star(k))
        ok &= Q(p, 2) == star_q2(k)
        if k >= 3:
            ok &= Fraction(Q(p, 2), p[1] * p[2]) == Fraction(2, k) + Fraction(2 * k, (k - 1) * (k - 2))
    c.expect(ok, "library stars n <= 40: Q_2 = (n-1)(n-2)+n^2 and margin = 2/n + 2n/((n-1)(n-2)) exactly")

    # all forests n <= 12: Q_2 >= g(e) >= star value, equality exactly once per order (the star)
    cache: Dict[int, list] = {}
    bad = 0
    for k in range(1, 13):
        cnt = n_eq = 0
        for sizes, _idxs, p in forest_polys(k, cache):
            cnt += 1
            ee = k - len(sizes)
            q2 = Q(p, 2)
            if q2 < g_int(k, ee) or q2 < star_q2(k):
                bad += 1
            if q2 == star_q2(k):
                n_eq += 1
        if cnt != A005195[k] or n_eq != 1:
            bad += 1
    c.expect(bad == 0, "all non-isomorphic forests n <= 12: Q_2 >= g(e) >= (n-1)(n-2)+n^2, equality exactly once per n (the star)")

    c.expect(Q([1, 1], 2) == 1 and g_int(1, 0) == 1, "n = 1: Q_2 = p_1^2 = 1 = g(0)")
    c.expect(Q([1, 2, 1], 2) == 6 == g_int(2, 0) and Q([1, 2], 2) == 4 == g_int(2, 1),
             "n = 2: Q_2(2K_1) = 6 = g(0), Q_2(K_2) = 4 = g(1)")
    c.expect(no_floats(Q2, g, ge, chord, decomposition, Q2star, margin), "no floating point atoms")


# --------------------------------------------------------------------------
# [6] WR_1, WR_2
# --------------------------------------------------------------------------


def check_wr(c: Check) -> None:
    n, e = sp.symbols("n e")
    slack2 = 2 * (Cs(n, 2) - e) - n  # 2 p_2 - p_1
    c.expect(sp.expand(slack2 - (n * (n - 1) - 2 * e - n)) == 0, "2 p_2 - p_1 = n(n-1) - 2e - n")
    c.expect(sp.expand(slack2.subs(e, n - 1) - ((n - 1) * (n - 2) - n)) == 0
             and sp.expand((n - 1) * (n - 2) - n - ((n - 2) ** 2 - 2)) == 0,
             "at e = n-1: (n-1)(n-2) - n = (n-2)^2 - 2  (>= 2 for n >= 4)")
    ok = all(k * (k - 1) - 2 * ee - k >= (k - 2) ** 2 - 2 >= 2 for k in range(4, 400) for ee in range(0, k))
    c.expect(ok, "numeric: 2 p_2 - p_1 >= (n-2)^2 - 2 >= 2 for 4 <= n < 400, 0 <= e <= n-1")
    c.expect(tail_cutoff(1) == 1 and tail_cutoff(2) == 1 and tail_cutoff(3) == 2,
             "L(1) = L(2) = 1, L(3) = 2: for alpha <= 3 the prefix 1..L-1 never contains r = 2")
    p3 = indpoly_forest(*path(3))
    rep = analyze(p3)
    c.expect(p3 == [1, 3, 1] and wr_slack(p3, 2) == -1 and rep["L"] == 1 and rep["wr_failures_prefix"] == [],
             "P_3: WR_2 fails (3 > 2*1) but alpha = 2, L = 1, so WR_2 is not required")

    cache: Dict[int, list] = {}
    bad = 0
    for k in range(1, 13):
        for _sizes, _idxs, p in forest_polys(k, cache):
            a = len(p) - 1
            if wr_slack(p, 1) < 0:
                bad += 1
            if k >= 4 and a >= 2 and wr_slack(p, 2) < 0:
                bad += 1
            if k <= 3 and tail_cutoff(a) - 1 >= 2:
                bad += 1
    c.expect(bad == 0, "all forests n <= 12: WR_1 holds; WR_2 holds for n >= 4; for n <= 3 the prefix excludes r = 2")
    c.expect(no_floats(slack2), "no floating point atoms")


# --------------------------------------------------------------------------
# [7] Newton's inequalities => ISO for real-rooted polynomials
# --------------------------------------------------------------------------


def check_newton(c: Check) -> None:
    a, r = sp.symbols("a r", integer=True, positive=True)
    ratio = sp.binomial(a, r) ** 2 / (sp.binomial(a, r - 1) * sp.binomial(a, r + 1))
    target = (1 + 1 / r) * (1 + 1 / (a - r))
    c.expect(sp.simplify(sp.gammasimp(ratio) - target) == 0,
             "C(a,r)^2 / (C(a,r-1) C(a,r+1)) = (1 + 1/r)(1 + 1/(a-r))  (symbolic)")
    ok = all(Fraction(comb(A, R) ** 2, comb(A, R - 1) * comb(A, R + 1)) == (1 + Fraction(1, R)) * (1 + Fraction(1, A - R))
             for A in range(2, 41) for R in range(1, A))
    c.expect(ok, "... and exactly for all 2 <= a <= 40, 1 <= r <= a-1")
    c.expect(sp.simplify(target - 1 - (a + 1) / (r * (a - r))) == 0, "(1 + 1/r)(1 + 1/(a-r)) - 1 = (a+1)/(r(a-r))")
    c.expect(sp.simplify((a + 1) / (a - r) - 1 - (r + 1) / (a - r)) == 0, "(a+1)/(a-r) - 1 = (r+1)/(a-r) > 0")

    A_, B_, C_ = sp.symbols("A B C")  # p_{r-1}, p_r, p_{r+1}
    Qr = r * B_**2 + A_**2 - (r + 1) * A_ * C_
    D = B_**2 - A_ * C_ * target  # Newton defect, >= 0 for real-rooted polynomials of degree a
    c.expect(sp.simplify(Qr - (A_**2 + r * D + A_ * C_ * (r + 1) / (a - r))) == 0,
             "(7.4)  Q_r = p_{r-1}^2 + r D + p_{r-1} p_{r+1} (r+1)/(a-r),  D = p_r^2 - p_{r-1}p_{r+1}(1+1/r)(1+1/(a-r))")
    c.expect(sp.expand(Qr - (r * (B_**2 - A_ * C_) + A_ * (A_ - C_))) == 0,
             "(7.3)  Q_r = r (p_r^2 - p_{r-1}p_{r+1}) + p_{r-1}(p_{r-1} - p_{r+1})")

    x = sp.symbols("x")
    ok = True
    for k in range(1, 13):
        p = indpoly_forest(*path(k))
        poly = sp.Poly(list(reversed(p)), x)
        ok &= len(poly.real_roots()) == poly.degree()  # exact root isolation, with multiplicity
        alpha = len(p) - 1
        for rr in range(1, alpha):
            Er = Fraction(p[rr], comb(alpha, rr))
            ok &= Er * Er >= Fraction(p[rr - 1], comb(alpha, rr - 1)) * Fraction(p[rr + 1], comb(alpha, rr + 1))
    c.expect(ok, "paths P_n, n <= 12: I(P_n; x) is real-rooted (exact) and Newton's inequalities hold exactly")
    ok = True
    for k in range(1, 61):
        p = indpoly_forest(*path(k))
        ok &= all(iso_value(p, rr) >= p[rr - 1] ** 2 > 0 for rr in range(1, len(p) - 1))
    c.expect(ok, "paths P_n, n <= 60: Q_r >= p_{r-1}^2 > 0 at every index 1 <= r <= alpha-1 (as Theorem 7.1 predicts)")

    star3 = (1 + x) ** 3 + x
    c.expect(sp.expand(star3 - sp.Poly(list(reversed(indpoly_forest(*star(4)))), x).as_expr()) == 0,
             "I(K_{1,3}; x) = (1+x)^3 + x = x^3 + 3x^2 + 4x + 1")
    c.expect(sp.discriminant(star3, x) == -31, "disc((1+x)^3 + x) = -31 < 0")
    c.expect(len(sp.Poly(star3, x).real_roots()) == 1, "(1+x)^3 + x has exactly one real root: K_{1,3} is not real-rooted")
    star2 = (1 + x) ** 2 + x
    c.expect(sp.expand(star2 - (x**2 + 3 * x + 1)) == 0 and sp.discriminant(star2, x) == 5
             and len(sp.Poly(star2, x).real_roots()) == 2,
             "K_{1,2} = P_3 (claw-free): (1+x)^2 + x = x^2 + 3x + 1 has discriminant 5 > 0, two real roots")
    counts = {mm: len(sp.Poly((1 + x) ** mm + x, x).real_roots()) for mm in range(3, 11)}
    c.expect(all(counts[mm] == (1 if mm % 2 else 2) < mm for mm in counts),
             f"(1+x)^m + x has {sorted(counts.items())} real roots for m = 3..10: never real-rooted")
    ok = True
    for k in range(3, 61):
        p = indpoly_forest(*star(k))
        ok &= all(iso_value(p, rr) > 0 for rr in range(1, len(p) - 1))
    c.expect(ok, "stars K_{1,n-1}, n <= 60, nevertheless satisfy ISO_r at every index (Prop. 7.4)")
    c.expect(no_floats(ratio, target, Qr, D, star3), "no floating point atoms")


# --------------------------------------------------------------------------
# [8] all trees with n <= 14
# --------------------------------------------------------------------------


def check_trees_up_to_14(c: Check) -> None:
    total = triggered = 0
    bad_count = bad_red = bad_q1 = bad_q2 = bad_frame = 0
    n_eq_star = 0
    for n in range(1, 15):
        cnt = 0
        for layout in free_tree_layouts(n):
            cnt += 1
            parent = layout_to_parent(layout)
            p = indpoly_parent_array(parent)
            alpha = len(p) - 1
            e = n - 1
            for r in range(1, alpha):
                if p[r - 1] > 0 and wr_slack(p, r) >= 0 and iso_value(p, r) >= 0 and p[r] <= p[r - 1]:
                    triggered += 1
                    if p[r + 1] > p[r]:
                        bad_red += 1
            if Q(p, 1) != n + 1 + 2 * e:
                bad_q1 += 1
            S = sum(comb(d, 2) for d in parent_degrees(parent))
            q2 = Q(p, 2)
            if q2 != 2 * (comb(n, 2) - e) ** 2 + n * n - 3 * n * (comb(n, 3) - e * (n - 2) + S) or q2 < g_int(n, e):
                bad_q2 += 1
            if q2 == star_q2(n):
                n_eq_star += 1
            rep = analyze(p)  # raises AssertionError if WR+ISO+TAIL held but p were not unimodal
            if not (rep["unimodal"] and rep["wr_iso_tail_hypotheses_hold"]):
                bad_frame += 1
        if cnt != A000055[n]:
            bad_count += 1
        total += cnt
    c.expect(bad_count == 0 and total == sum(A000055[1:15]), f"enumerated {total} non-isomorphic trees, n <= 14 (OEIS A000055 counts match)")
    c.expect(bad_red == 0 and triggered > 0,
             f"reduction lemma conclusion never fails: {triggered} instances of WR_r & ISO_r & p_r <= p_(r-1), 0 with p_(r+1) > p_r")
    c.expect(bad_q1 == 0, "Q_1 = n + 1 + 2e exactly for every tree n <= 14")
    c.expect(bad_q2 == 0, "Q_2 = 2(C(n,2)-e)^2 + n^2 - 3n(C(n,3) - e(n-2) + S) exactly and Q_2 >= g(e) for every tree n <= 14")
    c.expect(n_eq_star == 14, "Q_2 = (n-1)(n-2) + n^2 for exactly one tree per order (the star)")
    c.expect(bad_frame == 0, "checks.analyze: WR+ISO(1..L-1)+TAIL hold and p is unimodal for every tree n <= 14 (consistency only)")


# --------------------------------------------------------------------------
# [9] scope of the tail theorem
# --------------------------------------------------------------------------


def check_tail_scope(c: Check) -> None:
    two_triangles = (6, [(0, 1), (1, 2), (0, 2), (3, 4), (4, 5), (3, 5)])
    p = indpoly_bruteforce(*two_triangles)
    c.expect(p == [1, 6, 9], "I(2K_3; x) = (1 + 3x)^2 = 1 + 6x + 9x^2 (brute force)")
    a = len(p) - 1
    c.expect(a == 2 and tail_cutoff(a) == 1 and p[1] < p[2],
             "2K_3: alpha = 2, L = 1, p_1 = 6 < 9 = p_2: TAIL fails, so the tail theorem is NOT valid for all graphs")
    m, al = sp.symbols("m alpha", positive=True)
    c.expect(sp.simplify(sp.binomial(al, al) * m**al / (sp.binomial(al, al - 1) * m ** (al - 1)) - m / al) == 0,
             "alpha K_m: s_alpha / s_(alpha-1) = m/alpha > 1 whenever m > alpha (general counterexample family)")
    cache: Dict[int, list] = {}
    bad = total = 0
    for k in range(1, 13):
        for _sizes, _idxs, p in forest_polys(k, cache):
            total += 1
            a = len(p) - 1
            if any(p[r] < p[r + 1] for r in range(tail_cutoff(a), a)):
                bad += 1
    c.expect(bad == 0, f"TAIL holds for all {total} non-isomorphic forests n <= 12 (consistent with Levit-Mandrescu for bipartite graphs)")


# --------------------------------------------------------------------------
# [10] p_4 and the crude ISO_3 bound (for the 'not proved' section)
# --------------------------------------------------------------------------


def check_crude_iso3_bound(c: Check) -> None:
    m = sp.symbols("m")
    true_q3 = 3 * Cs(m, 3) ** 2 + Cs(m, 2) ** 2 - 4 * Cs(m, 2) * Cs(m, 4)
    crude_q3 = 3 * Cs(m, 3) ** 2 + Cs(m, 2) ** 2 - 4 * Cs(m, 2) * (Cs(m, 4) + Cs(m, 3))  # p_4 <= U_4 = p_4 + T + P
    c.expect(sp.expand(true_q3 - Cs(m, 2) * Cs(m + 1, 3)) == 0, "Q_3(K_{1,m}) = C(m,2) C(m+1,3) > 0")
    c.expect(sp.expand(crude_q3 - Cs(m, 2) * m * (m - 1) * (3 - m) / 2) == 0,
             "crude bound 3p_3^2 + p_2^2 - 4 p_2 U_4 on K_{1,m} equals C(m,2) m(m-1)(3-m)/2 < 0 for m >= 4")
    ok = True
    for mm in range(3, 41):
        n = mm + 1
        p = indpoly_forest(*star(n))
        e, S, T, P = forest_invariants(*star(n))
        U4 = comb(n, 4) - e * comb(n - 2, 2) + (n - 3) * S + (comb(e, 2) - S)  # drops T and P
        ok &= coef(p, 4) == U4 - T - P and T == comb(mm, 3) and P == 0
        ok &= Q(p, 3) == comb(mm, 2) * comb(mm + 1, 3) > 0
        crude = 3 * coef(p, 3) ** 2 + coef(p, 2) ** 2 - 4 * coef(p, 2) * U4
        ok &= (crude < 0) == (mm >= 4) and crude == comb(mm, 2) * mm * (mm - 1) * (3 - mm) // 2
    c.expect(ok, "stars 3 <= m <= 40: p_4 formula exact, Q_3 > 0, but the crude lower bound is negative for every m >= 4")
    c.expect(no_floats(true_q3, crude_q3), "no floating point atoms")


# --------------------------------------------------------------------------
# driver
# --------------------------------------------------------------------------

CHECKS: List[Tuple[str, str, Callable[[Check], None]]] = [
    ("1", "Reduction lemma: identities (1.1)/(1.2), ratio form, brute force", check_reduction_lemma),
    ("2", "Conditional unimodality theorem: L(alpha) bookkeeping, finite-domain check", check_unimodality_theorem),
    ("3", "Exact formulas for p_0..p_3 (and p_4) vs erdos993lib.indpoly", check_coefficient_formulas),
    ("4", "ISO_1 for every forest: Q_1 = n + 1 + 2e", check_iso1),
    ("5", "ISO_2 for every forest: Q_2 >= g(e) > 0, concavity, endpoints, star extremal", check_iso2),
    ("6", "WR_1 and WR_2 wherever the framework needs them", check_wr),
    ("7", "Newton => ISO_r for real-rooted I(F;x); paths; stars not real-rooted", check_newton),
    ("8", "All trees n <= 14: reduction lemma never fails; Q_1, Q_2 formulas exact", check_trees_up_to_14),
    ("9", "Scope of TAIL: fails for 2K_3, holds for all forests n <= 12", check_tail_scope),
    ("10", "p_4 formula and failure of the crude ISO_3 bound on stars", check_crude_iso3_bound),
]


def run_check(item: str, title: str, fn: Callable[[Check], None]) -> Check:
    c = Check(item, title)
    try:
        fn(c)
    except Exception as ex:  # a crash is a failure, never a silent pass
        c.expect(False, f"exception: {ex!r}")
    return c


def run_all(verbose: bool = True) -> bool:
    all_ok = True
    for item, title, fn in CHECKS:
        c = run_check(item, title, fn)
        n_ok = sum(1 for ok, _ in c.results if ok)
        print(f"{'PASS' if c.ok else 'FAIL'} [{item}] {title}  ({n_ok}/{len(c.results)} sub-checks)", flush=True)
        for ok, msg in c.results:
            if verbose or not ok:
                print(f"       {'ok  ' if ok else 'FAIL'} {msg}")
        all_ok &= c.ok
    print("ALL CHECKS PASSED" if all_ok else "SOME CHECKS FAILED")
    return all_ok


def main(argv: Sequence[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("-q", "--quiet", action="store_true", help="print only the PASS/FAIL line per item (and failures)")
    args = ap.parse_args(argv)
    return 0 if run_all(verbose=not args.quiet) else 1


if __name__ == "__main__":
    raise SystemExit(main())
