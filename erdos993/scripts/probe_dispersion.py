#!/usr/bin/env python3
"""Probe of the DISPERSION inequality, a single-level sufficient condition for
the whole WR+ISO+TAIL framework.

For a forest F and 0 <= k < alpha, let U_k be the uniform distribution on the
independent k-sets T, and e(T) = |V| - |N[T]| the number of one-vertex
extensions of T.  Exact facts (verified in this script):

  (i)  E_k[e] = (k+1) p_{k+1} / p_k                       (double counting)
  (ii) k(k+1) p_{k+1} <= sum_{|T|=k-1} e(T)^2 - k p_k    (each k-set S has k
       subsets T of size k-1, and e(S) <= e(T) - 1 for each of them)
  (iii) hence   Var_{U_{k-1}}(e) <= E_{U_{k-1}}(e)   ==>   FLC_k :  k p_k^2 >= (k+1) p_{k-1} p_{k+1}
        and FLC_k ==> ISO_k with Q_k >= p_{k-1}^2.
  (iv) exact identity: sum_{|T|=k} e(T)(e(T)-1) = (k+1)(k+2) p_{k+2} + 2 M_k, where
       M_k = #{(T, uv in E): u, v both free for T}, so
       Var_k(e) <= E_k(e)  <=>  (k+1)^2 p_{k+1}^2 - (k+1)(k+2) p_k p_{k+2} >= 2 M_k p_k,
       i.e. DISPERSION_k is FLC_{k+1} strengthened by the explicit term 2 M_k p_k.

The joint distribution of (|T|, |N[T]|) over independent sets of a rooted tree
is computed by an exact three-state tree DP (IN / OUT-dominated / OUT-free),
and multiplied over components for forests.  The script tests DISPERSION_k for
k <= L(alpha) - 2 on all trees up to --trees-max, all forests up to
--forests-max, and on structured families up to large orders, and records the
maximal ratio Var/E (must be < 1) with witnesses.

Usage: python scripts/probe_dispersion.py --trees-max 18 --forests-max 15
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from fractions import Fraction
from typing import Dict, List, Tuple

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from erdos993lib.checks import tail_cutoff  # noqa: E402
from erdos993lib.families import T3mn, T3mn_star, bush, double_broom, multi_arm_star, path, spider, star  # noqa: E402
from erdos993lib.indpoly import components_as_parent_arrays  # noqa: E402
from erdos993lib.report import provenance, write_report  # noqa: E402
from erdos993lib.trees import forest_polys, free_tree_layouts, layout_to_parent, parent_to_edges, tree_polys  # noqa: E402

BV = Dict[Tuple[int, int], int]  # bivariate polynomial: (k, m) -> count, k = |T|, m = |N[T]|


def bv_mul(a: BV, b: BV) -> BV:
    out: BV = {}
    for (k1, m1), c1 in a.items():
        for (k2, m2), c2 in b.items():
            key = (k1 + k2, m1 + m2)
            out[key] = out.get(key, 0) + c1 * c2
    return out


def bv_add(a: BV, b: BV) -> BV:
    out = dict(a)
    for key, c in b.items():
        out[key] = out.get(key, 0) + c
    return out


def bv_sub(a: BV, b: BV) -> BV:
    out = dict(a)
    for key, c in b.items():
        out[key] = out.get(key, 0) - c
    return {k: v for k, v in out.items() if v}


def bv_shift(a: BV, dk: int, dm: int) -> BV:
    return {(k + dk, m + dm): c for (k, m), c in a.items()}


def joint_tree(parent: List[int]) -> BV:
    """Joint distribution of (|T|, |N[T]|) over independent sets of a rooted tree."""
    n = len(parent)
    children: List[List[int]] = [[] for _ in range(n)]
    for v in range(1, n):
        children[parent[v]].append(v)
    IN: List[BV] = [None] * n  # type: ignore
    OD: List[BV] = [None] * n  # type: ignore
    OF: List[BV] = [None] * n  # type: ignore
    for v in range(n - 1, -1, -1):
        prod_all: BV = {(0, 0): 1}
        prod_out: BV = {(0, 0): 1}
        prod_in_parent: BV = {(0, 0): 1}
        for c in children[v]:
            all_c = bv_add(bv_add(IN[c], OD[c]), OF[c])
            out_c = bv_add(OD[c], OF[c])
            dom_by_v = bv_add(OD[c], bv_shift(OF[c], 0, 1))  # a free child becomes dominated by v in T
            prod_all = bv_mul(prod_all, all_c)
            prod_out = bv_mul(prod_out, out_c)
            prod_in_parent = bv_mul(prod_in_parent, dom_by_v)
        IN[v] = bv_shift(prod_in_parent, 1, 1)
        OD[v] = bv_shift(bv_sub(prod_all, prod_out), 0, 1)
        OF[v] = prod_out
    return bv_add(bv_add(IN[0], OD[0]), OF[0])


def joint_forest(n: int, edges) -> BV:
    total: BV = {(0, 0): 1}
    for parent in components_as_parent_arrays(n, list(edges)):
        total = bv_mul(total, joint_tree(parent))
    return total


def level_moments(joint: BV, n: int) -> Dict[int, Tuple[int, int, int]]:
    """k -> (p_k, sum e, sum e^2) with e = n - m."""
    out: Dict[int, List[int]] = {}
    for (k, m), c in joint.items():
        e = n - m
        s = out.setdefault(k, [0, 0, 0])
        s[0] += c
        s[1] += c * e
        s[2] += c * e * e
    return {k: tuple(v) for k, v in out.items()}  # type: ignore


def analyse(n: int, edges, joint: BV | None = None):
    """Return (alpha, L, list of (k, p_k, E, Var, Var/E) for prefix levels, failures, max ratio)."""
    if joint is None:
        joint = joint_forest(n, edges)
    mom = level_moments(joint, n)
    alpha = max(mom)
    L = tail_cutoff(alpha)
    p = [mom[k][0] if k in mom else 0 for k in range(alpha + 1)]
    fails = []
    max_ratio = None
    rows = []
    for k in range(0, alpha):
        cnt, s1, s2 = mom[k]
        # consistency (i): sum e = (k+1) p_{k+1}
        assert s1 == (k + 1) * p[k + 1], (n, edges, k)
        mean = Fraction(s1, cnt)
        var = Fraction(s2, cnt) - mean * mean
        if k <= L - 2:
            ratio = var / mean if mean > 0 else None
            rows.append((k, cnt, mean, var, ratio))
            if var > mean:
                fails.append(k)
            if ratio is not None and (max_ratio is None or ratio > max_ratio[0]):
                max_ratio = (ratio, k)
        # consistency (ii): k(k+1) p_{k+1} <= sum_{k-1} e^2 - k p_k  (with levels shifted)
        if k >= 1:
            cnt0, s10, s20 = mom[k - 1]
            assert k * (k + 1) * p[k + 1] <= s20 - k * p[k], (n, edges, k)
    return alpha, L, p, rows, fails, max_ratio


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--trees-max", type=int, default=17)
    ap.add_argument("--forests-max", type=int, default=14)
    ap.add_argument("--out", default="reports/dispersion_probe.json")
    args = ap.parse_args()

    report = {"per_order_trees": {}, "per_order_forests": {}, "families": {}, "failures": []}
    # 1. brute-force cross-check of the DP on small trees
    from erdos993lib.indpoly import indpoly_parent_array

    for n in range(1, 11):
        for lay in free_tree_layouts(n):
            parent = layout_to_parent(lay)
            joint = joint_tree(parent)
            # marginal in k must be the independence polynomial
            marg = {}
            for (k, m), c in joint.items():
                marg[k] = marg.get(k, 0) + c
            p = indpoly_parent_array(parent)
            assert [marg.get(k, 0) for k in range(len(p))] == p, (n, lay)
            # brute force joint for n <= 9
            if n <= 9:
                edges = parent_to_edges(parent)
                nb = [0] * n
                for u, v in edges:
                    nb[u] |= 1 << v
                    nb[v] |= 1 << u
                bf: BV = {}
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
                        closed = mask
                        s = mask
                        while s:
                            low = s & -s
                            closed |= nb[low.bit_length() - 1]
                            s ^= low
                        key = (bin(mask).count("1"), bin(closed).count("1"))
                        bf[key] = bf.get(key, 0) + 1
                assert bf == joint, (n, lay)
    print("DP cross-checked against brute force (n <= 9) and against independence polynomials (n <= 10)", flush=True)

    # 2. all trees
    global_max = None
    for n in range(2, args.trees_max + 1):
        t0 = time.time()
        cnt = 0
        order_max = None
        order_fails = 0
        for lay in free_tree_layouts(n):
            parent = layout_to_parent(lay)
            alpha, L, p, rows, fails, mr = analyse(n, parent_to_edges(parent), joint_tree(parent))
            cnt += 1
            if fails:
                order_fails += 1
                report["failures"].append({"n": n, "level_sequence": lay, "levels": fails})
            if mr is not None and (order_max is None or mr[0] > order_max[0]):
                order_max = (mr[0], mr[1], lay)
        if order_max is not None and (global_max is None or order_max[0] > global_max[0]):
            global_max = (order_max[0], order_max[1], n, order_max[2])
        report["per_order_trees"][n] = {
            "count": cnt,
            "dispersion_failures": order_fails,
            "max_var_over_mean_prefix": {"exact": str(order_max[0]), "float": float(order_max[0]), "k": order_max[1], "level_sequence": order_max[2]} if order_max else None,
        }
        print(f"trees n={n:2d} count={cnt:7d} failures={order_fails} max Var/E on prefix={('%.5f' % float(order_max[0])) if order_max else None} at k={order_max[1] if order_max else None} ({time.time()-t0:.1f}s)", flush=True)

    # 3. all forests (multiset of tree joints)
    tree_joints: Dict[int, List[BV]] = {}
    for n in range(1, args.forests_max + 1):
        t0 = time.time()
        cnt = 0
        order_max = None
        order_fails = 0
        for sizes, idxs, _poly in forest_polys(n):
            joint: BV = {(0, 0): 1}
            for s, t in zip(sizes, idxs):
                if s not in tree_joints:
                    tree_joints[s] = [joint_tree(layout_to_parent(lay)) for lay in free_tree_layouts(s)]
                joint = bv_mul(joint, tree_joints[s][t])
            alpha, L, p, rows, fails, mr = analyse(n, [], joint)
            cnt += 1
            if fails:
                order_fails += 1
                report["failures"].append({"n": n, "component_orders": list(sizes), "tree_indices": list(idxs), "levels": fails})
            if mr is not None and (order_max is None or mr[0] > order_max[0]):
                order_max = (mr[0], mr[1], list(sizes), list(idxs))
        report["per_order_forests"][n] = {
            "count": cnt,
            "dispersion_failures": order_fails,
            "max_var_over_mean_prefix": {"exact": str(order_max[0]), "float": float(order_max[0]), "k": order_max[1], "component_orders": order_max[2], "tree_indices": order_max[3]} if order_max else None,
        }
        print(f"forests n={n:2d} count={cnt:7d} failures={order_fails} max Var/E on prefix={float(order_max[0]) if order_max else None} ({time.time()-t0:.1f}s)", flush=True)

    # 4. structured families at larger orders
    fams = {}
    for m in (10, 20, 40, 80, 160):
        fams[f"star K_{{1,{m}}}"] = star(m + 1)
        fams[f"path P_{m+1}"] = path(m + 1)
    for a in (5, 10, 20, 40, 80):
        fams[f"double_broom({a},3,{a})"] = double_broom(a, 3, a)
        fams[f"double_broom({a},2,{a})"] = double_broom(a, 2, a)
        fams[f"double_broom({2*a},3,{a})"] = double_broom(2 * a, 3, a)
    for m, nn in ((4, 4), (6, 6), (9, 9), (12, 12), (3, 4)):
        fams[f"T3mn({m},{nn})"] = T3mn(m, nn)
        fams[f"T3mn_star({m},{nn})"] = T3mn_star(m, nn)
    fams["bush[8,8,8,8]"] = bush([8, 8, 8, 8])
    fams["bush[3,12,12]"] = bush([3, 12, 12])
    fams["spider(2^20)"] = spider([2] * 20)
    fams["spider(1^10,2^10,3^5)"] = spider([1] * 10 + [2] * 10 + [3] * 5)
    fams["multi_arm_star(6x(2,3))"] = multi_arm_star([(2, 3)] * 6)
    fams["multi_arm_star(8x(1,5))"] = multi_arm_star([(1, 5)] * 8)
    for name, (n, edges) in fams.items():
        alpha, L, p, rows, fails, mr = analyse(n, edges)
        fams_rec = {"n": n, "alpha": alpha, "L": L, "dispersion_failures_prefix": fails,
                    "max_var_over_mean_prefix": {"exact": str(mr[0]), "float": float(mr[0]), "k": mr[1]} if mr else None,
                    "all_levels_var_over_mean": [(k, str(r[4])) for k, r in zip(range(len(rows)), rows) if r[4] is not None][:60]}
        fams_rec.pop("all_levels_var_over_mean")
        report["families"][name] = fams_rec
        if fails:
            report["failures"].append({"family": name, "levels": fails})
        print(f"{name:32s} n={n:4d} alpha={alpha:3d} L={L:3d} failures={fails} max Var/E={('%.5f' % float(mr[0])) if mr else None} at k={mr[1] if mr else None}", flush=True)

    report["global_max_var_over_mean_trees"] = {"exact": str(global_max[0]), "float": float(global_max[0]), "k": global_max[1], "n": global_max[2], "level_sequence": global_max[3]} if global_max else None
    report["verdict"] = {"dispersion_holds_everywhere_tested": not report["failures"], "n_failures": len(report["failures"])}
    report["statement"] = "DISPERSION_k: Var(e) <= E(e) under the uniform distribution on independent k-sets, for k <= L(alpha)-2; implies FLC_{k+1} and ISO_{k+1}."
    report["caveat"] = "Finite evidence only."
    report["provenance"] = provenance(os.path.abspath(__file__))
    digest = write_report(args.out, report)
    print("verdict:", report["verdict"], "report:", args.out, "SHA256", digest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
