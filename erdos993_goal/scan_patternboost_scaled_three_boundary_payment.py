#!/usr/bin/env python3
"""Stress-test the proposed scaled-three boundary payment.

For a tree T rooted at p, put F=T-p and H=T-N[p].  When
alpha(T)=alpha(F)=beta and beta is 1 or 2 modulo 3, the remaining
leaf-induction boundary for SM3 is paid by the candidate inequality

    3 f[r+1] + 2 f[r] - f[r-1] >= h[r-1],
    r = floor(2 beta / 3).

This script checks exact integer coefficients on sampled roots of every
tree in the published 60-vertex PatternBoost corpus.  It is a stress
test, not a proof.
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
from random_leaf_gsb_local_payment import ONE, X, coeff


def rooted_pair(
    adjacency: list[list[int]], root: int
) -> tuple[fmpz_poly, fmpz_poly, fmpz_poly]:
    """Return I(T), I(T-root), and I(T-N[root])."""

    def states(vertex: int, parent: int) -> tuple[fmpz_poly, fmpz_poly]:
        excluded = ONE
        included_without_x = ONE
        for child in adjacency[vertex]:
            if child == parent:
                continue
            child_excluded, child_included_without_x = states(child, vertex)
            child_total = child_excluded + X * child_included_without_x
            excluded *= child_total
            included_without_x *= child_excluded
        return excluded, included_without_x

    pair_deleted, closed_deleted = states(root, -1)
    full = pair_deleted + X * closed_deleted
    return full, pair_deleted, closed_deleted


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path("patternboost60_polynomial_corpus_20260726.json"),
    )
    parser.add_argument("--records", type=int, default=43595)
    parser.add_argument("--roots", type=int, default=5)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    payload = json.loads(args.corpus.read_text(encoding="utf-8"))
    records = payload["records"][: args.records]
    rng = random.Random(args.seed)

    roots_checked = 0
    boundary_instances = 0
    failure = None
    direct_boundary_failure = None
    strengthened_direct_boundary_failure = None
    largest_ratio: Fraction | None = None
    largest_ratio_item = None
    largest_negative_ratio: Fraction | None = None
    largest_negative_ratio_item = None
    smallest_margin = None
    smallest_margin_item = None

    for record_index, record in enumerate(records):
        adjacency = adjacency_from_prufer(record["prufer_code_one_based"])
        root_sample = rng.sample(
            range(len(adjacency)), min(args.roots, len(adjacency))
        )
        for root in root_sample:
            roots_checked += 1
            full, pair_deleted, closed_deleted = rooted_pair(adjacency, root)
            if [int(full[k]) for k in range(full.degree() + 1)] != record[
                "polynomial"
            ]:
                raise AssertionError("rooted reconstruction mismatch")

            beta = pair_deleted.degree()
            if full.degree() != beta or beta % 3 not in (1, 2):
                continue
            boundary_instances += 1
            rank = (2 * beta) // 3
            reserve = (
                3 * coeff(pair_deleted, rank + 1)
                + 2 * coeff(pair_deleted, rank)
                - coeff(pair_deleted, rank - 1)
            )
            target = coeff(closed_deleted, rank - 1)
            margin = reserve - target
            closed_difference = (
                3 * coeff(closed_deleted, rank)
                - coeff(closed_deleted, rank - 1)
            )
            direct_boundary = reserve + closed_difference
            strengthened_direct_boundary = (
                direct_boundary - coeff(pair_deleted, rank)
            )
            item = {
                "record_index": record_index,
                "first_line": record["first_line"],
                "prufer_code_one_based": record["prufer_code_one_based"],
                "root_zero_based": root,
                "beta": beta,
                "rank": rank,
                "pair_reserve": int(reserve),
                "closed_previous": int(target),
                "margin": int(margin),
                "D_closed": int(closed_difference),
                "direct_boundary": int(direct_boundary),
                "strengthened_direct_boundary":
                    int(strengthened_direct_boundary),
            }
            if reserve > 0:
                ratio = Fraction(int(target), int(reserve))
                if largest_ratio is None or ratio > largest_ratio:
                    largest_ratio = ratio
                    largest_ratio_item = item | {
                        "closed_previous_over_pair_reserve": float(ratio)
                    }
            if smallest_margin is None or margin < smallest_margin:
                smallest_margin = margin
                smallest_margin_item = item
            if closed_difference < 0 and reserve > 0:
                negative_ratio = Fraction(
                    int(-closed_difference), int(reserve)
                )
                if (
                    largest_negative_ratio is None
                    or negative_ratio > largest_negative_ratio
                ):
                    largest_negative_ratio = negative_ratio
                    largest_negative_ratio_item = item | {
                        "minus_D_closed_over_pair_reserve":
                            float(negative_ratio)
                    }
            if direct_boundary < 0 and direct_boundary_failure is None:
                direct_boundary_failure = item
                break
            if (
                strengthened_direct_boundary < 0
                and strengthened_direct_boundary_failure is None
            ):
                strengthened_direct_boundary_failure = item
            if margin < 0 and failure is None:
                failure = item
        if direct_boundary_failure is not None:
            break
        if (record_index + 1) % 5000 == 0:
            print(f"completed {record_index + 1}/{len(records)}", flush=True)

    report = {
        "status": (
            "PASS_NOT_PROOF"
            if direct_boundary_failure is None
            else "FAIL"
        ),
        "parameters": {
            "corpus": str(args.corpus),
            "records": args.records,
            "roots": args.roots,
            "seed": args.seed,
        },
        "records_checked": record_index + 1 if records else 0,
        "roots_checked": roots_checked,
        "boundary_instances": boundary_instances,
        "coefficient_payment_failure": failure,
        "direct_boundary_failure": direct_boundary_failure,
        "strengthened_direct_boundary_failure":
            strengthened_direct_boundary_failure,
        "largest_ratio": largest_ratio_item,
        "largest_negative_ratio": largest_negative_ratio_item,
        "smallest_margin": smallest_margin_item,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2), flush=True)
    return 0 if direct_boundary_failure is None else 1


if __name__ == "__main__":
    raise SystemExit(main())
