#!/usr/bin/env python3
"""Probe refined tail shape farther along the two apparent worst rays."""

from __future__ import annotations

import json
from pathlib import Path

from probe_path_isolate_p4_affine_parameter_monotonicity_tail_shape import (
    bottom_sources,
    group_sources,
)
from stress_path_isolate_p4_affine_parameter_monotonicity_large_rays import (
    audit_components,
)


def main() -> None:
    sources = {
        ("group", 0): group_sources(0),
        ("bottom", 1): bottom_sources(1),
    }
    requested = []
    for m_value in (90, 120):
        requested.extend((
            ("group", 0, "m", 1, m_value, 2 * m_value, 4 * m_value // 3),
            ("bottom", 1, "x", 0, m_value, 2 * m_value, 3 * m_value // 2),
        ))

    records = []
    for package, parity, coordinate, c_value, m_value, x_value, r in requested:
        record = audit_components(
            package, parity, coordinate, c_value, m_value, x_value, r,
            *sources[(package, parity)][coordinate],
            compute_roots=True,
        )
        records.append(record)
        tail = record["full_tail"]
        print(
            package, parity, coordinate, m_value, x_value, r,
            tail["negative_count"], tail["magnitude_peak_offset"],
            tail["magnitude_log_concavity_failure_count"],
            tail["tail_debt_over_peak"], tail["peak_over_preceding_two"],
            record["signed_ultra_log_concavity_failure_count"],
            flush=True,
        )

    report = {
        "status": "PROBE",
        "case_count": len(records),
        "maximum_tail_debt_over_peak": max(
            record["full_tail"]["tail_debt_over_peak"] or 0.0
            for record in records
        ),
        "maximum_peak_over_preceding_two": max(
            record["full_tail"].get("peak_over_preceding_two") or 0.0
            for record in records
        ),
        "maximum_log_concavity_failure_count": max(
            record["full_tail"]["magnitude_log_concavity_failure_count"]
            for record in records
        ),
        "maximum_signed_ultra_log_concavity_failure_count": max(
            record["signed_ultra_log_concavity_failure_count"]
            for record in records
        ),
        "records": records,
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_tail_shape_"
        "large_asymptotic_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        key: value for key, value in report.items() if key != "records"
    }, indent=2))


if __name__ == "__main__":
    main()
