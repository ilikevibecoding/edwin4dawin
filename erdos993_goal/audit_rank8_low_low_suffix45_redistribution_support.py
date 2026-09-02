#!/usr/bin/env python3
"""Independent support and directional-payment audit for the suffix45 grid."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from probe_rank8_low_low_full_early_suffix5_a5_b5_cell_flint import PAYMENT_MASKS


ROOT = Path(__file__).resolve().parent
EARLY_REPORT = ROOT / "rank8_low_low_full_early_core_amgm_exact_20260821.json"
REPORT = ROOT / "rank8_low_low_suffix45_redistribution_support_audit_20260822.json"
EXPECTED_EARLY = "B563CA6C6A7B18254CA17AA5B92DB67EA899BA4F3B2FA5D172301A8A0CD2ED96"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    assert sha256(EARLY_REPORT) == EXPECTED_EARLY
    early = json.loads(EARLY_REPORT.read_text(encoding="utf-8"))
    rows = {row["bernstein_target"]: row for row in early["rows"]}

    # A suffix-4/5 total occurs in ratios 0,...,5.  Each factor-row entry is a
    # product of distinct ratios, so its degree in its own total is at most 6.
    factor_row_total_degree = 6
    quadratic_auxiliary_left = 2 * factor_row_total_degree
    quadratic_auxiliary_right = 2 * factor_row_total_degree
    # The strong row has one additional left capacity ratio and no additional
    # right factor.
    strong_left = quadratic_auxiliary_left + 1
    strong_right = quadratic_auxiliary_right
    assert (strong_left, strong_right) == (13, 12)

    selected_payment_bounds = {}
    for label, masks in PAYMENT_MASKS.items():
        selected_payment_bounds[label] = {}
        allocations = rows[label]["allocations"]
        for side, exponent_index in (("left", 1), ("right", 2)):
            selected = [
                allocation for index, allocation in enumerate(allocations)
                if masks[side] & (1 << index)
            ]
            powers = [
                int(monomial[exponent_index])
                for allocation in selected
                for monomial in (
                    allocation["negative_monomial"],
                    allocation["source_low"]["monomial"],
                    allocation["source_high"]["monomial"],
                )
            ]
            selected_payment_bounds[label][side] = {
                "selected_allocations": len(selected),
                "maximum_total_suffix_degree": max(powers, default=0),
            }
    assert max(
        item["left"]["maximum_total_suffix_degree"]
        for item in selected_payment_bounds.values()
    ) <= strong_left
    assert max(
        item["right"]["maximum_total_suffix_degree"]
        for item in selected_payment_bounds.values()
    ) <= strong_right

    payload = {
        "schema": "rank8-low-low-suffix45-redistribution-support-audit-v1",
        "status": "PASS_INDEPENDENT_SUFFIX45_REDISTRIBUTION_SUPPORT_AUDIT",
        "factor_row_total_suffix_degree": factor_row_total_degree,
        "raw_auxiliary_support": {
            "curvature": {"U": [0, 12], "W": [0, 12]},
            "strong": {"U": [0, strong_left], "W": [0, strong_right]},
        },
        "complete_grid_support": {"U": [0, 13], "W": [0, 12]},
        "selected_payment_bounds": selected_payment_bounds,
        "unselected_payment_rule": (
            "An unselected directional terminal contains no U or W, so its "
            "outer total-slack degree is zero."
        ),
        "immutable_inputs": {EARLY_REPORT.name: EXPECTED_EARLY},
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
