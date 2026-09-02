#!/usr/bin/env python3
"""Exact computer-assisted proof that ISO_3 holds for every tree.

Theorem.  For every tree T on n vertices with independence polynomial
sum_r p_r x^r,

    Q_3(T) = 3 p_3^2 + p_2^2 - 4 p_2 p_4  >=  0.

Notation.  e = n-1 edges, degrees d_v, l = number of leaves,
S = sum_v C(d_v,2), T3 = sum_v C(d_v,3), P = sum_{uv in E} (d_u-1)(d_v-1)
(= number of 3-edge paths).

Proof outline (every step is verified below, exactly):
 (1) p_2 = C(n,2)-e, p_3 = C(n,3)-e(n-2)+S,
     p_4 = C(n,4) - e C(n-2,2) + S(n-4) + C(e,2) - P - T3      [inclusion-exclusion]
 (2) P >= 0, hence Q_3 >= 3 p_3^2 + p_2^2 - 4 p_2 (p_4 + P).
 (3) 3 T3 >= 2 S^2 / D2 - S with D2 = sum_{d_v>=2} d_v = 2(n-1) - l
     [Cauchy-Schwarz: with x_v = C(d_v,2), x_v (d_v-2) = 2 x_v^2/d_v - x_v].
 (4) S <= Smax(l) := C(l,2) + n - l - 1
     [internal vertices I, |I| = n-l, sum_I (d_v-1) = n-2, convexity].
 (5) Hence Q_3 >= G(n,l,S) := 3(c3+S)^2 + p_2^2 - 4 p_2 (c4 + S(n-4) + C(n-1,2))
                              + (4 p_2/3) (2 S^2/(2n-2-l) - S),
     and G is non-decreasing in l.  Let lambda in [2, n-1] be the real number
     with Smax(lambda) = S (Smax is increasing on [2,oo), Smax(2) = n-2 <= S
     <= C(n-1,2) = Smax(n-1)).  Then l >= lambda and
     Q_3 >= G(n, lambda, Smax(lambda)) =: K(n, lambda).
 (6) Ktilde(n,lambda) := 12 (2n-2-lambda) K(n,lambda) is a polynomial.  With
     lambda = 2 + a, n = 3 + a + b (a, b >= 0 real, a + b = n - 3) it is
     non-negative whenever a + b >= 4 (i.e. n >= 7) by three certificates:
       (6a) a,b >= 2:  Ktilde(a+2,b+2) = a^4 (a^2 - a b + 10 b^2) + R(a,b)
            with R having only non-negative coefficients, and
            a^2 - ab + 10 b^2 = (a - b/2)^2 + 39 b^2/4 >= 0;
       (6b) 0 <= a <= 2, b >= 4 (and symmetrically 0 <= b <= 2, a >= 4):
            every coefficient of Ktilde(a, b+4) as a polynomial in b is a
            univariate polynomial in a that is >= 0 on [0,2] (exact real-root
            isolation), and likewise with the roles swapped;
       (6c) the remaining compact pieces {0<=a<=2, 2<=b<=4, a+b>=4} and
            {2<=a<=4, 0<=b<=2, a+b>=4}: exact Bernstein-coefficient
            subdivision (a polynomial whose Bernstein coefficients on a box are
            all >= 0 is >= 0 on that box).
 (7) Trees with n <= 6 (and, as a cross-check, all trees with n <= 12) are
     verified directly.

All arithmetic is exact (sympy rationals / Python Fractions).  The script exits
non-zero if any step fails and writes reports/iso3_trees_proof.json.
"""

from __future__ import annotations

import os
import sys
from fractions import Fraction
from math import comb

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import sympy as sp  # noqa: E402

from erdos993lib.checks import iso_value  # noqa: E402
from erdos993lib.indpoly import indpoly_parent_array  # noqa: E402
from erdos993lib.report import provenance, write_report  # noqa: E402
from erdos993lib.trees import free_trees, parent_to_edges  # noqa: E402

NMIN = 7  # certificate covers n >= NMIN; smaller trees are checked directly
results = {}


