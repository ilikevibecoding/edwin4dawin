#!/usr/bin/env python3
"""Fail-closed bounded preflight for star pendant-internal engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_star_pendant_internal_preflight_exact_agent_20260823.json"
EXPECTED = {
    "certify_rank8_delta03_e4_four_cubic_star_pendant_internal_newton_reduction_agent.py": "F4C58DC5B46CFE389785B3F1FCA544E72100DAD07D7FF1AE4EC12B9555182D88",
    "rank8_delta03_e4_four_cubic_star_pendant_internal_newton_reduction_exact_agent_20260823.json": "D14EE51513F771A9B218896FE6B4438456D6A823303C5950FF7703AEFB031DF0",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e4_four_cubic_star_pendant_internal_i256_agent.rs": "67AFF9B1C8A046C7B175BD1468B4D19A6F89D8E965AC9D1122FEE9ACFC19B1FB",
    "produce_rank8_delta03_e4_four_cubic_star_pendant_internal_i256_agent.exe": "93AB2ADA4118A48C754F7CC50FCECC1B3EC606D37F1062C0E01B1E213F49E57D",
    "audit_rank8_delta03_e4_four_cubic_star_pendant_internal_literal_i256_agent.rs": "78080BCE3317A53B8DD54BD08CD62D0BB4953B2FB9D3F4B8BF5BED261637A06B",
    "audit_rank8_delta03_e4_four_cubic_star_pendant_internal_literal_i256_agent.exe": "D04E7DBA9D4C179E0C3B8EEBEFF449E32561EE7146C53FC94C6B59E911A8CE36",
}
PRIMARY = "produce_rank8_delta03_e4_four_cubic_star_pendant_internal_i256_agent.exe"
AUDIT = "audit_rank8_delta03_e4_four_cubic_star_pendant_internal_literal_i256_agent.exe"
RECORDS = "SMOKE_RECORDS 120 389"
STREAM = "SMOKE_STREAM F4E73F5E9D66835E7C0D4E15CE0B6F3FA0A7B45121210E584D739DCB933E1156 2A35BD4463122FC5184FCE5C12829D0DD54D73EF0063FBD8EAE2CD8ABA6C6EAF"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def smoke(name: str) -> list[str]:
    run = subprocess.run(
        [str(ROOT / name), "smoke"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert run.stderr == ""
    return run.stdout.splitlines()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    assert smoke(PRIMARY) == [
        "PASS_FOUR_CUBIC_STAR_PENDANT_INTERNAL_512_LITERAL_FORMULA_SMOKE",
        RECORDS,
        STREAM,
    ]
    assert smoke(AUDIT) == [
        "PASS_INDEPENDENT_FOUR_CUBIC_STAR_PENDANT_INTERNAL_1024_LITERAL_SMOKE",
        RECORDS,
        STREAM,
    ]
    payload = {
        "schema": "rank8-delta03-e4-four-cubic-star-pendant-internal-preflight-exact-agent-v1",
        "status": "PASS_PREPARED_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_PENDANT_INTERNAL_EXACT_ENGINES",
        "root_orbit": "four_cubic_star:pendant_internal",
        "reduction_counts": {
            "eligible_finite": 18_693_172,
            "non_all_short_rays": 59_838_408,
            "total_quotient_keys": 79_027_200,
        },
        "bounded_smokes": {
            "producer_random_expanded_literal_formula_checks": 512,
            "audit_random_and_cached_expanded_literal_checks": 1024,
            "shared_canonical_finite_records": 120,
            "shared_canonical_ray_records": 389,
            "matching_coefficient_smoke_stream_sha256": STREAM.split()[1],
            "matching_finite_smoke_stream_sha256": STREAM.split()[2],
        },
        "independence_boundary": (
            "The producer splits at the selected root and propagates center-side "
            "messages backward. The audit starts at the root tail, propagates forward "
            "through the distinguished outer cubic to the center, derives the deleted "
            "forest separately, and uses its own adjacency builder."
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Prepared and smoke-validated only. No full 79,027,200-key scan was "
            "launched and no orbit closure is credited."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(RECORDS)
    print(STREAM)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
