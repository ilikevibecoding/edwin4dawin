#!/usr/bin/env python3
"""Independent replay audit of the Erdős #993 toolkit core.

Everything under ``audit/`` re-implements the core with *different*
algorithms (vertex deletion recursion instead of the rooted in/out DP;
Beyer-Hedetniemi rooted trees + centre-rooted canonical forms instead of the
WROM free-tree generator; checks rewritten from the definitions) and imports
nothing from ``erdos993lib``.  This script is the only place where the two
implementations meet:

(a) all free trees of order <= --trees-max and all forests of order
    <= --forests-max: both polynomial implementations agree graph by graph,
    the multisets of polynomials per order agree between the two independent
    enumerations, counts match OEIS A000055 / A005195 (and rooted-tree counts
    match A000081), and every WR / ISO / TAIL / unimodality / log-concavity
    verdict agrees between ``audit.checks_audit`` and ``erdos993lib.checks``;
    tree counts are additionally verified up to --tree-count-max and forest
    counts up to --forest-count-max;
(b) named families (T_{3,m,n}, T*_{3,m,n}, spiders, brooms, double brooms,
    caterpillars, stars, paths, multi-arm stars, random trees; order <= 40):
    polynomials agree; the independent checker confirms that T_{3,4,4} and
    T*_{3,3,4} (order 26) are unimodal but not log-concave (failure exactly
    at index alpha - 1 = 13) with WR and ISO holding on the whole prefix;
(c) writes ``reports/independent_audit.json`` with all counts, ``"pass"``, the
    marker ``PASS_INDEPENDENT_AUDIT_ERDOS993_CORE`` (only if everything
    passed), provenance and SHA-256 of every audit source file.

Exit status is non-zero if any check fails.  Progress goes to stderr, the
one-line summary to stdout.
"""

from __future__ import annotations

import argparse
import os
import random
import sys
import time
from fractions import Fraction
from typing import Any, Dict, List, Optional, Sequence, Tuple

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

from audit import checks_audit as A_checks  # noqa: E402
from audit import indpoly_audit as A_poly  # noqa: E402
from audit import trees_audit as A_trees  # noqa: E402
from erdos993lib import checks as L_checks  # noqa: E402
from erdos993lib import families as L_fam  # noqa: E402
from erdos993lib import indpoly as L_poly  # noqa: E402
from erdos993lib import trees as L_trees  # noqa: E402
from erdos993lib.report import provenance, sha256_file, write_report  # noqa: E402

MARKER = "PASS_INDEPENDENT_AUDIT_ERDOS993_CORE"

AUDIT_SOURCES = [
    "audit/__init__.py",
    "audit/indpoly_audit.py",
    "audit/trees_audit.py",
    "audit/checks_audit.py",
    "scripts/audit_independent.py",
    "tests/test_audit.py",
]
LIBRARY_SOURCES = [
    "erdos993lib/__init__.py",
    "erdos993lib/indpoly.py",
    "erdos993lib/trees.py",
    "erdos993lib/checks.py",
    "erdos993lib/families.py",
    "erdos993lib/scan.py",
    "erdos993lib/report.py",
]

VERDICT_KEYS = [
    "alpha",
    "L",
    "unimodal",
    "log_concave",
    "lc_failures",
    "modes",
    "wr_failures_prefix",
    "iso_failures_prefix",
    "iso_failures_all_indices",
    "descent_conditional_iso_failures_prefix",
    "tail_failures",
    "min_iso_margin_prefix",
    "argmin_iso_margin_prefix",
    "max_wr_ratio_prefix",
    "wr_iso_tail_hypotheses_hold",
]


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def frac_json(f: Optional[Fraction]) -> Optional[Dict[str, Any]]:
    if f is None:
        return None
    return {"exact": "%d/%d" % (f.numerator, f.denominator), "float": float(f)}


class Failures:
    def __init__(self) -> None:
        self.items: List[Dict[str, Any]] = []

    def check(self, ok: bool, what: str, **detail: Any) -> bool:
        if not ok:
            entry = {"what": what}
            entry.update(detail)
            self.items.append(entry)
            log("FAIL: %s %s" % (what, detail if detail else ""))
        return ok

    def __bool__(self) -> bool:
        return bool(self.items)


