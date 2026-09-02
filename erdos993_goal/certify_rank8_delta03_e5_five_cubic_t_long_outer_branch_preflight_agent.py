#!/usr/bin/env python3
"""Fail-closed preflight for the five-cubic-T long-outer-branch engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_long_outer_branch_preflight_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json": "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json": "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "certify_rank8_delta03_e5_five_cubic_t_long_outer_branch_newton_reduction_agent.py": "93B8EFB27E73EEBBAECA9EFB01B30368B388AB599E7A860703F3BC94D689931B",
    "rank8_delta03_e5_five_cubic_t_long_outer_branch_newton_reduction_exact_agent_20260823.json": "DE066C5921F312FDF86D8D94C9F32509E4F4A02A9126483F82769D07905BB365",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_long_outer_branch_i256_agent.rs": "5F247B6B78EE7933C9561EEC9519E843B7099183B1C7A3BC6931D9D24E0B1FB0",
    "produce_rank8_delta03_e5_five_cubic_t_long_outer_branch_i256_agent.exe": "4A2C978332F6E195AA840C0C5729224BB9C73A8113524DD104FB9D6FC669066F",
    "audit_rank8_delta03_e5_five_cubic_t_long_outer_branch_literal_i256_agent.rs": "C4F09C01525F3EDF6DC50D82A08C8A969924078ADD49B9DB107F215D743BAE17",
    "audit_rank8_delta03_e5_five_cubic_t_long_outer_branch_literal_i256_agent.exe": "F509D245F431657DDF074B270666F744022F361AAF0E1260855171146324BFB4",
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
    records = "SMOKE_RECORDS 116 394"
    gate = "SMOKE_GATE_FAILURES 0"
    stream = "SMOKE_STREAM AF66D935A8AF5C3DC3E9772DC2320A6C56B57F81EB56D2C36842EB7B10737E0F 7267BD5113FD6B47D5E94435A963490F395E991332515DC24F3743ECC7E09C18"
    primary = run("produce_rank8_delta03_e5_five_cubic_t_long_outer_branch_i256_agent.exe")
    audit = run("audit_rank8_delta03_e5_five_cubic_t_long_outer_branch_literal_i256_agent.exe")
    assert primary == [
        "PASS_E5_FIVE_CUBIC_T_LONG_OUTER_BRANCH_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        records,
        gate,
        stream,
    ]
    assert audit == [
        "PASS_E5_FIVE_CUBIC_T_LONG_OUTER_BRANCH_INDEPENDENT_1024_LITERAL_SMOKE",
        records,
        gate,
        stream,
    ]
    assert primary[-1] == audit[-1]
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-long-outer-branch-preflight-agent-v1",
        "status": "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_T_LONG_OUTER_BRANCH_PRIMARY_AUDIT_MATCH",
        "root_orbit": "five_cubic_t:long_outer_branch",
        "exact_workload": {
            "canonical_keys": 316_108_800,
            "all_short": 67_160_772,
            "eligible_finite_n28_plus": 66_375_425,
            "mixed_rays": 248_948_027,
            "all_long_rays": 1,
            "total_rays": 248_948_028,
            "unseen_rank_checks_per_engine": 995_792_112,
            "independent_literal_trees": 813_219_509,
        },
        "bounded_smokes": {
            "primary_literal": 512,
            "audit_literal_and_cache": 1024,
            "records": [116, 394],
            "gate_failures": 0,
            "streams": stream.split()[1:],
        },
        "full_workload": {
            "formula_evaluations_per_engine": 7_534_816_265,
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
