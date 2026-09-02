#!/usr/bin/env python3
"""Fail-closed preflight for five-cubic-T middle-pendant-internal engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_middle_pendant_internal_preflight_exact_agent_20260824.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json": "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json": "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "certify_rank8_delta03_e5_five_cubic_t_middle_pendant_internal_newton_reduction_agent.py": "2B67AD9F28FC158E2607BDD95C0AC7BC0E0BF514AA2BAB57F1ED5702B7D755A0",
    "rank8_delta03_e5_five_cubic_t_middle_pendant_internal_newton_reduction_exact_agent_20260824.json": "8888141D833C738F7805A1A80618A817345CC11437A68C25B16B66C604D4B665",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_middle_pendant_internal_i256_agent.rs": "79FCDAFCF531DAB48D7FE0BDB078417AA904CE85E1214D345BF5296445E4CFF1",
    "produce_rank8_delta03_e5_five_cubic_t_middle_pendant_internal_i256_agent.exe": "123222B63254EEA257E19CCFAEF8735C03FD24DA091734B3ACC807CCBCA0E5C4",
    "audit_rank8_delta03_e5_five_cubic_t_middle_pendant_internal_literal_i256_agent.rs": "5BF0244F54CFFCF7998EA210AC17AC3F098AA5F04449553804BF6709D633B983",
    "audit_rank8_delta03_e5_five_cubic_t_middle_pendant_internal_literal_i256_agent.exe": "63EE42B43FC4DC975D56FDD3DAE42F337E63A65E3A93EDF8E406CFE81E461EC4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def run(name: str) -> list[str]:
    completed = subprocess.run(
        [str(ROOT / name), "smoke"], cwd=ROOT, check=True,
        capture_output=True, text=True, timeout=300,
    )
    assert completed.stderr == ""
    return completed.stdout.strip().splitlines()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    records = "SMOKE_RECORDS 98 414"
    gate = "SMOKE_GATE_FAILURES 0"
    stream = "SMOKE_STREAM 97E63CE0B7DB69141C3D42FFC79D6FDB57F035B66B5795053F618452D20B5B7E C37E60315BC3E5185ED98211AF621CBE2567AB3E36A3415ADB0EB96EB88235B6"
    primary = run("produce_rank8_delta03_e5_five_cubic_t_middle_pendant_internal_i256_agent.exe")
    audit = run("audit_rank8_delta03_e5_five_cubic_t_middle_pendant_internal_literal_i256_agent.exe")
    assert primary == [
        "PASS_E5_FIVE_CUBIC_T_MIDDLE_PENDANT_INTERNAL_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        records, gate, stream,
    ]
    assert audit == [
        "PASS_E5_FIVE_CUBIC_T_MIDDLE_PENDANT_INTERNAL_INDEPENDENT_1024_LITERAL_SMOKE",
        records, gate, stream,
    ]
    assert primary[-1] == audit[-1]
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-middle-pendant-internal-preflight-agent-v1",
        "status": "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_T_MIDDLE_PENDANT_INTERNAL_PRIMARY_AUDIT_MATCH",
        "root_orbit": "five_cubic_t:middle_pendant_internal",
        "exact_workload": {
            "canonical_keys": 2_528_870_400,
            "all_short": 470_125_404,
            "order27": 488_047,
            "eligible_finite_n28_plus": 468_960_977,
            "mixed_rays": 2_058_744_995,
            "all_long_rays": 1,
            "total_rays": 2_058_744_996,
            "unseen_rank_checks_per_engine": 8_234_979_984,
            "independent_literal_trees": 6_645_195_965,
        },
        "bounded_smokes": {
            "primary_literal": 512,
            "audit_literal_and_cache": 1024,
            "records": [98, 414],
            "gate_failures": 0,
            "streams": stream.split()[1:],
        },
        "full_workload": {
            "formula_evaluations_per_engine": 62_231_310_857,
            "threads": 6,
            "ordered_shards": 6,
            "stream_storage": "constant-memory per-shard SHA256 leaves with a pinned ordered six-shard root",
        },
        "root_guard": "The selected middle pendant is split at its internal root into a near gap with domain 0..7 and sentinel 7 plus a tail with domain 1..7 and sentinel 7; the two short outer arms and the long-outer pendant pair retain their separate unordered quotients.",
        "memory_gate_bytes": 536_870_912,
        "independence": "Primary and audit are separately compiled and separately transcribed; the audit uses its own messages, adjacency builder, literal tree evaluation, and exact finite/coefficient stream replay.",
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
