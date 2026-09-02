#!/usr/bin/env python3
"""ISO_r in the tail of the independence sequence of a forest: exact range.

Notation (as in erdos993lib.checks).  p_k = number of independent k-sets of a
forest F, alpha = deg I(F;x), L(alpha) = ceil((2 alpha - 1)/3), d := alpha - r,

    ISO_r :  Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1}  >=  0,
    x = p_r / p_{r-1},   y = p_{r+1} / p_r,   Q_r/(p_{r-1} p_r) = r x + 1/x - (r+1) y.

Tools (all cited precisely in docs/ISO_TAIL_THEOREM.md):
  [LM]  Levit-Mandrescu, arXiv:math/0406623, Lemma 2.3 + Prop. 2.6 / Cor. 2.7:
        for a bipartite graph, (k+1) p_{k+1} <= 2 (alpha - k) p_k, 0 <= k < alpha.
  [FR]  Fisher-Ryan (as Theorem 2.1 of Basit-Galvin, arXiv:2006.12562):
        t_k := (p_k / C(alpha,k))^{1/k} is non-increasing in k (every graph).
  [Z]   Zykov (Theorem 2.2 of Basit-Galvin): p_k <= C(alpha,k) (n/alpha)^k; for a
        forest n <= 2 alpha, so 1 <= t_k <= n/alpha <= 2.  (Also a consequence of
        [FR]: t_k <= t_1 = n/alpha.)

What is proved (and machine-checked below):
  Theorem A (root range).  ISO_r holds for every forest whenever
        (alpha - r)^2 <= r,  i.e.  r >= r_A(alpha) := alpha - floor((sqrt(4 alpha + 1) - 1)/2)
        (equivalently d(d+1) <= alpha, d = alpha - r).  Proof: [LM] gives
        (r+1) y <= 2 d, AM-GM gives r x + 1/x >= 2 sqrt(r).
  Theorem A' (n-refined).  ISO_r holds whenever (alpha - r) n / alpha <= 2 sqrt(r).
  Theorem B (Fisher-Ryan refinement).  With q(w) := w + r/w - d (2^{r-1} w/(d+1))^{1/r},
        Q_r/(p_{r-1} p_r) >= min{ q(w) : sqrt(r) <= w <= 2(d+1) }  (or > 0 outright);
        since q decreases on (0, sqrt(r)], this minimum is >= 0 iff
        P_{r,d}(w) := (d+1) (w^2 + r)^r - 2^{r-1} d^r w^{r+1} >= 0 on [0, 2(d+1)],
        and then ISO_r holds for every forest with alpha = r + d.
        The least r_B(alpha) such that this holds for all r' in [r_B, alpha-1] is
        tabulated exactly (sympy real-root counting) for alpha <= ALPHA_MAX.
  Obstruction.  Whenever the criterion of Theorem B fails at (alpha, r) there is an
        explicit rational sequence p_0..p_alpha satisfying [LM] at every level, [FR]
        at every level, [Z], WR_k at every level and TAIL, with Q_r < 0.  So no
        argument that uses only these inequalities can prove ISO_r there; in
        particular the whole tail r >= L(alpha) is reachable by these tools only for
        alpha in {2,...,7,10}.
  Variance form.  ISO_r  <=>  Var_S e(S) <= E_S e(S) + 2 E_S m(F - N[S]) + r, S uniform
        over independent (r-1)-sets (brute-force checked on all trees n <= 10).

Numerical consistency (never used as a proof step): all trees n <= 16 and all
forests n <= 14 (erdos993lib enumerations, counts matched to OEIS).

Exit status 1 if any check fails.  Writes reports/iso_tail_proof.json.
"""

from __future__ import annotations

import os
import sys
from fractions import Fraction
from math import comb, isqrt
from typing import Dict, List, Optional, Tuple

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import sympy as sp  # noqa: E402

from erdos993lib.checks import iso_margin, iso_value, tail_cutoff  # noqa: E402
from erdos993lib.indpoly import indpoly_parent_array  # noqa: E402
from erdos993lib.report import provenance, write_report  # noqa: E402
from erdos993lib.trees import A000055, A005195, forest_polys, free_trees, parent_to_edges  # noqa: E402

ALPHA_MAX = 60      # exact table of r_B(alpha) and witnesses
CLOSED_FORM_MAX = 100000
TREE_NMAX = 16
FOREST_NMAX = 14
VARIANCE_NMAX = 10

QUIET = "-q" in sys.argv[1:]
results: Dict[str, object] = {}
failures: List[str] = []


