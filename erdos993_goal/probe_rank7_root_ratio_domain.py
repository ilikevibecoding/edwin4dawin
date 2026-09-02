#!/usr/bin/env python3
"""Probe rooted ratio relations used by the rank-7 terminal-broom certificate."""

from __future__ import annotations

import random

import networkx as nx


def poly_mul(a: list[int], b: list[int], cap: int = 8) -> list[int]:
    out = [0] * (min(cap, len(a) + len(b) - 2) + 1)
    for i, av in enumerate(a):
        for j, bv in enumerate(b):
            if i + j < len(out):
                out[i + j] += av * bv
    return out


def rooted_state(g: nx.Graph, root: int) -> tuple[list[int], list[int]]:
    def visit(v: int, parent: int) -> tuple[list[int], list[int]]:
        excluded = [1]
        included = [0, 1]
        for child in g[v]:
            if child == parent:
                continue
            ce, ci = visit(child, v)
            total = [0] * max(len(ce), len(ci))
            for j in range(len(total)):
                total[j] = (ce[j] if j < len(ce) else 0) + (ci[j] if j < len(ci) else 0)
            excluded = poly_mul(excluded, total)
            included = poly_mul(included, ce)
        return excluded, included
    return visit(root, -1)


def at(a: list[int], j: int) -> int:
    return a[j] if j < len(a) else 0


def main() -> int:
    rng = random.Random(9931718)
    stats = {
        "max_d_minus_s": (-1e99, None),
        "min_d_minus_s": (1e99, None),
        "min_ba_over_c65": (1e99, None),
        "min_h_ratio_gap": (1e99, None),
    }
    for sample in range(2000):
        n = rng.randint(13, 250)
        g = nx.random_labeled_tree(n, seed=rng.randrange(1 << 32))
        for root in rng.sample(list(g), min(n, 10)):
            h, inc = rooted_state(g, root)
            c = [at(h,j)+at(inc,j) for j in range(9)]
            if c[5] == 0 or c[6] == 0:
                continue
            s = at(h,5)/c[5]
            d = at(h,6)/c[6]
            a = at(inc,5)
            b = at(inc,6)
            item = (n, root, g.degree[root], s, d, c[5],c[6],a,b)
            if d-s > stats["max_d_minus_s"][0]: stats["max_d_minus_s"]=(d-s,item)
            if d-s < stats["min_d_minus_s"][0]: stats["min_d_minus_s"]=(d-s,item)
            if a and b:
                ratio=(b/a)/(c[6]/c[5])
                if ratio < stats["min_ba_over_c65"][0]: stats["min_ba_over_c65"]=(ratio,item)
            if at(h,5) and at(h,6):
                gap=6*at(h,6)/at(h,5)-6*c[6]/c[5]
                if gap < stats["min_h_ratio_gap"][0]: stats["min_h_ratio_gap"]=(gap,item)
    for k,v in stats.items(): print(k,v)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
