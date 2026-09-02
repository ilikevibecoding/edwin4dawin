#!/usr/bin/env python3
"""
ISO_4 for forests via exact subgraph-count expansions.

Notation.  F a forest, n vertices, e edges, degrees d_v, maximum degree Delta,
    S   = sum_v C(d_v,2)   (pairs of edges sharing a vertex = vertex pairs at distance 2),
    M2  = C(e,2) - S       (pairs of disjoint edges),
    T   = sum_v C(d_v,3)   (claws K_{1,3}),      T4 = sum_v C(d_v,4)  (stars K_{1,4}),
    P4  = sum_{vw in E} (d_v-1)(d_w-1)   (3-edge paths = vertex pairs at distance 3),
    P5  = #(4-edge paths) = vertex pairs at distance 4,
    F   = #(forks: trees with degree sequence 3,2,1,1,1 as subgraphs),
    D31 = #(vertex-disjoint pairs {P_3, K_2} of subgraphs),
    W_v = sum_{a ~ v} (d_a - 1),   W2 = sum_v W_v^2,
    R   = C(n,2) - e - S   (vertex pairs at distance >= 3, or in different components),
    p_k = number of independent k-sets (p_k := 0 for k > alpha),
    Q_4 = 4 p_4^2 + p_3^2 - 5 p_3 p_5   (ISO_4 is Q_4 >= 0).

PROVED HERE (every identity sympy-checked, every inequality verified exactly on
all 85 624 forests with n <= 16; marker PASS_EXACT_ISO4_ALL_FORESTS):

  Lemma A' (counting, inclusion-exclusion over edge sets covering <= 5 vertices):
     p_5 = C(n,5) - e C(n-2,3) + S C(n-3,2) + M2 (n-4) - (P4 + T)(n-4) - D31 + (P5 + F + T4).
  Lemma F (closed forms):  D31 = S(e-2) - 2 P4 - 3 T,
     P5 = sum_v sum_{{a,b} subset N(v)} (d_a-1)(d_b-1) = W2/2 - 3T - S,
     F  = sum_v C(d_v-1,2) W_v = sum_{vc in E} (d_v-1)(d_c-1)(d_v+d_c-4)/2.
  Lemma B' (expansion; sympy):  with p_3 = C(n,3) - e(n-2) + S,
     Q_4 = Phi0(n,e,S) + cT(n,e,S) T + cP(n,e,S) P4 + 4 (T + P4)^2 - 5 p_3 (T4 + P5 + F),
     Phi0, cT, cP explicit polynomials (printed by the script; cP = E(n,e) - (3n-2) S).
  Lemma G (structure, every forest):  (i) P4 + P5 <= R;  (ii) F <= (e-3) P4 / 2;
     (iii) T4 <= (Delta-3) T / 4;  (iv) C(Delta,2) <= S, hence
           Delta <= Delta_max(S) = floor((1+sqrt(1+8S))/2) <= Delta_t(S,e) := 1/2 + (1+8S+(2e-1)^2)/(4(2e-1));
     (v) e >= 2  =>  T >= Tmin := 2 S (S-e+1) / (3(e-1))   (Cauchy-Schwarz on d_v - 1);
     (vi) n >= 7 => p_3 > 0.
  Lemma H (the bound).  Let n >= 7, e >= 2, cP_eff := E - (5/2)(e-5) p_3 >= 0,
     c := cT - (5/4)(Delta_t - 3) p_3,  L0 := Phi0 - 5 p_3 R + (2-3n) S R.
       if S <= e-2 and c >= 0:                       Q_4 >= L0;
       if S >= e-1 and (c >= 0 or 8 Tmin + c >= 0):  Q_4 >= L_I := L0 + Tmin (4 Tmin + c).
     (Chain: drop 8 T P4 + 4 P4^2 >= 0; P5 <= R - P4; F <= (e-3)P4/2; P4 <= R; drop cP_eff P4 >= 0;
      T4 <= (Delta_t - 3) T / 4;  then 4T^2 + cT >= Tmin (4 Tmin + c) on T >= max(0, Tmin).)
  Lemma I (positivity of the bound).
     (a) n >= 18: Taylor expansion in n = 18 + s of the six polynomials
         144 (e-1)^2 (2e-1) L_I  [S in [e-1, C(e,2)]],  144 L0  [S in [0, e-1]],
         24 (2e-1) c at S = 0 and at S = C(e,2) (c is concave in S),
         2 cP_eff at S = 0 and at S = C(e,2) (cP_eff is linear in S),
         with e = 2 + t (n-3), S parametrised affinely by sigma in [0,1]: the constant
         Taylor coefficient has all Bernstein coefficients > 0 on [0,1]^2 and every higher
         coefficient has all Bernstein coefficients >= 0 (exact integer arithmetic), hence
         all six are > 0 for every real n >= 18, 2 <= e <= n-1, admissible S.
     (b) 15 <= n <= 17: exact evaluation at every integer point (e, S), 2 <= e <= n-1,
         0 <= S <= C(e,2), of the side conditions and of the bound (with Delta_max(S)).
     (c) e in {0,1}: Q_4 = A(n,e) with A(n,0) = n^2 (n-1)^2 (n-2)^2 (n+1)/144,
         A(n,1) = n (n-1) (n-2)^2 (n-3)^2 (n+8)/144.
  THEOREM 3.  Every forest satisfies Q_4 = 4 p_4^2 + p_3^2 - 5 p_3 p_5 >= 0, with equality
     iff p_3 = 0 (alpha <= 2: K_1, K_2, 2K_1, P_3, K_2+K_1, P_4, 2K_2).  n <= 14 is checked
     exhaustively (15 205 forests); n >= 15 follows from Lemmas H and I.  Consequently ISO_4
     holds for every forest and every alpha, in particular whenever r = 4 is a prefix index
     (alpha >= 7), and then (4p_4^2 + p_3^2)/(5 p_3 p_5) > 1.

EXPLORED (data only, n <= 16): minimizers of Q_4 over all forests (paths for n <= 9, then
"subdivided triple stars"), and over alpha >= 7 the minimizers of Q_4 and of the ratio.

Exact arithmetic only (ints, Fractions, sympy rationals).  Deterministic.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time
from fractions import Fraction
from functools import reduce
from itertools import combinations, product
from math import comb, factorial, gcd, isqrt

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

NMAX = 16                 # exhaustive verification / data range
N_EXHAUSTIVE_PROOF = 14   # Theorem: exhaustive part
N_SCAN_LO, N_SCAN_HI = 15, 17   # integer scan of the bound
N1 = 18                   # Bernstein certificates for n >= N1
N_SCAN_EXTRA = 40         # scan continued beyond N1 as a cross-check of the certificates
N_BRUTE_SUBGRAPH = 9      # brute-force subgraph counts
N_BRUTE_P5 = 10           # brute-force independent 5-sets
PASS_MARKER = "PASS_EXACT_ISO4_ALL_FORESTS"
RESULTS_PATH = os.path.join(HERE, "results", "iso4.json")


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
    """All statistics computed directly from the edge list."""
    deg = [0] * n
    adj = [[] for _ in range(n)]
    for a, b in edges:
        deg[a] += 1
        deg[b] += 1
        adj[a].append(b)
        adj[b].append(a)
    e = len(edges)
    S = sum(binom(x, 2) for x in deg)
    T = sum(binom(x, 3) for x in deg)
    T4 = sum(binom(x, 4) for x in deg)
    P4 = sum((deg[a] - 1) * (deg[b] - 1) for a, b in edges)
    W = [sum(deg[a] - 1 for a in adj[v]) for v in range(n)]
    W2 = sum(w * w for w in W)
    F = sum(binom(deg[v] - 1, 2) * W[v] for v in range(n))
    F_edge = sum((deg[a] - 1) * (deg[b] - 1) * (deg[a] + deg[b] - 4) for a, b in edges)
    assert F_edge % 2 == 0
    P5 = 0
    for v in range(n):
        ds = [deg[a] - 1 for a in adj[v]]
        s1 = sum(ds)
        s2 = sum(x * x for x in ds)
        assert (s1 * s1 - s2) % 2 == 0
        P5 += (s1 * s1 - s2) // 2
    nn = sum(1 for x in deg if x > 0)
    Delta = max(deg) if n else 0
    return dict(deg=deg, adj=adj, e=e, S=S, T=T, T4=T4, P4=P4, W=W, W2=W2, F=F,
                F_edge=F_edge // 2, P5=P5, nn=nn, Delta=Delta)


def brute_subgraph_counts(n: int, edges):
    """Brute force: D31, P4, T, P5, F, T4 by enumerating edge subsets; distance counts by BFS."""
    m = len(edges)

    def comps_info(sub):
        verts = set()
        deg = {}
        for a, b in sub:
            verts.update((a, b))
            deg[a] = deg.get(a, 0) + 1
            deg[b] = deg.get(b, 0) + 1
        # connectivity via union-find
        par = {v: v for v in verts}

        def find(x):
            while par[x] != x:
                par[x] = par[par[x]]
                x = par[x]
            return x
        for a, b in sub:
            ra, rb = find(a), find(b)
            if ra != rb:
                par[ra] = rb
        ncomp = len({find(v) for v in verts})
        return len(verts), ncomp, sorted(deg.values(), reverse=True)

    D31 = P4 = T = P5 = F = T4 = 0
    for sub in combinations(edges, 3):
        nv, nc, degs = comps_info(sub)
        if nv == 5 and nc == 2:
            D31 += 1
        elif nv == 4 and nc == 1:
            if degs[0] == 3:
                T += 1
            else:
                P4 += 1
    for sub in combinations(edges, 4):
        nv, nc, degs = comps_info(sub)
        if nv == 5 and nc == 1:
            if degs[0] == 4:
                T4 += 1
            elif degs[0] == 3:
                F += 1
            else:
                P5 += 1
    # distance counts
    adj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)
    dist_count = {}
    for s in range(n):
        dist = {s: 0}
        frontier = [s]
        while frontier:
            nxt = []
            for v in frontier:
                for w in adj[v]:
                    if w not in dist:
                        dist[w] = dist[v] + 1
                        nxt.append(w)
            frontier = nxt
        for v, d in dist.items():
            if v > s:
                dist_count[d] = dist_count.get(d, 0) + 1
    return dict(D31=D31, P4=P4, T=T, P5=P5, F=F, T4=T4, dist=dist_count, m=m)


def brute_p5(n: int, edges) -> int:
    nb = [0] * n
    for a, b in edges:
        nb[a] |= 1 << b
        nb[b] |= 1 << a
    cnt = 0
    for sub in combinations(range(n), 5):
        mask = 0
        ok = True
        for v in sub:
            if nb[v] & mask:
                ok = False
                break
            mask |= 1 << v
        if ok:
            cnt += 1
    return cnt


def describe_tree(k, seq):
    """Human-readable description of a tree given by its level sequence."""
    edges = parent_to_edges(level_sequence_to_parent(seq))
    deg = [0] * k
    adj = [[] for _ in range(k)]
    for a, b in edges:
        deg[a] += 1
        deg[b] += 1
        adj[a].append(b)
        adj[b].append(a)
    degs = sorted(deg, reverse=True)
    rec = {"order": k, "level_sequence": list(seq), "degree_sequence": degs}
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
        # caterpillar: the non-leaf vertices induce a path (spine); report spine degrees
        spine = [v for v in range(k) if deg[v] >= 2]
        sub_deg = {v: sum(1 for w in adj[v] if deg[w] >= 2) for v in spine}
        if all(sub_deg[v] <= 2 for v in spine) and sum(1 for v in spine if sub_deg[v] <= 1) <= 2:
            ends = [v for v in spine if sub_deg[v] <= 1]
            order = [ends[0]]
            prev = None
            while True:
                cur = order[-1]
                nxts = [w for w in adj[cur] if deg[w] >= 2 and w != prev]
                if not nxts:
                    break
                prev = cur
                order.append(nxts[0])
            sd = [deg[v] for v in order]
            if sd[::-1] < sd:
                sd = sd[::-1]
            rec["spine_degrees"] = sd
            name = "caterpillar(spine degrees %s)" % sd
            if len(sd) == 3 and sd[1] == 2:
                a, b = sorted((sd[0] - 1, sd[2] - 1), reverse=True)
                name = "T(%d,%d) subdivided double star" % (a, b)
            elif len(sd) == 5 and sd[1] == 2 and sd[3] == 2:
                name = "TS(%d,%d,%d) subdivided triple star" % (sd[0] - 1, sd[2] - 2, sd[4] - 1)
            elif len(sd) == 2:
                a, b = sorted((sd[0] - 1, sd[1] - 1), reverse=True)
                name = "S(%d,%d) double star" % (a, b)
    rec["name"] = name
    return rec


def describe_forest(comps, seqs):
    return [dict(describe_tree(k, seqs[k][i]), index=i) for k, i in comps]


def short_name(comps, seqs):
    parts = [describe_tree(k, seqs[k][i])["name"].split(" ")[0] for k, i in comps]
    out = []
    for name in parts:
        if out and out[-1][0] == name:
            out[-1][1] += 1
        else:
            out.append([name, 1])
    return " + ".join(name if c == 1 else "%d%s" % (c, name) for name, c in out)


# ---------------------------------------------------------------------------
# symbolic part (sympy): Lemma A', Lemma B', the bound polynomials
# ---------------------------------------------------------------------------


def build_symbolic() -> dict:
    import sympy as sp

    n, e, S, T, T4, P4, P5, F, M2, D31, W2, Dl, d, m, x, y, w = sp.symbols(
        "n e S T T4 P4 P5 F M2 D31 W2 Delta d m x y w")

    def Cb(z, k):
        return sp.expand(sp.prod([z - i for i in range(k)]) / sp.factorial(k))

    out = {"checks": {}, "strings": {}}
    chk = out["checks"]
    st = out["strings"]

    p2 = Cb(n, 2) - e
    p3 = Cb(n, 3) - e * (n - 2) + S
    p4_raw = Cb(n, 4) - e * Cb(n - 2, 2) + (n - 3) * S + M2 - P4 - T
    p5_raw = (Cb(n, 5) - e * Cb(n - 2, 3) + S * Cb(n - 3, 2) + M2 * (n - 4)
              - (P4 + T) * (n - 4) - D31 + (P5 + F + T4))
    st["p5_raw"] = str(p5_raw)
    Q4_raw = sp.expand(4 * p4_raw**2 + p3**2 - 5 * p3 * p5_raw)
    st["Q4_in_(n,e,S,M2,P4,T,D31,P5,F,T4)"] = str(Q4_raw)
    subs_rel = {M2: Cb(e, 2) - S, D31: S * (e - 2) - 2 * P4 - 3 * T, P5: W2 / 2 - 3 * T - S}
    Q4_W = sp.expand(Q4_raw.subs(subs_rel))
    st["Q4_in_(n,e,S,T,T4,P4,W2,F)"] = str(Q4_W)
    # grouped form with P5 kept (Lemma B')
    Q4 = sp.expand(Q4_raw.subs({M2: Cb(e, 2) - S, D31: S * (e - 2) - 2 * P4 - 3 * T}))
    poly = sp.Poly(Q4, T, P4, T4, P5, F)
    Phi0 = sp.expand(poly.coeff_monomial(1))
    cT = sp.expand(poly.coeff_monomial(T))
    cP = sp.expand(poly.coeff_monomial(P4))
    chk["Q4_grouped_identity"] = sp.expand(
        Q4 - (Phi0 + cT * T + cP * P4 + 4 * (T + P4) ** 2 - 5 * p3 * (T4 + P5 + F))) == 0
    chk["coef_T4=coef_P5=coef_F=-5p3"] = all(
        sp.expand(poly.coeff_monomial(v) + 5 * p3) == 0 for v in (T4, P5, F))
    chk["quadratic_part=4(T+P4)^2"] = (poly.coeff_monomial(T**2) == 4 and poly.coeff_monomial(T * P4) == 8
                                       and poly.coeff_monomial(P4**2) == 4)
    chk["Q4_W2_form_consistent"] = sp.expand(Q4_W - Q4.subs(P5, W2 / 2 - 3 * T - S)) == 0
    E_ = sp.expand(sp.Poly(cP, S).coeff_monomial(1))
    chk["cP=E-(3n-2)S"] = sp.expand(cP - (E_ - (3 * n - 2) * S)) == 0
    st["Phi0"] = str(sp.collect(Phi0, S))
    st["cT"] = str(sp.collect(cT, S))
    st["cP"] = str(sp.collect(cP, S))
    st["E"] = str(sp.factor(E_))
    A = Phi0.subs(S, 0)
    st["A(n,e)=Q4 with S=T=...=0"] = str(sp.factor(A))
    chk["A(n,0)=n^2(n-1)^2(n-2)^2(n+1)/144"] = sp.expand(A.subs(e, 0) - n**2 * (n - 1) ** 2 * (n - 2) ** 2 * (n + 1) / 144) == 0
    chk["A(n,1)=n(n-1)(n-2)^2(n-3)^2(n+8)/144"] = sp.expand(A.subs(e, 1) - n * (n - 1) * (n - 2) ** 2 * (n - 3) ** 2 * (n + 8) / 144) == 0
    chk["S^2_coefficient_of_Phi0=(10e+3n^2-19n+10)/2"] = sp.expand(sp.Poly(Phi0, S).coeff_monomial(S**2) - (10 * e + 3 * n**2 - 19 * n + 10) / 2) == 0
    chk["S^2_coefficient_of_Q4_in_W2_form=(10e+3n^2-19n+20)/2"] = sp.expand(sp.Poly(Q4_W, S, T, T4, P4, W2, F).coeff_monomial(S**2) - (10 * e + 3 * n**2 - 19 * n + 20) / 2) == 0
    # degree identities used in Lemma F / Lemma G
    chk["d*C(d,2)=3C(d,3)+2C(d,2)"] = sp.expand(d * Cb(d, 2) - 3 * Cb(d, 3) - 2 * Cb(d, 2)) == 0
    chk["d(d-1)^2=6C(d,3)+2C(d,2)"] = sp.expand(d * (d - 1) ** 2 - 6 * Cb(d, 3) - 2 * Cb(d, 2)) == 0
    chk["(d-1)^2=2C(d,2)-(d-1)"] = sp.expand((d - 1) ** 2 - 2 * Cb(d, 2) + (d - 1)) == 0
    chk["(d-1)^3=6C(d,3)+(d-1)"] = sp.expand((d - 1) ** 3 - 6 * Cb(d, 3) - (d - 1)) == 0
    chk["C(d,3)=C(d,2)(d-2)/3"] = sp.expand(Cb(d, 3) - Cb(d, 2) * (d - 2) / 3) == 0
    chk["C(d,4)=C(d,3)(d-3)/4"] = sp.expand(Cb(d, 4) - Cb(d, 3) * (d - 3) / 4) == 0
    chk["fork_per_edge:C(x-1,2)(y-1)+C(y-1,2)(x-1)=(x-1)(y-1)(x+y-4)/2"] = sp.expand(
        Cb(x - 1, 2) * (y - 1) + Cb(y - 1, 2) * (x - 1) - (x - 1) * (y - 1) * (x + y - 4) / 2) == 0
    # Cauchy-Schwarz rearrangement: (2S-m)^2 <= m(6T+m)  <=>  T >= 2S(S-m)/(3m)
    chk["CS_rearrangement"] = sp.simplify((m * (6 * T + m) - (2 * S - m) ** 2) / (6 * m) - (T - 2 * S * (S - m) / (3 * m))) == 0
    chk["Tmin_decreasing_in_m: d/dm[S^2/m - S] = -S^2/m^2"] = sp.simplify(sp.diff(S**2 / m - S, m) + S**2 / m**2) == 0
    # tangent bound sqrt(x) <= (x + y^2)/(2y)
    chk["(x+y^2)/(2y)-sqrt(x)=(sqrt(x)-y)^2/(2y)"] = sp.simplify((x + y**2) / (2 * y) - sp.sqrt(x) - (sp.sqrt(x) - y) ** 2 / (2 * y)) == 0
    # the bound polynomials
    q = Cb(n, 3) - e * (n - 2)
    chk["p3-S=q=(n-2)(n(n-1)-6e)/6"] = sp.expand(q - (n - 2) * (n * (n - 1) - 6 * e) / 6) == 0
    chk["q(e=n-1)=(n-1)(n-2)(n-6)/6"] = sp.expand(q.subs(e, n - 1) - (n - 1) * (n - 2) * (n - 6) / 6) == 0
    R = Cb(n, 2) - e - S
    Tmin = 2 * S * (S - e + 1) / (3 * (e - 1))
    Dt = sp.Rational(1, 2) + (1 + 8 * S + (2 * e - 1) ** 2) / (4 * (2 * e - 1))
    c_expr = cT - sp.Rational(5, 4) * (Dt - 3) * p3
    cPeff = E_ - sp.Rational(5, 2) * (e - 5) * p3
    L0 = sp.expand(Phi0 - 5 * p3 * R + (2 - 3 * n) * S * R)
    LI = sp.cancel(sp.together(sp.expand(L0 + Tmin * (4 * Tmin + c_expr))))
    numI, denI = sp.fraction(LI)
    chk["den(L_I)=144(e-1)^2(2e-1)"] = sp.expand(denI - 144 * (e - 1) ** 2 * (2 * e - 1)) == 0
    numI = sp.expand(numI)
    num0 = sp.expand(144 * L0)
    cTt = sp.expand(sp.cancel(sp.together(24 * (2 * e - 1) * c_expr)))
    cPe = sp.expand(2 * cPeff)
    chk["cTt_is_polynomial"] = cTt.is_polynomial(n, e, S)
    chk["cTt_S^2_coefficient=-60 (concave in S)"] = sp.Poly(cTt, S).coeff_monomial(S**2) == -60
    chk["cPe_linear_in_S_with_slope_-5(e-5)"] = (sp.Poly(cPe, S).degree() <= 1
                                                  and sp.expand(sp.Poly(cPe, S).coeff_monomial(S) + 5 * (e - 5)) == 0)
    st["L0*144"] = str(num0)
    st["L_I*144(e-1)^2(2e-1)"] = str(numI)
    st["c*24(2e-1)"] = str(cTt)
    st["cP_eff*2"] = str(cPe)
    # closed forms / families
    star = {n: m + 1, e: m, S: Cb(m, 2), T: Cb(m, 3), T4: Cb(m, 4), P4: 0, P5: 0, F: 0}
    chk["Q4(star K_{1,m})=A(m,0)=m^2(m-1)^2(m-2)^2(m+1)/144"] = sp.expand(Q4.subs(star) - m**2 * (m - 1) ** 2 * (m - 2) ** 2 * (m + 1) / 144) == 0
    ratio_empty = (4 * Cb(n, 4) ** 2 + Cb(n, 3) ** 2) / (5 * Cb(n, 3) * Cb(n, 5))
    chk["ratio(edgeless)=(n^2-6n+13)/((n-3)(n-4))"] = sp.simplify(ratio_empty - (n**2 - 6 * n + 13) / ((n - 3) * (n - 4))) == 0
    chk["ratio(edgeless)-1=(n+1)/((n-3)(n-4))>0"] = sp.simplify(ratio_empty - 1 - (n + 1) / ((n - 3) * (n - 4))) == 0
    # star K_{1,n-1}: p_k = C(n-1,k) for k >= 2, so its ratio is the edgeless ratio at n-1
    chk["ratio(star K_{1,n-1})=(n^2-8n+20)/((n-4)(n-5))"] = sp.simplify(
        ratio_empty.subs(n, n - 1) - (n**2 - 8 * n + 20) / ((n - 4) * (n - 5))) == 0
    # subdivided double star T(a,b): hubs c1 (a leaves), c2 (b leaves) joined through one middle vertex
    a, b = sp.symbols("a b")
    TT = {n: a + b + 3, e: a + b + 2, S: Cb(a + 1, 2) + Cb(b + 1, 2) + 1, T: Cb(a + 1, 3) + Cb(b + 1, 3),
          T4: Cb(a + 1, 4) + Cb(b + 1, 4), P4: a + b, P5: a * b, F: Cb(a, 2) + Cb(b, 2)}
    Q4_T = sp.expand(Q4.subs(TT))
    st["Q4(T(a,b))"] = str(Q4_T)
    chk["Q4(T(a,a))=a^2(a+1)^2(28a^3+9a^2-48a+20)/36"] = sp.expand(
        Q4_T.subs(b, a) - a**2 * (a + 1) ** 2 * (28 * a**3 + 9 * a**2 - 48 * a + 20) / 36) == 0
    chk["Q4(T(3,3))=2852,Q4(T(7,7))=847504,Q4(T(8,7))=1358280"] = (
        Q4_T.subs({a: 3, b: 3}) == 2852 and Q4_T.subs({a: 7, b: 7}) == 847504 and Q4_T.subs({a: 8, b: 7}) == 1358280)
    # subdivided triple star TS(a,b,c): hubs c1 (a leaves), c2 (b leaves), c3 (c leaves) on the path c1-m1-c2-m2-c3
    a, b, cc = sp.symbols("a b c")
    TS = {n: a + b + cc + 5, e: a + b + cc + 4,
          S: Cb(a + 1, 2) + Cb(b + 2, 2) + Cb(cc + 1, 2) + 2,
          T: Cb(a + 1, 3) + Cb(b + 2, 3) + Cb(cc + 1, 3),
          T4: Cb(a + 1, 4) + Cb(b + 2, 4) + Cb(cc + 1, 4),
          P4: a + 2 * (b + 1) + cc, P5: a * (b + 1) + (b + 1) * cc + 1,
          F: Cb(a, 2) + 2 * Cb(b + 1, 2) + Cb(cc, 2)}
    Q4_TS = sp.expand(Q4.subs(TS))
    st["Q4(TS(a,b,c))"] = str(Q4_TS)
    st["Q4(TS(a,a-1,a)), n=3a+4"] = str(sp.factor(Q4_TS.subs({b: a - 1, cc: a})))

    def top2(expr, var):
        P = sp.Poly(sp.expand(expr), var)
        return (P.coeff_monomial(var**7), P.coeff_monomial(var**6))
    chk["top_orders_edgeless=(1/144,-5/144)"] = top2(A.subs(e, 0), n) == (sp.Rational(1, 144), -sp.Rational(5, 144))
    chk["top_orders_star=(1/144,-12/144)"] = top2((m**2 * (m - 1) ** 2 * (m - 2) ** 2 * (m + 1) / 144).subs(m, n - 1), n) == (sp.Rational(1, 144), -sp.Rational(1, 12))
    st["top_orders_TS(a,a-1,a) in n"] = str(top2(sp.expand(Q4_TS.subs({b: a - 1, cc: a})).subs(a, (n - 4) / 3), n))
    chk["top_orders_T(a,a)_in_n=(7/1152,-229/2304)"] = top2(
        sp.expand(Q4_T.subs(b, a)).subs(a, (n - 3) / 2), n) == (sp.Rational(7, 1152), -sp.Rational(229, 2304))
    chk["top_orders_TS(a,a-1,a)_in_n=(31/3888,-937/5832)"] = top2(
        sp.expand(Q4_TS.subs({b: a - 1, cc: a})).subs(a, (n - 4) / 3), n) == (sp.Rational(31, 3888), -sp.Rational(937, 5832))
    out["polys"] = dict(numI=numI, num0=num0, cTt=cTt, cPe=cPe, Phi0=Phi0, cT=cT, cP=cP, E=E_, A=A)
    out["symbols"] = dict(n=n, e=e, S=S)
    out["_sp"] = sp
    return out


# ---------------------------------------------------------------------------
# exact evaluation of the bound at integer points
# ---------------------------------------------------------------------------


def poly_terms(sp, expr, gens):
    P = sp.Poly(expr, *gens)
    lcm = 1
    for c in P.coeffs():
        lcm = sp.ilcm(lcm, sp.Rational(c).q)
    return [(mono, int(sp.Rational(c) * lcm)) for mono, c in zip(P.monoms(), P.coeffs())], int(lcm)


def ev_terms(terms, vals):
    tot = 0
    for mono, c in terms:
        t = c
        for x, k in zip(vals, mono):
            if k:
                t *= x**k
        tot += t
    return tot


class Bound:
    """Exact evaluation of Phi0, cT, E, L0 and the pieces of Lemma H at integer (n,e,S)."""

    def __init__(self, sym):
        sp = sym["_sp"]
        n, e, S = sym["symbols"]["n"], sym["symbols"]["e"], sym["symbols"]["S"]
        self.Phi0, self.lPhi0 = poly_terms(sp, sym["polys"]["Phi0"], (n, e, S))
        self.cT, self.lcT = poly_terms(sp, sym["polys"]["cT"], (n, e, S))
        self.E, self.lE = poly_terms(sp, sym["polys"]["E"], (n, e))
        self.A, self.lA = poly_terms(sp, sym["polys"]["A"], (n, e))

    def phi0(self, n, e, S):
        return Fraction(ev_terms(self.Phi0, (n, e, S)), self.lPhi0)

    def cT_(self, n, e, S):
        return Fraction(ev_terms(self.cT, (n, e, S)), self.lcT)

    def E_(self, n, e):
        return Fraction(ev_terms(self.E, (n, e)), self.lE)

    def A_(self, n, e):
        return Fraction(ev_terms(self.A, (n, e)), self.lA)

    @staticmethod
    def p3(n, e, S):
        return binom(n, 3) - e * (n - 2) + S

    @staticmethod
    def R(n, e, S):
        return binom(n, 2) - e - S

    @staticmethod
    def Tmin(e, S):
        return Fraction(2 * S * (S - e + 1), 3 * (e - 1))

    @staticmethod
    def Delta_max(S):
        return (1 + isqrt(1 + 8 * S)) // 2

    @staticmethod
    def Delta_t(e, S):
        return Fraction(1, 2) + Fraction(1 + 8 * S + (2 * e - 1) ** 2, 4 * (2 * e - 1))

    def cPeff(self, n, e, S):
        return self.E_(n, e) - Fraction(5, 2) * (e - 5) * self.p3(n, e, S)

    def c(self, n, e, S, Delta):
        return self.cT_(n, e, S) - Fraction(5, 4) * (Delta - 3) * self.p3(n, e, S)

    def L0(self, n, e, S):
        p3 = self.p3(n, e, S)
        R = self.R(n, e, S)
        return self.phi0(n, e, S) - 5 * p3 * R + (2 - 3 * n) * S * R

    def LI(self, n, e, S, Delta):
        Tm = self.Tmin(e, S)
        return self.L0(n, e, S) + Tm * (4 * Tm + self.c(n, e, S, Delta))

    def lower_bound(self, n, e, S, Delta):
        """Return (bound, case, side_ok) for n >= 7, e >= 2 with Delta >= max degree."""
        assert n >= 7 and e >= 2 and 0 <= S <= binom(e, 2)
        cpe = self.cPeff(n, e, S)
        cc = self.c(n, e, S, Delta)
        if S <= e - 2:
            return self.L0(n, e, S), "II", (cpe >= 0 and cc >= 0)
        Tm = self.Tmin(e, S)
        assert Tm >= 0
        return self.LI(n, e, S, Delta), "I", (cpe >= 0 and (cc >= 0 or 8 * Tm + cc >= 0))


def integer_scan(bound: Bound, n_lo: int, n_hi: int) -> dict:
    """Exact check of Lemma H's side conditions and positivity of the bound at all integer (e,S)."""
    out = {}
    for n in range(n_lo, n_hi + 1):
        worst = None
        cases = {"I": 0, "II": 0}
        assert bound.A_(n, 0) > 0 and bound.A_(n, 1) > 0
        for e in range(2, n):
            for S in range(0, binom(e, 2) + 1):
                Dm = bound.Delta_max(S)
                assert binom(Dm, 2) <= S < binom(Dm + 1, 2)
                assert Fraction(Dm) <= bound.Delta_t(e, S)
                val, case, ok = bound.lower_bound(n, e, S, Dm)
                assert ok, (n, e, S)
                assert val > 0, (n, e, S, val)
                cases[case] += 1
                if worst is None or val < worst[0]:
                    worst = (val, e, S, case)
        out[n] = {"min_bound": str(worst[0]), "min_bound_float": float(worst[0]), "at_e": worst[1],
                  "at_S": worst[2], "case": worst[3], "points_case_I": cases["I"], "points_case_II": cases["II"]}
    return out


