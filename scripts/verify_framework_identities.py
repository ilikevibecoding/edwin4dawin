#!/usr/bin/env python3.12
"""Exact audit of the WR+ISO+TAIL framework identities for Erdős Problem #993.

Everything is exact: sympy for polynomial identities in symbolic coefficients,
Python integers for independence polynomials of concrete forests (networkx is
used only to generate forests).

Checks (numbering follows TASK B of the 2026-09-02 audit brief):

  (1) descent-propagation lemma (Skeleton §3), boundary cases, minimal
      hypothesis set, necessity of WR and of ISO;
  (2) bridge identity (B)  ISO_r = S_r/2 + p_{r-1}^2 + p_{r-1} p_r / 2;
  (3) first-leaf identity (1)-(2) on >= 200 random forests, all leaves, all r;
  (4) the four-minor coefficient N_r (Skeleton §5) reconstructed as the
      second-leaf remainder D_r(F,a) - D_r(F-b,a) - D_{r-1}(F-{b,v},a) and
      compared with the printed coefficient formula, plus identity (C);
  (5) rank two: ISO_2 in terms of n, edges, wedges; an elementary proof that
      ISO_2 > 0 for every forest.

Additional cheap sanity checks: TAIL / WR / ISO / S_r on all trees with
n <= TREE_MAX vertices (exhaustive, nonisomorphic), on the two 26-vertex
Kadrawi--Levit non-log-concave trees, and a random-graph search showing that
neither WR nor ISO_2 is a general-graph fact.

Writes /workspace/reports/framework_identities_20260902.json.
Uses one core.  Runtime about one to two minutes.
"""

from __future__ import annotations

import itertools
import json
import math
import os
import random
import sys
import time
from typing import Dict, List, Sequence, Tuple

import networkx as nx
import sympy as sp

REPORT = "/workspace/reports/framework_identities_20260902.json"
SEED = 20260902
TREE_MAX = 16          # exhaustive nonisomorphic trees up to this order
N_RANDOM_FORESTS = 240  # for checks (3), (4), (5)

Poly = List[int]

# --------------------------------------------------------------------------
# exact polynomial helpers
# --------------------------------------------------------------------------


def c(p: Sequence[int], k: int) -> int:
    """Coefficient with the convention p_k = 0 outside the support."""
    return p[k] if 0 <= k < len(p) else 0


def padd(a: Poly, b: Poly) -> Poly:
    n = max(len(a), len(b))
    return [c(a, i) + c(b, i) for i in range(n)]


def pmul(a: Poly, b: Poly) -> Poly:
    out = [0] * (len(a) + len(b) - 1)
    for i, ai in enumerate(a):
        if ai:
            for j, bj in enumerate(b):
                out[i + j] += ai * bj
    return out


def pshift(a: Poly) -> Poly:
    return [0] + list(a)


def trim(a: Poly) -> Poly:
    a = list(a)
    while len(a) > 1 and a[-1] == 0:
        a.pop()
    return a