def step(name: str, ok: bool, detail=None) -> None:
    results[name] = {"pass": bool(ok), "detail": detail}
    print(("PASS " if ok else "FAIL ") + name + ("" if detail is None or QUIET else f"  {detail}"))
    if not ok:
        failures.append(name)


def marker(tag: str, ok: bool) -> None:
    print(tag if ok else tag.replace("PASS_", "FAIL_"))
    results.setdefault("markers", {})[tag] = bool(ok)  # type: ignore[index]


def no_floats(*exprs) -> bool:
    return all(not e.atoms(sp.Float) for e in exprs)


def d_max(a: int) -> int:
    """largest d >= 0 with d(d+1) <= a  (= floor((sqrt(4a+1)-1)/2))."""
    return (isqrt(4 * a + 1) - 1) // 2


def r_A(a: int) -> int:
    return a - d_max(a)


# =============================================================================
# 1. Algebra of the margin, AM-GM, the window, Theorem A's closed form
# =============================================================================
r, x, y, a_, d_, s_, D_, A_, B_, q_ = sp.symbols("r x y a d s D A B q", positive=True)

# (1.1) margin identity
Q = r * (a_ * x) ** 2 + a_**2 - (r + 1) * a_ * (a_ * x * y)
ok11 = sp.expand(Q / (a_ * a_ * x) - (r * x + 1 / x - (r + 1) * y)) == 0
# (1.2) AM-GM with equality case: r = s^2
ok12 = sp.expand((s_**2 * x + 1 / x - 2 * s_) * x - (s_ * x - 1) ** 2) == 0
# (1.3) window identity: r x^2 - 2 d x + 1 = r (x - x_-)(x - x_+), r = d^2 - D^2, x_pm = (d -+ D)/r
rr = d_**2 - D_**2
xm = (d_ - D_) / rr
xp = (d_ + D_) / rr
ok13 = sp.simplify(rr * x**2 - 2 * d_ * x + 1 - rr * (x - xm) * (x - xp)) == 0
# (1.4) r x + 1/x = r + 1 at x = 1 and x = 1/r; (r x + 1/x) - (r+1) = (r x - 1)(x - 1)/x
ok14 = sp.simplify((r * x + 1 / x).subs(x, 1) - (r + 1)) == 0 and sp.simplify(
    (r * x + 1 / x).subs(x, 1 / r) - (r + 1)
) == 0 and sp.expand((r * x + 1 / x - (r + 1)) * x - (r * x - 1) * (x - 1)) == 0
step("(1.1) Q_r/(p_{r-1} p_r) = r x + 1/x - (r+1) y", ok11 and no_floats(Q))
step("(1.2) r x + 1/x - 2 sqrt(r) = (sqrt(r) x - 1)^2 / x", ok12)
step("(1.3) r x^2 - 2 d x + 1 = r (x - x_-)(x - x_+),  x_pm = (d pm sqrt(d^2 - r))/r", ok13)
step("(1.4) r x + 1/x = r + 1 at x = 1 and x = 1/r; excess = (r x - 1)(x - 1)/x", ok14)

# (1.5) r + 1 >= 2 d  <=>  r >= L(alpha): so in the tail the AM-GM/LM argument works at x = 1 and x = 1/r
ok15 = True
for a in range(1, 301):
    L = tail_cutoff(a)
    for rr_ in range(1, a):
        if ((rr_ + 1 >= 2 * (a - rr_)) != (rr_ >= L)):
            ok15 = False
step("(1.5) r + 1 >= 2(alpha - r)  <=>  r >= L(alpha)   (alpha <= 300, all r)", ok15)

# (1.6) closed form of Theorem A: {r : 1 <= r <= alpha-1, (alpha-r)^2 <= r} = [r_A(alpha), alpha-1]
ok16 = True
rA_eq_L = []
rA_lt_L = []
for a in range(1, CLOSED_FORM_MAX + 1):
    d = d_max(a)
    if not (d * (d + 1) <= a < (d + 1) * (d + 2)):
        ok16 = False
    # (a-r)^2 <= r with d' = a - r  <=>  d'^2 <= a - d'  <=>  d'(d'+1) <= a  <=>  d' <= d
    if a <= 400:
        good = [rr_ for rr_ in range(1, a) if (a - rr_) ** 2 <= rr_]
        if good != list(range(max(1, a - d), a)):
            ok16 = False
    L = tail_cutoff(a)
    if a >= 2:
        if r_A(a) == L:
            rA_eq_L.append(a)
        if r_A(a) < L:
            rA_lt_L.append(a)
