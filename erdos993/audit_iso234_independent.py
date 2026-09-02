#!/usr/bin/env python3
"""
Independent audit of the "ISO_r for every forest" theorems (r = 2, 3, 4) of the
Erdős Problem #993 toolkit.

Audited objects (read only; nothing is imported from them, no code is copied):
    ISO2_ALL_FORESTS_THEOREM.md   iso2_all_forests_proof.py   iso3_subgraph_expansion.py
    ISO4_ALL_FORESTS.md           iso4_subgraph_expansion.py
    results/iso2_iso3.json        results/iso4.json
Only the core library ``forest_indep.py`` is used (forest enumeration and exact
independence polynomials); every statistic, identity, inequality and certificate
below is re-implemented here, mostly by a different method than the producers.

Notation (as in the documents).  F forest, n vertices, e edges, degrees d_v,
maximum degree Delta, p_k independent k-sets (p_k := 0 for k > alpha),
Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1};
S, M2, T, T4, P4, P5, F, D31, W_v, W2, R as in ISO4_ALL_FORESTS.md section 0.

Parts
  1. Formulas.  All forests n <= 12: p_k by an independent bitmask dynamic
     programme; S, M2, T, P4, D31, T4, F, P5 by direct enumeration of all edge
     subsets of size <= 4 classified by (vertex count, components, max degree),
     distance pairs by BFS; the inclusion-exclusion formulas for p_2..p_5 are
     evaluated with these brute-force statistics; the closed forms (Lemma F and
     the degree-local forms) are compared with the brute-force counts.
  2. Identities.  Own sympy derivation of Q_2, Q_3, Q_4; the displayed grouped
     forms of both documents (typed in from the .md files) and the strings
     stored in the two JSON records are compared with the derivation.
  3. Structural inequalities and the Lemma H chain, step by step, on every
     forest n <= 16 (both Delta' variants), plus the ISO_3 chain (Lemmas C-E).
     (The proofs need n <= 14; n <= 16 is the producers' range and is cheap.)
  4. Positivity.  (a) exact integer scans: ISO_4 bounds for 13 <= n <= 40 and
     ISO_3 bound B_n(e) for 14 <= n <= 400; (b) an independent certificate for
     real n >= 18 by exact rational interval arithmetic (Horner enclosure +
     mean-value form, adaptive bisection) instead of Bernstein coefficients, and
     a Taylor-shift certificate for the ISO_3 endpoint polynomials.
  5. Exhaustive bases.  Q_2, Q_3, Q_4 from the core polynomials for all forests
     n <= 16: nonnegativity, equality cases, extremal/minimizer tables.

Checks are of two kinds: 'math' (what the proofs rely on) and
'document_statement' (sentences of the documents checked literally).  Prints
PASS_INDEPENDENT_ISO234_AUDIT iff every check of both kinds passes, otherwise
FAIL with the first discrepancy and its kind.  Everything is recorded in
results/audit_iso234_independent.json.  Exact arithmetic only.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time
from fractions import Fraction
from itertools import combinations
from math import comb, factorial, isqrt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from forest_indep import (  # noqa: E402
    L_cutoff,
    forests,
    indep_poly_from_edges,
    level_sequence_to_parent,
    parent_to_edges,
    tree_level_sequences,
    tree_polys_upto,
)

PASS_MARKER = "PASS_INDEPENDENT_ISO234_AUDIT"
RESULTS_PATH = os.path.join(HERE, "results", "audit_iso234_independent.json")
NMAX_PROOF = 14        # exhaustive range the proofs need (Parts 3, 5)
NMAX_ALL = 16          # every forest up to this order is actually checked (producers' range)
NMAX_BRUTE = 12        # bitmask / subgraph-enumeration range (Part 1)
N_SCAN_LO, N_SCAN_HI = 15, 40   # ISO_4 integer scan
N_ISO3_SCAN = 400      # ISO_3: B_n(e) > 0 for 14 <= n <= N_ISO3_SCAN (document: 400)
N1 = 18                # ISO_4 certificate: real n >= N1
BOX_BUDGET = 20000     # per Taylor coefficient
# The sentence of ISO4_ALL_FORESTS.md (Lemma I) that is checked literally; if the
# document is reworded the literal check is skipped and recorded as not applicable.
LEMMA_I_SENTENCE = "Then cP_eff > 0, c > 0, L0 > 0 for S"
AUDITED_FILES = [
    "ISO2_ALL_FORESTS_THEOREM.md", "ISO4_ALL_FORESTS.md",
    "iso2_all_forests_proof.py", "iso3_subgraph_expansion.py", "iso4_subgraph_expansion.py",
    "results/iso2_iso3.json", "results/iso4.json", "forest_indep.py",
]
A005195 = [1, 1, 2, 3, 6, 10, 20, 37, 76, 153, 329, 710, 1601, 3658, 8599, 20514, 49905]


# ---------------------------------------------------------------------------
# bookkeeping
# ---------------------------------------------------------------------------


class Audit:
    """Every check has a kind: 'math' (a theorem, lemma, identity, inequality or count
    that the proofs rely on) or 'document_statement' (a sentence of a document checked
    literally; a failure here means the document overstates something, not that the
    theorem is wrong).  Any failure of any kind makes the verdict FAIL."""

    def __init__(self):
        self.failures = []
        self.nchecks = 0
        self.named = {}
        self.nfail_math = 0
        self.nfail_doc = 0

    def check(self, name, ok, detail=None, kind="math"):
        self.nchecks += 1
        ok = bool(ok)
        if not ok:
            if kind == "math":
                self.nfail_math += 1
            else:
                self.nfail_doc += 1
            if len(self.failures) < 200:
                self.failures.append({"check": name, "kind": kind, "detail": None if detail is None else str(detail)})
        return ok

    def doc_check(self, name, ok, detail=None):
        return self.check(name, ok, detail, kind="document_statement")

    def named_check(self, name, ok, detail=None):
        ok = bool(ok)
        self.named[name] = ok
        return self.check(name, ok, detail)


def sha256_of(path):
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def pbinom(a, k):
    """Polynomial binomial a(a-1)...(a-k+1)/k! (exact integer for every integer a)."""
    r = 1
    for i in range(k):
        r *= a - i
    return r // factorial(k)


def cbin(a, k):
    """Combinatorial binomial: 0 unless 0 <= k <= a."""
    return comb(a, k) if 0 <= k <= a else 0


def pk(P, k):
    return P[k] if k < len(P) else 0


# ---------------------------------------------------------------------------
# forests as edge lists, named forests, canonical forms
# ---------------------------------------------------------------------------


def load_trees(nmax):
    """tree_polys[k][i] and the edge list of the i-th tree of order k, aligned
    (the alignment is verified with the core polynomial routine)."""
    tp = tree_polys_upto(nmax)
    edges_of = [None]
    for k in range(1, nmax + 1):
        lst = []
        for i, seq in enumerate(tree_level_sequences(k)):
            ed = parent_to_edges(level_sequence_to_parent(seq))
            assert indep_poly_from_edges(k, ed) == tp[k][i], ("tree index alignment", k, i)
            lst.append(ed)
        assert len(lst) == len(tp[k])
        edges_of.append(lst)
    return tp, edges_of


def forest_edge_list(comps, edges_of):
    edges, off = [], 0
    for k, i in comps:
        edges.extend((a + off, b + off) for a, b in edges_of[k][i])
        off += k
    return edges


def components_of(n, edges):
    adj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)
    seen = [False] * n
    comps = []
    for s in range(n):
        if seen[s]:
            continue
        seen[s] = True
        stack, comp = [s], [s]
        while stack:
            v = stack.pop()
            for w in adj[v]:
                if not seen[w]:
                    seen[w] = True
                    stack.append(w)
                    comp.append(w)
        comps.append(comp)
    return adj, comps


def canon_tree(nv, edges):
    """AHU canonical string of a tree on vertices 0..nv-1 (rooted at its centre(s))."""
    if nv == 1:
        return "()"
    adj = [[] for _ in range(nv)]
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)
    deg = [len(x) for x in adj]
    alive = nv
    removed = [False] * nv
    layer = [v for v in range(nv) if deg[v] == 1]
    while alive > 2:
        nxt = []
        for v in layer:
            removed[v] = True
            alive -= 1
            for w in adj[v]:
                if not removed[w]:
                    deg[w] -= 1
                    if deg[w] == 1:
                        nxt.append(w)
        layer = nxt
    centres = [v for v in range(nv) if not removed[v]]

    def enc(v, par):
        return "(" + "".join(sorted(enc(w, v) for w in adj[v] if w != par)) + ")"

    return min(enc(c, -1) for c in centres)


def canon_forest(n, edges):
    _, comps = components_of(n, edges)
    out = []
    for comp in comps:
        idx = {v: i for i, v in enumerate(comp)}
        sub = [(idx[a], idx[b]) for a, b in edges if a in idx and b in idx]
        out.append(canon_tree(len(comp), sub))
    return tuple(sorted(out))


def g_star(n):
    return n, [(0, i) for i in range(1, n)]


def g_path(n):
    return n, [(i, i + 1) for i in range(n - 1)]


def g_K1s(k):
    return k, []


def g_T(a, b):
    """Subdivided double star T(a,b): hubs 0 (a leaves), 1 (b leaves), middle vertex 2."""
    ed = [(0, 2), (1, 2)]
    nxt = 3
    for hub, k in ((0, a), (1, b)):
        for _ in range(k):
            ed.append((hub, nxt))
            nxt += 1
    return nxt, ed


def g_TS(a, b, c):
    """Subdivided triple star TS(a,b,c): spine c1-m1-c2-m2-c3 = 0-3-1-4-2."""
    ed = [(0, 3), (3, 1), (1, 4), (4, 2)]
    nxt = 5
    for hub, k in ((0, a), (1, b), (2, c)):
        for _ in range(k):
            ed.append((hub, nxt))
            nxt += 1
    return nxt, ed


def g_union(*graphs):
    n, ed = 0, []
    for k, e_ in graphs:
        ed.extend((a + n, b + n) for a, b in e_)
        n += k
    return n, ed


def q_of(P, r):
    return r * pk(P, r) ** 2 + pk(P, r - 1) ** 2 - (r + 1) * pk(P, r - 1) * pk(P, r + 1)


# ---------------------------------------------------------------------------
# Part 1: brute-force statistics
# ---------------------------------------------------------------------------


def indep_counts_bitmask(n, edges):
    """p_0..p_alpha by dynamic programming over all 2^n vertex subsets:
    mask is independent iff mask minus its lowest vertex v is independent and v
    has no neighbour in it."""
    nb = [0] * n
    for a, b in edges:
        nb[a] |= 1 << b
        nb[b] |= 1 << a
    N = 1 << n
    ind = bytearray(N)
    ind[0] = 1
    counts = [0] * (n + 1)
    counts[0] = 1
    for mask in range(1, N):
        low = mask & -mask
        v = low.bit_length() - 1
        rest = mask ^ low
        if ind[rest] and not (nb[v] & rest):
            ind[mask] = 1
            counts[mask.bit_count()] += 1
    while len(counts) > 1 and counts[-1] == 0:
        counts.pop()
    return counts


def _classify(sub):
    """(number of vertices, number of components, maximum degree) of an edge subset."""
    deg = {}
    for a, b in sub:
        deg[a] = deg.get(a, 0) + 1
        deg[b] = deg.get(b, 0) + 1
    par = {v: v for v in deg}

    def find(x):
        while par[x] != x:
            par[x] = par[par[x]]
            x = par[x]
        return x

    ncomp = len(deg)
    for a, b in sub:
        ra, rb = find(a), find(b)
        if ra != rb:
            par[ra] = rb
            ncomp -= 1
    return len(deg), ncomp, max(deg.values())


def subgraph_stats_bruteforce(n, edges):
    """Direct enumeration of all edge subsets of size 2, 3, 4 + BFS distances."""
    e = len(edges)
    st = dict(e=e, S=0, M2=0, T=0, P4=0, D31=0, K2x3=0, bad3=0, T4=0, F=0, P5=0, disc4=0, bad4=0)
    for x, y in combinations(edges, 2):
        if x[0] in y or x[1] in y:
            st["S"] += 1
        else:
            st["M2"] += 1
    for sub in combinations(edges, 3):
        nv, nc, md = _classify(sub)
        if nv == 4 and nc == 1:
            if md == 3:
                st["T"] += 1
            elif md == 2:
                st["P4"] += 1
            else:
                st["bad3"] += 1
        elif nv == 5 and nc == 2:
            st["D31"] += 1
        elif nv == 6 and nc == 3:
            st["K2x3"] += 1
        else:
            st["bad3"] += 1
    for sub in combinations(edges, 4):
        nv, nc, md = _classify(sub)
        if nv == 5 and nc == 1:
            if md == 4:
                st["T4"] += 1
            elif md == 3:
                st["F"] += 1
            elif md == 2:
                st["P5"] += 1
            else:
                st["bad4"] += 1
        elif nv >= 6 and nc == nv - 4:
            st["disc4"] += 1
        else:
            st["bad4"] += 1
    adj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)
    dist = {}
    for s in range(n):
        d = {s: 0}
        frontier = [s]
        while frontier:
            nxt = []
            for v in frontier:
                for w in adj[v]:
                    if w not in d:
                        d[w] = d[v] + 1
                        nxt.append(w)
            frontier = nxt
        for v, dv in d.items():
            if v > s:
                dist[dv] = dist.get(dv, 0) + 1
    st["dist"] = dist
    return st


def local_stats(n, edges):
    """Degree-local statistics (the closed forms of the documents) plus component data."""
    adj, comps = components_of(n, edges)
    deg = [len(x) for x in adj]
    e = len(edges)
    S = sum(cbin(d, 2) for d in deg)
    T = sum(cbin(d, 3) for d in deg)
    T4 = sum(cbin(d, 4) for d in deg)
    P4 = sum((deg[a] - 1) * (deg[b] - 1) for a, b in edges)
    W = [sum(deg[x] - 1 for x in adj[v]) for v in range(n)]
    W2 = sum(w * w for w in W)
    P5_direct = 0
    for v in range(n):
        ds = [deg[x] - 1 for x in adj[v]]
        for i in range(len(ds)):
            for j in range(i + 1, len(ds)):
                P5_direct += ds[i] * ds[j]
    F_vertex = sum(cbin(deg[v] - 1, 2) * W[v] for v in range(n))
    F_edge2 = sum((deg[a] - 1) * (deg[b] - 1) * (deg[a] + deg[b] - 4) for a, b in edges)
    nontrivial = [c for c in comps if len(c) >= 2]
    return dict(deg=deg, adj=adj, e=e, S=S, T=T, T4=T4, P4=P4, W=W, W2=W2, P5_direct=P5_direct,
                P5_closed=Fraction(W2, 2) - 3 * T - S, F_vertex=F_vertex, F_edge2=F_edge2,
                D31_closed=S * (e - 2) - 2 * P4 - 3 * T, Delta=max(deg) if n else 0,
                n_prime=sum(1 for d in deg if d >= 1), c_prime=len(nontrivial),
                m=sum(d - 1 for d in deg if d >= 1), ncomp=len(comps))


# ---------------------------------------------------------------------------
# exact evaluation of sympy polynomials at integer points
# ---------------------------------------------------------------------------


class IntPoly:
    """Polynomial with rational coefficients, stored as integer coefficients over a
    common positive denominator; exact evaluation at integer points."""

    def __init__(self, sp, expr, gens):
        P = sp.Poly(sp.expand(expr), *gens)
        lcm = 1
        for c in P.coeffs():
            lcm = sp.ilcm(lcm, sp.Rational(c).q)
        self.scale = int(lcm)
        self.terms = [(mono, int(sp.Rational(c) * lcm)) for mono, c in zip(P.monoms(), P.coeffs())]
        self.gens = len(gens)

    def __call__(self, *vals):
        tot = 0
        for mono, c in self.terms:
            term = c
            for x, k in zip(vals, mono):
                if k:
                    term *= x ** k
            tot += term
        return Fraction(tot, self.scale)


# ---------------------------------------------------------------------------
# Part 2: symbolic audit
# ---------------------------------------------------------------------------


def symbolic_audit(A: Audit, json23, json4):
    import sympy as sp

    n, e, S, T, T4, P4, P5, F, M2, D31, W2 = sp.symbols("n e S T T4 P4 P5 F M2 D31 W2")
    d, m, a, b, cc, x, y, s_, t_, sg_ = sp.symbols("d m a b c x y s t sigma")
    loc = {"n": n, "e": e, "S": S, "T": T, "T4": T4, "P4": P4, "P5": P5, "F": F, "M2": M2,
           "D31": D31, "W2": W2, "a": a, "b": b, "c": cc, "m": m}

    def C(z, k):
        r = sp.Integer(1)
        for i in range(k):
            r *= z - i
        return sp.expand(r / sp.factorial(k))

    def same(u, v):
        return sp.simplify(sp.expand(u - v)) == 0

    def parse(txt):
        return sp.sympify(txt, locals=loc)

    strings = {}
    nc = A.named_check

    # ------------------------------------------------------------- ISO_2 --
    p1 = n
    p2 = C(n, 2) - e
    p3 = C(n, 3) - e * (n - 2) + S
    Q2 = sp.expand(2 * p2 ** 2 + p1 ** 2 - 3 * p1 * p3)
    f = 2 * (C(n, 2) - e) ** 2 + n ** 2 - 3 * n * (C(n, 3) - e * (n - 2) + C(e, 2))
    strings["Q2(n,e,S)"] = str(Q2)
    strings["f(n,e)"] = str(sp.expand(f))
    nc("ISO2 doc(2.1): Q2 = f(n,e) + 3n(C(e,2) - S)", same(Q2, f + 3 * n * (C(e, 2) - S)))
    f_doc = n ** 2 * (n + 1) / 2 + e * (n ** 2 - sp.Rational(5, 2) * n) + e ** 2 * (2 - sp.Rational(3, 2) * n)
    nc("ISO2 doc: f closed form n^2(n+1)/2 + e(n^2-5n/2) + e^2(2-3n/2)", same(f, f_doc))
    nc("ISO2 doc: f(n,0) = n^2(n+1)/2", same(f.subs(e, 0), n ** 2 * (n + 1) / 2))
    nc("ISO2 doc: f(n,n-1) = 2n^2-3n+2", same(f.subs(e, n - 1), 2 * n ** 2 - 3 * n + 2))
    nc("ISO2 doc: 2n^2-3n+2 = 2m^2+m+1 at n=m+1", same((2 * n ** 2 - 3 * n + 2).subs(n, m + 1), 2 * m ** 2 + m + 1))
    nc("ISO2 doc: d^2f/de^2 = 4-3n", same(sp.diff(f, e, 2), 4 - 3 * n))
    nc("ISO2 doc: f(n,0)-f(n,n-1) = (n-1)(n^2-2n+4)/2",
       same(f.subs(e, 0) - f.subs(e, n - 1), (n - 1) * (n ** 2 - 2 * n + 4) / 2))
    # independent chord argument: f(n,e) - f(n,n-1) = (n-1-e) g(n,e), g linear in e, positive at both ends
    diff = sp.expand(f - f.subs(e, n - 1))
    qg, rg = sp.div(sp.Poly(diff, e), sp.Poly(n - 1 - e, e))
    g = qg.as_expr()
    nc("ISO2 chord: (n-1-e) divides f(n,e)-f(n,n-1)", rg.is_zero)
    g0, g1 = sp.expand(g.subs(e, 0)), sp.expand(g.subs(e, n - 1))
    strings["ISO2 chord cofactor g(n,e) with f(n,e)-f(n,n-1)=(n-1-e)g"] = str(sp.expand(g))
    strings["g(n,0)"], strings["g(n,n-1)"] = str(g0), str(g1)
    nc("ISO2 chord: g linear in e", sp.Poly(g, e).degree() == 1)
    nc("ISO2 chord: g(n,0) = n^2/2-n+2 > 0 (disc<0)",
       same(g0, n ** 2 / 2 - n + 2) and sp.discriminant(g0, n) < 0)
    nc("ISO2 chord: g(n,n-1) = 2n^2-9n/2+4 > 0 (disc<0)",
       same(g1, 2 * n ** 2 - sp.Rational(9, 2) * n + 4) and sp.discriminant(g1, n) < 0)
    star2 = {n: m + 1, e: m, S: C(m, 2)}
    nc("ISO2 doc: star p2 = C(m,2), p3 = C(m,3), Q2 = 2m^2+m+1",
       same(p2.subs(star2), C(m, 2)) and same(p3.subs(star2), C(m, 3)) and same(Q2.subs(star2), 2 * m ** 2 + m + 1))
    nc("ISO2 doc (corollary): 2p2-p1 = n(n-2)-2e", same(2 * p2 - p1, n * (n - 2) - 2 * e))
    nc("ISO2 doc (corollary): n(n-2)-2(n-1) = (n-2)^2-2", same(n * (n - 2) - 2 * (n - 1), (n - 2) ** 2 - 2))
    j2 = json23["iso2"]["sympy_checks"]
    nc("ISO2 json: Q2_polynomial string", same(parse(j2["Q2_polynomial"]), Q2))
    nc("ISO2 json: f_polynomial string", same(parse(j2["f_polynomial"]), f))

    # ------------------------------------------------------------- ISO_3 --
    p4M = C(n, 4) - e * C(n - 2, 2) + (n - 3) * S + M2 - P4 - T
    Q3M = sp.expand(3 * p3 ** 2 + p2 ** 2 - 4 * p2 * p4M)
    const3 = n ** 2 * (n - 1) ** 2 * (n + 1) / 12
    Q3M_doc = (const3 + n * (n - 1) * (n ** 2 - 11 * n + 12) / 6 * e + (n - 1) ** 2 * e ** 2
               - (n * (n - 1) * (n - 4) + 2 * n * e) * S + 3 * S ** 2 - 4 * p2 * M2 + 4 * p2 * (P4 + T))
    nc("ISO3 doc 4.1: Q3 in (n,e,S,M2,P4,T) grouped form", same(Q3M, Q3M_doc))
    j3 = json23["iso3"]["sympy_checks"]
    nc("ISO3 json: Q3_in_(n,e,S,M2,P4,T) string", same(parse(j3["Q3_in_(n,e,S,M2,P4,T)"]), Q3M))
    Q3 = sp.expand(Q3M.subs(M2, C(e, 2) - S))
    K = n * (n - 1) * (n - 6) + 2 * (n + 2) * e
    M = 2 * n * (n - 1) - 4 * e
    Q3_B = const3 + n * (n - 1) * (n - 2) * (n - 9) / 6 * e - (n + 1) * e ** 2 + 2 * e ** 3 + 3 * S ** 2 - (K * S - M * T) + M * P4
    nc("ISO3 doc (B): reduced identity", same(Q3, Q3_B))
    nc("ISO3 doc (B): M = 4 p2", same(M, 4 * p2))
    strings["Q3(n,e,S,M2,P4,T)"] = str(Q3M)
    strings["Q3 reduced (n,e,S,P4,T)"] = str(Q3)
    cd = K * C(d, 2) - M * C(d, 3)
    h = d * (3 * K + 2 * M - M * d) / 6
    phi = (3 * K + 2 * M) ** 2 / (24 * M)
    dstar = (3 * K + 2 * M) / (2 * M)
    nc("ISO3 Lemma D: c(d) = (d-1) h(d)", same(cd, (d - 1) * h))
    nc("ISO3 Lemma D: phi - h(d) = M(d-d*)^2/6", sp.simplify(phi - h - M * (d - dstar) ** 2 / 6) == 0)
    nc("ISO3 Lemma E: 3K+2M = n(n-1)(3n-14) + (6n+4)e", same(3 * K + 2 * M, n * (n - 1) * (3 * n - 14) + (6 * n + 4) * e))
    Cn = (n - 1) * (n - 2) * (3 * n - 2) ** 2 / 48
    nc("ISO3 Lemma E: phi(n,n-1) = C_n", sp.simplify(phi.subs(e, n - 1) - Cn) == 0)
    Nn = 3 * K + 2 * M
    dphi = sp.simplify(sp.diff(phi, e) - Nn * (2 * (6 * n + 4) * M + 4 * Nn) / (24 * M ** 2))
    nc("ISO3 Lemma E (own): dphi/de = N(2(6n+4)M + 4N)/(24 M^2), N = 3K+2M  (>0 when N,M>0)", dphi == 0)
    nc("ISO3 Lemma E (own): M(n,n-1) = 2(n-1)(n-2)", same(M.subs(e, n - 1), 2 * (n - 1) * (n - 2)))
    nc("ISO3 Lemma C: p2(e=n-1) = (n-1)(n-2)/2", same(p2.subs(e, n - 1), (n - 1) * (n - 2) / 2))
    B = const3 + n * (n - 1) * (n - 2) * (n - 9) / 6 * e - (n + 1) * e ** 2 - (e - 1) * Cn
    strings["B_n(e)"] = str(sp.expand(B))
    nc("ISO3 Thm2: B_n e^2-coefficient = -(n+1)", sp.Poly(sp.expand(B), e).coeff_monomial(e ** 2) == -(n + 1))
    B1 = (n ** 5 + n ** 4 - 25 * n ** 3 + 59 * n ** 2 - 48 * n - 12) / 12
    nc("ISO3 Thm2: B_n(1) closed form", same(B.subs(e, 1), B1))
    nc("ISO3 Thm2: 12 B_n(1) = n^3(n^2+n-25) + 59n^2-48n-12", same(12 * B1, n ** 3 * (n ** 2 + n - 25) + 59 * n ** 2 - 48 * n - 12))
    beta = 3 * n ** 4 - 48 * n ** 3 + 92 * n ** 2 - 80 * n + 32
    nc("ISO3 Thm2: B_n(n-1) = (n-1) beta(n)/48", same(B.subs(e, n - 1), (n - 1) * beta / 48))
    nc("ISO3 Thm2: beta = 3n^3(n-16) + 92n^2 - 80n + 32", same(beta, 3 * n ** 3 * (n - 16) + 92 * n ** 2 - 80 * n + 32))
    bv = {k: int(beta.subs(n, k)) for k in (13, 14, 15)}
    nc("ISO3 Thm2: beta(13) = -5233, beta(14) = 480, beta(15) = 9407", bv == {13: -5233, 14: 480, 15: 9407})
    nc("ISO3 Thm2: discriminant of 92n^2-80n+32 negative", 80 ** 2 - 4 * 92 * 32 < 0)
    # own real-n certificate: Taylor shifts
    b1_shift = [int(c) for c in sp.Poly(sp.expand((12 * B1).subs(n, 5 + s_)), s_).all_coeffs()]
    beta_shift = [int(c) for c in sp.Poly(sp.expand(beta.subs(n, 14 + s_)), s_).all_coeffs()]
    nc("ISO3 own certificate: 12B_n(1) at n=5+s has all coefficients >= 0, constant > 0",
       all(c >= 0 for c in b1_shift) and b1_shift[-1] > 0)
    nc("ISO3 own certificate: beta(14+s) has all coefficients >= 0, constant > 0",
       all(c >= 0 for c in beta_shift) and beta_shift[-1] > 0)
    strings["12B_n(1) Taylor coefficients at n=5 (descending powers of s)"] = str(b1_shift)
    strings["beta(n) Taylor coefficients at n=14 (descending powers of s)"] = str(beta_shift)
    # closed forms / families (own statistics of T(a,b): degrees a+1, b+1, 2, leaves)
    star3 = {n: m + 1, e: m, S: C(m, 2), T: C(m, 3), P4: 0}
    nc("ISO3 doc: Q3(star K_{1,m}) = m^2(m-1)^2(m+1)/12", same(Q3.subs(star3), m ** 2 * (m - 1) ** 2 * (m + 1) / 12))
    nc("ISO3 doc: Q3(edgeless) = n^2(n-1)^2(n+1)/12", same(Q3.subs({e: 0, S: 0, T: 0, P4: 0}), const3))
    Tab3 = {n: a + b + 3, e: a + b + 2, S: C(a + 1, 2) + C(b + 1, 2) + 1, T: C(a + 1, 3) + C(b + 1, 3), P4: a + b}
    Q3_Tab = sp.expand(Q3.subs(Tab3))
    strings["Q3(T(a,b)) own"] = str(Q3_Tab)
    nc("ISO3 doc 5: Q3(T(a,a)) = (8a^5+21a^4+38a^3+39a^2+8a+3)/3",
       same(Q3_Tab.subs(b, a), (8 * a ** 5 + 21 * a ** 4 + 38 * a ** 3 + 39 * a ** 2 + 8 * a + 3) / 3))
    nc("ISO3 doc 5: Q3(T(a+1,a)) = (8a^5+41a^4+100a^3+139a^2+90a+27)/3",
       same(Q3_Tab.subs({a: a + 1, b: a}), (8 * a ** 5 + 41 * a ** 4 + 100 * a ** 3 + 139 * a ** 2 + 90 * a + 27) / 3))
    nc("ISO3 json: Q3(T(a,a)) string", same(parse(j3["Q3(T(a,a)), n=2a+3"]), Q3_Tab.subs(b, a)))
    nc("ISO3 json: Q3(T(a+1,a)) string", same(parse(j3["Q3(T(a+1,a)), n=2a+4"]), Q3_Tab.subs({a: a + 1, b: a})))

    def top(expr, var, degs):
        P = sp.Poly(sp.expand(expr), var)
        return tuple(P.coeff_monomial(var ** k) for k in degs)

    nc("ISO3 doc 5: leading orders edgeless (1/12,-1/12), star (1/12,-1/2), T(a,a) (1/12,-13/16)",
       top(const3, n, (5, 4)) == (sp.Rational(1, 12), -sp.Rational(1, 12))
       and top((m ** 2 * (m - 1) ** 2 * (m + 1) / 12).subs(m, n - 1), n, (5, 4)) == (sp.Rational(1, 12), -sp.Rational(1, 2))
       and top(Q3_Tab.subs(b, a).subs(a, (n - 3) / 2), n, (5, 4)) == (sp.Rational(1, 12), -sp.Rational(13, 16)))
    ratio3 = (3 * C(n, 3) ** 2 + C(n, 2) ** 2) / (4 * C(n, 2) * C(n, 4))
    nc("ISO3 doc 5: ratio(edgeless) = 1 + 1/(n-3) + 3/((n-2)(n-3))",
       sp.simplify(ratio3 - (1 + 1 / (n - 3) + 3 / ((n - 2) * (n - 3)))) == 0)

    # ------------------------------------------------------------- ISO_4 --
    p5 = (C(n, 5) - e * C(n - 2, 3) + S * C(n - 3, 2) + M2 * (n - 4)
          - (P4 + T) * (n - 4) - D31 + (P5 + F + T4))
    Q4_raw = sp.expand(4 * p4M ** 2 + p3 ** 2 - 5 * p3 * p5)
    strings["Q4(n,e,S,M2,P4,T,D31,P5,F,T4)"] = str(Q4_raw)
    j4 = json4["identities_as_strings"]
    nc("ISO4 json: p5_raw string", same(parse(j4["p5_raw"]), p5))
    nc("ISO4 json: Q4_in_(n,e,S,M2,P4,T,D31,P5,F,T4) string", same(parse(j4["Q4_in_(n,e,S,M2,P4,T,D31,P5,F,T4)"]), Q4_raw))
    Q4 = sp.expand(Q4_raw.subs({M2: C(e, 2) - S, D31: S * (e - 2) - 2 * P4 - 3 * T}))
    Q4W = sp.expand(Q4.subs(P5, W2 / 2 - 3 * T - S))
    nc("ISO4 json: Q4_in_(n,e,S,T,T4,P4,W2,F) string", same(parse(j4["Q4_in_(n,e,S,T,T4,P4,W2,F)"]), Q4W))
    PQ = sp.Poly(Q4, T, P4, T4, P5, F)
    Phi0 = sp.expand(PQ.coeff_monomial(1))
    cT = sp.expand(PQ.coeff_monomial(T))
    cP = sp.expand(PQ.coeff_monomial(P4))
    E = sp.expand(sp.Poly(cP, S).coeff_monomial(1))
    nc("ISO4 Lemma B': coefficients of T4, P5, F are -5 p3",
       all(same(PQ.coeff_monomial(v), -5 * p3) for v in (T4, P5, F)))
    nc("ISO4 Lemma B': quadratic part 4T^2 + 8T P4 + 4P4^2, no other monomials",
       PQ.coeff_monomial(T ** 2) == 4 and PQ.coeff_monomial(T * P4) == 8 and PQ.coeff_monomial(P4 ** 2) == 4
       and same(Q4, Phi0 + cT * T + cP * P4 + 4 * (T + P4) ** 2 - 5 * p3 * (T4 + P5 + F)))
    nc("ISO4 Lemma B': cP = E(n,e) - (3n-2) S", same(cP, E - (3 * n - 2) * S))
    strings["Phi0"], strings["cT"], strings["cP"], strings["E"] = str(Phi0), str(cT), str(cP), str(E)
    A4 = sp.expand(Phi0.subs(S, 0))
    strings["A(n,e)=Phi0(S=0)"] = str(A4)
    Phi0_doc = parse("S**2*(5*e + 3*n**2/2 - 19*n/2 + 5) + S*(-7*e**2*n/2 + 4*e**2 + e*n**3/6 - 3*e*n**2/2 + 125*e*n/6 - 34*e"
                     " - n**5/8 + 25*n**4/12 - 277*n**3/24 + 263*n**2/12 - 37*n/3)")
    A_doc = parse("(144*e**4 + 72*e**3*n**2 - 720*e**3*n + 864*e**3 - 12*e**2*n**4 + 156*e**2*n**3 - 456*e**2*n**2 + 960*e**2*n"
                  " - 1008*e**2 + 2*e*n**6 - 48*e*n**5 + 290*e*n**4 - 828*e*n**3 + 1112*e*n**2 - 528*e*n + n**7 - 5*n**6 + 7*n**5"
                  " + n**4 - 8*n**3 + 4*n**2)/144")
    cT_doc = parse("-(3*n+3)*S - 4*e**2 - e*n**2 + 25*e*n - 42*e + n**4/2 - 19*n**3/3 + 31*n**2/2 - 29*n/3")
    E_doc = parse("(n**4 - 11*n**3 + 26*n**2 - 16*n - 8*e**2 - 2*e*n**2 + 40*e*n - 64*e)/2")
    nc("ISO4 doc 3: Phi0 displayed = derived", same(Phi0, Phi0_doc + A_doc))
    nc("ISO4 doc 3: 144 A(n,e) displayed = derived", same(A4, A_doc))
    nc("ISO4 doc 3: cT displayed = derived", same(cT, cT_doc))
    nc("ISO4 doc 3: E displayed = derived", same(E, E_doc))
    nc("ISO4 json: Phi0, cT, cP, E, A strings",
       same(parse(j4["Phi0"]), Phi0) and same(parse(j4["cT"]), cT) and same(parse(j4["cP"]), cP)
       and same(parse(j4["E"]), E) and same(parse(j4["A(n,e)=Q4 with S=T=...=0"]), A4))
    nc("ISO4 doc 3: A(n,0) = n^2(n-1)^2(n-2)^2(n+1)/144", same(A4.subs(e, 0), n ** 2 * (n - 1) ** 2 * (n - 2) ** 2 * (n + 1) / 144))
    nc("ISO4 doc 3: A(n,1) = n(n-1)(n-2)^2(n-3)^2(n+8)/144", same(A4.subs(e, 1), n * (n - 1) * (n - 2) ** 2 * (n - 3) ** 2 * (n + 8) / 144))
    star4 = {n: m + 1, e: m, S: C(m, 2), T: C(m, 3), T4: C(m, 4), P4: 0, P5: 0, F: 0}
    nc("ISO4 doc 3: Q4(K_{1,m}) = A(m,0)", same(Q4.subs(star4), A4.subs({e: 0}).subs(n, m)))
    nc("ISO4 doc 5 remark: S^2-coefficient of Phi0 = (10e+3n^2-19n+10)/2",
       same(sp.Poly(Phi0, S).coeff_monomial(S ** 2), (10 * e + 3 * n ** 2 - 19 * n + 10) / 2))
    # degree identities used in Lemma F / G
    nc("ISO4 Lemma F: d C(d,2) = 3C(d,3) + 2C(d,2)", same(d * C(d, 2), 3 * C(d, 3) + 2 * C(d, 2)))
    nc("ISO4 Lemma F: d(d-1)^2 = 6C(d,3) + 2C(d,2)", same(d * (d - 1) ** 2, 6 * C(d, 3) + 2 * C(d, 2)))
    nc("ISO4 Lemma F: C(x-1,2)(y-1) + C(y-1,2)(x-1) = (x-1)(y-1)(x+y-4)/2",
       same(C(x - 1, 2) * (y - 1) + C(y - 1, 2) * (x - 1), (x - 1) * (y - 1) * (x + y - 4) / 2))
    nc("ISO4 Lemma G5: (d-1)^2 = 2C(d,2)-(d-1), (d-1)^3 = 6C(d,3)+(d-1)",
       same((d - 1) ** 2, 2 * C(d, 2) - (d - 1)) and same((d - 1) ** 3, 6 * C(d, 3) + (d - 1)))
    nc("ISO4 Lemma G5: (2S-m)^2 <= m(6T+m) <=> T >= 2S(S-m)/(3m)  (m>0)",
       sp.simplify((m * (6 * T + m) - (2 * S - m) ** 2) / (6 * m) - (T - 2 * S * (S - m) / (3 * m))) == 0)
    nc("ISO4 Lemma G5: d/dm (S^2/m - S) = -S^2/m^2", same(sp.diff(S ** 2 / m - S, m), -S ** 2 / m ** 2))
    nc("ISO4 Lemma G3: C(d,4) = C(d,3)(d-3)/4", same(C(d, 4), C(d, 3) * (d - 3) / 4))
    nc("ISO4 Lemma G4: (x+y^2)/(2y) - sqrt(x) = (sqrt(x)-y)^2/(2y)",
       sp.simplify((x + y ** 2) / (2 * y) - sp.sqrt(x) - (sp.sqrt(x) - y) ** 2 / (2 * y)) == 0)
    Dt = sp.Rational(1, 2) + (1 + 8 * S + (2 * e - 1) ** 2) / (4 * (2 * e - 1))
    nc("ISO4 Lemma G4: Delta_t(C(e,2), e) = e = (1+sqrt(1+8C(e,2)))/2", sp.simplify(Dt.subs(S, C(e, 2)) - e) == 0)
    nc("ISO4 Lemma G6: p3 - S = (n-2)(n(n-1)-6e)/6; at e=n-1: (n-1)(n-2)(n-6)/6",
       same(p3 - S, (n - 2) * (n * (n - 1) - 6 * e) / 6)
       and same((p3 - S).subs(e, n - 1), (n - 1) * (n - 2) * (n - 6) / 6))
    # Lemma H quantities
    R = C(n, 2) - e - S
    Tmin = 2 * S * (S - e + 1) / (3 * (e - 1))
    c_ = cT - sp.Rational(5, 4) * (Dt - 3) * p3
    cPeff = E - sp.Rational(5, 2) * (e - 5) * p3
    L0 = sp.expand(Phi0 - 5 * p3 * R + (2 - 3 * n) * S * R)
    LI = sp.cancel(sp.together(L0 + Tmin * (4 * Tmin + c_)))
    numI, denI = sp.fraction(LI)
    nc("ISO4 doc 5: denominator of L_I is 144(e-1)^2(2e-1)", same(denI, 144 * (e - 1) ** 2 * (2 * e - 1)))
    numI = sp.expand(numI)
    num0 = sp.expand(144 * L0)
    cTt = sp.expand(sp.cancel(24 * (2 * e - 1) * c_))
    cPe = sp.expand(2 * cPeff)
    nc("ISO4 doc 5: 24(2e-1)c is a polynomial", cTt.is_polynomial(n, e, S))
    nc("ISO4 Lemma H chain: cP + 5p3 - (5/2)(e-3)p3 = cP_eff - (3n-2)S",
       same(cP + 5 * p3 - sp.Rational(5, 2) * (e - 3) * p3, cPeff - (3 * n - 2) * S))
    L0_doc = parse("720*S**2*e + 216*S**2*n**2 - 936*S**2*n + 1152*S**2 - 504*S*e**2*n + 576*S*e**2 + 24*S*e*n**3 - 216*S*e*n**2"
                   " + 2712*S*e*n - 3024*S*e - 18*S*n**5 + 300*S*n**4 - 1758*S*n**3 + 2796*S*n**2 - 1320*S*n + 144*e**4 + 72*e**3*n**2"
                   " - 720*e**3*n + 864*e**3 - 12*e**2*n**4 + 156*e**2*n**3 - 456*e**2*n**2 + 240*e**2*n + 432*e**2 + 2*e*n**6 - 48*e*n**5"
                   " + 290*e*n**4 - 348*e*n**3 - 328*e*n**2 + 432*e*n + n**7 - 5*n**6 - 53*n**5 + 241*n**4 - 308*n**3 + 124*n**2")
    c_doc = parse("-60*S**2 - 30*S*e**2 - 84*S*e*n - 84*S*e - 10*S*n**3 + 30*S*n**2 + 52*S*n - 18*S + 30*e**3*n - 252*e**3 - 5*e**2*n**3"
                  " - 33*e**2*n**2 + 1010*e**2*n - 1560*e**2 + 24*e*n**4 - 274*e*n**3 + 678*e*n**2 - 914*e*n + 828*e - 12*n**4 + 137*n**3"
                  " - 327*n**2 + 202*n")
    cPe_doc = parse("-5*S*e + 25*S + 5*e**2*n - 18*e**2 - 5*e*n**3/6 + e*n**2/2 + 40*e*n/3 - 14*e + n**4 - 41*n**3/6 + 27*n**2/2 - 23*n/3")
    nc("ISO4 doc 5: 144 L0 displayed = derived", same(num0, L0_doc))
    nc("ISO4 doc 5: 24(2e-1) c displayed = derived", same(cTt, c_doc))
    nc("ISO4 doc 5: 2 cP_eff displayed = derived", same(cPe, cPe_doc))
    nc("ISO4 json: L0*144, L_I*144(e-1)^2(2e-1), c*24(2e-1), cP_eff*2 strings",
       same(parse(j4["L0*144"]), num0) and same(parse(j4["L_I*144(e-1)^2(2e-1)"]), numI)
       and same(parse(j4["c*24(2e-1)"]), cTt) and same(parse(j4["cP_eff*2"]), cPe))
    nc("ISO4 doc 5: 24(2e-1)c has S^2-coefficient -60 (concave in S)", sp.Poly(cTt, S).coeff_monomial(S ** 2) == -60)
    nc("ISO4 doc 5: 2cP_eff affine in S with slope -5(e-5)",
       sp.Poly(cPe, S).degree() == 1 and same(sp.Poly(cPe, S).coeff_monomial(S), -5 * (e - 5)))
    strings["144 L0"], strings["144(e-1)^2(2e-1) L_I"] = str(num0), str(numI)
    strings["24(2e-1) c"], strings["2 cP_eff"] = str(cTt), str(cPe)
    # exploration closed forms (own statistics of T(a,b) and TS(a,b,c))
    Tab4 = {n: a + b + 3, e: a + b + 2, S: C(a + 1, 2) + C(b + 1, 2) + 1, T: C(a + 1, 3) + C(b + 1, 3),
            T4: C(a + 1, 4) + C(b + 1, 4), P4: a + b, P5: a * b, F: C(a, 2) + C(b, 2)}
    Q4_Tab = sp.expand(Q4.subs(Tab4))
    strings["Q4(T(a,b)) own"] = str(Q4_Tab)
    nc("ISO4 json: Q4(T(a,b)) string", same(parse(j4["Q4(T(a,b))"]), Q4_Tab))
    nc("ISO4 doc 8: Q4(T(a,a)) = a^2(a+1)^2(28a^3+9a^2-48a+20)/36",
       same(Q4_Tab.subs(b, a), a ** 2 * (a + 1) ** 2 * (28 * a ** 3 + 9 * a ** 2 - 48 * a + 20) / 36))
    TS4 = {n: a + b + cc + 5, e: a + b + cc + 4, S: C(a + 1, 2) + C(b + 2, 2) + C(cc + 1, 2) + 2,
           T: C(a + 1, 3) + C(b + 2, 3) + C(cc + 1, 3), T4: C(a + 1, 4) + C(b + 2, 4) + C(cc + 1, 4),
           P4: a + 2 * (b + 1) + cc, P5: a * (b + 1) + (b + 1) * cc + 1, F: C(a, 2) + 2 * C(b + 1, 2) + C(cc, 2)}
    Q4_TS = sp.expand(Q4.subs(TS4))
    strings["Q4(TS(a,b,c)) own"] = str(Q4_TS)
    nc("ISO4 json: Q4(TS(a,b,c)) string", same(parse(j4["Q4(TS(a,b,c))"]), Q4_TS))
    nc("ISO4 doc 8: Q4(TS(a,a-1,a)) = (279a^7+730a^6+314a^5+60a^4+391a^3-102a^2-72a+64)/16",
       same(Q4_TS.subs({b: a - 1, cc: a}), (279 * a ** 7 + 730 * a ** 6 + 314 * a ** 5 + 60 * a ** 4 + 391 * a ** 3 - 102 * a ** 2 - 72 * a + 64) / 16))
    nc("ISO4 doc 8: leading orders edgeless (1/144,-5/144), star (1/144,-1/12), T(a,a) (7/1152,-229/2304), TS (31/3888,-937/5832)",
       top(A4.subs(e, 0), n, (7, 6)) == (sp.Rational(1, 144), -sp.Rational(5, 144))
       and top(A4.subs(e, 0).subs(n, n - 1), n, (7, 6)) == (sp.Rational(1, 144), -sp.Rational(1, 12))
       and top(Q4_Tab.subs(b, a).subs(a, (n - 3) / 2), n, (7, 6)) == (sp.Rational(7, 1152), -sp.Rational(229, 2304))
       and top(Q4_TS.subs({b: a - 1, cc: a}).subs(a, (n - 4) / 3), n, (7, 6)) == (sp.Rational(31, 3888), -sp.Rational(937, 5832)))
    ratio4 = (4 * C(n, 4) ** 2 + C(n, 3) ** 2) / (5 * C(n, 3) * C(n, 5))
    nc("ISO4 doc 8: ratio(edgeless) = (n^2-6n+13)/((n-3)(n-4)) = 1 + (n+1)/((n-3)(n-4)); star ratio (n^2-8n+20)/((n-4)(n-5))",
       sp.simplify(ratio4 - (n ** 2 - 6 * n + 13) / ((n - 3) * (n - 4))) == 0
       and sp.simplify(ratio4 - 1 - (n + 1) / ((n - 3) * (n - 4))) == 0
       and sp.simplify(ratio4.subs(n, n - 1) - (n ** 2 - 8 * n + 20) / ((n - 4) * (n - 5))) == 0)

    polys = dict(Phi0=IntPoly(sp, Phi0, (n, e, S)), cT=IntPoly(sp, cT, (n, e, S)), E=IntPoly(sp, E, (n, e)),
                 A=IntPoly(sp, A4, (n, e)), num0=IntPoly(sp, num0, (n, e, S)), numI=IntPoly(sp, numI, (n, e, S)),
                 cTt=IntPoly(sp, cTt, (n, e, S)), cPe=IntPoly(sp, cPe, (n, e, S)),
                 Q3_Tab=IntPoly(sp, Q3_Tab, (a, b)), Q4_Tab=IntPoly(sp, Q4_Tab, (a, b)), Q4_TS=IntPoly(sp, Q4_TS, (a, b, cc)))
    sym = dict(sp=sp, n=n, e=e, S=S, s=s_, t=t_, sg=sg_, numI=numI, num0=num0, cTt=cTt, cPe=cPe, C=C)
    return strings, polys, sym


# ---------------------------------------------------------------------------
# Lemma H quantities at integer points (own evaluation)
# ---------------------------------------------------------------------------


class HBound:
    def __init__(self, polys):
        self.P = polys

    @staticmethod
    def p3(n, e, S):
        return pbinom(n, 3) - e * (n - 2) + S

    @staticmethod
    def R(n, e, S):
        return pbinom(n, 2) - e - S

    @staticmethod
    def Tmin(e, S):
        return Fraction(2 * S * (S - e + 1), 3 * (e - 1))

    @staticmethod
    def Dmax(S):
        D = (1 + isqrt(1 + 8 * S)) // 2
        assert pbinom(D, 2) <= S < pbinom(D + 1, 2)
        return D

    @staticmethod
    def Dt(e, S):
        return Fraction(1, 2) + Fraction(1 + 8 * S + (2 * e - 1) ** 2, 4 * (2 * e - 1))

    def cPeff(self, n, e, S):
        return self.P["E"](n, e) - Fraction(5, 2) * (e - 5) * self.p3(n, e, S)

    def c(self, n, e, S, D):
        return self.P["cT"](n, e, S) - Fraction(5, 4) * (D - 3) * self.p3(n, e, S)

    def L0(self, n, e, S):
        p3, R = self.p3(n, e, S), self.R(n, e, S)
        return self.P["Phi0"](n, e, S) - 5 * p3 * R + (2 - 3 * n) * S * R

    def LI(self, n, e, S, D):
        Tm = self.Tmin(e, S)
        return self.L0(n, e, S) + Tm * (4 * Tm + self.c(n, e, S, D))

    def rule(self, n, e, S, D):
        """Lemma H case rule: (bound, case, side conditions ok)."""
        cpe = self.cPeff(n, e, S)
        cc = self.c(n, e, S, D)
        if S <= e - 2:
            return self.L0(n, e, S), "II", cpe >= 0 and cc >= 0
        Tm = self.Tmin(e, S)
        return self.LI(n, e, S, D), "I", cpe >= 0 and (cc >= 0 or 8 * Tm + cc >= 0)

    def point(self, n, e, S):
        """All Delta'-independent quantities at an integer point (each polynomial evaluated once)."""
        p3 = self.p3(n, e, S)
        R = self.R(n, e, S)
        Tm = self.Tmin(e, S)
        cT = self.P["cT"](n, e, S)
        cpe = self.P["E"](n, e) - Fraction(5, 2) * (e - 5) * p3
        L0 = self.P["Phi0"](n, e, S) - 5 * p3 * R + (2 - 3 * n) * S * R
        return dict(p3=p3, R=R, Tm=Tm, cT=cT, cpe=cpe, L0=L0, Dm=self.Dmax(S), Dt=self.Dt(e, S))

    @staticmethod
    def variant(pt, e, S, D):
        """(c, case, bound, side conditions ok) for a given Delta' from a point record."""
        c = pt["cT"] - Fraction(5, 4) * (D - 3) * pt["p3"]
        if S <= e - 2:
            return c, "II", pt["L0"], pt["cpe"] >= 0 and c >= 0
        Tm = pt["Tm"]
        return c, "I", pt["L0"] + Tm * (4 * Tm + c), pt["cpe"] >= 0 and (c >= 0 or 8 * Tm + c >= 0)


