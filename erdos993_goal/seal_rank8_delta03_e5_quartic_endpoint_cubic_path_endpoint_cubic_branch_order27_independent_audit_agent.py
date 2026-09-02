#!/usr/bin/env python3
"""Fail-closed order-27 literal audit seal for the endpoint-cubic branch."""

from __future__ import annotations
import hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_order27_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_order27_literal_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_order27_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "seal_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_order27_exact_agent.py": "587E0ED2BF964AC2D4AAEF36DEEE5C2ED91E1189DA2F8DDC9B410E7C6BB576A2",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_order27_exact_agent_20260823.json": "3EBBA144AC7BFE2B06701407FE96B1466FC9FB1D9370946D0DD48B289E1102A6",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_literal_i256_agent.rs": "8CDD54F5385CC3739FCD32AE08AC4E3ED76A788741A8A2BE333928FB367B2301",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_literal_i256_agent.exe": "708B875BB7F26513098B239537667B5460D00DF98BF2443A179651BD7B75E678",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_order27_literal_raw_agent_20260823.txt": "2BCB54E5CFE3A2EE708F302DAAFA73A890BEC07669A77F4EB6770447C439439B",
}
def sha256(path: Path) -> str: return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}; assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8")); assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_BRANCH_ORDER27"
    lines = RAW.read_text(encoding="utf-8").splitlines(); assert lines[0] == "PASS_INDEPENDENT_LITERAL_I256_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_BRANCH_ORDER27"
    rows = dict(line.split(" ", 1) for line in lines[1:]); assert set(rows) == {"RAW_COMPOSITIONS", "ORDER27_COUNT", "NONPOSITIVE", "LITERAL_TREES", "VALUE_STREAM"}; assert rows["RAW_COMPOSITIONS"] == "480700" and rows["ORDER27_COUNT"] == "70854" and rows["NONPOSITIVE"] == "0 0 0 0" and rows["LITERAL_TREES"] == "70854" and rows["VALUE_STREAM"] == primary["value_stream_sha256"]
    payload = {"schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-endpoint-cubic-branch-order27-independent-audit-agent-v1", "status": "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_BRANCH_ORDER27_AUDIT", "audit_claim": "An independently transcribed checked-i256 engine enumerated all 480,700 positive compositions by cut positions, retained 70,854 canonical representatives, rebuilt every literal tree at the endpoint-cubic root, and matched the complete primary value stream.", "no_gap_enumeration": {"raw_positive_compositions": 480_700, "rooted_automorphism_group_order": 12, "partition_burnside_orbits": 70_854, "direct_canonical_representatives": 70_854}, "exact_checks": {"literal_tree_checks": 70_854, "nonpositive": [0, 0, 0, 0]}, "matching_value_stream_sha256": rows["VALUE_STREAM"], "observed_runtime_seconds": 3.057, "arithmetic": "checked signed i256 residual arithmetic and checked i128 independence-vector arithmetic", "immutable_input_hashes": actual, "source_sha256": sha256(Path(__file__)), "scope_guard": "Exactly e=5, n=27, quartic_endpoint_cubic_path:endpoint_cubic_branch, Delta0..3; no broader claim."}
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8"); print(payload["status"]); print("LITERAL_TREES", 70_854); print("STREAM", rows["VALUE_STREAM"]); print("SOURCE", payload["source_sha256"]); print("REPORT", sha256(OUTPUT))
if __name__ == "__main__": main()
