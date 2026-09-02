#!/usr/bin/env python3
"""Fail-closed bounded preflight for the e=5 cubic-branch engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_"
    "preflight_exact_agent_20260823.json"
)
EXPECTED = {
    "certify_rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_newton_reduction_agent.py":
        "53CDBF35AD2445FCF3F7B15ADA8AECFCFD0BF58A5D821DBABC4A2795718AF904",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_newton_reduction_exact_agent_20260823.json":
        "73715E331C4F95AEAED4B89E30FA4F8F9190BE000EB547801C56153DF0FD3C31",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_i256_agent.rs":
        "2CAB5B2FAEA4D853A47653350017A103FF465C29FBC8F62A6920DDDB1E04E902",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_i256_agent.exe":
        "A9D81A83629406B175ECD4310165664ADF1A5FFEE48762D9EE9FFFA22841E55F",
    "audit_rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_literal_i256_agent.rs":
        "04B0F02538979497075C4028C607403D99956A1127511817BE96E27B07B756E1",
    "audit_rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_literal_i256_agent.exe":
        "DBF7A7102EA9FE16D0D3986032D8D342619FA5AB64DD150580FDF8ED5B8590C6",
}
PRIMARY = "produce_rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_i256_agent.exe"
AUDIT = "audit_rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_literal_i256_agent.exe"
RECORDS = "SMOKE_RECORDS 114 348"
GATES = "SMOKE_GATE_FAILURES 0"
STREAM = (
    "SMOKE_STREAM "
    "8A7F5FE9B74C75E83AD935677AD620893EADCA3E421BD71E101BCDDFC23278AC "
    "B8048FC2749B519EA34A2D7E5A45EB81E328361EA2BA37F9B943ADF640C07BAD"
)
BENCH_RAYS = "BENCH_RAYS 1024"
BENCH_STREAM = "BENCH_STREAM 5264D1664CD4FF95B3009013530F6B890B2E1C9822EE05617C73526D867C6FCD"
RESOURCE = [
    "RESOURCE_TABLE_BYTES 250880 71680",
    "RESOURCE_FULL_LEAF_BYTES 40290464",
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
        "PASS_E5_CUBIC_BRANCH_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        RECORDS, GATES, STREAM,
    ]
    assert run(AUDIT, "smoke") == [
        "PASS_E5_CUBIC_BRANCH_INDEPENDENT_1024_LITERAL_SMOKE",
        RECORDS, GATES, STREAM,
    ]
    assert run(PRIMARY, "bench") == [BENCH_RAYS, BENCH_STREAM, *RESOURCE]
    assert run(AUDIT, "bench") == [BENCH_RAYS, BENCH_STREAM, *RESOURCE]

    payload = {
        "schema": (
            "rank8-delta03-e5-quartic-center-two-cubic-cubic-branch-"
            "preflight-exact-agent-v1"
        ),
        "status": (
            "PASS_PREPARED_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_"
            "CUBIC_BRANCH_EXACT_ENGINES"
        ),
        "root_orbit": "quartic_center_two_cubic:cubic_branch",
        "reduction_counts": {
            "total_quotient_keys": 1_404_928,
            "all_short_total": 453_789,
            "all_short_order27": 28_876,
            "eligible_finite_n28_plus": 307_938,
            "mixed_rays": 951_138,
            "all_long_rays": 1,
            "non_all_short_rays": 951_139,
            "n28_plus_records": 1_259_077,
        },
        "bounded_smokes": {
            "primary_random_literal_formula_checks": 512,
            "audit_independent_formula_and_cached_message_literal_checks": 1_024,
            "shared_canonical_finite_records": 114,
            "shared_canonical_ray_records": 348,
            "audit_stream_literal_samples_per_ray": 30,
            "bounded_gate_failures": 0,
            "matching_coefficient_stream_sha256": STREAM.split()[1],
            "matching_finite_stream_sha256": STREAM.split()[2],
            "matching_benchmark_stream_sha256": BENCH_STREAM.split()[1],
        },
        "exact_full_workload_if_launched": {
            "formula_evaluations_per_engine": 28_842_108,
            "audit_literal_trees": 3_161_355,
            "unseen_rank_equalities_per_engine": 3_804_556,
            "canonical_leaf_stream_bytes": 40_290_464,
            "threads": 6,
            "prefixes": 6_272,
            "far_modules_per_prefix": 224,
        },
        "resource_estimate": {
            "primary_1024_ray_wall_milliseconds": 238.897,
            "audit_1024_ray_wall_milliseconds": 284.632,
            "primary_microseconds_per_ray": 233.2978515625,
            "audit_microseconds_per_ray": 277.9609375,
            "ideal_six_worker_primary_seconds": 37.38223239407552,
            "ideal_six_worker_audit_seconds": 44.927841306699804,
            "ideal_sequential_seconds": 82.31007370077532,
            "explicit_tables_bytes": 322_560,
            "full_leaf_buffers_bytes": 40_290_464,
            "conservative_working_set_gate_bytes": 268_435_456,
            "automatic_run_gate": {
                "maximum_sequential_seconds": 600,
                "maximum_working_set_bytes": 1_073_741_824,
                "time_pass": True,
                "memory_pass": True,
            },
            "timing_guard": (
                "bounded single-process measurements under concurrent host load; "
                "six-worker projection excludes scheduler and merge overhead"
            ),
        },
        "independence_boundary": (
            "The producer splits at the selected cubic root and propagates a "
            "cached far-cubic module backward through the quartic. The audit "
            "independently builds pendant/far-module child messages upward, "
            "forms the quartic state, propagates it to the root, and uses a "
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
    print("AUTO_RUN_GATE PASS")
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