def iso4_integer_scan(A: Audit, hb: HBound, n_lo, n_hi, require_positive, cross_check_polys=False):
    """Every integer (e,S), 2 <= e <= n-1, 0 <= S <= C(e,2), both Delta' variants.

    With require_positive (n >= 15): the Lemma H side conditions and bound > 0 are
    hard checks (this is what the proof of Theorem 3 uses), cP_eff > 0 is a hard
    check, and c > 0 is a hard check for n >= 18 (Lemma I(a) claims it for real
    n >= 18).  For 15 <= n <= 17 the points with c <= 0 are only counted (the
    literal Lemma I sentence is checked afterwards)."""
    out = {}
    for n in range(n_lo, n_hi + 1):
        rec = {}
        for tag in ("Dmax", "Dt"):
            rec[tag] = {"points": 0, "case_I": 0, "case_II": 0, "side_condition_failures": 0,
                        "nonpositive_bounds": 0, "min_bound": None, "min_at": None,
                        "min_cPeff": None, "min_c": None, "min_c_at": None,
                        "points_with_c<=0": 0, "points_with_c<=0_in_case_II": 0,
                        "points_with_c<=0_list(e,S,c,8Tmin+c)": [], "min_8Tmin+c_where_c<=0": None}
        for e in range(2, n):
            for S in range(0, pbinom(e, 2) + 1):
                pt = hb.point(n, e, S)
                Dm, Dt, cpe = pt["Dm"], pt["Dt"], pt["cpe"]
                A.check("scan: Dmax <= Dt", Fraction(Dm) <= Dt, (n, e, S))
                if cross_check_polys and n <= 20:
                    # the two representations of the bounds agree (derivation consistency); also
                    # the direct evaluators agree with the point record
                    cDt, _, LIDt, _ = hb.variant(pt, e, S, Dt)
                    A.check("scan: 144 L0 polynomial = L0", hb.P["num0"](n, e, S) == 144 * pt["L0"] == 144 * hb.L0(n, e, S), (n, e, S))
                    A.check("scan: L_I polynomial = L_I(Dt)",
                            hb.P["numI"](n, e, S) == 144 * (e - 1) ** 2 * (2 * e - 1) * hb.LI(n, e, S, Dt) == 144 * (e - 1) ** 2 * (2 * e - 1) * (LIDt if S >= e - 1 else hb.LI(n, e, S, Dt)), (n, e, S))
                    A.check("scan: c polynomial = c(Dt)", hb.P["cTt"](n, e, S) == 24 * (2 * e - 1) * hb.c(n, e, S, Dt) == 24 * (2 * e - 1) * cDt, (n, e, S))
                    A.check("scan: cP_eff polynomial", hb.P["cPe"](n, e, S) == 2 * hb.cPeff(n, e, S) == 2 * cpe, (n, e, S))
                res = {}
                for tag, D in (("Dmax", Fraction(Dm)), ("Dt", Dt)):
                    r = rec[tag]
                    cc, case, val, ok = hb.variant(pt, e, S, D)
                    res[tag] = (cc, case, val, ok)
                    r["points"] += 1
                    r["case_" + case] += 1
                    if not ok:
                        r["side_condition_failures"] += 1
                    if val <= 0:
                        r["nonpositive_bounds"] += 1
                    if r["min_bound"] is None or val < r["min_bound"]:
                        r["min_bound"], r["min_at"] = val, (e, S, case)
                    r["min_cPeff"] = cpe if r["min_cPeff"] is None else min(r["min_cPeff"], cpe)
                    if r["min_c"] is None or cc < r["min_c"]:
                        r["min_c"], r["min_c_at"] = cc, (e, S, case)
                    if cc <= 0:
                        r["points_with_c<=0"] += 1
                        r["points_with_c<=0_in_case_II"] += (case == "II")
                        g1 = 8 * pt["Tm"] + cc
                        r["min_8Tmin+c_where_c<=0"] = g1 if r["min_8Tmin+c_where_c<=0"] is None else min(r["min_8Tmin+c_where_c<=0"], g1)
                        if len(r["points_with_c<=0_list(e,S,c,8Tmin+c)"]) < 40:
                            r["points_with_c<=0_list(e,S,c,8Tmin+c)"].append((e, S, str(cc), str(g1)))
                    if require_positive:
                        A.check("ISO4 Lemma I(b) scan: Lemma H side conditions hold (%s)" % tag, ok, (n, e, S, tag))
                        A.check("ISO4 Lemma I(b) scan: bound > 0 (%s)" % tag, val > 0, (n, e, S, tag, str(val)))
                        A.check("ISO4 Lemma I scan: cP_eff > 0", cpe > 0, (n, e, S))
                        if n >= N1:
                            A.check("ISO4 Lemma I(a) scan: c > 0 for n >= %d (%s)" % (N1, tag), cc > 0, (n, e, S, tag, str(cc)))
                # Lemma I remark: Delta_max <= Delta_t, p3 > 0, Tmin >= 0 in case I  =>  c(Dmax) >= c(Dt), L_I(Dmax) >= L_I(Dt)
                A.check("scan: c(Dmax) >= c(Dt), and in case I L_I(Dmax) >= L_I(Dt)",
                        res["Dmax"][0] >= res["Dt"][0] and (res["Dmax"][1] == "II" or res["Dmax"][2] >= res["Dt"][2]), (n, e, S))
        if require_positive:
            A.check("ISO4 Lemma I(c): A(n,0) > 0 and A(n,1) > 0", hb.P["A"](n, 0) > 0 and hb.P["A"](n, 1) > 0, n)
        for tag in rec:
            r = rec[tag]
            r["min_bound_float"] = float(r["min_bound"])
            for key in ("min_bound", "min_cPeff", "min_c", "min_8Tmin+c_where_c<=0"):
                r[key] = str(r[key])
        out[n] = rec
    return out