class ShapeStats:
    """Independent (audit-side) aggregate of verdicts over a set of polynomials."""

    def __init__(self) -> None:
        self.count = 0
        self.not_unimodal = 0
        self.not_log_concave = 0
        self.wr_prefix_failures = 0
        self.iso_prefix_failures = 0
        self.tail_failures = 0
        self.hypotheses_hold_all = True
        self.min_margin: Optional[Fraction] = None
        self.min_margin_r: Optional[int] = None
        self.min_margin_witness: Any = None
        self.min_margin_poly: Optional[List[int]] = None
        self.max_wr_ratio: Optional[Fraction] = None
        self.max_wr_ratio_r: Optional[int] = None
        self.max_wr_ratio_witness: Any = None

    def add(self, p: Sequence[int], witness: Any) -> Dict[str, object]:
        v = A_checks.analyze(p)
        self.count += 1
        if not v["unimodal"]:
            self.not_unimodal += 1
        if not v["log_concave"]:
            self.not_log_concave += 1
        if v["wr_failures_prefix"]:
            self.wr_prefix_failures += 1
        if v["iso_failures_prefix"]:
            self.iso_prefix_failures += 1
        if v["tail_failures"]:
            self.tail_failures += 1
        if not v["wr_iso_tail_hypotheses_hold"]:
            self.hypotheses_hold_all = False
        a = A_checks.alpha(p)
        for r in A_checks.iso_range(a):
            m = A_checks.iso_margin(p, r)
            if self.min_margin is None or m < self.min_margin:
                self.min_margin, self.min_margin_r = m, r
                self.min_margin_witness, self.min_margin_poly = witness, list(p)
        for r in A_checks.wr_range(a):
            q = A_checks.wr_ratio(p, r)
            if self.max_wr_ratio is None or q > self.max_wr_ratio:
                self.max_wr_ratio, self.max_wr_ratio_r, self.max_wr_ratio_witness = q, r, witness
        return v

    def merge_min_into(self, other: "ShapeStats") -> None:
        if self.min_margin is not None and (other.min_margin is None or self.min_margin < other.min_margin):
            other.min_margin, other.min_margin_r = self.min_margin, self.min_margin_r
            other.min_margin_witness, other.min_margin_poly = self.min_margin_witness, self.min_margin_poly
        if self.max_wr_ratio is not None and (other.max_wr_ratio is None or self.max_wr_ratio > other.max_wr_ratio):
            other.max_wr_ratio, other.max_wr_ratio_r = self.max_wr_ratio, self.max_wr_ratio_r
            other.max_wr_ratio_witness = self.max_wr_ratio_witness

    def summary(self) -> Dict[str, Any]:
        return {
            "count": self.count,
            "not_unimodal": self.not_unimodal,
            "not_log_concave": self.not_log_concave,
            "wr_prefix_failures": self.wr_prefix_failures,
            "iso_prefix_failures": self.iso_prefix_failures,
            "tail_failures": self.tail_failures,
            "wr_iso_tail_hypotheses_hold_all": self.hypotheses_hold_all,
            "min_iso_margin_prefix": frac_json(self.min_margin),
            "min_iso_margin_prefix_r": self.min_margin_r,
            "min_iso_margin_prefix_witness": self.min_margin_witness,
            "min_iso_margin_prefix_poly": self.min_margin_poly,
            "max_wr_ratio_prefix": frac_json(self.max_wr_ratio),
            "max_wr_ratio_prefix_r": self.max_wr_ratio_r,
            "max_wr_ratio_prefix_witness": self.max_wr_ratio_witness,
        }


def verdicts_agree(p: Sequence[int], fails: Failures, witness: Any) -> bool:
    mine = A_checks.analyze(p)
    theirs = L_checks.analyze(p)
    ok = fails.check(set(mine) == set(theirs), "verdict key sets differ", witness=witness,
                     mine=sorted(mine), theirs=sorted(theirs))
    for key in VERDICT_KEYS:
        ok &= fails.check(mine.get(key) == theirs.get(key), "verdict disagreement", key=key,
                          witness=witness, poly=list(p), mine=mine.get(key), theirs=theirs.get(key))
    return ok


