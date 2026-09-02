#!/usr/bin/env python3
"""Verify the exact one-deep intersection decomposition symbolically."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp


def mask_product(mask, selected, absent):
    value = sp.Integer(1)
    for index in range(len(selected)):
        value *= selected[index] if mask & (1 << index) else absent[index]
    return value


def symbolic_partition(branches: int) -> dict:
    x = sp.symbols("x")
    ax = sp.symbols(f"ax0:{branches}")
    ay = sp.symbols(f"ay0:{branches}")
    rx = sp.symbols(f"rx0:{branches}")
    ry = sp.symbols(f"ry0:{branches}")
    factors = [
        ax[index] * ay[index]
        + rx[index] * ay[index]
        + ax[index] * ry[index]
        for index in range(branches)
    ]

    full_mask = (1 << branches) - 1
    c_y = sp.prod(ay[index] + ry[index] for index in range(branches))
    d_x = sp.prod(ax)

    direct = sp.Integer(0)
    grouped = [sp.Integer(0) for _ in range(1 << branches)]
    closed = []

    for left in range(1 << branches):
        gx = mask_product(left, rx, ax)
        fx = (1 + x) * gx
        if left == 0:
            fx *= 1 + x
        for right in range(1 << branches):
            gy = mask_product(right, ry, ay)
            term = fx * gy
            direct += term
            grouped[left & right] += term

    for intersection in range(1 << branches):
        if intersection == 0:
            expression = (1 + x) * (
                sp.prod(factors) + x * d_x * c_y
            )
        else:
            expression = 1 + x
            for index in range(branches):
                if intersection & (1 << index):
                    expression *= rx[index] * ry[index]
                else:
                    expression *= factors[index]
        closed.append(expression)

    group_checks = [
        sp.expand(grouped[mask] - closed[mask]) == 0
        for mask in range(1 << branches)
    ]
    partition_check = (
        sp.expand(direct - sum(closed, sp.Integer(0))) == 0
    )

    inward_sum = sum(
        closed[mask]
        for mask in range(1 << branches)
        if mask & 1
    )
    inward_closed = (
        (1 + x)
        * rx[0]
        * ry[0]
        * sp.prod(
            (ax[index] + rx[index])
            * (ay[index] + ry[index])
            for index in range(1, branches)
        )
    )
    inward_check = sp.expand(inward_sum - inward_closed) == 0

    # Remove the special correction from the empty group.  The sum
    # over intersections not containing branch zero then factors as
    # F_0 times the two univariate side-branch products.
    no_inward_generic = (
        closed[0] - (1 + x) * x * d_x * c_y
    ) + sum(
        closed[mask]
        for mask in range(1, 1 << branches)
        if not (mask & 1)
    )
    no_inward_closed = (
        (1 + x)
        * factors[0]
        * sp.prod(
            (ax[index] + rx[index])
            * (ay[index] + ry[index])
            for index in range(1, branches)
        )
    )
    no_inward_check = (
        sp.expand(no_inward_generic - no_inward_closed) == 0
    )

    return {
        "branch_count": branches,
        "ordered_subset_pairs": (1 << branches) ** 2,
        "intersection_groups": 1 << branches,
        "all_group_identities": all(group_checks),
        "partition_identity": partition_check,
        "inward_intersection_aggregate": inward_check,
        "no_inward_generic_aggregate": no_inward_check,
    }


def coefficient_identity() -> bool:
    ckm1, ck, ckp1 = sp.symbols("c_km1 c_k c_kp1")
    dkm2, dkm1, dk = sp.symbols("d_km2 d_km1 d_k")
    bkp1 = ckp1 + ck + dk + dkm1
    bk = ck + ckm1 + dkm1 + dkm2
    minor = sp.expand(bkp1 * ck - bk * ckp1)
    claimed = (
        ck**2
        - ckm1 * ckp1
        + ck * (dk + dkm1)
        - ckp1 * (dkm1 + dkm2)
    )
    return sp.expand(minor - claimed) == 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--branches", type=int, default=5)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "one_deep_bivariate_binomial_closure_20260729.json"
        ),
    )
    args = parser.parse_args()
    if args.branches < 1:
        raise ValueError("at least the inward branch is required")

    partition = symbolic_partition(args.branches)
    coefficient = coefficient_identity()
    passed = (
        partition["all_group_identities"]
        and partition["partition_identity"]
        and partition["inward_intersection_aggregate"]
        and partition["no_inward_generic_aggregate"]
        and coefficient
    )
    report = {
        "status": "PASS" if passed else "FAIL",
        "symbolic_partition": partition,
        "pird_coefficient_identity": coefficient,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