# ---------------------------------------------------------------------------
# Part 4(b): exact interval-arithmetic certificate (own method)
# ---------------------------------------------------------------------------


def _imul(a, b):
    p = (a[0] * b[0], a[0] * b[1], a[1] * b[0], a[1] * b[1])
    return (min(p), max(p))


def _horner(coeffs, X):
    """sum coeffs[j] X^j for interval X; coeffs are intervals or exact numbers."""
    def iv(c):
        return c if isinstance(c, tuple) else (c, c)
    acc = iv(coeffs[-1])
    for j in range(len(coeffs) - 2, -1, -1):
        cj = iv(coeffs[j])
        acc = _imul(acc, X)
        acc = (acc[0] + cj[0], acc[1] + cj[1])
    return acc


def _ieval(grid, Tb, Sb):
    return _horner([_horner(row, Sb) for row in grid], Tb)


def _peval(grid, tv, sv):
    tot = Fraction(0)
    for i in range(len(grid) - 1, -1, -1):
        row = grid[i]
        r = Fraction(0)
        for j in range(len(row) - 1, -1, -1):
            r = r * sv + row[j]
        tot = tot * tv + r
    return tot


def _dt(grid):
    return [[i * c for c in grid[i]] for i in range(1, len(grid))] or [[0]]


