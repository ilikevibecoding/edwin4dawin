#!/usr/bin/env python3
"""Fail-closed addendum integrating the bridge-one Delta2 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_connected_integration_bridge1_refresh_exact_20260821.json"
EXPECTED = {
    "rank8_connected_q8_integration_readonly_20260820.json":
        "440B5783DAB918BBF1DBAAC49D24166ADACFA38740399D7AC4E03EF1D02E4BC6",
    "RANK8_DELTA2_E2_PENDANT_BRIDGE1_FAR_LONG_THEOREM_2026-08-21.md":
        "DC54FE48C34091ECB0862BE6C75F89A864FA51995B1E9E42E598E4457D7B06B8",
    "rank8_delta2_e2_pendant_bridge1_far_long_root_side_arbitrary_cells_exact_20260820.json":
        "D977391D855001F3E6128E27985F1DC9DDA6D6102CEF29BD90AFADAA67D78669",
    "rank8_delta2_e2_pendant_bridge1_far_product_cancellation_exact_20260821.json":
        "F8395D64F76AABE7BF742944F597C2CDE199B6D57BF66F9EA617961621EA038F",
    "rank8_delta2_e2_pendant_bridge1_far_long_root_side_arbitrary_independent_audit_exact_20260821.json":
        "6664B9D08C7C7BE3DE5EFD3FAD0F6700A44190272AD9813B07CC5FD9972489BE",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    integration = load("rank8_connected_q8_integration_readonly_20260820.json")
    primary = load(
        "rank8_delta2_e2_pendant_bridge1_far_long_root_side_arbitrary_cells_exact_20260820.json"
    )
    cancellation = load(
        "rank8_delta2_e2_pendant_bridge1_far_product_cancellation_exact_20260821.json"
    )
    audit = load(
        "rank8_delta2_e2_pendant_bridge1_far_long_root_side_arbitrary_"
        "independent_audit_exact_20260821.json"
    )
    assert integration["status"] == (
        "PENDING_EXACT_RANK8_CONNECTED_Q8_INTEGRATION_DELTA0_3_N27_PLUS"
    )
    assert integration["connected_Q8_complete"] is False
    assert primary["status"] == (
        "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FIXED_BRIDGE_FAR_LONG_ROOT_SIDE_ARBITRARY"
    )
    assert primary["bridge_length"] == 1
    assert primary["patterns"] == primary["symbolic_cells"] == 448
    assert primary["signed_cells"] == []
    assert cancellation["status"] == (
        "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_BRIDGE1_FAR_PRODUCT_CANCELLATION"
    )
    assert cancellation["cells"] == 448
    assert cancellation["terms"] == 112014
    assert cancellation["maximum_far_product_degree"] == 0
    assert cancellation["negative_coefficients"] == 0
    assert audit["status"] == (
        "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_BRIDGE1_FAR_LONG_ROOT_SIDE_ARBITRARY"
    )
    assert audit["independent_literal_constants_checked"] == 448

    payload = {
        "schema": "rank8-connected-integration-bridge1-refresh-v1",
        "status": "PASS_REFRESHED_RANK8_CONNECTED_INTEGRATION_BRIDGE1_DELTA2",
        "base_integration_sha256": EXPECTED[
            "rank8_connected_q8_integration_readonly_20260820.json"
        ],
        "new_closed_scope": {
            "rank": "Delta2",
            "degree_surplus": 2,
            "root_type": "pendant-arm vertex",
            "central_bridge_length": 1,
            "selected_arm_and_root": "arbitrary",
            "paired_arm_length": "arbitrary positive",
            "far_arm_lengths": "both at least seven",
            "core_order": "n>=23",
            "strict_sign": "Delta2>0",
        },
        "certificate_counts": {
            "state_patterns": 448,
            "positive_symbolic_cells": 448,
            "far_product_cancellation_cells": 448,
            "far_product_cancellation_coefficients": 112014,
            "independent_literal_constants": 448,
        },
        "updated_Delta2_pendant_remainder": (
            "central bridges 2..7; bridge one with at least one far arm of "
            "length <=6. The prior bridge>=8 theorem remains complete for "
            "all arm lengths."
        ),
        "other_connected_remainder_unchanged": (
            "Delta0,Delta1,Delta3 residual families; non-pendant Delta2 "
            "families not already listed in the base integration; e>=3."
        ),
        "connected_Q8_complete": False,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