# --------------------------------------------------------------------------- #
# (a) exhaustive small orders
# --------------------------------------------------------------------------- #
def audit_trees(n: int, fails: Failures, tree_cache: Dict[int, List[List[int]]]) -> Tuple[Dict[str, Any], ShapeStats]:
    t0 = time.time()
    rooted_count = A_trees.count_rooted_trees(n)
    trees = A_trees.free_tree_list(n)
    tree_cache[n] = trees
    stats = ShapeStats()
    per_graph_ok = True
    verdict_ok = True
    my_polys: List[Tuple[int, ...]] = []
    for idx, parent in enumerate(trees):
        edges = A_trees.parent_to_edges(parent)
        witness = {"n": n, "tree_index": idx, "parent": list(parent)}
        per_graph_ok &= fails.check(len(edges) == n - 1 and A_poly.is_forest(n, edges), "representative is not a tree", witness=witness)
        p_rec = A_poly.indpoly_recursive(n, edges)
        p_rec_pure = A_poly.indpoly_recursive(n, edges, split_components=False) if n <= 12 else p_rec
        p_forest = A_poly.indpoly_forest_recursive(n, edges)
        p_lib_dp = L_poly.indpoly_parent_array(parent)
        p_lib_forest = L_poly.indpoly_forest(n, edges)
        same = p_rec == p_rec_pure == p_forest == p_lib_dp == p_lib_forest
        per_graph_ok &= fails.check(same, "polynomial mismatch (tree)", witness=witness,
                                    audit=p_rec, audit_pure=p_rec_pure, audit_forest=p_forest,
                                    library_dp=p_lib_dp, library_forest=p_lib_forest)
        per_graph_ok &= fails.check(bool(p_rec) and p_rec[-1] != 0 and p_rec[0] == 1 and p_rec[1] == n if n >= 1 else True,
                                    "polynomial normalisation", witness=witness, poly=p_rec)
        my_polys.append(tuple(p_rec))
        verdict_ok &= verdicts_agree(p_rec, fails, witness)
        stats.add(p_rec, witness)
    their_polys = sorted(tuple(q) for q in L_trees.tree_polys(n))
    multiset_ok = fails.check(sorted(my_polys) == their_polys, "tree polynomial multiset mismatch", n=n,
                              audit_count=len(my_polys), library_count=len(their_polys))
    count_ok = fails.check(len(trees) == A_trees.A000055[n] == L_trees.A000055[n], "tree count vs OEIS A000055", n=n,
                           audit_count=len(trees), oeis=A_trees.A000055[n])
    rooted_ok = fails.check(rooted_count == A_trees.A000081[n], "rooted tree count vs OEIS A000081", n=n,
                            audit_count=rooted_count, oeis=A_trees.A000081[n])
    distinct_polys = len(set(my_polys))
    s = stats.summary()
    log(
        "trees   n=%2d count=%6d oeis_ok=%s rooted=%7d rooted_ok=%s multiset_ok=%s per_graph_ok=%s verdicts_ok=%s "
        "nonunimodal=%d nonlogconcave=%d wr=%d iso=%d tail=%d min_iso_margin=%s (%.2fs)"
        % (n, len(trees), count_ok, rooted_count, rooted_ok, multiset_ok, per_graph_ok, verdict_ok,
           stats.not_unimodal, stats.not_log_concave, stats.wr_prefix_failures, stats.iso_prefix_failures,
           stats.tail_failures, s["min_iso_margin_prefix"]["float"] if s["min_iso_margin_prefix"] else None,
           time.time() - t0)
    )
    record = {
        "count": len(trees),
        "oeis_A000055": A_trees.A000055[n],
        "count_match": count_ok,
        "rooted_count": rooted_count,
        "oeis_A000081": A_trees.A000081[n],
        "rooted_count_match": rooted_ok,
        "distinct_polynomials": distinct_polys,
        "polynomial_multiset_matches_library": multiset_ok,
        "per_graph_polynomials_match_library": per_graph_ok,
        "verdicts_match_library": verdict_ok,
        "shape": s,
        "seconds": round(time.time() - t0, 3),
    }
    return record, stats