def L_of(alpha: int) -> int:
    """L(alpha) = ceil((2 alpha - 1)/3)."""
    return -((-(2 * alpha - 1)) // 3)


def Q(p: Sequence[int], r: int) -> int:
    """ISO quantity Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1}."""
    return r * c(p, r) ** 2 + c(p, r - 1) ** 2 - (r + 1) * c(p, r - 1) * c(p, r + 1)


def S(p: Sequence[int], r: int) -> int:
    """Stronger reserve S_r = 2r p_r^2 - p_{r-1} p_r - 2(r+1) p_{r-1} p_{r+1}."""
    return 2 * r * c(p, r) ** 2 - c(p, r - 1) * c(p, r) - 2 * (r + 1) * c(p, r - 1) * c(p, r + 1)


def D(a: Sequence[int], cc: Sequence[int], r: int) -> int:
    """First-leaf remainder (2) with A=I(F-l), C=I(F-{l,v}), I(F)=A+xC."""
    return (c(cc, r - 1) ** 2
            + 2 * r * c(a, r) * c(cc, r - 1)
            + 2 * c(a, r - 1) * c(cc, r - 2)
            - (r + 1) * c(a, r - 1) * c(cc, r)
            - (r + 1) * c(cc, r - 2) * c(a, r + 1)
            - c(cc, r - 2) * c(cc, r))


def N_formula(E, U, V, W, r: int) -> int:
    """Printed coefficient formula for N_r(B;u,v) (Skeleton §5)."""
    return (2 * r * c(E, r) * c(W, r - 2)
            - (r + 1) * c(E, r + 1) * c(W, r - 3)
            + c(E, r - 1) * (2 * c(W, r - 3) - (r + 1) * c(W, r - 1))
            + c(U, r) * (-(r + 1) * c(V, r - 2) - c(W, r - 3))
            + c(U, r - 1) * (2 * r * c(V, r - 1) + 2 * c(W, r - 2))
            + c(U, r - 2) * (-(r + 1) * c(V, r) + 2 * c(V, r - 2) - c(W, r - 1))
            - c(V, r) * c(W, r - 3) + 2 * c(V, r - 1) * c(W, r - 2) - c(V, r - 2) * c(W, r - 1))


def N_def(E, U, V, W, r: int) -> int:
    """Reconstructed definition: second-leaf remainder of the first-leaf remainder.

    F = B + leaf a at u + leaf b at v.  With A=I(F-a)=E+xV, C=I(F-{a,u})=U+xW,
      D_r(F,a) = D_r(F-b,a) + D_{r-1}(F-{b,v},a) + N_r(B;u,v),
    where I(F-b-a)=E, I(F-b-a-u)=U, I(F-{b,v}-a)=V, I(F-{b,v}-a-u)=W.
    """
    A = padd(E, pshift(V))
    C = padd(U, pshift(W))
    return D(A, C, r) - D(E, U, r) - D(V, W, r - 1)


# --------------------------------------------------------------------------
# exact independence polynomials of forests (tree DP, product over components)
# --------------------------------------------------------------------------


def indep_poly(G: nx.Graph) -> Poly:
    if G.number_of_nodes() == 0:
        return [1]
    total = [1]
    for comp in nx.connected_components(G):
        T = G.subgraph(comp)
        root = next(iter(comp))
        order = list(nx.dfs_preorder_nodes(T, root))
        parent = dict(nx.dfs_predecessors(T, root))
        inc: Dict[int, Poly] = {}
        exc: Dict[int, Poly] = {}
        for v in reversed(order):
            pin, pex = [0, 1], [1]
            for w in T.neighbors(v):
                if parent.get(w) == v:
                    pin = pmul(pin, exc[w])
                    pex = pmul(pex, padd(inc[w], exc[w]))
            inc[v], exc[v] = pin, pex
        total = pmul(total, padd(inc[root], exc[root]))
    return trim(total)


def indep_poly_bruteforce(G: nx.Graph) -> Poly:
    nodes = list(G.nodes())
    p = [0] * (len(nodes) + 1)
    for mask in range(1 << len(nodes)):
        sel = [nodes[i] for i in range(len(nodes)) if mask >> i & 1]
        if all(not G.has_edge(a, b) for a, b in itertools.combinations(sel, 2)):
            p[len(sel)] += 1
    return trim(p)


def random_forest(rng: random.Random, n_min=2, n_max=18) -> nx.Graph:
    n = rng.randint(n_min, n_max)
    G = nx.Graph()
    remaining, offset = n, 0
    while remaining > 0:
        k = rng.randint(1, remaining) if rng.random() < 0.5 else remaining
        T = nx.random_labeled_tree(k, seed=rng.randint(0, 2**31 - 1)) if k > 1 else nx.empty_graph(1)
        G = nx.union(G, nx.relabel_nodes(T, {v: v + offset for v in T.nodes()}))
        offset += k
        remaining -= k
    return G


def leaves_and_supports(G: nx.Graph) -> List[Tuple[int, int]]:
    return [(v, next(iter(G.neighbors(v)))) for v in G.nodes() if G.degree(v) == 1]


def is_unimodal(p: Sequence[int]) -> bool:
    i = 0
    while i + 1 < len(p) and p[i] <= p[i + 1]:
        i += 1
    while i + 1 < len(p) and p[i] >= p[i + 1]:
        i += 1
    return i + 1 >= len(p)


# --------------------------------------------------------------------------
# (1) descent-propagation lemma
# --------------------------------------------------------------------------


def check_lemma() -> dict:
    out: dict = {}
    r, x, y = sp.symbols("r x y", positive=True)
    expr = r * x + 1 / x - (r + 1)
    fact = (x - 1) * (r * x - 1) / x
    out["factorisation_rx_plus_1_over_x_minus_r_plus_1"] = str(sp.factor(expr))
    out["factorisation_exact"] = sp.simplify(expr - fact) == 0
    # Sign on the closed interval [1/r, 1]: x-1 <= 0 and r x - 1 >= 0.
    # Strictly negative on the open interval, zero exactly at x=1 and at x=1/r.
    out["zeros_of_factorisation"] = [str(z) for z in sp.solve(sp.Eq(expr, 0), x)]
    # If x < 1/r the expression is positive (so WR cannot be dropped):
    out["value_at_x_equal_1_over_2r_for_r_2"] = str(sp.nsimplify(expr.subs({r: 2, x: sp.Rational(1, 4)})))

    # Exact integer brute force of the implication and of the necessity of each
    # hypothesis.  Triples (p_{r-1}, p_r, p_{r+1}) with all entries in 1..B.
    B = 40
    brute = {}
    for rr in range(2, 7):
        n_hyp = n_ok = 0
        tie_hyp = tie_ok = 0
        wr_needed = None
        iso_needed = None
        for a in range(1, B + 1):
            for b in range(1, B + 1):
                for d in range(0, B + 1):
                    iso = rr * b * b + a * a - (rr + 1) * a * d >= 0
                    wr = a <= rr * b
                    if a > b and wr and iso:
                        n_hyp += 1
                        n_ok += d <= b
                    if a == b and iso:
                        tie_hyp += 1
                        tie_ok += d <= b
                    if a > b and iso and not wr and d > b and wr_needed is None:
                        wr_needed = (a, b, d)
                    if a > b and wr and not iso and d > b and iso_needed is None:
                        iso_needed = (a, b, d)
        brute[str(rr)] = {
            "descent_WR_ISO_cases": n_hyp,
            "descent_WR_ISO_conclusion_holds": n_ok == n_hyp,
            "tie_ISO_cases": tie_hyp,
            "tie_ISO_conclusion_holds": tie_ok == tie_hyp,
            "witness_descent_ISO_noWR_ascent (p_{r-1},p_r,p_{r+1})": wr_needed,
            "witness_descent_WR_noISO_ascent (p_{r-1},p_r,p_{r+1})": iso_needed,
        }
    out["integer_bruteforce_box_1_to_40"] = brute

    # Formal statement of the minimal hypothesis set (verified below on trees).
    out["minimal_hypotheses"] = {
        "TAIL": "p_r >= p_{r+1} for all r >= L(alpha)  (Levit-Mandrescu; KE graphs)",
        "ISO": "Q_r >= 0 for every r with r0 <= r <= L(alpha)-1, where r0 is the first strict descent index (p_{r0-1} > p_{r0}); a fortiori for 2 <= r <= L(alpha)-1",
        "WR": "p_{r-1} <= r p_r needed ONLY at ranks r in [2, L(alpha)-1] where p_{r-1} > p_r strictly; ties (p_{r-1}=p_r) need ISO alone (x=1); r=1 is never a descent because p_0=1<=n=p_1",
        "p_{r+1}=0": "conclusion y<=1 trivial; also cannot occur for r+1 <= L(alpha) <= alpha",
        "empty_range": "for alpha <= 3, L(alpha) <= 2 and no prefix hypothesis is needed (TAIL plus p_0<=p_1 already give unimodality)",
    }
    out["L_equals_floor_2alpha_plus_1_over_3"] = all(L_of(a) == (2 * a + 1) // 3 for a in range(1, 400))
    out["L_le_alpha"] = all(L_of(a) <= a for a in range(1, 400))
    first_alpha = {rr: min(a for a in range(1, 200) if rr < L_of(a)) for rr in range(2, 16)}
    out["first_prefix_relevant_alpha_by_rank"] = {str(k): v for k, v in first_alpha.items()}
    out["first_prefix_relevant_alpha_equals_ceil_3r_plus_2_over_2"] = all(
        v == -((-(3 * k + 2)) // 2) for k, v in first_alpha.items())
    return out


def prefix_lemma_derivation(p: Sequence[int]) -> Tuple[bool, dict]:
    """Derive unimodality from TAIL + ISO + (WR at strict descents) only.

    Returns (derivation_succeeds, info).  Does not look at the sequence beyond
    what the hypotheses permit: after the first strict descent r0 < L it uses
    the lemma at r0..L-1 and TAIL from L on.
    """
    alpha = len(p) - 1
    L = L_of(alpha)
    tail_ok = all(p[r] >= p[r + 1] for r in range(L, alpha))
    if not tail_ok:
        return False, {"tail_fails": True}
    r0 = next((r for r in range(1, L) if p[r - 1] > p[r]), None)
    used_wr, used_iso = [], []
    if r0 is None:
        return True, {"first_descent": None, "lemma_invoked": False}
    for r in range(r0, L):
        # need p_{r+1} <= p_r from hypotheses at rank r
        if p[r - 1] > p[r]:
            if not p[r - 1] <= r * p[r]:
                return False, {"wr_fails_at": r}
            used_wr.append(r)
        if Q(p, r) < 0:
            return False, {"iso_fails_at": r}
        used_iso.append(r)
        # lemma conclusion (checked, not assumed)
        if not p[r + 1] <= p[r]:
            return False, {"lemma_conclusion_violated_at": r}
    return True, {"first_descent": r0, "lemma_invoked": True, "WR_used_at": used_wr, "ISO_used_at": used_iso}


# --------------------------------------------------------------------------
# (2) bridge identity
# --------------------------------------------------------------------------


def check_bridge() -> dict:
    r, pm, p0, pp = sp.symbols("r p_{r-1} p_r p_{r+1}")
    ISO = r * p0**2 + pm**2 - (r + 1) * pm * pp
    Sr = 2 * r * p0**2 - pm * p0 - 2 * (r + 1) * pm * pp
    rhs = Sr / 2 + pm**2 + pm * p0 / 2
    ok = sp.expand(ISO - rhs) == 0
    # S_r >= 0 implies ordered log-concavity r p_r^2 >= (r+1) p_{r-1} p_{r+1}
    olc_gap = sp.expand((r * p0**2 - (r + 1) * pm * pp) - Sr / 2)  # = pm*p0/2 >= 0
    # Relations with neighbouring inequalities in the literature:
    #   OLC_r (ordered log-concavity, Basit-Galvin):  r p_r^2 - (r+1) p_{r-1} p_{r+1} >= 0
    #   GSB_r (Reynolds' prefix GSB, reindexed k=r):  r p_r^2 + p_{r-1} p_r - (r+1) p_{r-1} p_{r+1} >= 0
    OLC = r * p0**2 - (r + 1) * pm * pp
    GSB = r * p0**2 + pm * p0 - (r + 1) * pm * pp
    rel = {
        "GSB - OLC": str(sp.expand(GSB - OLC)),                 # p_{r-1} p_r >= 0  => OLC implies GSB
        "ISO - GSB": str(sp.factor(sp.expand(ISO - GSB))),      # p_{r-1}(p_{r-1}-p_r): GSB => ISO at descents, ISO => GSB at ascents
        "OLC - S/2": str(sp.expand(OLC - Sr / 2)),              # p_{r-1} p_r / 2 >= 0 => S_r>=0 implies OLC
        "chain": "S_r>=0  =>  OLC_r  =>  GSB_r  =>  ISO_r whenever p_{r-1} >= p_r (the only case the prefix lemma uses)",
    }
    # 9K1 numeric example from the skeleton
    p9 = [math.comb(9, k) for k in range(10)]
    return {
        "identity_B_exact": bool(ok),
        "S_r_implies_ordered_LC_gap": str(olc_gap),
        "relations_to_OLC_and_GSB": rel,
        "9K1_p4_p5_p6": [p9[4], p9[5], p9[6]],
        "9K1_S5": S(p9, 5),
        "9K1_ISO5": Q(p9, 5),
        "9K1_matches_skeleton": S(p9, 5) == 15876 and Q(p9, 5) == 31752,
    }


# --------------------------------------------------------------------------
# (3) first-leaf identity
# --------------------------------------------------------------------------


def check_first_leaf(rng: random.Random) -> dict:
    r = sp.symbols("r")
    a = {k: sp.Symbol(f"a_{k}") for k in range(-3, 4)}
    cc = {k: sp.Symbol(f"c_{k}") for k in range(-3, 4)}
    # coefficients of A+xC around index r: p_{r+j} = a_{r+j} + c_{r+j-1}
    p = {j: a[j] + cc[j - 1] for j in range(-2, 3)}
    Qsym = lambda pol, rr: rr * pol[0] ** 2 + pol[-1] ** 2 - (rr + 1) * pol[-1] * pol[1]
    QA = r * a[0] ** 2 + a[-1] ** 2 - (r + 1) * a[-1] * a[1]
    QC = (r - 1) * cc[-1] ** 2 + cc[-2] ** 2 - r * cc[-2] * cc[0]
    Dsym = (cc[-1] ** 2 + 2 * r * a[0] * cc[-1] + 2 * a[-1] * cc[-2]
            - (r + 1) * a[-1] * cc[0] - (r + 1) * cc[-2] * a[1] - cc[-2] * cc[0])
    symbolic_ok = sp.expand(Qsym(p, r) - QA - QC - Dsym) == 0

    cells = fails = 0
    forests = 0
    dp_vs_brute_checked = 0
    while forests < N_RANDOM_FORESTS:
        G = random_forest(rng)
        if G.number_of_nodes() <= 12 and dp_vs_brute_checked < 40:
            assert indep_poly(G) == indep_poly_bruteforce(G)
            dp_vs_brute_checked += 1
        ls = leaves_and_supports(G)
        if not ls:
            continue
        forests += 1
        P = indep_poly(G)
        alpha = len(P) - 1
        for (l, v) in ls:
            A = indep_poly(G.subgraph(set(G.nodes()) - {l}))
            C = indep_poly(G.subgraph(set(G.nodes()) - {l, v}))
            assert padd(A, pshift(C)) == P or trim(padd(A, pshift(C))) == P
            for rr in range(0, alpha + 3):
                cells += 1
                if Q(P, rr) != Q(A, rr) + Q(C, rr - 1) + D(A, C, rr):
                    fails += 1
    # terminal claim D_r >= 0 for rooted star plus isolates (finite evidence)
    star_neg = 0
    star_cells = 0
    for m in range(1, 13):
        for t in range(0, 6):
            G = nx.star_graph(m)  # center 0, leaves 1..m
            G.add_nodes_from(range(m + 1, m + 1 + t))
            P = indep_poly(G)
            for (l, v) in leaves_and_supports(G):
                A = indep_poly(G.subgraph(set(G.nodes()) - {l}))
                C = indep_poly(G.subgraph(set(G.nodes()) - {l, v}))
                for rr in range(0, len(P) + 2):
                    star_cells += 1
                    star_neg += D(A, C, rr) < 0
                break  # all star leaves are equivalent
    return {
        "symbolic_identity_1_2_exact_in_r_and_coefficients": bool(symbolic_ok),
        "random_forests": forests,
        "leaf_rank_cells": cells,
        "failures": fails,
        "dp_vs_bruteforce_polynomials_checked": dp_vs_brute_checked,
        "star_plus_isolates_terminal_D_cells": star_cells,
        "star_plus_isolates_terminal_D_negative": star_neg,
    }


# --------------------------------------------------------------------------
# (4) four-minor coefficient N_r and identity (C)
# --------------------------------------------------------------------------


def check_N(rng: random.Random) -> dict:
    r = sp.symbols("r")
    idx = range(-4, 4)
    E = {k: sp.Symbol(f"E_{k}") for k in idx}
    U = {k: sp.Symbol(f"U_{k}") for k in idx}
    V = {k: sp.Symbol(f"V_{k}") for k in idx}
    W = {k: sp.Symbol(f"W_{k}") for k in idx}

    def Dsym(A, C, rr, shift=0):
        # A, C are dicts index->symbolic coefficient (relative offset from r)
        g = lambda dd, j: dd.get(j + shift, 0)
        return (g(C, -1) ** 2 + 2 * rr * g(A, 0) * g(C, -1) + 2 * g(A, -1) * g(C, -2)
                - (rr + 1) * g(A, -1) * g(C, 0) - (rr + 1) * g(C, -2) * g(A, 1) - g(C, -2) * g(C, 0))

    A = {j: E[j] + V[j - 1] for j in range(-3, 3)}
    C = {j: U[j] + W[j - 1] for j in range(-3, 3)}
    N_reconstructed = Dsym(A, C, r) - Dsym(E, U, r) - Dsym(V, W, r - 1, shift=-1)
    N_printed = (2 * r * E[0] * W[-2] - (r + 1) * E[1] * W[-3]
                 + E[-1] * (2 * W[-3] - (r + 1) * W[-1])
                 + U[0] * (-(r + 1) * V[-2] - W[-3])
                 + U[-1] * (2 * r * V[-1] + 2 * W[-2])
                 + U[-2] * (-(r + 1) * V[0] + 2 * V[-2] - W[-1])
                 - V[0] * W[-3] + 2 * V[-1] * W[-2] - V[-2] * W[-1])
    symbolic_ok = sp.expand(N_reconstructed - N_printed) == 0
    swapUV = {U[k]: V[k] for k in idx} | {V[k]: U[k] for k in idx}
    symmetric = sp.expand(N_printed - N_printed.subs(swapUV, simultaneous=True)) == 0

    cells = fails_formula = fails_C = fails_sym = 0
    forests = 0
    while forests < N_RANDOM_FORESTS:
        G = random_forest(rng, n_min=4)
        ls = leaves_and_supports(G)
        # nonsibling leaf pair: distinct supports and the leaves are not each
        # other's support (i.e. not a K_2 component)
        pairs = [((a, u), (b, v)) for (a, u), (b, v) in itertools.combinations(ls, 2)
                 if u != v and u != b and v != a]
        if not pairs:
            continue
        forests += 1
        P = indep_poly(G)
        alpha = len(P) - 1
        nodes = set(G.nodes())
        for (a, u), (b, v) in pairs[:6]:
            Bn = nodes - {a, b}
            Ep = indep_poly(G.subgraph(Bn))
            Up = indep_poly(G.subgraph(Bn - {u}))
            Vp = indep_poly(G.subgraph(Bn - {v}))
            Wp = indep_poly(G.subgraph(Bn - {u, v}))
            A = indep_poly(G.subgraph(nodes - {a}))
            Cc = indep_poly(G.subgraph(nodes - {a, u}))
            Fb_A = indep_poly(G.subgraph(nodes - {b, a}))          # = E
            Fb_C = indep_poly(G.subgraph(nodes - {b, a, u}))       # = U
            Fbv_A = indep_poly(G.subgraph(nodes - {b, v, a}))      # = V
            Fbv_C = indep_poly(G.subgraph(nodes - {b, v, a, u}))   # = W
            assert (trim(Fb_A), trim(Fb_C), trim(Fbv_A), trim(Fbv_C)) == (trim(Ep), trim(Up), trim(Vp), trim(Wp))
            Pp = padd(Up, pshift(Wp))  # P = U + xW = I(F-{a,u})
            assert trim(Pp) == trim(Cc)
            for rr in range(0, alpha + 3):
                cells += 1
                Nf = N_formula(Ep, Up, Vp, Wp, rr)
                # second-leaf recurrence for D (the reconstructed definition)
                lhs = D(A, Cc, rr)
                rhs = D(Ep, Up, rr) + D(Vp, Wp, rr - 1) + Nf
                fails_formula += lhs != rhs
                # identity (C): Q_r(F) = Q_r(F-a) + D_r(F-b,a) + N_r + C_{r-1}, C_k = Q_k(P) + D_k(V,W)
                Ck = Q(Pp, rr - 1) + D(Vp, Wp, rr - 1)
                fails_C += Q(P, rr) != Q(A, rr) + D(Ep, Up, rr) + Nf + Ck
                fails_sym += Nf != N_formula(Ep, Vp, Up, Wp, rr)
    return {
        "definition_used": "N_r(B;u,v) := D_r(F,a) - D_r(F-b,a) - D_{r-1}(F-{b,v},a), F = B + leaf a at u + leaf b at v (a,b nonsibling, u != v); equivalently N_r = D_r(E+xV,U+xW) - D_r(E,U) - D_{r-1}(V,W)",
        "symbolic_reconstruction_equals_printed_formula": bool(symbolic_ok),
        "printed_formula_symmetric_in_U_V": bool(symmetric),
        "random_forests_with_nonsibling_leaf_pairs": forests,
        "pair_rank_cells": cells,
        "second_leaf_D_recurrence_failures": fails_formula,
        "identity_C_failures": fails_C,
        "UV_symmetry_failures": fails_sym,
        "note": "The bivariate kernel N(z,w) whose diagonal is N_r is not reproduced here (its definition is not printed in the skeleton); the coefficient-level definition above is unambiguous and matches the printed formula exactly.",
    }


# --------------------------------------------------------------------------
# (5) rank two
# --------------------------------------------------------------------------


def check_rank2(rng: random.Random) -> dict:
    n, m, Sw, s, T = sp.symbols("n m S s T")
    p1 = n
    p2 = n * (n - 1) / 2 - m
    p3 = n * (n - 1) * (n - 2) / 6 - m * (n - 2) + Sw - T   # T = triangles (0 for forests)
    Q2 = sp.expand(2 * p2**2 + p1**2 - 3 * p1 * p3)
    Q2_forest = Q2.subs(T, 0)
    f = sp.expand(Q2_forest.subs(Sw, m * (m - 1) / 2))       # S at its maximum C(m,2)
    Q2_split = sp.expand(Q2_forest.subs(Sw, m * (m - 1) / 2 - s))
    slack_coeff = sp.expand(Q2_split - f)                      # should be 3 n s
    f_claimed = sp.Rational(1, 2) * (n**2 * (n + 1) + m * n * (2 * n - 5) - m**2 * (3 * n - 4))
    d2 = sp.diff(f, m, 2)
    f0 = sp.expand(f.subs(m, 0))
    f1 = sp.expand(f.subs(m, n - 1))
    # numeric confirmation of the subgraph-count formulas and positivity
    trees_checked = 0
    min_Q2 = None
    formula_fails = 0
    for k in range(N_RANDOM_FORESTS):
        G = random_forest(rng)
        P = indep_poly(G)
        nn, mm = G.number_of_nodes(), G.number_of_edges()
        wedges = sum(math.comb(d, 2) for _, d in G.degree())
        if c(P, 2) != math.comb(nn, 2) - mm or c(P, 3) != math.comb(nn, 3) - mm * (nn - 2) + wedges:
            formula_fails += 1
        q = Q(P, 2)
        min_Q2 = q if min_Q2 is None else min(min_Q2, q)
        trees_checked += 1
    return {
        "Q2_general_graph_in_n_m_wedges_triangles": str(Q2),
        "Q2_forest_in_n_m_S": str(Q2_forest),
        "f(n,m) = Q2 at S=C(m,2)": str(f),
        "f_matches_closed_form_(n^2(n+1)+m n(2n-5)-m^2(3n-4))/2": sp.expand(f - f_claimed) == 0,
        "Q2 - f = 3 n s  where s = C(m,2) - S >= 0": str(slack_coeff),
        "d2f/dm2": str(d2),
        "f(n,0)": str(f0),
        "f(n,n-1)": str(f1),
        "f(n,n-1)_equals_2n^2-3n+2": sp.expand(f1 - (2 * n**2 - 3 * n + 2)) == 0,
        "proof_sketch": "For a forest: m <= n-1 and S = sum_v C(deg v,2) <= C(m,2) (pairs of edges sharing a vertex are pairs of edges). Q2 = f(n,m) + 3n(C(m,2)-S) >= f(n,m). f is concave in m for n>=2 (second derivative 4-3n<0) with f(n,0)=n^2(n+1)/2>0 and f(n,n-1)=2n^2-3n+2>0, so f>0 on [0,n-1]. Hence ISO_2 > 0 for every forest (n=1 trivially). Triangles only increase Q2, so ISO_2 holds for every graph with at most n-1 edges.",
        "random_forests_checked": trees_checked,
        "p2_p3_subgraph_formula_failures": formula_fails,
        "min_Q2_over_random_forests": min_Q2,
    }


# --------------------------------------------------------------------------
# exhaustive small-tree sanity checks and general-graph counterexamples
# --------------------------------------------------------------------------


def check_trees() -> dict:
    stats = {
        "orders": f"1..{TREE_MAX}",
        "trees": 0,
        "non_unimodal": 0,
        "tail_failures": 0,
        "WR_failures_in_prefix_1_le_r_lt_L": 0,
        "WR_failures_anywhere": 0,
        "ISO_failures_in_prefix_2_le_r_lt_L": 0,
        "ISO_failures_anywhere": 0,
        "S_r_negative_at_certified_prefix_cells_3_le_r_le_8": 0,
        "S_r_negative_in_prefix_at_r_equal_2 (not claimed by the framework)": 0,
        "S_r_negative_in_prefix_any_rank": 0,
        "S_2_negative_prefix_example": None,
        "lemma_derivation_failures": 0,
        "trees_where_prefix_lemma_is_invoked": 0,
        "trees_where_first_descent_at_or_after_L": 0,
        "min_Q2": None,
        "WR_failure_example_outside_prefix": None,
    }
    for n in range(1, TREE_MAX + 1):
        for T in nx.nonisomorphic_trees(n) if n > 1 else [nx.empty_graph(1)]:
            P = indep_poly(T)
            alpha = len(P) - 1
            L = L_of(alpha)
            stats["trees"] += 1
            stats["non_unimodal"] += not is_unimodal(P)
            stats["tail_failures"] += any(P[r] < P[r + 1] for r in range(L, alpha))
            for r in range(1, alpha + 1):
                wr = P[r - 1] <= r * P[r]
                if not wr:
                    stats["WR_failures_anywhere"] += 1
                    if r < L:
                        stats["WR_failures_in_prefix_1_le_r_lt_L"] += 1
                    elif stats["WR_failure_example_outside_prefix"] is None:
                        stats["WR_failure_example_outside_prefix"] = {"n": n, "p": P, "r": r, "L": L}
            for r in range(1, alpha):
                if Q(P, r) < 0:
                    stats["ISO_failures_anywhere"] += 1
                    if 2 <= r < L:
                        stats["ISO_failures_in_prefix_2_le_r_lt_L"] += 1
                if 2 <= r < L and S(P, r) < 0:
                    stats["S_r_negative_in_prefix_any_rank"] += 1
                    if 3 <= r <= 8:
                        stats["S_r_negative_at_certified_prefix_cells_3_le_r_le_8"] += 1
                    if r == 2:
                        stats["S_r_negative_in_prefix_at_r_equal_2 (not claimed by the framework)"] += 1
                        if stats["S_2_negative_prefix_example"] is None:
                            stats["S_2_negative_prefix_example"] = {"tree": "star K_{1,4}" if n == 5 else f"n={n}", "p": P, "alpha": alpha, "L": L, "S_2": S(P, 2)}
            ok, info = prefix_lemma_derivation(P)
            stats["lemma_derivation_failures"] += not ok
            if info.get("lemma_invoked"):
                stats["trees_where_prefix_lemma_is_invoked"] += 1
            else:
                stats["trees_where_first_descent_at_or_after_L"] += 1
            q2 = Q(P, 2)
            stats["min_Q2"] = q2 if stats["min_Q2"] is None else min(stats["min_Q2"], q2)
    return stats


def build_T3(m: int, k: int, star: bool) -> nx.Graph:
    """Kadrawi--Levit T_{3,m,k} (star=False) / T*_{3,m,k} (star=True)."""
    G = nx.Graph()
    cnt = [0]

    def new():
        cnt[0] += 1
        G.add_node(cnt[0] - 1)
        return cnt[0] - 1

    v0 = new()
    for i, size in enumerate((3, m, k)):
        vi = new()
        G.add_edge(v0, vi)
        for j in range(size):
            vij = new()
            G.add_edge(vi, vij)
            vp = new()
            G.add_edge(vij, vp)
            if star and i == 0 and j == 2:
                x = new()
                G.add_edge(vp, x)
                y = new()
                G.add_edge(x, y)
    return G


def check_kadrawi_levit() -> dict:
    out = {}
    for name, G in (("T_{3,4,4}", build_T3(4, 4, False)), ("T*_{3,3,4}", build_T3(3, 4, True))):
        P = indep_poly(G)
        alpha = len(P) - 1
        L = L_of(alpha)
        lc_breaks = [k for k in range(1, alpha) if P[k] ** 2 < P[k - 1] * P[k + 1]]
        out[name] = {
            "n": G.number_of_nodes(),
            "alpha": alpha,
            "L": L,
            "unimodal": is_unimodal(P),
            "LC_breaks": lc_breaks,
            "ISO_negative_ranks": [r for r in range(1, alpha) if Q(P, r) < 0],
            "WR_failures_in_prefix": [r for r in range(1, L) if P[r - 1] > r * P[r]],
            "S_r_negative_in_prefix": [r for r in range(2, L) if S(P, r) < 0],
            "S_r_negative_anywhere": [r for r in range(1, alpha) if S(P, r) < 0],
            "first_descent": next((r for r in range(1, alpha + 1) if P[r - 1] > P[r]), None),
        }
    return out


def check_general_graphs(rng: random.Random) -> dict:
    """WR and ISO_2 are not general-graph facts."""
    # explicit: K_13 with the edges inside a 4-set removed (alpha = 4, L = 3)
    G = nx.complete_graph(13)
    G.remove_edges_from(itertools.combinations(range(4), 2))
    P = indep_poly_bruteforce(G)
    ex = {"graph": "K_13 minus the six edges of a K_4", "p": P, "alpha": len(P) - 1, "L": L_of(len(P) - 1),
          "WR_2_holds (p_1 <= 2 p_2)": P[1] <= 2 * P[2], "unimodal": is_unimodal(P)}
    # random search for ISO_2 < 0 on small graphs
    iso2_witness = None
    tried = 0
    for _ in range(3000):
        n = rng.randint(4, 11)
        G = nx.gnp_random_graph(n, rng.random(), seed=rng.randint(0, 2**31 - 1))
        P = indep_poly_bruteforce(G) if n <= 11 else None
        tried += 1
        if Q(P, 2) < 0:
            iso2_witness = {"n": n, "edges": sorted(map(list, G.edges())), "p": P, "Q2": Q(P, 2)}
            break
    # TAIL is also not a general-graph fact: 3 K_10 has p = (1,30,300,1000), alpha=3, L=2, p_2 < p_3.
    P3 = [math.comb(3, k) * 10**k for k in range(4)]  # I(3 K_10) = (1+10x)^3
    tail_ex = {"graph": "3 K_10 (three disjoint 10-cliques)", "p": P3, "alpha": 3, "L": L_of(3),
               "tail_holds_from_L": all(P3[r] >= P3[r + 1] for r in range(L_of(3), 3)),
               "note": "alpha < n/2, so Basit-Galvin Theorem 1.3 gives only l = ceil(3*29/32) = 3 = alpha; the KE/bipartite hypothesis is essential"}
    return {"WR_general_graph_counterexample": ex,
            "TAIL_general_graph_counterexample": tail_ex,
            "ISO_2_random_graph_search": {"graphs_tried": tried, "witness_Q2_negative": iso2_witness}}


# --------------------------------------------------------------------------


def main() -> int:
    t0 = time.time()
    rng = random.Random(SEED)
    report = {
        "date": "2026-09-02",
        "script": os.path.abspath(__file__),
        "seed": SEED,
        "versions": {"python": sys.version.split()[0], "sympy": sp.__version__, "networkx": nx.__version__},
    }
    report["1_descent_propagation_lemma"] = check_lemma()
    report["2_bridge_identity_B"] = check_bridge()
    report["3_first_leaf_identity_1_2"] = check_first_leaf(rng)
    report["4_four_minor_N_r"] = check_N(rng)
    report["5_rank_two_ISO_2"] = check_rank2(rng)
    report["6_exhaustive_trees"] = check_trees()
    report["7_kadrawi_levit_n26"] = check_kadrawi_levit()
    report["8_general_graphs"] = check_general_graphs(rng)

    verdicts = {
        "lemma_factorisation": report["1_descent_propagation_lemma"]["factorisation_exact"],
        "lemma_bruteforce": all(v["descent_WR_ISO_conclusion_holds"] and v["tie_ISO_conclusion_holds"]
                                for v in report["1_descent_propagation_lemma"]["integer_bruteforce_box_1_to_40"].values()),
        "bridge_B": report["2_bridge_identity_B"]["identity_B_exact"],
        "first_leaf_symbolic": report["3_first_leaf_identity_1_2"]["symbolic_identity_1_2_exact_in_r_and_coefficients"],
        "first_leaf_numeric": report["3_first_leaf_identity_1_2"]["failures"] == 0,
        "N_r_symbolic": report["4_four_minor_N_r"]["symbolic_reconstruction_equals_printed_formula"],
        "N_r_numeric_and_identity_C": report["4_four_minor_N_r"]["second_leaf_D_recurrence_failures"] == 0
        and report["4_four_minor_N_r"]["identity_C_failures"] == 0,
        "rank2_elementary_proof": report["5_rank_two_ISO_2"]["f_matches_closed_form_(n^2(n+1)+m n(2n-5)-m^2(3n-4))/2"]
        and report["5_rank_two_ISO_2"]["f(n,n-1)_equals_2n^2-3n+2"],
        "trees_all_hypotheses_hold": (report["6_exhaustive_trees"]["tail_failures"] == 0
                                      and report["6_exhaustive_trees"]["WR_failures_in_prefix_1_le_r_lt_L"] == 0
                                      and report["6_exhaustive_trees"]["ISO_failures_in_prefix_2_le_r_lt_L"] == 0
                                      and report["6_exhaustive_trees"]["lemma_derivation_failures"] == 0),
        "trees_no_S_r_negative_at_certified_ranks_3_to_8": report["6_exhaustive_trees"]["S_r_negative_at_certified_prefix_cells_3_le_r_le_8"] == 0,
        "kadrawi_levit_n26_ISO_WR_hold_in_prefix": all(not v["ISO_negative_ranks"] and not v["WR_failures_in_prefix"] and not v["S_r_negative_in_prefix"]
                                                      for v in report["7_kadrawi_levit_n26"].values()),
    }
    report["verdicts"] = verdicts
    report["all_pass"] = all(verdicts.values())
    report["elapsed_seconds"] = round(time.time() - t0, 1)
    os.makedirs(os.path.dirname(REPORT), exist_ok=True)
    with open(REPORT, "w") as fh:
        json.dump(report, fh, indent=1, default=str)
    print(json.dumps(verdicts, indent=1))
    print("all_pass:", report["all_pass"], " elapsed:", report["elapsed_seconds"], "s")
    print("report:", REPORT)
    return 0 if report["all_pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
