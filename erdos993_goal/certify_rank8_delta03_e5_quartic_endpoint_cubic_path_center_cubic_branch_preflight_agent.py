#!/usr/bin/env python3
"""Fail-closed preflight for the center-cubic branch all-order engines."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_preflight_exact_agent_20260823.json"
EXPECTED = {
    "certify_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_newton_reduction_agent.py": "194215385B124CEAEAC698C21B2E22B5D20A2D9ECDE3501F2C5934D8343972B0",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_newton_reduction_exact_agent_20260823.json": "F94CFF3557CFA4AA1E3F7FDDA89125420570ED3D50438B0AA20C51E03FDFA55E",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_exact_agent_20260823.json": "44091AC33F4A7BFE6E7003445C24A93DEED7F89A88E02398C08E2F40F277E6D7",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_order27_independent_audit_agent_20260823.json": "66A4AA0B675361653F78B653E60371445FA12FAAC4F6C1909CC54788C67BC4DF",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_i256_agent.rs": "45729ECC67F06BBE14C50834B508F8C589DD83CB88470664696DAB48F76BA8A5",
    "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_i256_agent.exe": "366693666F9862E2B582D15ED910E655EA4B1055D92334FBD595940A57FA673F",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_literal_i256_agent.rs": "F003B39AF254693BA29B868DAAD56084041D36014965331FF0A3464B19DE24D7",
    "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_literal_i256_agent.exe": "47CE71B91002C6A1C3A78CDABA2DB7257AE54E0301CF64DF79DFD74BFCF4BE5B",
}
PRIMARY = "produce_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_i256_agent.exe"
AUDIT = "audit_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_literal_i256_agent.exe"
RECORDS = "SMOKE_RECORDS 111 346"; GATES = "SMOKE_GATE_FAILURES 0"
STREAM = "SMOKE_STREAM 78C28436492E7BDBC41A234C930EDD0EDBDC56F1734BFB72EEF9679765A4F298 D2FAC7DEBE488821DC1C7FE380C7DF9CF10700D0D358B26F72AB2AA1E4823501"
BENCH_RAYS = "BENCH_RAYS 1024"; BENCH_STREAM = "BENCH_STREAM 613BDED1E1219CFA857990B115F40089DE0CB74108D9747DD95011DBCB93F8D9"
RESOURCE = ["RESOURCE_TABLE_BYTES 1580544 71680", "RESOURCE_FULL_LEAF_BYTES 30133760"]


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def run(executable: str, mode: str) -> list[str]:
    completed = subprocess.run([str(ROOT / executable), mode], cwd=ROOT, check=True, capture_output=True, text=True, timeout=60)
    assert completed.stderr == ""; return completed.stdout.splitlines()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}; assert actual == EXPECTED
    assert run(PRIMARY, "smoke") == ["PASS_E5_CENTER_CUBIC_BRANCH_PRIMARY_512_LITERAL_FORMULA_SMOKE", RECORDS, GATES, STREAM]
    assert run(AUDIT, "smoke") == ["PASS_E5_CENTER_CUBIC_BRANCH_INDEPENDENT_1024_LITERAL_SMOKE", RECORDS, GATES, STREAM]
    assert run(PRIMARY, "bench") == [BENCH_RAYS, BENCH_STREAM, *RESOURCE]; assert run(AUDIT, "bench") == [BENCH_RAYS, BENCH_STREAM, *RESOURCE]
    primary_ms = 572.252; audit_ms = 1_671.955; rays = 707_952; workers = 6
    conservative_seconds = (primary_ms + audit_ms) / 1_000 * rays / 1_024 / workers
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-center-cubic-branch-preflight-exact-agent-v1",
        "status": "PASS_PREPARED_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH_EXACT_ENGINES",
        "root_orbit": "quartic_endpoint_cubic_path:center_cubic_branch",
        "reduction_counts": {"total_quotient_keys": 1_053_696, "all_short_total": 345_744, "all_short_order27": 21_764, "eligible_finite_n28_plus": 233_728, "mixed_rays": 707_951, "all_long_rays": 1, "non_all_short_rays": 707_952, "n28_plus_records": 941_680},
        "sealed_order27_base": {"canonical_subdivisions": 70_854, "primary_formula_checks": 70_854, "independent_literal_trees": 70_854, "nonpositive_by_delta": [0, 0, 0, 0], "matching_value_stream_sha256": "43DE5A71943103E90DD4ABEFD9EBB5DD75E8CD2CD815F19C72936AD23F66E9C9"},
        "bounded_smokes": {"primary_random_literal_formula_checks": 512, "audit_independent_formula_and_cached_message_literal_checks": 1_024, "shared_canonical_finite_records": 111, "shared_canonical_ray_records": 346, "audit_stream_literal_samples_per_ray": 30, "bounded_gate_failures": 0, "matching_coefficient_stream_sha256": STREAM.split()[1], "matching_finite_stream_sha256": STREAM.split()[2], "matching_benchmark_stream_sha256": BENCH_STREAM.split()[1]},
        "exact_full_workload_if_launched": {"formula_evaluations_per_engine": 21_472_288, "audit_literal_trees": 2_357_584, "unseen_rank_equalities_per_engine": 2_831_808, "canonical_leaf_stream_bytes": 30_133_760, "threads": workers, "prefixes": 4_704, "endpoint_modules_per_prefix": 224},
        "resource_estimate": {"primary_1024_ray_wall_milliseconds_trials": [572.252, 434.821, 547.740], "audit_1024_ray_wall_milliseconds_trials": [666.024, 1_671.955, 1_520.462], "conservative_slowest_trial_projection_seconds": conservative_seconds, "explicit_tables_bytes": 1_652_224, "full_leaf_buffers_bytes": 30_133_760, "conservative_working_set_gate_bytes": 268_435_456, "automatic_run_gate": {"maximum_sequential_seconds": 600, "maximum_working_set_bytes": 1_073_741_824, "time_pass": conservative_seconds < 600, "memory_pass": True}, "timing_guard": "slowest of three bounded trials per engine under concurrent host load; six-worker projection excludes finite-row and merge overhead"},
        "independence_boundary": "The producer composes cached quartic and endpoint modules at the middle root. The audit independently propagates both child messages upward, forms root states, and uses a separately written expanded-tree builder and cut-position order27 enumerator.",
        "immutable_input_hashes": actual, "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Preflight only. No n>=28 sign theorem is credited unless both full streams pass and match.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"]); print(RECORDS); print(GATES); print(STREAM); print(BENCH_STREAM); print("CONSERVATIVE_SEQUENTIAL_SECONDS", f"{conservative_seconds:.6f}"); print("AUTO_RUN_GATE PASS"); print("SOURCE", payload["source_sha256"]); print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
