#!/usr/bin/env python3
"""Numeric feasibility probe for an ISO_3-style bound chain proving ISO_4 on trees.

ISO_4:  Q_4 = 4 p_4^2 + p_3^2 - 5 p_3 p_5 >= 0.

(1) Exact inclusion-exclusion formula for p_5 (verified by brute force, n <= 12):
    p_5 = C(n,5) - e C(n-2,3) + S C(n-3,2) + (C(e,2)-S)(n-4) - (P+T3)(n-4) - X
          + N_P5 + N_chair + T4,
    X = S(n-3) - 3 T3 - 2 P,  N_P5 = (1/2) sum_c [M_c^2 - sum_{b~c}(d_b-1)^2],
    N_chair = sum_{uv} [C(d_v-1,2)(d_u-1) + C(d_u-1,2)(d_v-1)] = sum_v C(d_v-1,2) M_v,
    M_c = sum_{b~c} (d_b - 1).
(2) Candidate lower bound G4(n, l, Delta, S) obtained from
      T3 >= C(Delta,3) + Cauchy-Schwarz on the other internal vertices,  T3 <= S(Delta-2)/3,
      T4 <= T3 (Delta-3)/4,  M2 = sum_c M_c^2 <= 2S(n-2) - 2P,
      N_chair <= (n-1)(S-n+2) - 3 T3,  0 <= P <= C(n-1,2) - S   [all from M_v <= n-1-d_v],
    minimised exactly over the (P, T3) box; validity + tightness on all trees
    n <= 16; parameter scan for n up to 200; exact evaluation on stars and
    balanced double brooms.  No positivity certificate is attempted.

Everything is exact (integers / Fractions).  Writes reports/iso4_trees_probe.json.
"""

from __future__ import annotations

import os
import sys
import time
from fractions import Fraction
from itertools import combinations
from math import comb

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from erdos993lib.indpoly import indpoly_forest, indpoly_parent_array  # noqa: E402
from erdos993lib.report import provenance, write_report  # noqa: E402
from erdos993lib.trees import free_trees, parent_to_edges  # noqa: E402

T0 = time.time()
HERE = os.path.dirname(os.path.abspath(__file__))
REPORT = os.path.join(HERE, "..", "reports", "iso4_trees_probe.json")
results: dict = {}


def log(msg: str) -> None:
    print(f"[{time.time() - T0:7.1f}s] {msg}", flush=True)


def binom(x: int, k: int) -> int:
    return comb(x, k) if x >= k >= 0 else 0


def coef(p, k):
    return p[k] if k < len(p) else 0


# --------------------------------------------------------------------------- statistics
def tree_stats(n, edges):
    deg = [0] * n
    adj = [[] for _ in range(n)]
    for u, v in edges:
        deg[u] += 1
        deg[v] += 1
        adj[u].append(v)
        adj[v].append(u)
    M = [sum(deg[b] - 1 for b in adj[c]) for c in range(n)]
    st = {
        "n": n,
        "l": sum(1 for d in deg if d == 1),
        "Delta": max(deg),
        "S": sum(comb(d, 2) for d in deg),
        "T3": sum(comb(d, 3) for d in deg),
        "T4": sum(comb(d, 4) for d in deg),
        "P": sum((deg[u] - 1) * (deg[v] - 1) for u, v in edges),
        "M2": sum(m * m for m in M),
        "W": sum(d * (d - 1) ** 2 for d in deg),
    }
    st["NP5_formula"] = (st["M2"] - st["W"]) // 2
    st["Nch_formula"] = sum(binom(deg[v] - 1, 2) * (deg[u] - 1) + binom(deg[u] - 1, 2) * (deg[v] - 1) for u, v in edges)
    st["Nch_identity"] = sum(binom(deg[v] - 1, 2) * M[v] for v in range(n))
    st["X_formula"] = st["S"] * (n - 3) - 3 * st["T3"] - 2 * st["P"]
    return st


