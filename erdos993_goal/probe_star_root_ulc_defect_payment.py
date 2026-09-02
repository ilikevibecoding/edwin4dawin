#!/usr/bin/env python3
"""Test whether the ULC baseline pays every star-root ratio rebound.

For q_j=K_j/binom(M,j), p=q_k/q_{k-1}, R=q_{k+1}/q_k, write

  Delta_k/(q_k L_k^2)
    = q_k(1-lambda) + (1+A)(1-R theta)
      - q_k lambda (R/p-1).

The last term is the entire defect from normalized log-concavity.
If q_k >= R^k (the observed root-Maclaurin property), a sufficient
condition in rebound cases is

  (1+A)(R^k/(k+1) - R theta + 1)
      >= q_k lambda (R/p-1).

This script checks that sufficient condition exactly.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

from find_min_star_root_pird_failure import build, partitions_with_cost


def as_json_fraction(value: Fraction) -> dict:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "decimal": float(value),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--n-max", type=int, default=50)
    parser.add_argument("--min-rank", type=int, default=6)
    parser.add_argument("--prefix-only", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    instances = 0
    rank_checks = 0
    rebound_cases = 0
    first_root_maclaurin_failure = None
    first_sufficient_failure = None
    minimum_payment_ratio = None

    for order in range(1, args.n_max + 1):
        for branches in partitions_with_cost(order - 1):
            instances += 1
            k_poly, l_poly, b_poly = build(branches)
            m = sum(branches)
            upper = min(len(k_poly) - 2, len(l_poly) - 2)
            for k in range(max(1, args.min_rank - 1), upper + 1):
                if args.prefix_only and b_poly[k + 1] < b_poly[k]:
                    continue
                rank_checks += 1
                u = Fraction(k_poly[k - 1], l_poly[k - 1])
                v = Fraction(k_poly[k], l_poly[k])
                z = Fraction(k_poly[k + 1], l_poly[k + 1])
                p = v / u
                r = z / v
                if v < r**k and first_root_maclaurin_failure is None:
                    first_root_maclaurin_failure = {
                        "rooted_tree_order": order,
                        "star_leaf_counts": list(branches),
                        "k": k,
                        "q_k": as_json_fraction(v),
                        "R": as_json_fraction(r),
                        "R_to_k": as_json_fraction(r**k),
                    }
                if r <= p:
                    continue
                rebound_cases += 1
                a_ratio = Fraction(k, m - k + 1)
                lam = Fraction(
                    k * (m - k),
                    (k + 1) * (m - k + 1),
                )
                theta = Fraction(
                    k * (m - k),
                    (k + 1) * (m - k + 2),
                )
                ulc_baseline_lower = (
                    (1 + a_ratio)
                    * (r**k / (k + 1) - r * theta + 1)
                )
                rebound_debt = v * lam * (r / p - 1)
                if rebound_debt <= 0:
                    continue
                payment_ratio = ulc_baseline_lower / rebound_debt
                row = {
                    "rooted_tree_order": order,
                    "star_leaf_counts": list(branches),
                    "total_leaves": m,
                    "k": k,
                    "rank_r": k + 1,
                    "on_prefix": b_poly[k + 1] >= b_poly[k],
                    "p": as_json_fraction(p),
                    "R": as_json_fraction(r),
                    "q_k": as_json_fraction(v),
                    "ulc_baseline_lower": as_json_fraction(
                        ulc_baseline_lower
                    ),
                    "rebound_debt": as_json_fraction(rebound_debt),
                    "payment_ratio": as_json_fraction(payment_ratio),
                }
                if (
                    ulc_baseline_lower < rebound_debt
                    and first_sufficient_failure is None
                ):
                    first_sufficient_failure = row
                if (
                    minimum_payment_ratio is None
                    or payment_ratio
                    < Fraction(
                        minimum_payment_ratio["payment_ratio"]["numerator"],
                        minimum_payment_ratio["payment_ratio"]["denominator"],
                    )
                ):
                    minimum_payment_ratio = row
        print(
            f"n={order}: instances={instances:,}; "
            f"checks={rank_checks:,}; rebounds={rebound_cases:,}",
            flush=True,
        )

    report = {
        "status": (
            "SUFFICIENT_BOUND_FAILURE"
            if first_sufficient_failure
            else "PASS_NOT_PROOF"
        ),
        "parameters": vars(args) | {"out": str(args.out)},
        "instances": instances,
        "rank_checks": rank_checks,
        "rebound_cases": rebound_cases,
        "first_root_maclaurin_failure": first_root_maclaurin_failure,
        "first_sufficient_failure": first_sufficient_failure,
        "minimum_payment_ratio": minimum_payment_ratio,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    return 1 if first_sufficient_failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
