#!/usr/bin/env python3
"""Stress the pointed full-square reserve on explicit graph families.

The tested rooted components are split graphs and complete bipartite
graphs, with large disjoint common factors.  Failures are relevant to
the proposed general-graph strengthening, not automatically to the
forest target.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from math import comb
from pathlib import Path

from flint import fmpz_poly

from scan_generalized_three_defect_gbcl import gbcl_data


X = fmpz_poly([0, 1])
ONE_PLUS_X = fmpz_poly([1, 1])


def binomial_poly(order: int) -> fmpz_poly:
    return fmpz_poly([comb(order, rank) for rank in range(order + 1)])


def common_factor(kind: str, count: int, size: int) -> fmpz_poly:
    if kind == "isolates":
        return ONE_PLUS_X**count
    if kind == "cliques":
        return fmpz_poly([1, size]) ** count
    if kind == "stars":
        return (binomial_poly(size) + X) ** count
    raise ValueError(kind)


def rooted_component(
    family: str,
    left: int,
    right: int,
    root_type: str,
) -> tuple[fmpz_poly, fmpz_poly]:
    if family == "split":
        # Clique of order left completely joined to an independent
        # set of order right.
        t_poly = binomial_poly(right) + left * X
        if root_type == "independent":
            if right < 1:
                raise ValueError
            f_poly = binomial_poly(right - 1) + left * X
        else:
            if left < 1:
                raise ValueError
            f_poly = binomial_poly(right) + (left - 1) * X
        return t_poly, f_poly
    if family == "complete_bipartite":
        t_poly = (
            binomial_poly(left)
            + binomial_poly(right)
            - fmpz_poly([1])
        )
        if root_type == "left":
            if left < 1:
                raise ValueError
            f_poly = (
                binomial_poly(left - 1)
                + binomial_poly(right)
                - fmpz_poly([1])
            )
        else:
            if right < 1:
                raise ValueError
            f_poly = (
                binomial_poly(left)
                + binomial_poly(right - 1)
                - fmpz_poly([1])
            )
        return t_poly, f_poly
    raise ValueError(family)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=int, default=20_000)
    parser.add_argument("--maximum-parameter", type=int, default=120)
    parser.add_argument("--maximum-common-count", type=int, default=120)
    parser.add_argument("--maximum-common-size", type=int, default=20)
    parser.add_argument("--min-rank", type=int, default=2)
    parser.add_argument(
        "--live-only",
        action="store_true",
        help="stop only on failures outside the direct-descent branch",
    )
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("full_square_graph_families_20260729.json"),
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)

    summary = {
        "instances": 0,
        "rank_checks": 0,
        "negative_cross_checks": 0,
        "live_negative_cross_checks": 0,
        "full_square_failures": 0,
        "first_full_square_failure": None,
        "live_full_square_failures": 0,
        "first_live_full_square_failure": None,
        "minimum_ratio": None,
        "minimum_witness": None,
    }
    for sample in range(args.samples):
        family = rng.choice(("split", "complete_bipartite"))
        left = rng.randint(1, args.maximum_parameter)
        right = rng.randint(1, args.maximum_parameter)
        root_type = (
            rng.choice(("independent", "clique"))
            if family == "split"
            else rng.choice(("left", "right"))
        )
        kind = rng.choice(("isolates", "cliques", "stars"))
        count = rng.randint(0, args.maximum_common_count)
        size = rng.randint(1, args.maximum_common_size)
        t0, f0 = rooted_component(
            family,
            left,
            right,
            root_type,
        )
        common = common_factor(kind, count, size)
        t_poly = t0 * common
        f_poly = f0 * common
        summary["instances"] += 1

        for k in range(
            args.min_rank,
            min(t_poly.degree() - 1, f_poly.degree()) + 1,
        ):
            data = gbcl_data(t_poly, f_poly, k)
            if data is None:
                continue
            summary["rank_checks"] += 1
            if data["split_branch"] != "z_negative_NCL":
                continue
            summary["negative_cross_checks"] += 1
            if data["live_C12_required"]:
                summary["live_negative_cross_checks"] += 1
            numerator = (
                data["full_square_reserve_cleared"]
                + (k) * data["U"] ** 2
            )
            # numerator is b_minus^2*R_T_numerator; hence the
            # full-square ratio is numerator/(k U^2).
            denominator = k * data["U"] ** 2
            ratio = float(Fraction(numerator, denominator))
            witness = {
                "sample": sample,
                "family": family,
                "left": left,
                "right": right,
                "root_type": root_type,
                "common_kind": kind,
                "common_count": count,
                "common_size": size,
                "rank_k": k,
                "live_C12_required": data["live_C12_required"],
                "R_T_over_zeta_squared": ratio,
                "U": str(data["U"]),
                "cleared_margin": str(
                    data["full_square_reserve_cleared"]
                ),
            }
            if (
                summary["minimum_ratio"] is None
                or ratio < summary["minimum_ratio"]
            ):
                summary["minimum_ratio"] = ratio
                summary["minimum_witness"] = witness
            if data["full_square_reserve_cleared"] < 0:
                summary["full_square_failures"] += 1
                if summary["first_full_square_failure"] is None:
                    summary["first_full_square_failure"] = witness
                if data["live_C12_required"]:
                    summary["live_full_square_failures"] += 1
                    if (
                        summary["first_live_full_square_failure"]
                        is None
                    ):
                        summary["first_live_full_square_failure"] = (
                            witness
                        )
                if not args.live_only or data["live_C12_required"]:
                    break
        stopping_failure = (
            summary["first_live_full_square_failure"]
            if args.live_only
            else summary["first_full_square_failure"]
        )
        if stopping_failure is not None:
            break

    report = {
        "status": (
            "COUNTEREXAMPLE_TO_GENERAL_GRAPH_FULL_SQUARE"
            if (
                summary["first_live_full_square_failure"] is not None
                if args.live_only
                else summary["first_full_square_failure"] is not None
            )
            else "PASS_FINITE_AUDIT_NOT_PROOF"
        ),
        "scope_warning": (
            "A failure with a nonforest rooted component would not "
            "refute the forest target."
        ),
        "parameters": vars(args) | {"output": str(args.output)},
        "summary": summary,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
