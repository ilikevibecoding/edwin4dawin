#!/usr/bin/env python3
"""Batch exact sparse checks for the four-gap nonnegative-sign tail reserve."""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from diagnose_uniform_low_high_four_gap_rank_split_sparse_root import (
    ZERO,
    poly_add,
    poly_constant,
    poly_multiply,
    poly_variable,
    reserve_numerator,
    sign_summary,
    transform_fraction,
)
from explore_uniform_low_high_four_gap_symbolic_payments_root import CACHE, load_rows


ROOT = Path(__file__).resolve().parent


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def fraction_summary(value, images):
    numerator, denominator = transform_fraction(value, images)
    return {
        "numerator": sign_summary(numerator),
        "denominator": sign_summary(denominator),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-index", type=int, default=1)
    parser.add_argument("--stop-index", type=int)
    parser.add_argument("--threshold", type=int, default=16)
    parser.add_argument("--fixed-rank", type=int)
    parser.add_argument("--exact-products", action="store_true")
    parser.add_argument("--chart", choices=("ordinary", "scaled", "high"), default="ordinary")
    parser.add_argument("--decay-order", type=int, choices=(0, 1, 2, 3), default=2)
    parser.add_argument("--drop-delta", action="store_true")
    parser.add_argument("--drop-gamma", action="store_true")
    parser.add_argument("--use-delta-lower-bound", action="store_true")
    parser.add_argument("--use-delta-lower-bound-drop-gamma", action="store_true")
    parser.add_argument("--output", type=Path)
    arguments = parser.parse_args()
    assert arguments.threshold >= 8
    if arguments.fixed_rank is not None:
        assert arguments.fixed_rank >= 8
    if arguments.exact_products:
        assert arguments.fixed_rank is not None
        assert not any((
            arguments.drop_delta,
            arguments.drop_gamma,
            arguments.use_delta_lower_bound,
            arguments.use_delta_lower_bound_drop_gamma,
        ))
    assert sum((
        arguments.drop_delta,
        arguments.drop_gamma,
        arguments.use_delta_lower_bound,
        arguments.use_delta_lower_bound_drop_gamma,
    )) <= 1
    assert CACHE.exists()

    F, k, x, y = field("k,x,y", QQ)
    rows = load_rows(F)
    keys = sorted({key for row in rows.values() for key in row if key[0] >= 1})
    start = max(1, arguments.start_index)
    stop = min(len(keys), arguments.stop_index or len(keys))
    assert start <= stop

    u, xv, gap = (poly_variable(index) for index in range(3))
    effective_rank = arguments.fixed_rank or arguments.threshold
    effective_decay_order = 0 if arguments.fixed_rank is not None else arguments.decay_order
    K = (
        poly_constant(arguments.fixed_rank)
        if arguments.fixed_rank is not None
        else poly_add(u, poly_constant(arguments.threshold))
    )
    X = xv
    N = poly_add(K, X)
    if arguments.chart == "ordinary":
        Y = poly_add(X, gap)
    elif arguments.chart == "scaled":
        Y = poly_add(X, poly_multiply(gap, N))
    else:
        Y = xv
        X = poly_add(Y, gap)
        N = poly_add(K, X)
    M = poly_add(K, Y)
    images = (K, X, Y)

    results = []
    failures = []
    for index in range(start, stop + 1):
        key = keys[index - 1]

        def coefficient(product):
            return rows[product].get(key, F.zero)

        original_beta = coefficient(("T", "R"))
        beta = original_beta
        original_gamma = -coefficient(("L", "R"))
        gamma = original_gamma
        original_delta = -coefficient(("R", "R"))
        if arguments.use_delta_lower_bound or arguments.use_delta_lower_bound_drop_gamma:
            N_field, M_field = k + x, k + y
            paired = (
                (k - 1) * N_field / 2
                * (1 / (x + y + k + 2) + 1 / (x + y + 2 * k))
            )
            beta = beta - original_delta + original_delta * paired
            delta = F.zero
            if arguments.use_delta_lower_bound_drop_gamma:
                gamma = F.zero
        else:
            delta = F.zero if arguments.drop_delta else original_delta
            if arguments.drop_gamma:
                gamma = F.zero
        if arguments.exact_products:
            left_ratio = F.one
            right_ratio = F.one
            for offset in range(2, arguments.fixed_rank + 1):
                common = x + y + arguments.fixed_rank + offset
                left_ratio *= (x + offset) / common
                right_ratio *= (y + offset) / common
            exact_value = (
                original_beta - original_gamma * left_ratio
                - original_delta * right_ratio
            )
            numerator, exact_denominator = transform_fraction(exact_value, images)
            denominators = {"exact_product": sign_summary(exact_denominator)}
        elif arguments.use_delta_lower_bound_drop_gamma:
            numerator, effective_denominator = transform_fraction(beta, images)
            denominators = {"effective_beta": sign_summary(effective_denominator)}
        else:
            numerator, denominators = reserve_numerator(
                beta, gamma, delta, N, M, effective_rank - 1, images, u,
                effective_decay_order,
            )
        numerator_summary = sign_summary(numerator)
        coefficient_summaries = {
            "beta": fraction_summary(original_beta, images),
            "effective_beta": fraction_summary(beta, images),
            "gamma": fraction_summary(original_gamma, images),
            "delta": fraction_summary(original_delta, images),
        }
        passed = (
            numerator_summary["status"] == "positive"
            and all(summary["status"] == "positive" for summary in denominators.values())
        )
        row = {
            "index": index,
            "key": list(key),
            "passed": passed,
            "reserve_numerator": numerator_summary,
            "reserve_denominators": denominators,
            "coefficients": coefficient_summaries,
        }
        results.append(row)
        if not passed:
            failures.append(row)
        print(
            "ROW", index, tuple(key), "PASS" if passed else "MIXED",
            numerator_summary, flush=True,
        )
        del numerator
        gc.collect()

    report = {
        "schema": "uniform-low-high-four-gap-rank-decay-tail-scan-v1",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "status": (
            (
                "PASS_EXACT_FOUR_GAP_FIXED_RANK_BOUND_SHARD"
                if arguments.fixed_rank is not None else
                "PASS_EXACT_FOUR_GAP_RANK_DECAY_TAIL_SHARD"
            )
            if not failures else
            (
                "MIXED_EXACT_FOUR_GAP_FIXED_RANK_BOUND_SHARD"
                if arguments.fixed_rank is not None else
                "MIXED_EXACT_FOUR_GAP_RANK_DECAY_TAIL_SHARD"
            )
        ),
        "parameters": {
            "start_index": start,
            "stop_index": stop,
            "total_keys": len(keys),
            "threshold": arguments.threshold,
            "fixed_rank": arguments.fixed_rank,
            "chart": arguments.chart,
            "decay_order": effective_decay_order,
            "drop_delta": arguments.drop_delta,
            "drop_gamma": arguments.drop_gamma,
            "use_delta_lower_bound": arguments.use_delta_lower_bound,
            "use_delta_lower_bound_drop_gamma": arguments.use_delta_lower_bound_drop_gamma,
            "exact_products": arguments.exact_products,
        },
        "proof_scope": (
            "Exact coefficientwise certificate for the "
            + (
                f"actual fixed-rank k={arguments.fixed_rank} product expression used without bounds "
                if arguments.exact_products else
                f"fixed-rank k={arguments.fixed_rank} reserve used when "
                if arguments.fixed_rank is not None else
                "tail reserve used when "
            )
            + (
                "gamma and delta are negative (the exact lower bound on R/T "
                "retains the helpful delta term and gamma is dropped); "
                if arguments.use_delta_lower_bound_drop_gamma else
                "gamma is nonnegative and delta is negative (the exact lower "
                "bound on R/T retains part of the helpful delta term); "
                if arguments.use_delta_lower_bound else
                "gamma is negative and delta is nonnegative (the helpful gamma "
                "term is dropped); "
                if arguments.drop_gamma else
                "gamma is nonnegative and delta is negative (the helpful delta "
                "term is dropped); "
                if arguments.drop_delta else
                "gamma and delta are nonnegative; "
            )
            + "this scan alone is not a complete four-gap theorem."
        ),
        "cache": {"path": CACHE.name, "sha256": sha256(CACHE)},
        "source_sha256": sha256(Path(__file__).resolve()),
        "pass_count": len(results) - len(failures),
        "failure_count": len(failures),
        "results": results,
    }
    output = arguments.output or ROOT / (
        (
            f"uniform_low_high_four_gap_fixed_rank{arguments.fixed_rank}_{arguments.chart}_exact_products_scan_root_20260827_"
            if arguments.exact_products else
            f"uniform_low_high_four_gap_fixed_rank{arguments.fixed_rank}_{arguments.chart}_scan_root_20260827_"
            if arguments.fixed_rank is not None else
            f"uniform_low_high_four_gap_rank_decay_tail_{arguments.chart}_scan_root_20260827_"
        )
        + (
            "delta_lower_bound_" if arguments.use_delta_lower_bound else
            "delta_lower_bound_drop_gamma_"
            if arguments.use_delta_lower_bound_drop_gamma else
            "drop_gamma_" if arguments.drop_gamma else
            "drop_delta_" if arguments.drop_delta else ""
        )
        + f"{start:03d}_{stop:03d}.json"
    )
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("REPORT", output.name, sha256(output), flush=True)
    print(report["status"], "PASS", report["pass_count"], "MIXED", report["failure_count"], flush=True)
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
