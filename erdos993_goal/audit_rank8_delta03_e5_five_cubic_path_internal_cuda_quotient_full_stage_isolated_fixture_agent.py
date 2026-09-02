#!/usr/bin/env python3
"""Disposable end-to-end fixture and mutation audit for quotient full stages."""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_primary_agent as primary
from rank8_delta03_e5_five_cubic_path_internal_quotient_full_stage_config_agent import (
    LAYOUTS,
    static_layout_hashes,
)


ROOT = Path(__file__).resolve().parent
LAYOUT = LAYOUTS["inner_pendant_internal"]
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_full_stage_"
    "isolated_fixture_audit_agent_20260825.json"
)
SOURCES = {
    "rank8_delta03_e5_five_cubic_path_internal_quotient_full_stage_config_agent.py":
        "7A154586039D96D2BCFB9C82267D9854D2206361A65185EB1A6373C54D78BCAE",
    "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_raw_multiplicity_agent.py":
        "37FDA3CFE1A06DAA1A66CA824D30543D37AACA78BA71E53E77FB59288A4764D8",
    "assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_primary_agent.py":
        "611AA292FD778D78093783A7D67CB755FE9838A2FD1FF5E09D2F76DB297A37D6",
    "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_full_agent.py":
        "993864DBABE869DBAD94E3D77C178EA993A9B40C9461D37389574AF8F1B5126E",
    "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_exact_agent.py":
        "2EE677AEE4FC588963ABAF1386F67D987D6BA6F0C59B15CF6811D8BF69CA73A6",
    "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_independent_audit_agent.py":
        "C350C27F92E126BB1746A00A75ADAC50F8E49728A3ACEBA852002970205E268F",
    "assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_n27_plus_agent.py":
        "71C5E888041DBFD4CDC28F8AAE6ACD2918F2D589FFEA68475DF736C01E06D2FF",
    "run_rank8_cuda_full_internal_audit_driver_agent.py":
        "6725E387E7E738F12EABF51F6D437BDAE53CB00242E802E838A8345C4D00A726",
}
SHARED_N27 = (
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def run(script: Path, *arguments: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(script), *arguments],
        cwd=script.parent,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )


def require_pass(result: subprocess.CompletedProcess[str], token: str) -> None:
    assert result.returncode == 0, result.stdout
    assert token in result.stdout, result.stdout


def require_reject(
    result: subprocess.CompletedProcess[str], label: str
) -> dict[str, object]:
    assert result.returncode != 0, (label, result.stdout)
    return {"exit_code": result.returncode, "rejected": True}