# ---------------------------------------------------------------------------
# Bernstein certificates (exact integers)
# ---------------------------------------------------------------------------


def _bernstein_min(d, degs):
    """Minimum Bernstein coefficient (positively scaled) of the polynomial d (dict monom->int) on [0,1]^k."""
    grid = {idx: d.get(idx, 0) for idx in product(*[range(D + 1) for D in degs])}
    nv = len(degs)
    for ax in range(nv):
        N = degs[ax]
        Lc = 1
        for j in range(N + 1):
            Lc = Lc * comb(N, j) // gcd(Lc, comb(N, j))
        Mx = [[comb(i, j) * (Lc // comb(N, j)) if j <= i else 0 for j in range(N + 1)] for i in range(N + 1)]
        new = {}
        others = [range(D + 1) for k, D in enumerate(degs) if k != ax]
        for rest in product(*others):
            vec = [grid[tuple(list(rest[:ax]) + [j] + list(rest[ax:]))] for j in range(N + 1)]
            for i in range(N + 1):
                row = Mx[i]
                s = 0
                for j in range(i + 1):
                    if vec[j]:
                        s += row[j] * vec[j]
                new[tuple(list(rest[:ax]) + [i] + list(rest[ax:]))] = s
        grid = new
    mn = min(grid.values())
    arg = min(grid, key=grid.get)
    return mn, arg


def _split(d, degs, ax):
    """Children on [0,1/2] and [1/2,1] along axis ax (both scaled by 2^N, then gcd-normalised)."""
    N = degs[ax]
    left, right = {}, {}
    for mono, c in d.items():
        j = mono[ax]
        left[mono] = left.get(mono, 0) + c * 2 ** (N - j)
        for i in range(j + 1):
            mm = mono[:ax] + (i,) + mono[ax + 1:]
            right[mm] = right.get(mm, 0) + c * 2 ** (N - j) * comb(j, i)

    def norm(dd):
        g = reduce(gcd, [abs(v) for v in dd.values() if v], 0)
        if g > 1:
            dd = {mono: v // g for mono, v in dd.items()}
        return {mono: v for mono, v in dd.items() if v}
    return norm(left), norm(right)


def _evaluate(d, point):
    tot = 0
    for mono, c in d.items():
        t = c
        for x, k in zip(point, mono):
            if k:
                t *= x**k
        tot += t
    return tot


def certify_box(d, strict: bool, maxdepth: int = 40, maxboxes: int = 200000):
    """Certify d > 0 (strict) or d >= 0 on [0,1]^k by Bernstein coefficients with bisection."""
    if not d:
        return (not strict), "zero polynomial", 0
    k = len(next(iter(d)))
    degs = [max(mono[i] for mono in d) for i in range(k)]
    stack = [(d, [(Fraction(0), Fraction(1))] * k, 0)]
    boxes = 0
    while stack:
        dd, box, depth = stack.pop()
        boxes += 1
        if boxes > maxboxes:
            return False, "too many boxes", boxes
        mn, arg = _bernstein_min(dd, degs)
        if mn > 0 or (mn == 0 and not strict):
            continue
        mid = [Fraction(1, 2)] * k
        corner = [Fraction(a) / D if D else Fraction(0) for a, D in zip(arg, degs)]
        for pt in (mid, corner):
            v = _evaluate(dd, pt)
            if v < 0 or (strict and v <= 0):
                real = [lo + (hi - lo) * x for (lo, hi), x in zip(box, pt)]
                return False, ("non-positive value", [str(x) for x in real], str(v)), boxes
        if depth >= maxdepth:
            return False, "max depth", boxes
        axes = [i for i, D in enumerate(degs) if D > 0]
        ax = axes[depth % len(axes)]
        l, r = _split(dd, degs, ax)
        lo, hi = box[ax]
        midv = (lo + hi) / 2
        bl = list(box)
        bl[ax] = (lo, midv)
        br = list(box)
        br[ax] = (midv, hi)
        stack.append((l, bl, depth + 1))
        stack.append((r, br, depth + 1))
    return True, "certified", boxes


def taylor_coefficients(sp, expr, n, e, S, N1: int, S_of):
    """expr(n,e,S) with e = 2 + t(n-3), S = S_of(e, sigma); return integer polynomials c_k(t,sigma)
    (each scaled by a positive integer) with expr(N1 + s) = sum_k c_k s^k."""
    t, sg = sp.symbols("t sigma")
    ee = 2 + t * (n - 3)
    SS = S_of(ee, sg)
    Pn = sp.Poly(sp.expand(expr.subs({S: SS, e: ee})), n)
    coeffs_n = {j: c for (j,), c in zip(Pn.monoms(), Pn.coeffs())}
    D = max(coeffs_n)
    out = []
    for k in range(D + 1):
        ck = sum((c * comb(j, k) * N1 ** (j - k) for j, c in coeffs_n.items() if j >= k), sp.Integer(0))
        ck = sp.Poly(sp.expand(ck), t, sg)
        lcm = 1
        for cf in ck.coeffs():
            lcm = sp.ilcm(lcm, sp.Rational(cf).q)
        out.append({mono: int(cf * lcm) for mono, cf in zip(ck.monoms(), ck.coeffs()) if cf != 0})
    return out, D


def bernstein_certificates(sym, N1: int) -> dict:
    sp = sym["_sp"]
    n, e, S = sym["symbols"]["n"], sym["symbols"]["e"], sym["symbols"]["S"]
    P = sym["polys"]
    S_I = lambda ee, sg: (ee - 1) + sg * (ee - 1) * (ee - 2) / 2       # noqa: E731  S in [e-1, C(e,2)]
    S_II = lambda ee, sg: sg * (ee - 1)                               # noqa: E731  S in [0, e-1]
    S_max = lambda ee, sg: ee * (ee - 1) / 2                          # noqa: E731
    S_zero = lambda ee, sg: 0 * ee                                    # noqa: E731
    jobs = [
        ("144(e-1)^2(2e-1) L_I, S in [e-1,C(e,2)]", P["numI"], S_I),
        ("144 L0, S in [0,e-1]", P["num0"], S_II),
        ("24(2e-1) c, S=C(e,2)", P["cTt"], S_max),
        ("24(2e-1) c, S=0", P["cTt"], S_zero),
        ("2 cP_eff, S=C(e,2)", P["cPe"], S_max),
        ("2 cP_eff, S=0", P["cPe"], S_zero),
    ]
    out = {"N1": N1, "parametrisation": "n = N1 + s (s >= 0), e = 2 + t (n-3), t in [0,1], S affine in sigma in [0,1]",
           "items": {}}
    for name, expr, Sof in jobs:
        cks, D = taylor_coefficients(sp, expr, n, e, S, N1, Sof)
        rec = {"degree_in_n": D, "coefficients": []}
        for k, d in enumerate(cks):
            ok, info, boxes = certify_box(d, strict=(k == 0))
            assert ok, (name, k, info)
            rec["coefficients"].append({"k": k, "strict": k == 0, "boxes": boxes, "terms": len(d)})
        out["items"][name] = rec
    return out


def negative_control() -> dict:
    """The certificate machinery must reject polynomials that are negative somewhere."""
    t_neg = {(2, 0): 100, (1, 0): -100, (0, 0): 24}      # 100(t-1/2)^2 - 1
    t_touch = {(2, 0): 4, (1, 0): -4, (0, 0): 1}           # (2t-1)^2
    t_pos = {(2, 0): 100, (1, 0): -100, (0, 0): 26}       # 100(t-1/2)^2 + 1  (needs bisection)
    r1 = certify_box(t_neg, strict=True)
    r2 = certify_box(t_touch, strict=True)
    r3 = certify_box(t_touch, strict=False)
    r4 = certify_box(t_pos, strict=True)
    assert not r1[0] and not r2[0] and r3[0] and r4[0] and r4[2] > 1
    return {"negative_rejected": not r1[0], "touching_strict_rejected": not r2[0],
            "touching_nonstrict_accepted": r3[0], "positive_needing_bisection_accepted_boxes": r4[2]}


# ---------------------------------------------------------------------------
# exhaustive verification and exploration
# ---------------------------------------------------------------------------


def exhaustive(bound: Bound, nmax: int = NMAX) -> dict:
    tp = tree_polys_upto(nmax)
    seqs = [None] + [list(tree_level_sequences(k)) for k in range(1, nmax + 1)]
    for k in range(1, nmax + 1):
        assert len(seqs[k]) == len(tp[k])
        for i, s in enumerate(seqs[k]):
            assert indep_poly_tree(level_sequence_to_parent(s)) == tp[k][i]

    total = 0
    per_n = {}
    explore = {}
    q4_zero = []
    brute_subgraph_forests = 0
    brute_p5_forests = 0
    chain_checked = 0
    chain_side_failed = 0
    chain_min_slack = None
    for n in range(1, nmax + 1):
        cnt = 0
        minQ_all, arg_all = None, []
        minQ_pre, arg_pre = None, []
        minR_pre, argR_pre = None, []
        n_pre = 0
        for comps, P in forests(n, tp):
            cnt += 1
            total += 1
            edges = forest_edges(comps, seqs)
            st = stats_from_edges(n, edges)
            e, S, T, T4, P4, P5, F, W2, Delta = (st["e"], st["S"], st["T"], st["T4"], st["P4"],
                                                 st["P5"], st["F"], st["W2"], st["Delta"])
            M2 = binom(e, 2) - S
            D31 = S * (e - 2) - 2 * P4 - 3 * T
            p3, p4, p5 = pk(P, 3), pk(P, 4), pk(P, 5)
            # Lemma A (from the ISO_3 work) and Lemma A'
            assert p3 == binom(n, 3) - e * (n - 2) + S
            assert p4 == binom(n, 4) - e * binom(n - 2, 2) + (n - 3) * S + M2 - P4 - T
            assert p5 == (binom(n, 5) - e * binom(n - 2, 3) + S * binom(n - 3, 2) + M2 * (n - 4)
                          - (P4 + T) * (n - 4) - D31 + (P5 + F + T4)), (comps, P)
            # Lemma F: two expressions of F and of P5 agree
            assert st["F_edge"] == F
            assert 2 * P5 == W2 - 6 * T - 2 * S
            assert sum(st["W"]) == 2 * S
            assert 2 * P4 == sum((st["deg"][v] - 1) * st["W"][v] for v in range(n))
            # brute force on small orders
            if n <= N_BRUTE_SUBGRAPH:
                br = brute_subgraph_counts(n, edges)
                assert (br["D31"], br["P4"], br["T"], br["P5"], br["F"], br["T4"]) == (D31, P4, T, P5, F, T4), (comps,)
                assert br["dist"].get(1, 0) == e and br["dist"].get(2, 0) == S
                assert br["dist"].get(3, 0) == P4 and br["dist"].get(4, 0) == P5
                brute_subgraph_forests += 1
            if n <= N_BRUTE_P5:
                assert brute_p5(n, edges) == p5
                brute_p5_forests += 1
            Q4 = 4 * p4**2 + p3**2 - 5 * p3 * p5
            # Lemma B' numerically
            Q4_grouped = (bound.phi0(n, e, S) + bound.cT_(n, e, S) * T
                          + (bound.E_(n, e) - (3 * n - 2) * S) * P4 + 4 * (T + P4) ** 2 - 5 * p3 * (T4 + P5 + F))
            assert Q4_grouped == Q4
            # Lemma G
            R = binom(n, 2) - e - S
            assert P4 + P5 <= R
            assert 2 * F <= (e - 3) * P4 if e >= 3 else (F == 0 and P4 == 0)
            assert 4 * T4 <= (Delta - 3) * T if Delta >= 3 else (T4 == 0 and T == 0)
            assert binom(Delta, 2) <= S
            if e >= 1:
                m = sum(x - 1 for x in st["deg"] if x >= 1)
                c_prime = st["nn"] - e            # number of non-trivial components
                assert c_prime >= 1 and m == 2 * e - st["nn"] == e - c_prime
                assert m <= e - 1
                if m >= 1:
                    assert (2 * S - m) ** 2 <= m * (6 * T + m)       # Cauchy-Schwarz
                if e >= 2:
                    assert Fraction(T) >= bound.Tmin(e, S)
                    Dm = bound.Delta_max(S)
                    assert Delta <= Dm and Fraction(Dm) <= bound.Delta_t(e, S)
            if n >= 7:
                assert p3 > 0
            # Lemma H chain, whenever its side conditions hold
            if n >= 7 and e >= 2:
                for Dl in (bound.Delta_max(S), bound.Delta_t(e, S)):
                    val, case, ok = bound.lower_bound(n, e, S, Dl)
                    if ok:
                        assert Q4 >= val, (comps, Q4, val)
                        chain_checked += 1
                        slack = Q4 - val
                        if chain_min_slack is None or slack < chain_min_slack[0]:
                            chain_min_slack = (slack, n, short_name(comps, seqs), str(Dl))
                    else:
                        chain_side_failed += 1
            # THEOREM
            assert Q4 >= 0, (comps, P)
            assert (Q4 == 0) == (p3 == 0)
            if Q4 == 0:
                q4_zero.append({"n": n, "components": short_name(comps, seqs), "poly": P})
            if minQ_all is None or Q4 < minQ_all:
                minQ_all, arg_all = Q4, [comps]
            elif Q4 == minQ_all:
                arg_all.append(comps)
            alpha = len(P) - 1
            in_prefix = 4 <= L_cutoff(alpha) - 1
            assert in_prefix == (alpha >= 7)
            if in_prefix:
                n_pre += 1
                assert p3 * p5 > 0
                if minQ_pre is None or Q4 < minQ_pre:
                    minQ_pre, arg_pre = Q4, [comps]
                elif Q4 == minQ_pre:
                    arg_pre.append(comps)
                ratio = Fraction(4 * p4**2 + p3**2, 5 * p3 * p5)
                assert ratio > 1
                if minR_pre is None or ratio < minR_pre:
                    minR_pre, argR_pre = ratio, [comps]
                elif ratio == minR_pre:
                    argR_pre.append(comps)
        per_n[n] = {"forests": cnt, "min_Q4_all_forests": minQ_all,
                    "argmin_Q4_all_forests": [short_name(c, seqs) for c in arg_all],
                    "argmin_Q4_all_forests_detail": [describe_forest(c, seqs) for c in arg_all],
                    "Q4_star_K_{1,n-1}": (n - 1) ** 2 * (n - 2) ** 2 * (n - 3) ** 2 * n // 144,
                    "Q4_edgeless": n * n * (n - 1) ** 2 * (n - 2) ** 2 * (n + 1) // 144}
        if n_pre:
            explore[n] = {
                "forests_with_alpha>=7": n_pre,
                "min_Q4": minQ_pre,
                "argmin_Q4": [short_name(c, seqs) for c in arg_pre],
                "argmin_Q4_detail": [describe_forest(c, seqs) for c in arg_pre],
                "min_ratio": str(minR_pre),
                "min_ratio_float": float(minR_pre),
                "argmin_ratio": [short_name(c, seqs) for c in argR_pre],
                "ratio_edgeless": str(Fraction(n * n - 6 * n + 13, (n - 3) * (n - 4))),
                "ratio_star_K_{1,n-1}": str(Fraction(n * n - 8 * n + 20, (n - 4) * (n - 5))) if n >= 6 else None,
            }
    assert total == 85624
    assert sum(per_n[k]["forests"] for k in range(1, N_EXHAUSTIVE_PROOF + 1)) == 15205
    return {
        "nmax": nmax,
        "total_forests_checked": total,
        "forests_n<=14_exhaustive_part_of_theorem": 15205,
        "brute_force_subgraph_counts_forests(n<=%d)" % N_BRUTE_SUBGRAPH: brute_subgraph_forests,
        "brute_force_independent_5_sets_forests(n<=%d)" % N_BRUTE_P5: brute_p5_forests,
        "chain_Q4>=bound_checked_instances": chain_checked,
        "chain_side_condition_failed_instances(n<15 only expected)": chain_side_failed,
        "chain_min_slack_(Q4-bound, n, forest, Delta_used)": [str(chain_min_slack[0])] + list(chain_min_slack[1:]),
        "Q4_zero_cases": q4_zero,
        "per_order": per_n,
        "exploration_prefix_alpha>=7": explore,
    }


def extended_minimizers(n_lo: int, n_hi: int) -> dict:
    """Q_4 minimizers over all forests for n_lo <= n <= n_hi (Q_4 from the exact polynomials only)."""
    tp = tree_polys_upto(n_hi)
    seqs = [None] + [list(tree_level_sequences(k)) for k in range(1, n_hi + 1)]
    out = {}
    for n in range(n_lo, n_hi + 1):
        cnt = 0
        best, arg = None, []
        best_pre, arg_pre = None, []
        for comps, P in forests(n, tp):
            cnt += 1
            p3, p4, p5 = pk(P, 3), pk(P, 4), pk(P, 5)
            Q4 = 4 * p4**2 + p3**2 - 5 * p3 * p5
            assert Q4 >= 0
            if best is None or Q4 < best:
                best, arg = Q4, [comps]
            elif Q4 == best:
                arg.append(comps)
            if len(P) - 1 >= 7:
                if best_pre is None or Q4 < best_pre:
                    best_pre, arg_pre = Q4, [comps]
                elif Q4 == best_pre:
                    arg_pre.append(comps)
        out[n] = {"forests": cnt, "min_Q4_all_forests": best, "argmin_Q4_all_forests": [short_name(c, seqs) for c in arg],
                  "argmin_Q4_all_forests_detail": [describe_forest(c, seqs) for c in arg],
                  "min_Q4_alpha>=7": best_pre, "argmin_Q4_alpha>=7": [short_name(c, seqs) for c in arg_pre]}
    return out


def family_data(orders) -> dict:
    """Exact Q_4 of natural tree families (exploration): edgeless, star, path, balanced T(a,b),
    S(a,b), D3(a,b) (hubs at distance 3), best subdivided triple star TS(a,b,c)."""
    from forest_indep import indep_poly_from_edges

    def q4_of(n, edges):
        p = indep_poly_from_edges(n, edges)
        return 4 * pk(p, 4) ** 2 + pk(p, 3) ** 2 - 5 * pk(p, 3) * pk(p, 5)

    def hubs(spine_edges, first_free, hub_leaves):
        edges = list(spine_edges)
        nxt = first_free
        for hub, k in hub_leaves:
            for _ in range(k):
                edges.append((hub, nxt))
                nxt += 1
        return nxt, edges

    out = {}
    for n in orders:
        vals = {"edgeless": q4_of(n, []), "star": q4_of(n, [(0, i) for i in range(1, n)]),
                "path": q4_of(n, [(i, i + 1) for i in range(n - 1)])}
        a = (n - 2) // 2
        b = n - 3 - a
        nn, ed = hubs([(0, 2), (1, 2)], 3, ((0, a), (1, b)))
        assert nn == n
        vals["T(%d,%d)" % (a, b)] = q4_of(n, ed)
        a = (n - 1) // 2
        b = n - 2 - a
        nn, ed = hubs([(0, 1)], 2, ((0, a), (1, b)))
        assert nn == n
        vals["S(%d,%d)" % (a, b)] = q4_of(n, ed)
        a = (n - 3) // 2
        b = n - 4 - a
        nn, ed = hubs([(0, 2), (2, 3), (3, 1)], 4, ((0, a), (1, b)))
        assert nn == n
        vals["D3(%d,%d)" % (a, b)] = q4_of(n, ed)
        best = None
        tot = n - 5
        for a in range(0, tot + 1):
            for b in range(0, tot - a + 1):
                c = tot - a - b
                if a > c:
                    continue
                nn, ed = hubs([(0, 3), (3, 1), (1, 4), (4, 2)], 5, ((0, a), (1, b), (2, c)))
                assert nn == n
                v = q4_of(n, ed)
                if best is None or v < best[0]:
                    best = (v, a, b, c)
        vals["TS(%d,%d,%d)" % best[1:]] = best[0]
        out[n] = {"Q4": vals, "argmin_within_families": min(vals, key=vals.get)}
    return out


def sha256_of(path: str) -> str:
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def main() -> None:
    t0 = time.time()
    sym = build_symbolic()
    nchk = 0
    for key, val in sym["checks"].items():
        assert val is True, key
        nchk += 1
    print("sympy identities verified:", nchk)
    print("p5 =", sym["strings"]["p5_raw"])
    print("Q4(TS(a,a-1,a)) =", sym["strings"]["Q4(TS(a,a-1,a)), n=3a+4"])
    t1 = time.time()
    control = negative_control()
    certs = bernstein_certificates(sym, N1)
    print("Bernstein certificates (n >= %d): all six polynomials certified; boxes per item: %s  (%.1fs)" % (
        N1, {k: sum(c["boxes"] for c in v["coefficients"]) for k, v in certs["items"].items()}, time.time() - t1))
    bound = Bound(sym)
    t1 = time.time()
    scan = integer_scan(bound, N_SCAN_LO, N_SCAN_HI)
    for k, v in scan.items():
        print("  integer scan n=%2d: min bound = %.1f at e=%d, S=%d (case %s)" % (k, v["min_bound_float"], v["at_e"], v["at_S"], v["case"]))
    scan_extra = integer_scan(bound, N1, N_SCAN_EXTRA)
    print("integer scan of the bound also positive for %d <= n <= %d (cross-check of the certificates)  (%.1fs)" % (
        N1, N_SCAN_EXTRA, time.time() - t1))
    t1 = time.time()
    exh = exhaustive(bound)
    print("exhaustive: %d forests, n <= %d; Q4 >= 0 everywhere, Q4 = 0 iff p3 = 0: %s  (%.1fs)" % (
        exh["total_forests_checked"], exh["nmax"], [z["components"] for z in exh["Q4_zero_cases"]], time.time() - t1))
    for n_, rec in exh["per_order"].items():
        if n_ >= 5:
            print("  n=%2d forests=%6d minQ4(all)=%9d %s" % (n_, rec["forests"], rec["min_Q4_all_forests"], ", ".join(rec["argmin_Q4_all_forests"])))
    for n_, rec in exh["exploration_prefix_alpha>=7"].items():
        print("  n=%2d prefix(alpha>=7)=%6d minQ4=%9d %-32s min ratio=%.6f %s" % (
            n_, rec["forests_with_alpha>=7"], rec["min_Q4"], ",".join(rec["argmin_Q4"]), rec["min_ratio_float"], ",".join(rec["argmin_ratio"])))
    t1 = time.time()
    ext = extended_minimizers(NMAX + 1, NMAX + 2)
    for n_, rec in ext.items():
        print("  n=%2d forests=%6d minQ4(all)=%9d %s   (Q4 >= 0 checked for all; %.1fs)" % (
            n_, rec["forests"], rec["min_Q4_all_forests"], ", ".join(rec["argmin_Q4_all_forests"]), time.time() - t1))
    fam = family_data(list(range(10, 31)) + [40, 50, 100])
    print("families: argmin within {edgeless, star, path, T, S, D3, TS}: " + ", ".join(
        "n=%d:%s" % (k, v["argmin_within_families"]) for k, v in fam.items()))
    runtime = time.time() - t0

    record = {
        "status": "PROVED (Theorem 3: ISO_4 for every forest) + EXPLORED (minimizers, n <= 16)",
        "theorem": ("For every forest F (p_k := 0 for k > alpha): Q_4(F) = 4 p_4^2 + p_3^2 - 5 p_3 p_5 >= 0, with equality iff "
                    "p_3 = 0 (alpha <= 2).  Proof: n <= 14 exhaustive (15 205 forests); n >= 15, e in {0,1}: Q_4 = A(n,e) with "
                    "A(n,0) = n^2(n-1)^2(n-2)^2(n+1)/144, A(n,1) = n(n-1)(n-2)^2(n-3)^2(n+8)/144; n >= 15, e >= 2: Lemma H gives "
                    "Q_4 >= L_I(n,e,S) (S >= e-1) or Q_4 >= L0(n,e,S) (S <= e-2), and Lemma I shows these bounds are > 0: "
                    "exact integer scan for 15 <= n <= 17, Bernstein certificates for n >= 18."),
        "items": {
            "Lemma_A'_p5_formula": {"status": "PROVED", "statement": sym["strings"]["p5_raw"],
                                    "verification": "inclusion-exclusion; exact on all 85 624 forests n <= 16; brute-force independent 5-sets n <= 10"},
            "Lemma_F_closed_forms": {"status": "PROVED",
                                     "D31": "S(e-2) - 2 P4 - 3 T", "P5": "sum_v sum_{{a,b} in N(v)} (d_a-1)(d_b-1) = W2/2 - 3T - S",
                                     "F": "sum_v C(d_v-1,2) W_v = sum_{vc in E} (d_v-1)(d_c-1)(d_v+d_c-4)/2",
                                     "verification": "brute-force subgraph enumeration on all 308 forests n <= 9, identities on all forests n <= 16"},
            "Lemma_B'_expansion": {"status": "PROVED", "form": "Q4 = Phi0 + cT T + cP P4 + 4(T+P4)^2 - 5 p3 (T4+P5+F)",
                                   "Phi0": sym["strings"]["Phi0"], "cT": sym["strings"]["cT"], "cP": sym["strings"]["cP"], "E": sym["strings"]["E"]},
            "Lemma_G_structure": {"status": "PROVED", "inequalities": [
                "P4 + P5 <= C(n,2) - e - S (unique paths in a forest: k-edge paths = vertex pairs at distance k)",
                "F <= (e-3) P4 / 2 (per edge vc: d_v + d_c - 1 <= e)",
                "T4 <= (Delta-3) T / 4 (per vertex: C(d,4) = C(d,3)(d-3)/4)",
                "C(Delta,2) <= S, Delta <= Delta_max(S) = floor((1+sqrt(1+8S))/2) <= Delta_t = 1/2 + (1+8S+(2e-1)^2)/(4(2e-1))",
                "T >= 2S(S-e+1)/(3(e-1)) for e >= 2 (Cauchy-Schwarz: (sum w^2)^2 <= sum w sum w^3, w = d_v - 1, sum w = e - c' <= e-1)",
                "p_3 > 0 for n >= 7"]},
            "Lemma_H_bound": {"status": "PROVED", "L0": "Phi0 - 5 p3 R + (2-3n) S R, R = C(n,2) - e - S",
                              "L_I": "L0 + Tmin (4 Tmin + c), c = cT - (5/4)(Delta_t - 3) p3",
                              "side_conditions": "cP_eff = E - (5/2)(e-5) p3 >= 0; c >= 0 (or, for S >= e-1, 8 Tmin + c >= 0)",
                              "L_I_numerator*144(e-1)^2(2e-1)": sym["strings"]["L_I*144(e-1)^2(2e-1)"],
                              "L0*144": sym["strings"]["L0*144"], "c*24(2e-1)": sym["strings"]["c*24(2e-1)"], "cP_eff*2": sym["strings"]["cP_eff*2"]},
            "Lemma_I_positivity": {"status": "PROVED", "bernstein_certificates_n>=18": certs, "certificate_machinery_control": control,
                                   "integer_scan_15<=n<=17": scan, "integer_scan_cross_check_18<=n<=40": {k: v["min_bound_float"] for k, v in scan_extra.items()}},
            "Theorem_3_ISO4_all_forests": {"status": "PROVED"},
            "Q4_minimizers_and_ratio_minimizers_n<=16": {"status": "EXPLORED"},
        },
        "sympy_checks": {k: bool(v) for k, v in sym["checks"].items()},
        "identities_as_strings": sym["strings"],
        "exhaustive": exh,
        "exhaustive_minimizers_n=17,18_(Q4_only)": ext,
        "family_comparison_exploration": fam,
        "explored_not_proved": {
            "Q4_minimizer_among_all_forests": (
                "n <= 4: Q4 = 0 exactly for the forests with p_3 = 0; 5 <= n <= 9: the path P_n is the unique minimizer; "
                "10 <= n <= 16: the unique minimizer is a subdivided triple star TS(a,b,c) (three stars K_{1,a}, K_{1,b}, K_{1,c} "
                "whose centres are joined through two subdivision vertices, c1-m1-c2-m2-c3), with (a,b,c) as listed per order; "
                "Q4(TS(a,a-1,a)) = " + sym["strings"]["Q4(TS(a,a-1,a)), n=3a+4"] + " (n = 3a+4), leading coefficient 31/3888 ~ 1.148/144 in n, "
                "while Q4(edgeless) and Q4(star) are n^7/144 + O(n^6) and the two-hub trees T(a,a) (n = 2a+3) have "
                "Q4 = a^2(a+1)^2(28a^3+9a^2-48a+20)/36 = (7/1152) n^7 + O(n^6) ~ 0.875 n^7/144: "
                "the TS family cannot stay minimal.  Exhaustively (Q4 only) the unique minimizer is still TS(4,4,4) at n = 17 and "
                "becomes the subdivided double star T(8,7) at n = 18; within the families listed in family_comparison_exploration, "
                "T(ceil((n-3)/2), floor((n-3)/2)) is minimal for 18 <= n <= 100.  The true minimizer for n >= 19 is open here."),
            "Q4_minimizer_among_prefix_forests(alpha>=7)": "listed per order in exploration_prefix_alpha>=7 (same TS trees for n >= 10)",
            "ratio_minimizer_among_prefix_forests": (
                "listed per order; ratio(edgeless) = (n^2-6n+13)/((n-3)(n-4)) = 1 + (n+1)/((n-3)(n-4)) -> 1, "
                "so ISO_4 has no uniform multiplicative margin; the additive slack Q4 is of order n^7."),
        },
        "pass_marker": PASS_MARKER,
        "script": os.path.basename(__file__),
        "script_sha256": sha256_of(os.path.abspath(__file__)),
        "runtime_seconds": round(runtime, 2),
    }
    os.makedirs(os.path.dirname(RESULTS_PATH), exist_ok=True)
    with open(RESULTS_PATH, "w") as fh:
        json.dump(record, fh, indent=1, sort_keys=True, default=str)
    print("results written to", RESULTS_PATH)
    print("runtime %.2f s" % runtime)
    print(PASS_MARKER)


if __name__ == "__main__":
    main()
