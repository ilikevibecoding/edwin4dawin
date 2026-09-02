#!/usr/bin/env python3
"""Audit the exact embedding of zero-slack payments in the early-core payments."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from probe_rank8_low_low_full_early_suffix45_cell_flint import PAYMENT_MASKS


ROOT = Path(__file__).resolve().parent
EARLY = ROOT / "rank8_low_low_full_early_core_amgm_exact_20260821.json"
CURVATURE = ROOT / "rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json"
STRONG = ROOT / "rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json"
REPORT = ROOT / "rank8_low_low_early_suffix_payment_compatibility_exact_20260822.json"
EXPECTED = {
    EARLY.name: "B563CA6C6A7B18254CA17AA5B92DB67EA899BA4F3B2FA5D172301A8A0CD2ED96",
    CURVATURE.name: "E90CD40EDDE350EFAF23DB9738964146C0C5358CB2893560313772D1A9CB1C4C",
    STRONG.name: "8C390F8C24F663B551B63D0E80FA9DF8894A2759D06DE5EA181CFB1E26636911",
}
COMPARISONS = (
    ("curvature_far", "curvature_far", 1, (0, 3)),
    ("strong_middle_times_4", "middle_times_2", 2, (63, 0)),
    ("strong_far", "far", 1, (693, 330)),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def strip_early_zeros(monomial):
    assert len(monomial) == 7 and monomial[3:] == [0, 0, 0, 0]
    return monomial[:3]


def normalized_early(allocation, scale):
    assert allocation["demand"] % scale == 0
    assert allocation["source_low"]["capacity"] % scale == 0
    assert allocation["source_high"]["capacity"] % scale == 0
    assert allocation["four_product"] % (scale * scale) == 0
    assert allocation["demand_squared"] % (scale * scale) == 0
    assert allocation["slack"] % (scale * scale) == 0
    return {
        "negative_monomial": strip_early_zeros(allocation["negative_monomial"]),
        "demand": allocation["demand"] // scale,
        "source_low": {
            "monomial": strip_early_zeros(allocation["source_low"]["monomial"]),
            "capacity": allocation["source_low"]["capacity"] // scale,
        },
        "source_high": {
            "monomial": strip_early_zeros(allocation["source_high"]["monomial"]),
            "capacity": allocation["source_high"]["capacity"] // scale,
        },
        "four_product": allocation["four_product"] // (scale * scale),
        "demand_squared": allocation["demand_squared"] // (scale * scale),
        "slack": allocation["slack"] // (scale * scale),
    }


def main() -> None:
    assert {path.name: sha256(path) for path in (EARLY, CURVATURE, STRONG)} == EXPECTED
    early = json.loads(EARLY.read_text(encoding="utf-8"))
    curvature = json.loads(CURVATURE.read_text(encoding="utf-8"))
    strong = json.loads(STRONG.read_text(encoding="utf-8"))
    early_rows = {row["bernstein_target"]: row for row in early["rows"]}
    zero_rows = {
        "curvature_far": curvature,
        **{row["bernstein_coefficient"]: row for row in strong["rows"]},
    }

    rows = []
    for early_label, zero_label, scale, zero_masks in COMPARISONS:
        allocations = early_rows[early_label]["allocations"]
        embedded = [
            (index, allocation)
            for index, allocation in enumerate(allocations)
            if allocation["negative_monomial"][3:] == [0, 0, 0, 0]
        ]
        zero_allocations = zero_rows[zero_label]["allocations"]
        assert len(embedded) == len(zero_allocations)
        early_masks = PAYMENT_MASKS[early_label]
        matched_indices = []
        exact_source_matches = 0
        alternate_source_matches = 0
        for zero_index, expected_allocation in enumerate(zero_allocations):
            exact = [
                (early_index, allocation)
                for early_index, allocation in embedded
                if normalized_early(allocation, scale) == expected_allocation
            ]
            if exact:
                assert len(exact) == 1
                early_index, allocation = exact[0]
                exact_source_matches += 1
            else:
                compatible = []
                for early_index, allocation in embedded:
                    normalized = normalized_early(allocation, scale)
                    if (
                        normalized["negative_monomial"]
                        == expected_allocation["negative_monomial"]
                        and normalized["demand"] == expected_allocation["demand"]
                    ):
                        compatible.append((early_index, allocation))
                assert len(compatible) == 1
                early_index, allocation = compatible[0]
                alternate_source_matches += 1
            assert bool(early_masks["left"] & (1 << early_index)) == bool(
                zero_masks[0] & (1 << zero_index)
            )
            assert bool(early_masks["right"] & (1 << early_index)) == bool(
                zero_masks[1] & (1 << zero_index)
            )
            matched_indices.append(early_index)
        rows.append({
            "early_label": early_label,
            "zero_slack_label": zero_label,
            "coefficient_scale": scale,
            "early_allocation_count": len(allocations),
            "embedded_zero_slack_count": len(embedded),
            "embedded_early_indices": matched_indices,
            "exact_source_pair_matches": exact_source_matches,
            "alternate_source_pair_matches": alternate_source_matches,
            "left_mask_agrees": True,
            "right_mask_agrees": True,
            "negative_monomials_and_demands_agree": True,
        })

    payload = {
        "schema": "rank8-low-low-early-suffix-payment-compatibility-v1",
        "status": "PASS_EXACT_EARLY_SUFFIX_PAYMENT_COMPATIBILITY_WITH_ALTERNATE_SOURCES",
        "theorem": (
            "The zero-slack and early-core payments have identical negative "
            "monomials, demands, and directional masks after trailing-zero "
            "removal and the strong-middle factor-two scaling. Curvature has "
            "two of two identical source pairs; strong-middle has five of six "
            "and strong-far nine of ten. The final strong block in each row "
            "uses an alternate valid source pair."
        ),
        "rows": rows,
        "scope_warning": (
            "This compatibility identity identifies a canonical unified payment "
            "candidate; it does not by itself prove that all additional lifted "
            "early blocks leave a coefficientwise nonnegative residual."
        ),
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
