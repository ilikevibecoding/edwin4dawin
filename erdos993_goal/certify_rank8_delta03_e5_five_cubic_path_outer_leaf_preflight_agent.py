#!/usr/bin/env python3
"""Fail-closed preflight for five_cubic_path:outer_leaf engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_outer_leaf_"
    "preflight_exact_agent_20260825.json"
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
    "certify_rank8_delta03_e5_five_cubic_path_outer_leaf_newton_reduction_agent.py":
        "3C2B58408A8F10B103FD1FF1B6ED577ED02571776BC2A191C46AF1D4AE93ADB0",
    "rank8_delta03_e5_five_cubic_path_outer_leaf_newton_reduction_exact_agent_20260825.json":
        "AA7E88AFDAE141CF66E7DA7B7757602517C25F72F337B726CE46F4EED07555F5",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_center_branch_i256_agent.rs":
        "FDF39F04F5F93D0C8A2569E049E5DD53A73753DEFA4206411EDA3D43C4B89E65",
    "audit_rank8_delta03_e5_five_cubic_t_center_branch_literal_i256_agent.rs":
        "674E6D9173E635DEBC0F344C8E755D8EF2CECFE656A3648CAF30B5D2BEBC0B45",
    "produce_rank8_delta03_e5_five_cubic_path_outer_leaf_i256_agent.rs":
        "170307F580D946C8F0FDD50CFF90FE153866DB0A9208FF8567EFB3EF91EA9772",
    "produce_rank8_delta03_e5_five_cubic_path_outer_leaf_i256_agent.exe":
        "B9DEA9C2C5DFFAEB85921BCB94F3E78329271F52BF34C4EB998E8B17BE68BB69",
    "audit_rank8_delta03_e5_five_cubic_path_outer_leaf_literal_i256_agent.rs":
        "346A11776AAC56B5B444CABB813237DF60833598DD3A82AB0D0007105FFD590B",
    "audit_rank8_delta03_e5_five_cubic_path_outer_leaf_literal_i256_agent.exe":
        "9E4F311E05D9BA416B6419A8FF06273DC3B5A94BA43F26E4BA72945469F42C42",
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
    records = "SMOKE_RECORDS 103 408"
    gate = "SMOKE_GATE_FAILURES 0"
    stream = (
        "SMOKE_STREAM "
        "7ED300003B79630B1303D8AF852715E063D6E2C647B96825CDAE73202AA055BE "
        "A2387050BF485DD46DB8F749A1B24CEEE4D61EF818C664419F47A27967E3E0D8"
    )
    primary = run(
        "produce_rank8_delta03_e5_five_cubic_path_"
        "outer_leaf_i256_agent.exe"
    )
    audit = run(
        "audit_rank8_delta03_e5_five_cubic_path_"
        "outer_leaf_literal_i256_agent.exe"
    )
    assert primary == [
        "PASS_E5_FIVE_CUBIC_PATH_OUTER_LEAF_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        records,
        gate,
        stream,
    ]
    assert audit == [
        "PASS_E5_FIVE_CUBIC_PATH_OUTER_LEAF_INDEPENDENT_1024_LITERAL_SMOKE",
        records,
        gate,
        stream,
    ]
    assert primary[-1] == audit[-1]

    payload = {
        "schema": "rank8-delta03-e5-five-cubic-path-outer-leaf-preflight-agent-v1",
        "status": (
            "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_PATH_"
            "OUTER_LEAF_PRIMARY_AUDIT_MATCH"
        ),
        "root_orbit": "five_cubic_path:outer_leaf",
        "exact_workload": {
            "canonical_keys": 2_202_927_104,
            "all_short": 457_419_312,
            "eligible_finite_n28_plus": 453_426_133,
            "mixed_rays": 1_745_507_791,
            "all_long_rays": 1,
            "total_rays": 1_745_507_792,
            "unseen_rank_checks_per_engine": 6_982_031_168,
            "independent_literal_trees": 5_689_949_509,
        },
        "bounded_smokes": {
            "primary_literal": 512,
            "audit_literal_and_cache": 1024,
            "records": [103, 408],
            "gate_failures": 0,
            "streams": stream.split()[1:],
        },
        "full_workload": {
            "formula_evaluations_per_engine": 52_818_659_893,
            "threads": 6,
            "ordered_shards": 6,
            "shard_bounds": [0, 4422, 8819, 13213, 17566, 21747, 25088],
            "stream_storage": (
                "constant-memory per-shard SHA256 leaves with a pinned "
                "ordered six-shard root"
            ),
        },
        "memory_gate_bytes": 536_870_912,
        "independence": (
            "Primary and audit are separately compiled over separately "
            "transcribed root-directed transfer formulas. The audit "
            "reconstructs literal adjacency trees at all three ray points and "
            "every eligible finite key; both match ordered streams."
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Preflight only. Full primary and full independent audit are "
            "both required before this one orbit receives n>=28 credit."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
