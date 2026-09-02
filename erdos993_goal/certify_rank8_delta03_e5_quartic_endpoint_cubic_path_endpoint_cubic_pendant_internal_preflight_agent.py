#!/usr/bin/env python3
"""Fail-closed preflight for endpoint-cubic-pendant-internal e=5 engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_preflight_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json": "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json": "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "certify_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_newton_reduction_agent.py": "EBD1CEF55EC8BC7503EBA0EEE9F34E3B32AA8E49E8F12391174934BD89AA59A2",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_newton_reduction_exact_agent_20260823.json": "3133A55138FCA7D9BA62A95F8D7B385C7EAF5E075B931A41BC888CDD25F762EF",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_i256_agent.rs": "A3B0D2F1627E2F27DE6B7FB66AAED0E86982467957C59FDE41681047F6D7E036",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_i256_agent.exe": "D7F0E415B6303D7E260CF6CD92E1541668B5332FAA64B338CDAE07E647D5DFDF",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_literal_i256_agent.rs": "7C5A0FD41E89898990B60306B405D195EB7F066A5B7E55D82AE44FC6F4640C32",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_literal_i256_agent.exe": "7E213B5FBBF724C01C6609122FB41927A3278FD10EA2D7513A1D9C38F9CB5DF9",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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
    primary = run("produce_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_i256_agent.exe")
    audit = run("audit_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_literal_i256_agent.exe")
    assert primary == [
        "PASS_E5_ENDPOINT_CUBIC_PENDANT_INTERNAL_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        "SMOKE_RECORDS 109 388",
        "SMOKE_GATE_FAILURES 0",
        "SMOKE_STREAM E73AEF927B937EE5A9FC826BEF29197677606623335BBC7969D32C182EDE81EE 54BF9AA326867DD21EFB5D3A099101A172C5E92149DD5C209C0EECA170460080",
    ]
    assert audit == [
        "PASS_E5_ENDPOINT_CUBIC_PENDANT_INTERNAL_INDEPENDENT_1024_LITERAL_SMOKE",
        "SMOKE_RECORDS 109 388",
        "SMOKE_GATE_FAILURES 0",
        "SMOKE_STREAM E73AEF927B937EE5A9FC826BEF29197677606623335BBC7969D32C182EDE81EE 54BF9AA326867DD21EFB5D3A099101A172C5E92149DD5C209C0EECA170460080",
    ]
    assert primary[-1] == audit[-1]
    psrc = (ROOT / "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_i256_agent.rs").read_text()
    asrc = (ROOT / "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_literal_i256_agent.rs").read_text()
    assert "qsp_literal_tree" in psrc and "qsa_tree" in asrc
    assert "qsp_endpoint_core" in psrc and "qsa_endpoint_core" in asrc
    assert "QSP_CORE_COUNT: usize = 2_107_392" in psrc
    assert "QSA_CORE_COUNT:usize=2_107_392" in asrc
    assert psrc != asrc
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-endpoint-cubic-pendant-internal-preflight-agent-v1",
        "status": "PASS_EXACT_PREFLIGHT_E5_ENDPOINT_CUBIC_PENDANT_INTERNAL_PRIMARY_AUDIT_MATCH",
        "root_orbit": "quartic_endpoint_cubic_path:endpoint_cubic_pendant_internal",
        "exact_workload": {
            "canonical_keys": 14_751_744,
            "all_short": 4_148_928,
            "eligible_finite_n28_plus": 3_619_379,
            "mixed_rays": 10_602_815,
            "all_long_rays": 1,
            "total_rays": 10_602_816,
            "unseen_rank_checks_per_engine": 42_411_264,
            "independent_literal_trees": 35_427_827,
        },
        "memory_contract": "Decode the 2,107,392 core-side keys on demand; no 742 MB message table. Exactly one six-thread full engine at a time, checked i256, expected peak below 1 GB.",
        "independence": "Primary and audit are separately compiled, use distinct message/literal-tree implementations, and match exact finite/coefficient smoke streams.",
        "primary_smoke": primary,
        "independent_audit_smoke": audit,
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
