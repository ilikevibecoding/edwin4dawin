#!/usr/bin/env python3
"""Pad every degree-two vertex of known non-LC trees and retest exactly.

A tree is homeomorphically irreducible (HIT) iff it has no degree-two
vertices.  For each input tree, attach at least one new leaf to every
degree-two vertex.  This preserves the old tree as an induced subtree and
gives a particularly sharp test of the candidate claim that every HIT has a
log-concave independence polynomial.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path
from typing import Any

PUBLIC = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(PUBLIC))

from graph6 import parse_graph6  # noqa: E402
from indpoly import (  # noqa: E402
    independence_poly,
    is_log_concave,
    is_unimodal,
    log_concavity_ratio,
)
from scripts.analyze_prufer_corpus import (  # noqa: E402
    make_bautista_ramos_tree,
    make_galvin_tree,
    make_li_tree,
)


def add_edge(adj: list[list[int]], u: int, v: int) -> None:
    adj[u].append(v)
    adj[v].append(u)


def pad_degree_two(adj: list[list[int]], counts: dict[int, int]) -> list[list[int]]:
    out = [list(nbrs) for nbrs in adj]
    original_n = len(out)
    for v in range(original_n):
        if len(adj[v]) != 2:
            continue
        count = counts[v]
        if count < 1:
            raise ValueError("each original degree-two vertex needs a leaf")
        for _ in range(count):
            leaf = len(out)
            out.append([v])
            out[v].append(leaf)
    if any(len(nbrs) == 2 for nbrs in out):
        raise AssertionError("padding did not produce a HIT")
    return out


def defects(poly: list[int]) -> list[dict[str, int]]:
    return [
        {
            "k": k,
            "left_product": poly[k - 1] * poly[k + 1],
            "square": poly[k] * poly[k],
            "deficit": poly[k - 1] * poly[k + 1] - poly[k] * poly[k],
        }
        for k in range(1, len(poly) - 1)
        if poly[k] * poly[k] < poly[k - 1] * poly[k + 1]
    ]


def row(label: str, original: list[list[int]], padded: list[list[int]], scheme: str) -> dict[str, Any]:
    poly = independence_poly(len(padded), padded)
    ratio, pos = log_concavity_ratio(poly)
    return {
        "label": label,
        "scheme": scheme,
        "original_n": len(original),
        "original_degree_two": sum(len(nbrs) == 2 for nbrs in original),
        "n": len(padded),
        "alpha": len(poly) - 1,
        "degree_counts": {
            str(d): sum(len(nbrs) == d for nbrs in padded)
            for d in sorted({len(nbrs) for nbrs in padded})
        },
        "is_hit": all(len(nbrs) != 2 for nbrs in padded),
        "unimodal": is_unimodal(poly),
        "log_concave": is_log_concave(poly),
        "lc_ratio": ratio,
        "lc_pos": pos,
        "lc_defects": defects(poly),
        "poly": poly,
    }


def known_graphs() -> list[tuple[str, list[list[int]]]]:
    out: list[tuple[str, list[list[int]]]] = []
    n26 = json.loads((PUBLIC / "results" / "analysis_n26.json").read_text())
    for rank, item in enumerate(n26["lc_failures"], start=1):
        _, adj = parse_graph6(item["graph6"].encode("ascii"))
        out.append((f"exhaustive_n26_lc_failure_{rank}", adj))

    n28 = json.loads((PUBLIC / "results" / "analysis_n28_modal_lc_nm.json").read_text())
    seen: set[str] = set()
    n28_items = n28.get("all_lc_failures") or n28.get("top_lc_failures") or []
    for rank, item in enumerate(n28_items, start=1):
        g6 = item["graph6"]
        if g6 in seen:
            continue
        seen.add(g6)
        _, adj = parse_graph6(g6.encode("ascii"))
        out.append((f"exhaustive_n28_lc_failure_{rank}", adj))
    return out


def structured_graphs(max_parameter: int) -> list[tuple[str, list[list[int]]]]:
    out: list[tuple[str, list[list[int]]]] = []
    for m in range(1, max_parameter + 1):
        for t in range(1, max_parameter + 1):
            adj = make_galvin_tree(m, t)
            if not is_log_concave(independence_poly(len(adj), adj)):
                out.append((f"galvin_m{m}_t{t}", adj))
    # These ranges are deliberately smaller because the orders grow faster.
    bound = min(10, max_parameter)
    for m in range(1, bound + 1):
        for t in range(1, bound + 1):
            adj = make_bautista_ramos_tree(m, t)
            if not is_log_concave(independence_poly(len(adj), adj)):
                out.append((f"bautista_ramos_m{m}_t{t}", adj))
    for m in range(1, bound + 1):
        for n in range(1, bound + 1):
            for starred in (False, True):
                adj = make_li_tree(m, n, starred=starred)
                if not is_log_concave(independence_poly(len(adj), adj)):
                    tag = "star" if starred else "plain"
                    out.append((f"li_{tag}_m{m}_n{n}", adj))
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-parameter", type=int, default=20)
    parser.add_argument("--uniform-max", type=int, default=5)
    parser.add_argument("--random-patterns", type=int, default=100)
    parser.add_argument("--random-max", type=int, default=5)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("known_lc_failures_hit_padding_20260726.json"),
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)

    sources = known_graphs() + structured_graphs(args.max_parameter)
    rows: list[dict[str, Any]] = []
    for label, adj in sources:
        degree_two = [v for v, nbrs in enumerate(adj) if len(nbrs) == 2]
        if not degree_two:
            # This would already refute the candidate HIT theorem.
            rows.append(row(label, adj, adj, "already_hit"))
            continue
        for q in range(1, args.uniform_max + 1):
            counts = {v: q for v in degree_two}
            rows.append(row(label, adj, pad_degree_two(adj, counts), f"uniform_{q}"))
        for trial in range(args.random_patterns):
            counts = {v: rng.randint(1, args.random_max) for v in degree_two}
            rows.append(
                row(
                    label,
                    adj,
                    pad_degree_two(adj, counts),
                    f"random_{trial + 1}",
                )
            )
            if not rows[-1]["log_concave"]:
                break

    failures = [item for item in rows if not item["log_concave"]]
    summary = {
        "claim_tested": (
            "Attaching at least one leaf to every degree-two vertex of each "
            "known non-log-concave source tree produces a log-concave HIT."
        ),
        "seed": args.seed,
        "source_count": len(sources),
        "exact_padded_tree_count": len(rows),
        "non_log_concave_hit_count": len(failures),
        "non_unimodal_hit_count": sum(not item["unimodal"] for item in rows),
        "best_lc_ratio": max((item["lc_ratio"] for item in rows), default=None),
        "best_row": max(rows, key=lambda item: item["lc_ratio"]) if rows else None,
        "failures": failures,
        "rows": rows,
    }
    args.out.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "source_count": summary["source_count"],
                "exact_padded_tree_count": summary["exact_padded_tree_count"],
                "non_log_concave_hit_count": summary["non_log_concave_hit_count"],
                "non_unimodal_hit_count": summary["non_unimodal_hit_count"],
                "best_lc_ratio": summary["best_lc_ratio"],
                "best_label": summary["best_row"]["label"] if rows else None,
                "best_scheme": summary["best_row"]["scheme"] if rows else None,
                "best_n": summary["best_row"]["n"] if rows else None,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
