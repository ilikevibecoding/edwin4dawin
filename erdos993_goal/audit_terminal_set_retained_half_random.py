#!/usr/bin/env python3
"""Stress retained-half PISO after adjoining terminal isolates."""

from __future__ import annotations

import argparse
import json
import random
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

from audit_terminal_set_retained_half_two_level import (
    evaluate_adjacency,
)
from patternboost_corpus_audit import adjacency_from_prufer


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--order", type=int, default=40)
    parser.add_argument("--trees", type=int, default=12)
    parser.add_argument("--roots", type=int, default=2)
    parser.add_argument(
        "--siblings",
        default="0,1,3,7",
        help="comma-separated terminal-isolate counts",
    )
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--min-rank", type=int, default=6)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    sibling_values = [
        int(value) for value in args.siblings.split(",")
    ]
    results = []
    checks = 0
    failures = defaultdict(int)
    minima = {}
    for tree_index in range(args.trees):
        prufer = [
            rng.randrange(1, args.order + 1)
            for _ in range(args.order - 2)
        ]
        adjacency = adjacency_from_prufer(prufer)
        roots = sorted(
            range(args.order),
            key=lambda vertex: len(adjacency[vertex]),
            reverse=True,
        )[: args.roots]
        for root in roots:
            for siblings in sibling_values:
                result = evaluate_adjacency(
                    adjacency,
                    root,
                    siblings,
                    args.min_rank,
                    {
                        "tree_index": tree_index,
                        "root": root,
                        "root_degree": len(adjacency[root]),
                        "prufer_code_one_based": prufer,
                    },
                )
                results.append(result)
                checks += result["checks"]
                for name, count in result["failures"].items():
                    failures[name] += count
                for name, item in result["minima"].items():
                    if (
                        name not in minima
                        or Fraction(item["exact"])
                        < Fraction(minima[name]["exact"])
                    ):
                        minima[name] = item
        print(
            f"trees={tree_index + 1}/{args.trees} "
            f"checks={checks:,} failures={dict(failures)}",
            flush=True,
        )

    report = {
        "status": (
            "FAIL_RETAINED_HALF"
            if failures.get("retained_half_total", 0)
            else "PASS_NOT_PROOF"
        ),
        "parameters": vars(args) | {"out": str(args.out)},
        "cases": len(results),
        "checks": checks,
        "failures": dict(failures),
        "minima": minima,
        "results": results,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "cases": report["cases"],
                "checks": checks,
                "failures": dict(failures),
                "minimum_floats": {
                    name: item["float"]
                    for name, item in minima.items()
                },
                "report": str(args.out),
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if report["status"] == "FAIL_RETAINED_HALF" else 0


if __name__ == "__main__":
    raise SystemExit(main())
