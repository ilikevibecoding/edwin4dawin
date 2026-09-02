#!/usr/bin/env python3
"""Fail-closed order-27 primary seal for the center-cubic branch orbit."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_newton_reduction_exact_agent_20260823.json": "F94CFF3557CFA4AA1E3F7FDDA89125420570ED3D50438B0AA20C51E03FDFA55E",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_i256_agent.rs": "45729ECC67F06BBE14C50834B508F8C589DD83CB88470664696DAB48F76BA8A5",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_i256_agent.exe": "366693666F9862E2B582D15ED910E655EA4B1055D92334FBD595940A57FA673F",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_raw_agent_20260823.txt": "0E9525A404673FFE138B38D44E3F03057FA4813DB47F0A16B8A2404326170185",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}; assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines(); assert lines[0] == "PASS_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH_ORDER27"
    rows = dict(line.split(" ", 1) for line in lines[1:]); assert set(rows) == {"ORDER27_COUNT", "NONPOSITIVE", "LITERAL_SPOTS", "VALUE_STREAM"}
    assert rows["ORDER27_COUNT"] == "70854" and rows["NONPOSITIVE"] == "0 0 0 0" and rows["LITERAL_SPOTS"] == "18"; assert len(rows["VALUE_STREAM"]) == 64; int(rows["VALUE_STREAM"], 16)
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-center-cubic-branch-order27-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH_ORDER27",
        "order": 27, "degree_surplus": 5, "root_orbit": "quartic_endpoint_cubic_path:center_cubic_branch",
        "canonical_subdivisions": 70_854, "formula_checks": 70_854, "literal_spot_checks": 18, "nonpositive": [0, 0, 0, 0],
        "value_stream_sha256": rows["VALUE_STREAM"], "observed_runtime_seconds": 1.250,
        "arithmetic": "checked signed i256 residual arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual, "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly e=5, n=27, quartic_endpoint_cubic_path:center_cubic_branch, Delta0..3; independent literal audit remains required.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"]); print("COUNT", 70_854); print("STREAM", rows["VALUE_STREAM"]); print("SOURCE", payload["source_sha256"]); print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
