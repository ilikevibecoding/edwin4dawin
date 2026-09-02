#!/usr/bin/env python3
"""Fail-closed independent middle-spine-internal audit seal."""

from __future__ import annotations
import hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e4_four_cubic_path_middle_spine_internal_all_order_exact_agent_20260823.json"
RAW = ROOT / "rank8_delta03_e4_four_cubic_path_middle_spine_internal_literal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_path_middle_spine_internal_all_order_independent_audit_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json": "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json": "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json": "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "certify_rank8_delta03_e4_four_cubic_path_middle_spine_internal_newton_reduction_agent.py": "947BF892387DEAF768EA5CC2B021E1B0F86F5D34B8F2EA362347553777CBD004",
    "rank8_delta03_e4_four_cubic_path_middle_spine_internal_newton_reduction_exact_agent_20260823.json": "F5081C3BDA80B5F7991755B50DFD3F7925FF59D1675859C65730AB8121616BF3",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "seal_rank8_delta03_e4_four_cubic_path_middle_spine_internal_exact_agent.py": "20E957CFFE8A51A725336027F454722F7DA894762A70CF3BF78BEAC5FA477A7A",
    "rank8_delta03_e4_four_cubic_path_middle_spine_internal_all_order_exact_agent_20260823.json": "470A4FB22D1298DDF9D86A39C602D5A1DD0F71F561E34E552358C8286D125589",
    "audit_rank8_delta03_e4_four_cubic_path_middle_spine_internal_literal_i256_agent.rs": "BFA6B8D6AE8BCCBB04C2F3478A4FEE734FB87E64F16E4E2905ECC67CE2601302",
    "audit_rank8_delta03_e4_four_cubic_path_middle_spine_internal_literal_i256_agent.exe": "8C6E1CED42E69FBADC9EB511441F9B969598076723932AE84ABF2C4A31BFF5FD",
    "rank8_delta03_e4_four_cubic_path_middle_spine_internal_literal_i256_raw_agent_20260823.txt": "2484016974C9B9DC15FA5060676127C3521B473ED3A801F2A3FEDE1BB6B83782",
}

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()

def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}; assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_MIDDLE_SPINE_INTERNAL_N27_PLUS"
    assert primary["root_orbit"] == "four_cubic_path:middle_spine_internal"
    assert primary["quotient_counts"] == {"all_short_total": 19_062_225, "all_short_n27_plus": 18_574_731, "mixed_rays": 59_620_014, "all_long_rays": 1, "non_all_short_rays": 59_620_015}
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_INDEPENDENT_LITERAL_I256_FOUR_CUBIC_PATH_MIDDLE_SPINE_INTERNAL"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {"COUNTS", "UNSEEN", "LITERAL_TREES", "LITERAL_RAY_POINTS", "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"}
    assert rows["COUNTS"] == "19062225 18574731 59620014 1 59620015"
    assert rows["UNSEEN"] == "238480060"; assert rows["LITERAL_TREES"] == "197434776"; assert rows["LITERAL_RAY_POINTS"] == "0 13 29"
    assert rows["COEFFICIENT_MERKLE_STREAM"] == primary["coefficient_merkle_stream_sha256"]
    assert rows["FINITE_MERKLE_STREAM"] == primary["finite_merkle_stream_sha256"]
    payload = {
        "schema": "rank8-delta03-e4-four-cubic-path-middle-spine-internal-all-order-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_MIDDLE_SPINE_INTERNAL_N27_PLUS_AUDIT",
        "audit_claim": "A separately compiled checked-i256 engine propagated from the left outer cubic through the selected root to the right outer cubic, independently matched every finite/29-coefficient record, and rebuilt every eligible finite tree plus S=0,13,29 on every ray by generic adjacency-list forest DP.",
        "counts": {"all_short_total": 19_062_225, "all_short_n27_plus": 18_574_731, "mixed_rays": 59_620_014, "all_long_rays": 1, "non_all_short_rays": 59_620_015, "literal_trees_evaluated": 197_434_776, "literal_ray_points": [0, 13, 29], "unseen_S29_rank_checks": 238_480_060},
        "matching_coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "matching_finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "compile_command": "rustc --target x86_64-pc-windows-gnu --edition=2021 -O -C overflow-checks=yes",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only four_cubic_path:middle_spine_internal.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"]); print("LITERAL_TREES", 197_434_776); print("UNSEEN", 238_480_060)
    print("STREAM", payload["matching_coefficient_merkle_stream_sha256"], payload["matching_finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"]); print("REPORT", sha256(OUTPUT))

if __name__ == "__main__": main()