def _ds(grid):
    return [[j * row[j] for j in range(1, len(row))] or [0] for row in grid]


def certify_box(grid, strict, maxboxes=BOX_BUDGET):
    """Certify grid(t,sigma) > 0 (strict) or >= 0 on [0,1]^2 by exact rational
    interval arithmetic: lower bound = max(Horner enclosure, mean-value form
    P(mid) - sum_i (w_i/2) |dP/dx_i|(box)); bisect the axis with the larger
    mean-value error term; exact evaluation at midpoints/corners detects
    genuine sign violations."""
    gt, gs = _dt(grid), _ds(grid)
    one = Fraction(1)
    stack = [((Fraction(0), one), (Fraction(0), one), 0)]
    boxes = 0
    min_lb_accepted = None
    worst_open = None
    max_depth = 0
    while stack:
        Tb, Sb, depth = stack.pop()
        boxes += 1
        max_depth = max(max_depth, depth)
        if boxes > maxboxes:
            return dict(ok=False, status="box budget exhausted", boxes=boxes - 1, max_depth=max_depth,
                        tightest_lower_bound_open_boxes=str(worst_open), min_lb_accepted=str(min_lb_accepted))
        lb1 = _ieval(grid, Tb, Sb)[0]
        tm, sm = (Tb[0] + Tb[1]) / 2, (Sb[0] + Sb[1]) / 2
        pm = _peval(grid, tm, sm)
        if pm < 0 or (strict and pm == 0):
            return dict(ok=False, status="sign violation", witness=(str(tm), str(sm), str(pm)), boxes=boxes, max_depth=max_depth)
        Dt_ = _ieval(gt, Tb, Sb)
        Ds_ = _ieval(gs, Tb, Sb)
        wt, ws = Tb[1] - Tb[0], Sb[1] - Sb[0]
        et = wt / 2 * max(abs(Dt_[0]), abs(Dt_[1]))
        es = ws / 2 * max(abs(Ds_[0]), abs(Ds_[1]))
        lb = max(lb1, pm - et - es)
        if lb > 0 or (lb == 0 and not strict):
            min_lb_accepted = lb if min_lb_accepted is None else min(min_lb_accepted, lb)
            continue
        worst_open = lb if worst_open is None else min(worst_open, lb)
        for ta in Tb:
            for sb in Sb:
                v = _peval(grid, ta, sb)
                if v < 0 or (strict and v == 0):
                    return dict(ok=False, status="sign violation", witness=(str(ta), str(sb), str(v)), boxes=boxes, max_depth=max_depth)
        if len(grid[0]) == 1 or (et >= es and len(grid) > 1):
            stack.append(((Tb[0], tm), Sb, depth + 1))
            stack.append(((tm, Tb[1]), Sb, depth + 1))
        else:
            stack.append((Tb, (Sb[0], sm), depth + 1))
            stack.append((Tb, (sm, Sb[1]), depth + 1))
    return dict(ok=True, status="certified", boxes=boxes, max_depth=max_depth, min_lb_accepted=str(min_lb_accepted))


