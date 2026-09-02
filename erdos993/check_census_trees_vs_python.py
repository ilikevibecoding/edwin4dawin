#!/usr/bin/env python3
"""
Cross-check of the C census (census_trees.c) against the Python core
(forest_indep.py) for small orders (default n <= 14).

Two independent comparisons per order n:

  1. per tree  -- ``census_trees --dump n`` must list exactly the same level
     sequences, in the same order, with the same exact polynomials as
     ``tree_level_sequences`` + ``indep_poly_tree``;

  2. per order -- ``results/census_trees_n{n}.json`` (counts, minima, argmin
     trees, attaining index r, exact ratio, the five tightest-ratio trees, the
     non-log-concave trees, the alpha histogram) must equal an independent
     Python aggregation built from ``audit_sequence`` / ``Q_iso`` /
     ``wr_slack`` / ``L_cutoff`` with ``fractions.Fraction``.

Tie-breaking mirrors the C program: per tree the smallest r attaining a
minimum; per order the first tree (generator order) attaining a minimum; the
tightest-ratio list is the stable sort by ratio truncated to five entries.

Exact arithmetic only (Python ints and Fractions).  Prints a per-order line,
then ``CROSSCHECK PASS`` or ``CROSSCHECK FAIL``; exit status 0 / 1; writes a
JSON verdict to --out.  Finite enumeration is falsification evidence only.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import forest_indep as fi  # noqa: E402

TOPK = 5
DECIMAL_DIGITS = 15


def iso_ratio(p, r):
    return Fraction(r * p[r] ** 2 + p[r - 1] ** 2, (r + 1) * p[r - 1] * p[r + 1])


def decimal_truncated(fr: Fraction, digits: int) -> str:
    """Exact decimal expansion of fr truncated after `digits` places."""
    ip, rem = divmod(fr.numerator, fr.denominator)
    out = [str(ip), "."]
    for _ in range(digits):
        rem *= 10
        d, rem = divmod(rem, fr.denominator)
        out.append(str(d))
    return "".join(out)


def python_order(n):
    """Independent Python aggregation for order n (mirrors census_trees.c)."""
    trees = []
    agg = {
        "tree_count": 0,
        "non_unimodal_count": 0,
        "tail_fail_count": 0,
        "wr_prefix_fail_count": 0,
        "iso_prefix_fail_count": 0,
        "non_log_concave_count": 0,
        "trees_with_nonempty_prefix": 0,
    }
    alpha_hist = {}
    best = {"wr_prefix_min": None, "iso_prefix_min": None, "iso_prefix_ratio_min": None,
            "wr_all_min": None, "iso_all_min": None}
    ratio_list = []
    nonlc = []

    def better(key, cand):
        # cand = (value, record); replace only on strict decrease (first tree wins ties)
        if best[key] is None or cand[0] < best[key][0]:
            best[key] = cand

    for idx, seq in enumerate(fi.tree_level_sequences(n)):
        seq = list(seq)
        p = fi.indep_poly_tree(fi.level_sequence_to_parent(seq))
        a = fi.audit_sequence(p, with_ratio=True)
        alpha, L = a["alpha"], a["L"]
        trees.append((seq, p))
        agg["tree_count"] += 1
        alpha_hist[alpha] = alpha_hist.get(alpha, 0) + 1
        if not a["unimodal"]:
            agg["non_unimodal_count"] += 1
        if not a["tail_ok"]:
            agg["tail_fail_count"] += 1
        if not a["log_concave"]:
            agg["non_log_concave_count"] += 1
            fails = [r for r in range(1, alpha) if p[r] ** 2 < p[r - 1] * p[r + 1]]
            nonlc.append({"level_sequence": seq, "poly": p, "lc_fail_indices": fails,
                          "unimodal": a["unimodal"]})
        prefix = range(1, L)
        if L >= 2:
            agg["trees_with_nonempty_prefix"] += 1
            wr_r = min(prefix, key=lambda r: (fi.wr_slack(p, r), r))
            q_r = min(prefix, key=lambda r: (fi.Q_iso(p, r), r))
            rt_r = min(prefix, key=lambda r: (iso_ratio(p, r), r))
            # the per-tree minima must agree with audit_sequence
            assert fi.wr_slack(p, wr_r) == a["wr_prefix_min"]
            assert fi.Q_iso(p, q_r) == a["iso_prefix_min"]
            assert iso_ratio(p, rt_r) == a["iso_prefix_ratio_min"]
            if a["wr_prefix_min"] < 0:
                agg["wr_prefix_fail_count"] += 1
            if a["iso_prefix_min"] < 0:
                agg["iso_prefix_fail_count"] += 1
            better("wr_prefix_min", (a["wr_prefix_min"], {"r": wr_r, "level_sequence": seq, "poly": p}))
            better("iso_prefix_min", (a["iso_prefix_min"], {"r": q_r, "level_sequence": seq, "poly": p}))
            better("iso_prefix_ratio_min",
                   (a["iso_prefix_ratio_min"], {"r": rt_r, "level_sequence": seq, "poly": p}))
            ratio_list.append((a["iso_prefix_ratio_min"], idx,
                               {"r": rt_r, "level_sequence": seq, "poly": p}))
        if alpha >= 1:
            allr = range(1, alpha + 1)
            wa_r = min(allr, key=lambda r: (fi.wr_slack(p, r), r))
            assert fi.wr_slack(p, wa_r) == a["wr_all_min"]
            better("wr_all_min", (a["wr_all_min"], {"r": wa_r, "level_sequence": seq, "poly": p}))
        if alpha >= 2:
            allr = range(1, alpha)
            ia_r = min(allr, key=lambda r: (fi.Q_iso(p, r), r))
            assert fi.Q_iso(p, ia_r) == a["iso_all_min"]
            better("iso_all_min", (a["iso_all_min"], {"r": ia_r, "level_sequence": seq, "poly": p}))

    top = sorted(ratio_list, key=lambda t: (t[0], t[1]))[:TOPK]
    return trees, agg, alpha_hist, best, top, nonlc


def parse_ratio(s: str) -> Fraction:
    num, den = s.split("/")
    return Fraction(int(num), int(den))


def compare_order(n, J, py, mismatches):
    trees, agg, alpha_hist, best, top, nonlc = py

    def chk(name, got, want):
        if got != want:
            mismatches.append(f"n={n} {name}: C={got!r} Python={want!r}")

    chk("N", J.get("N"), n)
    for k, v in agg.items():
        chk(k, J.get(k), v)
    chk("expected_A000055", J.get("expected_A000055"), fi.count_trees(n))
    chk("count_matches_A000055", J.get("count_matches_A000055"), True)
    chk("tree_count == A000055", J.get("tree_count"), fi.count_trees(n))
    chk("alpha_histogram", {int(k): v for k, v in J.get("alpha_histogram", {}).items()}, alpha_hist)

    for key in ("wr_prefix_min", "iso_prefix_min", "wr_all_min", "iso_all_min"):
        c = J.get(key)
        if best[key] is None:
            chk(key, c, None)
            continue
        val, rec = best[key]
        if c is None:
            mismatches.append(f"n={n} {key}: C=null Python={val}")
            continue
        chk(key + ".value", c.get("value"), val)
        chk(key + ".r", c.get("r"), rec["r"])
        chk(key + ".level_sequence", c.get("level_sequence"), rec["level_sequence"])
        chk(key + ".poly", c.get("poly"), rec["poly"])

    c = J.get("iso_prefix_ratio_min")
    if best["iso_prefix_ratio_min"] is None:
        chk("iso_prefix_ratio_min", c, None)
    elif c is None:
        mismatches.append(f"n={n} iso_prefix_ratio_min: C=null Python={best['iso_prefix_ratio_min'][0]}")
    else:
        val, rec = best["iso_prefix_ratio_min"]
        chk("iso_prefix_ratio_min.ratio", parse_ratio(c["ratio"]), val)
        chk("iso_prefix_ratio_min.ratio_lowest_terms", c["ratio"], f"{val.numerator}/{val.denominator}")
        chk("iso_prefix_ratio_min.decimal", c.get("ratio_decimal_approx"), decimal_truncated(val, DECIMAL_DIGITS))
        chk("iso_prefix_ratio_min.r", c.get("r"), rec["r"])
        chk("iso_prefix_ratio_min.level_sequence", c.get("level_sequence"), rec["level_sequence"])
        chk("iso_prefix_ratio_min.poly", c.get("poly"), rec["poly"])

    ctop = J.get("tightest_ratio_trees", [])
    chk("tightest_ratio_trees.len", len(ctop), len(top))
    for i, (val, _idx, rec) in enumerate(top[:len(ctop)]):
        e = ctop[i]
        chk(f"tightest[{i}].ratio", parse_ratio(e["ratio"]), val)
        chk(f"tightest[{i}].decimal", e.get("ratio_decimal_approx"), decimal_truncated(val, DECIMAL_DIGITS))
        chk(f"tightest[{i}].r", e.get("r"), rec["r"])
        chk(f"tightest[{i}].level_sequence", e.get("level_sequence"), rec["level_sequence"])
        chk(f"tightest[{i}].poly", e.get("poly"), rec["poly"])

    cnl = J.get("non_log_concave_trees", [])
    chk("non_log_concave_trees.len", len(cnl), len(nonlc))
    for i, rec in enumerate(nonlc[:len(cnl)]):
        e = cnl[i]
        for k in ("level_sequence", "poly", "lc_fail_indices", "unimodal"):
            chk(f"non_log_concave[{i}].{k}", e.get(k), rec[k])


def compare_dump(n, binary, trees, mismatches):
    out = subprocess.run([binary, "--dump", str(n)], capture_output=True, text=True, check=True).stdout
    ctrees = []
    for line in out.splitlines():
        a, b = line.split("|")
        ctrees.append(([int(x) for x in a.split()], [int(x) for x in b.split()]))
    if len(ctrees) != len(trees):
        mismatches.append(f"n={n} dump: C lists {len(ctrees)} trees, Python {len(trees)}")
        return False
    for i, (ct, pt) in enumerate(zip(ctrees, trees)):
        if ct[0] != pt[0]:
            mismatches.append(f"n={n} dump tree #{i}: level sequence C={ct[0]} Python={pt[0]}")
            return False
        if ct[1] != pt[1]:
            mismatches.append(f"n={n} dump tree #{i} {pt[0]}: poly C={ct[1]} Python={pt[1]}")
            return False
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--results", default=os.path.join(HERE, "results"))
    ap.add_argument("--bin", default=None, help="compiled census_trees binary (default: compile to /tmp)")
    ap.add_argument("--nmax", type=int, default=14)
    ap.add_argument("--out", default="/tmp/erdos993_census/crosscheck.json")
    args = ap.parse_args()

    binary = args.bin
    if binary is None:
        os.makedirs("/tmp/erdos993_census", exist_ok=True)
        binary = "/tmp/erdos993_census/census_trees_check"
        subprocess.run(["gcc", "-O2", "-std=gnu11", "-o", binary,
                        os.path.join(HERE, "census_trees.c")], check=True)

    verdict = {"nmax": args.nmax, "binary": binary, "results_dir": args.results, "orders": {}}
    all_ok = True
    for n in range(1, args.nmax + 1):
        mism = []
        py = python_order(n)
        path = os.path.join(args.results, f"census_trees_n{n}.json")
        json_ok = False
        if os.path.exists(path):
            with open(path) as fh:
                J = json.load(fh)
            compare_order(n, J, py, mism)
            json_ok = not mism
        else:
            mism.append(f"n={n}: missing {path}")
        before = len(mism)
        dump_ok = compare_dump(n, binary, py[0], mism) and len(mism) == before
        ok = json_ok and dump_ok
        all_ok &= ok
        rmin = py[3]["iso_prefix_ratio_min"]
        rstr = f"{rmin[0].numerator}/{rmin[0].denominator}" if rmin else "n/a"
        print(f"n={n:2d} trees={py[1]['tree_count']:5d} json={'ok' if json_ok else 'FAIL'} "
              f"dump={'ok' if dump_ok else 'FAIL'} min_iso_prefix_ratio={rstr}")
        for m in mism:
            print("   MISMATCH", m)
        verdict["orders"][str(n)] = {"tree_count": py[1]["tree_count"], "json_match": json_ok,
                                     "dump_match": dump_ok, "mismatches": mism}
    verdict["verdict"] = "PASS" if all_ok else "FAIL"
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w") as fh:
        json.dump(verdict, fh, indent=1)
    print(f"CROSSCHECK {verdict['verdict']} (n <= {args.nmax}; verdict written to {args.out})")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