step(
    "(1.6) r_A(alpha) = alpha - floor((sqrt(4 alpha+1)-1)/2): d(d+1) <= alpha < (d+1)(d+2) and "
    "{r: (alpha-r)^2 <= r} = [r_A, alpha-1]   (alpha <= %d)" % CLOSED_FORM_MAX,
    ok16 and not rA_lt_L,
    {"alpha_with_r_A_equal_L": rA_eq_L, "alpha_with_r_A_below_L": rA_lt_L},
)
results["r_A_table"] = {str(a): r_A(a) for a in range(2, 41)}
results["L_table"] = {str(a): tail_cutoff(a) for a in range(2, 41)}

# (1.7) E_k / variance form.  With A = E_S e(S), B = E_S p_2(F - N[S]) over (r-1)-sets S:
#       r p_r = sum_S e(S),  C(r+1,2) p_{r+1} = sum_S p_2(F-N[S])  =>  Q_r = p_{r-1}^2 (A^2 + r - 2B)/r.
Qab = r * (A_ * a_ / r) ** 2 + a_**2 - (r + 1) * a_ * (2 * B_ * a_ / (r * (r + 1)))
ok17 = sp.simplify(Qab - a_**2 * (A_**2 + r - 2 * B_) / r) == 0
step("(1.7) Q_r = p_{r-1}^2 (A^2 + r - 2B)/r  with A = mean e(S), 2B = mean(e(S)^2 - e(S) - 2 m(H_S))", ok17)

# (1.8) two-point obstruction: mixture q of (a,b)=(2(d+1), 2d(d+1)) and 1-q of (0,0); q = d/(2(d+1))
Ea = q_ * 2 * (d_ + 1)
Eb2 = q_ * 2 * (2 * d_ * (d_ + 1))
ok18 = sp.simplify((Eb2 - Ea**2 - r).subs(q_, d_ / (2 * (d_ + 1))) - (d_**2 - r)) == 0
ok18 = ok18 and sp.simplify(2 * d_ * (d_ + 1) - d_ * 2 * (d_ + 1)) == 0  # per-set LM  b <= d a  is tight there
step("(1.8) two-point extension statistics: 2E[b] - E[a]^2 - r = d^2 - r at q = d/(2(d+1)); per-set LM tight", ok18)

# =============================================================================
# 2. Theorem B: Fisher-Ryan refinement.  Exact table of r_B(alpha), obstruction witnesses.
# =============================================================================
w = sp.symbols("w", positive=True)
T1, T2, T3 = sp.symbols("T1 T2 T3", positive=True)

# (2.1) binomial ratio identities (exact integers) and the t-parametrisation
ok21 = True
for a in range(2, 201):
    for rr_ in range(1, a):
        if Fraction(comb(a, rr_), comb(a, rr_ - 1)) != Fraction(a - rr_ + 1, rr_):
            ok21 = False
        if Fraction(comb(a, rr_ + 1), comb(a, rr_)) != Fraction(a - rr_, rr_ + 1):
            ok21 = False
for a in range(2, 16):
    for rr_ in range(1, a):
        d = a - rr_
        pm1 = sp.binomial(a, rr_ - 1) * T1 ** (rr_ - 1)
        p0 = sp.binomial(a, rr_) * T2**rr_
        pp1 = sp.binomial(a, rr_ + 1) * T3 ** (rr_ + 1)
        if sp.simplify(rr_ * p0 / pm1 - (d + 1) * T2**rr_ / T1 ** (rr_ - 1)) != 0:
            ok21 = False
        if sp.simplify((rr_ + 1) * pp1 / p0 - d * T3 ** (rr_ + 1) / T2**rr_) != 0:
            ok21 = False
step("(2.1) r x = (d+1) t_r^r / t_{r-1}^{r-1},  (r+1) y = d t_{r+1}^{r+1} / t_r^r   (alpha <= 15 symbolic; ratios alpha <= 200)", ok21)


def P_poly(rr_: int, d: int, tau=2) -> sp.Poly:
    return sp.Poly((d + 1) * (w**2 + rr_) ** rr_ - sp.Rational(tau) ** (rr_ - 1) * d**rr_ * w ** (rr_ + 1), w)


# (2.2) (w + r/w)^r (d+1) - 2^{r-1} d^r w = P_{r,d}(w) / w^r  (symbolic d, r <= 12)
ok22 = True
for rr_ in range(1, 13):
    lhs = (w + rr_ / w) ** rr_ * (d_ + 1) - 2 ** (rr_ - 1) * d_**rr_ * w
    rhs = ((d_ + 1) * (w**2 + rr_) ** rr_ - 2 ** (rr_ - 1) * d_**rr_ * w ** (rr_ + 1)) / w**rr_
    if sp.simplify(sp.expand(lhs - rhs)) != 0:
        ok22 = False
