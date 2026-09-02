#!/usr/bin/env python3
"""Factor the exceptional group-c reduced kernels in both parities."""

from __future__ import annotations

import json
from pathlib import Path

from derive_path_isolate_p4_affine_parameter_monotonicity_reaggregated_factor_structure import (
    derive,
)


def main() -> None:
    records = [derive("group", parity, "c") for parity in (0, 1)]
    report = {"status": "EXACT_GROUP_C_FACTOR_STRUCTURE", "records": records}
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "group_c_factor_structure_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    for record in records:
        print(
            "parity", record["parity"],
            "L", record["L"]["whole"],
            "L factors", [
                (factor["multiplicity"], factor["term_count"])
                for factor in record["L"]["factors"]
            ],
            "Q", record["Q"]["whole"],
            "Q factors", [
                (factor["multiplicity"], factor["term_count"])
                for factor in record["Q"]["factors"]
            ],
            flush=True,
        )


if __name__ == "__main__":
    main()
