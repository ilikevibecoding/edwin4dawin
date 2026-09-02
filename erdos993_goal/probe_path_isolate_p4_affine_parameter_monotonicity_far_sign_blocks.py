#!/usr/bin/env python3
"""Record exact j sequences for the first two far-ray sign-block changes."""

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
    cases = [
        (
            "group", 0, "m", 1, 90, 180, 120,
            group_sources(0)["m"],
        ),
        (
            "bottom", 1, "x", 0, 120, 240, 180,
            bottom_sources(1)["x"],
        ),
    ]
    records = []
    for package, parity, coordinate, c_value, m_value, x_value, r, sources in cases:
        record = audit_components(
            package, parity, coordinate, c_value, m_value, x_value, r,
            *sources,
            store_sequence=True,
        )
        records.append(record)
        print(
            package, parity, coordinate, m_value, x_value, r,
            record["nonzero_sign_block_count"], record["sign_blocks"],
            record["signed_ultra_log_concavity_failure_count"],
            flush=True,
        )
    report = {
        "status": "PROBE",
        "case_count": len(records),
        "records": records,
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_far_sign_blocks_"
        "probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "case_count": len(records)}, indent=2))


if __name__ == "__main__":
    main()