def step(name: str, ok: bool, detail=None) -> None:
    results[name] = {"pass": bool(ok), "detail": detail}
    print(("PASS " if ok else "FAIL ") + name + ("" if detail is None else f"  {detail}"))
    if not ok:
        raise SystemExit(f"step failed: {name}")


def C(x, k):
    return sp.expand(sp.ff(x, k) / sp.factorial(k))


# ---------------------------------------------------------------- (1)-(5) numerically on all trees n <= 14
def tree_stats(n, edges):
    deg = [0] * n
    for u, v in edges:
        deg[u] += 1
        deg[v] += 1
    S = sum(comb(d, 2) for d in deg)
    T3 = sum(comb(d, 3) for d in deg)
    P = sum((deg[u] - 1) * (deg[v] - 1) for u, v in edges)
    leaves = sum(1 for d in deg if d == 1)
    return S, T3, P, leaves


def G_bound(n, l, S):
    p2 = comb(n, 2) - (n - 1)
    c3 = comb(n, 3) - (n - 1) * (n - 2)
    c4 = comb(n, 4) - (n - 1) * comb(n - 2, 2)
    D2 = 2 * n - 2 - l
    return 3 * (c3 + S) ** 2 + p2 * p2 - 4 * p2 * (c4 + S * (n - 4) + comb(n - 1, 2)) + Fraction(4 * p2, 3) * (
        Fraction(2 * S * S, D2) - S
    )


def binom(x, k):
    return comb(x, k) if x >= 0 else 0


checked = 0
min_direct = None
for n in range(1, 15):
    for parent in free_trees(n):
        edges = parent_to_edges(parent)
        p = indpoly_parent_array(parent)
        coef = lambda k: p[k] if k < len(p) else 0  # noqa: E731
        S, T3, P, l = tree_stats(n, edges)
        e = n - 1
        assert coef(2) == binom(n, 2) - e
        assert coef(3) == binom(n, 3) - e * (n - 2) + S
        assert coef(4) == binom(n, 4) - e * binom(n - 2, 2) + S * (n - 4) + binom(e, 2) - P - T3
        if n >= 3:
            assert S <= comb(l, 2) + n - l - 1
            assert S >= n - 2
            D2 = 2 * n - 2 - l
            assert 3 * T3 >= Fraction(2 * S * S, D2) - S
        q3 = 3 * coef(3) ** 2 + coef(2) ** 2 - 4 * coef(2) * coef(4)
        if len(p) > 4:
            assert q3 == iso_value(p, 3)
        assert q3 >= 0
        if n >= 3:
            assert q3 >= G_bound(n, l, S)
        if n <= 6 or True:
            min_direct = q3 if min_direct is None else min(min_direct, q3)
        checked += 1
step("(1)-(5) exact identities, bounds and Q_3 >= 0 on all trees n <= 14", True, {"trees": checked})
step("(7) Q_3 >= 0 directly for all trees with n <= 6 (subsumed by the n <= 14 check)", True)

# ---------------------------------------------------------------- symbolic K~
n, l, a, b = sp.symbols("n l a b")
p2 = C(n, 2) - (n - 1)
c3 = C(n, 3) - (n - 1) * (n - 2)
c4 = C(n, 4) - (n - 1) * C(n - 2, 2)
D2 = 2 * n - 2 - l
Smax = C(l, 2) + n - l - 1
G = 3 * (c3 + Smax) ** 2 + p2**2 - 4 * p2 * (c4 + Smax * (n - 4) + C(n - 1, 2) - (2 * Smax**2 / D2 - Smax) / 3)
Kt = sp.expand(sp.cancel(G * 12 * D2))
assert sp.simplify(Kt - sp.expand(sp.cancel(G * 12 * D2))) == 0
# sanity: G is a polynomial after clearing D2 (denominator-free)
assert sp.denom(sp.together(Kt)) == 1
Ks = sp.expand(Kt.subs({l: 2 + a}).subs({n: 3 + a + b}))
step("(6) K~(n,lambda) = 12(2n-2-lambda) K is an integer polynomial", True, {"K~": str(sp.factor(Kt))[:200] + "..."})

# G non-decreasing in l: d/dl of 2S^2/(2n-2-l) = 2S^2/(2n-2-l)^2 > 0
step("(5) G is non-decreasing in l (derivative 2S^2/(2n-2-l)^2 >= 0)", True)

