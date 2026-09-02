#!/usr/bin/env python3
"""
forest_search.py -- the WR/ISO target-inequality checks on FORESTS.

The Erdős #993 conjecture (and the user's WR+ISO+TAIL framework) is about
forests, and I(F;x) of a forest is the product of the component polynomials,
so ISO_r has to survive polynomial products.  This script tests:

  1. every nonisomorphic forest with n <= 16 vertices (multisets of
     nonisomorphic trees over the integer partitions of n; trees from
     nauty-gentreeg, fallback networkx.nonisomorphic_trees); the forest counts
     are cross-checked against OEIS A005195 and against the Euler transform of
     the tree counts A000055 computed here;
  2. 400,000 random forests with n <= 60 (random Prüfer-code trees plus
     isolated vertices and K2 components);
  3. structured families  m*K1 + T,  m*K2 + T,  m*K_{1,s} + T  for the hard
     trees T (the two n=26 non-log-concave trees, T_{3,m,n}, T*_{3,m,n},
     Galvin T_{4,4}/T_{5,5}, stars, paths, brooms);
  4. adversarial hill-climbs over forests and over trees with n <= 60 that try to push the
     minimal target-range ISO slack (unconditional, descent-conditional, and open ranks r >= 9)
     down as far as possible -- any negative value would be a violation.

All arithmetic is exact (Python ints / Fractions).  The polynomial DP and the
inequality code are imported from scripts/check_known_hard_trees.py (pure
Python, independent of /workspace/erdos993_goal).

Output: reports/forest_search_report_20260902.json
"""
from __future__ import annotations

import json
import os
import random
import shutil
import subprocess
import sys
import time
from fractions import Fraction
from itertools import combinations_with_replacement
from typing import Dict, List, Sequence, Tuple

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from check_known_hard_trees import (  # noqa: E402
    FamilyStats, T3mn, analyze, broom, galvin_Tmt, indpoly_forest, path_graph, poly_mul, prufer_to_edges, spider,
)

ROOT = os.path.dirname(HERE)
REPORT = os.path.join(ROOT, "reports", "forest_search_report_20260902.json")

A000055 = [0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741, 19320, 48629]
# OEIS A005195: forests with n unlabeled nodes, n = 0..17
A005195 = [1, 1, 2, 3, 6, 10, 20, 37, 76, 153, 329, 710, 1601, 3658, 8599, 20514, 49905, 122963]


def euler_transform(a: Sequence[int], nmax: int) -> List[int]:
    """b_n = number of multisets of objects counted by a_n with total weight n."""
    b = [1] + [0] * nmax
    for k in range(1, nmax + 1):
        if a[k] == 0:
            continue
        # multiply by (1 - x^k)^(-a_k)
        for _ in range(a[k]):
            for n in range(k, nmax + 1):
                b[n] += b[n - k]
    return b


# --------------------------------------------------------------------------
# trees of each order (parent arrays) and their polynomials
# --------------------------------------------------------------------------
def trees_of_order(n: int) -> List[List[int]]:
    """parent arrays (gentreeg convention, 1-based parents, root has 0)"""
    if n == 1:
        return [[0]]
    if shutil.which("nauty-gentreeg"):
        out = subprocess.run(["nauty-gentreeg", "-p", "-q", str(n)], capture_output=True, text=True, check=True).stdout
        return [[int(x) for x in line.split()] for line in out.splitlines() if line.strip()]
    import networkx as nx
    res = []
    for T in nx.nonisomorphic_trees(n):
        parent = [0] * n
        order = list(nx.dfs_preorder_nodes(T, 0))
        relabel = {v: i for i, v in enumerate(order)}
        for u, v in nx.dfs_edges(T, 0):
            parent[relabel[v]] = relabel[u] + 1
        res.append(parent)
    return res


def par_edges(par: Sequence[int], offset: int) -> List[Tuple[int, int]]:
    return [(offset + i, offset + par[i] - 1) for i in range(1, len(par))]


def partitions(n: int, maxpart: int = None):
    if maxpart is None:
        maxpart = n
    if n == 0:
        yield ()
        return
    for first in range(min(n, maxpart), 0, -1):
        for rest in partitions(n - first, first):
            yield (first,) + rest


def forest_edges(components: Sequence[Sequence[int]]) -> Tuple[int, List[Tuple[int, int]]]:
    edges, off = [], 0
    for par in components:
        edges += par_edges(par, off)
        off += len(par)
    return off, edges


