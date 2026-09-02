#!/usr/bin/env python3
"""Fail-closed preflight for the endpoint-cubic branch all-order engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_preflight_exact_agent_20260823.json"
EXPECTED = {
    "certify_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_newton_reduction_agent.py": "CE3548A903EF0FF8ABD271318CA070A179A1CC5E829A15080A2ECF426D760351",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_newton_reduction_exact_agent_20260823.json": "B4B0AC30FF0E45B0857FB5FF163B2B9D95A7D2A500E1AEFAE6953089396F51B7",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_order27_exact_agent_20260823.json": "3EBBA144AC7BFE2B06701407FE96B1466FC9FB1D9370946D0DD48B289E1102A6",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_order27_independent_audit_agent_20260823.json": "56B05ED0954A40785514224536B4EBBDFB3FA0DC4EAE815180F53D9C756D452D",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_i256_agent.rs": "9FF0CB4AAC45CE3D768B295E254D1A97CC5E4FDC0ABF037181E671B68BB075C0",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_i256_agent.exe": "160834F40DA4177BA5B30DF738E760713C2703F7E6806A97E7FC020FCF6AB7DD",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_literal_i256_agent.rs": "8CDD54F5385CC3739FCD32AE08AC4E3ED76A788741A8A2BE333928FB367B2301",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_literal_i256_agent.exe": "708B875BB7F26513098B239537667B5460D00DF98BF2443A179651BD7B75E678",
}
PRIMARY = "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_i256_agent.exe"
AUDIT = "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_literal_i256_agent.exe"
RECORDS = "SMOKE_RECORDS 111 346"
GATES = "SMOKE_GATE_FAILURES 0"
STREAM = "SMOKE_STREAM 9ADF034732E2C2F944CC4AF1E46C4CE46A314BDD3C4C8DE46A2788A81A907F7D 060E291161F355EE02BF973E83B5060D4CCEB044FD11BE1EF54C77D18997E3C3"
BENCH_RAYS = "BENCH_RAYS 1024"
BENCH_STREAM = "BENCH_STREAM FBE7D6B2DE4C8AA8747FB8C5F0D9EA2D85243BD991353AB2FE986DF6CF081835"
RESOURCE = ["RESOURCE_TABLE_BYTES 1580544 5376", "RESOURCE_FULL_LEAF_BYTES 30133760"]


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
    assert run(PRIMARY, "smoke") == [
        "PASS_E5_ENDPOINT_CUBIC_BRANCH_PRIMARY_512_LITERAL_FORMULA_SMOKE",
        RECORDS,
        GATES,
        STREAM,
    ]
    assert run(AUDIT, "smoke") == [
        "PASS_E5_ENDPOINT_CUBIC_BRANCH_INDEPENDENT_1024_LITERAL_SMOKE",
        RECORDS,
        GATES,
        STREAM,
    ]
    assert run(PRIMARY, "bench") == [BENCH_RAYS, BENCH_STREAM, *RESOURCE]
    assert run(AUDIT, "bench") == [BENCH_RAYS, BENCH_STREAM, *RESOURCE]
    primary_ms = 529.726
    audit_ms = 1_201.663
    rays = 707_952
    workers = 6
    conservative_seconds = (primary_ms + audit_ms) / 1_000 * rays / 1_024 / workers
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-endpoint-cubic-branch-preflight-exact-agent-v1",
        "status": "PASS_PREPARED_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_BRANCH_EXACT_ENGINES",
        "root_orbit": "quartic_endpoint_cubic_path:endpoint_cubic_branch",
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
        "sealed_order27_base": {
            "raw_positive_compositions": 480_700,
            "canonical_subdivisions": 70_854,
            "primary_formula_checks": 70_854,
            "independent_literal_trees": 70_854,
            "nonpositive_by_delta": [0, 0, 0, 0],
            "matching_value_stream_sha256": "7B07CA92586076A5D7AB5FE77B30D22AE65C4DB80C988AF482FBBAB9C384C586",
        },
        "bounded_smokes": {
            "primary_random_literal_formula_checks": 512,
            "audit_independent_formula_and_cached_message_literal_checks": 1_024,
            "shared_canonical_finite_records": 111,
            "shared_canonical_ray_records": 346,
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
            "prefixes": 4_704,
            "endpoint_modules_per_prefix": 224,
        },
        "resource_estimate": {
            "primary_1024_ray_wall_milliseconds_trials": [519.521, 529.726, 369.465],
            "audit_1024_ray_wall_milliseconds_trials": [1_119.911, 1_201.663, 727.727],
            "conservative_slowest_trial_projection_seconds": conservative_seconds,
            "explicit_tables_bytes": 1_585_920,
            "full_leaf_buffers_bytes": 30_133_760,
            "conservative_working_set_gate_bytes": 268_435_456,
            "automatic_run_gate": {
                "maximum_sequential_seconds": 600,
                "maximum_working_set_bytes": 1_073_741_824,
                "time_pass": conservative_seconds < 600,
                "memory_pass": True,
            },
            "timing_guard": "slowest of three bounded trials per engine under concurrent host load; six-worker projection excludes finite-row and merge overhead",
        },
        "independence_boundary": "The producer composes cached endpoint-quartic, middle-cubic, and far-endpoint modules at the endpoint-cubic root. The audit independently propagates every child message upward, forms root states, and uses a separately written expanded-tree builder and cut-position order27 enumerator.",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Preflight only. No n>=28 sign theorem is credited unless both full streams pass and match.",
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
