#!/usr/bin/env python3
"""Independent read-only audit of the bridge-one integration addendum."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_connected_integration_bridge1_refresh_independent_audit_exact_20260821.json"
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
    keys = {
        (str(row["paired_state"]), str(row["near_state"]), str(row["tail_state"]))
        for row in primary["cells"]
    }
    cancellation_keys = {
        (str(row["paired_state"]), str(row["near_state"]), str(row["tail_state"]))
        for row in cancellation["rows"]
    }
    assert len(keys) == 448 and keys == cancellation_keys
    assert primary["bridge_length"] == 1 and primary["signed_cells"] == []
    assert cancellation["maximum_far_product_degree"] == 0
    assert cancellation["negative_coefficients"] == 0
    assert audit["pattern_keys"] == 448
    assert audit["independent_literal_constants_checked"] == 448
    assert integration["bounded_structural_progress_on_pending_ranks"]["Delta2"][
        "pendant_e2_remaining_scope_guard"
    ] == "central bridge length <=7 remains outside the complete pendant-root theorem"
    assert integration["connected_Q8_complete"] is False

    payload = {
        "schema": "rank8-connected-integration-bridge1-refresh-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_CONNECTED_INTEGRATION_BRIDGE1_REFRESH",
        "verified_new_scope": (
            "Delta2>0 for every order n>=23 pendant-rooted e=2 double "
            "claw with bridge one, arbitrary selected root/paired arm, and "
            "both far arms at least seven."
        ),
        "state_keys": len(keys),
        "far_product_cancellation_terms": cancellation["terms"],
        "literal_constants": audit["independent_literal_constants_checked"],
        "remaining_scope": (
            "bridges 2..7 and bridge-one cells with a short far arm, plus "
            "the other connected residual families stated in the base report"
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
