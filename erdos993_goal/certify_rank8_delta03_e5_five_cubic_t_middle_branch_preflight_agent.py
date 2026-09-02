#!/usr/bin/env python3
"""Fail-closed preflight for the five-cubic-T middle-branch engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_middle_branch_preflight_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json": "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json": "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "certify_rank8_delta03_e5_five_cubic_t_middle_branch_newton_reduction_agent.py": "0B16AA96DF711E2472A344DCFD58F72F90FDD11E00E421E05E4D643FB9BE4A5F",
    "rank8_delta03_e5_five_cubic_t_middle_branch_newton_reduction_exact_agent_20260823.json": "0181BED93E802DE77C5AED6CF0A3789D32701FA9FC4ED0CB9DAEE0B9E42DFD4D",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_middle_branch_i256_agent.rs": "A794C56F0001CD99B09C251DD9924531DA6BAA31AB8ED2955C11180B959A386B",
    "produce_rank8_delta03_e5_five_cubic_t_middle_branch_i256_agent.exe": "AE570F27656CA2B595EA549A831C7752C9D4369016A940251250F9AC1518C4FB",
    "audit_rank8_delta03_e5_five_cubic_t_middle_branch_literal_i256_agent.rs": "49383359F4D6441913B7D6C57261EC90FA0CACE37FB5DB29386E973D13A486FF",
    "audit_rank8_delta03_e5_five_cubic_t_middle_branch_literal_i256_agent.exe": "6F613CC7B0C3E281699BD07D32B9AF40AB123BA2927E8D5284F611FCDA16D60C",
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
    stream = "SMOKE_STREAM 0341B3A629DDED74EE7F8539832847BAFABA25659A715BC69463B40FFE5FEBB1 17E6FEC1B65574E4874706C4EDE2258356C0228284C8757D7484326DFC6A07EE"
    primary = run("produce_rank8_delta03_e5_five_cubic_t_middle_branch_i256_agent.exe")
    audit = run("audit_rank8_delta03_e5_five_cubic_t_middle_branch_literal_i256_agent.exe")
    assert primary == [
        "PASS_E5_FIVE_CUBIC_T_MIDDLE_BRANCH_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        records,
        gate,
        stream,
    ]
    assert audit == [
        "PASS_E5_FIVE_CUBIC_T_MIDDLE_BRANCH_INDEPENDENT_1024_LITERAL_SMOKE",
        records,
        gate,
        stream,
    ]
    assert primary[-1] == audit[-1]
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-middle-branch-preflight-agent-v1",
        "status": "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_T_MIDDLE_BRANCH_PRIMARY_AUDIT_MATCH",
        "root_orbit": "five_cubic_t:middle_branch",
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
