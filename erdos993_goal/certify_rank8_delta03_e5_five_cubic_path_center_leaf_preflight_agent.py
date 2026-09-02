#!/usr/bin/env python3
"""Fail-closed preflight for five_cubic_path:center_leaf engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_center_leaf_"
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
    "certify_rank8_delta03_e5_five_cubic_path_center_leaf_newton_reduction_agent.py":
        "9EC3D74AD60AFF97497A1938834C62F375963B2C1E8AE0387676B395AB337FD7",
    "rank8_delta03_e5_five_cubic_path_center_leaf_newton_reduction_exact_agent_20260825.json":
        "1FCAAD9EC07B243B36675181658DB949071180BBD64D39C9BCD57176EF91C148",
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
    "produce_rank8_delta03_e5_five_cubic_path_center_leaf_i256_agent.rs":
        "59BC54C94A278DFC7B4DEACDB798D63CEB2B950C4767424E5B79033E2914F847",
    "produce_rank8_delta03_e5_five_cubic_path_center_leaf_i256_agent.exe":
        "B2BF999F115BDFEAA19E2E9DCEAD2DACB34076B16FFB5750933D59FE23E870BF",
    "audit_rank8_delta03_e5_five_cubic_path_center_leaf_literal_i256_agent.rs":
        "4B5AB5C4FB883BFA69ECBCB22D6BFFBDC08E8960EAB903F266F15778137BEBB5",
    "audit_rank8_delta03_e5_five_cubic_path_center_leaf_literal_i256_agent.exe":
        "0F40957155BF29783B050A742E335B9D9D05BDF6BA12B997B724EF9574D59437",
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
    records = "SMOKE_RECORDS 104 405"
    gate = "SMOKE_GATE_FAILURES 0"
    stream = (
        "SMOKE_STREAM "
        "3ED83DC959E27853A993ABC4DCEC733A1ABA99CAC2B2231E6B276E291D506BD1 "
        "33F7F6AA1A2BABF0FE5B65C147FBAF19811F769A95BECEE086CAF9BBC81A99C0"
    )
    primary = run(
        "produce_rank8_delta03_e5_five_cubic_path_"
        "center_leaf_i256_agent.exe"
    )
    audit = run(
        "audit_rank8_delta03_e5_five_cubic_path_"
        "center_leaf_literal_i256_agent.exe"
    )
    assert primary == [
        "PASS_E5_FIVE_CUBIC_PATH_CENTER_LEAF_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        records,
        gate,
        stream,
    ]
    assert audit == [
        "PASS_E5_FIVE_CUBIC_PATH_CENTER_LEAF_INDEPENDENT_1024_LITERAL_SMOKE",
        records,
        gate,
        stream,
    ]
    assert primary[-1] == audit[-1]

    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-center-leaf-"
            "preflight-agent-v1"
        ),
        "status": (
            "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_PATH_"
            "CENTER_LEAF_PRIMARY_AUDIT_MATCH"
        ),
        "root_orbit": "five_cubic_path:center_leaf",
        "exact_workload": {
            "canonical_keys": 629_457_920,
            "all_short": 133_435_575,
            "eligible_finite_n28_plus": 132_182_485,
            "mixed_rays": 496_022_344,
            "all_long_rays": 1,
            "total_rays": 496_022_345,
            "unseen_rank_checks_per_engine": 1_984_089_380,
            "independent_literal_trees": 1_620_249_520,
        },
        "bounded_smokes": {
            "primary_literal": 512,
            "audit_literal_and_cache": 1024,
            "records": [104, 405],
            "gate_failures": 0,
            "streams": stream.split()[1:],
        },
        "full_workload": {
            "formula_evaluations_per_engine": 15_012_852_835,
            "threads": 6,
            "ordered_shards": 6,
            "stream_storage": (
                "constant-memory per-shard SHA256 leaves with a pinned "
                "ordered six-shard root"
            ),
        },
        "memory_gate_bytes": 536_870_912,
        "independence": (
            "Primary and audit are separately compiled over separately "
            "transcribed transfer messages. The audit reconstructs literal "
            "adjacency trees at all three ray points and every eligible "
            "finite key; both enumerate the 78,682,240 unordered half pairs "
            "times eight incident-pendant states directly and match ordered streams."
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