def brute_subforest_counts(n, edges):
    """Direct enumeration of 3- and 4-edge sub-forests on <= 5 vertices."""
    X = NP5 = Nch = NK14 = P4 = claw = 0
    for F in combinations(edges, 3):
        verts = {x for uv in F for x in uv}
        if len(verts) == 5:
            X += 1
        elif len(verts) == 4:
            dg = {}
            for u, v in F:
                dg[u] = dg.get(u, 0) + 1
                dg[v] = dg.get(v, 0) + 1
            if max(dg.values()) == 3:
                claw += 1
            else:
                P4 += 1
    for F in combinations(edges, 4):
        verts = {x for uv in F for x in uv}
        if len(verts) == 5:
            dg = {}
            for u, v in F:
                dg[u] = dg.get(u, 0) + 1
                dg[v] = dg.get(v, 0) + 1
            mx = max(dg.values())
            if mx == 4:
                NK14 += 1
            elif mx == 3:
                Nch += 1
            else:
                NP5 += 1
    return {"X": X, "NP5": NP5, "Nch": Nch, "NK14": NK14, "P4": P4, "claw": claw}


def p5_formula(n, S, T3, T4, P, X, NP5, Nch):
    e = n - 1
    return (binom(n, 5) - e * binom(n - 2, 3) + S * binom(n - 3, 2) + (binom(e, 2) - S) * (n - 4)
            - (P + T3) * (n - 4) - X + NP5 + Nch + T4)


def p5_compact(n, S, T3, P, M2, Nch, T4):
    e = n - 1
    return (binom(n, 5) - e * binom(n - 2, 3) + binom(e, 2) * (n - 4) + S * (binom(n - 3, 2) - 2 * n + 6)
            - P * (n - 6) - T3 * (n - 4) + Fraction(M2, 2) + Nch + T4)


# --------------------------------------------------------------------------- (1) exact p_5
log("step 1: p_5 formula, brute force n <= 12")
n_checked = 0
for n in range(1, 13):
    for parent in free_trees(n):
        edges = parent_to_edges(parent)
        p = indpoly_parent_array(parent)
        st = tree_stats(n, edges)
        bf = brute_subforest_counts(n, edges)
        assert bf["P4"] == st["P"] and bf["claw"] == st["T3"] and bf["NK14"] == st["T4"]
        assert bf["X"] == st["X_formula"], (n, parent, bf, st)
        assert bf["NP5"] == st["NP5_formula"], (n, parent, bf, st)
        assert bf["Nch"] == st["Nch_formula"] == st["Nch_identity"], (n, parent, bf, st)
        p5 = p5_formula(n, st["S"], st["T3"], st["T4"], st["P"], bf["X"], bf["NP5"], bf["Nch"])
        assert p5 == coef(p, 5), (n, parent, p5, coef(p, 5))
        assert p5_compact(n, st["S"], st["T3"], st["P"], st["M2"], st["Nch_identity"], st["T4"]) == coef(p, 5)
        n_checked += 1
results["step1_p5_formula"] = {"pass": True, "trees_checked_n_le_12": n_checked}
log(f"step 1 PASS on {n_checked} trees")


# --------------------------------------------------------------------------- (2) bound chain
def smin_with_delta(n, l, Delta):
    """Min S over internal degree sequences with one vertex of degree Delta (others balanced)."""
    k = n - l - 1
    if k == 0:
        return comb(Delta, 2)
    rest = n - 1 - Delta  # remaining y-sum
    if rest < k:
        return None
    q, r = divmod(rest, k)
    return comb(Delta, 2) + (k - r) * comb(q + 1, 2) + r * comb(q + 2, 2)


