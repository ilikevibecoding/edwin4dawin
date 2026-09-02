#!/usr/bin/env python3
"""Exact verification of the star-root entropy product inequality."""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from math import comb
from pathlib import Path

from find_min_star_root_pird_failure import build, partitions_with_cost


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n-max", type=int, default=38)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("star_root_entropy_product_n38_20260729.json"),
    )
    args = parser.parse_args()

    branch_multisets = 0
    rank_checks = 0
    first_failure = None
    smallest_ratio = None
    smallest_strict_ratio = None
    equality_count = 0

    for order in range(2, args.n_max + 1):
        for branches in partitions_with_cost(order - 1):
            if not branches:
                continue
            branch_multisets += 1
            m = sum(branches)
            k_poly = build(branches)[0]
            deleted = [
                build(branches[:i] + branches[i + 1 :])[0]
                for i in range(len(branches))
            ]

            for k in range(1, m + 1):
                q = Fraction(k_poly[k], comb(m, k))
                product = Fraction(1)
                for quotient in deleted:
                    h = (
                        quotient[k - 1]
                        if k - 1 < len(quotient)
                        else 0
                    )
                    p = Fraction(2 * h, k_poly[k])
                    product *= 1 + p * p

                rank_checks += 1
                ratio = q / product
                if ratio == 1:
                    equality_count += 1
                elif (
                    smallest_strict_ratio is None
                    or ratio < smallest_strict_ratio[0]
                ):
                    smallest_strict_ratio = (
                        ratio,
                        order,
                        branches,
                        k,
                        q,
                        product,
                    )
                if smallest_ratio is None or ratio < smallest_ratio[0]:
                    smallest_ratio = (ratio, order, branches, k, q, product)
                if ratio < 1 and first_failure is None:
                    first_failure = (order, branches, k, q, product, ratio)
                    break
            if first_failure is not None:
                break
        if first_failure is not None:
            break

    def record(item):
        if item is None:
            return None
        ratio, order, branches, k, q, product = item
        return {
            "rooted_tree_order": order,
            "branches": list(branches),
            "k": k,
            "q": {
                "numerator": q.numerator,
                "denominator": q.denominator,
            },
            "product": {
                "numerator": product.numerator,
                "denominator": product.denominator,
            },
            "ratio": {
                "numerator": ratio.numerator,
                "denominator": ratio.denominator,
                "decimal": float(ratio),
            },
        }

    failure_record = None
    if first_failure is not None:
        order, branches, k, q, product, ratio = first_failure
        failure_record = record((ratio, order, branches, k, q, product))

    report = {
        "status": "FAILURE_FOUND" if first_failure else "PASS_NOT_PROOF",
        "parameters": {"n_max": args.n_max},
        "branch_multisets": branch_multisets,
        "rank_checks": rank_checks,
        "equality_count": equality_count,
        "first_failure": failure_record,
        "smallest_ratio": record(smallest_ratio),
        "smallest_strict_ratio": record(smallest_strict_ratio),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
