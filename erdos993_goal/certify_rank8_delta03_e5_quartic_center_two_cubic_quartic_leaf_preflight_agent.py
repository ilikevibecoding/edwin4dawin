#!/usr/bin/env python3
"""Fail-closed bounded preflight for the e=5 quartic-leaf engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_"
    "preflight_exact_agent_20260823.json"
)
EXPECTED = {
    "certify_rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_newton_reduction_agent.py":
        "0FCEA510998EA4ABBB45D09261D7954FD7ADE2C942B1CAD061CC4C86B7376B8E",
    "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_newton_reduction_exact_agent_20260823.json":
        "51E4E7647988CF358152A52444CD25638E342E20421977269F00C279C77F228E",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_i256_agent.rs":
        "B7E53FD2A4F487D952DC52C749B015A3DAD27C7409BFC09BD8B5768112139D2E",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_i256_agent.exe":
        "495581BF9866EA5EA481B23CCA6A1DAFA438CC1006DF33310AE25CACEBF91367",
    "audit_rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_literal_i256_agent.rs":
        "C52C7308BC3F975156A6449A8BDE7EE8C0426E0C5911F754A047CB97C117B380",
    "audit_rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_literal_i256_agent.exe":
        "6D6516F7B027E4B69390B985F7F7D73C2F54BD3040CBCBD542C4A694FABE9809",
}
PRIMARY = "produce_rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_i256_agent.exe"
AUDIT = "audit_rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_literal_i256_agent.exe"
RECORDS = "SMOKE_RECORDS 106 368"
GATES = "SMOKE_GATE_FAILURES 0"
STREAM = (
    "SMOKE_STREAM "
    "64107C74FFC174A19E033B160FAC4326B07904139C520134BAAFEE5ACF8B2479 "
    "7F107BA56635553638DA6F339B43F02B5B9EC3E113AEE68570B0D69AFE4FB820"
)
BENCH_RAYS = "BENCH_RAYS 1024"
BENCH_STREAM = "BENCH_STREAM 45E00E415A8D126369145485CF3B567E753748C53894587097DB66F4090356D3"
PRIMARY_RESOURCE = [
    "RESOURCE_TABLE_BYTES 896 23385600",
    "RESOURCE_FULL_LEAF_BYTES 40919424",
]
AUDIT_RESOURCE = [
    "RESOURCE_TABLE_BYTES 896 16128000",
    "RESOURCE_FULL_LEAF_BYTES 40919424",
]


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
        "PASS_E5_QUARTIC_LEAF_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        RECORDS, GATES, STREAM,
    ]
    assert run(AUDIT, "smoke") == [
        "PASS_E5_QUARTIC_LEAF_INDEPENDENT_1024_LITERAL_SMOKE",
        RECORDS, GATES, STREAM,
    ]
    assert run(PRIMARY, "bench") == [BENCH_RAYS, BENCH_STREAM, *PRIMARY_RESOURCE]
    assert run(AUDIT, "bench") == [BENCH_RAYS, BENCH_STREAM, *AUDIT_RESOURCE]

    # Use the slowest observed trial for each engine as the launch decision,
    # then divide the exact ray workload among the six full-mode workers.
    primary_bench_ms = 448.771
    audit_bench_ms = 309.014
    rays = 954_324
    workers = 6
    conservative_seconds = (
        (primary_bench_ms + audit_bench_ms) / 1_000 * rays / 1_024 / workers
    )
    payload = {
        "schema": (
            "rank8-delta03-e5-quartic-center-two-cubic-quartic-leaf-"
            "preflight-exact-agent-v1"
        ),
        "status": (
            "PASS_PREPARED_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_"
            "QUARTIC_LEAF_EXACT_ENGINES"
        ),
        "root_orbit": "quartic_center_two_cubic:quartic_leaf",
        "reduction_counts": {
            "total_quotient_keys": 1_411_200,
            "all_short_total": 456_876,
            "all_short_order27": 27_444,
            "eligible_finite_n28_plus": 324_408,
            "mixed_rays": 954_323,
            "all_long_rays": 1,
            "non_all_short_rays": 954_324,
            "n28_plus_records": 1_278_732,
        },
        "bounded_smokes": {
            "primary_random_literal_formula_checks": 512,
            "audit_independent_formula_and_cached_message_literal_checks": 1_024,
            "shared_canonical_finite_records": 106,
            "shared_canonical_ray_records": 368,
            "audit_stream_literal_samples_per_ray": 30,
            "bounded_gate_failures": 0,
            "matching_coefficient_stream_sha256": STREAM.split()[1],
            "matching_finite_stream_sha256": STREAM.split()[2],
            "matching_benchmark_stream_sha256": BENCH_STREAM.split()[1],
        },
        "exact_full_workload_if_launched": {
            "formula_evaluations_per_engine": 28_954_128,
            "audit_literal_trees": 3_187_380,
            "unseen_rank_equalities_per_engine": 3_817_296,
            "canonical_leaf_stream_bytes": 40_919_424,
            "threads": workers,
            "prefixes": 56,
            "module_pairs_per_prefix": 25_200,
        },
        "resource_estimate": {
            "primary_1024_ray_wall_milliseconds_trials": [448.771, 206.839, 171.717],
            "audit_1024_ray_wall_milliseconds_trials": [309.014, 270.810, 288.304],
            "conservative_slowest_trial_projection_seconds": conservative_seconds,
            "primary_explicit_tables_bytes": 23_386_496,
            "audit_explicit_tables_bytes": 16_128_896,
            "full_leaf_buffers_bytes": 40_919_424,
            "conservative_working_set_gate_bytes": 268_435_456,
            "automatic_run_gate": {
                "maximum_sequential_seconds": 600,
                "maximum_working_set_bytes": 1_073_741_824,
                "time_pass": conservative_seconds < 600,
                "memory_pass": 268_435_456 < 1_073_741_824,
            },
            "timing_guard": (
                "slowest of three bounded single-process trials per engine under "
                "concurrent host load; projection divides exact rays among six "
                "workers and excludes finite-row and merge overhead"
            ),
        },
        "independence_boundary": (
            "The producer caches each unordered cubic-module pair as two "
            "product messages and propagates it through the quartic-to-root "
            "arm. The audit independently propagates both cubic modules into "
            "the quartic, constructs the terminal-root message, and uses a "
            "separately written expanded-tree builder."
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Preflight only at report creation. No sign theorem is credited "
            "unless both later default-mode full streams pass and match."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(RECORDS)
    print(GATES)
    print(STREAM)
    print(BENCH_STREAM)
    print("CONSERVATIVE_SEQUENTIAL_SECONDS", f"{conservative_seconds:.6f}")
    print("AUTO_RUN_GATE PASS")
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