def smax_with_delta(n, l, Delta):
    """Max S over internal degree sequences with all degrees <= Delta (greedy / majorisation)."""
    k = n - l
    if Delta == 2:
        return k if l == 2 else None
    extra = l - 2
    q, r0 = divmod(extra, Delta - 2)
    ys = [Delta - 1] * q + ([1 + r0] if r0 else [])
    if len(ys) > k:
        return None
    ys += [1] * (k - len(ys))
    return sum(comb(y + 1, 2) for y in ys)


def pmax_bound(n, Delta):
    r = n - 1 - Delta
    return min((n - 2) ** 2 // 4, (Delta - 1) * r + r ** 3)


def t3_lower(n, l, Delta, S):
    """T3 >= C(Delta,3) + Cauchy-Schwarz on the remaining internal vertices:
    3 T3' >= 2 S'^2 / D2' - S' with S' = S - C(Delta,2), D2' = (2n-2-l) - Delta."""
    Sp = S - binom(Delta, 2)
    D2p = 2 * n - 2 - l - Delta
    rest = Fraction(0)
    if Sp > 0 and D2p > 0:
        rest = max(Fraction(0), (Fraction(2 * Sp * Sp, D2p) - Sp) / 3)
    return binom(Delta, 3) + rest


def bound_G4(n, l, Delta, S):
    """Exact minimum over the (P,T3) box of the relaxed lower bound; returns (G4, info)."""
    e = n - 1
    p3 = binom(n, 3) - e * (n - 2) + S
    A = binom(n, 4) - e * binom(n - 2, 2) + S * (n - 4) + binom(e, 2)
    B = binom(n, 5) - e * binom(n - 2, 3) + binom(e, 2) * (n - 4) + S * (binom(n - 3, 2) - 2 * n + 6)
    T3lo = t3_lower(n, l, Delta, S)
    T3hi = Fraction(S * max(Delta - 2, 0), 3)
    if T3hi < T3lo:
        T3hi = T3lo
    Pmax = min(pmax_bound(n, Delta), binom(n - 1, 2) - S)
    # M_v <= n-1-d_v gives (exact for diameter <= 3):
    #   M2 <= 2S(n-2) - 2P,   N_chair <= (n-1)(S-n+2) - 3 T3,   P <= C(n-1,2) - S
    # so p_5 <= B + S(n-2) + (n-1)(S-n+2) - P(n-5) - T3(n-1) + T3(Delta-3)/4.
    M2up = 2 * S * (n - 2)  # P-part accounted for in alpha
    alpha = 5 * p3 * (n - 5)
    beta = 5 * p3 * (Fraction(n - 1) - Fraction(Delta - 3, 4))
    const = p3 * p3 - 5 * p3 * (B + S * (n - 2) + (n - 1) * (S - n + 2))

    def f(P, T3):
        return 4 * (A - P - T3) ** 2 + alpha * P + beta * T3 + const

    def clamp(x, lo, hi):
        return lo if x < lo else hi if x > hi else x

    cands = []
    for P in (Fraction(0), Fraction(Pmax)):
        T3 = clamp(A - P - beta / 8, T3lo, T3hi)
        cands.append((f(P, T3), P, T3))
    for T3 in (T3lo, T3hi):
        P = clamp(A - T3 - alpha / 8, Fraction(0), Fraction(Pmax))
        cands.append((f(P, T3), P, T3))
    if alpha == beta:
        u = A - alpha / 8
        P = clamp(u - T3lo, Fraction(0), Fraction(Pmax))
        T3 = clamp(u - P, T3lo, T3hi)
        cands.append((f(P, T3), P, T3))
    best = min(cands, key=lambda c: c[0])
    norm = p3 * (A - T3lo)
    return best[0], {"P_at_min": best[1], "T3_at_min": best[2], "T3lo": T3lo, "T3hi": T3hi, "Pmax": Pmax,
                     "p3": p3, "norm": norm, "M2up": M2up}


def true_bounds_report(st, p):
    """Evaluate each intermediate bound on one actual tree; return gaps (bound - truth)."""
    n, l, Delta, S, T3, T4, P, M2 = (st[k] for k in ("n", "l", "Delta", "S", "T3", "T4", "P", "M2"))
    Nch = st["Nch_identity"]
    T3lo = t3_lower(n, l, Delta, S)
    gaps = {
        "T3_minus_T3lo_plainCS": T3 - max(Fraction(0), (Fraction(2 * S * S, 2 * n - 2 - l) - S) / 3),
        "T3_minus_T3lo": T3 - T3lo,
        "T3hi_minus_T3": Fraction(S * max(Delta - 2, 0), 3) - T3,
        "T4up_minus_T4": Fraction(T3 * (Delta - 3), 4) - T4 if Delta >= 3 else Fraction(0) - T4,
        "M2up_minus_M2": 2 * S * (n - 2) - 2 * P - M2,
        "Nchup_minus_Nch": (n - 1) * (S - n + 2) - 3 * T3 - Nch,
        "Nch_le_DeltaP_gap": (Delta - 2) * P - Nch,
        "Pmax_minus_P": min(pmax_bound(n, Delta), binom(n - 1, 2) - S) - P,
        "P_le_Cn12_minus_S_gap": binom(n - 1, 2) - S - P,
        "Smax_minus_S": (smax_with_delta(n, l, Delta) if n >= 3 else S) - S,
        "S_minus_Smin": S - (smin_with_delta(n, l, Delta) if n >= 3 else S),
    }
    return gaps


log("step 2/3: validity and tightness on all trees n <= 16")
NTREES = 16
per_n = {}
viol = {}
min_margin = None
min_margin_tree = None
min_G4norm = None
min_G4_tree = None
count = 0
for n in range(7, NTREES + 1):
    stats_n = {"trees": 0, "min_true_margin": None, "min_G4_norm": None, "G4_negative": 0}
    for parent in free_trees(n):
        edges = parent_to_edges(parent)
        p = indpoly_parent_array(parent)
        st = tree_stats(n, edges)
        p3, p4, p5 = coef(p, 3), coef(p, 4), coef(p, 5)
        assert p5 == p5_compact(n, st["S"], st["T3"], st["P"], st["M2"], st["Nch_identity"], st["T4"])
        q4 = 4 * p4 * p4 + p3 * p3 - 5 * p3 * p5
        margin = Fraction(q4, p3 * p4)
        gaps = true_bounds_report(st, p)
        for k, g in gaps.items():
            if g < 0:
                viol[k] = viol.get(k, 0) + 1
        G4, info = bound_G4(n, st["l"], st["Delta"], st["S"])
        assert G4 <= q4, (n, parent, G4, q4)
        g4n = G4 / (p3 * p4)
        stats_n["trees"] += 1
        if G4 < 0:
            stats_n["G4_negative"] += 1
        if stats_n["min_true_margin"] is None or margin < stats_n["min_true_margin"]:
            stats_n["min_true_margin"] = margin
        if stats_n["min_G4_norm"] is None or g4n < stats_n["min_G4_norm"]:
            stats_n["min_G4_norm"] = g4n
            stats_n["argmin_G4"] = {"l": st["l"], "Delta": st["Delta"], "S": st["S"], "parent": list(parent)}
        if min_margin is None or margin < min_margin:
            min_margin, min_margin_tree = margin, (n, list(parent))
        count += 1
    stats_n["min_true_margin_float"] = float(stats_n["min_true_margin"])
    stats_n["min_G4_norm_float"] = float(stats_n["min_G4_norm"])
    per_n[n] = stats_n
    log(f"  n={n:2d} trees={stats_n['trees']:6d} min Q4/(p3p4)={float(stats_n['min_true_margin']):.4f} "
        f"min G4/(p3p4)={float(stats_n['min_G4_norm']):.4f} G4<0: {stats_n['G4_negative']}")
results["step23_trees_n_le_16"] = {
    "trees_checked": count,
    "bound_violations_by_name": viol,
    "all_intermediate_bounds_valid": not viol,
    "G4_le_Q4_everywhere": True,
    "min_true_margin": {"value": str(min_margin), "float": float(min_margin), "tree": min_margin_tree},
    "per_n": per_n,
}
log(f"step 2/3 done; violations: {viol}")


# --------------------------------------------------------------------------- (4) parameter scan
def grid(lo, hi, maxpts):
    if hi < lo:
        return []
    if hi - lo + 1 <= maxpts:
        return list(range(lo, hi + 1))
    step = (hi - lo) / (maxpts - 1)
    pts = sorted({lo + int(round(i * step)) for i in range(maxpts)} | {lo, hi})
    return pts


def scan_n(n, max_l=40, max_d=40, max_s=48):
    best = None
    worst_terms = None
    for l in grid(2, n - 1, max_l):
        for Delta in grid(2, l, max_d):
            smin = smin_with_delta(n, l, Delta)
            smax = smax_with_delta(n, l, Delta)
            if smin is None or smax is None or smax < smin:
                continue
            for S in grid(smin, smax, max_s):
                G4, info = bound_G4(n, l, Delta, S)
                val = G4 / info["norm"]
                if best is None or val < best[0]:
                    best = (val, l, Delta, S, info)
    val, l, Delta, S, info = best
    return {"n": n, "min_G4_norm": str(val), "min_G4_norm_float": float(val), "l": l, "Delta": Delta, "S": S,
            "P_at_min": str(info["P_at_min"]), "T3_at_min": str(info["T3_at_min"]), "T3lo": str(info["T3lo"]),
            "T3hi": str(info["T3hi"]), "Pmax": info["Pmax"]}


log("step 4: parameter scan")
scan = []
n_grid = list(range(7, 31)) + [32, 35, 40, 45, 50, 60, 70, 80, 100, 120, 150, 200]
for n in n_grid:
    if time.time() - T0 > 420:
        log(f"  time budget: stopping scan before n={n}")
        break
    r = scan_n(n)
    scan.append(r)
    log(f"  n={n:3d} min G4/(p3 p4) = {r['min_G4_norm_float']:+.4f} at l={r['l']} Delta={r['Delta']} S={r['S']} "
        f"P={r['P_at_min']} T3={r['T3_at_min']}")
results["step4_scan"] = {"grid_note": "l, Delta, S on grids of <= 40/40/48 points incl. endpoints; exact min over (P,T3) box",
                         "n_values": [r["n"] for r in scan], "rows": scan,
                         "min_over_scan": min(r["min_G4_norm_float"] for r in scan),
                         "negative_n": [r["n"] for r in scan if r["min_G4_norm_float"] < 0]}


# --------------------------------------------------------------------------- (5) families
def star_edges(m):
    return [(0, i) for i in range(1, m + 1)]


def double_broom_edges(m, k=3):
    """Two hubs of degree m (m-1 leaves each) joined by a path with k internal vertices; n = 2m + k."""
    n = 2 * m + k
    h1, h2 = 0, 1
    edges = []
    idx = 2
    for _ in range(m - 1):
        edges.append((h1, idx))
        idx += 1
    for _ in range(m - 1):
        edges.append((h2, idx))
        idx += 1
    prev = h1
    for _ in range(k):
        edges.append((prev, idx))
        prev = idx
        idx += 1
    edges.append((prev, h2))
    assert idx == n
    return n, edges


def family_row(n, edges):
    p = indpoly_forest(n, edges)
    st = tree_stats(n, edges)
    p3, p4, p5 = coef(p, 3), coef(p, 4), coef(p, 5)
    assert p5 == p5_compact(n, st["S"], st["T3"], st["P"], st["M2"], st["Nch_identity"], st["T4"])
    q4 = 4 * p4 * p4 + p3 * p3 - 5 * p3 * p5
    G4, info = bound_G4(n, st["l"], st["Delta"], st["S"])
    gaps = true_bounds_report(st, p)
    cost = {  # normalised loss of Q_4 caused by each p_5-side relaxation: 5 p3 gap / (p3 p4) = 5 gap / p4
        "T4": Fraction(5) * gaps["T4up_minus_T4"] / p4,
        "M2": Fraction(5) * gaps["M2up_minus_M2"] / 2 / p4,
        "Nch": Fraction(5) * gaps["Nchup_minus_Nch"] / p4,
    }
    cost["residual_T3_P_relaxation"] = Fraction(q4, p3 * p4) - G4 / (p3 * p4) - sum(cost.values())
    return {
        "n": n, "l": st["l"], "Delta": st["Delta"], "S": st["S"], "T3": st["T3"], "T4": st["T4"], "P": st["P"],
        "M2": st["M2"], "Nch": st["Nch_identity"], "p3": p3, "p4": p4, "p5": p5, "Q4": q4,
        "margin": str(Fraction(q4, p3 * p4)), "margin_float": float(Fraction(q4, p3 * p4)),
        "G4": str(G4), "G4_norm": str(G4 / (p3 * p4)), "G4_norm_float": float(G4 / (p3 * p4)),
        "gaps": {k: str(v) for k, v in gaps.items()},
        "norm_cost": {k: str(v) for k, v in cost.items()},
        "norm_cost_float": {k: float(v) for k, v in cost.items()},
        "P_at_min": str(info["P_at_min"]), "T3_at_min": str(info["T3_at_min"]),
    }


log("step 5: stars and double brooms")
fam = {"stars": [], "double_brooms_k1": [], "double_broom_k_comparison": []}
for m in list(range(5, 41)) + [50, 60, 80, 100]:
    fam["stars"].append(family_row(m + 1, star_edges(m)))
    n, edges = double_broom_edges(m, 1)
    fam["double_brooms_k1"].append(family_row(n, edges))
for m in (6, 10, 20):
    for k in (1, 2, 3, 4, 5):
        n, edges = double_broom_edges(m, k)
        row = family_row(n, edges)
        fam["double_broom_k_comparison"].append({"m": m, "k": k, "n": n, "margin_float": row["margin_float"],
                                                 "G4_norm_float": row["G4_norm_float"]})
fam["summary"] = {
    "stars_min_margin": min(r["margin_float"] for r in fam["stars"]),
    "stars_min_G4_norm": min(r["G4_norm_float"] for r in fam["stars"]),
    "db_min_margin": min(r["margin_float"] for r in fam["double_brooms_k1"]),
    "db_min_G4_norm": min(r["G4_norm_float"] for r in fam["double_brooms_k1"]),
    "db_G4_negative_m": [r["n"] for r in fam["double_brooms_k1"] if r["G4_norm_float"] < 0],
    "stars_G4_negative_n": [r["n"] for r in fam["stars"] if r["G4_norm_float"] < 0],
}
results["step5_families"] = fam
for r in fam["stars"][::6] + fam["stars"][-1:]:
    log(f"  star n={r['n']:3d} margin={r['margin_float']:.4f} G4norm={r['G4_norm_float']:+.4f} cost={r['norm_cost_float']}")
for r in fam["double_brooms_k1"][::6] + fam["double_brooms_k1"][-1:]:
    log(f"  DB   n={r['n']:3d} margin={r['margin_float']:.4f} G4norm={r['G4_norm_float']:+.4f} cost={r['norm_cost_float']}")
log(f"  k comparison: {fam['double_broom_k_comparison']}")

results["provenance"] = provenance(os.path.abspath(__file__))
results["runtime_seconds"] = round(time.time() - T0, 1)
sha = write_report(REPORT, results)
log(f"report written: {REPORT} sha256={sha}")
print("PROBE_ISO4_DONE")
