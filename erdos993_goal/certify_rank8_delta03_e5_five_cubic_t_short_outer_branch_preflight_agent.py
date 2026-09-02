#!/usr/bin/env python3
"""Fail-closed preflight for the five-cubic-T short-outer-branch engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_t_short_outer_branch_"
    "preflight_exact_agent_20260823.json"
)
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":
        "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":
        "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "certify_rank8_delta03_e5_five_cubic_t_short_outer_branch_newton_reduction_agent.py":
        "A954A6105562B862BCD5E7EBCAFC87FFCA4E4CC911EBA477A5656AD216AC6ED9",
    "rank8_delta03_e5_five_cubic_t_short_outer_branch_newton_reduction_exact_agent_20260823.json":
        "1D0F0561D9EB49CD4E576443AB3A556A4A23A1C835B0D3E4C5D44EEDFB28B3BC",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_short_outer_branch_i256_agent.rs":
        "3FAE9E06B987109EECB33F0200336943B70B9389F0BCC3BB30E7653E03926780",
    "produce_rank8_delta03_e5_five_cubic_t_short_outer_branch_i256_agent.exe":
        "B6F4EC687EBC29A36D3B64F0602B52565918ACF823BF4BBE7C94FAD37B4F376E",
    "audit_rank8_delta03_e5_five_cubic_t_short_outer_branch_literal_i256_agent.rs":
        "432D27841204DB0DDFED4F1EDE549967878EC6295212F3D55C81FB3558740D67",
    "audit_rank8_delta03_e5_five_cubic_t_short_outer_branch_literal_i256_agent.exe":
        "52AF6A46B0C4FB903CA7EC5511516F66E132677BB403356F85B5466C74C47B84",
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
    records = "SMOKE_RECORDS 80 432"
    gate = "SMOKE_GATE_FAILURES 0"
    stream = (
        "SMOKE_STREAM "
        "1AD5C29F58CF280D9F55E95090464314F3200E8B9C530727154CD3EF9C5BA6A3 "
        "3174BA6A7B28108F05309E1E2F2B1AD39C105A933F734203026E3BFA67FAB951"
    )
    primary = run(
        "produce_rank8_delta03_e5_five_cubic_t_short_outer_branch_i256_agent.exe"
    )
    audit = run(
        "audit_rank8_delta03_e5_five_cubic_t_short_outer_branch_literal_i256_agent.exe"
    )
    assert primary == [
        "PASS_E5_FIVE_CUBIC_T_SHORT_OUTER_BRANCH_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        records,
        gate,
        stream,
    ]
    assert audit == [
        "PASS_E5_FIVE_CUBIC_T_SHORT_OUTER_BRANCH_INDEPENDENT_1024_LITERAL_SMOKE",
        records,
        gate,
        stream,
    ]
    assert primary[-1] == audit[-1]
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-t-short-outer-branch-"
            "preflight-agent-v1"
        ),
        "status": (
            "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_T_SHORT_OUTER_BRANCH_"
            "PRIMARY_AUDIT_MATCH"
        ),
        "root_orbit": "five_cubic_t:short_outer_branch",
        "exact_workload": {
            "canonical_keys": 629_407_744,
            "all_short": 133_413_966,
            "eligible_finite_n28_plus": 131_875_095,
            "mixed_rays": 495_993_777,
            "all_long_rays": 1,
            "total_rays": 495_993_778,
            "unseen_rank_checks_per_engine": 1_983_975_112,
            "independent_literal_trees": 1_619_856_429,
        },
        "bounded_smokes": {
            "primary_literal": 512,
            "audit_literal_and_cache": 1024,
            "records": [80, 432],
            "gate_failures": 0,
            "streams": stream.split()[1:],
        },
        "full_workload": {
            "formula_evaluations_per_engine": 15_011_688_435,
            "threads": 6,
            "ordered_shards": 6,
            "rooted_arm_bounds": [0, 40, 79, 118, 157, 193, 224],
            "stream_storage": (
                "constant-memory per-shard SHA256 leaves with a pinned "
                "ordered six-shard root"
            ),
        },
        "root_stabilizer_guard": (
            "the rooted short arm and the other short arm are ordered; the "
            "three pendant-leaf pairs alone are unordered"
        ),
        "memory_gate_bytes": 536_870_912,
        "independence": (
            "Primary and audit are separately compiled and separately "
            "transcribed; the audit uses its own messages, adjacency builder, "
            "literal tree evaluation, and exact finite/coefficient stream replay."
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Preflight only. Full primary and full independent audit are both "
            "required before this single orbit receives n>=28 credit."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