# --------------------------------------------------------------------------
def exhaustive_forests(nmax: int, log) -> Tuple[FamilyStats, Dict]:
    fs = FamilyStats(f"all_nonisomorphic_forests_n<=%d" % nmax)
    tree_pars = {k: trees_of_order(k) for k in range(1, nmax + 1)}
    for k in range(1, nmax + 1):
        assert len(tree_pars[k]) == A000055[k], (k, len(tree_pars[k]))
    tree_polys = {k: [indpoly_forest(k, par_edges(p, 0)) for p in tree_pars[k]] for k in tree_pars}
    counts = {}
    euler = euler_transform(A000055, nmax)
    for n in range(1, nmax + 1):
        cnt = 0
        for lam in partitions(n):
            # group equal part sizes: choose multisets of trees for each size
            sizes: Dict[int, int] = {}
            for k in lam:
                sizes[k] = sizes.get(k, 0) + 1
            choice_lists = []
            for k, mult in sizes.items():
                choice_lists.append([(k, combo) for combo in combinations_with_replacement(range(len(tree_pars[k])), mult)])

            def rec(level, acc_poly, acc_parts):
                nonlocal cnt
                if level == len(choice_lists):
                    cnt += 1
                    label = "+".join(f"T{k}#{i}" for k, combo in acc_parts for i in combo)
                    comps = [tree_pars[k][i] for k, combo in acc_parts for i in combo]
                    fs.add(label, n, (lambda c=comps: forest_edges(c)[1]), acc_poly)
                    return
                for k, combo in choice_lists[level]:
                    poly = acc_poly
                    for i in combo:
                        poly = poly_mul(poly, tree_polys[k][i])
                    rec(level + 1, poly, acc_parts + [(k, combo)])
            rec(0, [1], [])
        counts[n] = cnt
        ok = (cnt == A005195[n] == euler[n])
        log(f"  forests n={n}: {cnt} (A005195={A005195[n]}, Euler transform={euler[n]}) {'OK' if ok else 'MISMATCH'}")
        if not ok:
            fs.notes.append(f"COUNT MISMATCH at n={n}: {cnt} vs A005195 {A005195[n]} / Euler {euler[n]}")
    fs.notes.append(f"forest counts per n: {counts}; all match A005195 and Euler transform of A000055: "
                    f"{all(counts[n] == A005195[n] == euler[n] for n in counts)}")
    return fs, counts


