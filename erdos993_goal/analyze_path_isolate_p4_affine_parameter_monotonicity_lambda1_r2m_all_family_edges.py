#!/usr/bin/env python3
"""Audit the r=2m half-reserve edge lemma in all ten affine families."""

from __future__ import annotations

import json
from pathlib import Path

from analyze_path_isolate_p4_affine_parameter_monotonicity_lambda1_r2m_edges import (
    audit,
)


def main() -> None:
    records = []
    m_value, x_value = 12, 24
    for parity in (0, 1):
        for coordinate in ("x", "c", "m"):
            record = audit(
                "group", parity, coordinate, 1, m_value, x_value
            )
            records.append(record)
            print(
                "group", parity, coordinate,
                record["half_reserve_negative_count"],
                record["maximum_utilization"], flush=True,
            )
        for coordinate in ("x", "m"):
            record = audit(
                "bottom", parity, coordinate, 0, m_value, x_value
            )
            records.append(record)
            print(
                "bottom", parity, coordinate,
                record["half_reserve_negative_count"],
                record["maximum_utilization"], flush=True,
            )
    failures = [
        record for record in records
        if record["half_reserve_negative_count"]
        or record["ordinary_log_concavity_failure_count"]
    ]
    report = {
        "status": "PASS_FINITE_ALL_FAMILY_R2M_EDGES" if not failures else "FAIL",
        "case_count": len(records),
        "failure_count": len(failures),
        "records": records,
        "warning": "One finite parameter point; exact complete edges.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_lambda1_"
        "r2m_all_family_edges_analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