step("(2.2) (w + r/w)^r (d+1) - 2^{r-1} d^r w = P_{r,d}(w)/w^r   (r <= 12, d symbolic)", ok22)

# (2.3) convexity bookkeeping used in the doc: q(w) = w + r/w - c w^{1/r} has q'' > 0 for w > 0
c_ = sp.symbols("c", positive=True)
qw = w + r / w - c_ * w ** (1 / r)
q2 = sp.simplify(sp.diff(qw, w, 2) - (2 * r / w**3 + c_ * (r - 1) / r**2 * w ** (1 / r - 2)))
step("(2.3) q''(w) = 2r/w^3 + c (r-1)/r^2 w^{1/r-2} > 0  (q convex)", q2 == 0)


def certify_negative_point(pol: sp.Poly, lo: int, hi: int) -> Optional[Fraction]:
    """Return a rational w in (lo, hi) with pol(w) < 0, or None."""
    for N in (64, 256, 1024, 4096):
        for i in range(1, N):
            pt = Fraction(lo) + Fraction(hi - lo) * Fraction(i, N)
            val = pol.eval(sp.Rational(pt.numerator, pt.denominator))
            if val < 0:
                return pt
    return None


critB: Dict[Tuple[int, int], bool] = {}
neg_points: Dict[Tuple[int, int], Fraction] = {}
rB: Dict[int, int] = {}
ok23 = True
undetermined = []
for a in range(2, ALPHA_MAX + 1):
    least = a
    for rr_ in range(a - 1, 0, -1):
        d = a - rr_
        pol = P_poly(rr_, d)
        nroots = pol.count_roots(0, 2 * (d + 1))
        if pol.eval(0) <= 0:
            ok23 = False
        if nroots == 0:
            critB[(a, rr_)] = True
            if d * d <= rr_:
                pass  # Theorem A case: must always pass -- checked
        else:
            pt = certify_negative_point(pol, 0, 2 * (d + 1))
            if pt is None:
                undetermined.append((a, rr_))
                critB[(a, rr_)] = False
            else:
                critB[(a, rr_)] = False
                neg_points[(a, rr_)] = pt
            if d * d <= rr_:
                ok23 = False  # Theorem A range must satisfy B's criterion (B contains A)
        if critB[(a, rr_)]:
            least = rr_
        else:
            break
    rB[a] = least
ok23 = ok23 and not undetermined
tail_covered_by_B = [a for a in range(2, ALPHA_MAX + 1) if rB[a] <= tail_cutoff(a)]
gap_B_minus_A = {str(a): rB[a] - r_A(a) for a in range(2, ALPHA_MAX + 1)}
step(
    "(2.4) exact table r_B(alpha), alpha <= %d: P_{r,d} >= 0 on [0,2(d+1)] via sympy count_roots; B contains A"
    % ALPHA_MAX,
    ok23,
    {
        "alpha_where_B_covers_whole_tail": tail_covered_by_B,
        "r_B_minus_r_A_values": sorted(set(gap_B_minus_A.values())),
        "undetermined": undetermined,
    },
)
results["r_B_table"] = {str(a): rB[a] for a in range(2, ALPHA_MAX + 1)}
results["r_B_minus_r_A"] = gap_B_minus_A
results["tail_uncovered_indices"] = {
    str(a): [rr_ for rr_ in range(tail_cutoff(a), rB[a])] for a in range(2, ALPHA_MAX + 1) if rB[a] > tail_cutoff(a)
}


