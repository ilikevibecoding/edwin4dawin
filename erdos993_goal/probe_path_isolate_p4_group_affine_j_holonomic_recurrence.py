#!/usr/bin/env python3
"""Probe low-order polynomial recurrences for hard group j-aggregates."""

from __future__ import annotations

import json
from pathlib import Path

from probe_path_isolate_p4_group_affine_j_ratio_rational import (
    PRIMES,
    rank_modulo,
)


SOURCE = Path(
    "path_isolate_p4_group_affine_j_tail_domination_stress_20260801.json"
)
OUTPUT = Path(
    "path_isolate_p4_group_affine_j_holonomic_recurrence_probe_20260801.json"
)


def audit_pair(start: int, values: list[int], order: int, degree: int) -> dict:
    equation_count = len(values) - order
    column_count = (order + 1) * (degree + 1)
    if equation_count < column_count:
        return {
            "order": order,
            "degree": degree,
            "equation_count": equation_count,
            "column_count": column_count,
            "testable": False,
        }
    nullities = []
    for prime in PRIMES:
        matrix = []
        for offset in range(equation_count):
            j_value = start + offset
            row = []
            for shift in range(order + 1):
                value = values[offset + shift] % prime
                row.extend(
                    value * pow(j_value, power, prime) % prime
                    for power in range(degree + 1)
                )
            matrix.append(row)
        nullities.append(column_count - rank_modulo(matrix, prime))
    return {
        "order": order,
        "degree": degree,
        "equation_count": equation_count,
        "column_count": column_count,
        "testable": True,
        "nullities_by_prime": dict(zip(map(str, PRIMES), nullities)),
        "candidate_recurrence": min(nullities) > 0,
    }


def main() -> None:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    records = []
    for item in source["records"][:6]:
        values = list(map(int, item["dominating_block_values"]))
        start = int(item["dominating_block_start"])
        audits = []
        for order in range(2, 7):
            for degree in range(13):
                result = audit_pair(start, values, order, degree)
                if result["testable"]:
                    audits.append(result)
        candidates = [audit for audit in audits if audit["candidate_recurrence"]]
        record = {
            key: item[key] for key in ("parity", "c", "m", "x", "r")
        }
        record.update(
            {
                "block_start": start,
                "block_length": len(values),
                "tested_pair_count": len(audits),
                "candidate_count": len(candidates),
                "candidates": candidates,
            }
        )
        records.append(record)
        print(record, flush=True)
    report = {
        "status": "PROBE",
        "case_count": len(records),
        "candidate_case_count": sum(item["candidate_count"] > 0 for item in records),
        "orders_tested": [2, 3, 4, 5, 6],
        "maximum_degree_requested": 12,
        "records": records,
        "warning": (
            "Full modular rank rules out the indicated recurrence class over "
            "the rationals. Rank deficiency is only a candidate until an exact "
            "symbolic recurrence is reconstructed and verified."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
