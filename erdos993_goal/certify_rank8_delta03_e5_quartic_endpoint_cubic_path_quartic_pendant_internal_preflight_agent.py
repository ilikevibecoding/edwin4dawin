#!/usr/bin/env python3
"""Fail-closed preflight for quartic-pendant-internal e=5 endpoint-skeleton engines."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_preflight_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json": "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json": "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "certify_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_newton_reduction_agent.py": "07413AA78C05CF0EBBD3B3762B015466866C68EA41BD0EA9C4B855E1BEEE3FA5",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_newton_reduction_exact_agent_20260823.json": "A3D3CA5B439995B4879DD3B58697821FB8F0604B8A1FB603DA570B8C6765064B",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_i256_agent.rs": "8E0211BA99C89710D771757E49440A0D9CAEC4F0B870F406890AA581FEFF52DB",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_i256_agent.exe": "A76A077D20C8B311299BA6E7435BF1F678B5443C3BE44F1B88CE1C5D65891743",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_literal_i256_agent.rs": "5AA716A8069B9346B0699327264517ADC6A872C7581C8186AAE0E6F51CB122B0",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_literal_i256_agent.exe": "C0A883504A1E686C25158558731DCEF4250B92F147C9570507461DDCC215947C",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def run(name: str) -> list[str]:
    completed = subprocess.run(
        [str(ROOT / name), "smoke"], cwd=ROOT, check=True,
        capture_output=True, text=True, timeout=240,
    )
    assert completed.stderr == ""
    return completed.stdout.strip().splitlines()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    records = "SMOKE_RECORDS 123 367"
    gate = "SMOKE_GATE_FAILURES 0"
    stream = "SMOKE_STREAM 628058A9D47B331F4F02102552992F96B26996F26D39140005B85860874449D7 80E247489A049243F6AD11F0720C4019423F2CD9E7B956EE6561FCBE5DD663D6"
    primary = run("produce_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_i256_agent.exe")
    audit = run("audit_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_literal_i256_agent.exe")
    assert primary == [
        "PASS_E5_QUARTIC_ENDPOINT_QUARTIC_PENDANT_INTERNAL_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        records, gate, stream,
    ]
    assert audit == [
        "PASS_E5_QUARTIC_ENDPOINT_QUARTIC_PENDANT_INTERNAL_INDEPENDENT_1024_LITERAL_SMOKE",
        records, gate, stream,
    ]
    assert primary[-1] == audit[-1]
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-quartic-pendant-internal-preflight-agent-v1",
        "status": "PASS_EXACT_PREFLIGHT_E5_QUARTIC_ENDPOINT_QUARTIC_PENDANT_INTERNAL_PRIMARY_AUDIT_MATCH",
        "root_orbit": "quartic_endpoint_cubic_path:quartic_pendant_internal",
        "exact_workload": {
            "canonical_keys": 19_668_992,
            "all_short": 5_445_468,
            "eligible_finite_n28_plus": 4_768_380,
            "mixed_rays": 14_223_523,
            "all_long_rays": 1,
            "total_rays": 14_223_524,
            "unseen_rank_checks_per_engine": 56_894_096,
            "independent_literal_trees": 47_438_952,
        },
        "bounded_smokes": {
            "primary_literal": 512,
            "audit_literal_and_cache": 1024,
            "records": [123, 367],
            "gate_failures": 0,
            "streams": stream.split()[1:],
        },
        "full_workload": {
            "formula_evaluations_per_engine": 431_474_100,
            "leaf_bytes": 607_740_928,
            "threads": 6,
            "ordered_tasks": 56,
        },
        "memory_gate_bytes": 805_306_368,
        "independence": "Primary and audit are separately compiled, use distinct message and literal-tree implementations, and match exact finite/coefficient smoke streams.",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Preflight only. Full primary and full independent audit are both required before this single orbit receives n>=28 credit.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
