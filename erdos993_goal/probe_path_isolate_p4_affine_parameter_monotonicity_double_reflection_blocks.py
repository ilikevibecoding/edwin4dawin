#!/usr/bin/env python3
"""Test fourfold k/j reflection blocks for affine diagonal increments."""

from __future__ import annotations

import json
from pathlib import Path

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
)
from probe_path_isolate_p4_affine_scaled_excess_local_summands import local
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate


def audit(case):
    package, parity, coordinate, c_value, m_value, x_value, r = case
    sources = (
        group_increment(parity, coordinate)
        if package == "group" else bottom_increment(parity, coordinate)
    )
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    b = (
        2 * m_value + parity - 4
        if package == "group" else 2 * m_value + parity - 5
    )
    target = m_value + r + 5 + int(coordinate == "m")
    d_source = evaluate(to_sparse(sources[0]), c_value, m_value, x_value, target)
    reserve_source = evaluate(to_sparse(sources[1]), c_value, m_value, x_value, target)

    def value(k, j):
        return local(d_source, a, b, r, target, k, j) + r * local(
            reserve_source, a, b, r, target, k, j
        )

    negatives = []
    zeros = 0
    for k in range((b // 2) + 1):
        for j in range((r // 2) + 1):
            block = sum(
                value(kk, jj)
                for kk in {k, b - k}
                for jj in {j, r - j}
            )
            if block < 0:
                negatives.append((k, j, block))
            elif block == 0:
                zeros += 1
    return {
        "case": list(case),
        "b": b,
        "negative_double_reflection_block_count": len(negatives),
        "zero_double_reflection_block_count": zeros,
        "first_negatives": [
            {"k": k, "j": j, "value": value}
            for k, j, value in negatives[:20]
        ],
    }


def main():
    cases = []
    for m_value, x_value in (
        (12, 0), (12, 24), (12, 96),
        (24, 48), (24, 96), (30, 90), (30, 180),
    ):
        for r in (2 * m_value, 3 * m_value):
            cases.extend([
                ("group", 0, "m", 1, m_value, x_value, r),
                ("bottom", 1, "x", 0, m_value, x_value, r),
            ])
    records = []
    for case in cases:
        record = audit(case)
        records.append(record)
        print(
            case[0], case[4], case[5], case[6],
            record["negative_double_reflection_block_count"], flush=True,
        )
    status = (
        "PASS_FINITE_DOUBLE_REFLECTION_BLOCKS"
        if all(
            not record["negative_double_reflection_block_count"]
            for record in records
        ) else "FAIL"
    )
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "double_reflection_blocks_probe_20260802.json"
    ).write_text(
        json.dumps({"status": status, "records": records}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(status)


if __name__ == "__main__":
    main()
