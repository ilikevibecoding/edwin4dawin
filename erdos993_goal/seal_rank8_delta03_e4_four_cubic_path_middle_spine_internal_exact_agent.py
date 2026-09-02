#!/usr/bin/env python3
"""Fail-closed seal for the checked-i256 middle-spine-internal producer."""

from __future__ import annotations
import hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e4_four_cubic_path_middle_spine_internal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_path_middle_spine_internal_all_order_exact_agent_20260823.json"
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
    "produce_rank8_delta03_e4_four_cubic_path_middle_spine_internal_i256_agent.rs": "59336C811D822C56A3947414089C64E5E94F8B4BE0DB9DAD064C37B5E81630DE",
    "produce_rank8_delta03_e4_four_cubic_path_middle_spine_internal_i256_agent.exe": "B4733BCCD5A098DD64D932B86C04AAEB492FFF8D9D66A1CFF20A01DDDA5AE8ED",
    "rank8_delta03_e4_four_cubic_path_middle_spine_internal_i256_raw_agent_20260823.txt": "BA56DFA2CA13101F750D278DC16F2DA3C5F0E7EB95A9D026F93FE3525BDB603B",
}

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()

def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}; assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_I256_FOUR_CUBIC_PATH_MIDDLE_SPINE_INTERNAL_PRODUCER"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {"COUNTS", "UNSEEN", "LITERAL_SPOT_CHECKS", "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"}
    assert rows["COUNTS"] == "19062225 18574731 59620014 1 59620015"
    assert rows["UNSEEN"] == "238480060"; assert rows["LITERAL_SPOT_CHECKS"] == "18718"
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"): assert len(rows[field]) == 64 and int(rows[field], 16) >= 0
    payload = {
        "schema": "rank8-delta03-e4-four-cubic-path-middle-spine-internal-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_MIDDLE_SPINE_INTERNAL_N27_PLUS",
        "theorem": "For a root internal to the middle spine in every four-cubic-path e=4 subdivision and every n>=27, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "four_cubic_path:middle_spine_internal",
        "quotient_counts": {"all_short_total": 19_062_225, "all_short_n27_plus": 18_574_731, "mixed_rays": 59_620_014, "all_long_rays": 1, "non_all_short_rays": 59_620_015},
        "rank_ray_samples": 59_620_015 * 4 * 29,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": "d0>0,d1>0,d2..d_degree>=0 and exact zero tail, with checked unseen S=29 equality on every rank-ray",
        "unseen_S29_rank_checks": 238_480_060,
        "literal_formula_spot_checks": 18_718,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly four_cubic_path:middle_spine_internal; no other open e=4 orbit, e>=5, forests, or full-conjecture credit.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"]); print("FINITE", 18_574_731); print("RAYS", 59_620_015)
    print("STREAM", payload["coefficient_merkle_stream_sha256"], payload["finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"]); print("REPORT", sha256(OUTPUT))

if __name__ == "__main__": main()
