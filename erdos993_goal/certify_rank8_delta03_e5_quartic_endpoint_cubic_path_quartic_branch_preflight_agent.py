#!/usr/bin/env python3
"""Fail-closed bounded preflight for the endpoint-quartic branch engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_"
    "preflight_exact_agent_20260823.json"
)
EXPECTED = {
    "certify_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_newton_reduction_agent.py": "B7A449F91CF64FFCB889F59D6209B90CB14857529DBD8306A52B62CDB457704D",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_newton_reduction_exact_agent_20260823.json": "EE70648680B586839A9C8EB9FD67936D0D46983D6FB74D37A7D6999BCA4C4D88",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_i256_agent.rs": "D55B6D438C356B81B2E160716694A4105697555BBC5468AD1088BBE4060F50F7",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_i256_agent.exe": "1DC5C7033A89CC0DF88A7481052DEDCD66E4F22C6D8DB2CA4867DEF5C29B1491",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_literal_i256_agent.rs": "1554F17F2FB2C08CD8D050563EFC9C61485EE8E20E3EF5E0FB41E95B63ECE9C1",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_literal_i256_agent.exe": "CC4A7BF044FF260F7B524A038280B723233AD219D4F61C4258D2F5CEF53B2308",
}
PRIMARY = "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_i256_agent.exe"
AUDIT = "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_literal_i256_agent.exe"
RECORDS = "SMOKE_RECORDS 106 354"
GATES = "SMOKE_GATE_FAILURES 0"
STREAM = (
    "SMOKE_STREAM "
    "84DB2050F80FF9632FB0B40152D6E67E3C85F593C7BCA031D69D464764420DA3 "
    "AF5BF3167C90B844A9681880403B3D7F005EC3536A1498BC9FBEA2DEC8746E72"
)
BENCH_RAYS = "BENCH_RAYS 1024"
BENCH_STREAM = "BENCH_STREAM 83404D2CA61AC92632994644305BB4BA2B879881E93D68376C8C08694EC1D014"
RESOURCE = ["RESOURCE_TABLE_BYTES 2016 4214784", "RESOURCE_FULL_LEAF_BYTES 30133760"]


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def run(executable: str, mode: str) -> list[str]:
    completed = subprocess.run(
        [str(ROOT / executable), mode], cwd=ROOT, check=True,
        capture_output=True, text=True, timeout=60,
    )
    assert completed.stderr == ""
    return completed.stdout.splitlines()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    assert run(PRIMARY, "smoke") == [
        "PASS_E5_ENDPOINT_QUARTIC_BRANCH_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        RECORDS, GATES, STREAM,
    ]
    assert run(AUDIT, "smoke") == [
        "PASS_E5_ENDPOINT_QUARTIC_BRANCH_INDEPENDENT_1024_LITERAL_SMOKE",
        RECORDS, GATES, STREAM,
    ]
    assert run(PRIMARY, "bench") == [BENCH_RAYS, BENCH_STREAM, *RESOURCE]
    assert run(AUDIT, "bench") == [BENCH_RAYS, BENCH_STREAM, *RESOURCE]
    primary_bench_ms = 962.324
    audit_bench_ms = 1_207.259
    rays = 707_952
    workers = 6
    conservative_seconds = (primary_bench_ms + audit_bench_ms) / 1_000 * rays / 1_024 / workers
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-quartic-branch-preflight-exact-agent-v1",
        "status": "PASS_PREPARED_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_BRANCH_EXACT_ENGINES",
        "root_orbit": "quartic_endpoint_cubic_path:quartic_branch",
        "reduction_counts": {
            "total_quotient_keys": 1_053_696,
            "all_short_total": 345_744,
            "all_short_order27": 21_764,
            "eligible_finite_n28_plus": 233_728,
            "mixed_rays": 707_951,
            "all_long_rays": 1,
            "non_all_short_rays": 707_952,
            "n28_plus_records": 941_680,
        },
        "bounded_smokes": {
            "primary_random_literal_formula_checks": 512,
            "audit_independent_formula_and_cached_message_literal_checks": 1_024,
            "shared_canonical_finite_records": 106,
            "shared_canonical_ray_records": 354,
            "audit_stream_literal_samples_per_ray": 30,
            "bounded_gate_failures": 0,
            "matching_coefficient_stream_sha256": STREAM.split()[1],
            "matching_finite_stream_sha256": STREAM.split()[2],
            "matching_benchmark_stream_sha256": BENCH_STREAM.split()[1],
        },
        "exact_full_workload_if_launched": {
            "formula_evaluations_per_engine": 21_472_288,
            "audit_literal_trees": 2_357_584,
            "unseen_rank_equalities_per_engine": 2_831_808,
            "canonical_leaf_stream_bytes": 30_133_760,
            "threads": workers,
            "prefixes": 84,
            "far_modules_per_prefix": 12_544,
        },
        "resource_estimate": {
            "primary_1024_ray_wall_milliseconds_trials": [962.324, 927.990, 937.087],
            "audit_1024_ray_wall_milliseconds_trials": [1_140.498, 1_207.259, 928.319],
            "conservative_slowest_trial_projection_seconds": conservative_seconds,
            "explicit_tables_bytes": 4_216_800,
            "full_leaf_buffers_bytes": 30_133_760,
            "conservative_working_set_gate_bytes": 268_435_456,
            "automatic_run_gate": {
                "maximum_sequential_seconds": 600,
                "maximum_working_set_bytes": 1_073_741_824,
                "time_pass": conservative_seconds < 600,
                "memory_pass": 268_435_456 < 1_073_741_824,
            },
            "timing_guard": "slowest of three bounded single-process trials per engine under concurrent host load; projection divides exact rays among six workers and excludes finite-row and merge overhead",
        },
        "independence_boundary": "The producer caches the endpoint-cubic and middle-cubic branch as a backward transfer to the quartic root. The audit independently propagates the endpoint and middle messages upward, forms the root states, and uses a separately written expanded-tree builder.",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Preflight only at report creation. No sign theorem is credited unless both later default-mode full streams pass and match.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(RECORDS); print(GATES); print(STREAM); print(BENCH_STREAM)
    print("CONSERVATIVE_SEQUENTIAL_SECONDS", f"{conservative_seconds:.6f}")
    print("AUTO_RUN_GATE PASS")
    print("SOURCE", payload["source_sha256"]); print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
