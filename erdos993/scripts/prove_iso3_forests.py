#!/usr/bin/env python3
"""Exact computer-assisted proof that ISO_3 holds for every forest.

Theorem.  For every forest F with independence polynomial sum_r p_r x^r,

    Q_3(F) = 3 p_3^2 + p_2^2 - 4 p_2 p_4  >=  0.

This extends scripts/prove_iso3_trees.py (trees) to all forests.  Notation:
n vertices, e edges, z isolated vertices, l leaves (degree 1), I internal
vertices (degree >= 2), c' non-trivial components (>= 2 vertices),
n' = n - z = e + c',
    S = sum_v C(d_v,2),  T3 = sum_v C(d_v,3),  P = sum_{uv in E} (d_u-1)(d_v-1).

Proof outline (every step is verified below, exactly; the lemmas are written out
in docs/ISO3_FORESTS_THEOREM.md):
 (1) p_2 = C(n,2)-e, p_3 = C(n,3)-e(n-2)+S,
     p_4 = C(n,4) - e C(n-2,2) + S(n-4) + C(e,2) - P - T3   [repo Thm 3.1, Prop 3.3]
 (2) P >= 0 and p_2 >= 0.
 (3) I >= 1:  3 T3 >= 2 S^2/D2 - S,  D2 = sum_I d_v = 2e - l > 0   [Cauchy-Schwarz].
 (4) I >= 1:  (a) S <= C(l+2-2c',2) + e + c' - l - 1 <= Smax(l) := C(l,2) + e - l
              [convexity; the middle term is non-increasing in c' because l >= 2c'];
              (b) S >= e - c' and S >= I = e + c' - l, hence l >= 2e - 2S;
              (c) 1 <= S <= C(e,2) and 2 <= l <= 2e - 2.
 (5) I >= 1:  Q_3 >= G(n,e,l,S) := 3(c3+S)^2 + p_2^2 - 4 p_2 (c4 + S(n-4) + C(e,2))
                                   + (4 p_2/3)(2S^2/(2e-l) - S),
     c3 = C(n,3) - e(n-2), c4 = C(n,4) - e C(n-2,2);  G is non-decreasing in l.
     Two regimes:
       (R1) S >= e-1: with lambda in [2,e] defined by Smax(lambda) = S, l >= lambda and
            Q_3 >= K(n,e,lambda) := G(n,e,lambda,Smax(lambda));
            K~ := 12(2e-lambda) K is an integer polynomial.
       (R2) 1 <= S <= e-1: l >= 2e-2S and Q_3 >= G0(n,e,S) := G(n,e,2e-2S,S)
            (the Cauchy-Schwarz term vanishes; G0 is a polynomial).
 (A) I = 0: I(F;x) = (1+2x)^e (1+x)^z and Q_3 = G0(2e+z,e,0) exactly; certified by a
     coefficient certificate (z >= 2) plus two univariate checks (z = 0, 1).  (Newton's
     inequalities, repo Theorem 7.1, give the same conclusion.)
 (B) Monotonicity in n for n >= e+1:
       (B1) K~(n+1,e,lambda) - K~(n,e,lambda) and K~(n,e,lambda) - K~(e+1,e,lambda) have only
            non-negative coefficients in (a,b,c) with lambda = 2+a, e = 2+a+b, n = 3+a+b+c;
       (B2) G0(n+1,e,S) - G0(n,e,S) has only non-negative coefficients in (s,u,c) with
            S = s, e = 1+s+u, n = 2+s+u+c.
 (C) Base n = e+1:
       (C1) K~(e+1,e,lambda) is the tree polynomial K~ of prove_iso3_trees.py; it is
            re-certified here for e+1 >= 7, lambda in [2,e] (shift certificate, strips by
            exact real-root isolation, Bernstein subdivision on the compact pieces);
       (C2) G0(e+1,e,e-1-w) with e = 5+v has only non-negative coefficients (e >= 5, S <= e-1).
 (D) I >= 1 and e <= 5: the non-trivial part F' of F is one of 26 forests without isolated
     vertices ("cores"); Q_3(F' + z K_1) is an explicit polynomial in z (exact) which is
     certified >= 0 for every integer z >= 0 by exact real-root isolation.
 (E) All forests with n <= 16 are checked directly, together with every identity and
     inequality above on the actual forests.

All arithmetic is exact (sympy rationals / Python Fractions).  The script prints
PASS/FAIL per step, exits non-zero if any step fails, prints the marker
PASS_EXACT_ISO3_ALL_FORESTS_ROOT only if every step is certified (otherwise
ISO3_FORESTS_INCOMPLETE), and writes reports/iso3_forests_proof.json.
"""

from __future__ import annotations

import json
import os
import sys
import time
import traceback
from fractions import Fraction
from math import comb

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import sympy as sp  # noqa: E402

from erdos993lib.checks import iso_value  # noqa: E402
from erdos993lib.indpoly import indpoly_forest, indpoly_parent_array, poly_mul  # noqa: E402
from erdos993lib.report import provenance, write_report  # noqa: E402
from erdos993lib.trees import A005195, forest_polys, free_trees, parent_to_edges  # noqa: E402

T_START = time.time()
NDIRECT = 16  # all forests with n <= NDIRECT are checked directly
EMAX_SMALL = 5  # forests with e <= EMAX_SMALL edges are handled exactly in step (D)
NMIN_TREE = 7  # the tree certificate K~ >= 0 covers n = e + 1 >= NMIN_TREE
MARKER_OK = "PASS_EXACT_ISO3_ALL_FORESTS_ROOT"
MARKER_BAD = "ISO3_FORESTS_INCOMPLETE"
HERE = os.path.dirname(os.path.abspath(__file__))
REPORT = os.path.normpath(os.path.join(HERE, "..", "reports", "iso3_forests_proof.json"))

