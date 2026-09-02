#!/usr/bin/env python3
"""Fail-closed bounded preflight for outer-pendant-internal exact engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e4_four_cubic_path_outer_pendant_internal_"
    "preflight_exact_agent_20260823.json"
)
EXPECTED = {
    "certify_rank8_delta03_e4_four_cubic_path_outer_pendant_internal_newton_reduction_agent.py":
        "BA63B54E8C918A4E913EFF568DD7EE7AC981C30C6426B7FAA9A0D4ED31677EFD",
    "rank8_delta03_e4_four_cubic_path_outer_pendant_internal_newton_reduction_exact_agent_20260823.json":
        "9FC2B252D978B41F355D099F791CD17A0AF8944CC7DE7ABE76610073E51F6B8E",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e4_four_cubic_path_outer_pendant_internal_i256_agent.rs":
        "872E2F1B0DC827F19E619225C6365329606AC180FD375E04072BF37D8A3DA672",
    "produce_rank8_delta03_e4_four_cubic_path_outer_pendant_internal_i256_agent.exe":
        "5FA914BC2CF445FD54AB4D4365976D5F4E660B4798D88F179D88C004F34D3071",
    "audit_rank8_delta03_e4_four_cubic_path_outer_pendant_internal_literal_i256_agent.rs":
        "27F558BD2CA9D47A0E5CFE197E2BEC6269678F24CD233F523EDBD224F5203C69",
    "audit_rank8_delta03_e4_four_cubic_path_outer_pendant_internal_literal_i256_agent.exe":
        "F83A24ECCE3D4A05A7B3503D366F33E644C0E05CEC4BEB83CA7716DDA78546CA",
}
PRIMARY_EXE = (
    "produce_rank8_delta03_e4_four_cubic_path_"
    "outer_pendant_internal_i256_agent.exe"
)
AUDIT_EXE = (
    "audit_rank8_delta03_e4_four_cubic_path_"
    "outer_pendant_internal_literal_i256_agent.exe"
)
EXPECTED_RECORDS = "SMOKE_RECORDS 127 380"
EXPECTED_STREAM = (
    "SMOKE_STREAM "
    "F8C3A7B5D3F2F4205EEEE6608A2D4B454C35DFAC67A298C13729CC94913F4209 "
    "E29F5585E23AE9CEAA9C3F3ABA2AC65D6B0A5D38BC1B0C8773C0F5787C0AAA82"
)


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def smoke(executable: str) -> list[str]:
    completed = subprocess.run(
        [str(ROOT / executable), "smoke"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert completed.stderr == ""
    return completed.stdout.splitlines()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = smoke(PRIMARY_EXE)
    audit = smoke(AUDIT_EXE)
    assert primary == [
        "PASS_FOUR_CUBIC_PATH_OUTER_PENDANT_INTERNAL_512_LITERAL_FORMULA_SMOKE",
        EXPECTED_RECORDS,
        EXPECTED_STREAM,
    ]
    assert audit == [
        "PASS_INDEPENDENT_FOUR_CUBIC_PATH_OUTER_PENDANT_INTERNAL_1024_LITERAL_SMOKE",
        EXPECTED_RECORDS,
        EXPECTED_STREAM,
    ]
    payload = {
        "schema": (
            "rank8-delta03-e4-four-cubic-path-outer-pendant-internal-"
            "preflight-exact-agent-v1"
        ),
        "status": (
            "PASS_PREPARED_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_"
            "OUTER_PENDANT_INTERNAL_EXACT_ENGINES"
        ),
        "root_orbit": "four_cubic_path:outer_pendant_internal",
        "reduction_counts": {
            "eligible_finite": 63_768_530,
            "non_all_short_rays": 210_020_272,
            "total_quotient_keys": 275_365_888,
        },
        "bounded_smokes": {
            "producer_random_expanded_literal_formula_checks": 512,
            "audit_random_and_cached_expanded_literal_checks": 1024,
            "shared_canonical_finite_records": 127,
            "shared_canonical_ray_records": 380,
            "matching_coefficient_smoke_stream_sha256": EXPECTED_STREAM.split()[1],
            "matching_finite_smoke_stream_sha256": EXPECTED_STREAM.split()[2],
        },
        "independence_boundary": (
            "The producer combines a far-to-root cached B1 state at the selected "
            "root. The audit independently propagates full and root-deleted "
            "states forward from the selected root through B0--B1--B2--B3 and "
            "uses a separately written adjacency builder."
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Prepared and smoke-validated only. No full 275,365,888-key scan "
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