def audit_forests(n: int, fails: Failures, tree_cache: Dict[int, List[List[int]]]) -> Tuple[Dict[str, Any], ShapeStats]:
    t0 = time.time()
    for s in range(1, n + 1):
        if s not in tree_cache:
            tree_cache[s] = A_trees.free_tree_list(s)
    tree_counts = [len(tree_cache[s]) if s in tree_cache else 0 for s in range(n + 1)]
    tree_counts[0] = 1
    stats = ShapeStats()
    per_graph_ok = True
    verdict_ok = True
    my_polys: List[Tuple[int, ...]] = []
    count = 0
    for spec in A_trees.forest_specs(n, tree_counts):
        count += 1
        order, edges = A_trees.forest_graph(spec, tree_cache)
        witness = {"n": n, "component_orders": list(spec[0]), "tree_indices": list(spec[1])}
        per_graph_ok &= fails.check(order == n and A_poly.is_forest(order, edges), "forest spec does not give a forest", witness=witness)
        p_forest = A_poly.indpoly_forest_recursive(order, edges)
        p_rec = A_poly.indpoly_recursive(order, edges)
        p_lib = L_poly.indpoly_forest(order, edges)
        # product of component polynomials, each by the recursion on its own tree
        p_prod: List[int] = [1]
        for s, t in zip(*spec):
            p_prod = A_poly.poly_mul(p_prod, A_poly.indpoly_parent_array_recursive(tree_cache[s][t]))
        same = p_forest == p_rec == p_lib == p_prod
        per_graph_ok &= fails.check(same, "polynomial mismatch (forest)", witness=witness,
                                    audit_forest=p_forest, audit_recursive=p_rec, audit_product=p_prod, library=p_lib)
        my_polys.append(tuple(p_forest))
        verdict_ok &= verdicts_agree(p_forest, fails, witness)
        stats.add(p_forest, witness)
    their_polys = sorted(tuple(q) for _sizes, _idx, q in L_trees.forest_polys(n))
    multiset_ok = fails.check(sorted(my_polys) == their_polys, "forest polynomial multiset mismatch", n=n,
                              audit_count=len(my_polys), library_count=len(their_polys))
    count_ok = fails.check(count == A_trees.A005195[n] == L_trees.A005195[n], "forest count vs OEIS A005195", n=n,
                           audit_count=count, oeis=A_trees.A005195[n])
    formula = A_trees.count_forests_formula(n, tree_counts)
    formula_ok = fails.check(formula == count, "forest count formula vs enumeration", n=n, formula=formula, enumerated=count)
    s = stats.summary()
    log(
        "forests n=%2d count=%6d oeis_ok=%s multiset_ok=%s per_graph_ok=%s verdicts_ok=%s "
        "nonunimodal=%d nonlogconcave=%d wr=%d iso=%d tail=%d min_iso_margin=%s (%.2fs)"
        % (n, count, count_ok, multiset_ok, per_graph_ok, verdict_ok,
           stats.not_unimodal, stats.not_log_concave, stats.wr_prefix_failures, stats.iso_prefix_failures,
           stats.tail_failures, s["min_iso_margin_prefix"]["float"] if s["min_iso_margin_prefix"] else None,
           time.time() - t0)
    )
    record = {
        "count": count,
        "oeis_A005195": A_trees.A005195[n],
        "count_match": count_ok,
        "count_formula_match": formula_ok,
        "distinct_polynomials": len(set(my_polys)),
        "polynomial_multiset_matches_library": multiset_ok,
        "per_graph_polynomials_match_library": per_graph_ok,
        "verdicts_match_library": verdict_ok,
        "shape": s,
        "seconds": round(time.time() - t0, 3),
    }
    return record, stats


def audit_counts_only(tree_from: int, tree_to: int, forest_from: int, forest_to: int, fails: Failures,
                      tree_cache: Dict[int, List[List[int]]]) -> Dict[str, Any]:
    """OEIS count checks beyond the polynomial cross-check range."""
    out: Dict[str, Any] = {"trees": {}, "forests": {}}
    tree_counts: Dict[int, int] = {0: 1}
    for n in range(1, max(tree_to, forest_to) + 1):
        if n in tree_cache:
            tree_counts[n] = len(tree_cache[n])
    for n in range(tree_from, tree_to + 1):
        t0 = time.time()
        rooted = A_trees.count_rooted_trees(n)
        free = A_trees.count_free_trees(n)
        tree_counts[n] = free
        ok = fails.check(free == A_trees.A000055[n], "tree count vs OEIS A000055", n=n, audit_count=free, oeis=A_trees.A000055[n])
        rok = fails.check(rooted == A_trees.A000081[n], "rooted tree count vs OEIS A000081", n=n, audit_count=rooted, oeis=A_trees.A000081[n])
        out["trees"][n] = {"count": free, "oeis_A000055": A_trees.A000055[n], "count_match": ok,
                           "rooted_count": rooted, "oeis_A000081": A_trees.A000081[n], "rooted_count_match": rok,
                           "seconds": round(time.time() - t0, 3)}
        log("trees   n=%2d count=%7d oeis_ok=%s rooted=%8d rooted_ok=%s (count only, %.2fs)" % (n, free, ok, rooted, rok, time.time() - t0))
    for n in range(forest_from, forest_to + 1):
        t0 = time.time()
        counts = [tree_counts.get(s, 0) for s in range(n + 1)]
        missing = [s for s in range(1, n + 1) if s not in tree_counts]
        if not fails.check(not missing, "tree counts missing for forest count", n=n, missing=missing):
            continue
        enumerated = A_trees.count_forests(n, counts)
        formula = A_trees.count_forests_formula(n, counts)
        ok = fails.check(enumerated == A_trees.A005195[n] == formula, "forest count vs OEIS A005195", n=n,
                         audit_count=enumerated, formula=formula, oeis=A_trees.A005195[n])
        out["forests"][n] = {"count": enumerated, "count_formula": formula, "oeis_A005195": A_trees.A005195[n],
                             "count_match": ok, "seconds": round(time.time() - t0, 3)}
        log("forests n=%2d count=%7d oeis_ok=%s (count only, %.2fs)" % (n, enumerated, ok, time.time() - t0))
    return out