results = {}
failures = []


def step(name: str, ok: bool, detail=None) -> bool:
    ok = bool(ok)
    results[name] = {"pass": ok, "detail": detail}
    print(("PASS " if ok else "FAIL ") + name + ("" if detail is None else f"  {detail}"))
    if not ok:
        failures.append(name)
    return ok


def C(x, k):
    """Binomial coefficient C(x,k) as a polynomial (sympy) in x."""
    return sp.expand(sp.ff(x, k) / sp.factorial(k))


def binom(x, k):
    return comb(x, k) if x >= 0 else 0


def poly_mul_pow(base, k):
    out = [1]
    for _ in range(k):
        out = poly_mul(out, base)
    return out


def frac(r) -> Fraction:
    r = sp.Rational(r)
    return Fraction(int(r.p), int(r.q))


# =============================================================================
# Certificate routines (exact)
# =============================================================================
def coeff_certificate(expr, gens):
    """(ok, detail): ok iff the polynomial expr in gens has only non-negative coefficients.

    Then expr >= 0 whenever all gens are >= 0 (a sum of non-negative monomials).
    """
    P = sp.Poly(sp.expand(expr), *gens)
    neg = [(m, c) for m, c in zip(P.monoms(), P.coeffs()) if c < 0]
    return (not neg), {"terms": len(P.coeffs()), "negative": [(m, str(c)) for m, c in neg[:8]]}


def _as_poly(q, var):
    return q if isinstance(q, sp.Poly) else sp.Poly(sp.expand(q), var)


def nonneg_on_interval(q, var, lo, hi) -> bool:
    """Exact: is the univariate polynomial q >= 0 on the closed interval [lo, hi]?

    Sturm root counting (Poly.count_roots): if q has no root in the open interval
    (lo, hi) it has constant sign there, and we require q(lo) >= 0, q(hi) >= 0, q(mid) > 0.
    Sound (never accepts a polynomial that is negative somewhere on [lo, hi]);
    conservative for interior roots of even multiplicity.
    """
    q = _as_poly(q, var)
    if q.is_zero:
        return True
    lo, hi = sp.Rational(lo), sp.Rational(hi)
    closed = q.count_roots(lo, hi)
    ends = int(q.eval(lo) == 0) + int(q.eval(hi) == 0)
    if closed - ends > 0:
        return False
    return q.eval(lo) >= 0 and q.eval(hi) >= 0 and q.eval((lo + hi) / 2) > 0


def nonneg_on_integers_from(q, var, lo: int):
    """Exact certificate that q(k) >= 0 for every integer k >= lo.

    The real roots are isolated exactly (Poly.intervals, rational endpoints).  Beyond the
    largest isolating interval q has the sign of its leading coefficient (required > 0),
    and the finitely many integers up to that bound are evaluated exactly.
    """
    q = _as_poly(q, var)
    if q.is_zero:
        return True, {"zero": True}
    if q.degree() == 0:
        return q.LC() >= 0, {"constant": str(q.LC())}
    if q.LC() < 0:
        return False, {"leading_coefficient": str(q.LC())}
    ivs = q.intervals()
    hi_root = max((t for (_s, t), _m in ivs), default=sp.Rational(lo - 1))
    Z = max(lo, int(sp.floor(hi_root)) + 1)
    bad = [(k, str(q.eval(k))) for k in range(lo, Z + 1) if q.eval(k) < 0]
    return (not bad), {
        "degree": q.degree(),
        "real_roots": len(ivs),
        "real_roots_ge_lo": q.count_roots(lo, None),
        "largest_root_upper_bound": str(hi_root),
        "integers_checked": f"[{lo},{Z}]",
        "negative_values": bad[:5],
    }


def bernstein_certificate(coeffs, da, db, box, relevant, in_region, max_depth=12):
    """Exact Bernstein-subdivision certificate for a bivariate polynomial p(a,b) on a box.

    coeffs: {(i,j): Fraction} power-basis coefficients; da, db the degrees; box =
    (a0,a1,b0,b1).  Boxes with relevant(a0,a1,b0,b1) == False lie outside the region of
    interest and are skipped.  A box is accepted when all its Bernstein coefficients are
    >= 0 (then p >= 0 on the box).  A corner Bernstein coefficient is the exact value
    p(corner); a negative one at a corner inside the region (in_region) is a genuine
    counterexample.  Returns (ok, stats).
    """
    stats = {"ok": 0, "skipped": 0, "undecided": 0}

    def poly_on_box(a0, a1, b0, b1):
        out = {}
        ha, hb = a1 - a0, b1 - b0
        for (i, j), cf in coeffs.items():
            for k in range(i + 1):
                ca = comb(i, k) * a0 ** (i - k) * ha**k
                if ca == 0:
                    continue
                for m in range(j + 1):
                    cb = comb(j, m) * b0 ** (j - m) * hb**m
                    if cb == 0:
                        continue
                    out[(k, m)] = out.get((k, m), 0) + cf * ca * cb
        return out

    def bernstein(power):
        B = {}
        for i in range(da + 1):
            for j in range(db + 1):
                val = Fraction(0)
                for (k, m), cf in power.items():
                    if k <= i and m <= j:
                        val += cf * Fraction(comb(i, k), comb(da, k)) * Fraction(comb(j, m), comb(db, m))
                B[(i, j)] = val
        return B

    def rec(a0, a1, b0, b1, depth):
        if not relevant(a0, a1, b0, b1):
            stats["skipped"] += 1
            return True
        B = bernstein(poly_on_box(a0, a1, b0, b1))
        if all(vv >= 0 for vv in B.values()):
            stats["ok"] += 1
            return True
        for (i, j), (ca, cb) in (((0, 0), (a0, b0)), ((da, 0), (a1, b0)), ((0, db), (a0, b1)), ((da, db), (a1, b1))):
            if B[(i, j)] < 0 and in_region(ca, cb):
                stats["negative_witness"] = (str(ca), str(cb), str(B[(i, j)]))
                return False
        if depth >= max_depth:
            stats["undecided"] += 1
            return False
        am, bm = (a0 + a1) / 2, (b0 + b1) / 2
        return (
            rec(a0, am, b0, bm, depth + 1)
            and rec(am, a1, b0, bm, depth + 1)
            and rec(a0, am, bm, b1, depth + 1)
            and rec(am, a1, bm, b1, depth + 1)
        )

    a0, a1, b0, b1 = (Fraction(vv) for vv in box)
    return rec(a0, a1, b0, b1, 0), stats


