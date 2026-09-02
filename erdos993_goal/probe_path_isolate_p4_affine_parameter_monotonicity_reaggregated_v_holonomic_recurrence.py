#!/usr/bin/env python3
"""Probe compact recurrences for saved reaggregated far-ray sequences."""

from __future__ import annotations

import json
from pathlib import Path

from probe_path_isolate_p4_group_affine_j_holonomic_recurrence import audit_pair


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
        for order in range(1, 7):
            maximum_degree = 20 if order == 1 else 12
            for degree in range(maximum_degree + 1):
                audit = audit_pair(0, item["combined_values"], order, degree)
                if audit["testable"]:
                    audits.append(audit)
        candidates = [audit for audit in audits if audit["candidate_recurrence"]]
        record = {
            "package": item["package"],
            "parity": item["parity"],
            "coordinate": item["coordinate"],
            "m": item["m"],
            "x": item["x"],
            "r": item["r"],
            "sequence_length": len(item["combined_values"]),
            "tested_pair_count": len(audits),
            "candidate_count": len(candidates),
            "candidates": candidates,
        }
        records.append(record)
        print(record, flush=True)
    report = {
        "status": "COMPACT_RECURRENCE_CANDIDATE"
        if any(record["candidate_count"] for record in records)
        else "NO_COMPACT_RECURRENCE_IN_TESTED_CLASS",
        "records": records,
        "warning": (
            "Full modular rank excludes only the stated finite recurrence class. "
            "A rank deficiency would still require exact reconstruction."
        ),
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "holonomic_recurrence_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "case_count": len(records)}, indent=2))


if __name__ == "__main__":
    main()
