#!/usr/bin/env python3
"""
ISO_3 for forests via exact subgraph-count expansions.

Notation.  F a forest, n vertices, e edges, degrees d_v,
    S  = sum_v C(d_v,2)                      (pairs of edges sharing a vertex),
    M2 = C(e,2) - S                          (pairs of disjoint edges),
    T  = sum_v C(d_v,3)                      (claws K_{1,3} as subgraphs),
    P4 = sum_{vw in E} (d_v-1)(d_w-1)        (paths with 3 edges as subgraphs),
    p_k = number of independent k-sets (p_k := 0 for k > alpha).

PROVED HERE (verified exactly below, marker PASS_EXACT_ISO3_ALL_FORESTS):

  Lemma A (counting, inclusion-exclusion over edges; a forest has no cycles):
     p_2 = C(n,2) - e,
     p_3 = C(n,3) - e(n-2) + S,
     p_4 = C(n,4) - e C(n-2,2) + (n-3) S + M2 - P4 - T.
  Lemma B (expansion; sympy):  with  K = n(n-1)(n-6) + 2(n+2)e,  M = 4 p_2,
     Q_3 := 3 p_3^2 + p_2^2 - 4 p_2 p_4
          = n^2(n-1)^2(n+1)/12 + n(n-1)(n-2)(n-9)/6 * e - (n+1) e^2 + 2 e^3
            + 3 S^2 - (K S - M T) + M P4.
  Lemma C (structure):  p_2 >= (n-1)(n-2)/2 > 0 for n >= 3;  if e >= 1 then
     sum_{v : d_v >= 1} (d_v - 1) = 2e - n' = e - c' <= e - 1
     (n' non-isolated vertices, c' >= 1 non-trivial components, e = n' - c').
  Lemma D (per-vertex bound):  K S - M T = sum_v c(d_v),
     c(d) = K C(d,2) - M C(d,3) = (d-1) h(d),  h(d) = d(3K + 2M - M d)/6,
     h(d) <= phi(n,e) := (3K+2M)^2/(24M)  for all real d  (M > 0), hence
     K S - M T <= (e-1) phi(n,e)   whenever e >= 1.
  Lemma E (monotonicity):  for n >= 5, 3K + 2M = n(n-1)(3n-14) + (6n+4)e > 0
     increases with e and M decreases, so phi(n,e) <= phi(n,n-1)
     = C_n := (n-1)(n-2)(3n-2)^2/48  for 0 <= e <= n-1.
  THEOREM 2.  Every forest satisfies Q_3 >= 0.  More precisely, for n >= 14
     and 1 <= e <= n-1,
        Q_3 >= B_n(e) := n^2(n-1)^2(n+1)/12 + n(n-1)(n-2)(n-9)/6 * e
                         - (n+1) e^2 - (e-1) C_n  > 0,
     because B_n is concave in e with B_n(1) = (n^5+n^4-25n^3+59n^2-48n-12)/12
     > 0 and B_n(n-1) = (n-1) beta(n)/48, beta(n) = 3n^4-48n^3+92n^2-80n+32
     = 3n^3(n-16) + 92n^2 - 80n + 32 > 0 for n >= 14 (beta(14)=480,
     beta(15)=9407);  for e = 0, Q_3 = n^2(n-1)^2(n+1)/12 > 0;  and for
     n <= 13 all 6 606 forests are checked exhaustively (Q_3 >= 0, with
     Q_3 = 0 only for K_1 and K_2, where p_2 = 0).
  Consequently ISO_3 holds for every forest and every alpha; in particular
  whenever r = 3 is a prefix index (alpha >= 6).

EXPLORED (data only, no claim beyond n <= 16): minimizers of Q_3 and of the
ratio (3p_3^2+p_2^2)/(4p_2p_4) among forests with alpha >= 6, per order.

Exact arithmetic only (ints, Fractions, sympy rationals).  Deterministic.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time
from fractions import Fraction
from math import factorial

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from forest_indep import (  # noqa: E402
    L_cutoff,
    forests,
    indep_poly_tree,
    level_sequence_to_parent,
    parent_to_edges,
    tree_level_sequences,
    tree_polys_upto,
)

NMAX = 16                 # exhaustive data / verification range
N_EXHAUSTIVE_PROOF = 13   # the analytic bound is used for n >= N_ANALYTIC
N_ANALYTIC = 14
PASS_MARKER = "PASS_EXACT_ISO3_ALL_FORESTS"
RESULTS_PATH = os.path.join(HERE, "results", "iso2_iso3.json")


# ---------------------------------------------------------------------------
# exact helpers
# ---------------------------------------------------------------------------


def binom(a: int, k: int) -> int:
    """Polynomial binomial a(a-1)...(a-k+1)/k!, exact for every integer a."""
    r = 1
    for i in range(k):
        r *= a - i
    return r // factorial(k)


def pk(p, k: int) -> int:
    return p[k] if k < len(p) else 0


def forest_edges(comps, seqs):
    edges = []
    off = 0
    for k, i in comps:
        par = level_sequence_to_parent(seqs[k][i])
        edges.extend((off + a, off + b) for a, b in parent_to_edges(par))
        off += k
    return edges


def stats_from_edges(n: int, edges):
    """(deg, e, S, T, P4, n_nonisolated) computed directly from the edge list."""
    deg = [0] * n
    for a, b in edges:
        deg[a] += 1
        deg[b] += 1
    e = len(edges)
    S = sum(binom(x, 2) for x in deg)
    T = sum(binom(x, 3) for x in deg)
    P4 = sum((deg[a] - 1) * (deg[b] - 1) for a, b in edges)
    nn = sum(1 for x in deg if x > 0)
    return deg, e, S, T, P4, nn


def q3_reduced(n, e, S, T, P4):
    """Right-hand side of Lemma B as an exact Fraction."""
    K = n * (n - 1) * (n - 6) + 2 * (n + 2) * e
    M = 2 * n * (n - 1) - 4 * e
    return (Fraction(n * n * (n - 1) ** 2 * (n + 1), 12)
            + Fraction(n * (n - 1) * (n - 2) * (n - 9), 6) * e
            - (n + 1) * e * e + 2 * e**3 + 3 * S * S - (K * S - M * T) + M * P4)


def phi(n, e):
    K = n * (n - 1) * (n - 6) + 2 * (n + 2) * e
    M = 2 * n * (n - 1) - 4 * e
    return Fraction((3 * K + 2 * M) ** 2, 24 * M)


def C_n(n):
    return Fraction((n - 1) * (n - 2) * (3 * n - 2) ** 2, 48)


def B_bound(n, e):
    return (Fraction(n * n * (n - 1) ** 2 * (n + 1), 12)
            + Fraction(n * (n - 1) * (n - 2) * (n - 9), 6) * e
            - (n + 1) * e * e - (e - 1) * C_n(n))


def describe_tree(k, seq):
    """Human-readable name of a tree given by its level sequence."""
    edges = parent_to_edges(level_sequence_to_parent(seq))
    deg = [0] * k
    adj = [[] for _ in range(k)]
    for a, b in edges:
        deg[a] += 1
        deg[b] += 1
        adj[a].append(b)
        adj[b].append(a)
    degs = sorted(deg, reverse=True)
    if k == 1:
        name = "K_1"
    elif k == 2:
        name = "K_2"
    elif degs[0] == k - 1:
        name = "K_{1,%d}" % (k - 1)
    elif degs[0] <= 2:
        name = "P_%d" % k
    else:
        name = "tree"
        # T(a,b): a vertex m of degree 2 with neighbours u, w such that every
        # vertex other than m, u, w is a leaf (stars K_{1,a}, K_{1,b} whose
        # centres are joined to the common vertex m; a >= b >= 1).
        for mid in range(k):
            if deg[mid] != 2:
                continue
            u, w = adj[mid]
            if all(deg[x] == 1 for x in range(k) if x not in (mid, u, w)):
                a, b = sorted((deg[u] - 1, deg[w] - 1), reverse=True)
                name = ("T(%d,%d) subdivided double star (stars K_{1,%d}, K_{1,%d} whose centres "
                        "are joined to a common vertex)" % (a, b, a, b))
                break
        if name == "tree":
            # S(a,b): two adjacent vertices u, w, all other vertices leaves.
            for u, w in edges:
                if deg[u] >= 2 and deg[w] >= 2 and all(deg[x] == 1 for x in range(k) if x not in (u, w)):
                    a, b = sorted((deg[u] - 1, deg[w] - 1), reverse=True)
                    name = "S(%d,%d) double star (adjacent centres with %d and %d leaves)" % (a, b, a, b)
                    break
    return {"order": k, "level_sequence": list(seq), "degree_sequence": degs, "name": name}


def describe_forest(comps, seqs):
    return [dict(describe_tree(k, seqs[k][i]), index=i) for k, i in comps]


def short_name(comps, seqs):
    parts = []
    for k, i in comps:
        parts.append(describe_tree(k, seqs[k][i])["name"].split(" ")[0])
    # compress repeated K_1
    out = []
    for name in parts:
        if out and out[-1][0] == name:
            out[-1][1] += 1
        else:
            out.append([name, 1])
    return " + ".join(name if c == 1 else "%d%s" % (c, name) for name, c in out)


# ---------------------------------------------------------------------------
# symbolic certificate (sympy)
# ---------------------------------------------------------------------------


def symbolic_checks() -> dict:
    import sympy as sp

    n, e, S, M2, P4, T, d, m, a = sp.symbols("n e S M2 P4 T d m a")

    def Cb(x, k):
        return sp.expand(sp.prod([x - i for i in range(k)]) / sp.factorial(k))

    out = {}
    p2 = Cb(n, 2) - e
    p3 = Cb(n, 3) - e * (n - 2) + S
    p4_M2 = Cb(n, 4) - e * Cb(n - 2, 2) + S * (n - 3) + M2 - P4 - T
    Q3_M2 = sp.expand(3 * p3**2 + p2**2 - 4 * p2 * p4_M2)
    p4 = p4_M2.subs(M2, Cb(e, 2) - S)
    Q3 = sp.expand(3 * p3**2 + p2**2 - 4 * p2 * p4)
    K = n * (n - 1) * (n - 6) + 2 * (n + 2) * e
    M = 2 * n * (n - 1) - 4 * e
    const = n**2 * (n - 1) ** 2 * (n + 1) / 12
    E1 = n * (n - 1) * (n - 2) * (n - 9) / 6
    Q3_red = const + E1 * e - (n + 1) * e**2 + 2 * e**3 + 3 * S**2 - (K * S - M * T) + M * P4
    out["Q3_in_(n,e,S,M2,P4,T)"] = str(Q3_M2)
    Q3_M2_grouped = (const + n * (n - 1) * (n**2 - 11 * n + 12) / 6 * e + (n - 1) ** 2 * e**2
                     - (n * (n - 1) * (n - 4) + 2 * n * e) * S + 3 * S**2 - 4 * p2 * M2 + 4 * p2 * (P4 + T))
    out["Q3_M2_grouped_form"] = sp.expand(Q3_M2 - Q3_M2_grouped) == 0
    out["Q3_reduced_identity"] = sp.expand(Q3 - Q3_red) == 0
    out["Q3_M2_substitution_consistent"] = sp.expand(Q3_M2.subs(M2, Cb(e, 2) - S) - Q3) == 0
    out["M=4p2"] = sp.expand(M - 4 * p2) == 0
    out["p2>=(n-1)(n-2)/2 at e=n-1"] = sp.expand(p2.subs(e, n - 1) - (n - 1) * (n - 2) / 2) == 0
    c = K * Cb(d, 2) - M * Cb(d, 3)
    h = d * (3 * K + 2 * M - M * d) / 6
    out["c(d)=(d-1)h(d)"] = sp.expand(c - (d - 1) * h) == 0
    phi_s = (3 * K + 2 * M) ** 2 / (24 * M)
    dstar = (3 * K + 2 * M) / (2 * M)
    out["phi-h(d)=M(d-d*)^2/6"] = sp.simplify(phi_s - h - M * (d - dstar) ** 2 / 6) == 0
    out["3K+2M=n(n-1)(3n-14)+(6n+4)e"] = sp.expand(3 * K + 2 * M - (n * (n - 1) * (3 * n - 14) + (6 * n + 4) * e)) == 0
    Cn = (n - 1) * (n - 2) * (3 * n - 2) ** 2 / 48
    out["phi(n,n-1)=C_n"] = sp.simplify(phi_s.subs(e, n - 1) - Cn) == 0
    B = const + E1 * e - (n + 1) * e**2 - (e - 1) * Cn
    out["B_concave_coeff_e^2=-(n+1)"] = sp.expand(sp.Poly(sp.expand(B), e).coeff_monomial(e**2) + (n + 1)) == 0
    B1 = (n**5 + n**4 - 25 * n**3 + 59 * n**2 - 48 * n - 12) / 12
    out["B(1)"] = sp.expand(B.subs(e, 1) - B1) == 0
    out["12B(1)=n^3(n^2+n-25)+59n^2-48n-12"] = sp.expand(12 * B1 - (n**3 * (n**2 + n - 25) + 59 * n**2 - 48 * n - 12)) == 0
    beta = 3 * n**4 - 48 * n**3 + 92 * n**2 - 80 * n + 32
    out["B(n-1)=(n-1)beta/48"] = sp.expand(B.subs(e, n - 1) - (n - 1) * beta / 48) == 0
    out["beta=3n^3(n-16)+92n^2-80n+32"] = sp.expand(beta - (3 * n**3 * (n - 16) + 92 * n**2 - 80 * n + 32)) == 0
    out["beta(14)"] = int(beta.subs(n, 14))
    out["beta(15)"] = int(beta.subs(n, 15))
    out["beta(13)"] = int(beta.subs(n, 13))
    assert out["beta(14)"] == 480 and out["beta(15)"] == 9407 and out["beta(13)"] < 0
    out["92n^2-80n+32>0 discriminant<0"] = bool(80**2 - 4 * 92 * 32 < 0)
    # closed forms
    star = {n: m + 1, e: m, S: Cb(m, 2), T: Cb(m, 3), P4: 0}
    out["Q3(star K_{1,m})=m^2(m-1)^2(m+1)/12"] = sp.expand(Q3.subs(star) - m**2 * (m - 1) ** 2 * (m + 1) / 12) == 0
    out["Q3(edgeless n)=n^2(n-1)^2(n+1)/12"] = sp.expand(Q3.subs({e: 0, S: 0, T: 0, P4: 0}) - const) == 0
    Taa = {n: 2 * a + 3, e: 2 * a + 2, S: a * (a + 1) + 1, T: 2 * Cb(a + 1, 3), P4: 2 * a}
    out["Q3(T(a,a)), n=2a+3"] = str(sp.factor(sp.expand(Q3.subs(Taa))))
    Tab = {n: 2 * a + 4, e: 2 * a + 3, S: Cb(a + 2, 2) + Cb(a + 1, 2) + 1, T: Cb(a + 2, 3) + Cb(a + 1, 3), P4: 2 * a + 1}
    out["Q3(T(a+1,a)), n=2a+4"] = str(sp.factor(sp.expand(Q3.subs(Tab))))
    # leading two orders in n: edgeless n^5/12 - n^4/12, star n^5/12 - n^4/2, T(a,a) n^5/12 - 13 n^4/16
    def top2(expr):
        P = sp.Poly(sp.expand(expr), n)
        return (P.coeff_monomial(n**5), P.coeff_monomial(n**4))
    out["top_orders_edgeless=(1/12,-1/12)"] = top2(const) == (sp.Rational(1, 12), -sp.Rational(1, 12))
    out["top_orders_star=(1/12,-1/2)"] = top2((m**2 * (m - 1) ** 2 * (m + 1) / 12).subs(m, n - 1)) == (sp.Rational(1, 12), -sp.Rational(1, 2))
    out["top_orders_T(a,a)=(1/12,-13/16)"] = top2(sp.expand(Q3.subs(Taa)).subs(a, (n - 3) / 2)) == (sp.Rational(1, 12), -sp.Rational(13, 16))
    # ratio of the edgeless forest
    ratio_empty = (3 * Cb(n, 3) ** 2 + Cb(n, 2) ** 2) / (4 * Cb(n, 2) * Cb(n, 4))
    out["ratio(edgeless n)=1+1/(n-3)+3/((n-2)(n-3))"] = sp.simplify(ratio_empty - (1 + 1 / (n - 3) + 3 / ((n - 2) * (n - 3)))) == 0
    return out


# ---------------------------------------------------------------------------
# exhaustive verification and exploration
# ---------------------------------------------------------------------------


def exhaustive(nmax: int = NMAX) -> dict:
    tp = tree_polys_upto(nmax)
    seqs = [None] + [list(tree_level_sequences(k)) for k in range(1, nmax + 1)]
    for k in range(1, nmax + 1):
        assert len(seqs[k]) == len(tp[k])
        for i, s in enumerate(seqs[k]):
            assert indep_poly_tree(level_sequence_to_parent(s)) == tp[k][i]

    total = 0
    proof_part = {}     # n <= 13: exhaustive part of the theorem
    analytic_part = {}  # n >= 14: numerical confirmation of the analytic chain
    explore = {}
    q3_zero = []
    for n in range(1, nmax + 1):
        cnt = 0
        minQ_all, arg_all = None, []
        minQ_pre, arg_pre = None, []
        minR_pre, argR_pre = None, []
        n_pre = 0
        min_slack = None  # min over forests of Q_3 - B_n(e) (n >= 5, e >= 1)
        for comps, P in forests(n, tp):
            cnt += 1
            total += 1
            edges = forest_edges(comps, seqs)
            deg, e, S, T, P4, nn = stats_from_edges(n, edges)
            p2, p3, p4 = pk(P, 2), pk(P, 3), pk(P, 4)
            # Lemma A against the core polynomials
            M2 = binom(e, 2) - S
            assert M2 >= 0
            assert p2 == binom(n, 2) - e
            assert p3 == binom(n, 3) - e * (n - 2) + S
            assert p4 == binom(n, 4) - e * binom(n - 2, 2) + (n - 3) * S + M2 - P4 - T, (comps, P)
            Q3 = 3 * p3**2 + p2**2 - 4 * p2 * p4
            # Lemma B numerically
            assert q3_reduced(n, e, S, T, P4) == Q3
            # Lemma C
            if n >= 3:
                assert p2 >= (n - 1) * (n - 2) // 2 > 0
            if e >= 1:
                assert e <= nn - 1
                assert sum(x - 1 for x in deg if x >= 1) == 2 * e - nn <= e - 1
            # Theorem: Q_3 >= 0
            assert Q3 >= 0, (comps, P)
            if Q3 == 0:
                q3_zero.append({"n": n, "components": short_name(comps, seqs), "poly": P})
                assert p2 == 0
            # the analytic chain, exactly, for every forest with n >= 5, e >= 1
            if n >= 5 and e >= 1:
                K = n * (n - 1) * (n - 6) + 2 * (n + 2) * e
                M = 2 * n * (n - 1) - 4 * e
                assert M == 4 * p2 > 0
                cost = sum(K * binom(x, 2) - M * binom(x, 3) for x in deg)
                assert cost == K * S - M * T
                ph = phi(n, e)
                assert ph >= 0
                assert cost <= (e - 1) * ph                     # Lemma D
                assert ph <= C_n(n)                             # Lemma E
                base = (Fraction(n * n * (n - 1) ** 2 * (n + 1), 12)
                        + Fraction(n * (n - 1) * (n - 2) * (n - 9), 6) * e - (n + 1) * e * e)
                dropped = 2 * e**3 + 3 * S * S + M * P4
                assert dropped >= 0
                assert Q3 == base + dropped - cost
                Bv = B_bound(n, e)
                assert Q3 >= base - (e - 1) * ph >= Bv
                slack = Q3 - Bv
                if min_slack is None or slack < min_slack:
                    min_slack = slack
                if n >= N_ANALYTIC:
                    assert Bv > 0
            # exploration
            if minQ_all is None or Q3 < minQ_all:
                minQ_all, arg_all = Q3, [comps]
            elif Q3 == minQ_all:
                arg_all.append(comps)
            alpha = len(P) - 1
            in_prefix = 3 <= L_cutoff(alpha) - 1
            assert in_prefix == (alpha >= 6)
            if in_prefix:
                n_pre += 1
                assert p2 * p4 > 0
                if minQ_pre is None or Q3 < minQ_pre:
                    minQ_pre, arg_pre = Q3, [comps]
                elif Q3 == minQ_pre:
                    arg_pre.append(comps)
                R = Fraction(3 * p3**2 + p2**2, 4 * p2 * p4)
                assert R > 1
                if minR_pre is None or R < minR_pre:
                    minR_pre, argR_pre = R, [comps]
                elif R == minR_pre:
                    argR_pre.append(comps)
        rec = {"forests": cnt, "min_Q3_all_forests": minQ_all,
               "argmin_Q3_all_forests": [short_name(c, seqs) for c in arg_all]}
        if n <= N_EXHAUSTIVE_PROOF:
            proof_part[n] = rec
        else:
            rec["min_over_forests_of(Q3 - B_n(e))_e>=1"] = str(min_slack)
            rec["min_B_n(e)_over_1<=e<=n-1"] = str(min(B_bound(n, e) for e in range(1, n)))
            analytic_part[n] = rec
        if n_pre:
            explore[n] = {
                "forests_with_alpha>=6": n_pre,
                "min_Q3": minQ_pre,
                "argmin_Q3": [short_name(c, seqs) for c in arg_pre],
                "argmin_Q3_detail": [describe_forest(c, seqs) for c in arg_pre],
                "Q3_star_K_{1,n-1}": (n - 1) ** 2 * (n - 2) ** 2 * n // 12,
                "Q3_edgeless": n * n * (n - 1) ** 2 * (n + 1) // 12,
                "min_ratio": str(minR_pre),
                "min_ratio_float": float(minR_pre),
                "argmin_ratio": [short_name(c, seqs) for c in argR_pre],
                "ratio_star_K_{1,n-1}": str(Fraction(3 * binom(n - 1, 3) ** 2 + binom(n - 1, 2) ** 2,
                                                     4 * binom(n - 1, 2) * binom(n - 1, 4))),
                "ratio_edgeless": str(Fraction(3 * binom(n, 3) ** 2 + binom(n, 2) ** 2,
                                               4 * binom(n, 2) * binom(n, 4))),
            }
    assert total == 85624
    assert sum(r["forests"] for r in proof_part.values()) == 6606
    # positivity of B_n(e) on the integer range for a long stretch of n (sanity; the
    # proof uses concavity + endpoints)
    for n in range(N_ANALYTIC, 401):
        assert B_bound(n, 1) > 0 and B_bound(n, n - 1) > 0
        assert all(B_bound(n, e) > 0 for e in range(1, n))
    for n in range(5, N_ANALYTIC):
        assert min(B_bound(n, e) for e in range(1, n)) <= 0  # the analytic bound alone is not enough below 14
    return {
        "nmax": nmax,
        "total_forests_checked": total,
        "Q3_zero_cases": q3_zero,
        "exhaustive_part_of_proof_n<=13": proof_part,
        "analytic_part_numerically_confirmed_n=14..16": analytic_part,
        "B_n_positive_checked_for_all_integer_e_up_to_n": 400,
        "exploration_prefix_alpha>=6": explore,
    }


def sha256_of(path: str) -> str:
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def main() -> None:
    t0 = time.time()
    sym = symbolic_checks()
    nbool = 0
    for key, val in sym.items():
        if isinstance(val, bool):
            assert val, key
            nbool += 1
    print("sympy identities verified:", nbool)
    print("Q3 in (n,e,S,M2,P4,T):", sym["Q3_in_(n,e,S,M2,P4,T)"])
    print("Q3(T(a,a)) =", sym["Q3(T(a,a)), n=2a+3"])
    print("Q3(T(a+1,a)) =", sym["Q3(T(a+1,a)), n=2a+4"])
    exh = exhaustive()
    print("exhaustive: %d forests, n <= %d; Q3 >= 0 everywhere; Q3 = 0 only for %s"
          % (exh["total_forests_checked"], exh["nmax"],
             [z["components"] for z in exh["Q3_zero_cases"]]))
    for n, rec in exh["exploration_prefix_alpha>=6"].items():
        print("  n=%2d prefix forests=%6d minQ3=%7d %-28s  min ratio=%.6f  %s"
              % (n, rec["forests_with_alpha>=6"], rec["min_Q3"], ",".join(rec["argmin_Q3"]),
                 rec["min_ratio_float"], ",".join(rec["argmin_ratio"])))
    runtime = time.time() - t0

    record = {
        "status": "PROVED (Theorem 2: ISO_3 for every forest) + EXPLORED (minimizers, n <= 16)",
        "theorem": ("For every forest F (p_k := 0 for k > alpha): Q_3(F) = 3 p_3^2 + p_2^2 - 4 p_2 p_4 >= 0, "
                    "with equality only for K_1 and K_2 (p_2 = 0).  For n >= 14 and 1 <= e <= n-1: "
                    "Q_3 >= B_n(e) = n^2(n-1)^2(n+1)/12 + n(n-1)(n-2)(n-9)/6 e - (n+1)e^2 - (e-1)(n-1)(n-2)(3n-2)^2/48 > 0; "
                    "for e = 0, Q_3 = n^2(n-1)^2(n+1)/12; for n <= 13 exhaustive (6606 forests)."),
        "proof_outline": [
            "A: p_2 = C(n,2)-e, p_3 = C(n,3)-e(n-2)+S, p_4 = C(n,4)-eC(n-2,2)+(n-3)S+M2-P4-T (inclusion-exclusion)",
            "B: Q_3 = n^2(n-1)^2(n+1)/12 + n(n-1)(n-2)(n-9)/6 e - (n+1)e^2 + 2e^3 + 3S^2 - (KS - MT) + M P4, K = n(n-1)(n-6)+2(n+2)e, M = 4p_2",
            "C: e >= 1 => sum_{d_v>=1}(d_v-1) = e - c' <= e-1;  p_2 > 0 for n >= 3",
            "D: KS - MT = sum_v (d_v-1) h(d_v), h(d) = d(3K+2M-Md)/6 <= phi = (3K+2M)^2/(24M)  =>  KS - MT <= (e-1) phi",
            "E: n >= 5 => phi(n,e) <= phi(n,n-1) = C_n = (n-1)(n-2)(3n-2)^2/48",
            "=> Q_3 >= B_n(e) (drop 2e^3, 3S^2, M P4 >= 0); B_n concave in e, B_n(1) > 0 (n >= 5), B_n(n-1) = (n-1)beta(n)/48 > 0 (n >= 14)",
            "n <= 13: exhaustive over all 6606 forests",
        ],
        "sympy_checks": sym,
        "exhaustive": exh,
        "explored_not_proved": {
            "Q3_minimizer_among_prefix_forests(alpha>=6)": (
                "n = 6: edgeless; n = 7: K_{1,5} + K_1; 8 <= n <= 16: the subdivided double star "
                "T(ceil((n-3)/2), floor((n-3)/2)) (two stars whose centres are joined to a common vertex), "
                "unique at each order in this range; the star K_{1,n-1} is NOT the minimizer of Q_3 "
                "(unlike Q_2)."),
            "Q3_minimizer_among_all_forests": (
                "5 <= n <= 16: the unique minimizer of Q_3 over all forests of order n is "
                "T(ceil((n-3)/2), floor((n-3)/2)) (P_5 = T(1,1) at n = 5); n = 4: P_4; n = 3: K_{1,2}; "
                "n = 1, 2: K_1, K_2 with Q_3 = 0.  Closed forms: Q_3(T(a,a)) = (8a^5+21a^4+38a^3+39a^2+8a+3)/3 "
                "(n = 2a+3), Q_3(T(a+1,a)) = (8a^5+41a^4+100a^3+139a^2+90a+27)/3 (n = 2a+4); all of "
                "Q_3(edgeless), Q_3(star), Q_3(T) are n^5/12 + O(n^4), T winning at order n^4."),
            "ratio_minimizer_among_prefix_forests": (
                "6 <= n <= 11: edgeless forest; 12 <= n <= 14: K_{1,n-3} + 2K_1; n = 15, 16: K_{1,n-4} + 3K_1. "
                "All ratios exceed 1 and tend to 1 (edgeless: 1 + 1/(n-3) + 3/((n-2)(n-3))), so ISO_3 has "
                "no uniform multiplicative margin; only the additive slack Q_3 (order n^5) is uniform."),
        },
        "pass_marker": PASS_MARKER,
        "script": os.path.basename(__file__),
        "script_sha256": sha256_of(os.path.abspath(__file__)),
        "runtime_seconds": round(runtime, 2),
    }
    os.makedirs(os.path.dirname(RESULTS_PATH), exist_ok=True)
    data = {}
    if os.path.exists(RESULTS_PATH):
        with open(RESULTS_PATH) as fh:
            data = json.load(fh)
    data["iso3"] = record
    with open(RESULTS_PATH, "w") as fh:
        json.dump(data, fh, indent=1, sort_keys=True)
    print("results written to", RESULTS_PATH)
    print("runtime %.2f s" % runtime)
    print(PASS_MARKER)


if __name__ == "__main__":
    main()
