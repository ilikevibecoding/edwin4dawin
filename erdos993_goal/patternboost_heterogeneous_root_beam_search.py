#!/usr/bin/env python3
"""Beam search heterogeneous rooted PatternBoost branch products.

For rooted trees (T_i,r_i), every central-root tree has polynomial

  P(x)=product I(T_i;x) + x product I(T_i-r_i;x).

The previous phase search used many identical copies of one rooted tree.
This search mixes different adversarial rooted states, allowing the relative
mass, mean, and variance of the two phases to be tuned independently.  Float
probability arrays rank a beam; every reported finalist is rebuilt with exact
fmpz polynomials and checked for an actual descent followed by a rise.
"""

from __future__ import annotations

import argparse
import heapq
import json
import math
import time
from pathlib import Path

import numpy as np
from flint import fmpz_poly as Poly

from bouquet_ratio_evolution import ratio_score as exact_ratio_score
from pattern_family_valley_search import profile
from patternboost_corpus_audit import adjacency_from_prufer
from patternboost_root_phase_search import rebound_score
from rooted_product_amplification_search import rooted_pair


def probability(coefficients: list[int]) -> tuple[np.ndarray, float, float, float]:
    values = np.asarray(coefficients, dtype=np.float64)
    total = float(values.sum())
    values /= total
    indices = np.arange(len(values), dtype=np.float64)
    mean = float(np.dot(indices, values))
    variance = float(np.dot((indices - mean) ** 2, values))
    return values, math.log(total), mean, variance


def probability_convolution(left: np.ndarray, right: np.ndarray) -> np.ndarray:
    out = np.convolve(left, right)
    total = float(out.sum())
    if total:
        out /= total
    return out


def phase_values(a: np.ndarray, e: np.ndarray, log_ratio: float) -> np.ndarray:
    size = max(len(a), len(e) + 1)
    out = np.zeros(size, dtype=np.float64)
    out[: len(a)] += a
    if log_ratio > -740:
        out[1 : len(e) + 1] += math.exp(log_ratio) * e
    return out


def floating_rank(
    a: np.ndarray,
    e: np.ndarray,
    log_ratio: float,
) -> tuple[tuple[float, ...], dict]:
    values = phase_values(a, e, log_ratio)
    score, rebound = rebound_score(values)
    log_peak_ratio = (
        log_ratio + math.log(float(e.max())) - math.log(float(a.max()))
    )
    indices_a = np.arange(len(a), dtype=np.float64)
    indices_e = np.arange(len(e), dtype=np.float64)
    mean_a = float(np.dot(indices_a, a))
    mean_e = 1.0 + float(np.dot(indices_e, e))
    var_a = float(np.dot((indices_a - mean_a) ** 2, a))
    raw_mean_e = mean_e - 1.0
    var_e = float(np.dot((indices_e - raw_mean_e) ** 2, e))
    standardized_separation = abs(mean_a - mean_e) / math.sqrt(
        max(1e-300, var_a + var_e)
    )
    rank = score + (
        -abs(log_peak_ratio),
        -abs(standardized_separation - 1.5),
    )
    rebound = dict(rebound)
    rebound["alpha"] = len(values) - 1
    rebound["log_peak_ratio"] = log_peak_ratio
    rebound["standardized_phase_separation"] = standardized_separation
    return rank, rebound


def cross_depth_rank(rank: tuple[float, ...], rebound: dict) -> tuple[float, ...]:
    """Compare different degrees without favoring small raw boundary gaps."""
    alpha = max(1, int(rebound["alpha"]))
    return (
        rank[0],
        rank[1],
        rank[2],
        -float(rebound["boundary_gap"]) / alpha,
        rank[4],
        rank[5],
        rank[-2],
        rank[-1],
    )


