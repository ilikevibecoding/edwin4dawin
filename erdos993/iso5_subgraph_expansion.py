#!/usr/bin/env python3
"""
ISO_5 for forests:  Q_5 = 5 p_5^2 + p_4^2 - 6 p_4 p_6 >= 0  (attempt; exact arithmetic only).

Contents (see ISO5_ALL_FORESTS.md for the statements and proofs):

  Lemma A''  p_6 by inclusion-exclusion over edge subsets A with |V(A)| <= 6 (all acyclic
             edge-subgraphs on <= 6 vertices: K_2 | P_3, 2K_2 | K_{1,3}, P_4, P_3+K_2, 3K_2 |
             P_5, fork, K_{1,4}, P_4+K_2, K_{1,3}+K_2, P_3+P_3 | the six 6-vertex trees
             P_6, K_{1,5}, DS22 (double star S(2,2)), Y42 (spider with legs 2,1,1,1),
             C322 (caterpillar, degree-3 vertex adjacent to two leaves), C232 (degree-3 vertex
             adjacent to one leaf)).                                           -> PROVED
  Closed forms  every 6-vertex statistic is degree/edge-local (W_v, e2_v sums)   -> PROVED
  Lemma B''  exact sympy grouping of Q_5                                         -> PROVED
  Lemma G''  structural inequality toolbox (distance counting incl. P6, P4 <= S + 3T,
             F <= (e-3)P4/2, Delta <= Delta_t, T <= (Delta_t-2)S/3, T >= Tmin, tangent
             bounds T4 <= T4up, T5 >= T5lo, p_4 >= p4lo)                          -> PROVED
  Lemma H''  conditional lower bound Q_5 >= L(n,e,S,T,P4) under side conditions     -> PROVED
  Theorem D  Q_5 >= 0 for every forest with Delta <= 2 (Newton + real-rootedness)  -> PROVED
  Exhaustive base  Q_5 >= 0 for every forest with n <= NMAX_EXH                    -> PROVED
  Closing the analytic chain: min of L over the relaxed region is NEGATIVE for
             n = 20..40 (the 6-vertex-tree terms resist)                          -> EXPLORED

Every assertion in this file is exact (ints / Fraction / sympy).  Runtime ~5 min single core.
Writes results/iso5.json.  Never prints PASS_EXACT_ISO5_ALL_FORESTS unless the full statement
is proved (it is not: see status in the JSON).
"""
import sys, os, time, json, hashlib
from fractions import Fraction
from itertools import combinations, islice
from math import factorial

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sympy as sp
from forest_indep import (forests, tree_polys_upto, tree_level_sequences, level_sequence_to_parent,
                          parent_to_edges, indep_poly_from_edges, prufer_to_edges)

NMAX_STATS = 14      # all statistics + Lemma A''/B''/G''/H'' checks on every forest n <= NMAX_STATS
NMAX_BRUTE = 10      # brute-force edge-subset / distance / independent-set cross-checks
NMAX_EXH = 20        # exhaustive exact Q_5 >= 0 base (all forests n <= NMAX_EXH)
SCAN_NS = (20, 25, 30, 40, 60)

T0 = time.time()


def log(msg):
    print("[%7.1fs] %s" % (time.time() - T0, msg))
    sys.stdout.flush()


def binom(a, k):
    if k < 0:
        return 0
    r = 1
    for i in range(k):
        r *= a - i
    return r // factorial(k)


def pk(p, k):
    return p[k] if k < len(p) else 0


def Q5_of(P):
    return 5 * pk(P, 5) ** 2 + pk(P, 4) ** 2 - 6 * pk(P, 4) * pk(P, 6)


# ---------------------------------------------------------------------------
# statistics from an edge list (all exact integers)
# ---------------------------------------------------------------------------

