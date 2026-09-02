#!/usr/bin/env python3
"""Exact products of PatternBoost trees with Galvin-tree kernels.

This targets a realizable version of the strong-unimodality mechanism.
The 60-vertex factors have a large penultimate log-concavity defect; the
Galvin family supplies tunable forest-valid convolution kernels whose
degree and skew can move that defect toward the only unresolved prefix.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from flint import fmpz_poly as Poly

from pattern_family_valley_search import profile

X = Poly([0, 1])
P1 = Poly([1, 1])
P2 = Poly([1, 2])


def better(candidate: dict, incumbent: dict | None) -> bool:
    if incumbent is None:
        return True
    left = candidate["profile"]["best_post_descent_ratio"]
    right = incumbent["profile"]["best_post_descent_ratio"]
    if left is None:
        return False
    if right is None:
        return True
    return (
        left["numerator"] * right["denominator"]
        > right["numerator"] * left["denominator"]
    )


def source_certificate(record: dict) -> dict:
    return {
        key: record[key]
        for key in (
            "first_line",
            "prufer_code_one_based",
            "polynomial",
            "order",
            "alpha",
            "mode",
            "strongest_relative_defect",
        )
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("corpus", type=Path)
    parser.add_argument(
        "--locator",
        type=Path,
        help="Replay retained floating-locator candidates exactly.",
    )
    parser.add_argument("--locator-limit", type=int, default=20)
    parser.add_argument("--base-top", type=int, default=200)
    parser.add_argument("--screen-bases", type=int, default=10)
    parser.add_argument("--replay-parameters", type=int, default=40)
    parser.add_argument("--t-min", type=int, default=2)
    parser.add_argument("--t-max", type=int, default=24)
    parser.add_argument("--m-min", type=int, default=1)
    parser.add_argument("--m-max", type=int, default=120)
    parser.add_argument("--degree-max", type=int, default=8_000)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    corpus = json.loads(args.corpus.read_text(encoding="utf-8"))
    records = corpus["records"][: args.base_top]
    bases = [Poly(record["polynomial"]) for record in records]
    tested = 0
    champion = None
    witness = None
    parameter_scores: list[dict] = []
    best_by_t: dict[int, dict] = {}
    started = time.time()

    screen_count = min(args.screen_bases, len(bases))
    if args.locator is not None:
        locator = json.loads(args.locator.read_text(encoding="utf-8"))
        located = [
            item
            for item in locator["candidates_for_exact_replay"]
            if item["m"] * (item["t"] + 1)
            + records[item["base_index"]]["alpha"]
            <= args.degree_max
        ]
        by_ratio = sorted(
            located,
            key=lambda item: item["best_post_mode_ratio"],
            reverse=True,
        )[: args.locator_limit]
        by_recovery = sorted(
            located,
            key=lambda item: item["best_ratio_recovery"],
            reverse=True,
        )[: args.locator_limit]
        selected = {}
        for item in [*by_ratio, *by_recovery]:
            selected[(item["t"], item["m"], item["base_index"])] = item
        bounded_selected = list(selected.values())
        for index, item in enumerate(bounded_selected):
            m, t, base_index = item["m"], item["t"], item["base_index"]
            record = records[base_index]
            q = P2**t
            s = q + X * P1**t
            factor = s**m + X * q**m
            forest = bases[base_index] * factor
            result = profile(forest)
            tested += 1
            candidate = {
                "galvin_parameters": {"m": m, "t": t},
                "base_index": base_index,
                "base": source_certificate(record),
                "factor_degree": len(factor) - 1,
                "forest_degree": len(forest) - 1,
                "forest_order": (
                    record["order"] + 1 + m * (1 + 2 * t)
                ),
                "profile": result,
                "locator_profile": item,
            }
            if better(candidate, champion):
                champion = candidate
            if not result["unimodal"]:
                candidate["factor_polynomial"] = [
                    int(value) for value in factor
                ]
                candidate["forest_polynomial"] = [
                    int(value) for value in forest
                ]
                witness = candidate
                break
            print(
                f"exact locator replay={index + 1}/{len(bounded_selected)} "
                f"m={m} t={t}",
                flush=True,
            )
    for t in (
        range(args.t_min, args.t_max + 1)
        if args.locator is None
        else ()
    ):
        q = P2**t
        s = q + X * P1**t
        s_power = s ** (args.m_min - 1)
        q_power = q ** (args.m_min - 1)
        for m in range(args.m_min, args.m_max + 1):
            s_power *= s
            q_power *= q
            factor = s_power + X * q_power
            if len(factor) - 1 + len(bases[0]) - 1 > args.degree_max:
                break
            local_parameter_best = None
            for base_index, (record, base) in enumerate(
                zip(records[:screen_count], bases[:screen_count], strict=True)
            ):
                forest = base * factor
                result = profile(forest)
                tested += 1
                candidate = {
                    "galvin_parameters": {"m": m, "t": t},
                    "base_index": base_index,
                    "base": source_certificate(record),
                    "factor_degree": len(factor) - 1,
                    "forest_degree": len(forest) - 1,
                    "forest_order": (
                        record["order"] + 1 + m * (1 + 2 * t)
                    ),
                    "profile": result,
                }
                if better(candidate, champion):
                    champion = candidate
                if better(candidate, local_parameter_best):
                    local_parameter_best = candidate
                if not result["unimodal"]:
                    candidate["factor_polynomial"] = [
                        int(value) for value in factor
                    ]
                    candidate["forest_polynomial"] = [
                        int(value) for value in forest
                    ]
                    witness = candidate
                    break
            if witness is not None:
                break
            assert local_parameter_best is not None
            parameter_scores.append(
                {
                    "m": m,
                    "t": t,
                    "profile": local_parameter_best["profile"],
                }
            )
            if better(local_parameter_best, best_by_t.get(t)):
                best_by_t[t] = local_parameter_best
        ratio = champion["profile"]["best_post_descent_ratio"]["decimal"]
        print(
            f"t={t} tested={tested:,} ratio={ratio:.12f} "
            f"at={champion['galvin_parameters']}",
            flush=True,
        )
        if witness is not None:
            break

    # Replay only the most promising kernel parameters against the full
    # selected base corpus.  Include the best parameter from each t band so
    # a broad-mode near-tie in one band cannot crowd out all shape diversity.
    if (
        args.locator is None
        and witness is None
        and screen_count < len(bases)
    ):
        def ratio_key(item: dict) -> float:
            ratio = item["profile"]["best_post_descent_ratio"]
            return ratio["decimal"] if ratio is not None else -1.0

        parameter_scores.sort(key=ratio_key, reverse=True)
        selected = parameter_scores[: args.replay_parameters]
        selected_keys = {(item["m"], item["t"]) for item in selected}
        for t, item in best_by_t.items():
            key = (
                item["galvin_parameters"]["m"],
                item["galvin_parameters"]["t"],
            )
            if key not in selected_keys:
                selected.append(
                    {
                        "m": key[0],
                        "t": key[1],
                        "profile": item["profile"],
                    }
                )
                selected_keys.add(key)

        for parameter_index, item in enumerate(selected):
            m, t = item["m"], item["t"]
            q = P2**t
            s = q + X * P1**t
            factor = s**m + X * q**m
            for base_index in range(screen_count, len(bases)):
                record = records[base_index]
                forest = bases[base_index] * factor
                result = profile(forest)
                tested += 1
                candidate = {
                    "galvin_parameters": {"m": m, "t": t},
                    "base_index": base_index,
                    "base": source_certificate(record),
                    "factor_degree": len(factor) - 1,
                    "forest_degree": len(forest) - 1,
                    "forest_order": (
                        record["order"] + 1 + m * (1 + 2 * t)
                    ),
                    "profile": result,
                }
                if better(candidate, champion):
                    champion = candidate
                if not result["unimodal"]:
                    candidate["factor_polynomial"] = [
                        int(value) for value in factor
                    ]
                    candidate["forest_polynomial"] = [
                        int(value) for value in forest
                    ]
                    witness = candidate
                    break
            print(
                f"replay={parameter_index + 1}/{len(selected)} "
                f"m={m} t={t} tested={tested:,}",
                flush=True,
            )
            if witness is not None:
                break

    payload = {
        "status": "COUNTEREXAMPLE" if witness else "NO_COUNTEREXAMPLE",
        "exact_integer_arithmetic": True,
        "parameters": {
            key: str(value) if isinstance(value, Path) else value
            for key, value in vars(args).items()
        },
        "tested_products": tested,
        "champion": witness or champion,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(payload, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": payload["status"],
                "tested_products": tested,
                "champion": payload["champion"],
                "elapsed_seconds": payload["elapsed_seconds"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