# (2.5) obstruction witnesses: for every (alpha, r) with L(alpha) <= r < r_B(alpha) build an exact rational
# sequence satisfying LM, FR, Zykov bounds, WR_k, TAIL with Q_r < 0.
def witness(a: int, rr_: int) -> Optional[Dict[str, object]]:
    d = a - rr_
    best = None
    for N in (128, 512):
        for k in range(N + 1, 2 * N):  # T in (1, 2)
            T = Fraction(k, N)
            pm1 = Fraction(2 ** (rr_ - 1) * comb(a, rr_ - 1))
            p0 = comb(a, rr_) * T**rr_
            pp1 = comb(a, rr_ + 1) * T ** (rr_ + 1)
            Qv = rr_ * p0 * p0 + pm1 * pm1 - (rr_ + 1) * pm1 * pp1
            marg = Qv / (pm1 * p0)
            if best is None or marg < best[0]:
                best = (marg, T)
        if best is not None and best[0] < 0:
            break
    if best is None or best[0] >= 0:
        return None
    T = best[1]
    p = [Fraction(2**k * comb(a, k)) if k <= rr_ - 1 else comb(a, k) * T**k for k in range(a + 1)]
    checks = {}
    checks["LM_all_k"] = all((k + 1) * p[k + 1] <= 2 * (a - k) * p[k] for k in range(a))
    checks["FR_all_k"] = all(
        (p[k] / comb(a, k)) ** (k + 1) >= (p[k + 1] / comb(a, k + 1)) ** k for k in range(1, a)
    )
    checks["Zykov_bounds"] = all(comb(a, k) <= p[k] <= 2**k * comb(a, k) for k in range(a + 1))
    checks["WR_all_k"] = all(p[k - 1] <= k * p[k] for k in range(1, a + 1))
    checks["TAIL"] = all(p[k] >= p[k + 1] for k in range(tail_cutoff(a), a))
    checks["p0_is_1"] = p[0] == 1
    n_w = int(p[1])
    checks["n_le_2alpha"] = n_w <= 2 * a
    if rr_ - 1 >= 3:  # low levels agree with the perfect matching alpha K_2: n = 2 alpha, e = alpha, S = 0
        e_w = comb(n_w, 2) - int(p[2])
        checks["low_order_forest_identities"] = (
            n_w == 2 * a and e_w == a and p[3] == comb(n_w, 3) - e_w * (n_w - 2) + 0
        )
    Qv = rr_ * p[rr_] ** 2 + p[rr_ - 1] ** 2 - (rr_ + 1) * p[rr_ - 1] * p[rr_ + 1]
    checks["Q_r_negative"] = Qv < 0
    return {
        "alpha": a,
        "r": rr_,
        "d": d,
        "T": str(T),
        "x": str(p[rr_] / p[rr_ - 1]),
        "y": str(p[rr_ + 1] / p[rr_]),
        "margin": str(Qv / (p[rr_ - 1] * p[rr_])),
        "checks": checks,
        "all_ok": all(checks.values()),
    }


witnesses = []
ok25 = True
missing_witness = []
for a in range(2, ALPHA_MAX + 1):
    for rr_ in range(tail_cutoff(a), rB[a]):
        wit = witness(a, rr_)
        if wit is None or not wit["all_ok"]:
            ok25 = False
            missing_witness.append((a, rr_))
        else:
            witnesses.append(wit)
step(
    "(2.5) obstruction witnesses for every tail index L(alpha) <= r < r_B(alpha), alpha <= %d: rational sequences with "
    "LM, FR, Zykov, WR, TAIL all satisfied and Q_r < 0" % ALPHA_MAX,
    ok25,
    {"count": len(witnesses), "missing": missing_witness, "examples": [wt for wt in witnesses if wt["alpha"] in (8, 9, 11, 12)]},
)
results["obstruction_witnesses"] = witnesses

# (2.6) Theorem A' (n-refined): for tau = n/alpha in {1, 3/2, 2}: the range (alpha-r) tau <= 2 sqrt(r)
#       in exact form (alpha-r)^2 tau^2 <= 4 r, tabulated for alpha <= 40
tab_Aprime = {}
for tau in (Fraction(1), Fraction(3, 2), Fraction(2)):
    tab_Aprime[str(tau)] = {
        str(a): min([rr_ for rr_ in range(1, a) if (a - rr_) ** 2 * tau**2 <= 4 * rr_] or [a]) for a in range(2, 41)
    }
ok26 = all(tab_Aprime["2"][str(a)] == r_A(a) for a in range(2, 41))
step("(2.6) Theorem A' at tau = n/alpha = 2 reproduces r_A; table for tau in {1, 3/2, 2}", ok26, tab_Aprime)

marker("PASS_EXACT_ISO_TAIL_RANGE_ROOT", ok11 and ok12 and ok15 and ok16 and ok21 and ok26)
marker("PASS_EXACT_ISO_TAIL_FR_REFINEMENT", ok21 and ok22 and ok23)
marker("PASS_EXACT_ISO_TAIL_OBSTRUCTION_WITNESSES", ok25)

# =============================================================================
# 3. Numerical consistency: all trees n <= TREE_NMAX, all forests n <= FOREST_NMAX
# =============================================================================


