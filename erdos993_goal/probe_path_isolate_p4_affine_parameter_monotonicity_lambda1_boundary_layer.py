#!/usr/bin/env python3
"""Record the last negative southwest-square layer before lambda=1 entry."""

from __future__ import annotations

import json
from pathlib import Path

from probe_path_isolate_p4_affine_parameter_monotonicity_endpoint_southwest_entry import (
    audit_case,
)


def main() -> None:
    records = []
    for m_value in (12, 24):
        x_value = 2 * m_value
        for package, parity, coordinate, c_value in (
            ("group", 0, "m", 1),
            ("bottom", 1, "x", 0),
        ):
            record = audit_case(
                package, parity, coordinate, c_value,
                m_value, x_value, 1, 1, maximum_r=2 * m_value,
            )
            records.append(record)
            print(
                package, m_value, record["entry_order"],
                record["last_negative_layer"], flush=True,
            )
    report = {
        "status": "PROBE_LAMBDA1_LAST_NEGATIVE_LAYER",
        "records": records,
        "warning": "Finite exact square layers only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_lambda1_"
        "boundary_layer_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
