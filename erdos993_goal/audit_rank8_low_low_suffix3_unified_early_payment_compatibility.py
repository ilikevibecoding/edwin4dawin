#!/usr/bin/env python3
"""Audit compatibility of the zero-slack and full-early AM-GM payments."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from probe_rank8_low_low_full_early_suffix45_cell_flint import PAYMENT_MASKS


ROOT = Path(__file__).resolve().parent
EARLY = ROOT / "rank8_low_low_full_early_core_amgm_exact_20260821.json"
CURVATURE = ROOT / "rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json"
STRONG = ROOT / "rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json"
EXPECTED = {
    EARLY.name: "B563CA6C6A7B18254CA17AA5B92DB67EA899BA4F3B2FA5D172301A8A0CD2ED96",
    CURVATURE.name: "E90CD40EDDE350EFAF23DB9738964146C0C5358CB2893560313772D1A9CB1C4C",
    STRONG.name: "8C390F8C24F663B551B63D0E80FA9DF8894A2759D06DE5EA181CFB1E26636911",
}
OUTPUT = ROOT / "rank8_low_low_suffix3_unified_early_payment_compatibility_audit_20260822.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def payload(allocation, scale=1):
    return {
        "negative_monomial": list(map(int, allocation["negative_monomial"][:3])),
        "demand": scale * int(allocation["demand"]),
        "source_low": {
            "monomial": list(map(int, allocation["source_low"]["monomial"][:3])),
            "capacity": scale * int(allocation["source_low"]["capacity"]),
        },
        "source_high": {
            "monomial": list(map(int, allocation["source_high"]["monomial"][:3])),
            "capacity": scale * int(allocation["source_high"]["capacity"]),
        },
    }


def validate_amgm(allocation):
    low = list(map(int, allocation["source_low"]["monomial"]))
    high = list(map(int, allocation["source_high"]["monomial"]))
    negative = list(map(int, allocation["negative_monomial"]))
    assert [a + b for a, b in zip(low, high)] == [2 * n for n in negative]
    c_low = int(allocation["source_low"]["capacity"])
    c_high = int(allocation["source_high"]["capacity"])
    demand = int(allocation["demand"])
    assert int(allocation["four_product"]) == 4 * c_low * c_high
    assert int(allocation["demand_squared"]) == demand * demand
    assert int(allocation["slack"]) == 4 * c_low * c_high - demand * demand
    assert int(allocation["slack"]) >= 0


def main():
    actual = {path.name: sha256(path) for path in (EARLY, CURVATURE, STRONG)}
    assert actual == EXPECTED
    early = json.loads(EARLY.read_text(encoding="utf-8"))
    curvature = json.loads(CURVATURE.read_text(encoding="utf-8"))
    strong = json.loads(STRONG.read_text(encoding="utf-8"))
    early_rows = {row["bernstein_target"]: row["allocations"] for row in early["rows"]}
    strong_rows = {row["bernstein_coefficient"]: row["allocations"] for row in strong["rows"]}
    cases = (
        ("curvature_far", curvature["allocations"], 1, (0, 3)),
        ("strong_middle_times_4", strong_rows["middle_times_2"], 2, (63, 0)),
        ("strong_far", strong_rows["far"], 1, (693, 330)),
    )
    expected_counts = {
        "curvature_far": (2, 2, 0),
        "strong_middle_times_4": (6, 5, 1),
        "strong_far": (10, 9, 1),
    }
    output_rows = []
    all_early_allocations_checked = 0
    for allocations in early_rows.values():
        for allocation in allocations:
            validate_amgm(allocation)
            all_early_allocations_checked += 1

    for label, zero_rows, scale, zero_masks in cases:
        early_rows_for_label = early_rows[label]
        trailing = [
            (index, allocation)
            for index, allocation in enumerate(early_rows_for_label)
            if sum(map(int, allocation["negative_monomial"][3:])) == 0
        ]
        mappings = []
        exact = alternate = 0
        for zero_index, zero_allocation in enumerate(zero_rows):
            zero_negative = list(map(int, zero_allocation["negative_monomial"]))
            zero_demand = scale * int(zero_allocation["demand"])
            matches = [
                (index, allocation) for index, allocation in trailing
                if list(map(int, allocation["negative_monomial"][:3])) == zero_negative
                and int(allocation["demand"]) == zero_demand
            ]
            assert len(matches) == 1
            early_index, early_allocation = matches[0]
            early_masks = PAYMENT_MASKS[label]
            mask_comparison = {
                "zero_left": (zero_masks[0] >> zero_index) & 1,
                "zero_right": (zero_masks[1] >> zero_index) & 1,
                "early_left": (early_masks["left"] >> early_index) & 1,
                "early_right": (early_masks["right"] >> early_index) & 1,
            }
            assert mask_comparison["zero_left"] == mask_comparison["early_left"]
            assert mask_comparison["zero_right"] == mask_comparison["early_right"]
            zero_payload = payload(zero_allocation, scale)
            early_payload = payload(early_allocation)
            source_pair_exact = zero_payload == early_payload
            if source_pair_exact:
                exact += 1
            else:
                alternate += 1
                assert zero_negative == [5, 1, 11]
                assert zero_payload["negative_monomial"] == early_payload["negative_monomial"]
                assert zero_payload["demand"] == early_payload["demand"]
            mappings.append({
                "zero_index": zero_index,
                "early_index": early_index,
                "negative_monomial": zero_negative,
                "scaled_demand": zero_demand,
                "source_pair_exact": source_pair_exact,
                "mask_comparison": mask_comparison,
                "alternate_source_pairs": None if source_pair_exact else {
                    "zero_slack_scaled": zero_payload,
                    "full_early": early_payload,
                },
            })
        assert len(trailing) == len(zero_rows)
        assert (len(mappings), exact, alternate) == expected_counts[label]
        output_rows.append({
            "auxiliary": label,
            "zero_slack_scale": scale,
            "trailing_zero_allocations": len(trailing),
            "exact_source_pairs": exact,
            "alternate_valid_source_pairs": alternate,
            "mappings": mappings,
        })

    report = {
        "schema": "rank8-low-low-suffix3-unified-early-payment-compatibility-v1",
        "status": "PASS_EXACT_PAYMENT_COMPATIBILITY_AUDIT",
        "meaning": (
            "Every zero-slack allocation is the trailing-early-zero specialization "
            "of a full-early allocation with the same demand and directional mask. "
            "All source pairs agree except the final strong allocation, where both "
            "certificates use a valid midpoint pair for the same negative monomial."
        ),
        "rows": output_rows,
        "all_full_early_amgm_allocations_checked": all_early_allocations_checked,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report), flush=True)


if __name__ == "__main__":
    main()