def scan(polys_by_n, label: str):
    stats = {
        "count": 0,
        "iso_fail_in_proved_range_A": 0,
        "iso_fail_in_proved_range_B": 0,
        "iso_fail_in_tail": 0,
        "iso_fail_anywhere": 0,
        "min_tail_margin": None,
        "argmin_tail": None,
        "min_tail_margin_by_n": {},
        "min_tail_margin_by_alpha": {},
        "min_margin_all_r": None,
        "argmin_all_r": None,
        "tail_pairs_d2_gt_r": 0,
        "tail_pairs_d2_gt_r_x_in_window": 0,
        "max_LM_tightness_in_window": None,   # max of (r+1) y / (2 d) over window pairs
        "argmax_LM_tightness_in_window": None,
        "max_LM_tightness_tail": None,        # max of (r+1) y / (2 d) over all tail pairs
        "argmax_LM_tightness_tail": None,
        "binomial_ratio_bound_pairs": 0,      # pairs (F, r) with p_r/p_{r-1} > (alpha-r+1)/r
        "pairs_total": 0,
        "min_tail_margin_minus_lower_bound_A": None,  # margin - (2 sqrt r - 2d) where d^2 <= r  (exact: compare squares)
    }
    for n, polys in polys_by_n:
        for p in polys:
            stats["count"] += 1
            a = len(p) - 1
            if a < 2:
                continue
            L = tail_cutoff(a)
            rA_ = r_A(a)
            rB_ = rB[a] if a in rB else rA_
            for rr_ in range(1, a):
                stats["pairs_total"] += 1
                m = iso_margin(p, rr_)
                Qv = iso_value(p, rr_)
                if Qv < 0:
                    stats["iso_fail_anywhere"] += 1
                    if rr_ >= L:
                        stats["iso_fail_in_tail"] += 1
                    if rr_ >= rA_:
                        stats["iso_fail_in_proved_range_A"] += 1
                    if rr_ >= rB_:
                        stats["iso_fail_in_proved_range_B"] += 1
                if stats["min_margin_all_r"] is None or m < stats["min_margin_all_r"]:
                    stats["min_margin_all_r"] = m
                    stats["argmin_all_r"] = {"n": n, "alpha": a, "r": rr_, "p": list(p)}
                if Fraction(p[rr_], p[rr_ - 1]) > Fraction(a - rr_ + 1, rr_):
                    stats["binomial_ratio_bound_pairs"] += 1
                if rr_ < L:
                    continue
                d = a - rr_
                xv = Fraction(p[rr_], p[rr_ - 1])
                yv = Fraction(p[rr_ + 1], p[rr_])
                tight = (rr_ + 1) * yv / (2 * d)
                if stats["max_LM_tightness_tail"] is None or tight > stats["max_LM_tightness_tail"]:
                    stats["max_LM_tightness_tail"] = tight
                    stats["argmax_LM_tightness_tail"] = {"n": n, "alpha": a, "r": rr_, "p": list(p)}
                if d * d > rr_:
                    stats["tail_pairs_d2_gt_r"] += 1
                    if rr_ * xv * xv - 2 * d * xv + 1 < 0:
                        stats["tail_pairs_d2_gt_r_x_in_window"] += 1
                        if stats["max_LM_tightness_in_window"] is None or tight > stats["max_LM_tightness_in_window"]:
                            stats["max_LM_tightness_in_window"] = tight
                            stats["argmax_LM_tightness_in_window"] = {"n": n, "alpha": a, "r": rr_, "p": list(p)}
                if stats["min_tail_margin"] is None or m < stats["min_tail_margin"]:
                    stats["min_tail_margin"] = m
                    stats["argmin_tail"] = {"n": n, "alpha": a, "r": rr_, "p": list(p)}
                key = str(n)
                if key not in stats["min_tail_margin_by_n"] or m < stats["min_tail_margin_by_n"][key][0]:
                    stats["min_tail_margin_by_n"][key] = (m, {"alpha": a, "r": rr_, "p": list(p)})
                key = str(a)
                if key not in stats["min_tail_margin_by_alpha"] or m < stats["min_tail_margin_by_alpha"][key][0]:
                    stats["min_tail_margin_by_alpha"][key] = (m, {"n": n, "r": rr_, "p": list(p)})
    # stringify fractions
    for k in ("min_tail_margin", "min_margin_all_r", "max_LM_tightness_in_window", "max_LM_tightness_tail"):
        if stats[k] is not None:
            stats[k + "_float"] = float(stats[k])
            stats[k] = str(stats[k])
    for key in ("min_tail_margin_by_n", "min_tail_margin_by_alpha"):
        stats[key] = {kk: {"margin": str(v[0]), "margin_float": float(v[0]), **v[1]} for kk, v in stats[key].items()}
    return stats


