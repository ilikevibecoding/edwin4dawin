#!/usr/bin/env python3
"""Audit neighbor-hit likelihoods in terminal PatternBoost forest pairs.

For a terminal support p, put F=G-{leaf,p}, B=I(F), and
C=I(F-N_F(p)).  Then H=B-C counts independent sets of F that hit
N_F(p).  This script tests whether H_j/B_j is nondecreasing with rank
and records the exact correction supplied by the ISO coefficient
reserve when monotonicity fails.
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
from random_leaf_gsb_local_payment import X, coeff, tree_polynomial


ONE = fmpz_poly([1])


def stable_float(value: Fraction) -> float:
    shift = max(
        0,
        max(value.numerator.bit_length(), value.denominator.bit_length())
        - 52,
    )
    return (
        value.numerator >> shift
    ) / (value.denominator >> shift)


def ceil_div(a: int, b: int) -> int:
    return (a + b - 1) // b


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path("patternboost60_polynomial_corpus_20260726.json"),
    )
    parser.add_argument("--records", type=int, default=43_595)
    parser.add_argument("--supports", type=int, default=3)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--min-rank", type=int, default=2)
    parser.add_argument("--required-prefix", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    source = json.loads(args.corpus.read_text(encoding="utf-8"))
    records = source["records"][: args.records]
    rng = random.Random(args.seed)

    support_checks = 0
    rank_checks = 0
    monotonicity_failures = 0
    monotonicity_failures_u_ge_r = 0
    drift_failures = 0
    minimum_monotonicity = None
    minimum_monotonicity_u_ge_r = None
    minimum_drift = None
    maximum_burden_to_reserve = None
    maximum_burden = None
    positive_burden_by_sibling_count = {}
    maximum_burden_by_sibling_count = {}
    rank_checks_by_sibling_count = {}
    first_monotonicity_failure = None
    first_drift_failure = None

    def update(old, value: Fraction, item: dict):
        if old is None or value < old[0]:
            return (value, item)
        return old

    for record_index, record in enumerate(records):
        adjacency = adjacency_from_prufer(record["prufer_code_one_based"])
        full = fmpz_poly(record["polynomial"])
        order = len(adjacency)
        alpha = full.degree()
        cutoff = ceil_div(alpha * (order - 1), alpha + order)

        terminal_supports = []
        for support, neighbors in enumerate(adjacency):
            leaves = [
                neighbor
                for neighbor in neighbors
                if len(adjacency[neighbor]) == 1
            ]
            nonleaf_count = sum(
                len(adjacency[neighbor]) > 1 for neighbor in neighbors
            )
            if leaves and nonleaf_count <= 1:
                terminal_supports.append((support, leaves[0]))
        selected = (
            terminal_supports
            if len(terminal_supports) <= args.supports
            else rng.sample(terminal_supports, args.supports)
        )

        for support, leaf in selected:
            support_checks += 1
            sibling_count = sum(
                len(adjacency[neighbor]) == 1
                for neighbor in adjacency[support]
                if neighbor != leaf
            )
            a_poly = tree_polynomial(adjacency, deleted=leaf)
            delete_support = tree_polynomial(adjacency, deleted=support)
            b_poly = delete_support // (ONE + X)
            c_poly = (a_poly - b_poly) // X
            assert a_poly == b_poly + X * c_poly
            h_poly = b_poly - c_poly

            rank_stop = cutoff if args.required_prefix else b_poly.degree() + 1
            for r in range(args.min_rank, rank_stop):
                bm = int(coeff(b_poly, r - 1))
                b = int(coeff(b_poly, r))
                bp = int(coeff(b_poly, r + 1))
                hm = int(coeff(h_poly, r - 1))
                h = int(coeff(h_poly, r))
                if min(bm, b) <= 0:
                    continue
                rank_checks += 1
                rank_checks_by_sibling_count[sibling_count] = (
                    rank_checks_by_sibling_count.get(
                        sibling_count, 0
                    )
                    + 1
                )

                rho_m = Fraction(hm, bm)
                rho = Fraction(h, b)
                monotonicity = rho - rho_m
                u = Fraction(r * b, bm)
                reserve = Fraction(
                    r
                    * (
                        r * b * b
                        + bm * bm
                        - (r + 1) * bm * bp
                    ),
                    bm * bm,
                )
                normalized_drift = (
                    reserve
                    + (r + 1) * u * rho
                    - r * (u + 1) * rho_m
                )
                burden = (
                    r * (u + 1) * rho_m - (r + 1) * u * rho
                )
                item = {
                    "record_index": record_index,
                    "first_line": record["first_line"],
                    "support": support,
                    "sibling_count": sibling_count,
                    "leaf": leaf,
                    "order": order,
                    "alpha": alpha,
                    "rank_r": r,
                    "cutoff": cutoff,
                    "u": str(u),
                    "rho_previous": str(rho_m),
                    "rho_current": str(rho),
                    "monotonicity_margin": str(monotonicity),
                    "ISO_reserve": str(reserve),
                    "occupancy_burden": str(burden),
                    "normalized_drift_margin": str(normalized_drift),
                    "prufer_code_one_based": record[
                        "prufer_code_one_based"
                    ],
                }
                minimum_monotonicity = update(
                    minimum_monotonicity, monotonicity, item
                )
                if u >= r:
                    minimum_monotonicity_u_ge_r = update(
                        minimum_monotonicity_u_ge_r,
                        monotonicity,
                        item,
                    )
                minimum_drift = update(
                    minimum_drift, normalized_drift, item
                )
                if maximum_burden is None or burden > maximum_burden[0]:
                    maximum_burden = (burden, item)
                if burden > 0:
                    positive_burden_by_sibling_count[sibling_count] = (
                        positive_burden_by_sibling_count.get(
                            sibling_count, 0
                        )
                        + 1
                    )
                    old_sibling = maximum_burden_by_sibling_count.get(
                        sibling_count
                    )
                    if (
                        old_sibling is None
                        or burden > old_sibling[0]
                    ):
                        maximum_burden_by_sibling_count[
                            sibling_count
                        ] = (burden, item)
                if burden > 0 and reserve > 0:
                    ratio = burden / reserve
                    if (
                        maximum_burden_to_reserve is None
                        or ratio > maximum_burden_to_reserve[0]
                    ):
                        maximum_burden_to_reserve = (ratio, item)
                if monotonicity < 0:
                    monotonicity_failures += 1
                    if u >= r:
                        monotonicity_failures_u_ge_r += 1
                    if first_monotonicity_failure is None:
                        first_monotonicity_failure = item
                if normalized_drift < 0:
                    drift_failures += 1
                    if first_drift_failure is None:
                        first_drift_failure = item

        if (record_index + 1) % 1000 == 0:
            print(
                f"records={record_index + 1:,} "
                f"supports={support_checks:,} ranks={rank_checks:,} "
                f"rho_failures={monotonicity_failures:,} "
                f"rho_failures_u_ge_r={monotonicity_failures_u_ge_r:,}",
                flush=True,
            )

    def encode(entry):
        if entry is None:
            return None
        value, item = entry
        return {"exact": str(value), "float": stable_float(value), **item}

    report = {
        "description": (
            "Terminal neighbor-hit likelihood and exact ISO-reserve "
            "correction on the PatternBoost tree corpus."
        ),
        "records": len(records),
        "support_checks": support_checks,
        "rank_checks": rank_checks,
        "required_prefix": args.required_prefix,
        "monotonicity_failures": monotonicity_failures,
        "monotonicity_failures_u_ge_r":
            monotonicity_failures_u_ge_r,
        "drift_failures": drift_failures,
        "minimum_monotonicity": encode(minimum_monotonicity),
        "minimum_monotonicity_u_ge_r": encode(
            minimum_monotonicity_u_ge_r
        ),
        "minimum_normalized_drift": encode(minimum_drift),
        "maximum_occupancy_burden": encode(maximum_burden),
        "positive_burden_by_sibling_count": {
            str(siblings): count
            for siblings, count in sorted(
                positive_burden_by_sibling_count.items()
            )
        },
        "rank_checks_by_sibling_count": {
            str(siblings): count
            for siblings, count in sorted(
                rank_checks_by_sibling_count.items()
            )
        },
        "maximum_burden_by_sibling_count": {
            str(siblings): encode(entry)
            for siblings, entry in sorted(
                maximum_burden_by_sibling_count.items()
            )
        },
        "maximum_burden_to_reserve": encode(
            maximum_burden_to_reserve
        ),
        "first_monotonicity_failure": first_monotonicity_failure,
        "first_drift_failure": first_drift_failure,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if drift_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