def taylor_coefficient_grids(sym, expr, S_of, N1):
    """expr(n,e,S) with e = 2 + t(n-3), S = S_of(e,sigma), n = N1 + s  ->  list of
    (k, sympy c_k(t,sigma)); exact."""
    sp, n, e, S, s, t, sg = sym["sp"], sym["n"], sym["e"], sym["S"], sym["s"], sym["t"], sym["sg"]
    ee = 2 + t * (n - 3)
    full = sp.expand(expr.subs(S, S_of(e, sg)).subs(e, ee).subs(n, N1 + s))
    Ps = sp.Poly(full, s)
    D = Ps.degree()
    cks = [sp.expand(Ps.coeff_monomial(s ** k)) for k in range(D + 1)]
    # consistency: the coefficients reassemble the polynomial
    assert sp.expand(sum(ck * s ** k for k, ck in enumerate(cks)) - full) == 0
    return cks, D


def strip_boundary_factors(sym, ck):
    """Divide out exact factors t, (1-t), sigma, (1-sigma) (all >= 0 on [0,1]^2)."""
    sp, t, sg = sym["sp"], sym["t"], sym["sg"]
    facs = []
    P = sp.Poly(ck, t, sg)
    if P.is_zero:
        return ck, facs
    for lin, name in ((t, "t"), (1 - t, "1-t"), (sg, "sigma"), (1 - sg, "1-sigma")):
        while True:
            q, r = P.div(sp.Poly(lin, t, sg))
            if r.is_zero:
                P = q
                facs.append(name)
            else:
                break
    return P.as_expr(), facs


def int_grid(sym, ck):
    sp, t, sg = sym["sp"], sym["t"], sym["sg"]
    P = sp.Poly(ck, t, sg)
    if P.is_zero:
        return [[0]], 1
    lcm = 1
    for cf in P.coeffs():
        lcm = sp.ilcm(lcm, sp.Rational(cf).q)
    dt, ds = P.degree(t), P.degree(sg)
    grid = [[0] * (ds + 1) for _ in range(dt + 1)]
    for (i, j), cf in zip(P.monoms(), P.coeffs()):
        grid[i][j] = int(sp.Rational(cf) * lcm)
    return grid, int(lcm)


def interval_certificates(A: Audit, sym, N1, record_checks=True, budget=BOX_BUDGET):
    sp, e, C = sym["sp"], sym["e"], sym["C"]
    jobs = [
        ("144(e-1)^2(2e-1) L_I, S = (e-1) + sigma (e-1)(e-2)/2  [S in [e-1, C(e,2)]]", sym["numI"], lambda ee, s: (ee - 1) + s * (ee - 1) * (ee - 2) / 2),
        ("144 L0, S = sigma (e-1)  [S in [0, e-1]]", sym["num0"], lambda ee, s: s * (ee - 1)),
        ("24(2e-1) c, S = C(e,2)", sym["cTt"], lambda ee, s: C(ee, 2)),
        ("24(2e-1) c, S = 0", sym["cTt"], lambda ee, s: sp.Integer(0)),
        ("2 cP_eff, S = C(e,2)", sym["cPe"], lambda ee, s: C(ee, 2)),
        ("2 cP_eff, S = 0", sym["cPe"], lambda ee, s: sp.Integer(0)),
    ]
    out = {"N1": N1, "method": "exact rational interval arithmetic (Horner enclosure and mean-value form), adaptive bisection of [0,1]^2, box budget %d per coefficient" % budget,
           "items": {}, "all_certified": True, "total_boxes": 0}
    for name, expr, S_of in jobs:
        cks, D = taylor_coefficient_grids(sym, expr, S_of, N1)
        rec = {"degree_in_s": D, "coefficients": []}
        for k, ck in enumerate(cks):
            strict = (k == 0)
            facs = []
            work = ck
            if not strict:
                work, facs = strip_boundary_factors(sym, ck)
            grid, scale = int_grid(sym, work)
            res = certify_box(grid, strict, maxboxes=budget)
            # also try to certify strict positivity of the (stripped) cofactor for information
            strict_res = res if strict else certify_box(grid, True, maxboxes=min(2000, budget))
            crec = {"k": k, "required": "> 0" if strict else ">= 0", "factors_divided_out": facs,
                    "deg_t": len(grid) - 1, "deg_sigma": len(grid[0]) - 1, "terms": sum(1 for row in grid for c in row if c),
                    "positive_scale": scale, "result": res, "cofactor_strictly_positive": bool(strict_res["ok"])}
            rec["coefficients"].append(crec)
            out["total_boxes"] += res.get("boxes", 0)
            if not res["ok"]:
                out["all_certified"] = False
            if record_checks:
                A.check("ISO4 Lemma I(a) own certificate: %s, coefficient k=%d" % (name, k), res["ok"], res)
        out["items"][name] = rec
    return out


def certificate_controls(A: Audit):
    """The machinery must reject sign violations and report (not hide) uncertifiable inputs."""
    neg = [[24], [-100], [100]]            # 100(t-1/2)^2 - 1   (negative near t = 1/2)
    touch = [[1], [-4], [4]]               # (2t-1)^2           (interior touching zero)
    pos = [[26], [-100], [100]]            # 100(t-1/2)^2 + 1   (positive, needs bisection)
    edge = [[0, 0], [1, 1]]                # t(1+sigma): zero on the edge t = 0
    r1 = certify_box(neg, strict=False, maxboxes=500)
    r2 = certify_box(touch, strict=False, maxboxes=500)
    r3 = certify_box(pos, strict=True, maxboxes=500)
    r4 = certify_box(edge, strict=True, maxboxes=500)
    r5 = certify_box([[1, 1]], strict=False, maxboxes=500)   # cofactor after dividing t out
    A.named_check("certificate control: negative polynomial rejected with witness", (not r1["ok"]) and r1["status"] == "sign violation")
    A.named_check("certificate control: interior touching zero (2t-1)^2 is NOT certified (budget exhausted, reported)", (not r2["ok"]) and r2["status"] == "box budget exhausted")
    A.named_check("certificate control: positive polynomial needing bisection certified", r3["ok"] and r3["boxes"] > 1)
    A.named_check("certificate control: strict mode rejects a polynomial vanishing on an edge", not r4["ok"])
    A.named_check("certificate control: cofactor certified after dividing out t", r5["ok"])
    return {"negative": r1, "touching_zero": r2, "positive_bisection": r3, "edge_zero_strict": r4, "edge_zero_cofactor": r5}


# ---------------------------------------------------------------------------
# Parts 1, 3, 5: one pass over all forests n <= 14
# ---------------------------------------------------------------------------


EXPECTED = {
    # ISO3 doc section 5 table, typed in: n: (forests alpha>=6, min Q3 prefix, unique minimizer, min ratio,
    # ratio minimizer, Q3(K_{1,n-1}), Q3(edgeless), ratio(K_{1,n-1}), ratio(edgeless))
    "iso3_prefix": {6: (1, 525, "6K1", "19/12", "6K1", 200, 525, "2", "19/12"),
                    7: (7, 496, "K15+K1", "7/5", "7K1", 525, 1176, "19/12", "7/5"),
                    8: (32, 825, "T(3,2)", "13/10", "8K1", 1176, 2352, "7/5", "13/10"),
                    9: (109, 1683, "T(3,3)", "26/21", "9K1", 2352, 4320, "13/10", "26/21"),
                    10: (302, 3171, "T(4,3)", "67/56", "10K1", 4320, 7425, "26/21", "67/56"),
                    11: (710, 5553, "T(4,4)", "7/6", "11K1", 7425, 12100, "67/56", "7/6"),
                    12: (1601, 9233, "T(5,4)", "28639/25080", "K19+2K1", 12100, 18876, "7/6", "103/90"),
                    13: (3658, 14631, "T(5,5)", "8891/7920", "K110+2K1", 18876, 28392, "103/90", "62/55"),
                    14: (8599, 22359, "T(6,5)", "253507/228800", "K111+2K1", 28392, 41405, "62/55", "49/44"),
                    15: (20514, 33029, "T(6,6)", "412903/376752", "K111+3K1", 41405, 58800, "49/44", "43/39"),
                    16: (49905, 47505, "T(7,6)", "53413/49176", "K112+3K1", 58800, 81600, "43/39", "199/182")},
    # ISO3 doc section 5 text / json: global Q3 minimizers (unique)
    "iso3_global": {2: (0, "K2"), 3: (1, "K12"), 4: (9, "P4"), 5: (39, "P5"), 6: (135, "T(2,1)"), 7: (357, "T(2,2)"), 8: (825, "T(3,2)"),
                    9: (1683, "T(3,3)"), 10: (3171, "T(4,3)"), 11: (5553, "T(4,4)"), 12: (9233, "T(5,4)"),
                    13: (14631, "T(5,5)"), 14: (22359, "T(6,5)"), 15: (33029, "T(6,6)"), 16: (47505, "T(7,6)")},
    # ISO4 doc section 8: global Q4 minimizers (n: min, argmin, Q4 star, Q4 edgeless)
    "iso4_global": {5: (1, "P5", 20, 150), 6: (16, "P6", 150, 700), 7: (104, "P7", 700, 2450), 8: (500, "P8", 2450, 7056),
                    9: (1950, "P9", 7056, 17640), 10: (6005, "TS(2,1,2)", 17640, 39600), 11: (15742, "TS(2,2,2)", 39600, 81675),
                    12: (36573, "TS(2,2,3)", 81675, 157300), 13: (77062, "TS(3,2,3)", 157300, 286286),
                    14: (151988, "TS(3,3,3)", 286286, 496860), 15: (281667, "TS(3,3,4)", 496860, 828100),
                    16: (495080, "TS(4,3,4)", 828100, 1332800)},
    # ISO4 doc section 8: prefix (alpha >= 7): count, min Q4, argmin, min ratio, ratio argmin
    "iso4_prefix": {7: (1, 2450, "7K1", "5/3", "7K1"), 8: (8, 2416, "K15+2K1", "29/20", "8K1"), 9: (42, 2852, "T(3,3)", "4/3", "9K1"),
                    10: (171, 6005, "TS(2,1,2)", "53/42", "10K1"), 11: (557, 15742, "TS(2,2,2)", "17/14", "11K1"),
                    12: (1516, 36573, "TS(2,2,3)", "85/72", "12K1"), 13: (3658, 77062, "TS(3,2,3)", "52/45", "13K1"),
                    14: (8599, 151988, "TS(3,3,3)", "25/22", "14K1"), 15: (20514, 281667, "TS(3,3,4)", "37/33", "15K1"),
                    16: (49905, 495080, "TS(4,3,4)", "173/156", "16K1")},
    # ISO2 json per_n: forests with r=2 in prefix (alpha >= 4); for n >= 13 every forest (alpha >= 7)
    "iso2_prefix_counts": {1: 0, 2: 0, 3: 0, 4: 1, 5: 5, 6: 16, 7: 37, 8: 76, 9: 153, 10: 329, 11: 710, 12: 1601, 13: 3658, 14: 8599,
                           15: 20514, 16: 49905},
    # ISO2 doc: Q2 of the star (= 2n^2-3n+2) for n = 1..14
    "iso2_star_values": [1, 4, 11, 22, 37, 56, 79, 106, 137, 172, 211, 254, 301, 352],
}


def named_graph(name):
    if name.startswith("TS("):
        a, b, c = map(int, name[3:-1].split(","))
        return g_TS(a, b, c)
    if name.startswith("T("):
        a, b = map(int, name[2:-1].split(","))
        return g_T(a, b)
    if name.startswith("P"):
        return g_path(int(name[1:]))
    if name == "K2":
        return g_path(2)
    if name.endswith("K1") and "+" not in name and not name.startswith("K1"):
        return g_K1s(int(name[:-2]))
    if name.startswith("K1") and "+" not in name:
        return g_star(int(name[2:]) + 1)
    if "+" in name:
        left, right = name.split("+")
        k = int(right[:-2]) if right[:-2] else 1
        return g_union(g_star(int(left[2:]) + 1), g_K1s(k))
    raise ValueError(name)