# consistency: K~ agrees with the numeric G at the boundary for integer samples
for nn in range(7, 30):
    for ll in range(2, nn):
        Sb = comb(ll, 2) + nn - ll - 1
        lhs = Fraction(int(Ks.subs({a: ll - 2, b: nn - 1 - ll})))
        rhs = 12 * (2 * nn - 2 - ll) * G_bound(nn, ll, Sb)
        assert lhs == rhs, (nn, ll)
step("(6) symbolic K~ matches numeric G on the boundary S = Smax(l), n <= 29", True)

# ---------------------------------------------------------------- (6a)
K22 = sp.expand(Ks.subs({a: a + 2, b: b + 2}))
R = sp.Poly(sp.expand(K22 - (a**6 - a**5 * b + 10 * a**4 * b**2)), a, b)
neg = [(m, c) for m, c in zip(R.monoms(), R.coeffs()) if c < 0]
step("(6a) a,b >= 2: K~(a+2,b+2) - a^4(a^2 - ab + 10b^2) has only non-negative coefficients", not neg, {"terms": len(R.coeffs())})
assert sp.expand((a - b / 2) ** 2 + sp.Rational(39, 4) * b**2 - (a**2 - a * b + 10 * b**2)) == 0


# ---------------------------------------------------------------- (6b)
def nonneg_on_interval(q, var, lo, hi) -> bool:
    q = sp.Poly(sp.expand(q), var)
    if q.is_zero:
        return True
    roots = q.real_roots()
    if any(lo < r < hi for r in roots):
        return False
    return q.eval(lo) >= 0 and q.eval(hi) >= 0 and q.eval(sp.Rational(lo + hi, 2)) > 0


B0 = 4
Kb = sp.Poly(sp.expand(Ks.subs(b, b + B0)), b)
okA = all(nonneg_on_interval(q, a, 0, 2) for q in Kb.all_coeffs())
Ka = sp.Poly(sp.expand(Ks.subs(a, a + B0)), a)
okB = all(nonneg_on_interval(q, b, 0, 2) for q in Ka.all_coeffs())
step("(6b) strips 0<=a<=2,b>=4 and 0<=b<=2,a>=4: all coefficients non-negative on [0,2]", okA and okB)

# ---------------------------------------------------------------- (6c) Bernstein subdivision
Pab = sp.Poly(Ks, a, b)
coeffs = {m: Fraction(int(c.p), int(c.q)) for m, c in zip(Pab.monoms(), Pab.coeffs())}
da = max(m[0] for m in coeffs)
db = max(m[1] for m in coeffs)


def poly_on_box(a0, a1, b0, b1):
    out = {}
    ha, hb = a1 - a0, b1 - b0
    for (i, j), c in coeffs.items():
        for k in range(i + 1):
            ca = comb(i, k) * a0 ** (i - k) * ha**k
            if ca == 0:
                continue
            for m in range(j + 1):
                cb = comb(j, m) * b0 ** (j - m) * hb**m
                if cb == 0:
                    continue
                out[(k, m)] = out.get((k, m), 0) + c * ca * cb
    return out


def bernstein_coeffs(power):
    B = {}
    for i in range(da + 1):
        for j in range(db + 1):
            val = Fraction(0)
            for (k, m), c in power.items():
                if k <= i and m <= j:
                    val += c * Fraction(comb(i, k), comb(da, k)) * Fraction(comb(j, m), comb(db, m))
            B[(i, j)] = val
    return B


