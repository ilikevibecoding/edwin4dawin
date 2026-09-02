#!/usr/bin/env python3
"""Fail-closed bounded preflight for the e=5 central-quartic engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_"
    "preflight_exact_agent_20260823.json"
)
EXPECTED = {
    "certify_rank8_delta03_e5_quartic_center_two_cubic_central_quartic_newton_reduction_agent.py":
        "54F0A599AB82C273AD34D6F4B6FA5630A54D206BDFC92B262A05F56BEAF9F980",
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_newton_reduction_exact_agent_20260823.json":
        "61A13D8740D7C4D69AF77AF0DE3A64C37B41C55E77B2FEA96BBECF9C5C90D5E7",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_central_quartic_i256_agent.rs":
        "26F3D7E1B3C928EE672E2AFB749F91A286C4B29839BF6346EDEA81799D3E3378",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_central_quartic_i256_agent.exe":
        "177EF7556799A677E75DA1A50D7B7503F01736E277CD5A3BD1A4F14D291392DE",
    "audit_rank8_delta03_e5_quartic_center_two_cubic_central_quartic_literal_i256_agent.rs":
        "A66B066988A8512E25302F4B4B33FED45B78C07FAAE0C4325B4EBB63BAA0F6C8",
    "audit_rank8_delta03_e5_quartic_center_two_cubic_central_quartic_literal_i256_agent.exe":
        "400C5550430A745B0BE62519D42D38D14401B874109D2B96371CE0D9665B72F2",
}
PRIMARY = (
    "produce_rank8_delta03_e5_quartic_center_two_cubic_"
    "central_quartic_i256_agent.exe"
)
AUDIT = (
    "audit_rank8_delta03_e5_quartic_center_two_cubic_"
    "central_quartic_literal_i256_agent.exe"
)
RECORDS = "SMOKE_RECORDS 108 365"
GATES = "SMOKE_GATE_FAILURES 0"
STREAM = (
    "SMOKE_STREAM "
    "FAF908B65DAB774AE0C4A24634B38641604F86138F7042421EF2008C8C1865AA "
    "2712662B8C7D019B45CB1D599AA480D820AD031B5CD8E039EC66C077E5C4CD9E"
)
BENCH_RAYS = "BENCH_RAYS 1024"
BENCH_STREAM = (
    "BENCH_STREAM "
    "40EBF7AAE0264CCCFF37E124A53BEFCADB4733D854ABC0A15991EB7AAE05F58B"
)
PRIMARY_RESOURCE = (
    "RESOURCE_TABLE_BYTES 448 23385600",
    "RESOURCE_MAX_BATCH_LEAF_BYTES 9676800",
)
AUDIT_RESOURCE = (
    "RESOURCE_TABLE_BYTES 448 16128000",
    "RESOURCE_MAX_BATCH_LEAF_BYTES 9676800",
)


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def run(executable: str, mode: str) -> list[str]:
    completed = subprocess.run(
        [str(ROOT / executable), mode],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert completed.stderr == ""
    return completed.stdout.splitlines()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    primary_smoke = run(PRIMARY, "smoke")
    audit_smoke = run(AUDIT, "smoke")
    assert primary_smoke == [
        "PASS_E5_CENTRAL_QUARTIC_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        RECORDS,
        GATES,
        STREAM,
    ]
    assert audit_smoke == [
        "PASS_E5_CENTRAL_QUARTIC_INDEPENDENT_1024_LITERAL_SMOKE",
        RECORDS,
        GATES,
        STREAM,
    ]

    primary_bench = run(PRIMARY, "bench")
    audit_bench = run(AUDIT, "bench")
    assert primary_bench == [BENCH_RAYS, BENCH_STREAM, *PRIMARY_RESOURCE]
    assert audit_bench == [BENCH_RAYS, BENCH_STREAM, *AUDIT_RESOURCE]

    payload = {
        "schema": (
            "rank8-delta03-e5-quartic-center-two-cubic-central-quartic-"
            "preflight-exact-agent-v1"
        ),
        "status": (
            "PASS_PREPARED_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_"
            "CENTRAL_QUARTIC_EXACT_ENGINES"
        ),
        "root_orbit": "quartic_center_two_cubic:central_quartic",
        "reduction_counts": {
            "total_quotient_keys": 705_600,
            "all_short_total": 228_438,
            "all_short_order27_already_nested": 14_526,
            "eligible_finite_n28_plus": 154_941,
            "mixed_rays": 477_161,
            "all_long_rays": 1,
            "non_all_short_rays": 477_162,
            "n28_plus_records": 632_103,
        },
        "bounded_smokes": {
            "primary_random_expanded_literal_formula_checks": 512,
            "audit_independent_formula_and_cached_message_literal_checks": 1_024,
            "shared_canonical_finite_records": 108,
            "shared_canonical_ray_records": 365,
            "audit_stream_uses_literal_tree_at_all_29_samples_and_unseen_29": True,
            "bounded_gate_failures": 0,
            "matching_coefficient_smoke_stream_sha256": STREAM.split()[1],
            "matching_finite_smoke_stream_sha256": STREAM.split()[2],
            "matching_1024_ray_benchmark_stream_sha256": BENCH_STREAM.split()[1],
        },
        "exact_full_workload_if_later_launched": {
            "primary_formula_evaluations": 14_469_801,
            "audit_formula_evaluations": 14_469_801,
            "audit_literal_trees": 1_586_427,
            "unseen_newton_equalities": 1_908_648,
            "canonical_leaf_stream_bytes": 20_227_296,
            "threads": 6,
            "deterministic_prefixes": 28,
            "module_pairs_per_prefix": 25_200,
        },
        "resource_estimate": {
            "bounded_benchmark": {
                "rays_per_engine": 1_024,
                "primary_wall_milliseconds_observed_20260823": 192.369,
                "audit_wall_milliseconds_observed_20260823": 279.800,
                "primary_microseconds_per_ray": 187.8603515625,
                "audit_microseconds_per_ray": 273.2421875,
                "measurement_context": (
                    "single-process bounded benchmarks while other proof "
                    "engines occupied the host; timings are estimates, not a theorem"
                ),
            },
            "ideal_six_worker_extrapolation_seconds": {
                "primary": 15.101677238330078,
                "audit": 22.157772028882576,
                "guard": (
                    "excludes scheduler contention, allocation, merge, and I/O; "
                    "use as a lower-bound planning estimate only"
                ),
            },
            "explicit_table_bytes": {
                "primary": 23_386_048,
                "audit": 16_128_448,
            },
            "maximum_twelve_prefix_leaf_buffer_bytes": 9_676_800,
            "conservative_working_set_gate_bytes": 134_217_728,
        },
        "independence_boundary": (
            "The producer splits at the quartic root and caches products of "
            "the two cubic-module messages.  The audit independently propagates "
            "four child messages upward, derives the root-deleted forest as a "
            "separate product, and uses a separately written expanded-tree builder. "
            "The two sources share only the hash-pinned checked-i256 arithmetic core."
        ),
        "compile_command": (
            "rustc --target x86_64-pc-windows-gnu --edition=2021 -O "
            "-C overflow-checks=yes"
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Reduction and bounded preflight only.  Neither executable was run "
            "in default full-census mode; no 705,600-key census, sign theorem, "
            "or orbit closure is credited."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(RECORDS)
    print(GATES)
    print(STREAM)
    print(BENCH_STREAM)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
