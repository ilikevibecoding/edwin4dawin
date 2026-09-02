#!/usr/bin/env python3
"""Run the exact adjacent-cubic compatibility resultant at one boundary order."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from prove_quartic_minimal_compatibility_resultants import one_boundary


HERE = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--p", type=int, default=15)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.p < 13:
        raise ValueError("reserve-thirteen boundary requires p >= 13")
    record = one_boundary(
        args.p, args.p - 13, require_one_sign=False
    )
    report = {
        "status": "EXACT_QUARTIC_COMPATIBILITY_RESULTANT_BOUNDARY_PROBE",
        "boundary": record,
        "logical_status": (
            "This is an exact theorem at the requested finite boundary "
            "order. It is evidence, not an induction in p."
        ),
    }
    output = args.output or HERE / (
        f"quartic_compatibility_resultant_p{args.p}_probe_20260806.json"
    )
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
