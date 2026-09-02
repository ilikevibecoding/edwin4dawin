#!/usr/bin/env python3
"""Fail-closed bounded preflight for outer-spine-internal engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_path_outer_spine_internal_preflight_exact_agent_20260823.json"
EXPECTED = {
    "certify_rank8_delta03_e4_four_cubic_path_outer_spine_internal_newton_reduction_agent.py": "0A76324F85DCFB2482B07F01344AD597376E44CBC5B41B61767A6F6E3ADC3598",
    "rank8_delta03_e4_four_cubic_path_outer_spine_internal_newton_reduction_exact_agent_20260823.json": "54A47725DDB2FB34A1946B9CB5DD9A62146D00460AE4F3B5BDF30B184B63A1D0",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e4_four_cubic_path_outer_spine_internal_i256_agent.rs": "DD15B8BB51B931BDCA7802C5CB0C9DE07CBB195264FDE8D812DCF1C952E7224E",
    "produce_rank8_delta03_e4_four_cubic_path_outer_spine_internal_i256_agent.exe": "209A8B6C0BE2D57D254D5716B13436FA1F34F57408E8011F595FC1B7B505BE77",
    "audit_rank8_delta03_e4_four_cubic_path_outer_spine_internal_literal_i256_agent.rs": "A3014A4C377BA6295A521F494DE4CAA9788B540E8D0A89CFFD10E3091E7346BE",
    "audit_rank8_delta03_e4_four_cubic_path_outer_spine_internal_literal_i256_agent.exe": "D0AE1092EEB6D56747AEA69C50B7E406BA833176F0F0134E615EE26F0589BFB9",
}
PRIMARY = "produce_rank8_delta03_e4_four_cubic_path_outer_spine_internal_i256_agent.exe"
AUDIT = "audit_rank8_delta03_e4_four_cubic_path_outer_spine_internal_literal_i256_agent.exe"
RECORDS = "SMOKE_RECORDS 122 385"
STREAM = "SMOKE_STREAM C3C871EAFB846EFABB2623663C656DDE247BC4D7F901F282FF879848F330144C 9569481C91D5BB0DA34EE7C4BD65BE3D554EB6BD18A6F19B3A48351344E233CD"


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
        "PASS_FOUR_CUBIC_PATH_OUTER_SPINE_INTERNAL_512_LITERAL_FORMULA_SMOKE",
        RECORDS,
        STREAM,
    ]
    assert smoke(AUDIT) == [
        "PASS_INDEPENDENT_FOUR_CUBIC_PATH_OUTER_SPINE_INTERNAL_1024_LITERAL_SMOKE",
        RECORDS,
        STREAM,
    ]
    payload = {
        "schema": "rank8-delta03-e4-four-cubic-path-outer-spine-internal-preflight-exact-agent-v1",
        "status": "PASS_PREPARED_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_OUTER_SPINE_INTERNAL_EXACT_ENGINES",
        "root_orbit": "four_cubic_path:outer_spine_internal",
        "reduction_counts": {
            "eligible_finite": 37_143_771,
            "non_all_short_rays": 119_233_660,
            "total_quotient_keys": 157_351_936,
        },
        "bounded_smokes": {
            "producer_random_expanded_literal_formula_checks": 512,
            "audit_random_and_cached_expanded_literal_checks": 1024,
            "shared_canonical_finite_records": 122,
            "shared_canonical_ray_records": 385,
            "matching_coefficient_smoke_stream_sha256": STREAM.split()[1],
            "matching_finite_smoke_stream_sha256": STREAM.split()[2],
        },
        "independence_boundary": (
            "The producer combines cached left/right root messages. The audit instead "
            "propagates from B0 through the selected root and B1-B2-B3, derives the "
            "root-deleted right component separately, and uses its own adjacency builder."
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Prepared and smoke-validated only. No full 157,351,936-key scan was "
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
