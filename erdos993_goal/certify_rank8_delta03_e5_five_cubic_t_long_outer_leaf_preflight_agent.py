#!/usr/bin/env python3
"""Fail-closed preflight for the five-cubic-T long-outer-leaf engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_long_outer_leaf_preflight_exact_agent_20260824.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json": "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json": "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "certify_rank8_delta03_e5_five_cubic_t_long_outer_leaf_newton_reduction_agent.py": "978E60F29CCC4B61DB01777FAC2A6E89E95BBD8E1894F63FD1900FCC373C70E6",
    "rank8_delta03_e5_five_cubic_t_long_outer_leaf_newton_reduction_exact_agent_20260823.json": "D749F6047099DF1631BC299A7E4DE0D8238A12E68B93082467D49701BCADF108",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_long_outer_leaf_i256_agent.rs": "42B4E4025F0B2CBBDCC9368EB2698469ADEC2F99CE54FA5EC331804664B0017A",
    "produce_rank8_delta03_e5_five_cubic_t_long_outer_leaf_i256_agent.exe": "069434EA6832CDB7AC8CF71B6F65B741E646B35CBB35C4520B7CB2701F674E49",
    "audit_rank8_delta03_e5_five_cubic_t_long_outer_leaf_literal_i256_agent.rs": "9FC8F3E2BD1758DF0B99B503EB9F05C03D66661FF460A57D47B3FE906F7E2038",
    "audit_rank8_delta03_e5_five_cubic_t_long_outer_leaf_literal_i256_agent.exe": "B53A6DCC1080CE09E4272E02DF1C0A108B01A8DD7B04DA0D2659DCCAED656820",
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
    records = "SMOKE_RECORDS 113 399"
    gate = "SMOKE_GATE_FAILURES 0"
    stream = "SMOKE_STREAM 521B3026406932A2473C23CB976D6EBB02D4C916D6D5141E33E24DA7ABF81ADB 34A9B8880A95DE1535A824A9D89BF58001D912A864313A400696FB1D7909DA72"
    primary = run("produce_rank8_delta03_e5_five_cubic_t_long_outer_leaf_i256_agent.exe")
    audit = run("audit_rank8_delta03_e5_five_cubic_t_long_outer_leaf_literal_i256_agent.exe")
    assert primary == [
        "PASS_E5_FIVE_CUBIC_T_LONG_OUTER_LEAF_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        records,
        gate,
        stream,
    ]
    assert audit == [
        "PASS_E5_FIVE_CUBIC_T_LONG_OUTER_LEAF_INDEPENDENT_1024_LITERAL_SMOKE",
        records,
        gate,
        stream,
    ]
    assert primary[-1] == audit[-1]
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-long-outer-leaf-preflight-agent-v1",
        "status": "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_T_LONG_OUTER_LEAF_PRIMARY_AUDIT_MATCH",
        "root_orbit": "five_cubic_t:long_outer_leaf",
        "exact_workload": {
            "canonical_keys": 632_217_600,
            "all_short": 134_321_544,
            "order27": 484_843,
            "eligible_finite_n28_plus": 133_041_981,
            "mixed_rays": 497_896_055,
            "all_long_rays": 1,
            "total_rays": 497_896_056,
            "unseen_rank_checks_per_engine": 1_991_584_224,
            "independent_literal_trees": 1_626_730_149,
        },
        "bounded_smokes": {
            "primary_literal": 512,
            "audit_literal_and_cache": 1024,
            "records": [113, 399],
            "gate_failures": 0,
            "streams": stream.split()[1:],
        },
        "full_workload": {
            "formula_evaluations_per_engine": 15_069_923_661,
            "threads": 6,
            "ordered_shards": 6,
            "stream_storage": "constant-memory per-shard SHA256 leaves with a pinned ordered six-shard root",
        },
        "root_guard": "The distinguished incident root-pendant is ordered against the other long-outer pendant, has domain 1..8, and alone uses sentinel 8; all six nondistinguished pendants have domain 1..7 and sentinel 7.",
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
