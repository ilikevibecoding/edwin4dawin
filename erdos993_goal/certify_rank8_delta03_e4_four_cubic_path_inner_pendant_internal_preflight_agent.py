#!/usr/bin/env python3
"""Fail-closed bounded preflight for inner-pendant-internal exact engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_path_inner_pendant_internal_preflight_exact_agent_20260823.json"
EXPECTED = {
    "certify_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_newton_reduction_agent.py":
        "E3CAC8047E8B34EABA6E413AB27CADEC81F59444388DF7F831142FF3FBA7CE98",
    "rank8_delta03_e4_four_cubic_path_inner_pendant_internal_newton_reduction_exact_agent_20260823.json":
        "17376D1C39B029B60BDA8551452DDBC3F01D82C8FAB22A409DE376AA522B2701",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_i256_agent.rs":
        "583669652F2185B44807A52825D3E281B540FE8981222406025012A55A4487D8",
    "produce_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_i256_agent.exe":
        "E6FEC1A4A22E6449929470735B9E11158AB7A56AB034C87570D3387B163FCDC5",
    "audit_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_literal_i256_agent.rs":
        "E47F0E7451B69F39BAFED3AF7761CB0F02FDCE5303C0249CBFAF410DAF0A02F2",
    "audit_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_literal_i256_agent.exe":
        "696D60F4B9D1BDD1972B114664E4B24ECEEBB887DF981F70C10F640D37C30832",
}
PRIMARY_EXE = "produce_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_i256_agent.exe"
AUDIT_EXE = "audit_rank8_delta03_e4_four_cubic_path_inner_pendant_internal_literal_i256_agent.exe"
EXPECTED_RECORDS = "SMOKE_RECORDS 124 380"
EXPECTED_STREAM = (
    "SMOKE_STREAM "
    "21B59222BB3C0AB6E71F9895A9FCBEF424E27FC8A7ECDBA31C6C689EF8BDC0BA "
    "8B2BB0E72C4390AA26B9C612A58A67762E1D81526B416CEE2750CC606AC1BBAC"
)


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def smoke(executable: str) -> list[str]:
    completed = subprocess.run(
        [str(ROOT / executable), "smoke"], cwd=ROOT, check=True,
        capture_output=True, text=True, timeout=60,
    )
    assert completed.stderr == ""
    return completed.stdout.splitlines()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = smoke(PRIMARY_EXE)
    audit = smoke(AUDIT_EXE)
    assert primary == [
        "PASS_FOUR_CUBIC_PATH_INNER_PENDANT_INTERNAL_512_LITERAL_FORMULA_SMOKE",
        EXPECTED_RECORDS,
        EXPECTED_STREAM,
    ]
    assert audit == [
        "PASS_INDEPENDENT_FOUR_CUBIC_PATH_INNER_PENDANT_INTERNAL_1024_LITERAL_SMOKE",
        EXPECTED_RECORDS,
        EXPECTED_STREAM,
    ]
    payload = {
        "schema": "rank8-delta03-e4-four-cubic-path-inner-pendant-internal-preflight-exact-agent-v1",
        "status": "PASS_PREPARED_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_INNER_PENDANT_INTERNAL_EXACT_ENGINES",
        "root_orbit": "four_cubic_path:inner_pendant_internal",
        "reduction_counts": {
            "eligible_finite": 37_143_771,
            "non_all_short_rays": 119_233_660,
            "total_quotient_keys": 157_351_936,
        },
        "bounded_smokes": {
            "producer_random_expanded_literal_formula_checks": 512,
            "audit_random_and_cached_expanded_literal_checks": 1024,
            "shared_canonical_finite_records": 124,
            "shared_canonical_ray_records": 380,
            "matching_coefficient_smoke_stream_sha256": EXPECTED_STREAM.split()[1],
            "matching_finite_smoke_stream_sha256": EXPECTED_STREAM.split()[2],
        },
        "independence_boundary": (
            "The producer combines cached left/right branch messages at B1 and "
            "then crosses the near gap to the selected root. The audit independently "
            "propagates root and left-outer full/deleted states into B1 and forward "
            "through B2--B3, with a separately written adjacency builder."
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Prepared and smoke-validated only. No full 157,351,936-key scan "
            "was launched, and no sign theorem or orbit closure is credited."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(EXPECTED_RECORDS)
    print(EXPECTED_STREAM)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
