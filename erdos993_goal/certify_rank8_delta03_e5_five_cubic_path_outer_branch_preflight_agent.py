#!/usr/bin/env python3
"""Fail-closed preflight for five_cubic_path:outer_branch engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_outer_branch_"
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
    "certify_rank8_delta03_e5_five_cubic_path_outer_branch_newton_reduction_agent.py":
        "D821830BA6231141FE89FF57DB1AA335733981C12181CA3DE8700169276F2CFB",
    "rank8_delta03_e5_five_cubic_path_outer_branch_newton_reduction_exact_agent_20260825.json":
        "486EC23ECDC5E10DF58E2B98A6511EC5194AAC94D472F802492BA9FAAB12863D",
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
    "produce_rank8_delta03_e5_five_cubic_path_outer_branch_i256_agent.rs":
        "A2A3CD951793CB9850BAE37C28BEFB6E69D77112DEE00CBC72E74FC2791BA763",
    "produce_rank8_delta03_e5_five_cubic_path_outer_branch_i256_agent.exe":
        "4D8389D3D97B69509413E720E43656591A40A6143A895648589A03BBAD019E53",
    "audit_rank8_delta03_e5_five_cubic_path_outer_branch_literal_i256_agent.rs":
        "59600CC5AC099FBE930E8C3B8D951D1D3208383E3EBCFB30EDD76C6433C97111",
    "audit_rank8_delta03_e5_five_cubic_path_outer_branch_literal_i256_agent.exe":
        "9DB6AEDEA98F57C50E7B5F3C260EDA2025F2B3BC73F3D6A392826CF0E08BE18B",
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
    records = "SMOKE_RECORDS 101 411"
    gate = "SMOKE_GATE_FAILURES 0"
    stream = (
        "SMOKE_STREAM "
        "53678DDDC1786BAE26CAA08370EEE7AC2FF18E0CB959FE96032938D8E73AECCA "
        "F86C6739A42B8E96CDF6A0F61F03800B8054DD97C286492E37A349E95E44C55D"
    )
    primary = run(
        "produce_rank8_delta03_e5_five_cubic_path_"
        "outer_branch_i256_agent.exe"
    )
    audit = run(
        "audit_rank8_delta03_e5_five_cubic_path_"
        "outer_branch_literal_i256_agent.exe"
    )
    assert primary == [
        "PASS_E5_FIVE_CUBIC_PATH_OUTER_BRANCH_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        records,
        gate,
        stream,
    ]
    assert audit == [
        "PASS_E5_FIVE_CUBIC_PATH_OUTER_BRANCH_INDEPENDENT_1024_LITERAL_SMOKE",
        records,
        gate,
        stream,
    ]
    assert primary[-1] == audit[-1]

    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-outer-branch-"
            "preflight-agent-v1"
        ),
        "status": (
            "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_PATH_"
            "OUTER_BRANCH_PRIMARY_AUDIT_MATCH"
        ),
        "root_orbit": "five_cubic_path:outer_branch",
        "exact_workload": {
            "canonical_keys": 1_101_463_552,
            "all_short": 228_709_656,
            "eligible_finite_n28_plus": 226_246_180,
            "mixed_rays": 872_753_895,
            "all_long_rays": 1,
            "total_rays": 872_753_896,
            "unseen_rank_checks_per_engine": 3_491_015_584,
            "independent_literal_trees": 2_844_507_868,
        },
        "bounded_smokes": {
            "primary_literal": 512,
            "audit_literal_and_cache": 1024,
            "records": [101, 411],
            "gate_failures": 0,
            "streams": stream.split()[1:],
        },
        "full_workload": {
            "formula_evaluations_per_engine": 26_408_863_060,
            "threads": 6,
            "ordered_shards": 6,
            "shard_bounds": [0, 2289, 4422, 6536, 8645, 10754, 12544],
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
            "every eligible finite key; both enumerate the ordered path-half "
            "pair times seven center-pendant states and match ordered streams."
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
