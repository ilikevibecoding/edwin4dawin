#!/usr/bin/env python3
"""Exact WR / ISO / TAIL / unimodality analysis of every published family of
trees with NON-log-concave independence polynomials (Kadrawi-Levit-Yosef-
Mizrachi 2023; Kadrawi-Levit), plus their generalisations ``bush(counts)``.

Why this matters for the WR+ISO+TAIL framework: on the increasing part of the
sequence (p_{r+1} > p_{r-1}) the inequality ISO_r is STRICTLY STRONGER than
log-concavity at r, so a log-concavity failure inside the prefix r <= L-1
would refute ISO.  The report records where the failures actually sit.

Usage: python scripts/verify_lc_families.py --out reports/lc_families.json
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from erdos993lib.checks import analyze  # noqa: E402
from erdos993lib.families import T3mn, T3mn_star, bush  # noqa: E402
from erdos993lib.indpoly import indpoly_forest  # noqa: E402
from erdos993lib.report import provenance, write_report  # noqa: E402


def entry(name: str, graph, note: str = "") -> dict:
    n, edges = graph
    p = indpoly_forest(n, edges)
    a = analyze(p)
    a.update({"name": name, "n": n, "poly": p, "note": note})
    return a


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="reports/lc_families.json")
    ap.add_argument("--kmax", type=int, default=12)
    args = ap.parse_args()

    entries = []
    entries.append(entry("T_{3,4,4}", T3mn(4, 4), "order 26, KLYM 2023: not log-concave"))
    entries.append(entry("T*_{3,3,4}", T3mn_star(3, 4), "order 26, KLYM 2023: not log-concave"))
    for k in range(3, args.kmax + 1):
        entries.append(entry(f"T_{{3,{k+1},{k+1}}}", T3mn(k + 1, k + 1), "KLYM Thm: non-LC for k>=3"))
        entries.append(entry(f"T*_{{3,{k},{k+1}}}", T3mn_star(k, k + 1), "KLYM Thm: non-LC for k>=3"))
    for k in range(4, args.kmax + 1):
        entries.append(entry(f"T_{{3,{k},{k+1}}}", T3mn(k, k + 1), "Kadrawi-Levit: non-LC for k>=4"))
        entries.append(entry(f"T_{{3,{k},{k+2}}}", T3mn(k, k + 2), "Kadrawi-Levit: non-LC for k>=4"))
        entries.append(entry(f"T*_{{3,{k-1},{k+1}}}", T3mn_star(k - 1, k + 1), "Kadrawi-Levit: non-LC for k>=4"))
        entries.append(entry(f"T*_{{3,{k},{k+3}}}", T3mn_star(k, k + 3), "Kadrawi-Levit: non-LC for k>=4"))
        entries.append(entry(f"T*_{{3,{k},{k}}}", T3mn_star(k, k), "Kadrawi-Levit: non-LC for k>=4"))
    # generalised bushes: all counts lists of length 2..4 with entries 1..8 (order <= ~70)
    bush_entries = []
    from itertools import combinations_with_replacement

    for length in (2, 3, 4):
        for counts in combinations_with_replacement(range(1, 9), length):
            for pl in (1, 2):
                g = bush(list(counts), pl)
                p = indpoly_forest(*g)
                a = analyze(p)
                if a["lc_failures"] or a["iso_failures_prefix"] or a["wr_failures_prefix"] or a["tail_failures"] or not a["unimodal"]:
                    a.update({"name": f"bush{list(counts)}_pl{pl}", "n": g[0], "poly": p})
                    bush_entries.append(a)

    non_lc = [e for e in entries if e["lc_failures"]]
    summary = {
        "published_family_members_checked": len(entries),
        "published_members_not_log_concave": len(non_lc),
        "published_members_with_lc_failure_only_at_alpha_minus_1": sum(
            1 for e in non_lc if e["lc_failures"] == [e["alpha"] - 1]
        ),
        "published_members_iso_prefix_failures": sum(1 for e in entries if e["iso_failures_prefix"]),
        "published_members_iso_any_index_failures": sum(1 for e in entries if e["iso_failures_all_indices"]),
        "published_members_wr_prefix_failures": sum(1 for e in entries if e["wr_failures_prefix"]),
        "published_members_tail_failures": sum(1 for e in entries if e["tail_failures"]),
        "published_members_non_unimodal": sum(1 for e in entries if not e["unimodal"]),
        "min_iso_margin_prefix_over_published": min(
            (e["min_iso_margin_prefix"] for e in entries if e["min_iso_margin_prefix"] is not None),
            key=lambda s: eval(s) if "/" in s else float(s),
        ),
        "bush_generalisation": {
            "scope": "bush(counts, pendant_len) for counts in multisets of size 2..4 from 1..8, pendant_len in {1,2}",
            "members_with_any_lc_failure": sum(1 for e in bush_entries if e["lc_failures"]),
            "members_with_iso_prefix_failure": sum(1 for e in bush_entries if e["iso_failures_prefix"]),
            "members_with_wr_prefix_failure": sum(1 for e in bush_entries if e["wr_failures_prefix"]),
            "members_with_tail_failure": sum(1 for e in bush_entries if e["tail_failures"]),
            "members_non_unimodal": sum(1 for e in bush_entries if not e["unimodal"]),
            "lc_failure_indices_relative_to_alpha": sorted(
                {tuple(k - e["alpha"] for k in e["lc_failures"]) for e in bush_entries if e["lc_failures"]}
            ),
        },
    }
    payload = {
        "title": "WR/ISO/TAIL analysis of the published non-log-concave tree families",
        "summary": summary,
        "published_families": entries,
        "bush_generalisation_flagged_members": bush_entries,
        "provenance": provenance(os.path.abspath(__file__)),
    }
    digest = write_report(args.out, payload)
    print("summary:", {k: v for k, v in summary.items() if k != "bush_generalisation"})
    print("bush:", summary["bush_generalisation"])
    print("report:", args.out, "SHA256", digest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
