#!/usr/bin/env python3
"""Fail-closed bounded preflight for middle-spine-internal engines."""

from __future__ import annotations
import hashlib, json, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_path_middle_spine_internal_preflight_exact_agent_20260823.json"
EXPECTED = {
    "certify_rank8_delta03_e4_four_cubic_path_middle_spine_internal_newton_reduction_agent.py": "947BF892387DEAF768EA5CC2B021E1B0F86F5D34B8F2EA362347553777CBD004",
    "rank8_delta03_e4_four_cubic_path_middle_spine_internal_newton_reduction_exact_agent_20260823.json": "F5081C3BDA80B5F7991755B50DFD3F7925FF59D1675859C65730AB8121616BF3",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e4_four_cubic_path_middle_spine_internal_i256_agent.rs": "59336C811D822C56A3947414089C64E5E94F8B4BE0DB9DAD064C37B5E81630DE",
    "produce_rank8_delta03_e4_four_cubic_path_middle_spine_internal_i256_agent.exe": "B4733BCCD5A098DD64D932B86C04AAEB492FFF8D9D66A1CFF20A01DDDA5AE8ED",
    "audit_rank8_delta03_e4_four_cubic_path_middle_spine_internal_literal_i256_agent.rs": "BFA6B8D6AE8BCCBB04C2F3478A4FEE734FB87E64F16E4E2905ECC67CE2601302",
    "audit_rank8_delta03_e4_four_cubic_path_middle_spine_internal_literal_i256_agent.exe": "8C6E1CED42E69FBADC9EB511441F9B969598076723932AE84ABF2C4A31BFF5FD",
}
PRIMARY = "produce_rank8_delta03_e4_four_cubic_path_middle_spine_internal_i256_agent.exe"
AUDIT = "audit_rank8_delta03_e4_four_cubic_path_middle_spine_internal_literal_i256_agent.exe"
RECORDS = "SMOKE_RECORDS 89 421"
STREAM = "SMOKE_STREAM 12EC0E8047FFF5416A4C9C50D668EDD4A178D917DF66070EE6092F1DDCD0629B 3DE58DEE70C61C87EADB70CB8DCAC084201DF2B43C66B8F277201A2E89C23F58"

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()

def smoke(name: str) -> list[str]:
    run = subprocess.run([str(ROOT / name), "smoke"], cwd=ROOT, check=True, capture_output=True, text=True, timeout=60)
    assert run.stderr == ""; return run.stdout.splitlines()

def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}; assert actual == EXPECTED
    assert smoke(PRIMARY) == ["PASS_FOUR_CUBIC_PATH_MIDDLE_SPINE_INTERNAL_512_LITERAL_FORMULA_SMOKE", RECORDS, STREAM]
    assert smoke(AUDIT) == ["PASS_INDEPENDENT_FOUR_CUBIC_PATH_MIDDLE_SPINE_INTERNAL_1024_LITERAL_SMOKE", RECORDS, STREAM]
    payload = {
        "schema": "rank8-delta03-e4-four-cubic-path-middle-spine-internal-preflight-exact-agent-v1",
        "status": "PASS_PREPARED_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_MIDDLE_SPINE_INTERNAL_EXACT_ENGINES",
        "root_orbit": "four_cubic_path:middle_spine_internal",
        "reduction_counts": {"eligible_finite": 18_574_731, "non_all_short_rays": 59_620_015, "total_quotient_keys": 78_682_240},
        "bounded_smokes": {"producer_random_expanded_literal_formula_checks": 512, "audit_random_and_cached_expanded_literal_checks": 1024, "shared_canonical_finite_records": 89, "shared_canonical_ray_records": 421, "matching_coefficient_smoke_stream_sha256": STREAM.split()[1], "matching_finite_smoke_stream_sha256": STREAM.split()[2]},
        "independence_boundary": "The producer combines two cached half-tree messages at the selected root. The audit independently propagates from the left outer cubic through the selected root to the right outer cubic and uses a separately written adjacency builder.",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Prepared and smoke-validated only. No full 78,682,240-key scan was launched and no orbit closure is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"]); print(RECORDS); print(STREAM); print("SOURCE", payload["source_sha256"]); print("REPORT", sha256(OUTPUT))

if __name__ == "__main__": main()
