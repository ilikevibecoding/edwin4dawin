#!/usr/bin/env python3
"""Exact-product beam search for multi-component T3-family forests.

Beam selection uses a floating log-curvature score only to choose which exact
products to extend.  Every polynomial multiplication, unimodality test, and
reported candidate is integer-exact.  No-hit output is heuristic evidence.
"""

from __future__ import annotations

import argparse
import hashlib
import heapq
import json
import math
import os
from pathlib import Path

from search_t3_family_forest_product_counterexample_root import (
    convolve,
    family_polynomial,
    first_unimodality_failure,
    log_concavity_failures,
)


HERE = Path(__file__).resolve().parent
DEFAULT_OUTPUT = HERE / "t3_family_multicomponent_beam_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def curvature_score(row: list[int]) -> tuple[float, dict]:
    best_score = -math.inf
    best = None
    for index in range(1, len(row) - 1):
        if row[index - 1] == 0 or row[index] == 0 or row[index + 1] == 0:
            continue
        score = (
            math.log(row[index - 1]) + math.log(row[index + 1])
            - 2 * math.log(row[index])
        )
        if score > best_score:
            best_score = score
            best = {
                "index": index,
                "neighbor_product": row[index - 1] * row[index + 1],
                "center_square": row[index] ** 2,
            }
    assert best is not None
    return best_score, best


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--maximum-parameter", type=int, default=35)
    parser.add_argument("--maximum-components", type=int, default=8)
    parser.add_argument("--beam-size", type=int, default=500)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    assert args.maximum_parameter >= 4
    assert args.maximum_components >= 2
    assert args.beam_size >= 1

    seeds = []
    for starred in (False, True):
        for m in range(1, args.maximum_parameter + 1):
            for n in range(m, args.maximum_parameter + 1):
                order, polynomial = family_polynomial(starred, m, n)
                failures = log_concavity_failures(polynomial)
                if failures:
                    score, worst = curvature_score(polynomial)
                    seeds.append({
                        "family": "Tstar_3_m_n" if starred else "T_3_m_n",
                        "m": m,
                        "n": n,
                        "order": order,
                        "polynomial": polynomial,
                        "score": score,
                        "worst_curvature": worst,
                    })
    seeds.sort(key=lambda row: row["score"], reverse=True)
    print("SEEDS", len(seeds), "BEST_SCORE", seeds[0]["score"], flush=True)

    beam = [
        {
            "factors": (index,),
            "order": seed["order"],
            "polynomial": seed["polynomial"],
            "score": seed["score"],
            "worst_curvature": seed["worst_curvature"],
        }
        for index, seed in enumerate(seeds[:args.beam_size])
    ]
    levels = [{
        "components": 1,
        "generated": len(seeds),
        "retained": len(beam),
        "best_score": beam[0]["score"],
        "best_worst_curvature": beam[0]["worst_curvature"],
    }]
    hit = None
    serial = 0
    for depth in range(2, args.maximum_components + 1):
        heap: list[tuple[float, int, dict]] = []
        generated = 0
        for parent_index, parent in enumerate(beam):
            minimum_seed = parent["factors"][-1]
            for seed_index in range(minimum_seed, len(seeds)):
                seed = seeds[seed_index]
                polynomial = convolve(parent["polynomial"], seed["polynomial"])
                generated += 1
                failure = first_unimodality_failure(polynomial)
                factors = (*parent["factors"], seed_index)
                if failure:
                    hit = {
                        "factor_indices": list(factors),
                        "factors": [
                            {
                                key: seeds[index][key]
                                for key in ("family", "m", "n", "order", "polynomial")
                            }
                            for index in factors
                        ],
                        "forest_order": parent["order"] + seed["order"],
                        "product_polynomial": polynomial,
                        "unimodality_failure": failure,
                    }
                    print("CANDIDATE_AT_DEPTH", depth, factors, failure, flush=True)
                    break
                score, worst = curvature_score(polynomial)
                candidate = {
                    "factors": factors,
                    "order": parent["order"] + seed["order"],
                    "polynomial": polynomial,
                    "score": score,
                    "worst_curvature": worst,
                }
                serial += 1
                item = (score, serial, candidate)
                if len(heap) < args.beam_size:
                    heapq.heappush(heap, item)
                elif score > heap[0][0]:
                    heapq.heapreplace(heap, item)
            if hit:
                break
            if parent_index and parent_index % 100 == 0:
                print("DEPTH", depth, "PARENTS", parent_index, "GENERATED", generated, flush=True)
        if hit:
            levels.append({
                "components": depth,
                "generated_before_hit": generated,
                "candidate_found": True,
            })
            break
        beam = [item[2] for item in sorted(heap, reverse=True)]
        levels.append({
            "components": depth,
            "generated": generated,
            "retained": len(beam),
            "best_score": beam[0]["score"],
            "best_worst_curvature": beam[0]["worst_curvature"],
            "best_factor_indices": list(beam[0]["factors"]),
        })
        print(
            "DEPTH_COMPLETE", depth, "GENERATED", generated,
            "BEST_SCORE", beam[0]["score"], flush=True,
        )

    payload = {
        "schema": "t3-family-multicomponent-beam-root-v1",
        "status": (
            "FINITE_EXACT_FOREST_COUNTEREXAMPLE_CANDIDATE_FOUND_REQUIRES_INDEPENDENT_AUDIT"
            if hit else
            "NO_NONUNIMODAL_PRODUCT_IN_EXACT_BEAM_SEARCH_HEURISTIC_EVIDENCE_ONLY"
        ),
        "parameters": {
            "maximum_family_parameter": args.maximum_parameter,
            "maximum_components": args.maximum_components,
            "beam_size": args.beam_size,
        },
        "non_log_concave_seed_count": len(seeds),
        "selection_rule": (
            "largest floating log of a_(i-1)a_(i+1)/a_i^2; selection only"
        ),
        "all_products_and_unimodality_tests_exact_integer": True,
        "levels": levels,
        "hit": hit,
        "scope_warning": (
            "Beam pruning makes no-hit output heuristic evidence only.  A hit is "
            "an exact candidate requiring independent literal-tree replay."
        ),
        "dependency": {
            "path": "search_t3_family_forest_product_counterexample_root.py",
            "sha256": sha256(
                HERE / "search_t3_family_forest_product_counterexample_root.py"
            ),
        },
        "script_sha256": sha256(Path(__file__)),
    }
    output = args.output.resolve()
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"], flush=True)
    print("REPORT", sha256(output), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
