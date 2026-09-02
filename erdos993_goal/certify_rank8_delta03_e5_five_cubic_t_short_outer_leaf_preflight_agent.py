#!/usr/bin/env python3
"""Fail-closed preflight for the five-cubic-T short-outer-leaf engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_short_outer_leaf_preflight_exact_agent_20260824.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json": "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json": "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "certify_rank8_delta03_e5_five_cubic_t_short_outer_leaf_newton_reduction_agent.py": "14701E50DAC6C58D0D62C57B16DD8C16B3B73DFF3E7FE8A01D4A39CE47BE606B",
    "rank8_delta03_e5_five_cubic_t_short_outer_leaf_newton_reduction_exact_agent_20260824.json": "8CEF6E019E409DAEE4D280455DEAE36CA79C1543F75982D0D9752F9DAEF87D72",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_short_outer_leaf_i256_agent.rs": "C73519F3894F9FE8404A3F4540575166CF72AEAB4491E1DC2F605B53A745C2F3",
    "produce_rank8_delta03_e5_five_cubic_t_short_outer_leaf_i256_agent.exe": "4E70CCD7C05C15032E75A5790280C5F033A003C97D3081C625473EBBCA042AF6",
    "audit_rank8_delta03_e5_five_cubic_t_short_outer_leaf_literal_i256_agent.rs": "C67EC2BD11EBB4A68F58203B0EADCB742A0AB72B0D4583FEC01216FA6124C3DA",
    "audit_rank8_delta03_e5_five_cubic_t_short_outer_leaf_literal_i256_agent.exe": "817BEDF13E83FB18FC3B4840EF4D8ACF328AE23891096034F16F8529959ECE86",
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
    records = "SMOKE_RECORDS 111 400"
    gate = "SMOKE_GATE_FAILURES 0"
    stream = "SMOKE_STREAM CE9484727A4B257AD8BC90CB6D5554D2E1D325342F0F8BF7B16680BB190532D4 287845947E35AF39376A5EE189BBC2629E48D12389BCD91E6CDC61E9BB3AA11E"
    primary = run("produce_rank8_delta03_e5_five_cubic_t_short_outer_leaf_i256_agent.exe")
    audit = run("audit_rank8_delta03_e5_five_cubic_t_short_outer_leaf_literal_i256_agent.exe")
    assert primary == [
        "PASS_E5_FIVE_CUBIC_T_SHORT_OUTER_LEAF_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        records,
        gate,
        stream,
    ]
    assert audit == [
        "PASS_E5_FIVE_CUBIC_T_SHORT_OUTER_LEAF_INDEPENDENT_1024_LITERAL_SMOKE",
        records,
        gate,
        stream,
    ]
    assert primary[-1] == audit[-1]
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-short-outer-leaf-preflight-agent-v1",
        "status": "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_T_SHORT_OUTER_LEAF_PRIMARY_AUDIT_MATCH",
        "root_orbit": "five_cubic_t:short_outer_leaf",
        "exact_workload": {
            "canonical_keys": 1_258_815_488,
            "all_short": 266_827_932,
            "order27": 954_201,
            "eligible_finite_n28_plus": 264_323_724,
            "mixed_rays": 991_987_555,
            "all_long_rays": 1,
            "total_rays": 991_987_556,
            "unseen_rank_checks_per_engine": 3_967_950_224,
            "independent_literal_trees": 3_240_286_392,
        },
        "bounded_smokes": {
            "primary_literal": 512,
            "audit_literal_and_cache": 1024,
            "records": [111, 400],
            "gate_failures": 0,
            "streams": stream.split()[1:],
        },
        "full_workload": {
            "formula_evaluations_per_engine": 30_023_950_404,
            "threads": 6,
            "ordered_shards": 6,
            "stream_storage": "constant-memory per-shard SHA256 leaves with a pinned ordered six-shard root",
        },
        "root_guard": "The rooted short arm and other short arm are ordered. Only the other-short-arm pendant pair and long-outer pendant pair are unordered. The distinguished incident pendant alone uses domain 1..8 and sentinel 8.",
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