tree_polys_by_n = []
tree_count_ok = True
for n in range(1, TREE_NMAX + 1):
    polys = [indpoly_parent_array(par) for par in free_trees(n)]
    if len(polys) != A000055[n]:
        tree_count_ok = False
    tree_polys_by_n.append((n, polys))
tree_stats = scan(tree_polys_by_n, "trees")
ok31 = (
    tree_count_ok
    and tree_stats["iso_fail_in_proved_range_A"] == 0
    and tree_stats["iso_fail_in_proved_range_B"] == 0
    and tree_stats["iso_fail_in_tail"] == 0
)
step(
    "(3.1) all trees n <= %d: counts = A000055; Q_r >= 0 for r >= r_A, for r >= r_B and on the whole tail" % TREE_NMAX,
    ok31,
    {k: tree_stats[k] for k in ("count", "iso_fail_anywhere", "iso_fail_in_tail", "min_tail_margin", "argmin_tail",
                                 "tail_pairs_d2_gt_r", "tail_pairs_d2_gt_r_x_in_window", "max_LM_tightness_in_window",
                                 "max_LM_tightness_tail", "binomial_ratio_bound_pairs", "pairs_total")},
)
results["trees_scan"] = tree_stats

forest_polys_by_n = []
forest_count_ok = True
cache: Dict[int, list] = {}
for n in range(1, FOREST_NMAX + 1):
    polys = [poly for _, _, poly in forest_polys(n, cache)]
    if len(polys) != A005195[n]:
        forest_count_ok = False
    forest_polys_by_n.append((n, polys))
forest_stats = scan(forest_polys_by_n, "forests")
ok32 = (
    forest_count_ok
    and forest_stats["iso_fail_in_proved_range_A"] == 0
    and forest_stats["iso_fail_in_proved_range_B"] == 0
    and forest_stats["iso_fail_in_tail"] == 0
)
step(
    "(3.2) all forests n <= %d: counts = A005195; Q_r >= 0 for r >= r_A, for r >= r_B and on the whole tail" % FOREST_NMAX,
    ok32,
    {k: forest_stats[k] for k in ("count", "iso_fail_anywhere", "iso_fail_in_tail", "min_tail_margin", "argmin_tail",
                                   "tail_pairs_d2_gt_r", "tail_pairs_d2_gt_r_x_in_window", "max_LM_tightness_in_window",
                                   "max_LM_tightness_tail", "binomial_ratio_bound_pairs", "pairs_total")},
)
results["forests_scan"] = forest_stats

# (3.3) exact lower bound of Theorem A on the margin: margin >= 2 sqrt(r) - 2 d  (compared exactly via squares)
ok33 = True
min_excess = None
for n, polys in tree_polys_by_n:
    for p in polys:
        a = len(p) - 1
        for rr_ in range(max(1, r_A(a)), a):
            d = a - rr_
            m = iso_margin(p, rr_)
            # need m >= 2 sqrt(r) - 2d, i.e. m + 2d >= 2 sqrt(r)  <=>  (m + 2d)^2 >= 4 r (m + 2d > 0)
            lhs = m + 2 * d
            if lhs <= 0 or lhs * lhs < 4 * rr_:
                ok33 = False
step("(3.3) trees n <= %d: Q_r/(p_{r-1}p_r) >= 2 sqrt(r) - 2(alpha - r) on the proved range (exact)" % TREE_NMAX, ok33)

marker("PASS_EXACT_ISO_TAIL_NUMERIC_CONSISTENCY", ok31 and ok32 and ok33)

# =============================================================================
# 4. Variance form of ISO_r, brute force on all trees n <= VARIANCE_NMAX
# =============================================================================


def indep_sets_by_size(n: int, edges) -> Tuple[List[List[int]], List[int]]:
    nb = [0] * n
    for u, v in edges:
        nb[u] |= 1 << v
        nb[v] |= 1 << u
    by_size: List[List[int]] = [[] for _ in range(n + 1)]
    for mask in range(1 << n):
        ok = True
        s = mask
        while s:
            low = s & -s
            v = low.bit_length() - 1
            if nb[v] & mask:
                ok = False
                break
            s ^= low
        if ok:
            by_size[bin(mask).count("1")].append(mask)
    return by_size, nb


