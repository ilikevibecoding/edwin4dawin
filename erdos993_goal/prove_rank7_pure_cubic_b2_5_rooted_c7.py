#!/usr/bin/env python3
"""Exact Bernstein verifier for rooted C7 on pure-cubic B2=5 trees.

It reuses the already proved no-gap pure-cubic coefficient cone.  Rooted C7
is affine and decreasing in b=i5(A-N[root]), so only the active upper
endpoints of that cone are required.
"""

from __future__ import annotations

import argparse
import json
from math import comb
from pathlib import Path
import time

import prove_rank7_pure_cubic_b2_5_joint_bernstein as cone


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def install_cross_objective() -> None:
    c, h = cone.c, cone.h
    cross = c[5] * (c[6] ** 2 - c[5] * c[7]) - 2 * c[6] * (
        c[6] * h[5] - c[5] * h[6]
    )
    cone.RAW = (cross,)
    cone.base_cell.cache_clear()
    cone.cell.cache_clear()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n-first", type=int, default=23)
    parser.add_argument("--n-last", type=int, default=38)
    parser.add_argument("--k-first", type=int, default=-7)
    parser.add_argument("--k-last", type=int, default=4)
    parser.add_argument("--depth", type=int, default=48)
    parser.add_argument("--output", required=True)
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()
    install_cross_objective()
    output = Path(args.output)
    started = time.time()
    if args.resume and output.exists():
        report = json.loads(output.read_text(encoding="utf-8"))
        completed = {(x["n"], x["k"]) for x in report["completed_blocks"]}
        assert report["parameters"] == {k: v for k, v in vars(args).items() if k not in {"resume", "output"}}
        assert report["failure"] is None
        report["status"] = "RUNNING"
    else:
        completed = set()
        report = {
            "status": "RUNNING",
            "parameters": {k: v for k, v in vars(args).items() if k not in {"resume", "output"}},
            "profiles": 0,
            "upper_endpoint_branches": 0,
            "nodes": 0,
            "completed_blocks": [],
            "failure": None,
        }
    for n in range(args.n_first, args.n_last + 1):
        for k in range(args.k_first, args.k_last + 1):
            if (n, k) in completed:
                continue
            p, q = max(k, 0), max(-k, 0)
            for r in (1, 2, 3):
                m = n - r - 1
                for t in range(1, 2 * r + 1):
                    xs = cone.balanced_values(t, r)
                    assert comb(r - 1, 2) + sum(comb(x, 2) for x in xs) <= 5
                    edge_e = m - t
                    _, _, _, number_upper = cone.cell(n, p, q, r, 0, "lower", 0, edge_e)
                    report["profiles"] += 1
                    for index in range(number_upper):
                        objective, constraints, _, _ = cone.cell(n, p, q, r, 0, "upper", index, edge_e)
                        result = cone.certify(objective, constraints, args.depth)
                        report["upper_endpoint_branches"] += 1
                        report["nodes"] += result["nodes"]
                        if result["status"] != "PASS":
                            report["status"] = "UNRESOLVED"
                            report["failure"] = {
                                "n": n, "k": k, "p": p, "q": q, "r": r,
                                "t": t, "edge_e": edge_e, "upper_index": index,
                                "result": result,
                            }
                            report["elapsed_seconds"] = time.time() - started
                            atomic_json(output, report)
                            print(json.dumps(report, indent=2), flush=True)
                            return 1
            report["completed_blocks"].append({"n": n, "k": k})
            report["elapsed_seconds"] = time.time() - started
            atomic_json(output, report)
            print(f"PASS_BLOCK n={n} k={k}", flush=True)
    report["status"] = "PASS_EXACT_RANK7_ROOTED_C7_PURE_CUBIC_B2_5"
    report["elapsed_seconds"] = time.time() - started
    atomic_json(output, report)
    print(json.dumps(report, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
