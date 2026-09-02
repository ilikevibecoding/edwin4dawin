#!/usr/bin/env python3
"""Fail-closed preflight for the five-cubic-T center-branch engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_center_branch_preflight_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json": "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json": "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "certify_rank8_delta03_e5_five_cubic_t_center_branch_newton_reduction_agent.py": "873D0A1486156D1585E40BEC27F44BBB0B8E4F1EECACA37507A9FF43C39C3F11",
    "rank8_delta03_e5_five_cubic_t_center_branch_newton_reduction_exact_agent_20260823.json": "3C11EC670614BBBFBC17779003066402D019A0062F04F65A162D4845D1ED2102",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_center_branch_i256_agent.rs": "FDF39F04F5F93D0C8A2569E049E5DD53A73753DEFA4206411EDA3D43C4B89E65",
    "produce_rank8_delta03_e5_five_cubic_t_center_branch_i256_agent.exe": "1BBE0C375A544AB016ACE8EEF753628103A653D1056C633AB69F711093BA5D2D",
    "audit_rank8_delta03_e5_five_cubic_t_center_branch_literal_i256_agent.rs": "674E6D9173E635DEBC0F344C8E755D8EF2CECFE656A3648CAF30B5D2BEBC0B45",
    "audit_rank8_delta03_e5_five_cubic_t_center_branch_literal_i256_agent.exe": "DCE82B8546FFC0E5B678FCA2CA5CA6F421DA66C5E18EEA0FC32E2CDCFB1CF3AB",
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
    stream = "SMOKE_STREAM 87BA810148505AA825B01986BCA41CE063A292E0CFA57F355613F4FC75EB6A18 246B83EE377B954CBF6B9DDFCCC92C999B0ACEFA36B5ABD1CA55F8A3ECF4B2AB"
    primary = run("produce_rank8_delta03_e5_five_cubic_t_center_branch_i256_agent.exe")
    audit = run("audit_rank8_delta03_e5_five_cubic_t_center_branch_literal_i256_agent.exe")
    assert primary == [
        "PASS_E5_FIVE_CUBIC_T_CENTER_BRANCH_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        records,
        gate,
        stream,
    ]
    assert audit == [
        "PASS_E5_FIVE_CUBIC_T_CENTER_BRANCH_INDEPENDENT_1024_LITERAL_SMOKE",
        records,
        gate,
        stream,
    ]
    assert primary[-1] == audit[-1]
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-center-branch-preflight-agent-v1",
        "status": "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_T_CENTER_BRANCH_PRIMARY_AUDIT_MATCH",
        "root_orbit": "five_cubic_t:center_branch",
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
