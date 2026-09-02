#!/usr/bin/env python3
"""Measure the generalized interlacing defect at the ten-family ray."""

from __future__ import annotations

import json
from pathlib import Path

from flint import ctx

from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_interlacing import (
    audit_case,
)


def main() -> None:
    ctx.prec = 80
    cases = [
        ("group", 0, "x", 1, 60, 120, 90),
        ("group", 0, "m", 1, 60, 120, 90),
        ("bottom", 1, "x", 0, 60, 120, 90),
    ]
    records = []
    for case in cases:
        record = audit_case(*case)
        records.append(record)
        print(
            record["package"], record["parity"], record["coordinate"],
            record["combined_nonreal_root_count"],
            record["same_label_adjacency_count"],
            record["maximum_same_polynomial_run_length"],
            flush=True,
        )
    report = {
        "status": "PROBE_GENERALIZED_INTERLACING",
        "records": records,
        "warning": "Finite certified root balls only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "generalized_interlacing_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
