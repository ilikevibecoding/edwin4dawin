"""Test coefficientwise half-occupation for non-core vertices of trees.

For a tree T and vertex p with alpha(T-p)=alpha(T), test

    i_(k-1)(T-N[p]) <= i_k(T-p)

at every rank.  This says at most half of the independent k-sets contain p.
It would imply the first conditional Boundary-SM3 half for its support vertex.
Bounded exact probe only.
"""

from __future__ import annotations

import argparse
import json
import math
from functools import lru_cache
from pathlib import Path

import networkx as nx


def add(a, b):
    return tuple((a[i] if i < len(a) else 0) + (b[i] if i < len(b) else 0) for i in range(max(len(a), len(b))))


def oracle(g: nx.Graph):
    n = len(g)
    adj = [0] * n
    for u, v in g.edges():
        adj[u] |= 1 << v
        adj[v] |= 1 << u

    @lru_cache(None)
    def poly(mask):
        if not mask:
            return (1,)
        bit = mask & -mask
        v = bit.bit_length() - 1
        return add(poly(mask ^ bit), (0,) + poly((mask ^ bit) & ~adj[v]))

    return poly, adj, (1 << n) - 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-order", type=int, default=16)
    ap.add_argument("--output", type=Path, default=Path("noncore_vertex_half_occupation_probe.json"))
    args = ap.parse_args()
    totals = {"trees": 0, "noncore_vertices": 0, "checks": 0, "failures": 0,
              "prefix_checks": 0, "prefix_failures": 0,
              "conditional_checks": 0, "conditional_failures": 0,
              "one_root_checks": 0, "one_root_failures": 0,
              "maxset_bound_failures": 0, "one_root_full_failures": 0}
    totals["one_root_payment_prefix_checks"] = 0
    totals["one_root_payment_prefix_failures"] = 0
    totals["conditional_allrank_checks"] = 0
    totals["conditional_allrank_failures"] = 0
    totals["single_root_payment_failures"] = 0
    totals["two_root_payment_failures"] = 0
    totals["max_roots_needed"] = 0
    first = None
    first_prefix = None
    first_conditional = None
    first_one_root = None
    first_maxset = None
    first_single_root = None
    min_one_root_ratio = None
    for n in range(2, args.max_order + 1):
        for ti, g0 in enumerate(nx.generators.nonisomorphic_trees(n)):
            g = nx.convert_node_labels_to_integers(g0, ordering="sorted")
            totals["trees"] += 1
            poly, adj, full = oracle(g)
            alpha = len(poly(full)) - 1
            for p in range(n):
                f = poly(full & ~(1 << p))
                if len(f) - 1 != alpha:
                    continue
                totals["noncore_vertices"] += 1
                h = poly(full & ~(1 << p) & ~adj[p])
                marked_mask = adj[p]
                one_root = [0]
                single_root_rows = []
                for q in range(n):
                    if not ((marked_mask >> q) & 1):
                        continue
                    allowed = full & ~(1 << p) & ~marked_mask & ~adj[q]
                    row = poly(allowed)
                    shifted_row = [0] + list(row)
                    single_root_rows.append((q, shifted_row))
                    if len(one_root) < len(row) + 1:
                        one_root.extend([0] * (len(row) + 1 - len(one_root)))
                    for jj, val in enumerate(row):
                        one_root[jj + 1] += val
                for k in range(1, len(h) + 1):
                    hv = h[k - 1] if k - 1 < len(h) else 0
                    fv = f[k] if k < len(f) else 0
                    margin = fv - hv
                    totals["checks"] += 1
                    in_prefix = k <= (2 * alpha) // 3
                    d_h = 3 * (h[k] if k < len(h) else 0) - hv
                    conditional = in_prefix and d_h < 0
                    conditional_allrank = d_h < 0
                    one_margin_all = (h[k] if k < len(h) else 0) + (one_root[k] if k < len(one_root) else 0) - hv
                    if in_prefix:
                        totals["prefix_checks"] += 1
                        totals["one_root_payment_prefix_checks"] += 1
                        if one_margin_all < 0:
                            totals["one_root_payment_prefix_failures"] += 1
                    if conditional:
                        totals["conditional_checks"] += 1
                        totals["one_root_checks"] += 1
                        one_margin = one_margin_all
                        best_single = max((row[k] if k < len(row) else 0) for _, row in single_root_rows)
                        if (h[k] if k < len(h) else 0) + best_single < hv:
                            totals["single_root_payment_failures"] += 1
                            if first_single_root is None:
                                first_single_root = {"n": n, "tree_index": ti, "vertex": p,
                                                     "alpha": alpha, "k": k, "h_prev": hv,
                                                     "h_k": h[k] if k < len(h) else 0,
                                                     "root_contributions": sorted(((q, row[k] if k < len(row) else 0) for q, row in single_root_rows), key=lambda z: z[1], reverse=True),
                                                     "edges": sorted(tuple(sorted(e)) for e in g.edges())}
                        contributions = sorted(((row[k] if k < len(row) else 0) for _, row in single_root_rows), reverse=True)
                        if (h[k] if k < len(h) else 0) + sum(contributions[:2]) < hv:
                            totals["two_root_payment_failures"] += 1
                        running = h[k] if k < len(h) else 0
                        needed = 0
                        for val in contributions:
                            if running >= hv:
                                break
                            running += val
                            needed += 1
                        totals["max_roots_needed"] = max(totals["max_roots_needed"], needed)
                        if (one_root[k] if k < len(one_root) else 0) < hv:
                            totals["one_root_full_failures"] += 1
                        ratio_item = {"numerator": one_root[k] if k < len(one_root) else 0,
                                      "denominator": hv, "n": n, "tree_index": ti,
                                      "vertex": p, "alpha": alpha, "k": k,
                                      "edges": sorted(tuple(sorted(e)) for e in g.edges())}
                        if min_one_root_ratio is None or ratio_item["numerator"] * min_one_root_ratio["denominator"] < min_one_root_ratio["numerator"] * ratio_item["denominator"]:
                            min_one_root_ratio = ratio_item
                        if one_margin < 0:
                            totals["one_root_failures"] += 1
                            if first_one_root is None:
                                first_one_root = {"n": n, "tree_index": ti, "vertex": p, "alpha": alpha,
                                                  "k": k, "one_margin": one_margin, "F": list(f),
                                                  "H": list(h), "one_root": one_root,
                                                  "edges": sorted(tuple(sorted(e)) for e in g.edges())}
                        maxset_margin = math.comb(alpha, k) - hv
                        if maxset_margin < 0:
                            totals["maxset_bound_failures"] += 1
                            if first_maxset is None:
                                first_maxset = {"n": n, "tree_index": ti, "vertex": p,
                                                "alpha": alpha, "k": k, "h_prev": hv,
                                                "binomial": math.comb(alpha, k),
                                                "edges": sorted(tuple(sorted(e)) for e in g.edges())}
                    if conditional_allrank:
                        totals["conditional_allrank_checks"] += 1
                        if one_margin_all < 0:
                            totals["conditional_allrank_failures"] += 1
                    if margin < 0:
                        totals["failures"] += 1
                        if in_prefix:
                            totals["prefix_failures"] += 1
                        if conditional:
                            totals["conditional_failures"] += 1
                        item = {"n": n, "tree_index": ti, "vertex": p, "alpha": alpha,
                                "k": k, "margin": margin, "f_k": fv, "h_prev": hv,
                                "F": list(f), "H": list(h),
                                "edges": sorted(tuple(sorted(e)) for e in g.edges())}
                        if first is None:
                            first = item
                        if in_prefix and first_prefix is None:
                            first_prefix = item
                        if conditional and first_conditional is None:
                            first_conditional = item
    conditional_ok = (totals["conditional_failures"] == 0 and
                      totals["one_root_failures"] == 0)
    report = {"status": "PASS_CONDITIONAL_ONE_ROOT_NOT_PROOF" if conditional_ok else "FAIL_CONDITIONAL",
              "max_order": args.max_order, "totals": totals,
              "first_failure_any_rank": first, "first_failure_prefix": first_prefix,
              "first_failure_conditional": first_conditional,
              "first_failure_one_root_payment": first_one_root,
              "first_failure_maxset_bound": first_maxset,
              "first_failure_single_root_payment": first_single_root,
              "minimum_one_root_ratio": min_one_root_ratio}
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
