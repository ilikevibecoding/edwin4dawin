#!/usr/bin/env python3
"""Rule out low-degree rational ratios for hard group j-aggregate blocks.

For proposed degrees (p,q), a ratio J_(j+1)/J_j=P(j)/Q(j) gives a
homogeneous linear system in the coefficients of P and Q.  Full column rank
modulo one prime proves that the system has no nonzero rational solution.
"""

from __future__ import annotations

import json
from pathlib import Path

SOURCE = Path(
    "path_isolate_p4_group_affine_j_tail_domination_stress_20260801.json"
)
OUTPUT = Path(
    "path_isolate_p4_group_affine_j_ratio_rational_probe_20260801.json"
)


PRIMES = (1_000_000_007, 1_000_000_009, 998_244_353)


def rank_modulo(matrix: list[list[int]], prime: int) -> int:
    rows = [row[:] for row in matrix]
    row_count = len(rows)
    column_count = len(rows[0]) if rows else 0
    pivot_row = 0
    for column in range(column_count):
        pivot = next(
            (index for index in range(pivot_row, row_count)
             if rows[index][column] % prime),
            None,
        )
        if pivot is None:
            continue
        rows[pivot_row], rows[pivot] = rows[pivot], rows[pivot_row]
        inverse = pow(rows[pivot_row][column] % prime, -1, prime)
        rows[pivot_row] = [value * inverse % prime for value in rows[pivot_row]]
        for index in range(row_count):
            if index == pivot_row:
                continue
            scalar = rows[index][column] % prime
            if scalar:
                rows[index] = [
                    (left - scalar * right) % prime
                    for left, right in zip(rows[index], rows[pivot_row])
                ]
        pivot_row += 1
        if pivot_row == row_count:
            break
    return pivot_row


def degree_pair_ruled_out(
    points: list[tuple[int, int, int]], numerator_degree: int,
    denominator_degree: int,
) -> tuple[bool, int | None]:
    column_count = numerator_degree + denominator_degree + 2
    if len(points) < column_count:
        return False, None
    for prime in PRIMES:
        if any(denominator % prime == 0 for _, _, denominator in points):
            continue
        matrix = []
        for j_value, numerator, denominator in points:
            ratio = numerator % prime * pow(denominator % prime, -1, prime) % prime
            p_columns = [pow(j_value, degree, prime)
                         for degree in range(numerator_degree + 1)]
            q_columns = [
                -ratio * pow(j_value, degree, prime) % prime
                for degree in range(denominator_degree + 1)
            ]
            matrix.append(p_columns + q_columns)
        if rank_modulo(matrix, prime) == column_count:
            return True, prime
    return False, None


def rule_out_ratios(
    start: int, values: list[int], maximum_total_degree: int = 20
) -> dict:
    points = [
        (start + index, values[index + 1], values[index])
        for index in range(len(values) - 1)
        if values[index] != 0
    ]
    effective_maximum = min(maximum_total_degree, len(points) - 2)
    tested = []
    unresolved = []
    for total in range(max(0, effective_maximum + 1)):
        for numerator_degree in range(total + 1):
            denominator_degree = total - numerator_degree
            ruled_out, prime = degree_pair_ruled_out(
                points, numerator_degree, denominator_degree
            )
            item = {
                "numerator_degree": numerator_degree,
                "denominator_degree": denominator_degree,
            }
            if ruled_out:
                item["certificate_prime"] = prime
                tested.append(item)
            else:
                unresolved.append(item)
    return {
        "ratio_point_count": len(points),
        "maximum_total_degree_requested": maximum_total_degree,
        "maximum_total_degree_testable": effective_maximum,
        "ruled_out_degree_pair_count": len(tested),
        "unresolved_degree_pairs": unresolved,
        "all_requested_degree_pairs_ruled_out": not unresolved,
    }


def main() -> None:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    records = []
    for item in source["records"]:
        values = list(map(int, item["dominating_block_values"]))
        result = (
            rule_out_ratios(int(item["dominating_block_start"]), values)
            if item["dominating_block_start"] is not None and len(values) >= 3
            else None
        )
        record = {
            key: item[key] for key in ("parity", "c", "m", "x", "r")
        }
        record.update(
            {
                "block_start": item["dominating_block_start"],
                "block_length": len(values),
                "modular_rank_audit": result,
            }
        )
        records.append(record)
        print(record, flush=True)
    report = {
        "status": "PROBE",
        "case_count": len(records),
        "all_degree_pairs_ruled_out_count": sum(
            item["modular_rank_audit"] is not None
            and item["modular_rank_audit"]["all_requested_degree_pairs_ruled_out"]
            for item in records
        ),
        "maximum_total_degree": 20,
        "records": records,
        "warning": (
            "Full modular column rank is an exact nonexistence certificate "
            "for that degree pair over the rationals. Short blocks may have "
            "too few ratio points to test every requested degree pair."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
