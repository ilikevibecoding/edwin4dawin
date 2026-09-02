#!/usr/bin/env python3
"""Fail-closed assembly of Delta2 for every rooted e=2 double claw."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BRANCH = "rank8_delta2_e2_branch_all_order_independent_audit_exact_20260820.json"
PENDANT = "rank8_delta2_e2_pendant_complete_exact_root_20260823.json"
BRIDGE = "rank8_delta2_e2_bridge_all_arm_pairs_all_root_positions_independent_audit_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_delta2_e2_complete_all_root_types_exact_root_20260823.json"
EXPECTED = {
    BRANCH: "5A82B58361B66DF210BC3BF5341632D022003CD4E5A320A230490DAC8D579708",
    PENDANT: "39F5D12CBDD557EAF25817119AB9DD69E8CABDF34EFABDC62B9DE3F6D4DF2336",
    BRIDGE: "A2F43E5CFBAF5594DE62FE252FAE1F1A28F198181355077D741DE40B848A1BFE",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    branch, pendant, bridge = load(BRANCH), load(PENDANT), load(BRIDGE)
    assert branch["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_BRANCH_ALL_ORDER"
    assert pendant["status"] == "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_COMPLETE_ALL_ORDERS_N23_PLUS"
    assert bridge["status"] == (
        "PASS_INDEPENDENT_LITERAL_NO_GAP_AUDIT_RANK8_DELTA2_E2_BRIDGE_ALL_ARM_PAIRS_ALL_ROOT_POSITIONS"
    )
    assert branch["root_scope"] == "either degree-3 branch vertex, using side reversal to call it the root side"
    assert bridge["side_pair_reports"] == 406

    payload = {
        "schema": "rank8-delta2-e2-complete-all-root-types-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_E2_COMPLETE_ALL_ROOT_TYPES_N23_PLUS",
        "theorem": "For every rooted e=2 double claw (A,q) of order n>=23, Delta^2 R_1(A,q)>0.",
        "root_partition": {
            "branch": "the two degree-three branch vertices",
            "pendant": "every vertex on any of the four pendant paths, including terminal leaves and pendant-path internal vertices",
            "bridge": "every internal vertex on the unique branch-to-branch path",
        },
        "partition_argument": "Every vertex of a subdivided double claw lies in exactly one of the three listed classes, so the independently sealed branch, pendant, and bridge-interior theorems are exhaustive and disjoint.",
        "order_range": "n>=23",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Delta2 and e=2 only; no higher degree surplus is credited by this assembly.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
