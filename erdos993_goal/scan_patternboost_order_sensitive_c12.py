#!/usr/bin/env python3
"""Order-sensitive exact C12/half-local scan on PatternBoost trees.

This is a falsifier and geometry probe, not a proof.  A new leaf is
attached at sampled roots of each 60-vertex corpus tree.  Only the
still-unproved ranks

    7 <= k < ceil(alpha * (n - 1) / (alpha + n))

are checked.  Results are stratified by

    z = 2*alpha - n,

the number of singleton units left by a maximum matching.
"""

from __future__ import annotations

import argparse
import json
import random
import time
from fractions import Fraction
from pathlib import Path

from patternboost_corpus_audit import adjacency_from_prufer
from random_leaf_gsb_local_payment import X, coeff, tree_polynomial


def ceil_div(a: int, b: int) -> int:
    return (a + b - 1) // b


def stable_ratio(numerator: int, denominator: int) -> float:
    shift = max(
        0, max(numerator.bit_length(), denominator.bit_length()) - 52
    )
    return (numerator >> shift) / (denominator >> shift)


def update_maximum(bucket: dict, ratio: Fraction, item: dict) -> None:
    old = bucket.get("maximum_fraction_exact")
    if old is None or ratio > Fraction(old):
        bucket["maximum_fraction_exact"] = str(ratio)
        bucket["maximum_fraction"] = stable_ratio(
            ratio.numerator, ratio.denominator
        )
        bucket["witness"] = item


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path("patternboost60_polynomial_corpus_20260726.json"),
    )
    parser.add_argument("--records", type=int, default=43_595)
    parser.add_argument("--attachments", type=int, default=3)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--min-rank", type=int, default=7)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    source = json.loads(args.corpus.read_text(encoding="utf-8"))
    records = source["records"][: args.records]
    rng = random.Random(args.seed)
    checks = 0
    attachment_checks = 0
    skipped_by_tail = 0
    first_c12_failure = None
    first_half_local_failure = None
    first_one_vertex_curvature_failure = None
    first_lower_sandwich_failure = None
    first_upper_sandwich_failure = None
    minimum_one_vertex_curvature_margin = None
    minimum_one_vertex_curvature_item = None
    minimum_lower_sandwich_margin = None
    minimum_lower_sandwich_item = None
    minimum_upper_sandwich_margin = None
    minimum_upper_sandwich_item = None
    global_bucket: dict = {"checks": 0, "negative_local_checks": 0}
    by_z: dict[str, dict] = {}
    by_rank: dict[str, dict] = {}
    by_deficit: dict[str, dict] = {}

    for record_index, record in enumerate(records):
        adjacency = adjacency_from_prufer(record["prufer_code_one_based"])
        old = tree_polynomial(adjacency)
        assert [int(value) for value in old] == record["polynomial"]
        roots = rng.sample(
            range(len(adjacency)),
            min(len(adjacency), args.attachments),
        )
        for root in roots:
            attachment_checks += 1
            deletion = tree_polynomial(adjacency, deleted=root)
            new = old + X * deletion
            order = len(adjacency) + 1
            alpha = new.degree()
            cutoff = ceil_div(alpha * (order - 1), alpha + order)
            z = 2 * alpha - order
            coarse_cutoff = ceil_div(2 * alpha, 3)
            skipped_by_tail += max(
                0, coarse_cutoff - max(args.min_rank, cutoff)
            )
            for rank in range(args.min_rank, cutoff):
                r = rank - 1
                a = int(coeff(old, r))
                a_plus = int(coeff(old, r + 1))
                a_next = int(coeff(old, r + 2))
                b_minus = int(coeff(deletion, r - 1))
                b_here = int(coeff(deletion, r))
                b_plus = int(coeff(deletion, r + 1))
                if min(a, a_plus, b_minus, b_here) <= 0:
                    continue

                s = Fraction(b_here, a)
                u = Fraction(r * b_here, b_minus)
                w = Fraction(rank * b_plus, b_here)
                v = Fraction(rank * a_plus, a)
                y = Fraction((rank + 1) * a_next, a_plus)
                q_t = v - y + 1
                q_f = u - w + 1
                theta = Fraction(b_minus, a + b_minus)
                gap = v - Fraction(rank, r) * u
                ordinary_scalar = (
                    v * q_t
                    + 2 * s * q_f
                    + s * u / r
                    - s
                    - theta * gap**2
                )
                same_rank = 2 * rank * v * q_t
                local = (
                    2 * rank * (ordinary_scalar - v * q_t)
                    + r * (rank * s - v) * q_f
                )
                c12 = same_rank + local
                half_local = same_rank / 2 + local
                one_vertex_curvature_margin = (
                    rank * q_t - r * q_f
                )
                lower_sandwich_margin = v - w
                upper_sandwich_margin = (
                    Fraction(rank, r) * u - v
                )
                checks += 1

                item = {
                    "record_index": record_index,
                    "first_line": record["first_line"],
                    "root": root,
                    "order": order,
                    "alpha": alpha,
                    "z": z,
                    "rank": rank,
                    "deficit": alpha - rank,
                    "cutoff": cutoff,
                    "same_rank_exact": str(same_rank),
                    "local_exact": str(local),
                    "c12_exact": str(c12),
                    "half_local_exact": str(half_local),
                    "one_vertex_curvature_margin_exact": str(
                        one_vertex_curvature_margin
                    ),
                    "v_minus_w_exact": str(
                        lower_sandwich_margin
                    ),
                    "ku_over_r_minus_v_exact": str(
                        upper_sandwich_margin
                    ),
                    "prufer_code_one_based":
                        record["prufer_code_one_based"],
                }
                if c12 < 0 and first_c12_failure is None:
                    first_c12_failure = item
                if half_local < 0 and first_half_local_failure is None:
                    first_half_local_failure = item
                if (
                    minimum_one_vertex_curvature_margin is None
                    or one_vertex_curvature_margin
                    < minimum_one_vertex_curvature_margin
                ):
                    minimum_one_vertex_curvature_margin = (
                        one_vertex_curvature_margin
                    )
                    minimum_one_vertex_curvature_item = item
                if (
                    minimum_lower_sandwich_margin is None
                    or lower_sandwich_margin
                    < minimum_lower_sandwich_margin
                ):
                    minimum_lower_sandwich_margin = (
                        lower_sandwich_margin
                    )
                    minimum_lower_sandwich_item = item
                if (
                    minimum_upper_sandwich_margin is None
                    or upper_sandwich_margin
                    < minimum_upper_sandwich_margin
                ):
                    minimum_upper_sandwich_margin = (
                        upper_sandwich_margin
                    )
                    minimum_upper_sandwich_item = item
                if (
                    one_vertex_curvature_margin < 0
                    and first_one_vertex_curvature_failure is None
                ):
                    first_one_vertex_curvature_failure = item
                if (
                    lower_sandwich_margin < 0
                    and first_lower_sandwich_failure is None
                ):
                    first_lower_sandwich_failure = item
                if (
                    upper_sandwich_margin < 0
                    and first_upper_sandwich_failure is None
                ):
                    first_upper_sandwich_failure = item

                buckets = [
                    global_bucket,
                    by_z.setdefault(
                        str(z), {"checks": 0, "negative_local_checks": 0}
                    ),
                    by_rank.setdefault(
                        str(rank),
                        {"checks": 0, "negative_local_checks": 0},
                    ),
                    by_deficit.setdefault(
                        str(alpha - rank),
                        {"checks": 0, "negative_local_checks": 0},
                    ),
                ]
                for bucket in buckets:
                    bucket["checks"] += 1
                if local < 0 and same_rank > 0:
                    ratio = -local / same_rank
                    for bucket in buckets:
                        bucket["negative_local_checks"] += 1
                        update_maximum(bucket, ratio, item)

        if (record_index + 1) % 5000 == 0:
            maximum = global_bucket.get("maximum_fraction")
            print(
                f"records={record_index + 1:,}, checks={checks:,}, "
                f"max_fraction={maximum}",
                flush=True,
            )

    report = {
        "claim": (
            "C12 and half-local inequality below the exact "
            "Fisher-Ryan-Zykov tail"
        ),
        "parameters": vars(args) | {
            "corpus": str(args.corpus),
            "out": str(args.out),
        },
        "records": len(records),
        "attachments": attachment_checks,
        "checks": checks,
        "coarse_prefix_ranks_skipped_by_sharper_tail":
            skipped_by_tail,
        "global": global_bucket,
        "by_singleton_units_z": dict(
            sorted(by_z.items(), key=lambda pair: int(pair[0]))
        ),
        "by_rank": dict(
            sorted(by_rank.items(), key=lambda pair: int(pair[0]))
        ),
        "by_deficit_alpha_minus_k": dict(
            sorted(by_deficit.items(), key=lambda pair: int(pair[0]))
        ),
        "first_c12_failure": first_c12_failure,
        "first_half_local_failure": first_half_local_failure,
        "auxiliary_three_comparison_test": {
            "minimum_one_vertex_curvature_margin": (
                None
                if minimum_one_vertex_curvature_margin is None
                else {
                    "exact": str(
                        minimum_one_vertex_curvature_margin
                    ),
                    "decimal": float(
                        minimum_one_vertex_curvature_margin
                    ),
                    "witness":
                        minimum_one_vertex_curvature_item,
                }
            ),
            "minimum_v_minus_w": (
                None
                if minimum_lower_sandwich_margin is None
                else {
                    "exact": str(minimum_lower_sandwich_margin),
                    "decimal": float(minimum_lower_sandwich_margin),
                    "witness": minimum_lower_sandwich_item,
                }
            ),
            "minimum_ku_over_r_minus_v": (
                None
                if minimum_upper_sandwich_margin is None
                else {
                    "exact": str(minimum_upper_sandwich_margin),
                    "decimal": float(minimum_upper_sandwich_margin),
                    "witness": minimum_upper_sandwich_item,
                }
            ),
            "first_one_vertex_curvature_failure":
                first_one_vertex_curvature_failure,
            "first_lower_sandwich_failure":
                first_lower_sandwich_failure,
            "first_upper_sandwich_failure":
                first_upper_sandwich_failure,
        },
        "status": (
            "FAIL"
            if first_c12_failure or first_half_local_failure
            else "PASS_NOT_PROOF"
        ),
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
                "attachments": report["attachments"],
                "checks": report["checks"],
                "coarse_prefix_ranks_skipped_by_sharper_tail":
                    report[
                        "coarse_prefix_ranks_skipped_by_sharper_tail"
                    ],
                "maximum_fraction":
                    report["global"].get("maximum_fraction"),
                "maximum_fraction_witness":
                    report["global"].get("witness"),
                "first_c12_failure": first_c12_failure,
                "first_half_local_failure": first_half_local_failure,
                "auxiliary_three_comparison_test":
                    report["auxiliary_three_comparison_test"],
                "elapsed_seconds": report["elapsed_seconds"],
                "report": str(args.out),
            },
            indent=2,
        )
    )
    return 1 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