ok4 = True
checked_pairs = 0
for n in range(2, VARIANCE_NMAX + 1):
    for par in free_trees(n):
        edges = parent_to_edges(par)
        p = indpoly_parent_array(par)
        a = len(p) - 1
        by_size, nb = indep_sets_by_size(n, edges)
        full = (1 << n) - 1
        for rr_ in range(1, a):
            d = a - rr_
            sets = by_size[rr_ - 1]
            assert len(sets) == p[rr_ - 1]
            sum_a = 0
            sum_2b = 0
            sum_a2 = 0
            sum_m = 0
            for S in sets:
                NS = S
                s = S
                while s:
                    low = s & -s
                    v = low.bit_length() - 1
                    NS |= nb[v]
                    s ^= low
                H = full & ~NS
                aS = bin(H).count("1")
                # edges inside H
                mS = 0
                h = H
                while h:
                    low = h & -h
                    v = low.bit_length() - 1
                    mS += bin(nb[v] & H).count("1")
                    h ^= low
                mS //= 2
                bS2 = aS * aS - aS - 2 * mS  # = 2 p_2(H)
                if not (0 <= aS <= 2 * (d + 1)) or bS2 > 2 * d * aS:  # per-set LM bounds
                    ok4 = False
                sum_a += aS
                sum_2b += bS2
                sum_a2 += aS * aS
                sum_m += mS
            if sum_a != rr_ * p[rr_] or sum_2b != rr_ * (rr_ + 1) * p[rr_ + 1]:
                ok4 = False
            cnt = len(sets)
            A = Fraction(sum_a, cnt)
            B2 = Fraction(sum_2b, cnt)
            if Fraction(iso_value(p, rr_)) != Fraction(p[rr_ - 1] ** 2) * (A * A + rr_ - B2) / rr_:
                ok4 = False
            var = Fraction(sum_a2, cnt) - A * A
            if (var <= A + 2 * Fraction(sum_m, cnt) + rr_) != (iso_value(p, rr_) >= 0):
                ok4 = False
            # r-sets: e(T) <= 2 d
            for Tm in by_size[rr_]:
                NT = Tm
                s = Tm
                while s:
                    low = s & -s
                    v = low.bit_length() - 1
                    NT |= nb[v]
                    s ^= low
                if bin(full & ~NT).count("1") > 2 * d:
                    ok4 = False
            checked_pairs += 1
step(
    "(4.1) trees n <= %d, all r: sum e(S) = r p_r, sum 2 p_2(H_S) = r(r+1) p_{r+1}, per-set LM bounds, "
    "Q_r = p_{r-1}^2 (A^2 + r - 2B)/r and ISO_r <=> Var e(S) <= E e(S) + 2 E m(H_S) + r" % VARIANCE_NMAX,
    ok4,
    {"pairs": checked_pairs},
)
marker("PASS_EXACT_ISO_TAIL_VARIANCE_FORM", ok4)

# =============================================================================
# 5. Report
# =============================================================================
all_ok = not failures
results["summary"] = {
    "theorem_A_range": "ISO_r for every forest when (alpha-r)^2 <= r, i.e. r >= r_A(alpha) = alpha - floor((sqrt(4 alpha+1)-1)/2)",
    "theorem_A_prime": "ISO_r for every forest on n vertices when (alpha-r) n/alpha <= 2 sqrt(r)",
    "theorem_B": "ISO_r for every forest when P_{r,d}(w) = (d+1)(w^2+r)^r - 2^{r-1} d^r w^{r+1} >= 0 on [0, 2(d+1)]; r_B table exact",
    "whole_tail_by_these_tools_iff_alpha_in": tail_covered_by_B,
    "obstruction": "for every other alpha <= %d and every L(alpha) <= r < r_B(alpha) an explicit sequence satisfies LM, FR, "
    "Zykov, WR, TAIL and violates ISO_r; the missing ingredient is an upper bound on y = p_{r+1}/p_r that is "
    "better than LM's 2(alpha-r)/(r+1) when p_r/p_{r-1} lies in the AM-GM window" % ALPHA_MAX,
    "all_checks_pass": all_ok,
    "failures": failures,
}
results["parameters"] = {
    "ALPHA_MAX": ALPHA_MAX,
    "CLOSED_FORM_MAX": CLOSED_FORM_MAX,
    "TREE_NMAX": TREE_NMAX,
    "FOREST_NMAX": FOREST_NMAX,
    "VARIANCE_NMAX": VARIANCE_NMAX,
}
results["provenance"] = provenance(os.path.abspath(__file__))
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "reports", "iso_tail_proof.json")
sha = write_report(out, results)
print("report:", os.path.relpath(out), "sha256:", sha)
print("ALL PASS" if all_ok else "SOME CHECKS FAILED: " + ", ".join(failures))
sys.exit(0 if all_ok else 1)