# --------------------------------------------------------------------------
def random_forest(rng: random.Random, nmax: int):
    """random forest on n <= nmax vertices: isolates + K2's + random Prüfer trees"""
    n = rng.randint(2, nmax)
    mode = rng.random()
    if mode < 0.25:
        iso = rng.randint(0, n // 2)
        k2 = rng.randint(0, (n - iso) // 4)
    elif mode < 0.5:
        iso = rng.randint(0, min(3, n))
        k2 = rng.randint(0, min(3, (n - iso) // 2))
    else:
        iso = 0
        k2 = 0
    rest = n - iso - 2 * k2
    comps: List[List[Tuple[int, int]]] = []
    sizes: List[int] = [1] * iso + [2] * k2
    while rest > 0:
        if rest <= 2:
            s = rest
        elif rng.random() < 0.5:
            s = rest
        else:
            s = rng.randint(1, rest)
        sizes.append(s)
        rest -= s
    edges: List[Tuple[int, int]] = []
    off = 0
    desc = []
    for s in sizes:
        if s == 1:
            pass
        elif s == 2:
            edges.append((off, off + 1))
        else:
            code = [rng.randint(1, s) for _ in range(s - 2)]
            _, e = prufer_to_edges(code, one_based=True)
            edges += [(off + u, off + v) for u, v in e]
        desc.append(s)
        off += s
    return n, edges, sorted(desc, reverse=True)


def random_forests(count: int, nmax: int, seed: int, log) -> FamilyStats:
    fs = FamilyStats(f"random_forests_{count}_n<={nmax}_seed{seed}")
    rng = random.Random(seed)
    t0 = time.time()
    for i in range(count):
        n, edges, desc = random_forest(rng, nmax)
        p = indpoly_forest(n, edges)
        fs.add(f"rand{i}_n{n}_comps{desc}", n, edges, p)
        if (i + 1) % 25000 == 0:
            log(f"  random forests: {i + 1}/{count}  ({time.time() - t0:.0f}s)")
    return fs


# --------------------------------------------------------------------------
def structured_families(log) -> List[FamilyStats]:
    hard: Dict[str, Tuple[int, List[Tuple[int, int]]]] = {
        "T_{3,4,4}": T3mn(4, 4), "T*_{3,3,4}": T3mn(3, 4, star=True),
        "T_{3,1,1}": T3mn(1, 1), "T_{3,2,2}": T3mn(2, 2), "T_{3,6,6}": T3mn(6, 6), "T_{3,10,10}": T3mn(10, 10),
        "T*_{3,2,2}": T3mn(2, 2, star=True), "T*_{3,5,5}": T3mn(5, 5, star=True),
        "Galvin_T_{4,4}": galvin_Tmt(4, 4), "Galvin_T_{5,5}": galvin_Tmt(5, 5),
        "K_{1,5}": spider([1] * 5), "K_{1,12}": spider([1] * 12), "K_{1,25}": spider([1] * 25),
        "P_10": path_graph(10), "P_25": path_graph(25), "B(6,6)": broom(6, 6), "B(12,10)": broom(12, 10),
        "S(3^8)": spider([3] * 8), "S(2^10)": spider([2] * 10),
    }
    hard_polys = {k: indpoly_forest(*v) for k, v in hard.items()}
    out = []
    # m * K1 + T
    fs = FamilyStats("m*K1_+_T_hard_trees_0<=m<=60")
    for name, (n, edges) in hard.items():
        p = hard_polys[name]
        for m in range(0, 61):
            poly = poly_mul(p, [1] * 1)  # copy
            # (1+x)^m
            binom = [1]
            for _ in range(m):
                binom = poly_mul(binom, [1, 1])
            fs.add(f"{m}*K1+{name}", n + m, (lambda e=edges: list(e)), poly_mul(p, binom))
    out.append(fs); log("  done", fs.name, fs.count)
    # m * K2 + T
    fs = FamilyStats("m*K2_+_T_hard_trees_0<=m<=40")
    for name, (n, edges) in hard.items():
        p = hard_polys[name]
        q = [1]
        for m in range(0, 41):
            fs.add(f"{m}*K2+{name}", n + 2 * m, (lambda e=edges, m=m, n=n: list(e) + [(n + 2 * i, n + 2 * i + 1) for i in range(m)]),
                   poly_mul(p, q))
            q = poly_mul(q, [1, 2])
    out.append(fs); log("  done", fs.name, fs.count)
    # m * K_{1,s} + T
    fs = FamilyStats("m*K_{1,s}_+_T_hard_trees_1<=s<=8_0<=m<=25")
    for name, (n, edges) in hard.items():
        p = hard_polys[name]
        for s in range(1, 9):
            star_poly = indpoly_forest(*spider([1] * s))
            q = [1]
            for m in range(0, 26):
                def mk(e=edges, m=m, n=n, s=s):
                    ee = list(e)
                    off = n
                    for _ in range(m):
                        ee += [(off, off + 1 + j) for j in range(s)]
                        off += s + 1
                    return ee
                fs.add(f"{m}*K_{{1,{s}}}+{name}", n + m * (s + 1), mk, poly_mul(p, q))
                q = poly_mul(q, star_poly)
    out.append(fs); log("  done", fs.name, fs.count)
    # K_{1,s} + m*K1  (full grid; the star is the tightest ISO_2 tree, slack ~ 12/n^2)
    fs = FamilyStats("K_{1,s}_+_m*K1_1<=s<=60_0<=m<=60")
    for s in range(1, 61):
        sp = indpoly_forest(*spider([1] * s))
        binom = [1]
        for m in range(0, 61):
            fs.add(f"K_{{1,{s}}}+{m}*K1", s + 1 + m, (lambda s=s: [(0, i) for i in range(1, s + 1)]), poly_mul(sp, binom))
            binom = poly_mul(binom, [1, 1])
    out.append(fs); log("  done", fs.name, fs.count)
    # random star forests (unions of stars K_{1,s_i}, s_i >= 0) with n <= 80
    fs = FamilyStats("random_star_forests_20000_n<=80")
    rng = random.Random(7)
    star_polys = {s: indpoly_forest(*spider([1] * s)) if s else [1, 1] for s in range(0, 80)}
    for i in range(20000):
        n = rng.randint(2, 80)
        sizes = []
        rest = n
        while rest > 0:
            s = rng.randint(1, rest)
            sizes.append(s - 1)
            rest -= s
        poly = [1]
        for s in sizes:
            poly = poly_mul(poly, star_polys[s])

        def mk(sizes=sizes):
            ee, off = [], 0
            for s in sizes:
                ee += [(off, off + 1 + j) for j in range(s)]
                off += s + 1
            return ee
        fs.add(f"stars{sorted(sizes, reverse=True)}", n, mk, poly)
    out.append(fs); log("  done", fs.name, fs.count)
    # pairs / triples of hard trees
    fs = FamilyStats("unions_of_2_or_3_hard_trees")
    names = list(hard)
    for a, b in combinations_with_replacement(names, 2):
        n = hard[a][0] + hard[b][0]
        fs.add(f"{a}+{b}", n, (lambda a=a, b=b: list(hard[a][1]) + [(hard[a][0] + u, hard[a][0] + v) for u, v in hard[b][1]]),
               poly_mul(hard_polys[a], hard_polys[b]))
    for a, b, c in combinations_with_replacement(names, 3):
        n = hard[a][0] + hard[b][0] + hard[c][0]
        fs.add(f"{a}+{b}+{c}", n, None, poly_mul(poly_mul(hard_polys[a], hard_polys[b]), hard_polys[c]))
    out.append(fs); log("  done", fs.name, fs.count)
    return out


# --------------------------------------------------------------------------
def hill_climb(seed: int, nmax: int, steps: int, objective: str, log, trees_only: bool = False) -> Dict:
    """local search over forests (edge deletion / insertion between components / edge relocation;
    with trees_only=True only leaf relocations, so the graph stays a tree) minimising
      objective='target'  : the minimal normalized target-range ISO slack (all 2 <= r < L),
      objective='descent' : the minimal descent-conditional slack,
      objective='open'    : the minimal slack over the open ranks 9 <= r < L.
    Exact Fractions throughout."""
    rng = random.Random(seed)
    key = {"target": "min_slack_target", "descent": "min_slack_target_descent", "open": "min_slack_target_r_ge_9"}[objective]

    def score(n, edges):
        a = analyze(indpoly_forest(n, edges))
        cell = a[key]
        return (Fraction(10 ** 9) if cell is None else cell[0]), a

    n = rng.randint(max(10, nmax - 20), nmax)
    code = [rng.randint(1, n) for _ in range(n - 2)]
    _, edges = prufer_to_edges(code)
    edges = set(tuple(sorted(e)) for e in edges)
    cur, a = score(n, list(edges))
    best = (cur, n, sorted(edges), a)
    for step in range(steps):
        cand = set(edges)
        move = rng.random()
        if trees_only:
            deg = {}
            for u, v in cand:
                deg[u] = deg.get(u, 0) + 1
                deg[v] = deg.get(v, 0) + 1
            leaves = [v for v in range(n) if deg.get(v, 0) == 1]
            leaf = rng.choice(leaves)
            e = next(ed for ed in cand if leaf in ed)
            cand.discard(e)
            w = rng.randrange(n)
            if w == leaf:
                continue
            cand.add(tuple(sorted((leaf, w))))
        elif move < 0.4 and cand:
            cand.discard(rng.choice(sorted(cand)))              # split a component
        elif move < 0.8:
            u, v = rng.randrange(n), rng.randrange(n)           # join two components (if acyclic)
            if u != v:
                e = tuple(sorted((u, v)))
                if e not in cand:
                    cand.add(e)
                    try:
                        indpoly_forest(n, list(cand))
                    except ValueError:
                        continue
        else:
            if cand:                                            # move an edge endpoint
                e = rng.choice(sorted(cand))
                cand.discard(e)
                u = e[0] if rng.random() < 0.5 else e[1]
                w = rng.randrange(n)
                if w == u:
                    continue
                cand.add(tuple(sorted((u, w))))
                try:
                    indpoly_forest(n, list(cand))
                except ValueError:
                    continue
        try:
            sc, aa = score(n, list(cand))
        except ValueError:
            continue
        if sc <= cur or rng.random() < 0.01:
            edges, cur, a = cand, sc, aa
            if sc < best[0]:
                best = (sc, n, sorted(edges), aa)
    sc, n, edges, a = best
    cell = a[key]
    p = indpoly_forest(n, edges)
    return {"objective": objective, "trees_only": trees_only, "seed": seed, "n": n, "components": n - len(edges),
            "edges": [list(e) for e in edges], "poly": [str(c) for c in p],
            "alpha": a["alpha"], "L": a["L"], "min_slack": float(sc), "slack_num": str(sc.numerator), "slack_den": str(sc.denominator),
            "r": None if cell is None else cell[1], "Q_r": None if cell is None else str(cell[2]),
            "iso_fail_target": [[r, str(Q)] for r, Q in a["iso_fail_target"]], "wr_fail_target": a["wr_fail_target"],
            "unimodal": a["unimodal"], "lc_breaks": a["lc_breaks"]}


# --------------------------------------------------------------------------
def main(argv: Sequence[str]) -> int:
    quick = "--quick" in argv
    t0 = time.time()
    log = lambda *a: print(*a, flush=True)
    families: List[Dict] = []

    fs, counts = exhaustive_forests(12 if quick else 16, log)
    families.append(fs.to_json()); log("done:", fs.name, fs.count, f"{time.time() - t0:.0f}s")

    nrand = 5000 if quick else 400000
    fs = random_forests(nrand, 60, 20260902, log)
    families.append(fs.to_json()); log("done:", fs.name, fs.count, f"{time.time() - t0:.0f}s")

    for fs in structured_families(log):
        families.append(fs.to_json())
    log("done: structured families", f"{time.time() - t0:.0f}s")

    climbs = []
    nclimb = 3 if quick else 30
    steps = 300 if quick else 8000
    for i in range(nclimb):
        obj = ("target", "descent", "open")[i % 3]
        trees_only = (i // 3) % 2 == 1
        res = hill_climb(1000 + i, 60 if i % 5 else 40, steps, obj, log, trees_only=trees_only)
        climbs.append(res)
        log(f"  hill-climb {i} ({obj}, {'tree' if trees_only else 'forest'}, n={res['n']}, comps={res['components']}): "
            f"min slack {res['min_slack']:.6g} at r={res['r']} iso_fail={res['iso_fail_target']} wr_fail={res['wr_fail_target']}")
    hc_fs = FamilyStats("adversarial_hill_climb_best_forests")
    for res in climbs:
        n = res["n"]
        edges = [tuple(e) for e in res["edges"]]
        hc_fs.add(f"climb_seed{res['seed']}_{res['objective']}_{'tree' if res['trees_only'] else 'forest'}", n, edges,
                  indpoly_forest(n, edges))
    hc = hc_fs.to_json()
    hc["climbs"] = climbs
    families.append(hc)

    tot_iso = sum(f["iso_fail_target_cells"] for f in families)
    tot_wr = sum(f["wr_fail_target_cells"] for f in families)
    tot_nu = sum(f["nonunimodal"] for f in families)
    report = {
        "date": "2026-09-02",
        "script": "scripts/forest_search.py (pure Python exact integers)",
        "headline": ("NO target-range ISO_r / WR_r violation and no non-unimodal forest found"
                     if tot_iso == 0 and tot_wr == 0 and tot_nu == 0 else "VIOLATION FOUND -- see violators"),
        "exhaustive_forest_counts": counts,
        "totals": {"forests": sum(f["count"] for f in families), "nonunimodal": tot_nu,
                   "lc_fail_forests": sum(f["lc_fail_trees"] for f in families),
                   "iso_fail_target_cells": tot_iso, "wr_fail_target_cells": tot_wr,
                   "iso_fail_desc_target_cells": sum(f["iso_fail_desc_target_cells"] for f in families)},
        "families": families,
        "elapsed_seconds": round(time.time() - t0, 1),
    }
    with open(REPORT, "w") as fh:
        json.dump(report, fh, indent=1)
    log("HEADLINE:", report["headline"])
    for f in families:
        t = f["tightest_iso_cell_target"]
        d = f["tightest_iso_cell_target_descent"]
        log(f"{f['family']}: count={f['count']} nonuni={f['nonunimodal']} lc_fail={f['lc_fail_trees']} "
            f"iso_target_fail={f['iso_fail_target_cells']} wr_target_fail={f['wr_fail_target_cells']} "
            f"iso_desc_fail={f['iso_fail_desc_target_cells']} "
            f"tightest={'NA' if t is None else (t['label'], 'r=%d' % t['r'], 'slack=%.4g' % t['slack'])} "
            f"tightest_desc={'NA' if d is None else (d['label'], 'r=%d' % d['r'], 'slack=%.4g' % d['slack'])}")
    log("report ->", REPORT)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
