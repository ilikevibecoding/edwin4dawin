#!/usr/bin/env python3
"""Verify local ULC and the diagonal-reserve reduction exactly."""

from __future__ import annotations

from fractions import Fraction

from find_min_star_root_pird_failure import build, partitions_with_cost
from scan_star_root_bivariate_slices import conv2, f_matrix


def verify_local_ulc(a_max: int = 200) -> int:
    checks = 0
    for a in range(1, a_max + 1):
        factor = f_matrix(a)
        for d in range(2 * a + 1):
            values = [
                factor[i][d - i]
                if i < len(factor) and 0 <= d - i < len(factor[0])
                else 0
                for i in range(d + 1)
            ]
            assert values == list(reversed(values)), (a, d, values)
            for i in range(1, d):
                left = (
                    values[i]
                    * values[i]
                    * i
                    * (d - i)
                )
                right = (
                    values[i - 1]
                    * values[i + 1]
                    * (i + 1)
                    * (d - i + 1)
                )
                assert left >= right, (a, d, i, values)
                checks += 1
    return checks


def verify_products(order_max: int = 24) -> tuple[int, int, dict | None]:
    instances = 0
    hard_cases = 0
    minimum = None
    for order in range(1, order_max + 1):
        for branches in partitions_with_cost(order - 1):
            instances += 1
            g = [[1]]
            for a in branches:
                g = conv2(g, f_matrix(a))
            k_poly, l_poly, b_poly = build(branches)
            upper = min(len(k_poly) - 2, len(l_poly) - 2)
            for k in range(5, upper + 1):
                central = g[k][k]
                off = g[k - 1][k + 1]
                assert (k + 1) * (central - off) >= central
                if b_poly[k + 1] < b_poly[k]:
                    continue
                debt = (
                    k_poly[k + 1]
                    * (l_poly[k - 1] + l_poly[k - 2])
                    - k_poly[k]
                    * (l_poly[k] + l_poly[k - 1])
                )
                if debt <= 0:
                    continue
                hard_cases += 1
                ratio = Fraction(central, (k + 1) * debt)
                row = {
                    "rooted_tree_order": order,
                    "star_leaf_counts": list(branches),
                    "k": k,
                    "G_kk": central,
                    "debt": debt,
                    "ratio_numerator": ratio.numerator,
                    "ratio_denominator": ratio.denominator,
                    "ratio_decimal": float(ratio),
                }
                if minimum is None or ratio < Fraction(
                    minimum["ratio_numerator"],
                    minimum["ratio_denominator"],
                ):
                    minimum = row
                assert ratio >= 1, row
    return instances, hard_cases, minimum


def main() -> int:
    local_checks = verify_local_ulc()
    instances, hard_cases, minimum = verify_products()
    print(
        f"PASS: {local_checks:,} local ULC inequalities; "
        f"{instances:,} branch multisets; {hard_cases:,} adverse "
        f"diagonal-reserve cases"
    )
    print(f"minimum={minimum}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