def stats_from_edges(n, edges):
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
    T5 = sum(binom(x, 5) for x in deg)
    P4 = sum((deg[a] - 1) * (deg[b] - 1) for a, b in edges)
    W = [sum(deg[a] - 1 for a in adj[v]) for v in range(n)]          # W_v = sum_{a~v} (d_a - 1)
    W2 = sum(w * w for w in W)
    e2 = []                                                            # e2_v = sum_{{a,b} subset N(v)} (d_a-1)(d_b-1)
    for v in range(n):
        s2 = sum((deg[a] - 1) ** 2 for a in adj[v])
        e2.append((W[v] * W[v] - s2) // 2)
    P5 = sum(e2)
    F = sum(binom(deg[v] - 1, 2) * W[v] for v in range(n))
    P6 = sum((W[c] - deg[d] + 1) * (W[d] - deg[c] + 1) for c, d in edges)
    DS22 = sum(binom(deg[a] - 1, 2) * binom(deg[b] - 1, 2) for a, b in edges)
    Y42 = sum(binom(deg[v] - 1, 3) * W[v] for v in range(n))
    C322 = sum(binom(deg[v] - 1, 2) * sum(W[c] - deg[v] + 1 for c in adj[v]) for v in range(n))
    C232 = sum((deg[v] - 2) * e2[v] for v in range(n))
    nprime = sum(1 for x in deg if x > 0)
    Delta = max(deg) if n else 0
    return dict(deg=deg, adj=adj, e=e, S=S, T=T, T4=T4, T5=T5, P4=P4, W=W, W2=W2, e2=e2, P5=P5, F=F,
                P6=P6, DS22=DS22, Y42=Y42, C322=C322, C232=C232, nprime=nprime, mu=2 * e - nprime, Delta=Delta,
                Z=P6 + T5 + DS22 + Y42 + C322 + C232)


def forest_edges(comps, seq_cache):
    edges = []
    off = 0
    for k, i in comps:
        par = level_sequence_to_parent(seq_cache(k, i))
        edges.extend((off + a, off + b) for a, b in parent_to_edges(par))
        off += k
    return edges


class SeqCache:
    """level sequences of trees of order k, materialised for small k, islice for large k."""
    def __init__(self, kfull):
        self.full = [None] + [list(tree_level_sequences(k)) for k in range(1, kfull + 1)]

    def __call__(self, k, i):
        if k < len(self.full):
            return self.full[k][i]
        return next(islice(tree_level_sequences(k), i, None))


# ---------------------------------------------------------------------------
# closed-form counts of the disconnected / 5-edge patterns and the p_k formulas
# ---------------------------------------------------------------------------

def derived_counts(st):
    e, S, T, P4, P5, F, T4 = st['e'], st['S'], st['T'], st['P4'], st['P5'], st['F'], st['T4']
    return dict(
        M2=binom(e, 2) - S,                                      # 2K_2
        D31=S * (e - 2) - 2 * P4 - 3 * T,                        # P_3 + K_2
        M3=binom(e, 3) - S * (e - 2) + P4 + 2 * T,               # 3K_2
        D41=P4 * (e - 3) - 2 * P5 - 2 * F,                       # P_4 + K_2
        DTK=T * (e - 3) - 4 * T4 - F,                            # K_{1,3} + K_2
        D33=binom(S, 2) - 3 * T - P4 - 3 * T4 - F - P5,          # P_3 + P_3
    )


def p4_formula(n, st):
    c = derived_counts(st)
    return binom(n, 4) - st['e'] * binom(n - 2, 2) + st['S'] * (n - 3) + c['M2'] - (st['T'] + st['P4'])


def p5_formula(n, st):
    c = derived_counts(st)
    return (binom(n, 5) - st['e'] * binom(n - 2, 3) + st['S'] * binom(n - 3, 2) + c['M2'] * (n - 4)
            - (st['T'] + st['P4']) * (n - 4) - c['D31'] + (st['P5'] + st['F'] + st['T4']))


def p6_formula(n, st):
    """Lemma A'': p_6 = sum_{A acyclic, |V(A)| <= 6} (-1)^{|A|} C(n - |V(A)|, 6 - |V(A)|)."""
    c = derived_counts(st)
    return (binom(n, 6)
            - st['e'] * binom(n - 2, 4)
            + st['S'] * binom(n - 3, 3) + c['M2'] * binom(n - 4, 2)
            - (st['T'] + st['P4']) * binom(n - 4, 2) - c['D31'] * (n - 5) - c['M3']
            + (st['P5'] + st['F'] + st['T4']) * (n - 5) + c['D41'] + c['DTK'] + c['D33']
            - st['Z'])


# ---------------------------------------------------------------------------
# brute force cross-checks (small n)
# ---------------------------------------------------------------------------

# isomorphism signatures of acyclic edge-subgraphs on <= 6 vertices: sorted tuple of per-component
# degree sequences (this separates all types except C322 / C232, which share (3,2,2,1,1,1))
SIG = {
    'e': ((1, 1),), 'S': ((2, 1, 1),), 'M2': ((1, 1), (1, 1)),
    'T': ((3, 1, 1, 1),), 'P4': ((2, 2, 1, 1),), 'D31': ((1, 1), (2, 1, 1)), 'M3': ((1, 1), (1, 1), (1, 1)),
    'P5': ((2, 2, 2, 1, 1),), 'F': ((3, 2, 1, 1, 1),), 'T4': ((4, 1, 1, 1, 1),),
    'D41': ((1, 1), (2, 2, 1, 1)), 'DTK': ((1, 1), (3, 1, 1, 1)), 'D33': ((2, 1, 1), (2, 1, 1)),
    'P6': ((2, 2, 2, 2, 1, 1),), 'T5': ((5, 1, 1, 1, 1, 1),), 'DS22': ((3, 3, 1, 1, 1, 1),),
    'Y42': ((4, 2, 1, 1, 1, 1),), 'C3xx': ((3, 2, 2, 1, 1, 1),),
}


def brute_edge_subsets(edges):
    """Classify every edge subset with <= 5 edges and <= 6 vertices by isomorphism signature."""
    counts = {}
    for k in range(1, 6):
        for sub in combinations(edges, k):
            verts = set()
            deg = {}
            for a, b in sub:
                verts.update((a, b))
                deg[a] = deg.get(a, 0) + 1
                deg[b] = deg.get(b, 0) + 1
            if len(verts) > 6:
                continue
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
            comps = {}
            for v in verts:
                comps.setdefault(find(v), []).append(v)
            sig = tuple(sorted(tuple(sorted((deg[v] for v in cv), reverse=True)) for cv in comps.values()))
            counts[sig] = counts.get(sig, 0) + 1
    return counts


def brute_C322_C232(edges):
    c322 = c232 = 0
    for sub in combinations(edges, 5):
        verts = set()
        deg = {}
        for a, b in sub:
            verts.update((a, b))
            deg[a] = deg.get(a, 0) + 1
            deg[b] = deg.get(b, 0) + 1
        if len(verts) != 6 or sorted(deg.values(), reverse=True) != [3, 2, 2, 1, 1, 1]:
            continue
        v3 = [v for v in verts if deg[v] == 3][0]
        nleaf = sum(1 for a, b in sub if (a == v3 and deg[b] == 1) or (b == v3 and deg[a] == 1))
        if nleaf == 2:
            c322 += 1
        else:
            assert nleaf == 1
            c232 += 1
    return c322, c232


def brute_indep_count(n, edges, k):
    nb = [0] * n
    for a, b in edges:
        nb[a] |= 1 << b
        nb[b] |= 1 << a
    cnt = 0
    for sub in combinations(range(n), k):
        mask = 0
        ok = True
        for v in sub:
            if nb[v] & mask:
                ok = False
                break
            mask |= 1 << v
        cnt += ok
    return cnt


def brute_distance_pairs(n, adj, dmax=5):
    """number of vertex pairs at distance exactly k, k = 1..dmax (BFS from every vertex)."""
    cnt = [0] * (dmax + 1)
    for s in range(n):
        dist = [-1] * n
        dist[s] = 0
        q = [s]
        for v in q:
            for w in adj[v]:
                if dist[w] < 0:
                    dist[w] = dist[v] + 1
                    q.append(w)
        for v in range(s + 1, n):
            if 0 < dist[v] <= dmax:
                cnt[dist[v]] += 1
    return cnt


# ---------------------------------------------------------------------------
# symbolic part: Lemma B'' grouping and the Chain lower bound (Lemma H'')
# ---------------------------------------------------------------------------

n, e, S, T, P4, T4, P5, F, Z, mu = sp.symbols('n e S T P4 T4 P5 F Z mu')
d, ds, D = sp.symbols('d dstar D')


def Cb(z, k):
    return sp.expand(sp.prod([z - i for i in range(k)]) / sp.factorial(k))


def build_symbolic():
    M2 = Cb(e, 2) - S
    D31 = S * (e - 2) - 2 * P4 - 3 * T
    M3 = Cb(e, 3) - S * (e - 2) + P4 + 2 * T
    D41 = P4 * (e - 3) - 2 * P5 - 2 * F
    DTK = T * (e - 3) - 4 * T4 - F
    D33 = Cb(S, 2) - 3 * T - P4 - 3 * T4 - F - P5
    Y = P5 + F + T4
    X = P4 + T
    p4 = sp.expand(Cb(n, 4) - e * Cb(n - 2, 2) + (n - 3) * S + M2 - X)
    p5 = sp.expand(Cb(n, 5) - e * Cb(n - 2, 3) + S * Cb(n - 3, 2) + M2 * (n - 4) - X * (n - 4) - D31 + Y)
    p6 = sp.expand(Cb(n, 6) - e * Cb(n - 2, 4) + S * Cb(n - 3, 3) + M2 * Cb(n - 4, 2) - X * Cb(n - 4, 2)
                   - D31 * (n - 5) - M3 + Y * (n - 5) + D41 + DTK + D33 - Z)
    Q5 = sp.expand(5 * p5 ** 2 + p4 ** 2 - 6 * p4 * p6)
    gens = (T, P4, T4, P5, F, Z)
    poly = sp.Poly(Q5, *gens)
    c = {m: poly.coeff_monomial(sp.prod([g ** k for g, k in zip(gens, m)])) for m in poly.monoms()}
    unit = lambda j: tuple(1 if i == j else 0 for i in range(6))
    Phi0 = sp.expand(c[(0,) * 6])
    cT, cP, cT4, cP5, cF, cZ = [sp.expand(c[unit(j)]) for j in range(6)]
    # structure of Q_5 (Lemma B''): read the quadratic part off the polynomial
    A4 = sp.expand(p4.subs({P4: 0, T: 0}))

    def cm(**kw):
        mono = tuple(kw.get(str(g), 0) for g in gens)
        return sp.expand(c.get(mono, 0))
    quadTP = cm(T=2) * T ** 2 + cm(T=1, P4=1) * T * P4 + cm(P4=2) * P4 ** 2
    cP5_eff = cP5 + cm(T=1, P5=1) * T + cm(P4=1, P5=1) * P4
    cF_eff = cF + cm(T=1, F=1) * T + cm(P4=1, F=1) * P4
    cT4_eff = cT4 + cm(T=1, T4=1) * T + cm(P4=1, T4=1) * P4
    grouped = Phi0 + cT * T + cP * P4 + quadTP + cP5_eff * P5 + cF_eff * F + cT4_eff * T4 + 5 * Y ** 2 + 6 * p4 * Z
    assert sp.expand(Q5 - grouped) == 0, "Lemma B'' grouping identity failed"
    assert sp.expand(cZ - 6 * A4) == 0
    # explicit forms of the quadratic coefficients
    assert sp.expand(quadTP - ((6 * e + 2 * n ** 2 - 25 * n + 48) * T ** 2 + 2 * (6 * e + 2 * n ** 2 - 23 * n + 37) * P4 * T
                               + (6 * e + 2 * n ** 2 - 21 * n + 31) * P4 ** 2)) == 0
    assert sp.expand(cP5_eff - (cP5 - 2 * (2 * n - 11) * T - 4 * (n - 3) * P4)) == 0
    assert sp.expand(cF_eff - (cF - 4 * (n - 4) * T - 2 * (2 * n - 3) * P4)) == 0
    assert sp.expand(cT4_eff - (cT4 - 2 * (2 * n + 1) * T - 4 * (n + 3) * P4)) == 0
    # sanity closed forms
    m = sp.Symbol('m')
    Q5_edgeless = sp.factor(Phi0.subs({e: 0, S: 0}))
    assert sp.expand(Q5_edgeless - Cb(n, 4) ** 2 * (n + 1) / 5) == 0
    star = {n: m + 1, e: m, S: Cb(m, 2), T: Cb(m, 3), P4: 0, T4: Cb(m, 4), P5: 0, F: 0, Z: Cb(m, 5)}
    Q5_star = sp.factor(Q5.subs(star))
    assert sp.expand(Q5_star - m ** 2 * (m - 1) ** 2 * (m - 2) ** 2 * (m - 3) ** 2 * (m + 1) / 2880) == 0
    return dict(Q5=Q5, p4=p4, p5=p5, p6=p6, Phi0=Phi0, cT=cT, cP=cP, cT4=cT4, cP5=cP5, cF=cF, A4=A4,
                quadTP=sp.expand(quadTP), cP5_eff=cP5_eff, cF_eff=cF_eff, cT4_eff=cT4_eff,
                Q5_edgeless=Q5_edgeless, Q5_star=Q5_star)


def tangent_coeffs(target, ansatz):
    """solve target(d) - al (d-1) - be C(d,2) - ga C(d,3) == (d-1) * ansatz(d) identically in d."""
    al, be, ga = sp.symbols('al be ga')
    expr = sp.expand(target - al * (d - 1) - be * Cb(d, 2) - ga * Cb(d, 3) - (d - 1) * ansatz)
    sol = sp.solve(sp.Poly(expr, d).all_coeffs(), [al, be, ga], dict=True)
    assert len(sol) == 1
    s = sol[0]
    out = (sp.expand(s[al]), sp.expand(s[be]), sp.expand(s[ga]))
    assert sp.expand(target - out[0] * (d - 1) - out[1] * Cb(d, 2) - out[2] * Cb(d, 3) - (d - 1) * ansatz) == 0
    return out


class QF:
    """rational function num / (c (e-1)^a (2e-1)^b), num a sympy polynomial (fast exact arithmetic)."""
    def __init__(self, num, c=1, a=0, b=0):
        self.num, self.c, self.a, self.b = sp.expand(num), sp.Integer(c), a, b

    def __add__(self, o):
        if not isinstance(o, QF):
            o = QF(o)
        a, b = max(self.a, o.a), max(self.b, o.b)
        c = sp.ilcm(self.c, o.c)
        f1 = (c / self.c) * (e - 1) ** (a - self.a) * (2 * e - 1) ** (b - self.b)
        f2 = (c / o.c) * (e - 1) ** (a - o.a) * (2 * e - 1) ** (b - o.b)
        return QF(sp.expand(self.num * f1 + o.num * f2), c, a, b)

    __radd__ = __add__

    def __neg__(self):
        return QF(-self.num, self.c, self.a, self.b)

    def __sub__(self, o):
        return self + (-o if isinstance(o, QF) else QF(-o))

    def __mul__(self, o):
        if not isinstance(o, QF):
            o = QF(o)
        return QF(sp.expand(self.num * o.num), self.c * o.c, self.a + o.a, self.b + o.b)

    __rmul__ = __mul__

    def expr(self):
        return self.num / (self.c * (e - 1) ** self.a * (2 * e - 1) ** self.b)


def build_chain(B):
    """Lemma G'' tangent bounds and the Lemma H'' lower bound L (all as QF objects)."""
    Phi0, cT, cP, A4 = B['Phi0'], B['cT'], B['cP'], B['A4']
    cP5_eff, cF_eff, cT4_eff, quadTP = B['cP5_eff'], B['cF_eff'], B['cT4_eff'], B['quadTP']
    # tangent bounds: remainder (d-1) (d-ds)^2 (d-D)/24 <= 0 for 1 <= d <= D, resp. (d-1)(d-ds)^2 (d+ds-9/2)^2/120 >= 0
    aI, bI, gI = tangent_coeffs(Cb(d, 4), (d - ds) ** 2 * (d - D) / 24)
    a5, b5, g5 = tangent_coeffs(Cb(d, 5), (d - ds) ** 2 * (d + ds - sp.Rational(9, 2)) ** 2 / 120)
    assert sp.expand(aI - ds ** 2 * D / 24) == 0          # >= 0  -> use mu <= e-1
    assert sp.expand(a5 + ds ** 2 * (ds - sp.Rational(9, 2)) ** 2 / 120) == 0   # <= 0 -> use mu <= e-1
    dstar = QF(2 * S, 1, 1, 0)                                                     # 2S/(e-1)
    Dt = QF(sp.expand(2 * (2 * e - 1) + 1 + 8 * S + (2 * e - 1) ** 2), 4, 0, 1)   # Delta_t = 1/2 + (1+8S+(2e-1)^2)/(4(2e-1))

    def subst(coef):
        P = sp.Poly(sp.expand(coef), ds, D)
        tot = QF(0)
        for (i, j), cc in zip(P.monoms(), P.coeffs()):
            term = QF(cc)
            for _ in range(i):
                term = term * dstar
            for _ in range(j):
                term = term * Dt
            tot = tot + term
        return tot
    T4up = subst(aI) * (e - 1) + subst(bI) * S + subst(gI) * T
    T5lo = subst(a5) * (e - 1) + subst(b5) * S + subst(g5) * T
    R = Cb(n, 2) - e - S
    Tup = (Dt - 2) * QF(S, 3)
    Tmin = QF(2 * S * (S - e + 1), 3, 1, 0)
    p4lo = QF(A4 - R) - Tup
    base = Phi0 + cT * T + cP * P4 + quadTP + cP5_eff * (R - P4) + cF_eff * (e - 3) * P4 / 2
    L = QF(base) + 5 * T4up * T4up + QF(cT4_eff) * T4up + 6 * p4lo * T5lo
    # exactness at the star K_{1,m}: L(star) = Q5(star)
    m = sp.Symbol('m')
    star = {n: m + 1, e: m, S: Cb(m, 2), T: Cb(m, 3), P4: 0}
    assert sp.cancel(L.expr().subs(star) - B['Q5_star']) == 0
    return dict(T4up=T4up, T5lo=T5lo, Tup=Tup, Tmin=Tmin, p4lo=p4lo, Dt=Dt, L=L,
                tangents=dict(aI=aI, bI=bI, gI=gI, a5=a5, b5=b5, g5=g5))


# --- exact evaluators -------------------------------------------------------------------------

def poly_terms(expr, gens):
    P = sp.Poly(sp.expand(expr), *gens)
    lcm = 1
    for c in P.coeffs():
        lcm = sp.ilcm(lcm, sp.Rational(c).q)
    return [(mono, int(sp.Rational(c) * lcm)) for mono, c in zip(P.monoms(), P.coeffs())], int(lcm)


def ev(tl, vals):
    terms, lcm = tl
    tot = 0
    for mono, c in terms:
        t = c
        for x, k in zip(vals, mono):
            if k:
                t *= x ** k
        tot += t
    return Fraction(tot, lcm)


class QFEval:
    """exact evaluation of a QF: numerator grouped as a polynomial in (T, P4), coefficients in (n, e, S)."""
    def __init__(self, qf):
        self.c, self.a, self.b = int(qf.c), qf.a, qf.b
        PT = sp.Poly(qf.num, T, P4)
        self.coef = {mono: poly_terms(cc, (n, e, S)) for mono, cc in zip(PT.monoms(), PT.coeffs())}
        self.nterms = sum(len(tl[0]) for tl in self.coef.values())

    def quad(self, nn, ee, SS):
        den = self.c * (ee - 1) ** self.a * (2 * ee - 1) ** self.b
        return {mono: ev(tl, (nn, ee, SS)) / den for mono, tl in self.coef.items()}

    def val(self, nn, ee, SS, TT=0, PP=0):
        return sum(c * Fraction(TT) ** mono[0] * Fraction(PP) ** mono[1] for mono, c in self.quad(nn, ee, SS).items())


def min_quad_rect(q, Tlo, Thi, Plo, Phi):
    """exact minimum of the bivariate quadratic q (dict mono -> Fraction) on [Tlo,Thi] x [Plo,Phi]."""
    a = q.get((2, 0), 0); b = q.get((1, 1), 0); c = q.get((0, 2), 0)
    d1 = q.get((1, 0), 0); d2 = q.get((0, 1), 0); f = q.get((0, 0), 0)

    def val(x, y):
        return a * x * x + b * x * y + c * y * y + d1 * x + d2 * y + f
    cands = [(val(x, y), x, y) for x in (Tlo, Thi) for y in (Plo, Phi)]
    for y in (Plo, Phi):
        if a > 0:
            x = -(b * y + d1) / (2 * a)
            if Tlo < x < Thi:
                cands.append((val(x, y), x, y))
    for x in (Tlo, Thi):
        if c > 0:
            y = -(b * x + d2) / (2 * c)
            if Plo < y < Phi:
                cands.append((val(x, y), x, y))
    det = 4 * a * c - b * b
    if det > 0 and a > 0:
        x = (-2 * c * d1 + b * d2) / det
        y = (-2 * a * d2 + b * d1) / det
        if Tlo < x < Thi and Plo < y < Phi:
            cands.append((val(x, y), x, y))
    return min(cands)


class Chain:
    def __init__(self, B, C):
        self.L = QFEval(C['L'])
        self.T4up = QFEval(C['T4up'])
        self.T5lo = QFEval(C['T5lo'])
        self.p4lo = QFEval(C['p4lo'])
        self.Tup = QFEval(C['Tup'])
        self.Dt = QFEval(C['Dt'])
        self.cP5 = poly_terms(B['cP5'], (n, e, S))
        self.cF = poly_terms(B['cF'], (n, e, S))
        self.cT4 = poly_terms(B['cT4'], (n, e, S))
        self.cP5_eff = poly_terms(B['cP5_eff'], (n, e, S, T, P4))
        self.cF_eff = poly_terms(B['cF_eff'], (n, e, S, T, P4))
        self.cT4_eff = poly_terms(B['cT4_eff'], (n, e, S, T, P4))

    def side(self, nn, ee, SS, TT):
        """side conditions of Lemma H'' (T-independent sufficient versions, evaluated at the given T for T4up)."""
        cP5 = ev(self.cP5, (nn, ee, SS)); cF = ev(self.cF, (nn, ee, SS)); cT4 = ev(self.cT4, (nn, ee, SS))
        p4lo = self.p4lo.val(nn, ee, SS)
        T4up = self.T4up.val(nn, ee, SS, TT)
        return dict(cP5=cP5, cF=cF, cT4=cT4, p4lo=p4lo, T4up=T4up,
                    ok=(cP5 <= 0 and cF <= 0 and p4lo >= 0 and 10 * T4up + cT4 <= 0))

    def scan(self, nn):
        """min of L over integer (e,S), real T in [Tmin,Tup], real P4 in [0,R] (relaxed region).
        Side conditions are checked at both endpoints of the T interval (T4up is affine in T).
        Also records e_max(n): the largest e0 such that for every e <= e0 the side conditions hold and
        min L >= 0 (then Q_5 >= 0 for every forest of order n with e <= e0 edges, by Lemma H'')."""
        worst = None
        nside_fail = 0
        npts = 0
        emax = None
        first_fail = None
        for ee in range(2, nn):
            e_ok = True
            for SS in range(0, binom(ee, 2) + 1):
                npts += 1
                q = self.L.quad(nn, ee, SS)
                Tup = self.Tup.val(nn, ee, SS)
                Tmin = max(Fraction(0), Fraction(2 * SS * (SS - ee + 1), 3 * (ee - 1)))
                R = binom(nn, 2) - ee - SS
                sd_ok = self.side(nn, ee, SS, Tup)['ok'] and self.side(nn, ee, SS, Tmin)['ok']
                if not sd_ok:
                    nside_fail += 1
                v, x, y = min_quad_rect(q, Tmin, Tup, Fraction(0), Fraction(R))
                if not (sd_ok and v >= 0):
                    e_ok = False
                if worst is None or v < worst[0]:
                    worst = (v, ee, SS, x, y, sd_ok)
            if e_ok and first_fail is None:
                emax = ee
            if not e_ok and first_fail is None:
                first_fail = ee
        return dict(n=nn, min_L=str(worst[0]), min_L_float=float(worst[0]), at_e=worst[1], at_S=worst[2],
                    at_T=str(worst[3]), at_P4=str(worst[4]), side_ok_at_min=worst[5], side_fail_points=nside_fail,
                    points=npts, ref_n9_over_2880=nn ** 9 / 2880, sign='NEG' if worst[0] < 0 else 'POS',
                    e_max_closed=emax, first_e_not_closed=first_fail)


def lcg_prufer_tree(nn, seed):
    """deterministic labelled tree from a Prufer sequence produced by a 64-bit LCG (no randomness)."""
    x = seed
    seq = []
    for _ in range(nn - 2):
        x = (6364136223846793005 * x + 1442695040888963407) % (1 << 64)
        seq.append((x >> 33) % nn)
    return prufer_to_edges(seq, nn)


def spider(hub, legs2):
    edges = []
    nxt = 1
    for i in range(hub):
        edges.append((0, nxt)); v = nxt; nxt += 1
        if i < legs2:
            edges.append((v, nxt)); nxt += 1
    return nxt, edges


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main():
    out = dict(script=os.path.basename(__file__), sympy_version=sp.__version__, status={}, counts={}, identities={},
               extremal={}, chain={}, anomalies=[])
    with open(os.path.abspath(__file__), 'rb') as fh:
        out['script_sha256'] = hashlib.sha256(fh.read()).hexdigest()

    # ---------------- symbolic: Lemma B'' and the chain -----------------------------------------
    log("building symbolic Q_5 grouping (Lemma B'') ...")
    B = build_symbolic()
    log("Q_5 has %d monomials in (T,P4,T4,P5,F,Z); Phi0 has %d terms" % (
        len(sp.Poly(B['Q5'], T, P4, T4, P5, F, Z).terms()), len(sp.Poly(B['Phi0'], n, e, S).terms())))
    out['identities']['p4_formula'] = str(B['p4'])
    out['identities']['p5_formula'] = str(B['p5'])
    out['identities']['p6_formula'] = str(B['p6'])
    out['identities']['Q5_full'] = str(B['Q5'])
    out['identities']['Phi0'] = str(sp.collect(B['Phi0'], S))
    for k in ('cT', 'cP', 'cT4', 'cP5', 'cF', 'A4', 'quadTP', 'cP5_eff', 'cF_eff', 'cT4_eff'):
        out['identities'][k] = str(B[k])
    out['identities']['Q5_edgeless'] = str(B['Q5_edgeless'])
    out['identities']['Q5_star_K1m'] = str(B['Q5_star'])
    out['identities']['grouping'] = ("Q5 = Phi0 + cT*T + cP*P4 + quadTP + cP5_eff*P5 + cF_eff*F + cT4_eff*T4 "
                                     "+ 5*(P5+F+T4)**2 + 6*p4*Z,  Z = P6+T5+DS22+Y42+C322+C232, p4 = A4 - T - P4")
    log("building the chain lower bound L (Lemma H'') ...")
    C = build_chain(B)
    out['identities']['T4up'] = str(C['T4up'].expr())
    out['identities']['T5lo'] = str(C['T5lo'].expr())
    out['identities']['Tup'] = str(C['Tup'].expr())
    out['identities']['Tmin'] = str(C['Tmin'].expr())
    out['identities']['p4lo'] = str(C['p4lo'].expr())
    out['identities']['Delta_t'] = str(C['Dt'].expr())
    out['identities']['tangent_coefficients'] = {k: str(v) for k, v in C['tangents'].items()}
    out['identities']['L_numerator'] = str(C['L'].num)
    out['identities']['L_denominator'] = str(C['L'].c * (e - 1) ** C['L'].a * (2 * e - 1) ** C['L'].b)
    ch = Chain(B, C)
    log("L built: numerator %d terms, denominator %s" % (ch.L.nterms, out['identities']['L_denominator']))

    # ---------------- exhaustive statistics loop n <= NMAX_STATS ---------------------------------
    log("tree polynomials up to n = %d ..." % NMAX_EXH)
    tp = tree_polys_upto(NMAX_EXH)
    seqc = SeqCache(NMAX_STATS)
    Q5poly_eval = poly_terms(B['Q5'], (n, e, S, T, P4, T4, P5, F, Z))
    cnt = dict(forests_stats=0, forests_brute=0, forests_e_ge2=0, side_ok=0, tangent_checked=0, delta2_forests=0)
    min_slack = None
    for nn in range(1, NMAX_STATS + 1):
        for comps, P in forests(nn, tp):
            cnt['forests_stats'] += 1
            edges = forest_edges(comps, seqc)
            st = stats_from_edges(nn, edges)
            ee, SS, TT, PP = st['e'], st['S'], st['T'], st['P4']
            # Lemma A, A', A''
            assert p4_formula(nn, st) == pk(P, 4), (nn, comps)
            assert p5_formula(nn, st) == pk(P, 5), (nn, comps)
            assert p6_formula(nn, st) == pk(P, 6), (nn, comps)
            # Lemma B'' numerically
            Q5 = Q5_of(P)
            vals = (nn, ee, SS, TT, PP, st['T4'], st['P5'], st['F'], st['Z'])
            assert ev(Q5poly_eval, vals) == Q5, (nn, comps)
            # closed forms consistency: W2 relation  sum_v W_v^2 = 2 P5 + sum_a d_a (d_a-1)^2 = 2 P5 + 6T + 2S
            assert st['W2'] == 2 * st['P5'] + 6 * TT + 2 * SS
            assert sum(st['W']) == 2 * SS                                 # sum_v W_v = sum_a d_a (d_a - 1) = 2S
            # per-edge form of F
            Fe = sum((st['deg'][a] - 1) * (st['deg'][b] - 1) * (st['deg'][a] + st['deg'][b] - 4) for a, b in edges)
            assert Fe == 2 * st['F']
            # Lemma G'' toolbox
            R = binom(nn, 2) - ee - SS
            assert PP + st['P5'] + st['P6'] <= R                          # distance counting
            assert PP <= SS + 3 * TT                                       # AM-GM per edge
            assert 3 * TT <= (ee - 2) * SS or ee < 2
            if st['Delta'] <= 2:
                cnt['delta2_forests'] += 1
            if ee >= 3:
                assert 2 * st['F'] <= (ee - 3) * PP
            assert 4 * st['T4'] <= (st['Delta'] - 3) * TT or TT == 0
            assert binom(st['Delta'], 2) <= SS
            if ee >= 2:
                cnt['forests_e_ge2'] += 1
                dc = derived_counts(st)
                assert all(v >= 0 for v in dc.values()), (nn, comps, dc)
                Dt = ch.Dt.val(nn, ee, SS)
                assert st['Delta'] <= Dt
                Tup = ch.Tup.val(nn, ee, SS)
                assert TT <= Tup
                Tmin = Fraction(2 * SS * (SS - ee + 1), 3 * (ee - 1))
                assert TT >= Tmin
                assert 0 <= st['mu'] <= ee - 1
                T4up = ch.T4up.val(nn, ee, SS, TT)
                T5lo = ch.T5lo.val(nn, ee, SS, TT)
                assert st['T4'] <= T4up, (nn, comps, st['T4'], T4up)
                assert st['T5'] >= T5lo, (nn, comps, st['T5'], T5lo)
                cnt['tangent_checked'] += 1
                p4lo = ch.p4lo.val(nn, ee, SS)
                assert pk(P, 4) >= p4lo
                sd = ch.side(nn, ee, SS, TT)
                if sd['ok']:
                    cnt['side_ok'] += 1
                    Lv = ch.L.val(nn, ee, SS, TT, PP)
                    assert Q5 >= Lv, (nn, comps, Q5, Lv)
                    if min_slack is None or Q5 - Lv < min_slack[0]:
                        min_slack = (Q5 - Lv, nn, comps)
            # brute force cross-checks
            if nn <= NMAX_BRUTE:
                cnt['forests_brute'] += 1
                bc = brute_edge_subsets(edges)
                for sig in bc:
                    assert sig in SIG.values(), ("unexpected acyclic type", sig)
                get = lambda key: bc.get(SIG[key], 0)
                for key in ('e', 'S', 'T', 'P4', 'P5', 'F', 'T4', 'P6', 'T5', 'DS22', 'Y42'):
                    assert get(key) == st[key], (nn, comps, key, get(key), st[key])
                dc = derived_counts(st)
                for key in ('M2', 'D31', 'M3', 'D41', 'DTK', 'D33'):
                    assert get(key) == dc[key], (nn, comps, key, get(key), dc[key])
                assert get('C3xx') == st['C322'] + st['C232']
                assert brute_C322_C232(edges) == (st['C322'], st['C232']), (nn, comps)
                for k in (4, 5, 6):
                    assert brute_indep_count(nn, edges, k) == pk(P, k)
                dist = brute_distance_pairs(nn, st['adj'])
                assert dist[1:6] == [ee, SS, PP, st['P5'], st['P6']], (nn, comps, dist)
        log("n=%2d: stats/formula checks done (%d forests so far, brute %d)" % (nn, cnt['forests_stats'], cnt['forests_brute']))
    out['counts'].update(cnt)
    out['counts']['chain_min_slack_small_n'] = None if min_slack is None else [str(min_slack[0]), min_slack[1], list(map(list, min_slack[2]))]
    out['status']['lemma_A2_p6_formula'] = "PROVED (inclusion-exclusion; exact on all %d forests n<=%d; brute-force subgraph counts on %d forests n<=%d)" % (
        cnt['forests_stats'], NMAX_STATS, cnt['forests_brute'], NMAX_BRUTE)
    out['status']['closed_forms'] = "PROVED (degree/edge-local formulas for P5, F, P6, DS22, Y42, C322, C232 and the disconnected counts; brute force n<=%d, all forests n<=%d)" % (NMAX_BRUTE, NMAX_STATS)
    out['status']['lemma_B2_grouping'] = "PROVED (sympy identity; numerically on all forests n<=%d)" % NMAX_STATS
    out['status']['lemma_G2_toolbox'] = "PROVED (each inequality asserted on all forests n<=%d)" % NMAX_STATS

    # ---------------- chain validity on larger trees (deterministic sample) --------------------
    log("chain validity on deterministic larger trees ...")
    big = dict(checked=0, side_ok=0, min_rel_slack=None, families=[])
    for nn in (25, 30, 40):
        trees = [lcg_prufer_tree(nn, seed) for seed in range(1, 41)]
        for hub in range(3, nn):
            for legs in range(0, nn):
                m, ed = spider(hub, legs)
                if m == nn:
                    trees.append(ed)
        trees.append([(i, i + 1) for i in range(nn - 1)])
        for ed in trees:
            st = stats_from_edges(nn, ed)
            P = indep_poly_from_edges(nn, ed)
            Q5 = Q5_of(P)
            assert p6_formula(nn, st) == pk(P, 6)
            ee, SS, TT, PP = st['e'], st['S'], st['T'], st['P4']
            assert st['T4'] <= ch.T4up.val(nn, ee, SS, TT) and st['T5'] >= ch.T5lo.val(nn, ee, SS, TT)
            assert pk(P, 4) >= ch.p4lo.val(nn, ee, SS)
            sd = ch.side(nn, ee, SS, TT)
            big['checked'] += 1
            if sd['ok']:
                big['side_ok'] += 1
                Lv = ch.L.val(nn, ee, SS, TT, PP)
                assert Q5 >= Lv, (nn, ed, Q5, Lv)
                rel = Fraction(Q5 - Lv) / Fraction(nn ** 9, 2880)
                if big['min_rel_slack'] is None or rel < big['min_rel_slack']:
                    big['min_rel_slack'] = rel
    big['min_rel_slack'] = None if big['min_rel_slack'] is None else float(big['min_rel_slack'])
    out['chain']['large_tree_validity'] = big
    out['status']['lemma_H2_conditional_bound'] = ("PROVED (Q5 >= L under the side conditions; L exact at stars; checked on %d larger trees n in {25,30,40} "
                                                  "(%d with side conditions holding) and on all small forests where the side conditions hold)" % (big['checked'], big['side_ok']))

    # ---------------- loss decomposition at spiders (which terms resist) ----------------------
    log("loss decomposition (spiders n = 30) ...")
    losses = []
    for hub, legs in [(29, 0), (25, 4), (21, 8), (15, 14), (12, 12)]:
        nn, ed = spider(hub, legs)
        st = stats_from_edges(nn, ed)
        P = indep_poly_from_edges(nn, ed)
        p4 = pk(P, 4)
        Q5 = Q5_of(P)
        ee, SS, TT, PP = st['e'], st['S'], st['T'], st['P4']
        R = binom(nn, 2) - ee - SS
        c5 = ev(ch.cP5_eff, (nn, ee, SS, TT, PP)); cf = ev(ch.cF_eff, (nn, ee, SS, TT, PP)); c4 = ev(ch.cT4_eff, (nn, ee, SS, TT, PP))
        T4up = ch.T4up.val(nn, ee, SS, TT); T5lo = ch.T5lo.val(nn, ee, SS, TT); p4lo = ch.p4lo.val(nn, ee, SS)
        Lv = ch.L.val(nn, ee, SS, TT, PP)
        Y = st['P5'] + st['F'] + st['T4']
        loss = dict(P5_to_R_minus_P4=c5 * (st['P5'] - (R - PP)),
                    F_to_e3P4_half=cf * (st['F'] - Fraction((ee - 3) * PP, 2)),
                    T4_to_T4up=5 * (Fraction(st['T4']) ** 2 - T4up ** 2) + c4 * (st['T4'] - T4up),
                    Ysq_to_T4sq=5 * (Fraction(Y) ** 2 - st['T4'] ** 2),
                    Z_to_T5lo=6 * p4 * st['Z'] - 6 * p4lo * T5lo,
                    Z_minus_T5_part=6 * p4 * (st['Z'] - st['T5']),
                    T5_minus_T5lo_part=6 * p4 * (st['T5'] - T5lo))
        assert sum(v for k, v in loss.items() if k in ('P5_to_R_minus_P4', 'F_to_e3P4_half', 'T4_to_T4up', 'Ysq_to_T4sq', 'Z_to_T5lo')) == Q5 - Lv
        ref = Fraction(nn ** 9, 2880)
        losses.append(dict(n=nn, hub=hub, legs_of_length_2=legs, e=ee, S=SS, T=TT, P4=PP, Q5=str(Q5), Q5_rel=float(Q5 / ref),
                           L=str(Lv), L_rel=float(Lv / ref), losses_rel={k: float(v / ref) for k, v in loss.items()},
                           T4=st['T4'], T4up=float(T4up), T5=st['T5'], T5lo=float(T5lo), Z=st['Z'], p4=p4, p4lo=float(p4lo)))
    out['chain']['loss_decomposition_spiders'] = losses

    # ---------------- scans of L over the relaxed region --------------------------------------
    scans = []
    for nn in SCAN_NS:
        t1 = time.time()
        sc = ch.scan(nn)
        sc['seconds'] = round(time.time() - t1, 1)
        scans.append(sc)
        log("scan n=%d: min L = %.4g (%s) at e=%d S=%d T=%s P4=%s, side fails at %d/%d points; closed for all e <= %s (first open e = %s)" % (
            nn, sc['min_L_float'], sc['sign'], sc['at_e'], sc['at_S'], sc['at_T'], sc['at_P4'], sc['side_fail_points'], sc['points'],
            sc['e_max_closed'], sc['first_e_not_closed']))
    out['chain']['region_scans'] = scans
    out['status']['sparse_forests_scanned_n'] = "PROVED (exact scan + Lemma H''): Q_5 >= 0 for every forest of order n with e <= e_max(n): " + ", ".join(
        "n=%d: e<=%s" % (sc['n'], sc['e_max_closed']) for sc in scans)
    closes = all(sc['sign'] == 'POS' and sc['side_fail_points'] == 0 for sc in scans)
    out['status']['analytic_closure'] = ("EXPLORED - the chain does NOT close: min of L over the relaxed region is negative for n in %s; "
                                        "resisting terms: 6 p4 (Z - T5lo) (the five non-star 6-vertex trees + slack of the T5 tangent), "
                                        "the T4 tangent slack times the large negative T4 coefficient, and F <= (e-3)P4/2" % (list(SCAN_NS),)) if not closes else "closed"

    # ---------------- exhaustive base n <= NMAX_EXH -------------------------------------------
    log("exhaustive exact base: Q_5 >= 0 for all forests n <= %d ..." % NMAX_EXH)
    per_n = []
    total = 0
    total_prefix = 0
    neg = 0
    for nn in range(1, NMAX_EXH + 1):
        t1 = time.time()
        c = 0; cpre = 0
        minQ = None; minQpre = None; minratio = None
        for comps, P in forests(nn, tp):
            c += 1
            p4, p5, p6 = pk(P, 4), pk(P, 5), pk(P, 6)
            Q5 = 5 * p5 * p5 + p4 * p4 - 6 * p4 * p6
            if Q5 < 0:
                neg += 1
                out['anomalies'].append(dict(n=nn, comps=list(map(list, comps)), Q5=str(Q5)))
            if minQ is None or Q5 < minQ[0]:
                minQ = (Q5, comps)
            alpha = len(P) - 1
            if alpha >= 9:                      # r = 5 is a prefix index iff alpha >= 9
                cpre += 1
                if minQpre is None or Q5 < minQpre[0]:
                    minQpre = (Q5, comps)
                num, den = 5 * p5 * p5 + p4 * p4, 6 * p4 * p6
                if minratio is None or num * minratio[1] < minratio[0] * den:
                    minratio = (num, den, comps)
        total += c
        total_prefix += cpre
        rec = dict(n=nn, forests=c, prefix_forests_alpha_ge_9=cpre, min_Q5=str(minQ[0]), min_Q5_rel_n9_2880=float(Fraction(minQ[0]) / Fraction(nn ** 9, 2880)),
                   argmin_Q5=describe(minQ[1], seqc), seconds=round(time.time() - t1, 1))
        if minQpre is not None:
            rec['min_Q5_prefix'] = str(minQpre[0])
            rec['argmin_Q5_prefix'] = describe(minQpre[1], seqc)
            rec['min_ratio_prefix'] = str(Fraction(minratio[0], minratio[1]))
            rec['min_ratio_prefix_float'] = float(Fraction(minratio[0], minratio[1]))
            rec['argmin_ratio_prefix'] = describe(minratio[2], seqc)
        per_n.append(rec)
        log("n=%2d: %d forests (%d prefix), min Q5 = %s, min ratio(prefix) = %s  (%.1fs)" % (
            nn, c, cpre, rec['min_Q5'], rec.get('min_ratio_prefix_float'), time.time() - t1))
    out['extremal']['per_n'] = per_n
    out['counts']['forests_exhaustive'] = total
    out['counts']['prefix_forests_exhaustive'] = total_prefix
    out['counts']['negative_Q5'] = neg
    out['status']['exhaustive_base'] = ("PROVED: Q_5 >= 0 for every forest with n <= %d (%d forests, %d with alpha >= 9, %d negatives)" % (
        NMAX_EXH, total, total_prefix, neg)) if neg == 0 else "FAILED"
    out['status']['theorem_D_delta_le_2'] = ("PROVED: Q_5 >= 0 for every forest with Delta <= 2 (linear forests): the independence polynomial "
                                             "is real-rooted (I(P_k;x) = matching polynomial of P_{k+1}, Heilmann-Lieb; products of real-rooted "
                                             "polynomials), and Newton's inequalities give r p_r^2 >= (r+1) p_{r-1} p_{r+1}; %d such forests among n<=%d checked" % (
                                                 cnt['delta2_forests'], NMAX_STATS))
    out['status']['ISO5_all_forests'] = ("PARTIAL: proved for n <= %d (exhaustive) and for Delta <= 2 (all n); the analytic chain Q5 >= L is proved "
                                         "but L is not nonnegative on the relaxed region, so no Bernstein certificate is possible for it" % NMAX_EXH)
    out['runtime_seconds'] = round(time.time() - T0, 1)
    os.makedirs(os.path.join(HERE, 'results'), exist_ok=True)
    with open(os.path.join(HERE, 'results', 'iso5.json'), 'w') as fh:
        json.dump(out, fh, indent=1, default=str)
    log("wrote results/iso5.json")
    print("STATUS:")
    for k, v in out['status'].items():
        print("  %-28s %s" % (k, v))
    if neg == 0:
        print("PASS_EXACT_ISO5_BASE_N_LE_%d" % NMAX_EXH)
    print("ISO5_ALL_FORESTS: PARTIAL (not closed)")


def describe(comps, seqc):
    edges = forest_edges(comps, seqc)
    nn = sum(k for k, i in comps)
    deg = [0] * nn
    for a, b in edges:
        deg[a] += 1
        deg[b] += 1
    return dict(components=[list(seqc(k, i)) for k, i in comps], degree_sequence=sorted(deg, reverse=True))


if __name__ == '__main__':
    main()
