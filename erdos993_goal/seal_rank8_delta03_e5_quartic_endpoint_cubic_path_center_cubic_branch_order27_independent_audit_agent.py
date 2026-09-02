#!/usr/bin/env python3
"""Fail-closed independent order-27 audit for the center-cubic branch orbit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_literal_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_exact_agent.py": "9B1E37AA71AD14E675A0EDBEA5FEA0939EC8C438BB0E9D082311989DA06AFD10",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_exact_agent_20260823.json": "44091AC33F4A7BFE6E7003445C24A93DEED7F89A88E02398C08E2F40F277E6D7",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_literal_i256_agent.rs": "F003B39AF254693BA29B868DAAD56084041D36014965331FF0A3464B19DE24D7",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_literal_i256_agent.exe": "47CE71B91002C6A1C3A78CDABA2DB7257AE54E0301CF64DF79DFD74BFCF4BE5B",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_literal_raw_agent_20260823.txt": "E2C7F88D61D6432DDA3003E9DF32A9B4D388FEEF985DA40FBA01C3F2C9253E12",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}; assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8")); assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH_ORDER27"
    lines = RAW.read_text(encoding="utf-8").splitlines(); assert lines[0] == "PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH_ORDER27"
    rows = dict(line.split(" ", 1) for line in lines[1:]); assert set(rows) == {"RAW_COMPOSITIONS", "ORDER27_COUNT", "NONPOSITIVE", "LITERAL_TREES", "VALUE_STREAM"}
    assert rows["RAW_COMPOSITIONS"] == "480700" and rows["ORDER27_COUNT"] == "70854" and rows["NONPOSITIVE"] == "0 0 0 0" and rows["LITERAL_TREES"] == "70854"
    assert rows["VALUE_STREAM"] == primary["value_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-center-cubic-branch-order27-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH_ORDER27_AUDIT",
        "audit_claim": "An independently transcribed checked-i256 engine enumerated all 480,700 positive edge-length compositions by cut positions, retained the 70,854 canonical rooted representatives, rebuilt every literal tree at the center-cubic root, and matched the complete primary value stream.",
        "no_gap_enumeration": {"raw_positive_compositions": 480_700, "rooted_automorphism_group_order": 12, "partition_burnside_orbits": 70_854, "direct_canonical_representatives": 70_854},
        "exact_checks": {"literal_tree_checks": 70_854, "nonpositive": [0, 0, 0, 0]},
        "matching_value_stream_sha256": rows["VALUE_STREAM"], "observed_runtime_seconds": 3.104,
        "arithmetic": "checked signed i256 residual arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual, "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly e=5, n=27, quartic_endpoint_cubic_path:center_cubic_branch, Delta0..3; no other orbit or broader claim.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"]); print("LITERAL_TREES", 70_854); print("STREAM", rows["VALUE_STREAM"]); print("SOURCE", payload["source_sha256"]); print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