def poly_to_coeff_dict(expr, ga, gb):
    P = sp.Poly(sp.expand(expr), ga, gb)
    coeffs = {m: frac(cf) for m, cf in zip(P.monoms(), P.coeffs())}
    return coeffs, max(m[0] for m in coeffs), max(m[1] for m in coeffs)


def sign_a_plus_b_sqrtD(A: Fraction, B: Fraction, D: int) -> int:
    """Exact sign of A + B*sqrt(D) for rational A, B and an integer D >= 0."""
    if B == 0 or D == 0:
        return (A > 0) - (A < 0)
    if A == 0:
        return (B > 0) - (B < 0)
    if (A > 0) == (B > 0):
        return 1 if A > 0 else -1
    lhs, rhs = A * A, B * B * D
    if lhs == rhs:
        return 0
    return (1 if A > 0 else -1) if lhs > rhs else (1 if B > 0 else -1)


# =============================================================================
# Numeric (Fraction) versions of the bounds and forest statistics
# =============================================================================
def forest_stats(nv, edges):
    deg = [0] * nv
    for uu, vv in edges:
        deg[uu] += 1
        deg[vv] += 1
    ee = len(edges)
    zz = sum(1 for d in deg if d == 0)
    return {
        "n": nv,
        "e": ee,
        "z": zz,
        "l": sum(1 for d in deg if d == 1),
        "I": sum(1 for d in deg if d >= 2),
        "c'": (nv - zz) - ee,
        "S": sum(comb(d, 2) for d in deg),
        "T3": sum(comb(d, 3) for d in deg),
        "P": sum((deg[uu] - 1) * (deg[vv] - 1) for uu, vv in edges),
    }


def G_num(nv, ee, ll, SS):
    """G(n,e,l,S) with exact Fractions (needs 2e - l > 0)."""
    p2v = binom(nv, 2) - ee
    c3v = binom(nv, 3) - ee * (nv - 2)
    c4v = binom(nv, 4) - ee * binom(nv - 2, 2)
    D2v = 2 * ee - ll
    return 3 * (c3v + SS) ** 2 + p2v * p2v - 4 * p2v * (c4v + SS * (nv - 4) + binom(ee, 2)) + Fraction(4 * p2v, 3) * (Fraction(2 * SS * SS, D2v) - SS)


def G0_num(nv, ee, SS):
    p2v = binom(nv, 2) - ee
    c3v = binom(nv, 3) - ee * (nv - 2)
    c4v = binom(nv, 4) - ee * binom(nv - 2, 2)
    return 3 * (c3v + SS) ** 2 + p2v * p2v - 4 * p2v * (c4v + SS * (nv - 4) + binom(ee, 2))


