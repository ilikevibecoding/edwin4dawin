#!/usr/bin/env python3
"""Fail-closed preflight for the five-cubic-T middle-leaf engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_middle_leaf_preflight_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json": "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json": "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "certify_rank8_delta03_e5_five_cubic_t_middle_leaf_newton_reduction_agent.py": "20A95D7E819E70F48A4A5A6F37431B555938AF004AB8DF9D6D759A7561F76912",
    "rank8_delta03_e5_five_cubic_t_middle_leaf_newton_reduction_exact_agent_20260823.json": "F3A9598CD90A0F993CEBD9920C437CA9E8871D117DC9C6FA95FA37746D79733A",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_middle_leaf_i256_agent.rs": "2E33CEF989CE353E9739F8F05A593107152737C36D649F337243D358F1A248A2",
    "produce_rank8_delta03_e5_five_cubic_t_middle_leaf_i256_agent.exe": "11D316635CE5AF0BCA77559020EED2E09F5F458DF83755141E012AADC5D9F736",
    "audit_rank8_delta03_e5_five_cubic_t_middle_leaf_literal_i256_agent.rs": "AC09C853B7373B7A9BF8192ECD036F885DC5C8D8267BFBFAE59C19B8ABBBCBE0",
    "audit_rank8_delta03_e5_five_cubic_t_middle_leaf_literal_i256_agent.exe": "7AEE1C74AB845D47CBA445D34799390F5B102FF94C03C4DAFA2372733E983FFD",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def run(name: str) -> list[str]:
    completed = subprocess.run(
        [str(ROOT / name), "smoke"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        timeout=300,
    )
    assert completed.stderr == ""
    return completed.stdout.strip().splitlines()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    records = "SMOKE_RECORDS 118 394"
    gate = "SMOKE_GATE_FAILURES 0"
    stream = "SMOKE_STREAM 77E4F95B2220DCD82BE313989C51A92BB4FCA21F70BCB46A6747CE6F22D9DA5E A474112D8BDB24626584FC7048CA66934F6B2457A28FFFCE4B4074C761AE6A1D"
    primary = run("produce_rank8_delta03_e5_five_cubic_t_middle_leaf_i256_agent.exe")
    audit = run("audit_rank8_delta03_e5_five_cubic_t_middle_leaf_literal_i256_agent.exe")
    assert primary == [
        "PASS_E5_FIVE_CUBIC_T_MIDDLE_LEAF_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        records,
        gate,
        stream,
    ]
    assert audit == [
        "PASS_E5_FIVE_CUBIC_T_MIDDLE_LEAF_INDEPENDENT_1024_LITERAL_SMOKE",
        records,
        gate,
        stream,
    ]
    assert primary[-1] == audit[-1]
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-middle-leaf-preflight-agent-v1",
        "status": "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_T_MIDDLE_LEAF_PRIMARY_AUDIT_MATCH",
        "root_orbit": "five_cubic_t:middle_leaf",
        "exact_workload": {
            "canonical_keys": 361_267_200,
            "all_short": 78_354_234,
            "eligible_finite_n28_plus": 77_554_711,
            "mixed_rays": 282_912_965,
            "all_long_rays": 1,
            "total_rays": 282_912_966,
            "unseen_rank_checks_per_engine": 1_131_651_864,
            "independent_literal_trees": 926_293_609,
        },
        "bounded_smokes": {
            "primary_literal": 512,
            "audit_literal_and_cache": 1024,
            "records": [118, 394],
            "gate_failures": 0,
            "streams": stream.split()[1:],
        },
        "full_workload": {
            "formula_evaluations_per_engine": 8_564_943_691,
            "threads": 6,
            "ordered_shards": 6,
            "stream_storage": "constant-memory per-shard SHA256 leaves with a pinned ordered six-shard root",
        },
        "memory_gate_bytes": 536_870_912,
        "independence": "Primary and audit are separately compiled and separately transcribed; the audit uses its own messages, adjacency builder, literal forest evaluation, and exact finite/coefficient stream replay.",
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