# --------------------------------------------------------------------------- #
# (b) named families
# --------------------------------------------------------------------------- #
def family_graphs() -> List[Tuple[str, str, Tuple[int, List[Tuple[int, int]]]]]:
    fams: List[Tuple[str, str, Tuple[int, List[Tuple[int, int]]]]] = []
    for m in range(3, 7):
        for n in range(3, 7):
            fams.append(("T3mn", "(%d,%d)" % (m, n), L_fam.T3mn(m, n)))
    for m in range(3, 7):
        for n in range(3, 7):
            fams.append(("T3mn_star", "(%d,%d)" % (m, n), L_fam.T3mn_star(m, n)))
    for legs in ([1, 1, 1, 1, 1], [2, 2, 2], [3, 3, 3, 3], [1, 2, 3, 4, 5], [5] * 7, [2] * 15, [4, 4, 4, 4, 4, 4, 4, 4, 4]):
        fams.append(("spider", str(legs), L_fam.spider(legs)))
    for path_len, leaves in ((1, 1), (2, 3), (5, 3), (10, 10), (20, 20), (30, 9), (39, 1)):
        fams.append(("broom", "(%d,%d)" % (path_len, leaves), L_fam.broom(path_len, leaves)))
    for a, k, b in ((3, 5, 4), (5, 10, 5), (8, 20, 10), (1, 2, 1), (10, 20, 10)):
        fams.append(("double_broom", "(%d,%d,%d)" % (a, k, b), L_fam.double_broom(a, k, b)))
    for counts in ([1, 2, 1, 2, 1], [3, 0, 3, 0, 3], [2] * 13, [0, 1, 2, 3, 4, 3, 2, 1, 0], [1] * 20, [5, 5, 5, 5, 5, 5]):
        fams.append(("caterpillar", str(counts), L_fam.caterpillar(counts)))
    for n in (1, 2, 5, 20, 40):
        fams.append(("star", str(n), L_fam.star(n)))
    for n in (1, 2, 3, 7, 20, 39, 40):
        fams.append(("path", str(n), L_fam.path(n)))
    for arms in ([(1, 2), (2, 3), (3, 1)], [(2, 2)] * 6, [(3, 3)] * 6, [(1, 0), (2, 0), (3, 0), (4, 0), (5, 0)], [(4, 1)] * 7):
        fams.append(("multi_arm_star", str(arms), L_fam.multi_arm_star(arms)))
    for counts, pl in (([2, 2, 2, 2], 2), ([3, 3, 3], 3), ([1, 2, 3, 4], 1)):
        fams.append(("bush", "(%s,pendant_len=%d)" % (counts, pl), L_fam.bush(counts, pl)))
    rng = random.Random(993)
    for n in (20, 25, 30, 35, 40):
        for k in range(3):
            fams.append(("random_tree", "(n=%d,seed=993,sample=%d)" % (n, k), L_fam.random_tree(n, rng)))
    for n in (25, 30, 40):
        fams.append(("random_attachment_tree", "(n=%d,heavy=0.6)" % n, L_fam.random_attachment_tree(n, rng, heavy=0.6)))
    return fams