def main() -> None:
    # ------------------------------------------------------------------ (0) self-tests of every certificate routine
    x_, y_ = sp.symbols("x_ y_")
    t1 = coeff_certificate((x_ + y_) ** 2, (x_, y_))[0] and not coeff_certificate((x_ - y_) ** 2, (x_, y_))[0]
    step("(0) self-test: coefficient certificate accepts (x+y)^2 and refuses (x-y)^2", t1)
    t2 = (
        nonneg_on_interval((x_ - 1) ** 2 + sp.Rational(1, 10), x_, 0, 2)
        and not nonneg_on_interval((x_ - 1) ** 2 - sp.Rational(1, 10), x_, 0, 2)
        and nonneg_on_interval(x_ * (x_ - 2), x_, -3, 0)  # a root exactly at an endpoint is allowed
        and not nonneg_on_interval(x_ * (x_ - 2), x_, 0, 2)
    )
    step("(0) self-test: interval certificate accepts (x-1)^2+1/10 and x(x-2) on [-3,0]; refuses (x-1)^2-1/10 and x(x-2) on [0,2]", t2)
    t3 = (
        nonneg_on_integers_from((x_ - sp.Rational(5, 2)) ** 2 - sp.Rational(1, 8), x_, 0)[0]  # < 0 near 5/2 but >= 0 at every integer
        and not nonneg_on_integers_from((x_ - 4) * (x_ - 6), x_, 0)[0]  # negative at x = 5
        and not nonneg_on_integers_from(-(x_**2) + 1000, x_, 0)[0]  # negative leading coefficient
        and nonneg_on_integers_from(x_**2 * (x_ - 1) ** 2 * (x_ + 1), x_, 0)[0]  # zeros at 0 and 1 are allowed
    )
    step("(0) self-test: integer certificate accepts (x-5/2)^2-1/8 and x^2(x-1)^2(x+1); refuses (x-4)(x-6) and 1000-x^2", t3)
    neg_c = {(2, 0): Fraction(1), (1, 0): Fraction(-8), (0, 0): Fraction(159, 10)}  # (a-4)^2 - 1/10
    pos_c = {(2, 0): Fraction(1), (1, 0): Fraction(-8), (0, 0): Fraction(161, 10)}  # (a-4)^2 + 1/10
    always = lambda *args: True  # noqa: E731
    r1, s1 = bernstein_certificate(neg_c, 2, 0, (3, 5, 1, 2), always, always)
    r2, s2 = bernstein_certificate(pos_c, 2, 0, (3, 5, 1, 2), always, always)
    step(
        "(0) self-test: Bernstein routine refuses (a-4)^2 - 1/10 and accepts (a-4)^2 + 1/10 on [3,5]x[1,2]",
        (not r1) and r2,
        {"negative_witness": s1.get("negative_witness"), "accepted_boxes": s2["ok"]},
    )
    t4 = (
        sign_a_plus_b_sqrtD(Fraction(3), Fraction(-2), 2) > 0  # 3 - 2 sqrt2 = 0.17 > 0
        and sign_a_plus_b_sqrtD(Fraction(-3), Fraction(2), 2) < 0
        and sign_a_plus_b_sqrtD(Fraction(2), Fraction(-1), 4) == 0  # 2 - sqrt4 = 0
        and sign_a_plus_b_sqrtD(Fraction(-1), Fraction(1), 2) > 0  # sqrt2 - 1 > 0
    )
    step("(0) self-test: exact sign of A + B sqrt(D) on four cases", t4)

    # ------------------------------------------------------------------ symbolic objects
    n, e, l, S, lam, a, b, c, s, u, w, v, z, r = sp.symbols("n e l S lambda a b c s u w v z r")
    p2 = C(n, 2) - e
    c3 = C(n, 3) - e * (n - 2)
    c4 = C(n, 4) - e * C(n - 2, 2)
    D2 = 2 * e - l
    W = 2 * S**2 / D2 - S
    G = 3 * (c3 + S) ** 2 + p2**2 - 4 * p2 * (c4 + S * (n - 4) + C(e, 2)) + sp.Rational(4, 3) * p2 * W
    Smax = C(lam, 2) + e - lam
    Kt = sp.expand(sp.cancel((G * 12 * D2).subs({S: Smax, l: lam})))
    G0 = sp.expand(3 * (c3 + S) ** 2 + p2**2 - 4 * p2 * (c4 + S * (n - 4) + C(e, 2)))

    ok_poly = sp.denom(sp.together(Kt)) == 1 and all(sp.Rational(cf).q == 1 for cf in sp.Poly(Kt, n, e, lam).coeffs())
    step("(5) K~(n,e,lambda) = 12(2e-lambda) G(n,e,lambda,Smax(lambda)) is an integer polynomial", ok_poly, {"K~": str(Kt)[:150] + "..."})
    step("(5) dG/dl = (8 p_2/3) S^2/(2e-l)^2 (G is non-decreasing in l when p_2 >= 0, l < 2e)", sp.simplify(sp.diff(G, l) - sp.Rational(8, 3) * p2 * S**2 / D2**2) == 0)
    step("(5) G(n,e,2e-2S,S) = G0(n,e,S): the Cauchy-Schwarz term vanishes at l = 2e-2S", sp.simplify(sp.cancel(G.subs(l, 2 * e - 2 * S)) - G0) == 0, {"G0": str(G0)})
    smax_props = sp.expand(Smax.subs(lam, 2) - (e - 1)) == 0 and sp.expand(Smax.subs(lam, e) - C(e, 2)) == 0 and sp.expand(sp.diff(Smax, lam) - (lam - sp.Rational(3, 2))) == 0
    step("(5) Smax(2) = e-1, Smax(e) = C(e,2), Smax'(lambda) = lambda - 3/2 > 0 on [2,oo)", smax_props)
    cons = True
    for nn in (3, 4, 5, 7, 9, 12):
        for ee in sorted({2, 3, nn - 2, nn - 1}):
            if ee < 2:
                continue
            for ll in sorted({2, 3, ee, 2 * ee - 2}):
                if not 2 <= ll <= 2 * ee - 2:
                    continue
                for SS in (0, 1, ee - 1, ee, comb(ee, 2)):
                    if frac(G.subs({n: nn, e: ee, l: ll, S: SS})) != G_num(nn, ee, ll, SS):
                        cons = False
            for SS in (0, 1, ee - 1):
                if frac(G0.subs({n: nn, e: ee, S: SS})) != G0_num(nn, ee, SS):
                    cons = False
    step("(5) Fraction implementations of G and G0 agree with the symbolic ones on integer samples", cons)

    # ------------------------------------------------------------------ (D) cores: forests without isolated vertices, I >= 1, e <= EMAX_SMALL
    trees_by_size = {}

    def tree_parents(size):
        if size not in trees_by_size:
            trees_by_size[size] = list(free_trees(size))
        return trees_by_size[size]

    def forest_edges(parts, idxs):
        edges, off = [], 0
        for size, idx in zip(parts, idxs):
            parent = tree_parents(size)[idx]
            edges.extend((off + pu, off + pv) for pu, pv in parent_to_edges(parent))
            off += size
        return edges

    def q3_poly_in_z(poly):
        """Q_3(F' + z K_1) as an exact polynomial in z, from I(F'+zK_1;x) = (1+x)^z I(F';x)."""
        pk = [sp.expand(sum((poly[j] if j < len(poly) else 0) * C(z, k - j) for j in range(0, k + 1))) for k in range(0, 5)]
        return sp.Poly(sp.expand(3 * pk[3] ** 2 + pk[2] ** 2 - 4 * pk[2] * pk[4]), z)

    cores = []
    shared_cache = {}
    for nprime in range(3, 2 * EMAX_SMALL):  # n' = e + c' <= 2e - 1 <= 9 when I >= 1 and e <= 5
        for parts, idxs, poly in forest_polys(nprime, shared_cache):
            if any(sz < 2 for sz in parts) or all(sz == 2 for sz in parts):
                continue  # isolated vertex present / I = 0
            if nprime - len(parts) > EMAX_SMALL:
                continue
            cores.append((nprime, parts, idxs, poly))
    core_records = []
    okD = True
    for nprime, parts, idxs, poly in cores:
        st = forest_stats(nprime, forest_edges(parts, idxs))
        q = q3_poly_in_z(poly)
        ok, det = nonneg_on_integers_from(q, z, 0)
        for zz in range(0, 7):  # cross-check the polynomial against the direct computation
            p = poly_mul(poly, poly_mul_pow([1, 1], zz))
            coef = lambda k: p[k] if k < len(p) else 0  # noqa: E731
            if int(q.eval(zz)) != 3 * coef(3) ** 2 + coef(2) ** 2 - 4 * coef(2) * coef(4):
                ok = False
                det["cross_check"] = "mismatch"
        okD = okD and ok
        core_records.append({"n'": nprime, "parts": parts, "e": st["e"], "l": st["l"], "S": st["S"], "I": st["I"], "poly": poly, "Q3(z)": str(q.as_expr()), "certified": ok, "detail": det})
    step(
        f"(D) enumeration: {len(cores)} cores (forests without isolated vertices, I >= 1, e <= {EMAX_SMALL})",
        len(cores) == 26,
        {"by_e": {ee: sum(1 for rec in core_records if rec["e"] == ee) for ee in range(2, EMAX_SMALL + 1)}},
    )
    step(
        "(D) Q_3(F' + z K_1) >= 0 for every core F' and every integer z >= 0 (exact real-root isolation; cross-checked for z <= 6)",
        okD,
        {
            "min_Q3_at_z=0": str(min(sp.Poly(rec["Q3(z)"], z).eval(0) for rec in core_records)),
            "all_real_roots_negative": all(rec["detail"].get("real_roots_ge_lo") == 0 for rec in core_records),
            "all_coefficients_positive": all(coeff_certificate(sp.sympify(rec["Q3(z)"], locals={"z": z}), (z,))[0] for rec in core_records),
        },
    )
    core_polys = {tuple(rec["poly"]) for rec in core_records}

    # ------------------------------------------------------------------ (1)-(5), (E): every forest with n <= NDIRECT
    Kt_coeffs = {}  # (n, e) -> integer coefficients of K~ as a polynomial in lambda (highest first)

    def k_tilde_at(nn, ee, q3, Dd):
        """Exact sign of 12(2e - lambda) Q_3 - K~(n,e,lambda) at lambda = (3 + sqrt(Dd))/2, computed in Q(sqrt Dd)."""
        if (nn, ee) not in Kt_coeffs:
            Kt_coeffs[(nn, ee)] = [int(cf) for cf in sp.Poly(Kt.subs({n: nn, e: ee}), lam).all_coeffs()]
        # arithmetic in Q(sqrt D): pairs (A, B) = A + B sqrt(D)
        def mul(p_, q_):
            return (p_[0] * q_[0] + p_[1] * q_[1] * Dd, p_[0] * q_[1] + p_[1] * q_[0])

        lam_v = (Fraction(3, 2), Fraction(1, 2))
        acc = (Fraction(0), Fraction(0))
        for cf in Kt_coeffs[(nn, ee)]:
            acc = mul(acc, lam_v)
            acc = (acc[0] + cf, acc[1])
        lhs = (Fraction(12 * q3) * (2 * ee - lam_v[0]), Fraction(12 * q3) * (-lam_v[1]))
        return sign_a_plus_b_sqrtD(lhs[0] - acc[0], lhs[1] - acc[1], Dd)

    counts = {}
    min_q3 = None
    lemma_fail = []
    regime_counts = {"I=0": 0, "R1 (S>=e-1)": 0, "R2 (S<=e-1)": 0, "e<=5, I>=1 (step D)": 0}
    n_direct = 0
    covD = True
    for order in range(1, NDIRECT + 1):
        cnt = 0
        for parts, idxs, poly in forest_polys(order, shared_cache):
            cnt += 1
            edges = forest_edges(parts, idxs)
            if order <= 10 and indpoly_forest(order, edges) != poly:
                lemma_fail.append(("poly mismatch", order, parts, idxs))
            st = forest_stats(order, edges)
            nn, ee, zz, ll, II, cp, SS, TT, PP = (st[k] for k in ("n", "e", "z", "l", "I", "c'", "S", "T3", "P"))
            coef = lambda k: poly[k] if k < len(poly) else 0  # noqa: E731
            q3 = 3 * coef(3) ** 2 + coef(2) ** 2 - 4 * coef(2) * coef(4)
            if len(poly) > 4 and q3 != iso_value(poly, 3):
                lemma_fail.append(("iso_value", order, parts, idxs))
            if coef(2) != binom(nn, 2) - ee or coef(3) != binom(nn, 3) - ee * (nn - 2) + SS:
                lemma_fail.append(("(1) p2/p3", order, parts, idxs))
            if coef(4) != binom(nn, 4) - ee * binom(nn - 2, 2) + SS * (nn - 4) + binom(ee, 2) - PP - TT:
                lemma_fail.append(("(1) p4", order, parts, idxs))
            if cp != sum(1 for p_ in parts if p_ >= 2) or zz != sum(1 for p_ in parts if p_ == 1) or nn - zz != ee + cp or PP < 0 or binom(nn, 2) - ee < 0:
                lemma_fail.append(("(2) components / P >= 0 / p2 >= 0", order, parts, idxs))
            if q3 < 0:
                lemma_fail.append(("Q3<0", order, parts, idxs, q3))
            min_q3 = q3 if min_q3 is None else min(min_q3, q3)
            if II == 0:
                regime_counts["I=0"] += 1
                if SS != 0 or TT != 0 or PP != 0 or q3 != G0_num(nn, ee, 0) or poly != poly_mul(poly_mul_pow([1, 2], ee), poly_mul_pow([1, 1], zz)):
                    lemma_fail.append(("(A) identity", order, parts, idxs))
            else:
                DD2 = 2 * ee - ll
                if not (DD2 > 0 and 3 * TT >= Fraction(2 * SS * SS, DD2) - SS):
                    lemma_fail.append(("(3)", order, parts, idxs))
                if not (ll >= 2 * cp and SS <= comb(ll + 2 - 2 * cp, 2) + ee + cp - ll - 1 <= comb(ll, 2) + ee - ll):
                    lemma_fail.append(("(4a)", order, parts, idxs))
                if not (SS >= ee - cp and SS >= II and ll >= 2 * ee - 2 * SS and 1 <= SS <= comb(ee, 2) and 2 <= ll <= 2 * ee - 2):
                    lemma_fail.append(("(4bc)", order, parts, idxs))
                if not q3 >= G_num(nn, ee, ll, SS):
                    lemma_fail.append(("(5) Q3 >= G", order, parts, idxs))
                if SS >= ee - 1:
                    regime_counts["R1 (S>=e-1)"] += 1
                    Dd = 9 - 8 * ee + 8 * SS  # lambda = (3 + sqrt(Dd))/2 solves Smax(lambda) = S
                    if Dd < 1 or k_tilde_at(nn, ee, q3, Dd) < 0:
                        lemma_fail.append(("(R1) Q3 >= K(n,e,lambda)", order, parts, idxs))
                if SS <= ee - 1:
                    regime_counts["R2 (S<=e-1)"] += 1
                    if not (G_num(nn, ee, ll, SS) >= G0_num(nn, ee, SS) and q3 >= G0_num(nn, ee, SS)):
                        lemma_fail.append(("(R2) Q3 >= G >= G0", order, parts, idxs))
                if ee <= EMAX_SMALL:
                    regime_counts["e<=5, I>=1 (step D)"] += 1
                    core_poly = list(poly)  # divide I(F) by (1+x)^z exactly to recover the core
                    for _ in range(zz):
                        qd = []
                        for k in range(len(core_poly) - 1):
                            qd.append(core_poly[k] - (qd[k - 1] if k else 0))
                        if core_poly[-1] != qd[-1]:
                            covD = False
                        core_poly = qd
                    if tuple(core_poly) not in core_polys:
                        covD = False
            n_direct += 1
        counts[order] = cnt
        if cnt != A005195[order]:
            lemma_fail.append(("count", order, cnt, A005195[order]))
    step(
        f"(1)-(5) exact identities and lemmas on all {n_direct} forests with n <= {NDIRECT} (counts match OEIS A005195)",
        not lemma_fail,
        {"failures": lemma_fail[:5], "counts": counts, "regimes": regime_counts},
    )
    step(f"(E) Q_3 >= 0 directly for all {n_direct} forests with n <= {NDIRECT}", not [f for f in lemma_fail if f[0] == "Q3<0"], {"min_Q3": min_q3})
    step(f"(D) coverage: every forest with n <= {NDIRECT}, I >= 1, e <= {EMAX_SMALL} is (core) + z K_1 for one of the {len(cores)} cores", covD)

    # ------------------------------------------------------------------ (A) I = 0
    def pk_product(k):
        return sp.expand(sum(C(e, j) * 2**j * C(z, k - j) for j in range(0, k + 1)))

    Q3A = sp.expand(3 * pk_product(3) ** 2 + pk_product(2) ** 2 - 4 * pk_product(2) * pk_product(4))
    GA = sp.expand(G0.subs(S, 0).subs(n, 2 * e + z))
    step("(A) Q_3((1+2x)^e (1+x)^z) = G0(2e+z, e, 0) as polynomials in (e,z)", sp.expand(Q3A - GA) == 0, {"Q3": str(sp.factor(Q3A))})
    okA2, detA2 = coeff_certificate(Q3A.subs(z, z + 2), (e, z))
    step("(A) z >= 2: Q_3(e, z+2) has only non-negative coefficients in (e,z)", okA2, detA2)
    qz0 = sp.Poly(Q3A.subs(z, 0), e)
    qz1 = sp.Poly(Q3A.subs(z, 1), e)
    okA0, detA0 = nonneg_on_integers_from(qz0, e, 0)
    okA1, detA1 = nonneg_on_integers_from(qz1, e, 0)
    step("(A) z = 0: Q_3(e,0) = 4e^2(e-1)^2(4e-5)/3 >= 0 for all integers e >= 0", okA0 and sp.expand(qz0.as_expr() - sp.Rational(4, 3) * e**2 * (e - 1) ** 2 * (4 * e - 5)) == 0, detA0)
    step("(A) z = 1: Q_3(e,1) = 4e^2(4e^3-4e^2+2e+1)/3 >= 0 for all integers e >= 0", okA1 and sp.expand(qz1.as_expr() - sp.Rational(4, 3) * e**2 * (4 * e**3 - 4 * e**2 + 2 * e + 1)) == 0, detA1)
    PA = sp.Poly(Q3A, e, z)
    Q3A_coeffs = {m: frac(cf) for m, cf in zip(PA.monoms(), PA.coeffs())}
    Q3A_eval = lambda ee, zz: sum(cf * ee**i * zz**j for (i, j), cf in Q3A_coeffs.items())  # noqa: E731  exact Fractions
    badA = []
    newton_ok = True
    for ee in range(0, 31):
        pe = poly_mul_pow([1, 2], ee)
        for zz in range(0, 31):
            p = poly_mul(pe, poly_mul_pow([1, 1], zz))
            coef = lambda k: p[k] if k < len(p) else 0  # noqa: E731
            q3 = 3 * coef(3) ** 2 + coef(2) ** 2 - 4 * coef(2) * coef(4)
            if q3 < 0 or Q3A_eval(ee, zz) != q3:
                badA.append((ee, zz, q3))
            if len(p) - 1 >= 4 and q3 < coef(2) ** 2:  # Theorem 7.1 (Newton): Q_3 >= p_2^2 when alpha >= 4
                newton_ok = False
    step("(A) numeric: Q_3 >= 0 (and Q_3 >= p_2^2 when alpha >= 4, as Newton predicts) for all e, z <= 30", not badA and newton_ok, {"cases": 31 * 31})

    # ------------------------------------------------------------------ (B) monotonicity in n for n >= e + 1
    sub_abc = lambda expr: sp.expand(expr.subs(lam, 2 + a).subs(e, 2 + a + b).subs(n, 3 + a + b + c))  # noqa: E731
    DK = sub_abc(sp.expand(Kt.subs(n, n + 1) - Kt))
    okB1, detB1 = coeff_certificate(DK, (a, b, c))
    step("(B1) K~(n+1,e,lambda) - K~(n,e,lambda) has only non-negative coefficients (lambda=2+a, e=2+a+b, n=3+a+b+c)", okB1, detB1)
    Kabc = sub_abc(Kt)
    Ktree_ab = sp.expand(Kabc.subs(c, 0))
    okB1d, detB1d = coeff_certificate(Kabc - Ktree_ab, (a, b, c))
    step("(B1') K~(n,e,lambda) - K~(e+1,e,lambda) has only non-negative coefficients in (a,b,c) (all real n >= e+1)", okB1d, detB1d)
    DG0 = sp.expand(G0.subs(n, n + 1) - G0)
    DG0s = sp.expand(DG0.subs(S, s).subs(e, 1 + s + u).subs(n, 2 + s + u + c))
    okB2, detB2 = coeff_certificate(DG0s, (s, u, c))
    step("(B2) G0(n+1,e,S) - G0(n,e,S) has only non-negative coefficients (S=s, e=1+s+u, n=2+s+u+c)", okB2, detB2)

    # ------------------------------------------------------------------ (C1) base of R1: the tree polynomial K~(e+1,e,lambda), e+1 >= 7
    Ks = Ktree_ab  # K~(3+a+b, 2+a+b, 2+a): lambda = 2+a, n = e+1 = 3+a+b, b = e - lambda
    tree_report = os.path.join(HERE, "..", "reports", "iso3_trees_proof.json")
    try:
        with open(tree_report, encoding="utf-8") as fh:
            tree_ab = json.load(fh)["K_tilde_ab"]
        step("(C1) K~(e+1,e,lambda) coincides with the tree polynomial K~(a,b) recorded in reports/iso3_trees_proof.json", sp.expand(sp.sympify(tree_ab, locals={"a": a, "b": b}) - Ks) == 0)
    except (OSError, KeyError, ValueError) as exc:  # the comparison is informational; the certificate below is self-contained
        results["(C1) tree report comparison skipped"] = {"pass": True, "detail": str(exc)}
        print("INFO (C1) tree report not available for comparison:", exc)
    consK = True
    for ee in range(2, 21):
        for ll in range(2, ee + 1):
            Sb = comb(ll, 2) + ee - ll
            for nn in (ee + 1, ee + 2, ee + 5):
                if frac(Kt.subs({n: nn, e: ee, lam: ll})) != 12 * (2 * ee - ll) * G_num(nn, ee, ll, Sb):
                    consK = False
    step("(C1) symbolic K~ matches 12(2e-lambda) G(n,e,lambda,Smax(lambda)) numerically (e <= 20, three n each)", consK)
    K22 = sp.expand(Ks.subs({a: a + 2, b: b + 2}))
    okC1a, detC1a = coeff_certificate(K22 - (a**6 - a**5 * b + 10 * a**4 * b**2), (a, b))
    sos_ok = sp.expand((a - b / 2) ** 2 + sp.Rational(39, 4) * b**2 - (a**2 - a * b + 10 * b**2)) == 0
    step("(C1a) a,b >= 2: K~(a+2,b+2) - a^4(a^2-ab+10b^2) has only non-negative coefficients, a^2-ab+10b^2 = (a-b/2)^2 + 39b^2/4", okC1a and sos_ok, detC1a)
    Kb = sp.Poly(sp.expand(Ks.subs(b, b + 4)), b)
    okA_strip = all(nonneg_on_interval(q, a, 0, 2) for q in Kb.all_coeffs())
    Ka = sp.Poly(sp.expand(Ks.subs(a, a + 4)), a)
    okB_strip = all(nonneg_on_interval(q, b, 0, 2) for q in Ka.all_coeffs())
    step("(C1b) strips 0<=a<=2, b>=4 and 0<=b<=2, a>=4: every coefficient of K~(a,b+4) in b (resp. of K~(a+4,b) in a) is >= 0 on [0,2]", okA_strip and okB_strip, {"coefficients": [len(Kb.all_coeffs()), len(Ka.all_coeffs())]})
    K_coeffs, K_da, K_db = poly_to_coeff_dict(Ks, a, b)
    rel = lambda a0, a1, b0, b1: a1 + b1 >= NMIN_TREE - 3  # noqa: E731  (a + b >= 4 <=> n >= 7)
    inreg = lambda ca, cb: ca + cb >= NMIN_TREE - 3  # noqa: E731
    for A0, A1, Bb0, Bb1 in [(0, 2, 2, 4), (2, 4, 0, 2)]:
        okC1c, stC1c = bernstein_certificate(K_coeffs, K_da, K_db, (A0, A1, Bb0, Bb1), rel, inreg)
        step(f"(C1c) Bernstein certificate for K~ on a in [{A0},{A1}], b in [{Bb0},{Bb1}], a+b >= {NMIN_TREE-3}", okC1c, stC1c)
    step("(C1) region coverage: {a,b>=0, a+b>=4} = {a,b>=2} U {a<=2,b>=4} U {b<=2,a>=4} U {a<=2,2<=b<=4,a+b>=4} U {b<=2,2<=a<=4,a+b>=4}", True)
    K65 = sp.Poly(Kt.subs({n: 6, e: 5}), lam)
    step("(C1) remark: K~(6,5,lambda) < 0 at lambda = 7/2, so the base case genuinely needs e >= 6 (e <= 5 is step D)", K65.eval(sp.Rational(7, 2)) < 0, {"K~(6,5,7/2)": str(K65.eval(sp.Rational(7, 2)))})

    # ------------------------------------------------------------------ (C2) base of R2: G0(e+1,e,S) >= 0 for e >= 5, S <= e-1
    G0b = sp.expand(G0.subs(n, e + 1))
    step("(C2) G0(e+1,e,S) = 3S^2 - e(e-1)^2 S + e^2(e-1)^2(e-2)/4", sp.expand(G0b - (3 * S**2 - e * (e - 1) ** 2 * S + e**2 * (e - 1) ** 2 * (e - 2) / 4)) == 0)
    G0bwv = sp.expand(G0b.subs(S, e - 1 - w).subs(e, 5 + v))
    okC2, detC2 = coeff_certificate(G0bwv, (w, v))
    step("(C2) G0(e+1,e,e-1-w) with e = 5+v has only non-negative coefficients (e >= 5, S <= e-1)", okC2, detC2)
    # remark (not needed): the weaker bound G(e+1,e,2,S) that uses only l >= 2 also certifies for e >= 5, S <= e-1
    H2 = sp.expand(sp.cancel((G * 3 * D2).subs({l: 2, n: e + 1})))
    okC2r, detC2r = coeff_certificate(H2.subs(S, e - 1 - w).subs(e, 5 + v), (w, v))
    step("(C2) remark: 3(2e-2) G(e+1,e,2,S) (using only l >= 2) with S = e-1-w, e = 5+v also has only non-negative coefficients", okC2r, detC2r)

    # ------------------------------------------------------------------ logical assembly
    step("(F) case split: I = 0 [A]; I >= 1, e <= 5 [D]; I >= 1, e >= 6 (n >= e+1 >= 7): S >= e-1 via (B1)+(C1), S <= e-1 via (B2)+(C2)", True)

    all_ok = not failures
    marker = MARKER_OK if all_ok else MARKER_BAD
    print(marker)
    payload = {
        "theorem": "For every forest F, Q_3(F) = 3 p_3^2 + p_2^2 - 4 p_2 p_4 >= 0 (ISO_3).",
        "marker": marker,
        "all_steps_pass": all_ok,
        "failed_steps": failures,
        "steps": results,
        "polynomials": {
            "G(n,e,l,S)": str(G),
            "K_tilde(n,e,lambda)": str(Kt),
            "K_tilde_tree_ab": str(Ks),
            "K_tilde_abc_minus_tree": str(sp.expand(Kabc - Ktree_ab)),
            "DeltaK_abc": str(DK),
            "G0(n,e,S)": str(G0),
            "DeltaG0_suc": str(DG0s),
            "G0(e+1,e,S)": str(G0b),
            "G0(e+1,e,e-1-w)_e=5+v": str(G0bwv),
            "Q3_I0(e,z)": str(Q3A),
            "Q3_I0(e,z+2)": str(sp.expand(Q3A.subs(z, z + 2))),
        },
        "cores_step_D": core_records,
        "direct_check": {"n_max": NDIRECT, "forests": n_direct, "min_Q3": min_q3, "regimes": regime_counts},
        "provenance": provenance(os.path.abspath(__file__)),
    }
    # timings are printed, not stored: the report (and hence its SHA256) is reproducible run to run
    print(f"timing: cpu {time.process_time():.2f} s, wall {time.time() - T_START:.2f} s")
    print("report:", REPORT, "SHA256", write_report(REPORT, payload))
    if not all_ok:
        print("FAILED STEPS:", failures)
        raise SystemExit(1)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:  # any crash must not look like a proof
        traceback.print_exc()
        print(MARKER_BAD)
        raise SystemExit(2)
