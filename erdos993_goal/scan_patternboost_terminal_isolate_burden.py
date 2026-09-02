#!/usr/bin/env python3
"""Exact terminal-isolate burden scan on PatternBoost trees.

For each selected root q of an adversarial tree A, add one isolated
terminal vertex z and take W={q,z}.  Check whether the pointed
occupancy burden is nonpositive throughout the prefix b_r>=b_{r-1}.
"""

from __future__ import annotations

import argparse
import json
import random
import time
from fractions import Fraction
from pathlib import Path

from flint import fmpz_poly

from patternboost_corpus_audit import adjacency_from_prufer
from random_leaf_gsb_local_payment import coeff, tree_polynomial


ONE_PLUS_X = fmpz_poly([1, 1])


def stable_float(value: Fraction) -> float:
    shift = max(
        0,
        max(value.numerator.bit_length(), value.denominator.bit_length())
        - 52,
    )
    return (
        value.numerator >> shift
    ) / (value.denominator >> shift)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path("patternboost60_polynomial_corpus_20260726.json"),
    )
    parser.add_argument("--records", type=int, default=43_595)
    parser.add_argument("--roots", type=int, default=2)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--min-rank", type=int, default=1)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    source = json.loads(args.corpus.read_text(encoding="utf-8"))
    records = source["records"][: args.records]
    rng = random.Random(args.seed)
    checks = failures = root_checks = 0
    ratio_checks_all = ratio_failures_all = 0
    ratio_decreases_prefix = 0
    first_ratio_failure_all = None
    first_ratio_decrease_prefix = None
    hard_cases = 0
    delta_below_twice_avoid_growth = 0
    minimum_delta_ratio = None
    minimum_delta_ratio_item = None
    minimum = None
    minimum_item = None
    first_failure = None

    for record_index, record in enumerate(records):
        adjacency = adjacency_from_prufer(
            record["prufer_code_one_based"]
        )
        base = fmpz_poly(record["polynomial"])
        total = base * ONE_PLUS_X
        roots = sorted(
            range(len(adjacency)),
            key=lambda vertex: len(adjacency[vertex]),
            reverse=True,
        )
        selected = roots[:1]
        if args.roots >= 2:
            leaves = [
                vertex
                for vertex in roots
                if len(adjacency[vertex]) == 1
            ]
            if leaves:
                selected.append(rng.choice(leaves))
        if args.roots >= 3:
            remaining = [
                vertex for vertex in roots if vertex not in selected
            ]
            selected.extend(
                rng.sample(
                    remaining,
                    min(args.roots - len(selected), len(remaining)),
                )
            )

        for root in selected:
            root_checks += 1
            avoiding = tree_polynomial(adjacency, deleted=root)
            for r in range(args.min_rank, total.degree() + 1):
                bm = int(coeff(total, r - 1))
                br = int(coeff(total, r))
                if not bm or not br:
                    continue
                cm = int(coeff(avoiding, r - 1))
                cr = int(coeff(avoiding, r))
                ratio_margin = br * cm - bm * cr
                ratio_checks_all += 1
                ratio_item = {
                    "record_index": record_index,
                    "first_line": record["first_line"],
                    "root": root,
                    "root_degree": len(adjacency[root]),
                    "rank_r": r,
                    "b_previous": bm,
                    "b_current": br,
                    "c_previous": cm,
                    "c_current": cr,
                    "ratio_cleared_margin": ratio_margin,
                    "prufer_code_one_based":
                        record["prufer_code_one_based"],
                }
                if ratio_margin < 0:
                    ratio_failures_all += 1
                    if first_ratio_failure_all is None:
                        first_ratio_failure_all = ratio_item
                if br < bm:
                    continue
                u = Fraction(r * br, bm)
                rho_previous = Fraction(
                    bm - cm, bm
                )
                rho = Fraction(
                    br - cr, br
                )
                if ratio_margin < 0:
                    ratio_decreases_prefix += 1
                    if first_ratio_decrease_prefix is None:
                        first_ratio_decrease_prefix = ratio_item
                burden = (
                    r * (u + 1) * rho_previous
                    - (r + 1) * u * rho
                )
                margin = -burden
                checks += 1
                avoid_growth = (
                    int(coeff(avoiding, r))
                    - int(coeff(avoiding, r - 1))
                )
                delta = br - bm
                item = {
                    "record_index": record_index,
                    "first_line": record["first_line"],
                    "root": root,
                    "root_degree": len(adjacency[root]),
                    "rank_r": r,
                    "u": str(u),
                    "rho_previous": str(rho_previous),
                    "rho": str(rho),
                    "burden": str(burden),
                    "prufer_code_one_based":
                        record["prufer_code_one_based"],
                }
                if avoid_growth > 0:
                    hard_cases += 1
                    delta_ratio = Fraction(delta, avoid_growth)
                    if delta < 2 * avoid_growth:
                        delta_below_twice_avoid_growth += 1
                    if (
                        minimum_delta_ratio is None
                        or delta_ratio < minimum_delta_ratio
                    ):
                        minimum_delta_ratio = delta_ratio
                        minimum_delta_ratio_item = item | {
                            "total_growth": delta,
                            "avoid_growth": avoid_growth,
                            "delta_to_avoid_growth":
                                str(delta_ratio),
                        }
                if burden > 0:
                    failures += 1
                    if first_failure is None:
                        first_failure = item
                if minimum is None or margin < minimum:
                    minimum, minimum_item = margin, item

        if (record_index + 1) % 5000 == 0:
            print(
                f"records={record_index + 1:,} roots={root_checks:,} "
                f"checks={checks:,} failures={failures:,}",
                flush=True,
            )

    report = {
        "status": "COUNTEREXAMPLE" if failures else "PASS_NOT_PROOF",
        "parameters": vars(args) | {
            "corpus": str(args.corpus),
            "out": str(args.out),
        },
        "records": len(records),
        "root_checks": root_checks,
        "checks": checks,
        "failures": failures,
        "ratio_checks_all": ratio_checks_all,
        "ratio_failures_all": ratio_failures_all,
        "ratio_decreases_prefix": ratio_decreases_prefix,
        "first_ratio_failure_all": first_ratio_failure_all,
        "first_ratio_decrease_prefix": first_ratio_decrease_prefix,
        "hard_cases": hard_cases,
        "delta_below_twice_avoid_growth":
            delta_below_twice_avoid_growth,
        "minimum_delta_to_avoid_growth": (
            None
            if minimum_delta_ratio is None
            else {
                "exact": str(minimum_delta_ratio),
                "float": stable_float(minimum_delta_ratio),
                **minimum_delta_ratio_item,
            }
        ),
        "minimum_nonpositive_burden_margin": (
            None
            if minimum is None
            else {
                "exact": str(minimum),
                "float": stable_float(minimum),
                **minimum_item,
            }
        ),
        "first_failure": first_failure,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "records": report["records"],
                "root_checks": root_checks,
                "checks": checks,
                "failures": failures,
                "ratio_checks_all": ratio_checks_all,
                "ratio_failures_all": ratio_failures_all,
                "ratio_decreases_prefix": ratio_decreases_prefix,
                "minimum_margin": (
                    None
                    if minimum is None
                    else stable_float(minimum)
                ),
                "elapsed_seconds": report["elapsed_seconds"],
                "report": str(args.out),
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