def audit_families(fails: Failures) -> Tuple[List[Dict[str, Any]], ShapeStats, Dict[str, Any]]:
    t0 = time.time()
    records: List[Dict[str, Any]] = []
    stats = ShapeStats()
    special: Dict[str, Any] = {}
    for name, params, (n, edges) in family_graphs():
        label = name + params
        witness = {"family": name, "params": params, "n": n}
        fails.check(n <= 40, "family order exceeds 40", witness=witness)
        fails.check(len(edges) == n - 1 and A_poly.is_forest(n, edges), "family graph is not a tree", witness=witness)
        rec = A_poly.DeletionRecursion(n, edges)
        p_mine = rec.poly()
        p_mine_forest = A_poly.indpoly_forest_recursive(n, edges)
        p_lib = L_poly.indpoly_forest(n, edges)
        ok = fails.check(p_mine == p_mine_forest == p_lib, "polynomial mismatch (family)", witness=witness,
                         audit=p_mine, audit_forest=p_mine_forest, library=p_lib)
        vok = verdicts_agree(p_mine, fails, witness)
        v = stats.add(p_mine, witness)
        records.append({
            "family": name,
            "params": params,
            "order": n,
            "alpha": v["alpha"],
            "L": v["L"],
            "polynomial_matches_library": ok,
            "verdicts_match_library": vok,
            "unimodal": v["unimodal"],
            "log_concave": v["log_concave"],
            "lc_failures": v["lc_failures"],
            "wr_failures_prefix": v["wr_failures_prefix"],
            "iso_failures_prefix": v["iso_failures_prefix"],
            "tail_failures": v["tail_failures"],
            "min_iso_margin_prefix": v["min_iso_margin_prefix"],
            "recursion_evaluations": rec.calls,
        })
        if label in ("T3mn(4,4)", "T3mn_star(3,4)"):
            a = A_checks.alpha(p_mine)
            lc = A_checks.log_concavity_failures(p_mine)
            checks = {
                "order_is_26": n == 26,
                "alpha_is_14": a == 14,
                "not_log_concave": not A_checks.is_log_concave(p_mine),
                "lc_failure_exactly_at_alpha_minus_1": lc == [a - 1] == [13],
                "unimodal": A_checks.is_unimodal(p_mine),
                "wr_holds_on_whole_prefix": A_checks.wr_failures(p_mine) == [],
                "iso_holds_on_whole_prefix": A_checks.iso_failures(p_mine) == [],
                "tail_holds": A_checks.tail_failures(p_mine) == [],
                "library_agrees_not_log_concave": not L_checks.is_log_concave(p_mine),
                "library_agrees_unimodal": L_checks.is_unimodal(p_mine),
            }
            for key, val in checks.items():
                fails.check(val, "special witness property", graph=label, property=key)
            special[label] = {
                "order": n,
                "alpha": a,
                "L": A_checks.tail_cutoff(a),
                "polynomial": p_mine,
                "log_concavity_failures": lc,
                "lc_violation_at_13": {"p13_squared": p_mine[13] ** 2, "p12_times_p14": p_mine[12] * p_mine[14]},
                "modes": A_checks.modes(p_mine),
                "min_iso_margin_prefix": frac_json(A_checks.min_iso_margin(p_mine)),
                "checks": checks,
                "all_properties_confirmed": all(checks.values()),
            }
    for label in ("T3mn(4,4)", "T3mn_star(3,4)"):
        fails.check(label in special, "special witness missing", graph=label)
    log("families: %d graphs, all_poly_match=%s min_iso_margin=%s nonlogconcave=%d nonunimodal=%d (%.2fs)"
        % (len(records), all(r["polynomial_matches_library"] for r in records),
           stats.summary()["min_iso_margin_prefix"]["float"] if stats.min_margin is not None else None,
           stats.not_log_concave, stats.not_unimodal, time.time() - t0))
    return records, stats, special


