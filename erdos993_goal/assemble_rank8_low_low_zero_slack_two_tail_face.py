#!/usr/bin/env python3
"""Assemble the exact rank-eight low/low terminal zero-slack face theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_low_zero_slack_two_tail_face_exact_20260821.json"
EXPECTED = {
    "rank8_low_low_double_tail_reduction_exact_20260820.json":
        "1DB764EF5B9600A4C69550D26662A3B6C441B709BEC02484465923B9B4C566BC",
    "rank8_low_low_double_tail_reduction_independent_audit_exact_20260820.json":
        "34F75B0E1185B86AD946988898099ED7A1E93C8A780B4AFBAF03D342FDAA2ABF",
    "rank8_low_low_auxiliaries_zero_slack_exact_20260820.json":
        "1B65DE54AA8F236B3E7731E09844D19EC75D58C6B8AD2EF3DEF0BC64DA738A23",
    "rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json":
        "E90CD40EDDE350EFAF23DB9738964146C0C5358CB2893560313772D1A9CB1C4C",
    "rank8_low_low_tail_curvature_far_zero_slack_amgm_independent_audit_exact_20260821.json":
        "6F4B40ABA29A55207ED5371786348300090AB00E326D3E7BEFCFA528E3D333AB",
    "rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json":
        "8C390F8C24F663B551B63D0E80FA9DF8894A2759D06DE5EA181CFB1E26636911",
    "rank8_low_low_strong_payment_zero_slack_amgm_independent_audit_exact_20260821.json":
        "CCC40D4325ACD001328156374DA1F82DA84328B9BFE9F4713C368F69B31BD9E3",
    "rank8_low_high_full_cone_direct_h_exact_20260821.json":
        "DAE963CA32C18CF7E6FAB7876B82EBC622A1ECAA8808F44DC901CE2E912DC9A5",
    "rank8_low_high_full_cone_direct_h_independent_audit_exact_20260821.json":
        "EE7828E3738047A0C925D885845DFE02A1D51871E3D10B842C5B5105F4240AD5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual_inputs = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual_inputs == EXPECTED

    reduction = load("rank8_low_low_double_tail_reduction_exact_20260820.json")
    reduction_audit = load("rank8_low_low_double_tail_reduction_independent_audit_exact_20260820.json")
    probe = load("rank8_low_low_auxiliaries_zero_slack_exact_20260820.json")
    curvature_far = load("rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json")
    curvature_audit = load("rank8_low_low_tail_curvature_far_zero_slack_amgm_independent_audit_exact_20260821.json")
    strong = load("rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json")
    strong_audit = load("rank8_low_low_strong_payment_zero_slack_amgm_independent_audit_exact_20260821.json")
    low_high = load("rank8_low_high_full_cone_direct_h_exact_20260821.json")
    low_high_audit = load("rank8_low_high_full_cone_direct_h_independent_audit_exact_20260821.json")

    assert reduction["status"] == "PASS_EXACT_LOW_LOW_REDUCTION_NOT_CONE_THEOREM"
    assert reduction_audit["status"] == "PASS_INDEPENDENT_AUDIT_LOW_LOW_REDUCTION_NOT_CONE_THEOREM"
    assert len(reduction["new_exact_targets"]) == 4
    assert low_high["status"] == "PASS_EXACT_RANK8_LOW_HIGH_FULL_CONVOLUTION_CONE"
    assert low_high_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_LOW_HIGH_FULL_CONVOLUTION_CONE"

    probe_rows = {row["auxiliary"]: row for row in probe["rows"]}
    curvature_stats = probe_rows["tail_curvature"]["bernstein_statistics"]
    strong_stats = probe_rows["strong_payment"]["bernstein_statistics"]
    assert [item["negative"] for item in curvature_stats] == [0, 0, 2]
    assert [item["terms"] for item in curvature_stats] == [126, 126, 125]
    assert [item["negative"] for item in strong_stats] == [6, 6, 10]
    assert [item["terms"] for item in strong_stats] == [148, 148, 147]

    assert curvature_far["status"] == "PASS_EXACT_ZERO_SLACK_TAIL_CURVATURE_FAR_AMGM"
    assert curvature_far["negative_terms"] == 2
    assert curvature_far["disjoint_positive_sources"] == 4
    assert curvature_audit["status"] == "PASS_INDEPENDENT_AUDIT_ZERO_SLACK_TAIL_CURVATURE_FAR_AMGM"
    assert curvature_audit["negative_terms"] == 2
    assert curvature_audit["disjoint_sources"] == 4

    assert strong["status"] == "PASS_EXACT_ZERO_SLACK_STRONG_PAYMENT_ALL_BERNSTEIN_AMGM"
    assert [(row["negative_terms"], row["disjoint_positive_sources"]) for row in strong["rows"]] == [
        (6, 12), (6, 12), (10, 20)
    ]
    assert strong_audit["status"] == "PASS_INDEPENDENT_AUDIT_ZERO_SLACK_STRONG_PAYMENT_ALL_BERNSTEIN_AMGM"
    assert [row["covered_negative_terms"] for row in strong_audit["rows"]] == [6, 6, 10]

    payload = {
        "schema": "rank8-low-low-zero-slack-two-tail-face-v1",
        "status": "PASS_EXACT_RANK8_LOW_LOW_ZERO_SLACK_TWO_TAIL_FACE",
        "theorem": (
            "For arbitrary terminal parameters h,ta,tb>=0 and arbitrary two "
            "low-tail coordinates 0<=x<=h/C, 0<=y<=h/D, the rank-eight "
            "low/low convolution margin is nonnegative when every adjusted "
            "gap slack is zero."
        ),
        "logical_join": [
            "The full low/high theorem pays the edge M(0,y)>=0.",
            "The base and middle Bernstein coefficients of q_x(y) are coefficientwise nonnegative on the face.",
            "The far coefficient of q_x(y) is paid by two exact disjoint AM-GM allocations, independently audited.",
            "All three Bernstein coefficients of C*M(0,y)+h*d_x(y) are paid by exact disjoint AM-GM allocations, independently audited.",
            "Bernstein nonnegativity gives both auxiliaries throughout 0<=y<=h/D.",
            "The exact x-quadratic interval argument then gives M(x,y)>=0 throughout 0<=x<=h/C.",
        ],
        "curvature_bernstein": {
            "coefficientwise_nonnegative": ["base", "middle_times_2"],
            "amgm_paid": ["far"],
            "negative_terms_paid": 2,
        },
        "strong_payment_bernstein": {
            "amgm_paid": ["base", "middle_times_2", "far"],
            "negative_terms_paid": [6, 6, 10],
        },
        "immutable_inputs": actual_inputs,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is a two-tail theorem only on the all-adjusted-gap-slacks-zero "
            "face.  The lift to arbitrary slacks, the full low/low cone, Q8, "
            "the forest lift, and Problem 993 remain open."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CURVATURE_NEGATIVES_PAID", payload["curvature_bernstein"]["negative_terms_paid"])
    print("STRONG_NEGATIVES_PAID", sum(payload["strong_payment_bernstein"]["negative_terms_paid"]))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
