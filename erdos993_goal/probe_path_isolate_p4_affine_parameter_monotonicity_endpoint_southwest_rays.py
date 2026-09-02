#!/usr/bin/env python3
"""Stress endpoint southwest-square entry on the two difficult rays."""

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
        for endpoint in ((2, 3), (3, 2)):
            records.append(
                audit_case(
                    "group", 0, "m", 1, m_value, x_value, *endpoint,
                    maximum_r=100,
                )
            )
            print(
                "group", m_value, endpoint, records[-1]["entry_order"],
                records[-1]["pre_entry_central_failure_count"],
                records[-1]["pre_entry_central_zero_orders"], flush=True,
            )
            records.append(
                audit_case(
                    "bottom", 1, "x", 0, m_value, x_value, *endpoint,
                    maximum_r=100,
                )
            )
            print(
                "bottom", m_value, endpoint, records[-1]["entry_order"],
                records[-1]["pre_entry_central_failure_count"],
                records[-1]["pre_entry_central_zero_orders"], flush=True,
            )
    report = {
        "status": "PASS_FINITE_ENDPOINT_SOUTHWEST_RAYS"
        if all(record["all_orders_certified"] for record in records)
        else "FAIL",
        "case_count": len(records),
        "maximum_entry_order": max(
            (record["entry_order"] or 0) for record in records
        ),
        "negative_central_count": sum(
            record["pre_entry_central_failure_count"] for record in records
        ),
        "central_zero_count": sum(
            len(record["pre_entry_central_zero_orders"]) for record in records
        ),
        "records": records,
        "warning": "Finite parameter rays; propagation is exact for every r.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_endpoint_"
        "southwest_rays_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
