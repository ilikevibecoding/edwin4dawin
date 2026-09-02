#!/usr/bin/env python3
"""Stress direct lambda=1 southwest entry on the difficult rays."""

from __future__ import annotations

import json
from pathlib import Path

from probe_path_isolate_p4_affine_parameter_monotonicity_endpoint_southwest_entry import (
    audit_case,
)


def main() -> None:
    records = []
    for m_value in (3, 6, 12, 24, 48):
        x_value = 2 * m_value
        records.append(
            audit_case(
                "group", 0, "m", 1, m_value, x_value, 1, 1,
                maximum_r=100,
            )
        )
        print(
            "group", m_value, records[-1]["entry_order"],
            records[-1]["pre_entry_central_failure_count"], flush=True,
        )
        records.append(
            audit_case(
                "bottom", 1, "x", 0, m_value, x_value, 1, 1,
                maximum_r=100,
            )
        )
        print(
            "bottom", m_value, records[-1]["entry_order"],
            records[-1]["pre_entry_central_failure_count"], flush=True,
        )
    report = {
        "status": "PASS_FINITE_LAMBDA1_SOUTHWEST_RAYS"
        if all(record["all_orders_certified"] for record in records)
        else "FAIL",
        "case_count": len(records),
        "maximum_entry_order": max(
            (record["entry_order"] or 0) for record in records
        ),
        "all_entries_before_2m": all(
            record["entry_order"] is not None
            and record["entry_order"] < 2 * record["m"]
            for record in records
        ),
        "negative_central_count": sum(
            record["pre_entry_central_failure_count"] for record in records
        ),
        "records": records,
        "warning": "Finite parameter rays; propagation is exact for every later r.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_lambda1_"
        "southwest_rays_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
