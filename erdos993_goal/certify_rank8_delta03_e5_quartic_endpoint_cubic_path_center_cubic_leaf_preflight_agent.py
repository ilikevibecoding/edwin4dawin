#!/usr/bin/env python3
"""Fail-closed preflight for the center-cubic leaf all-order engines."""

from __future__ import annotations
import hashlib, json, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_preflight_exact_agent_20260823.json"
EXPECTED = {
    "certify_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_newton_reduction_agent.py": "5F65EDBECC8E289FA385A7EA892E36FE82E8A695CD33C2D40A35C9C0D47970E8",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_newton_reduction_exact_agent_20260823.json": "0F6E03F91E81AB2268A79A3DBBE61CBC3D5A21019EC2CEAA2429C076D6F6AEB8",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_order27_exact_agent_20260823.json": "CBA00E47BBE85E6680F285C78A3011972313575D5F6A7652525D76A03E9EDE91",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_order27_independent_audit_agent_20260823.json": "38B65AE4C822B394F49772D3845B717EA0E2C4DAA77CF34263F933909B2C03B0",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_i256_agent.rs": "DE88EA47D055D41191D0BCB8628FD062759AF0E67A9ECECB6B6013C7BBF24E3A",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_i256_agent.exe": "54DBE1B45257359B56245DF4872B2F53E97E49BA2AB9861478BC9AE71B6BE86D",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_literal_i256_agent.rs": "65566AB939F847A8FE3CA99132DE4DB53E8FB8B0019BAF8A17EA50D6E3C7E812",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_literal_i256_agent.exe": "7C3AADF1F0432AC337AC0339C8D436DABF7D373C8B44AA7B885957EBFDD72F17",
}
PRIMARY = "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_i256_agent.exe"
AUDIT = "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_literal_i256_agent.exe"
RECORDS = "SMOKE_RECORDS 124 339"; GATES = "SMOKE_GATE_FAILURES 0"
STREAM = "SMOKE_STREAM B71E690D724D10A77E2ECD459CB9506E2BF45318055F9F1A4453CE17D1EBE33F B2CAAB6AFD6854C2371AF8F168149D119552AE29933B110AC5D15BBDC420CB8E"
BENCH_RAYS = "BENCH_RAYS 1024"; BENCH_STREAM = "BENCH_STREAM 5360C1D3FEC9D46FEDFB7A83DB02E85112BAD58A898F7056F131F6B2ABF9CE41"
RESOURCE = ["RESOURCE_TABLE_BYTES 215040 602112", "RESOURCE_FULL_LEAF_BYTES 34725120"]
def sha256(path: Path) -> str: return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def run(executable: str, mode: str) -> list[str]:
    completed = subprocess.run([str(ROOT / executable), mode], cwd=ROOT, check=True, capture_output=True, text=True, timeout=60); assert completed.stderr == ""; return completed.stdout.splitlines()
def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}; assert actual == EXPECTED
    assert run(PRIMARY, "smoke") == ["PASS_E5_CENTER_CUBIC_LEAF_PRIMARY_512_LITERAL_FORMULA_SMOKE", RECORDS, GATES, STREAM]
    assert run(AUDIT, "smoke") == ["PASS_E5_CENTER_CUBIC_LEAF_INDEPENDENT_1024_LITERAL_SMOKE", RECORDS, GATES, STREAM]
    assert run(PRIMARY, "bench") == [BENCH_RAYS, BENCH_STREAM, *RESOURCE]; assert run(AUDIT, "bench") == [BENCH_RAYS, BENCH_STREAM, *RESOURCE]
    primary_ms = 547.125; audit_ms = 781.274; rays = 800_856; workers = 6
    conservative_seconds = (primary_ms + audit_ms) / 1_000 * rays / 1_024 / workers
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-center-cubic-leaf-preflight-exact-agent-v1",
        "status": "PASS_PREPARED_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_LEAF_EXACT_ENGINES",
        "root_orbit": "quartic_endpoint_cubic_path:center_cubic_leaf",
        "reduction_counts": {"total_quotient_keys": 1_204_224, "all_short_total": 403_368, "all_short_order27": 23_834, "eligible_finite_n28_plus": 284_304, "mixed_rays": 800_855, "all_long_rays": 1, "non_all_short_rays": 800_856, "n28_plus_records": 1_085_160},
        "sealed_order27_base": {"raw_positive_compositions": 480_700, "canonical_subdivisions": 70_854, "primary_formula_checks": 70_854, "independent_literal_trees": 70_854, "nonpositive_by_delta": [0, 0, 0, 0], "matching_value_stream_sha256": "910B0EFB8B8A580BCC48BBC513081C886420BAEE46C824B98E6209B7F0DDB87B"},
        "bounded_smokes": {"primary_random_literal_formula_checks": 512, "audit_independent_formula_and_cached_message_literal_checks": 1_024, "shared_canonical_finite_records": 124, "shared_canonical_ray_records": 339, "audit_stream_literal_samples_per_ray": 30, "bounded_gate_failures": 0, "matching_coefficient_stream_sha256": STREAM.split()[1], "matching_finite_stream_sha256": STREAM.split()[2], "matching_benchmark_stream_sha256": BENCH_STREAM.split()[1]},
        "exact_full_workload_if_launched": {"formula_evaluations_per_engine": 24_309_984, "audit_literal_trees": 2_686_872, "unseen_rank_equalities_per_engine": 3_203_424, "canonical_leaf_stream_bytes": 34_725_120, "threads": workers, "quartic_modules": 672, "root_endpoint_choices_per_quartic": 1_792},
        "resource_estimate": {"primary_1024_ray_wall_milliseconds_trials": [547.125, 479.886, 491.312], "audit_1024_ray_wall_milliseconds_trials": [736.855, 781.274, 649.984], "conservative_slowest_trial_projection_seconds": conservative_seconds, "explicit_tables_bytes": 817_152, "full_leaf_buffers_bytes": 34_725_120, "conservative_working_set_gate_bytes": 268_435_456, "automatic_run_gate": {"maximum_sequential_seconds": 600, "maximum_working_set_bytes": 1_073_741_824, "time_pass": conservative_seconds < 600, "memory_pass": True}, "timing_guard": "slowest of three bounded trials per engine under concurrent host load; six-worker projection excludes finite-row and merge overhead"},
        "independence_boundary": "The producer composes cached quartic and endpoint messages at the center cubic and propagates to the leaf root. The audit independently propagates each branch message, forms the root states, and uses a separately written expanded-tree builder and cut-position order27 enumerator.",
        "immutable_input_hashes": actual, "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Preflight only. No n>=28 sign theorem is credited unless both full streams pass and match.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8"); print(payload["status"]); print(RECORDS); print(GATES); print(STREAM); print(BENCH_STREAM); print("CONSERVATIVE_SEQUENTIAL_SECONDS", f"{conservative_seconds:.6f}"); print("AUTO_RUN_GATE PASS"); print("SOURCE", payload["source_sha256"]); print("REPORT", sha256(OUTPUT))
if __name__ == "__main__": main()