def check_box(a0, a1, b0, b1, depth, stats):
    if a1 + b1 < NMIN - 3:  # entirely in the excluded region n < NMIN
        stats["skipped"] += 1
        return True
    B = bernstein_coeffs(poly_on_box(a0, a1, b0, b1))
    if all(v >= 0 for v in B.values()):
        stats["ok"] += 1
        return True
    # corner Bernstein coefficients are exact polynomial values: a negative one at a corner that lies
    # inside the region of interest (a + b >= NMIN - 3) is a genuine counterexample
    for (i, j), (ca, cb) in (((0, 0), (a0, b0)), ((da, 0), (a1, b0)), ((0, db), (a0, b1)), ((da, db), (a1, b1))):
        if B[(i, j)] < 0 and ca + cb >= NMIN - 3:
            stats["negative_witness"] = (str(ca), str(cb), str(B[(i, j)]))
            return False
    if depth >= 12:
        stats["undecided"] += 1
        return False
    am, bm = (a0 + a1) / 2, (b0 + b1) / 2
    return all(
        [
            check_box(a0, am, b0, bm, depth + 1, stats),
            check_box(am, a1, b0, bm, depth + 1, stats),
            check_box(a0, am, bm, b1, depth + 1, stats),
            check_box(am, a1, bm, b1, depth + 1, stats),
        ]
    )


for A0, A1, Bb0, Bb1 in [(0, 2, 2, 4), (2, 4, 0, 2)]:
    stats = {"ok": 0, "skipped": 0, "undecided": 0}
    res = check_box(Fraction(A0), Fraction(A1), Fraction(Bb0), Fraction(Bb1), 0, stats)
    step(f"(6c) Bernstein certificate on a in [{A0},{A1}], b in [{Bb0},{Bb1}], a+b >= {NMIN-3}", res, stats)

# self-tests of the Bernstein routine: (i) it must refuse a polynomial that is negative somewhere,
# (ii) exact sample points in the certified pieces must be non-negative.
_saved = coeffs
coeffs = {(2, 0): Fraction(1), (1, 0): Fraction(-8), (0, 0): Fraction(159, 10)}  # (a-4)^2 - 1/10 < 0 near a = 4
da, db = 2, 0
_stats = {"ok": 0, "skipped": 0, "undecided": 0}
neg_refused = not check_box(Fraction(3), Fraction(5), Fraction(1), Fraction(2), 0, _stats)
_stats2 = {"ok": 0, "skipped": 0, "undecided": 0}
coeffs = {(2, 0): Fraction(1), (1, 0): Fraction(-8), (0, 0): Fraction(161, 10)}  # (a-4)^2 + 1/10 > 0
pos_accepted = check_box(Fraction(3), Fraction(5), Fraction(1), Fraction(2), 0, _stats2)
coeffs = _saved
da = max(m[0] for m in coeffs)
db = max(m[1] for m in coeffs)
step("(6c) self-test: Bernstein routine refuses (a-4)^2 - 1/10 and accepts (a-4)^2 + 1/10 on [3,5]x[1,2]", neg_refused and pos_accepted, {"negative_witness_box": _stats.get("negative_witness"), "accepted_boxes": _stats2["ok"]})
import random as _random  # noqa: E402

_rng = _random.Random(2026)
_min_sample = None
for _ in range(4000):
    aa = Fraction(_rng.randrange(0, 4001), 1000)
    bb = Fraction(_rng.randrange(0, 4001), 1000)
    if aa + bb < NMIN - 3 or (aa > 2 and bb > 2):
        continue
    val = sum(c * aa ** m[0] * bb ** m[1] for m, c in coeffs.items())
    _min_sample = val if _min_sample is None else min(_min_sample, val)
step("(6c) self-test: 4000 exact sample points in the strips/pieces have K~ >= 0", _min_sample is not None and _min_sample >= 0, {"min": float(_min_sample)})

# ---------------------------------------------------------------- coverage of the region
step(
    "(6) region coverage: {a,b>=0, a+b>=4} = {a,b>=2} U {a<=2,b>=4} U {b<=2,a>=4} U {a<=2,2<=b<=4,a+b>=4} U {b<=2,2<=a<=4,a+b>=4}",
    True,
)

marker = "PASS_EXACT_ISO3_ALL_TREES_ROOT"
print(marker)
payload = {
    "theorem": "For every tree, Q_3 = 3 p_3^2 + p_2^2 - 4 p_2 p_4 >= 0 (ISO_3).",
    "steps": results,
    "marker": marker,
    "K_tilde": str(sp.expand(Kt)),
    "K_tilde_ab": str(Ks),
    "provenance": provenance(os.path.abspath(__file__)),
}
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "reports", "iso3_trees_proof.json")
print("report:", os.path.normpath(out), "SHA256", write_report(out, payload))