def main() -> None:
    assert {name: sha256(ROOT / name) for name in SOURCES} == SOURCES
    copy_names = set(SOURCES) | set(primary.EXPECTED_SHARED) | set(
        static_layout_hashes(LAYOUT)
    ) | set(SHARED_N27)
    with tempfile.TemporaryDirectory(
        prefix="rank8_quotient_full_stage_fixture_"
    ) as temporary_name:
        fixture = Path(temporary_name)
        for name in copy_names:
            shutil.copy2(ROOT / name, fixture / name)

        ray_checkpoint_name = LAYOUT.quotient_ray_checkpoint_name
        ray_report_name = LAYOUT.quotient_ray_report_name
        finite_checkpoint_name = LAYOUT.finite_checkpoint_name
        finite_report_name = LAYOUT.finite_report_name
        raw_checkpoint_name = (
            "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
            "cuda_quotient_raw_multiplicity_audit_checkpoint_agent_20260825.json"
        )
        raw_report_name = (
            "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
            "cuda_quotient_raw_multiplicity_audit_agent_20260825.json"
        )
        primary_name = (
            "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
            "cuda_quotient_primary_exact_agent_20260825.json"
        )
        exact_name = (
            "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
            "cuda_quotient_all_order_exact_agent_20260825.json"
        )
        full_checkpoint_name = (
            "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
            "cuda_quotient_full_audit_checkpoint_agent_20260825.json"
        )
        full_report_name = (
            "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
            "cuda_quotient_full_independent_audit_agent_20260825.json"
        )
        dual_name = (
            "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
            "cuda_quotient_all_order_independent_audit_agent_20260825.json"
        )
        final_name = (
            "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
            "cuda_quotient_n27_plus_exact_agent_20260825.json"
        )

        ray_batch = {
            "start": 0,
            "stop": LAYOUT.patterns,
            "patterns": LAYOUT.patterns,
            "rays": LAYOUT.rays,
            "all_short": LAYOUT.all_short,
            "finite": LAYOUT.finite,
            "order27": LAYOUT.order27,
            "gate_failures": 0,
            "bound_failures": 0,
            "negative_classifications": 0,
            "positive_active_coefficients": LAYOUT.rays * 4,
            "zero_active_coefficients": 0,
            "zero_degree_overflow_coefficients": 0,
            "formula_evaluations": LAYOUT.rays,
            "formula_evaluations_saved": 0,
            "static_raw_rows": LAYOUT.rays,
            "dynamic_raw_rows": 0,
            "gpu_chunks": 0,
            "raw_multiplicity_sum": LAYOUT.rays,
            "maximum_group_multiplicity": 1,
            "raw_to_group_mapping_sha256": "A" * 64,
            "residue_fingerprint_sha256": "B" * 64,
        }
        total_keys = (
            "patterns", "rays", "all_short", "finite", "order27",
            "gate_failures", "bound_failures", "negative_classifications",
            "positive_active_coefficients", "zero_active_coefficients",
            "zero_degree_overflow_coefficients",
        )
        quotient_keys = (
            "formula_evaluations", "formula_evaluations_saved",
            "static_raw_rows", "dynamic_raw_rows", "gpu_chunks",
        )
        ray_checkpoint = {
            "schema": (
                "rank8-delta03-e5-five-cubic-path-inner-pendant-internal-"
                "cuda-rays-quotient-checkpoint-v1"
            ),
            "dependencies": {},
            "driver_immutable_input_hashes": {},
            "quotient_mapping_arrays_sha256": primary.MAPPING_ARRAYS_SHA256,
            "batch_size": 750_000,
            "opposite_start": 5,
            "cursor": LAYOUT.patterns,
            "batches": [ray_batch],
            "totals": {key: ray_batch[key] for key in total_keys},
            "quotient_totals": {key: ray_batch[key] for key in quotient_keys},
        }
        write_json(fixture / ray_checkpoint_name, ray_checkpoint)
        ray_checkpoint_hash = sha256(fixture / ray_checkpoint_name)
        ray_manifest = json.dumps(
            ray_batch, sort_keys=True, separators=(",", ":")
        ) + "\n"
        ray_report = {
            "schema": "qualification-fixture-ray-report-v1",
            "status": LAYOUT.ray_status,
            "root_orbit": LAYOUT.root_orbit,
            "totals": ray_checkpoint["totals"],
            "quotient_totals": ray_checkpoint["quotient_totals"],
            "crt_prime_count": 9,
            "crt_modulus_bits": 270,
            "batch_manifest_sha256": hashlib.sha256(
                ray_manifest.encode("utf-8")
            ).hexdigest().upper(),
            "checkpoint_sha256": ray_checkpoint_hash,
            "quotient_mapping_arrays_sha256": primary.MAPPING_ARRAYS_SHA256,
            "immutable_input_hashes": {},
            "driver_immutable_input_hashes": {},
            "driver_sha256": primary.EXPECTED_SHARED[
                "run_rank8_cuda_opposite_half_message_quotient_chunked_rays_driver_agent.py"
            ],
            "source_sha256": primary.EXPECTED_SHARED[
                "scan_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_rays_agent.py"
            ],
            "coverage_guards": {
                "original_pattern_domain_and_batch_boundaries_preserved": True,
                "raw_ray_ordinals_and_legacy_fingerprints_preserved": True,
                "multiplicities_recover_every_raw_ray": True,
                "selected_side_coordinates_never_quotiented": True,
                "original_exhaustive_totals_are_reported": True,
            },
        }
        write_json(fixture / ray_report_name, ray_report)

        finite_totals = {
            "patterns": LAYOUT.patterns,
            "all_short": LAYOUT.all_short,
            "finite": LAYOUT.finite,
            "order27": LAYOUT.order27,
            "positive_values": 4 * LAYOUT.finite,
            "nonpositive_values": 0,
            "bound_failures": 0,
        }
        finite_checkpoint = {"cursor": LAYOUT.patterns, "totals": finite_totals}
        write_json(fixture / finite_checkpoint_name, finite_checkpoint)
        finite_checkpoint_hash = sha256(fixture / finite_checkpoint_name)
        finite_report = {
            "status": LAYOUT.finite_status,
            "root_orbit": LAYOUT.root_orbit,
            "checkpoint_sha256": finite_checkpoint_hash,
            "totals": finite_totals,
            "crt_prime_count": 9,
            "crt_modulus_bits": 270,
            "immutable_input_hashes": {},
        }
        write_json(fixture / finite_report_name, finite_report)

        raw_batch = {
            "index": 0,
            "start": 0,
            "stop": LAYOUT.patterns,
            "patterns": LAYOUT.patterns,
            "raw_rays": LAYOUT.rays,
            "groups": LAYOUT.rays,
            "static_raw_rows": LAYOUT.rays,
            "dynamic_raw_rows": 0,
            "maximum_group_multiplicity": 1,
            "mapping_sha256": "A" * 64,
            "execution_mode": "PRODUCTION_QUOTIENT_GROUPED_BATCH",
        }
        raw_totals = {
            "patterns": LAYOUT.patterns,
            "raw_rays": LAYOUT.rays,
            "canonical_groups": LAYOUT.rays,
            "static_raw_rows": LAYOUT.rays,
            "dynamic_raw_rows": 0,
            "imported_legacy_raw_rays": 0,
            "production_quotient_raw_rays": LAYOUT.rays,
        }
        raw_checkpoint = {
            "dependencies": {},
            "quotient_checkpoint_cursor": LAYOUT.patterns,
            "next_batch_index": 1,
            "batches": [raw_batch],
            "totals": raw_totals,
        }
        write_json(fixture / raw_checkpoint_name, raw_checkpoint)
        raw_checkpoint_hash = sha256(fixture / raw_checkpoint_name)
        raw_report = {
            "status": (
                "PASS_INDEPENDENT_RAW_MULTIPLICITY_AUDIT_E5_FIVE_CUBIC_PATH_"
                "INNER_PENDANT_INTERNAL_QUOTIENT_RAYS"
            ),
            "root_orbit": LAYOUT.root_orbit,
            "mapping_arrays_sha256": primary.MAPPING_ARRAYS_SHA256,
            "quotient_checkpoint_sha256": ray_checkpoint_hash,
            "audit_checkpoint_sha256": raw_checkpoint_hash,
            "audited_batches": 1,
            "totals": raw_totals,
            "immutable_input_hashes": {},
            "source_sha256": SOURCES[
                "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_raw_multiplicity_agent.py"
            ],
        }
        write_json(fixture / raw_report_name, raw_report)

        assembler = fixture / (
            "assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_"
            "quotient_primary_agent.py"
        )
        assembler_args = (
            "--layout", LAYOUT.name,
            "--expected-quotient-ray-checkpoint-sha256", ray_checkpoint_hash,
            "--expected-quotient-ray-report-sha256", sha256(fixture / ray_report_name),
            "--expected-finite-checkpoint-sha256", finite_checkpoint_hash,
            "--expected-finite-report-sha256", sha256(fixture / finite_report_name),
            "--expected-raw-multiplicity-audit-checkpoint-sha256", raw_checkpoint_hash,
            "--expected-raw-multiplicity-audit-sha256", sha256(fixture / raw_report_name),
        )
        result = run(assembler, *assembler_args)
        require_pass(result, LAYOUT.primary_status)
        primary_hash = sha256(fixture / primary_name)

        exact_script = fixture / (
            "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_"
            "exact_agent.py"
        )
        result = run(
            exact_script,
            "--layout", LAYOUT.name,
            "--expected-primary-report-sha256", primary_hash,
        )
        require_pass(result, LAYOUT.exact_seal_status)
        exact_hash = sha256(fixture / exact_name)

        full_totals = {
            "patterns": LAYOUT.patterns,
            "rays": LAYOUT.rays,
            "all_short": LAYOUT.all_short,
            "finite": LAYOUT.finite,
            "order27": LAYOUT.order27,
            "ray_gate_failures": 0,
            "ray_bound_failures": 0,
            "ray_negative_classifications": 0,
            "finite_positive_values": 4 * LAYOUT.finite,
            "finite_nonpositive_values": 0,
            "finite_bound_failures": 0,
        }
        full_batch = {
            "start": 0,
            "stop": LAYOUT.patterns,
            "patterns": LAYOUT.patterns,
            "ray_gate_failures": 0,
            "ray_bound_failures": 0,
            "ray_negative_classifications": 0,
            "finite_nonpositive_values": 0,
            "finite_bound_failures": 0,
        }
        full_checkpoint = {
            "cursor": LAYOUT.patterns,
            "dependencies": {},
            "batches": [full_batch],
            "totals": full_totals,
        }
        write_json(fixture / full_checkpoint_name, full_checkpoint)
        full_checkpoint_hash = sha256(fixture / full_checkpoint_name)
        full_manifest = json.dumps(
            full_batch, sort_keys=True, separators=(",", ":")
        ) + "\n"
        full_report = {
            "status": LAYOUT.full_audit_status,
            "root_orbit": LAYOUT.root_orbit,
            "source_sha256": SOURCES[
                "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_full_agent.py"
            ],
            "driver_sha256": SOURCES[
                "run_rank8_cuda_full_internal_audit_driver_agent.py"
            ],
            "checkpoint_sha256": full_checkpoint_hash,
            "totals": full_totals,
            "crt_prime_count": 9,
            "crt_modulus_bits": 270,
            "batch_manifest_sha256": hashlib.sha256(
                full_manifest.encode("utf-8")
            ).hexdigest().upper(),
            "immutable_input_hashes": {},
        }
        write_json(fixture / full_report_name, full_report)
        full_report_hash = sha256(fixture / full_report_name)

        independent_script = fixture / (
            "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_"
            "independent_audit_agent.py"
        )
        independent_args = (
            "--layout", LAYOUT.name,
            "--expected-primary-report-sha256", exact_hash,
            "--expected-full-raw-audit-sha256", full_report_hash,
            "--expected-full-audit-checkpoint-sha256", full_checkpoint_hash,
            "--expected-raw-multiplicity-audit-sha256", sha256(fixture / raw_report_name),
            "--expected-raw-multiplicity-audit-checkpoint-sha256", raw_checkpoint_hash,
        )
        result = run(independent_script, *independent_args)
        require_pass(result, LAYOUT.independent_seal_status)
        dual_hash = sha256(fixture / dual_name)

        final_script = fixture / (
            "assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_"
            "quotient_n27_plus_agent.py"
        )
        result = run(
            final_script,
            "--layout", LAYOUT.name,
            "--expected-primary-report-sha256", exact_hash,
            "--expected-audit-report-sha256", dual_hash,
        )
        require_pass(result, LAYOUT.n27_status)
        final_hash = sha256(fixture / final_name)

        mutations = {}
        original_ray_report = json.loads(json.dumps(ray_report))
        ray_report["coverage_guards"][
            "selected_side_coordinates_never_quotiented"
        ] = False
        write_json(fixture / ray_report_name, ray_report)
        mutated_args = list(assembler_args)
        mutated_args[5] = sha256(fixture / ray_report_name)
        mutations["selected_side_coverage_false"] = require_reject(
            run(assembler, *mutated_args), "selected_side_coverage_false"
        )
        ray_report = original_ray_report
        write_json(fixture / ray_report_name, ray_report)

        raw_checkpoint["batches"][0]["mapping_sha256"] = "C" * 64
        write_json(fixture / raw_checkpoint_name, raw_checkpoint)
        mutated_raw_checkpoint_hash = sha256(fixture / raw_checkpoint_name)
        raw_report["audit_checkpoint_sha256"] = mutated_raw_checkpoint_hash
        write_json(fixture / raw_report_name, raw_report)
        mutated_args = list(assembler_args)
        mutated_args[11] = mutated_raw_checkpoint_hash
        mutated_args[13] = sha256(fixture / raw_report_name)
        mutations["raw_mapping_disagrees_with_production"] = require_reject(
            run(assembler, *mutated_args), "raw_mapping_disagrees_with_production"
        )
        raw_checkpoint["batches"][0]["mapping_sha256"] = "A" * 64
        write_json(fixture / raw_checkpoint_name, raw_checkpoint)
        raw_checkpoint_hash = sha256(fixture / raw_checkpoint_name)
        raw_report["audit_checkpoint_sha256"] = raw_checkpoint_hash
        write_json(fixture / raw_report_name, raw_report)

        full_report["status"] = "PASS_PARTIAL_FULL_RAW_AUDIT_NO_CREDIT"
        write_json(fixture / full_report_name, full_report)
        mutated_independent_args = list(independent_args)
        mutated_independent_args[5] = sha256(fixture / full_report_name)
        mutations["partial_full_raw_audit_status"] = require_reject(
            run(independent_script, *mutated_independent_args),
            "partial_full_raw_audit_status",
        )

        payload = {
            "schema": (
                "rank8-delta03-e5-five-cubic-path-internal-cuda-quotient-"
                "full-stage-isolated-fixture-audit-v1"
            ),
            "status": (
                "PASS_END_TO_END_ISOLATED_FIXTURE_AND_MUTATION_AUDIT_"
                "QUOTIENT_FULL_STAGE_NO_PROOF_CREDIT"
            ),
            "layout": LAYOUT.name,
            "valid_fixture_outputs": {
                "primary_sha256": primary_hash,
                "exact_seal_sha256": exact_hash,
                "dual_audit_seal_sha256": dual_hash,
                "n27_final_sha256": final_hash,
            },
            "mutations": mutations,
            "temporary_fixture_deleted_after_audit": True,
            "immutable_input_hashes": {
                **SOURCES,
                **{
                    name: sha256(ROOT / name)
                    for name in SHARED_N27
                },
            },
            "source_sha256": sha256(Path(__file__)),
            "scope_guard": (
                "Disposable schema/plumbing qualification only. Synthetic "
                "counts are never retained as proof artifacts; the temporary "
                "directory is deleted. Mathematical credit still requires "
                "production exhaustive checkpoints and audits."
            ),
        }
    write_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