# --------------------------------------------------------------------------- #
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--trees-max", type=int, default=14, help="polynomial cross-check for all trees of order <= this")
    ap.add_argument("--forests-max", type=int, default=12, help="polynomial cross-check for all forests of order <= this")
    ap.add_argument("--tree-count-max", type=int, default=18, help="OEIS A000055 count check up to this order (<= 18)")
    ap.add_argument("--forest-count-max", type=int, default=17, help="OEIS A005195 count check up to this order (<= 17)")
    ap.add_argument("--out", default=os.path.join("reports", "independent_audit.json"))
    args = ap.parse_args()
    if args.tree_count_max >= len(A_trees.A000055) or args.forest_count_max >= len(A_trees.A005195):
        ap.error("count checks limited to the OEIS terms embedded in audit.trees_audit")
    if args.forest_count_max > args.tree_count_max:
        ap.error("--forest-count-max needs tree counts up to the same order")

    t_start = time.time()
    fails = Failures()
    tree_cache: Dict[int, List[List[int]]] = {}
    overall_trees = ShapeStats()
    overall_forests = ShapeStats()
    overall = ShapeStats()

    per_order_trees: Dict[int, Any] = {}
    total_trees = 0
    for n in range(1, args.trees_max + 1):
        rec, st = audit_trees(n, fails, tree_cache)
        per_order_trees[n] = rec
        total_trees += rec["count"]
        for agg in (overall_trees, overall):
            agg.count += st.count
            agg.not_unimodal += st.not_unimodal
            agg.not_log_concave += st.not_log_concave
            agg.wr_prefix_failures += st.wr_prefix_failures
            agg.iso_prefix_failures += st.iso_prefix_failures
            agg.tail_failures += st.tail_failures
            agg.hypotheses_hold_all &= st.hypotheses_hold_all
            st.merge_min_into(agg)

    per_order_forests: Dict[int, Any] = {}
    total_forests = 0
    for n in range(1, args.forests_max + 1):
        rec, st = audit_forests(n, fails, tree_cache)
        per_order_forests[n] = rec
        total_forests += rec["count"]
        for agg in (overall_forests, overall):
            agg.count += st.count
            agg.not_unimodal += st.not_unimodal
            agg.not_log_concave += st.not_log_concave
            agg.wr_prefix_failures += st.wr_prefix_failures
            agg.iso_prefix_failures += st.iso_prefix_failures
            agg.tail_failures += st.tail_failures
            agg.hypotheses_hold_all &= st.hypotheses_hold_all
            st.merge_min_into(agg)

    counts_only = audit_counts_only(args.trees_max + 1, args.tree_count_max, args.forests_max + 1,
                                    args.forest_count_max, fails, tree_cache)

    family_records, family_stats, special = audit_families(fails)
    overall.count += family_stats.count
    overall.not_unimodal += family_stats.not_unimodal
    overall.not_log_concave += family_stats.not_log_concave
    overall.wr_prefix_failures += family_stats.wr_prefix_failures
    overall.iso_prefix_failures += family_stats.iso_prefix_failures
    overall.tail_failures += family_stats.tail_failures
    overall.hypotheses_hold_all &= family_stats.hypotheses_hold_all
    family_stats.merge_min_into(overall)

    # expected shape facts for the exhaustive range (recorded and asserted:
    # every tree/forest of these orders is unimodal, log-concave and satisfies WR+ISO+TAIL)
    fails.check(overall_trees.not_unimodal == 0, "a tree polynomial is not unimodal")
    fails.check(overall_forests.not_unimodal == 0, "a forest polynomial is not unimodal")
    fails.check(overall_trees.not_log_concave == 0, "a tree of order <= %d is not log-concave" % args.trees_max)
    fails.check(overall_forests.not_log_concave == 0, "a forest of order <= %d is not log-concave" % args.forests_max)
    fails.check(overall.wr_prefix_failures == 0 and overall.iso_prefix_failures == 0 and overall.tail_failures == 0,
                "WR/ISO/TAIL failure observed")
    fails.check(family_stats.not_unimodal == 0, "a family polynomial is not unimodal")
    fails.check(family_stats.not_log_concave >= 2, "the two order-26 witnesses must be non-log-concave",
                observed=family_stats.not_log_concave)

    passed = not fails
    audit_hashes = {}
    for rel in AUDIT_SOURCES:
        path = os.path.join(ROOT, rel)
        audit_hashes[rel] = sha256_file(path) if os.path.exists(path) else None
    library_hashes = {rel: sha256_file(os.path.join(ROOT, rel)) for rel in LIBRARY_SOURCES if os.path.exists(os.path.join(ROOT, rel))}

    tree_count_checks = {n: per_order_trees[n]["count_match"] for n in per_order_trees}
    tree_count_checks.update({n: v["count_match"] for n, v in counts_only["trees"].items()})
    forest_count_checks = {n: per_order_forests[n]["count_match"] for n in per_order_forests}
    forest_count_checks.update({n: v["count_match"] for n, v in counts_only["forests"].items()})

    payload: Dict[str, Any] = {
        "title": "Independent replay audit of the Erdős #993 core (deletion recursion + Beyer-Hedetniemi + rewritten checks vs erdos993lib)",
        "pass": passed,
        "marker": MARKER if passed else None,
        "method": {
            "audit_indpoly": "I(G) = I(G - v) + x I(G - N[v]) memoised on vertex bitmasks, pivot = maximum degree vertex, components multiplied",
            "audit_trees": "Beyer-Hedetniemi successor over all rooted level sequences; keep root-at-centre trees; dedupe by AHU code rooted at the centre(s)",
            "audit_forests": "multisets of free trees over integer partitions",
            "audit_checks": "WR/ISO/TAIL/L/unimodality/log-concavity written from the definitions",
            "library": "erdos993lib: rooted in/out DP (indpoly_parent_array/indpoly_forest), WROM free trees (tree_polys/forest_polys), checks.analyze",
            "independence": "audit/ imports nothing from erdos993lib; the two meet only in this script and tests/test_audit.py",
        },
        "definitions": {
            "L": "ceil((2*alpha-1)/3)",
            "WR_r": "p[r-1] <= r*p[r] for 1 <= r <= L-1",
            "ISO_r": "r*p[r]^2 + p[r-1]^2 - (r+1)*p[r-1]*p[r+1] >= 0 for 1 <= r <= min(L-1, alpha-1)",
            "TAIL": "p[r] >= p[r+1] for L <= r <= alpha-1",
            "iso_margin": "Q_r / (p[r-1]*p[r])",
            "wr_ratio": "p[r-1] / (r*p[r])",
        },
        "scope": {
            "trees_polynomial_cross_check_orders": [1, args.trees_max],
            "forests_polynomial_cross_check_orders": [1, args.forests_max],
            "tree_count_check_orders": [1, args.tree_count_max],
            "forest_count_check_orders": [1, args.forest_count_max],
            "family_max_order": 40,
        },
        "counts": {
            "trees_cross_checked": total_trees,
            "forests_cross_checked": total_forests,
            "family_graphs_cross_checked": len(family_records),
            "polynomials_with_verdict_agreement": overall.count,
            "tree_counts_match_A000055": tree_count_checks,
            "forest_counts_match_A005195": forest_count_checks,
            "all_tree_counts_match": all(tree_count_checks.values()),
            "all_forest_counts_match": all(forest_count_checks.values()),
        },
        "verdict_keys_compared": VERDICT_KEYS,
        "overall_trees": overall_trees.summary(),
        "overall_forests": overall_forests.summary(),
        "overall_families": family_stats.summary(),
        "overall_all": overall.summary(),
        "per_order_trees": per_order_trees,
        "per_order_forests": per_order_forests,
        "count_only_checks": counts_only,
        "families": family_records,
        "non_log_concave_witnesses": special,
        "failures": fails.items,
        "provenance": provenance(os.path.abspath(__file__)),
        "audit_sources_sha256": audit_hashes,
        "library_sources_sha256": library_hashes,
        "caveat": "Finite cross-checks only: they certify that two independent implementations agree on the stated ranges, nothing about larger orders.",
        "timing_note": "wall-clock timings are printed to stdout only, so that a replay reproduces this file byte-for-byte",
    }

    def _strip_timings(obj):
        # keep the report deterministic: timings go to stdout, not into the JSON
        if isinstance(obj, dict):
            return {k: _strip_timings(v) for k, v in obj.items() if k not in ("seconds", "seconds_total")}
        if isinstance(obj, list):
            return [_strip_timings(x) for x in obj]
        return obj

    payload = _strip_timings(payload)
    out_path = args.out if os.path.isabs(args.out) else os.path.join(ROOT, args.out)
    digest = write_report(out_path, payload)
    mm = overall.summary()["min_iso_margin_prefix"]
    print(
        "%s: trees n<=%d (%d trees) forests n<=%d (%d forests) families=%d counts_ok(trees<=%d,forests<=%d)=%s "
        "poly_agree=%s verdicts_agree=%s failures=%d min_iso_margin=%s report=%s sha256=%s (%.1fs)"
        % ("PASS " + MARKER if passed else "FAIL",
           args.trees_max, total_trees, args.forests_max, total_forests, len(family_records),
           args.tree_count_max, args.forest_count_max,
           all(tree_count_checks.values()) and all(forest_count_checks.values()),
           all(r["per_graph_polynomials_match_library"] for r in per_order_trees.values())
           and all(r["per_graph_polynomials_match_library"] for r in per_order_forests.values())
           and all(r["polynomial_matches_library"] for r in family_records),
           all(r["verdicts_match_library"] for r in per_order_trees.values())
           and all(r["verdicts_match_library"] for r in per_order_forests.values())
           and all(r["verdicts_match_library"] for r in family_records),
           len(fails.items), mm["exact"] if mm else None, os.path.relpath(out_path, ROOT), digest,
           time.time() - t_start)
    )
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