def exhaustive_pass(A: Audit, tp, edges_of, polys, hb: HBound, timelog):
    stats = {"forests_total": 0, "per_n": {}, "part1": {}, "part3": {}, "part5": {}}
    p1 = stats["part1"]
    p1.update(forests_bitmask=0, forests_subgraph_enum=0, max_edges_enumerated=0, edge_subsets_classified=0)
    p3s = stats["part3"]
    p3s.update(iso3_chain_forests=0, iso3_min_slack_per_n=({}), lemmaH_instances_checked=0, lemmaH_side_failed=0,
               lemmaH_side_failed_orders=set(), lemmaH_min_slack=None, lemmaH_zero_slack_instances=[],
               lemmaH_forests=0, structural_forests=0, star_edge_sets_total=0)
    p5s = stats["part5"]
    p5s.update(Q3_zero=[], p3_zero=[], WR2_failures=[])
    cumulative = 0
    for n in range(1, NMAX_ALL + 1):
        t0 = time.time()
        cnt = 0
        mn = {"Q2": None, "Q3": None, "Q4": None}
        arg = {"Q2": [], "Q3": [], "Q4": []}
        pre3 = {"count": 0, "min": None, "arg": [], "min_ratio": None, "arg_ratio": []}
        pre4 = {"count": 0, "min": None, "arg": [], "min_ratio": None, "arg_ratio": []}
        n_prefix2 = 0
        n_equal_f = 0
        min_slack3 = None
        for comps, P in forests(n, tp):
            cnt += 1
            edges = forest_edge_list(comps, edges_of)
            A.check("core: polynomial of concatenated edge list = enumerated product", indep_poly_from_edges(n, edges) == P, comps)
            st = local_stats(n, edges)
            e, S, T, T4, P4 = st["e"], st["S"], st["T"], st["T4"], st["P4"]
            P5, F, Delta = st["P5_direct"], st["F_vertex"], st["Delta"]
            alpha = len(P) - 1
            p2, p3, p4, p5 = pk(P, 2), pk(P, 3), pk(P, 4), pk(P, 5)
            A.check("forest: e = n - #components", e == n - st["ncomp"], comps)
            A.check("forest: alpha >= ceil(n/2)", alpha >= (n + 1) // 2, comps)
            # closed forms consistency (degree-local): two forms of P5 and F
            A.check("Lemma F: P5 direct double sum = W2/2 - 3T - S", st["P5_closed"] == P5, comps)
            A.check("Lemma F: F vertex form = edge form", 2 * F == st["F_edge2"], comps)
            A.check("Lemma F: sum_v W_v = 2S and sum_v (d_v-1) W_v = 2 P4",
                    sum(st["W"]) == 2 * S and sum((st["deg"][v] - 1) * st["W"][v] for v in range(n)) == 2 * P4, comps)
            # ----------------------------------------------------- Part 1
            if n <= NMAX_BRUTE:
                bm = indep_counts_bitmask(n, edges)
                A.check("Part1: bitmask independent-set counts = core polynomial", bm == P, (comps, bm, P))
                br = subgraph_stats_bruteforce(n, edges)
                p1["forests_bitmask"] += 1
                p1["forests_subgraph_enum"] += 1
                p1["max_edges_enumerated"] = max(p1["max_edges_enumerated"], e)
                p1["edge_subsets_classified"] += cbin(e, 2) + cbin(e, 3) + cbin(e, 4)
                A.check("Part1: no cyclic edge subsets in a forest", br["bad3"] == 0 and br["bad4"] == 0, comps)
                A.check("Part1: subset totals", br["S"] + br["M2"] == cbin(e, 2)
                        and br["T"] + br["P4"] + br["D31"] + br["K2x3"] == cbin(e, 3)
                        and br["T4"] + br["F"] + br["P5"] + br["disc4"] == cbin(e, 4), comps)
                Sb, M2b, Tb, P4b, D31b, T4b, Fb, P5b = (br["S"], br["M2"], br["T"], br["P4"], br["D31"], br["T4"], br["F"], br["P5"])
                dist = br["dist"]
                A.check("Part1: BFS distances: dist1=e, dist2=S, dist3=P4, dist4=P5 (brute)",
                        dist.get(1, 0) == e and dist.get(2, 0) == Sb and dist.get(3, 0) == P4b and dist.get(4, 0) == P5b, comps)
                A.check("Part1: sum of distance counts = pairs in same component",
                        sum(dist.values()) == sum(len(c) * (len(c) - 1) // 2 for c in components_of(n, edges)[1]), comps)
                # inclusion-exclusion formulas with brute-force statistics vs bitmask counts
                f2 = pbinom(n, 2) - e
                f3 = pbinom(n, 3) - e * (n - 2) + Sb
                f4 = pbinom(n, 4) - e * pbinom(n - 2, 2) + (n - 3) * Sb + M2b - P4b - Tb
                f5 = (pbinom(n, 5) - e * pbinom(n - 2, 3) + Sb * pbinom(n - 3, 2) + M2b * (n - 4)
                      - (P4b + Tb) * (n - 4) - D31b + (P5b + Fb + T4b))
                A.check("Part1 Lemma A: p2 formula (brute stats) = bitmask", f2 == pk(bm, 2), (comps, f2, bm))
                A.check("Part1 Lemma A: p3 formula (brute stats) = bitmask", f3 == pk(bm, 3), (comps, f3, bm))
                A.check("Part1 Lemma A: p4 formula (brute stats) = bitmask", f4 == pk(bm, 4), (comps, f4, bm))
                A.check("Part1 Lemma A': p5 formula (brute stats) = bitmask", f5 == pk(bm, 5), (comps, f5, bm))
                # closed forms against brute-force counts
                A.check("Part1 Lemma F: D31 = S(e-2) - 2P4 - 3T (brute)", D31b == Sb * (e - 2) - 2 * P4b - 3 * Tb, comps)
                A.check("Part1 Lemma F: P5 = W2/2 - 3T - S (brute)", 2 * P5b == st["W2"] - 6 * Tb - 2 * Sb, comps)
                A.check("Part1 Lemma F: F = sum_v C(d_v-1,2) W_v (brute)", Fb == st["F_vertex"], comps)
                A.check("Part1: degree-local S, T, T4, P4, M2 = brute", Sb == S and Tb == T and T4b == T4 and P4b == P4 and M2b == cbin(e, 2) - S, comps)
                A.check("Part1: P5 brute = direct double sum", P5b == P5, comps)
            # ----------------------------------------------------- Part 5: Q_r from the core polynomials
            Q2, Q3, Q4 = q_of(P, 2), q_of(P, 3), q_of(P, 4)
            star_tree = (e == n - 1) and (n <= 2 or Delta == n - 1)
            star_edges = (e <= 1) or (Delta == e)
            bound2 = 2 * n * n - 3 * n + 2
            A.check("ISO2 Thm1: Q2 >= 2n^2-3n+2 >= 1", Q2 >= bound2 >= 1, (comps, Q2))
            A.check("ISO2 Thm1: Q2 = 2n^2-3n+2 iff star K_{1,n-1}", (Q2 == bound2) == star_tree, (comps, Q2))
            fval = 2 * (pbinom(n, 2) - e) ** 2 + n * n - 3 * n * (pbinom(n, 3) - e * (n - 2) + pbinom(e, 2))
            A.check("ISO2 (2.1): Q2 - f = 3n(C(e,2) - S)", Q2 - fval == 3 * n * (pbinom(e, 2) - S), comps)
            A.check("ISO2 (i): S <= C(e,2), equality iff edge set is a star", S <= pbinom(e, 2) and ((S == pbinom(e, 2)) == star_edges), comps)
            n_equal_f += (Q2 == fval)
            p3s["star_edge_sets_total"] += star_edges
            wr2 = pk(P, 1) <= 2 * p2
            A.check("ISO2 corollary: WR2 iff 2e <= n(n-2); holds for n >= 4", wr2 == (2 * e <= n * (n - 2)) and (wr2 or n <= 3), comps)
            if not wr2:
                p5s["WR2_failures"].append({"n": n, "e": e, "poly": P})
            A.check("prefix bookkeeping: r=2 in prefix iff alpha>=4; r=3 iff alpha>=6; r=4 iff alpha>=7",
                    (2 <= L_cutoff(alpha) - 1) == (alpha >= 4) and (3 <= L_cutoff(alpha) - 1) == (alpha >= 6)
                    and (4 <= L_cutoff(alpha) - 1) == (alpha >= 7), comps)
            if alpha >= 4:
                n_prefix2 += 1
                A.check("ISO2 corollary: alpha>=4 => n>=4, WR2, Q2>0", n >= 4 and wr2 and Q2 > 0, comps)
            A.check("ISO3 Thm2: Q3 >= 0", Q3 >= 0, (comps, P))
            A.check("ISO3 Thm2: Q3 = 0 iff F in {K_1, K_2} (p2 = 0)", (Q3 == 0) == ((n, e) in ((1, 0), (2, 1))) == (p2 == 0), (comps, P))
            if Q3 == 0:
                p5s["Q3_zero"].append({"n": n, "e": e, "poly": P})
            A.check("ISO4 Thm3: Q4 >= 0", Q4 >= 0, (comps, P))
            A.check("ISO4 Thm3: Q4 = 0 iff p3 = 0 iff alpha <= 2", (Q4 == 0) == (p3 == 0) == (alpha <= 2), (comps, P))
            A.check("ISO4 Thm3: Q4 > 0 for n >= 5", n < 5 or Q4 > 0, comps)
            if p3 == 0:
                p5s["p3_zero"].append({"n": n, "e": e, "degrees": sorted(st["deg"], reverse=True), "poly": P})
            # extremal bookkeeping
            for key, val in (("Q2", Q2), ("Q3", Q3), ("Q4", Q4)):
                if mn[key] is None or val < mn[key]:
                    mn[key], arg[key] = val, [(comps, edges)]
                elif val == mn[key]:
                    arg[key].append((comps, edges))
            if alpha >= 6:
                pre3["count"] += 1
                A.check("ISO3: alpha>=6 => p2 p4 > 0 and ratio > 1", p2 * p4 > 0 and 3 * p3 ** 2 + p2 ** 2 > 4 * p2 * p4, comps)
                ratio = Fraction(3 * p3 ** 2 + p2 ** 2, 4 * p2 * p4)
                if pre3["min"] is None or Q3 < pre3["min"]:
                    pre3["min"], pre3["arg"] = Q3, [(comps, edges)]
                elif Q3 == pre3["min"]:
                    pre3["arg"].append((comps, edges))
                if pre3["min_ratio"] is None or ratio < pre3["min_ratio"]:
                    pre3["min_ratio"], pre3["arg_ratio"] = ratio, [(comps, edges)]
                elif ratio == pre3["min_ratio"]:
                    pre3["arg_ratio"].append((comps, edges))
            if alpha >= 7:
                pre4["count"] += 1
                A.check("ISO4: alpha>=7 => p3 p5 > 0 and ratio > 1", p3 * p5 > 0 and 4 * p4 ** 2 + p3 ** 2 > 5 * p3 * p5, comps)
                ratio = Fraction(4 * p4 ** 2 + p3 ** 2, 5 * p3 * p5)
                if pre4["min"] is None or Q4 < pre4["min"]:
                    pre4["min"], pre4["arg"] = Q4, [(comps, edges)]
                elif Q4 == pre4["min"]:
                    pre4["arg"].append((comps, edges))
                if pre4["min_ratio"] is None or ratio < pre4["min_ratio"]:
                    pre4["min_ratio"], pre4["arg_ratio"] = ratio, [(comps, edges)]
                elif ratio == pre4["min_ratio"]:
                    pre4["arg_ratio"].append((comps, edges))
            # ----------------------------------------------------- Part 3: structural inequalities (Lemma G etc.)
            p3s["structural_forests"] += 1
            R = pbinom(n, 2) - e - S
            A.check("G1: R >= 0 and P4 + P5 <= R", R >= 0 and P4 + P5 <= R, comps)
            A.check("G2: 2F <= (e-3) P4", 2 * F <= (e - 3) * P4, comps)
            A.check("G3: 4 T4 <= (Delta-3) T", 4 * T4 <= (Delta - 3) * T, comps)
            A.check("G4: C(Delta,2) <= S", pbinom(Delta, 2) <= S, comps)
            if e >= 1:
                Dm = hb.Dmax(S)
                Dt = hb.Dt(e, S)
                A.check("G4: Delta <= Delta_max(S) <= Delta_t(S,e)", Delta <= Dm and Fraction(Dm) <= Dt, comps)
                A.check("Lemma C(ii)/G5: sum_{d>=1}(d-1) = 2e - n' = e - c' <= e - 1 (c' >= 1)",
                        st["m"] == 2 * e - st["n_prime"] == e - st["c_prime"] and st["c_prime"] >= 1 and st["m"] <= e - 1, comps)
                w = [d_ - 1 for d_ in st["deg"] if d_ >= 1]
                A.check("G5: sum w^2 = 2S - m, sum w^3 = 6T + m",
                        sum(x * x for x in w) == 2 * S - st["m"] and sum(x ** 3 for x in w) == 6 * T + st["m"], comps)
                if st["m"] >= 1:
                    A.check("G5: Cauchy-Schwarz (2S-m)^2 <= m(6T+m)", (2 * S - st["m"]) ** 2 <= st["m"] * (6 * T + st["m"]), comps)
                else:
                    A.check("G5: m = 0 => S = T = 0", S == 0 and T == 0, comps)
                if e >= 2:
                    A.check("G5: T >= Tmin = 2S(S-e+1)/(3(e-1))", Fraction(T) >= hb.Tmin(e, S), comps)
            if n >= 3:
                A.check("ISO3 Lemma C(i): p2 >= (n-1)(n-2)/2 > 0", p2 >= (n - 1) * (n - 2) // 2 > 0, comps)
            if n >= 7:
                A.check("G6: p3 > 0 for n >= 7, and p3 - S >= (n-1)(n-2)(n-6)/6", p3 > 0 and 6 * (p3 - S) >= (n - 1) * (n - 2) * (n - 6), comps)
            # ISO_3 chain (Lemmas B-E), n >= 5, e >= 1
            if n >= 5 and e >= 1:
                p3s["iso3_chain_forests"] += 1
                K = n * (n - 1) * (n - 6) + 2 * (n + 2) * e
                M = 2 * n * (n - 1) - 4 * e
                A.check("ISO3: M = 4 p2 > 0", M == 4 * p2 and M > 0, comps)
                cost = sum(K * cbin(d_, 2) - M * cbin(d_, 3) for d_ in st["deg"])
                A.check("ISO3 Lemma D: sum_v c(d_v) = K S - M T", cost == K * S - M * T, comps)
                h = lambda d_: Fraction(d_ * (3 * K + 2 * M - M * d_), 6)   # noqa: E731
                A.check("ISO3 Lemma D: c(d) = (d-1) h(d) per vertex", all(K * cbin(d_, 2) - M * cbin(d_, 3) == (d_ - 1) * h(d_) for d_ in st["deg"]), comps)
                phi = Fraction((3 * K + 2 * M) ** 2, 24 * M)
                A.check("ISO3 Lemma D: h(d_v) <= phi for every vertex, phi >= 0", phi >= 0 and all(h(d_) <= phi for d_ in st["deg"]), comps)
                A.check("ISO3 Lemma D: K S - M T <= (e-1) phi", cost <= (e - 1) * phi, comps)
                Cn = Fraction((n - 1) * (n - 2) * (3 * n - 2) ** 2, 48)
                A.check("ISO3 Lemma E: phi(n,e) <= C_n (n >= 5)", phi <= Cn, comps)
                base = (Fraction(n * n * (n - 1) ** 2 * (n + 1), 12) + Fraction(n * (n - 1) * (n - 2) * (n - 9), 6) * e - (n + 1) * e * e)
                dropped = 2 * e ** 3 + 3 * S * S + M * P4
                A.check("ISO3 (B) numerically: Q3 = base + (2e^3 + 3S^2 + M P4) - (KS - MT), dropped >= 0",
                        Q3 == base + dropped - cost and dropped >= 0, comps)
                Bn = base - (e - 1) * Cn
                A.check("ISO3 chain: Q3 >= base - (e-1) phi >= B_n(e)", Q3 >= base - (e - 1) * phi >= Bn, comps)
                slack = Q3 - Bn
                min_slack3 = slack if min_slack3 is None else min(min_slack3, slack)
                if n >= 14:
                    A.check("ISO3 Thm2: B_n(e) > 0 for n >= 14", Bn > 0, comps)
            # ISO_4 Lemma H chain, n >= 7, e >= 2, step by step
            if n >= 7 and e >= 2:
                p3s["lemmaH_forests"] += 1
                Phi0 = polys["Phi0"](n, e, S)
                cT = polys["cT"](n, e, S)
                E = polys["E"](n, e)
                cP = E - (3 * n - 2) * S
                A.check("Lemma B' numerically: Q4 = Phi0 + cT T + cP P4 + 4(T+P4)^2 - 5p3(T4+P5+F)",
                        Q4 == Phi0 + cT * T + cP * P4 + 4 * (T + P4) ** 2 - 5 * p3 * (T4 + P5 + F), comps)
                X1 = Phi0 + cT * T + cP * P4 + 4 * T * T - 5 * p3 * (T4 + P5 + F)
                A.check("H step 1: drop 8 T P4 + 4 P4^2", Q4 >= X1, comps)
                X2 = Phi0 - 5 * p3 * R + (cP + 5 * p3 - Fraction(5, 2) * (e - 3) * p3) * P4 + cT * T + 4 * T * T - 5 * p3 * T4
                A.check("H step 2: P5 <= R - P4 and F <= (e-3)P4/2 (p3 > 0)", X1 >= X2, comps)
                cpe = hb.cPeff(n, e, S)
                X3 = Phi0 - 5 * p3 * R + cpe * P4 - (3 * n - 2) * S * P4 + cT * T + 4 * T * T - 5 * p3 * T4
                A.check("H step 3: identity cP + 5p3 - (5/2)(e-3)p3 = cP_eff - (3n-2)S", X2 == X3, comps)
                X4 = Phi0 - 5 * p3 * R + (2 - 3 * n) * S * R + cT * T + 4 * T * T - 5 * p3 * T4
                if cpe >= 0:
                    A.check("H step 4: drop cP_eff P4 >= 0 and use P4 <= R", X3 >= X4, comps)
                L0 = hb.L0(n, e, S)
                Tm = hb.Tmin(e, S)
                A.check("H: S <= e-2 => Tmin <= 0;  S >= e-1 => Tmin >= 0", (S > e - 2 or Tm <= 0) and (S < e - 1 or Tm >= 0), comps)
                for tag, D in (("Dmax", Fraction(hb.Dmax(S))), ("Dt", hb.Dt(e, S))):
                    A.check("H: Delta <= Delta' (%s)" % tag, Fraction(Delta) <= D, comps)
                    c = hb.c(n, e, S, D)
                    X5 = L0 + 4 * T * T + c * T
                    A.check("H step 5: T4 <= (Delta'-3) T/4 (%s)" % tag, X4 >= X5, comps)
                    val, case, ok = hb.rule(n, e, S, D)
                    if ok:
                        if case == "II":
                            A.check("H case II: c >= 0 => 4T^2 + cT >= 0", 4 * T * T + c * T >= 0, comps)
                            A.check("H case II conclusion: Q4 >= L0", Q4 >= L0 and val == L0, comps)
                        else:
                            A.check("H case I: T >= Tmin >= 0, g(T) >= g(Tmin)", Fraction(T) >= Tm >= 0 and 4 * T * T + c * T >= Tm * (4 * Tm + c), comps)
                            A.check("H case I conclusion: Q4 >= L_I", Q4 >= val and val == L0 + Tm * (4 * Tm + c), comps)
                        p3s["lemmaH_instances_checked"] += 1
                        slack = Q4 - val
                        if p3s["lemmaH_min_slack"] is None or slack < p3s["lemmaH_min_slack"][0]:
                            p3s["lemmaH_min_slack"] = (slack, n, sorted(st["deg"], reverse=True), tag)
                        if slack == 0:
                            p3s["lemmaH_zero_slack_instances"].append({"n": n, "e": e, "S": S, "Delta": Delta, "variant": tag,
                                                                       "is_star": bool(star_tree)})
                    else:
                        p3s["lemmaH_side_failed"] += 1
                        p3s["lemmaH_side_failed_orders"].add(n)
        # ---------------------------------------------------------- per-order records
        A.check("A005195: number of forests of order %d" % n, cnt == A005195[n], cnt)
        stats["forests_total"] += cnt
        cumulative += cnt
        if n == 13:
            A.check("ISO3 doc: 6606 forests with n <= 13", cumulative == 6606, cumulative)
        if n == 14:
            A.check("docs: 15205 forests with n <= 14", cumulative == 15205, cumulative)
            stats["forests_n<=14"] = cumulative
        if n == 16:
            A.check("docs: 85624 forests with n <= 16", cumulative == 85624, cumulative)
        rec = {"forests": cnt, "min_Q2": mn["Q2"], "min_Q3": mn["Q3"], "min_Q4": mn["Q4"],
               "argmin_Q2_unique_star": len(arg["Q2"]) == 1 and canon_forest(n, arg["Q2"][0][1]) == canon_forest(*g_star(n)),
               "forests_with_Q2_equal_f": n_equal_f, "forests_alpha>=4": n_prefix2,
               "forests_alpha>=6": pre3["count"], "forests_alpha>=7": pre4["count"]}
        A.check("ISO2 Thm1: unique Q2 minimizer is the star, value 2n^2-3n+2", rec["argmin_Q2_unique_star"] and mn["Q2"] == 2 * n * n - 3 * n + 2, n)
        if n <= 14:
            A.doc_check("ISO2 doc 2: listed star values 1, 4, 11, ..., 352 for n = 1..14", mn["Q2"] == EXPECTED["iso2_star_values"][n - 1], (n, mn["Q2"]))
        A.check("ISO2 doc: exactly n forests per order with Q2 = f (star edge sets)", n_equal_f == n, (n, n_equal_f))
        A.check("ISO2 json: forests with alpha >= 4 per order", n_prefix2 == EXPECTED["iso2_prefix_counts"][n], (n, n_prefix2))
        if n >= 5:
            p3s["iso3_min_slack_per_n"][n] = str(min_slack3)
            if n >= 14:
                A.doc_check("ISO3 doc 4.5: min over forests (e>=1) of Q3 - B_n(e) is 2 (n = %d)" % n, min_slack3 == 2, min_slack3)
        # minimizer identification against the documents' tables
        def ident(arglist, name):
            return len(arglist) == 1 and canon_forest(n, arglist[0][1]) == canon_forest(*named_graph(name))
        star_poly = [pbinom(n - 1, k) for k in range(n)] + [0]      # p_k of K_{1,n-1} for k >= 2 (p_1 unused here)
        empty_poly = [pbinom(n, k) for k in range(n + 1)] + [0]
        if n in EXPECTED["iso3_global"]:
            val, name = EXPECTED["iso3_global"][n]
            A.doc_check("ISO3 doc 5: global Q3 minimizer n=%d is unique %s with Q3=%d" % (n, name, val), mn["Q3"] == val and ident(arg["Q3"], name), (mn["Q3"], len(arg["Q3"])))
            rec["argmin_Q3"] = name
        if n in EXPECTED["iso3_prefix"]:
            cntp, val, name, rat, rname, q3star, q3empty, rstar, rempty = EXPECTED["iso3_prefix"][n]
            A.doc_check("ISO3 doc 5 table n=%d: alpha>=6 count, min Q3, minimizer, min ratio, ratio minimizer" % n,
                        pre3["count"] == cntp and pre3["min"] == val and ident(pre3["arg"], name)
                        and pre3["min_ratio"] == Fraction(rat) and ident(pre3["arg_ratio"], rname),
                        (pre3["count"], pre3["min"], str(pre3["min_ratio"]), len(pre3["arg"]), len(pre3["arg_ratio"])))
            ratio3 = lambda P: Fraction(3 * pk(P, 3) ** 2 + pk(P, 2) ** 2, 4 * pk(P, 2) * pk(P, 4))   # noqa: E731
            A.doc_check("ISO3 doc 5 table n=%d: Q3(star), Q3(edgeless), ratio(star), ratio(edgeless)" % n,
                        q_of(star_poly, 3) == q3star == (n - 1) ** 2 * (n - 2) ** 2 * n // 12
                        and q_of(empty_poly, 3) == q3empty == n * n * (n - 1) ** 2 * (n + 1) // 12
                        and ratio3(star_poly) == Fraction(rstar) and ratio3(empty_poly) == Fraction(rempty),
                        (q_of(star_poly, 3), q_of(empty_poly, 3), str(ratio3(star_poly)), str(ratio3(empty_poly))))
            rec["prefix_alpha>=6"] = {"count": pre3["count"], "min_Q3": pre3["min"], "min_ratio": str(pre3["min_ratio"])}
        if n in EXPECTED["iso4_global"]:
            val, name, qstar, qempty = EXPECTED["iso4_global"][n]
            A.doc_check("ISO4 doc 8: global Q4 minimizer n=%d is unique %s with Q4=%d; star %d; edgeless %d" % (n, name, val, qstar, qempty),
                        mn["Q4"] == val and ident(arg["Q4"], name)
                        and q_of(star_poly, 4) == qstar and q_of(empty_poly, 4) == qempty, (mn["Q4"], len(arg["Q4"])))
            rec["argmin_Q4"] = name
        if n in EXPECTED["iso4_prefix"]:
            cntp, val, name, rat, rname = EXPECTED["iso4_prefix"][n]
            A.doc_check("ISO4 doc 8 prefix table n=%d: alpha>=7 count, min Q4, minimizer, min ratio, ratio minimizer" % n,
                        pre4["count"] == cntp and pre4["min"] == val and ident(pre4["arg"], name)
                        and pre4["min_ratio"] == Fraction(rat) and ident(pre4["arg_ratio"], rname),
                        (pre4["count"], pre4["min"], str(pre4["min_ratio"]), len(pre4["arg"]), len(pre4["arg_ratio"])))
            ratio4 = lambda P: Fraction(4 * pk(P, 4) ** 2 + pk(P, 3) ** 2, 5 * pk(P, 3) * pk(P, 5))   # noqa: E731
            A.doc_check("ISO4 doc 8: ratio minimizer is edgeless with ratio (n^2-6n+13)/((n-3)(n-4)); star ratio (n^2-8n+20)/((n-4)(n-5)) (n=%d)" % n,
                        pre4["min_ratio"] == ratio4(empty_poly) == Fraction(n * n - 6 * n + 13, (n - 3) * (n - 4))
                        and ratio4(star_poly) == Fraction(n * n - 8 * n + 20, (n - 4) * (n - 5)), n)
            rec["prefix_alpha>=7"] = {"count": pre4["count"], "min_Q4": pre4["min"], "min_ratio": str(pre4["min_ratio"])}
        if n >= 13:
            A.check("ISO4 doc 8: for n >= 13 every forest has alpha >= 7", pre4["count"] == cnt, n)
        stats["per_n"][n] = rec
        timelog.append(("forests n=%d (%d)" % (n, cnt), round(time.time() - t0, 2)))
    A.check("total forests n <= %d is %d" % (NMAX_ALL, sum(A005195[1:NMAX_ALL + 1])), stats["forests_total"] == sum(A005195[1:NMAX_ALL + 1]), stats["forests_total"])
    A.check("ISO4 Thm3: exactly the 7 forests K1, K2, 2K1, P3, K2+K1, P4, 2K2 have p3 = 0",
            sorted((z["n"], z["e"]) for z in p5s["p3_zero"]) == [(1, 0), (2, 0), (2, 1), (3, 1), (3, 2), (4, 2), (4, 3)], p5s["p3_zero"])
    A.check("ISO2 corollary: WR2 fails exactly for K1, K2, P3", sorted((z["n"], z["e"]) for z in p5s["WR2_failures"]) == [(1, 0), (2, 1), (3, 2)], p5s["WR2_failures"])
    A.doc_check("ISO4 doc 5: Lemma H side conditions fail in 341 instances, all with n <= 12 (checked within n <= %d)" % NMAX_ALL,
                max(p3s["lemmaH_side_failed_orders"], default=0) <= 12 and p3s["lemmaH_side_failed"] == 341,
                (sorted(p3s["lemmaH_side_failed_orders"]), p3s["lemmaH_side_failed"]))
    if NMAX_ALL >= 16:
        A.doc_check("ISO4 doc 5 / json: 170783 (forest, Delta'-variant) instances n <= 16 with the side conditions holding",
                    p3s["lemmaH_instances_checked"] == 170783, p3s["lemmaH_instances_checked"])
    A.doc_check("ISO4 doc 5: Lemma H chain tight (slack 0) for K_{1,12} (n=13) with Delta' = Delta_max, and min slack is 0",
                p3s["lemmaH_min_slack"] is not None and p3s["lemmaH_min_slack"][0] == 0
                and any(z["n"] == 13 and z["is_star"] and z["variant"] == "Dmax" for z in p3s["lemmaH_zero_slack_instances"]),
                (p3s["lemmaH_min_slack"], p3s["lemmaH_zero_slack_instances"]))
    p3s["lemmaH_side_failed_orders"] = sorted(p3s["lemmaH_side_failed_orders"])
    if p3s["lemmaH_min_slack"] is not None:
        p3s["lemmaH_min_slack"] = [str(p3s["lemmaH_min_slack"][0])] + list(p3s["lemmaH_min_slack"][1:])
    return stats


def family_closed_form_checks(A: Audit, polys):
    """Closed forms of Q3/Q4 on T(a,b) and Q4 on TS(a,b,c) against exact polynomials of the actual trees."""
    cnt = 0
    for a in range(1, 8):
        for b in range(1, a + 1):
            n, ed = g_T(a, b)
            P = indep_poly_from_edges(n, ed)
            A.check("family: Q3(T(a,b)) closed form", polys["Q3_Tab"](a, b) == q_of(P, 3), (a, b))
            A.check("family: Q4(T(a,b)) closed form", polys["Q4_Tab"](a, b) == q_of(P, 4), (a, b))
            cnt += 1
    for a in range(0, 6):
        for b in range(0, 6):
            for c in range(0, a + 1):
                n, ed = g_TS(a, b, c)
                P = indep_poly_from_edges(n, ed)
                A.check("family: Q4(TS(a,b,c)) closed form", polys["Q4_TS"](a, b, c) == q_of(P, 4), (a, b, c))
                cnt += 1
    return cnt


def iso3_bound_scan(A: Audit):
    def Bn(n, e):
        Cn = Fraction((n - 1) * (n - 2) * (3 * n - 2) ** 2, 48)
        return (Fraction(n * n * (n - 1) ** 2 * (n + 1), 12) + Fraction(n * (n - 1) * (n - 2) * (n - 9), 6) * e
                - (n + 1) * e * e - (e - 1) * Cn)
    out = {"positive_range": [14, N_ISO3_SCAN], "min_per_n_sample": {}, "nonpositive_below_14": {}}
    for n in range(14, N_ISO3_SCAN + 1):
        vals = [Bn(n, e) for e in range(1, n)]
        A.check("ISO3 Thm2 scan: B_n(e) > 0 for all 1 <= e <= n-1", min(vals) > 0, n)
        A.check("ISO3 Thm2 scan: min B_n(e) attained at an endpoint (concavity)", min(vals) == min(vals[0], vals[-1]), n)
        if n <= 20 or n % 20 == 0:
            out["min_per_n_sample"][n] = str(min(vals))
    for n in range(5, 14):
        mn = min(Bn(n, e) for e in range(1, n))
        out["nonpositive_below_14"][n] = str(mn)
        A.check("ISO3 doc: min_e B_n(e) <= 0 for 5 <= n <= 13", mn <= 0, n)
    A.check("ISO3 doc: min_e B_n(e) at n=14,15,16 is 130, 65849/24, 6970",
            min(Bn(14, e) for e in range(1, 14)) == 130 and min(Bn(15, e) for e in range(1, 15)) == Fraction(65849, 24)
            and min(Bn(16, e) for e in range(1, 16)) == 6970)
    return out


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------


def main():
    t_start = time.time()
    timelog = []
    A = Audit()
    hashes = {f: sha256_of(os.path.join(HERE, f)) for f in AUDITED_FILES}
    hashes["audit_iso234_independent.py (this script)"] = sha256_of(os.path.abspath(__file__))
    with open(os.path.join(HERE, "results", "iso2_iso3.json")) as fh:
        json23 = json.load(fh)
    with open(os.path.join(HERE, "results", "iso4.json")) as fh:
        json4 = json.load(fh)
    A.named_check("audited script hashes match the ones quoted in the documents / JSON",
                  hashes["iso2_all_forests_proof.py"] == json23["iso2"]["script_sha256"] == "3c8c218d060c3810d55df8d8c848807850e83b4a7ae4ea96ab38c935409d8ca1"
                  and hashes["iso3_subgraph_expansion.py"] == json23["iso3"]["script_sha256"] == "5d5ba942c17985a1646d9fb415c889b8f0821434e22066099a2de706adc59e42"
                  and hashes["iso4_subgraph_expansion.py"] == json4["script_sha256"] == "86afd13c841e4fdd5bd2372620931bd0bb0a0daa4836747dd805737913913d4e")

    # Part 2 first (its polynomials feed Parts 3 and 4)
    t0 = time.time()
    strings, polys, sym = symbolic_audit(A, json23, json4)
    timelog.append(("Part 2 symbolic", round(time.time() - t0, 2)))
    print("Part 2: %d named symbolic checks, failures so far: %d" % (len(A.named), len(A.failures)))
    hb = HBound(polys)

    # Parts 1, 3, 5
    t0 = time.time()
    tp, edges_of = load_trees(NMAX_ALL)
    exh = exhaustive_pass(A, tp, edges_of, polys, hb, timelog)
    fam = family_closed_form_checks(A, polys)
    timelog.append(("Parts 1/3/5 forests n<=%d" % NMAX_ALL, round(time.time() - t0, 2)))
    print("Parts 1/3/5: %d forests; bitmask+subgraph enumeration on %d forests (n<=%d); Lemma H instances %d, side failures %d; failures so far: %d"
          % (exh["forests_total"], exh["part1"]["forests_bitmask"], NMAX_BRUTE, exh["part3"]["lemmaH_instances_checked"],
             exh["part3"]["lemmaH_side_failed"], len(A.failures)))

    # Part 4(a): integer scans
    t0 = time.time()
    scan1314 = iso4_integer_scan(A, hb, 13, 14, require_positive=False)
    for n_, exp_np in ((13, 72), (14, 33)):
        r = scan1314[n_]
        A.doc_check("ISO4 doc 5: n=%d side conditions hold at every integer point, both variants" % n_,
                    r["Dmax"]["side_condition_failures"] == 0 and r["Dt"]["side_condition_failures"] == 0, r)
        A.doc_check("ISO4 doc 5: n=%d bound <= 0 at %d of the %d (e,S,Delta') points" % (n_, exp_np, 2 * r["Dmax"]["points"]),
                    r["Dmax"]["nonpositive_bounds"] + r["Dt"]["nonpositive_bounds"] == exp_np
                    and 2 * r["Dmax"]["points"] == {13: 594, 14: 752}[n_], r)
    scan = iso4_integer_scan(A, hb, N_SCAN_LO, N_SCAN_HI, require_positive=True, cross_check_polys=True)
    doc_table = {15: (Fraction(3022347, 169), 14, 30, 377, 91, 468), 16: (Fraction(4088618, 49), 15, 36, 469, 105, 574),
                 17: (Fraction(205550), 16, 45, 575, 120, 695)}
    for n_, (val, e_, S_, cI, cII, npts) in doc_table.items():
        r = scan[n_]["Dmax"]
        A.doc_check("ISO4 doc 6(b) table n=%d: %d points, min bound %s at e=%d, S=%d (case I), cases %d/%d" % (n_, npts, val, e_, S_, cI, cII),
                    r["points"] == npts and Fraction(r["min_bound"]) == val and r["min_at"] == (e_, S_, "I") and r["case_I"] == cI and r["case_II"] == cII, r)
    A.doc_check("ISO4 doc 6(b): cross-check minimum 416074.7 at n=18 and 3.86e8 at n=40",
                abs(float(Fraction(scan[18]["Dmax"]["min_bound"])) - 416074.7) < 0.05 and abs(scan[40]["Dmax"]["min_bound_float"] / 3.86e8 - 1) < 5e-3,
                (scan[18]["Dmax"]["min_bound"], scan[40]["Dmax"]["min_bound"]))
    A.check("ISO4 scan: minimum bound increases with n for 15 <= n <= 40 (Dmax variant)",
            all(scan[n_]["Dmax"]["min_bound_float"] < scan[n_ + 1]["Dmax"]["min_bound_float"] for n_ in range(N_SCAN_LO, N_SCAN_HI)))
    # Literal Lemma I sentence ("Then cP_eff > 0, c > 0, L0 > 0 for S <= e-1 and L_I > 0 for S >= e-1", for all
    # n >= 15, with Delta' = Delta_max(S) in part (b)): c > 0 is checked at every integer point 15 <= n <= 17.
    with open(os.path.join(HERE, "ISO4_ALL_FORESTS.md"), encoding="utf-8") as fh:
        doc4_text = fh.read()
    lemmaI = {"sentence_checked": LEMMA_I_SENTENCE, "sentence_present_in_document": LEMMA_I_SENTENCE in doc4_text}
    for tag in ("Dmax", "Dt"):
        lemmaI[tag] = {n_: {k: scan[n_][tag][k] for k in ("points_with_c<=0", "points_with_c<=0_in_case_II", "min_c", "min_c_at",
                                                        "min_8Tmin+c_where_c<=0", "points_with_c<=0_list(e,S,c,8Tmin+c)")}
                       for n_ in range(N_SCAN_LO, N1)}
        lemmaI[tag]["total_points_with_c<=0_for_15<=n<=17"] = sum(scan[n_][tag]["points_with_c<=0"] for n_ in range(N_SCAN_LO, N1))
        lemmaI[tag]["points_with_c<=0_for_n>=18"] = sum(scan[n_][tag]["points_with_c<=0"] for n_ in range(N1, N_SCAN_HI + 1))
        A.check("ISO4 Lemma I: every integer point 15 <= n <= 17 with c <= 0 is a case-I point (S >= e-1) with 8 Tmin + c > 0 (%s)" % tag,
                all(scan[n_][tag]["points_with_c<=0_in_case_II"] == 0
                    and (scan[n_][tag]["points_with_c<=0"] == 0 or Fraction(scan[n_][tag]["min_8Tmin+c_where_c<=0"]) > 0)
                    for n_ in range(N_SCAN_LO, N1)), lemmaI[tag])
    if lemmaI["sentence_present_in_document"]:
        A.doc_check("ISO4 doc 6, Lemma I as stated ('Then cP_eff > 0, c > 0, ...' for all n >= 15, Delta' = Delta_max in (b)): "
                    "c > 0 at every integer point 15 <= n <= 17",
                    lemmaI["Dmax"]["total_points_with_c<=0_for_15<=n<=17"] == 0,
                    "c <= 0 at %d integer points (e,S) with Delta'=Delta_max(S) (%d with Delta_t), e.g. n=15, e=14, S=91 (star K_{1,14}): "
                    "c = %s; at all of them S >= e-1 and the Lemma H side condition 8Tmin + c >= 0 holds and the bound L_I > 0, "
                    "so Theorem 3 is unaffected; only the sentence overstates Lemma I(b)"
                    % (lemmaI["Dmax"]["total_points_with_c<=0_for_15<=n<=17"], lemmaI["Dt"]["total_points_with_c<=0_for_15<=n<=17"],
                       scan[15]["Dmax"]["min_c"]))
    else:
        lemmaI["note"] = "sentence not found in ISO4_ALL_FORESTS.md (document reworded?) - literal check not applicable"
    iso3scan = iso3_bound_scan(A)
    timelog.append(("Part 4a integer scans", round(time.time() - t0, 2)))
    print("Part 4a: ISO4 scan %d <= n <= %d done; ISO3 B_n(e) scan up to n=%d; failures so far: %d" % (N_SCAN_LO, N_SCAN_HI, N_ISO3_SCAN, len(A.failures)))

    # Part 4(b): interval certificates
    t0 = time.time()
    controls = certificate_controls(A)
    cert = interval_certificates(A, sym, N1)
    # how far down the same certificate reaches (information only, not a check)
    reach = {}
    for N in (15, 16, 17):
        Ax = Audit()
        r = interval_certificates(Ax, sym, N, record_checks=False, budget=1500)
        reach[N] = {"all_certified": r["all_certified"], "total_boxes": r["total_boxes"],
                    "failed": [(name, c["k"], c["result"].get("status"), c["result"].get("witness"))
                               for name, it in r["items"].items() for c in it["coefficients"] if not c["result"]["ok"]]}
    timelog.append(("Part 4b certificates", round(time.time() - t0, 2)))
    print("Part 4b: certificate n >= %d all_certified=%s, boxes=%d; failures so far: %d" % (N1, cert["all_certified"], cert["total_boxes"], len(A.failures)))

    runtime = time.time() - t_start
    ok = not A.failures
    math_ok = A.nfail_math == 0
    facs_used = sorted({f for it in cert["items"].values() for c in it["coefficients"] for f in c["factors_divided_out"]})
    reach_failed = sorted({(name, k) for N, r in reach.items() for name, k, _, _ in r["failed"]})
    statement = (
        "CERTIFICATE (real n >= %d).  Let Pi_1 = 144(e-1)^2(2e-1) L_I with S = (e-1) + sigma(e-1)(e-2)/2, "
        "Pi_2 = 144 L0 with S = sigma(e-1), Pi_3/Pi_4 = 24(2e-1) c at S = C(e,2) / S = 0, Pi_5/Pi_6 = 2 cP_eff at S = C(e,2) / S = 0, "
        "all derived here from Q_4 = 4p_4^2 + p_3^2 - 5p_3p_5 (Lemmas A, A', F) with c taken at Delta' = Delta_t(S,e); "
        "substitute n = %d + s, e = 2 + t(n-3).  Each Pi_i = sum_k c_{i,k}(t,sigma) s^k with c_{i,k} in Q[t,sigma] (degrees in s: %s).  "
        "Exact rational interval arithmetic (Horner enclosure and mean-value form on each box, exact midpoint/corner evaluation, adaptive "
        "bisection, %d boxes in total) certifies c_{i,0} > 0 on [0,1]^2 and c_{i,k} >= 0 on [0,1]^2 for k >= 1 (for the coefficients "
        "divisible by the boundary factors %s the cofactor is certified >= 0, which suffices as these factors are >= 0 on [0,1]^2; "
        "every cofactor was in fact also certified > 0).  Hence Pi_i(s,t,sigma) >= c_{i,0}(t,sigma) > 0 for all s >= 0, i.e. for every real "
        "n >= %d, every real e in [2, n-1] and every S in the stated range; as the multipliers are positive for e >= 2, c is concave and "
        "cP_eff affine in S: for all real n >= %d, 2 <= e <= n-1, 0 <= S <= C(e,2) one has cP_eff > 0, c(Delta_t) > 0 (hence c(Delta_max) > 0), "
        "L0 > 0 for S <= e-1 and L_I(Delta_t) > 0 (hence L_I(Delta_max) > 0) for S >= e-1.  Together with Lemma H (chain re-verified here "
        "step by step on every forest n <= %d) this gives Q_4 > 0 for every forest with n >= %d and e >= 2; e in {0,1} is A(n,e) > 0.  "
        "The certificate does not cover 15 <= n <= 17 (covered here by the exact integer scan with Delta' = Delta_max and Delta_t) nor n <= 14 "
        "(exhaustive).  Information only: rerun with n = 15 + s, 16 + s, 17 + s the same method certifies every polynomial except %s, where "
        "c(Delta_t) is genuinely negative at t = 1 (e = n-1), S = C(e,2) for n = 15, 16, 17 (exact witnesses recorded)."
        % (N1, N1, {k: v["degree_in_s"] for k, v in cert["items"].items()}, cert["total_boxes"], facs_used, N1, N1, NMAX_ALL, N1, reach_failed)
    ) if cert["all_certified"] else "CERTIFICATE INCOMPLETE: see items with ok = false (tightest lower bounds reported)."
    doc_discrepancies = [f for f in A.failures if f["kind"] == "document_statement"]
    record = {
        "verdict": PASS_MARKER if ok else "FAIL",
        "verdict_explanation": ("every check of both kinds passed" if ok else
                                ("all %d mathematical checks passed (theorems, lemmas, identities, inequalities, Lemma H chain, positivity, "
                                 "exhaustive bases); the verdict is FAIL only because %d literally-checked document statement(s) are overstated, "
                                 "see document_statement_discrepancies" % (A.nchecks - A.nfail_doc, A.nfail_doc)) if math_ok else
                                "a mathematical check failed, see first_discrepancy"),
        "mathematical_checks_all_pass": math_ok,
        "document_statement_discrepancies": doc_discrepancies,
        "first_discrepancy": None if ok else A.failures[0],
        "all_failures(capped_200)": A.failures,
        "total_checks_evaluated": A.nchecks,
        "failed_checks": {"math": A.nfail_math, "document_statement": A.nfail_doc},
        "runtime_seconds": round(runtime, 2),
        "timing": timelog,
        "sha256": hashes,
        "ranges": {"exhaustive_nmax_checked": NMAX_ALL, "exhaustive_nmax_needed_by_proofs": NMAX_PROOF, "bruteforce_nmax": NMAX_BRUTE,
                   "iso4_scan": [N_SCAN_LO, N_SCAN_HI], "iso3_scan_nmax": N_ISO3_SCAN, "certificate_N1": N1,
                   "box_budget_per_coefficient": BOX_BUDGET},
        "part1_formulas": exh["part1"],
        "part2_identities": {"named_checks": A.named, "derived_expressions": strings},
        "part3_structural_and_chain": exh["part3"],
        "part3_iso4_integer_points_n13_14": scan1314,
        "part4a_iso4_integer_scan_15_to_40": scan,
        "part4a_lemma_I_c_sign_15_to_17": lemmaI,
        "part4a_iso3_B_n_scan": iso3scan,
        "part4b_certificate_n>=18": cert,
        "part4b_certificate_statement": statement,
        "part4b_certificate_controls": controls,
        "part4b_certificate_reach_below_18(information_only)": reach,
        "part5_exhaustive": {"forests_total_n<=%d" % NMAX_ALL: exh["forests_total"], "forests_n<=14": exh.get("forests_n<=14"),
                             "per_n": exh["per_n"], "Q3_zero": exh["part5"]["Q3_zero"],
                             "Q4_zero_iff_p3_zero_cases": exh["part5"]["p3_zero"], "WR2_failures": exh["part5"]["WR2_failures"],
                             "family_closed_form_trees_checked": fam},
        "notes": [
            "Independent of the producer scripts: different p_k method (bitmask DP), statistics by direct edge-subset classification, "
            "own sympy derivation compared with the typed document displays and the JSON strings, own Lemma H evaluation, "
            "interval-arithmetic certificate instead of Bernstein coefficients, Taylor-shift certificate for ISO_3 endpoints.",
            "Exhaustive range checked: n <= %d (the proofs need n <= %d); Part 1 brute force: n <= %d." % (NMAX_ALL, NMAX_PROOF, NMAX_BRUTE),
            "Check kinds: 'math' = used by the proofs; 'document_statement' = a sentence/table of the documents checked literally.",
        ],
    }
    os.makedirs(os.path.dirname(RESULTS_PATH), exist_ok=True)
    with open(RESULTS_PATH, "w") as fh:
        json.dump(record, fh, indent=1, sort_keys=False, default=str)
    print("results written to", RESULTS_PATH)
    print("checks evaluated: %d (failed: %d mathematical, %d document-statement), runtime %.1f s"
          % (A.nchecks, A.nfail_math, A.nfail_doc, runtime))
    if ok:
        print(PASS_MARKER)
    else:
        print("FAIL: first discrepancy:", json.dumps(A.failures[0], default=str))
        print("total failures recorded: %d" % len(A.failures))
        print("mathematical checks all pass: %s" % math_ok)


if __name__ == "__main__":
    main()
