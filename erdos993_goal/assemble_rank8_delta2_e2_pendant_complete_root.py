#!/usr/bin/env python3
"""Fail-closed assembly of every pendant-rooted e=2 Delta2 double claw."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta2_e2_pendant_complete_exact_root_20260823.json"
NEW_AUDIT = "rank8_delta2_e2_pendant_bridges1to7_all_nonlonglong_far_pairs_independent_audit_exact_root_20260823.json"
EXPECTED = {
    NEW_AUDIT: "6AE8525D2101672186C1512935F3ADA4187E9646F2AEFEABCA76906C9F3ED989",
    "rank8_delta2_e2_pendant_bridge1_far_long_root_side_arbitrary_independent_audit_exact_20260821.json":
        "6664B9D08C7C7BE3DE5EFD3FAD0F6700A44190272AD9813B07CC5FD9972489BE",
    "rank8_delta2_e2_pendant_bridges2to7_far_long_root_side_arbitrary_independent_audit_exact_root_20260823.json":
        "7DCFBB50A91E9780F70CA7DF1D28FB6B884816B07D4F7B3BD9D2A5E06C8D7254",
    "rank8_delta2_e2_pendant_bridge_long_all_arm_lengths_exact_20260820.json":
        "FFD224DEDDA5E15EE586B598F065F522F793464DBA8EC2E6209931BED6EA36A9",
    "rank8_delta2_e2_long_pair_sum_independent_audit_exact_20260820.json":
        "3D08D942263C416BD799F4BBA5822B3289CD92BCBEE936520D95B23FFD2CAB46",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    assert "FILL_NEW_AUDIT" not in EXPECTED.values()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    non_longlong = load(NEW_AUDIT)
    bridge1_longlong = load(
        "rank8_delta2_e2_pendant_bridge1_far_long_root_side_arbitrary_independent_audit_exact_20260821.json"
    )
    bridges2to7_longlong = load(
        "rank8_delta2_e2_pendant_bridges2to7_far_long_root_side_arbitrary_independent_audit_exact_root_20260823.json"
    )
    bridge_long = load("rank8_delta2_e2_pendant_bridge_long_all_arm_lengths_exact_20260820.json")
    identity = load("rank8_delta2_e2_long_pair_sum_independent_audit_exact_20260820.json")

    assert non_longlong["status"] == (
        "PASS_INDEPENDENT_LITERAL_NO_GAP_AUDIT_RANK8_DELTA2_E2_PENDANT_BRIDGES1TO7_ALL_NONLONGLONG_FAR_PAIRS"
    )
    assert bridge1_longlong["status"] == (
        "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_BRIDGE1_FAR_LONG_ROOT_SIDE_ARBITRARY"
    )
    assert bridges2to7_longlong["status"] == (
        "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_BRIDGES2TO7_FAR_LONG_ROOT_SIDE_ARBITRARY"
    )
    assert bridge_long["status"] == (
        "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_BRIDGE_LONG_ALL_ARM_LENGTHS"
    )
    assert identity["status"] == (
        "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_LONG_PAIR_SUM_AND_ROOT_CELLS"
    )
    assert non_longlong["bridges"] == list(range(1, 8))
    assert non_longlong["far_pair_states_per_bridge"] == 27
    assert non_longlong["reports"] == 189

    payload = {
        "schema": "rank8-delta2-e2-pendant-complete-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_COMPLETE_ALL_ORDERS_N23_PLUS",
        "theorem": "For every pendant-rooted e=2 double claw of order n>=23, with arbitrary positive arm and bridge lengths and any root position on the selected arm, Delta2 R_1(A,q)>0.",
        "bridge_partition": {
            "1_to_7_non_longlong_far_pairs": "189 independently audited fixed-bridge/far-pair reports, 27 far-pair states per bridge",
            "1_to_7_longlong_far_pair": "bridge one audit plus six-bridge aggregate audit",
            "8_plus_all_far_pairs": "sealed bridge-long all-arm-length assembler",
        },
        "far_pair_partition": {
            "states": "unordered 1,...,6,L pairs",
            "non_longlong": 27,
            "longlong": 1,
        },
        "no_gap": "positive bridge lengths split as 1..7 or >=8; at short bridges, unordered far-arm states split as 27 non-LL states or LL",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Pendant roots at e=2 Delta2 only; branch and bridge-interior roots remain separately gated here.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
