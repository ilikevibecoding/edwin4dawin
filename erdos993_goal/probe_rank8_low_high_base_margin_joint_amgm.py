#!/usr/bin/env python3
"""Probe an exact local AM-GM allocation on the joint payment face.

This is deliberately a scoped diagnostic.  It tests the face with the two
left cumulative variables ``ta,a3`` and the three right low-index slacks
``b0,b1,b2`` retained.  A successful allocation certifies this face only; it
does not by itself prove the full rank-eight low/high cone.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from explore_rank8_low_high_base_margin_payment_faces import build
from verify_rank8_low_high_enlarged_hard_face import exact_local_amgm


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_base_margin_joint_amgm_probe_20260820.json"
LIVE = ("h", "ta", "a3", "tb", "b0", "b1", "b2")


def statistics(coefficients: dict[tuple[int, ...], int]) -> dict[str, int]:
    values = list(coefficients.values())
    return {
        "terms": len(values),
        "negative": sum(value < 0 for value in values),
        "zero": sum(value == 0 for value in values),
        "positive": sum(value > 0 for value in values),
        "minimum": min(values),
        "maximum": max(values),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--maximum-transfer", type=int, default=3)
    args = parser.parse_args()

    polynomial, names = build(LIVE)
    assert tuple(names) == LIVE
    coefficients = {
        tuple(int(value) for value in monomial): int(coefficient)
        for monomial, coefficient in polynomial.terms()
    }
    allocation = exact_local_amgm(
        coefficients,
        maximum_transfer=args.maximum_transfer,
    )
    payload = {
        "schema": "rank8-low-high-base-margin-joint-amgm-probe-v1",
        "status": "PASS_EXACT_SCOPED_RANK8_LOW_HIGH_BASE_MARGIN_JOINT_AMGM",
        "variables": list(names),
        "polynomial": "M0-7!*8!*h*p1*p2*Kq(1,2)",
        "statistics": statistics(coefficients),
        "allocation": allocation,
        "scope_warning": (
            "This certifies only the joint face with live variables "
            "h,ta,a3,tb,b0,b1,b2; it is not the full low/high theorem."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(payload["statistics"])
    print(
        "AMGM",
        allocation["blocks"],
        allocation["minimum_quadratic_slack"],
        allocation["smallest_source_remainder"],
    )
    print("REPORT", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
