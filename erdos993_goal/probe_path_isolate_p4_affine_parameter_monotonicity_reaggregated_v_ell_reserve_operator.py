#!/usr/bin/env python3
"""Probe a compact banded operator taking reserve coefficients to L coefficients."""

from __future__ import annotations

import json
from pathlib import Path

from probe_path_isolate_p4_group_affine_j_ratio_rational import PRIMES, rank_modulo


def audit(ell: list[int], reserve: list[int], radius: int, degree: int) -> dict:
    column_count = (2 * radius + 1) * (degree + 1)
    equation_count = len(ell)
    if equation_count < column_count + 5:
        return {"testable": False, "radius": radius, "degree": degree}
    consistent = []
    nullities = []
    for prime in PRIMES:
        matrix = []
        augmented = []
        for j_value, target in enumerate(ell):
            row = []
            for shift in range(-radius, radius + 1):
                index = j_value + shift
                value = reserve[index] % prime if 0 <= index < len(reserve) else 0
                row.extend(
                    value * pow(j_value, power, prime) % prime
                    for power in range(degree + 1)
                )
            matrix.append(row)
            augmented.append(row + [target % prime])
        rank = rank_modulo(matrix, prime)
        augmented_rank = rank_modulo(augmented, prime)
        consistent.append(rank == augmented_rank)
        nullities.append(column_count - rank)
    return {
        "testable": True,
        "radius": radius,
        "degree": degree,
        "equation_count": equation_count,
        "column_count": column_count,
        "consistent_by_prime": dict(zip(map(str, PRIMES), consistent)),
        "nullity_by_prime": dict(zip(map(str, PRIMES), nullities)),
        "candidate_operator": all(consistent),
    }


def main() -> None:
    source = Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "interlacing_probe_20260802.json"
    )
    data = json.loads(source.read_text(encoding="utf-8"))
    records = []
    for item in data["records"]:
        if item["m"] < 90:
            continue
        audits = []
        for radius in range(5):
            for degree in range(13):
                result = audit(item["ell_values"], item["reserve_values"], radius, degree)
                if result["testable"]:
                    audits.append(result)
        candidates = [result for result in audits if result["candidate_operator"]]
        record = {
            "package": item["package"],
            "parity": item["parity"],
            "coordinate": item["coordinate"],
            "m": item["m"],
            "x": item["x"],
            "r": item["r"],
            "tested_pair_count": len(audits),
            "candidate_count": len(candidates),
            "candidates": candidates,
        }
        records.append(record)
        print(record, flush=True)
    report = {
        "status": "BANDED_OPERATOR_CANDIDATE"
        if any(record["candidate_count"] for record in records)
        else "NO_BANDED_OPERATOR_IN_TESTED_CLASS",
        "records": records,
        "warning": "Modular consistency is only a candidate until exact reconstruction.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "ell_reserve_operator_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "case_count": len(records)}, indent=2))


if __name__ == "__main__":
    main()