def exact_replay(types: tuple[int, ...], branches: list[dict]) -> dict:
    a = Poly([1])
    e = Poly([1])
    order = 1
    description = []
    for index in types:
        branch = branches[index]
        a *= Poly(branch["A"])
        e *= Poly(branch["E"])
        order += branch["order"]
        description.append({
            "type_index": index,
            "corpus_first_line": branch["first_line"],
            "root_zero_based": branch["root"],
            "branch_order": branch["order"],
        })
    polynomial = a + Poly([0, 1]) * e
    coefficients = [int(value) for value in polynomial]
    exact_rank, rebound = exact_ratio_score(coefficients)
    shape = profile(polynomial)
    return {
        "tree_order": order,
        "tree_degree": len(polynomial) - 1,
        "branch_count": len(types),
        "types": list(types),
        "branches": description,
        "score": exact_rank,
        "rebound": rebound,
        "profile": shape,
        "polynomial": coefficients if not shape["unimodal"] else None,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path("patternboost60_polynomial_corpus_20260726.json"),
    )
    parser.add_argument("--records", type=int, default=120)
    parser.add_argument("--branch-types", type=int, default=60)
    parser.add_argument("--beam-width", type=int, default=300)
    parser.add_argument("--max-depth", type=int, default=36)
    parser.add_argument("--replay", type=int, default=30)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    started = time.time()

    source = json.loads(args.corpus.read_text(encoding="utf-8"))
    records = source["records"][: args.records]
    candidates = []
    for record_index, record in enumerate(records):
        adjacency = adjacency_from_prufer(record["prufer_code_one_based"])
        a_prob, a_log_total, a_mean, a_variance = probability(record["polynomial"])
        for root in range(len(adjacency)):
            e_poly, j_poly = rooted_pair(adjacency, root)
            if list(e_poly + Poly([0, 1]) * j_poly) != record["polynomial"]:
                raise AssertionError("rooted decomposition mismatch")
            e_coefficients = [int(value) for value in e_poly]
            e_prob, e_log_total, e_mean, e_variance = probability(e_coefficients)
            loss = a_log_total - e_log_total
            metric = (a_mean - e_mean) / loss if loss > 0 else -math.inf
            candidates.append({
                "record_index": record_index,
                "first_line": record["first_line"],
                "root": root,
                "order": record["order"],
                "A": record["polynomial"],
                "E": e_coefficients,
                "a_prob": a_prob,
                "e_prob": e_prob,
                "log_ratio": e_log_total - a_log_total,
                "metric": metric,
                "variance_contrast": a_variance - e_variance,
            })
        if (record_index + 1) % 20 == 0:
            print(f"measured records={record_index + 1} roots={len(candidates):,}", flush=True)

    candidates.sort(
        key=lambda item: (item["metric"], abs(item["variance_contrast"])),
        reverse=True,
    )
    branches = candidates[: min(args.branch_types, len(candidates))]

    beam = []
    archive = []
    per_depth_archive = []
    serial = 0
    for index, branch in enumerate(branches):
        rank, rebound = floating_rank(
            branch["a_prob"], branch["e_prob"], branch["log_ratio"]
        )
        state = {
            "types": (index,),
            "a": branch["a_prob"],
            "e": branch["e_prob"],
            "log_ratio": branch["log_ratio"],
            "order": 1 + branch["order"],
            "rank": rank,
            "rebound": rebound,
        }
        beam.append(state)
        archive.append((
            cross_depth_rank(rank, rebound),
            serial,
            state["types"],
            state["order"],
            rebound,
            rank,
        ))
        serial += 1

    best_initial = max(beam, key=lambda state: cross_depth_rank(state["rank"], state["rebound"]))
    per_depth_archive.append((
        cross_depth_rank(best_initial["rank"], best_initial["rebound"]),
        serial,
        best_initial["types"],
        best_initial["order"],
        best_initial["rebound"],
        best_initial["rank"],
    ))
    serial += 1

    expansion_count = 0
    for depth in range(2, args.max_depth + 1):
        heap = []
        for state in beam:
            for index in range(state["types"][-1], len(branches)):
                branch = branches[index]
                a = probability_convolution(state["a"], branch["a_prob"])
                e = probability_convolution(state["e"], branch["e_prob"])
                log_ratio = state["log_ratio"] + branch["log_ratio"]
                rank, rebound = floating_rank(a, e, log_ratio)
                new_state = {
                    "types": state["types"] + (index,),
                    "a": a,
                    "e": e,
                    "log_ratio": log_ratio,
                    "order": state["order"] + branch["order"],
                    "rank": rank,
                    "rebound": rebound,
                }
                item = (rank, serial, new_state)
                serial += 1
                expansion_count += 1
                if len(heap) < args.beam_width:
                    heapq.heappush(heap, item)
                elif rank > heap[0][0]:
                    heapq.heapreplace(heap, item)
        beam = [item[2] for item in sorted(heap, reverse=True)]
        for state in beam[: min(args.replay, len(beam))]:
            archive.append((
                cross_depth_rank(state["rank"], state["rebound"]),
                serial,
                state["types"],
                state["order"],
                state["rebound"],
                state["rank"],
            ))
            serial += 1
        archive = heapq.nlargest(args.replay * 8, archive)
        best = beam[0]
        per_depth_best = max(
            beam,
            key=lambda state: cross_depth_rank(state["rank"], state["rebound"]),
        )
        per_depth_archive.append((
            cross_depth_rank(per_depth_best["rank"], per_depth_best["rebound"]),
            serial,
            per_depth_best["types"],
            per_depth_best["order"],
            per_depth_best["rebound"],
            per_depth_best["rank"],
        ))
        serial += 1
        print(
            f"depth={depth} expansions={expansion_count:,} order={best['order']} "
            f"rank={best['rank']} types={best['types']}",
            flush=True,
        )

    ordered_archive = sorted(archive, reverse=True)
    mandatory = per_depth_archive
    if len(mandatory) > args.replay:
        mandatory = sorted(mandatory, reverse=True)[: args.replay]

    finalists = []
    seen = set()
    for archive_rank, _, types, order, rebound, rank in mandatory + ordered_archive:
        if types in seen:
            continue
        seen.add(types)
        finalists.append((rank, types, order, rebound))
        if len(finalists) >= args.replay:
            break

    exact = []
    witness = None
    for position, (rank, types, order, rebound) in enumerate(finalists, start=1):
        replay = exact_replay(types, branches)
        replay["floating_rank"] = rank
        replay["floating_rebound"] = rebound
        exact.append(replay)
        print(
            f"exact={position}/{len(finalists)} order={order} "
            f"unimodal={replay['profile']['unimodal']} "
            f"legal={replay['rebound']['legal_rebound_ratio']}",
            flush=True,
        )
        if not replay["profile"]["unimodal"]:
            witness = replay
            break

    champion = max(exact, key=lambda item: tuple(item["score"])) if exact else None
    report = {
        "status": "COUNTEREXAMPLE" if witness else "NO_COUNTEREXAMPLE",
        "construction": "heterogeneous central-root product phases",
        "exact_integer_replay": True,
        "parameters": {
            key: str(value) if isinstance(value, Path) else value
            for key, value in vars(args).items()
        },
        "rooted_states_measured": len(candidates),
        "branch_types_selected": len(branches),
        "beam_expansions": expansion_count,
        "exact_replays": len(exact),
        "exact_finalists": exact,
        "champion": witness or champion,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
