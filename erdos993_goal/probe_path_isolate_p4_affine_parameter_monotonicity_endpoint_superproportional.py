#!/usr/bin/env python3
"""Probe reciprocal endpoint squares on super-proportional hard rays."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from probe_path_isolate_p4_affine_parameter_monotonicity_endpoint_southwest_entry import (
    audit_case,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m", type=int, default=12)
    parser.add_argument("--x-multiplier", type=int, default=8)
    parser.add_argument("--maximum-r", type=int)
    args = parser.parse_args()
    m_value = args.m
    x_value = args.x_multiplier * m_value
    maximum_r = args.maximum_r or 2 * m_value
    records = []
    for endpoint in ((2, 3), (3, 2)):
        for package, parity, coordinate, c_value in (
            ("group", 0, "m", 1),
            ("bottom", 1, "x", 0),
        ):
            record = audit_case(
                package, parity, coordinate, c_value, m_value, x_value,
                *endpoint, maximum_r=maximum_r,
            )
            records.append(record)
            print(
                package, record["lambda"], record["entry_order"],
                record["pre_entry_central_failure_count"],
                record["negative_counts"][-1], flush=True,
            )
    report = {
        "status": "EXACT_FINITE_PROBE",
        "m": m_value,
        "x": x_value,
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_endpoint_"
        f"superproportional_m{m_value}_x{x_value}_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
