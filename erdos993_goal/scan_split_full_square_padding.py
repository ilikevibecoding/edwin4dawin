#!/usr/bin/env python3
"""Systematic padding scan for the split-graph full-square reserve."""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

from scan_full_square_graph_families import (
    common_factor,
    rooted_component,
)
from scan_generalized_three_defect_gbcl import gbcl_data


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--clique-order", type=int, default=63)
    parser.add_argument("--independent-order", type=int, default=21)
    parser.add_argument("--common-kind", choices=("isolates", "cliques", "stars"), default="isolates")
    parser.add_argument("--common-size", type=int, default=1)
    parser.add_argument("--maximum-common-count", type=int, default=300)
    parser.add_argument("--min-rank", type=int, default=2)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    t0, f0 = rooted_component(
        "split",
        args.clique_order,
        args.independent_order,
        "independent",
    )
    summary = {
        "negative_cross_checks": 0,
        "live_negative_cross_checks": 0,
        "full_square_failures": 0,
        "live_full_square_failures": 0,
        "first_live_failure": None,
        "live_inductive_full_square_failures": 0,
        "first_live_inductive_failure": None,
        "minimum_live_ratio": None,
        "minimum_live_witness": None,
    }
    for count in range(args.maximum_common_count + 1):
        common = common_factor(
            args.common_kind,
            count,
            args.common_size,
        )
        t_poly = t0 * common
        f_poly = f0 * common
        for k in range(
            args.min_rank,
            min(t_poly.degree() - 1, f_poly.degree()) + 1,
        ):
            data = gbcl_data(t_poly, f_poly, k)
            if data is None or data["split_branch"] != "z_negative_NCL":
                continue
            summary["negative_cross_checks"] += 1
            live = data["live_C12_required"]
            if live:
                summary["live_negative_cross_checks"] += 1
            numerator = (
                data["full_square_reserve_cleared"]
                + k * data["U"] ** 2
            )
            denominator = k * data["U"] ** 2
            ratio = float(Fraction(numerator, denominator))
            witness = {
                "common_count": count,
                "rank_k": k,
                "live": live,
                "G_T_nonnegative": data["G_T"] >= 0,
                "G_F_nonnegative": data["G_F"] >= 0,
                "R_T_over_zeta_squared": ratio,
                "cleared_margin": str(
                    data["full_square_reserve_cleared"]
                ),
            }
            if live and (
                summary["minimum_live_ratio"] is None
                or ratio < summary["minimum_live_ratio"]
            ):
                summary["minimum_live_ratio"] = ratio
                summary["minimum_live_witness"] = witness
            if data["full_square_reserve_cleared"] < 0:
                summary["full_square_failures"] += 1
                if live:
                    summary["live_full_square_failures"] += 1
                    if summary["first_live_failure"] is None:
                        summary["first_live_failure"] = witness
                    if data["G_T"] >= 0 and data["G_F"] >= 0:
                        summary[
                            "live_inductive_full_square_failures"
                        ] += 1
                        if (
                            summary["first_live_inductive_failure"]
                            is None
                        ):
                            summary[
                                "first_live_inductive_failure"
                            ] = witness

    report = {
        "status": (
            "LIVE_COUNTEREXAMPLE_TO_GENERAL_GRAPH_FULL_SQUARE"
            if summary["first_live_failure"] is not None
            else "PASS_FINITE_AUDIT_NOT_PROOF"
        ),
        "scope_warning": (
            "The rooted split graph is not a forest."
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
