#!/usr/bin/env python3
"""Independent structural qualification of the quotient full-stage chain.

This report deliberately grants no mathematical credit.  It verifies that the
new generic configuration matches all four legacy exhaustive layouts, that the
full audit still routes through each independently transcribed raw engine, that
downstream hash pins form an unbroken chain, and that a genuine 750,000-pattern
batch passed the separately implemented raw-multiplicity replay.
"""

from __future__ import annotations

import hashlib
import importlib
import inspect
import json
from pathlib import Path

import assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_n27_plus_agent as final_stage
import assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_primary_agent as primary_stage
import audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_full_agent as full_stage
import audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_raw_multiplicity_agent as raw_stage
import scan_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_rays_agent as quotient_scanner
import seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_exact_agent as exact_stage
import seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_independent_audit_agent as independent_stage
from rank8_delta03_e5_five_cubic_path_internal_quotient_full_stage_config_agent import (
    LAYOUTS,
    static_layout_hashes,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_"
    "full_stage_qualification_agent_20260825.json"
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
}
PARTIAL_NAME = (
    "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_cuda_quotient_"
    "raw_multiplicity_partial_qualification_agent_20260825.json"
)
RAW_QUALIFICATION_CHECKPOINT = (
    ROOT / "_quotient_full_stage_qualification" /
    "inner_pendant_raw_multiplicity_checkpoint.json"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert {name: sha256(ROOT / name) for name in SOURCES} == SOURCES
    assert primary_stage.EXPECTED_SHARED[
        primary_stage.RAW_MULTIPLICITY_SOURCE
    ] == SOURCES[
        "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_raw_multiplicity_agent.py"
    ]
    assert full_stage.EXPECTED_SHARED[full_stage.ASSEMBLER_SOURCE] == SOURCES[
        "assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_primary_agent.py"
    ]
    assert exact_stage.EXPECTED[
        "assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_primary_agent.py"
    ] == SOURCES[
        "assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_primary_agent.py"
    ]
    assert independent_stage.EXPECTED_SHARED[
        "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_full_agent.py"
    ] == SOURCES[
        "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_full_agent.py"
    ]
    assert independent_stage.EXPECTED_SHARED[
        "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_raw_multiplicity_agent.py"
    ] == SOURCES[
        "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_raw_multiplicity_agent.py"
    ]
    assert independent_stage.EXPECTED_SHARED[
        "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_exact_agent.py"
    ] == SOURCES[
        "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_exact_agent.py"
    ]
    assert final_stage.EXPECTED[
        "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_exact_agent.py"
    ] == SOURCES[
        "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_exact_agent.py"
    ]
    assert final_stage.EXPECTED[
        "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_independent_audit_agent.py"
    ] == SOURCES[
        "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_independent_audit_agent.py"
    ]

    layout_checks = {}
    for name, layout in LAYOUTS.items():
        quotient = quotient_scanner.LAYOUTS[name]
        assert quotient.opposite_start == layout.opposite_start
        assert quotient.near_states == layout.near_states
        assert quotient.tail_states == layout.tail_states
        assert quotient.total == layout.patterns
        assert quotient.rays == layout.rays
        assert quotient.all_short == layout.all_short
        assert quotient.finite == layout.finite
        assert quotient.order27 == layout.order27
        assert quotient.status == layout.ray_status
        assert quotient.formula.__name__ == layout.formula_source[:-3]
        assert quotient.row_adapter.__name__ == layout.ray_adapter_module
        assert {
            source: sha256(ROOT / source)
            for source in static_layout_hashes(layout)
        } == static_layout_hashes(layout)

        legacy_primary = importlib.import_module(
            f"assemble_rank8_delta03_e5_five_cubic_path_{name}_"
            "cuda_primary_agent"
        )
        assert legacy_primary.EXPECTED_RAYS == {
            "patterns": layout.patterns,
            "rays": layout.rays,
            "all_short": layout.all_short,
            "finite": layout.finite,
            "order27": layout.order27,
        }
        assert legacy_primary.EXPECTED_FINITE == {
            "patterns": layout.patterns,
            "all_short": layout.all_short,
            "finite": layout.finite,
            "order27": layout.order27,
            "positive_values": 4 * layout.finite,
            "nonpositive_values": 0,
            "bound_failures": 0,
        }
        legacy_full = importlib.import_module(
            f"audit_rank8_delta03_e5_five_cubic_path_{name}_cuda_full_agent"
        )
        assert legacy_full.audit_engine.__name__ == layout.audit_engine_module
        assert legacy_full.ray_driver.__name__ == layout.ray_adapter_module
        assert legacy_full.finite_driver.__name__ == layout.finite_adapter_module

        primary_name = (
            f"rank8_delta03_e5_five_cubic_path_{name}_cuda_quotient_"
            "primary_exact_agent_20260825.json"
        )
        config = full_stage.build_config(layout, {"PIN": "VALUE"}, primary_name)
        assert config.primary_name == primary_name
        assert config.primary_status == layout.primary_status
        assert config.status == layout.full_audit_status
        assert config.root_orbit == layout.root_orbit
        assert config.total_patterns == layout.patterns
        assert config.expected_rays == layout.rays
        assert config.expected_all_short == layout.all_short
        assert config.expected_finite == layout.finite
        assert config.expected_order27 == layout.order27
        assert config.near_states == layout.near_states
        assert config.tail_states == layout.tail_states
        assert config.batch_size == 750_000
        assert "cuda_quotient_full_audit_checkpoint" in config.checkpoint.name
        assert "cuda_quotient_full_independent_audit" in config.output.name
        layout_checks[name] = {
            "patterns": layout.patterns,
            "raw_rays": layout.rays,
            "finite": layout.finite,
            "opposite_start": layout.opposite_start,
            "independent_audit_engine": layout.audit_engine_module,
            "ray_adapter": layout.ray_adapter_module,
            "finite_adapter": layout.finite_adapter_module,
        }

    # Exercise the primary checkpoint validator on a synthetic full-domain
    # shape, then prove that a one-ray multiplicity mutation fails closed.
    fixture_layout = LAYOUTS["inner_pendant_internal"]
    fixture_batch = {
        "start": 0,
        "stop": fixture_layout.patterns,
        "patterns": fixture_layout.patterns,
        "rays": fixture_layout.rays,
        "all_short": fixture_layout.all_short,
        "finite": fixture_layout.finite,
        "order27": fixture_layout.order27,
        "gate_failures": 0,
        "bound_failures": 0,
        "negative_classifications": 0,
        "positive_active_coefficients": 1,
        "zero_active_coefficients": 0,
        "zero_degree_overflow_coefficients": 0,
        "formula_evaluations": fixture_layout.rays,
        "formula_evaluations_saved": 0,
        "static_raw_rows": fixture_layout.rays,
        "dynamic_raw_rows": 0,
        "gpu_chunks": 0,
        "raw_multiplicity_sum": fixture_layout.rays,
        "maximum_group_multiplicity": 1,
        "raw_to_group_mapping_sha256": "A" * 64,
        "residue_fingerprint_sha256": "B" * 64,
    }
    legacy_total_keys = (
        "patterns", "rays", "all_short", "finite", "order27",
        "gate_failures", "bound_failures", "negative_classifications",
        "positive_active_coefficients", "zero_active_coefficients",
        "zero_degree_overflow_coefficients",
    )
    quotient_total_keys = (
        "formula_evaluations", "formula_evaluations_saved",
        "static_raw_rows", "dynamic_raw_rows", "gpu_chunks",
    )
    fixture_checkpoint = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-inner-pendant-internal-"
            "cuda-rays-quotient-checkpoint-v1"
        ),
        "cursor": fixture_layout.patterns,
        "batch_size": 750_000,
        "opposite_start": fixture_layout.opposite_start,
        "quotient_mapping_arrays_sha256": raw_stage.MAPPING_ARRAYS_SHA256,
        "batches": [fixture_batch],
        "totals": {key: fixture_batch[key] for key in legacy_total_keys},
        "quotient_totals": {
            key: fixture_batch[key] for key in quotient_total_keys
        },
    }
    primary_stage.validate_quotient_checkpoint(
        fixture_layout, fixture_checkpoint
    )
    mutated = json.loads(json.dumps(fixture_checkpoint))
    mutated["batches"][0]["raw_multiplicity_sum"] -= 1
    mutation_rejected = False
    try:
        primary_stage.validate_quotient_checkpoint(fixture_layout, mutated)
    except AssertionError:
        mutation_rejected = True
    assert mutation_rejected

    source_gates = {
        "primary": inspect.getsource(primary_stage.main),
        "independent": inspect.getsource(independent_stage.main),
        "final": inspect.getsource(final_stage.main),
    }
    for needle in (
        "--expected-quotient-ray-checkpoint-sha256",
        "--expected-finite-checkpoint-sha256",
        "--expected-raw-multiplicity-audit-checkpoint-sha256",
        "--expected-raw-multiplicity-audit-sha256",
    ):
        assert needle in source_gates["primary"]
    for needle in (
        "--expected-full-raw-audit-sha256",
        "--expected-full-audit-checkpoint-sha256",
        "--expected-raw-multiplicity-audit-sha256",
        "--expected-raw-multiplicity-audit-checkpoint-sha256",
    ):
        assert needle in source_gates["independent"]
    assert "--expected-primary-report-sha256" in source_gates["final"]
    assert "--expected-audit-report-sha256" in source_gates["final"]

    partial = json.loads((ROOT / PARTIAL_NAME).read_text(encoding="utf-8"))
    raw_checkpoint = json.loads(
        RAW_QUALIFICATION_CHECKPOINT.read_text(encoding="utf-8")
    )
    quotient_checkpoint_name = (
        "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
        "cuda_quotient_rays_checkpoint_agent_20260825.json"
    )
    quotient_checkpoint = json.loads(
        (ROOT / quotient_checkpoint_name).read_text(encoding="utf-8")
    )
    raw_stage.validate_quotient_checkpoint(
        LAYOUTS["inner_pendant_internal"], quotient_checkpoint
    )
    assert partial["status"] == (
        "PASS_PARTIAL_INDEPENDENT_RAW_MULTIPLICITY_"
        "QUALIFICATION_NO_ORBIT_SIGN_CREDIT"
    )
    assert partial["layout"] == "inner_pendant_internal"
    assert partial["quotient_checkpoint_cursor"] == 750_000
    assert partial["audited_batches"] == 1
    assert partial["totals"]["patterns"] == 750_000
    assert partial["totals"]["raw_rays"] == 465_996
    assert partial["totals"]["canonical_groups"] == 324_498
    assert partial["audit_checkpoint_sha256"] == sha256(
        RAW_QUALIFICATION_CHECKPOINT
    )
    assert partial["quotient_checkpoint_sha256"] == sha256(
        ROOT / quotient_checkpoint_name
    )
    assert raw_checkpoint["batches"][0]["mapping_sha256"] == (
        quotient_checkpoint["batches"][0]["raw_to_group_mapping_sha256"]
    )
    assert raw_checkpoint["batches"][0]["maximum_group_multiplicity"] == 7

    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-internal-cuda-quotient-"
            "full-stage-qualification-agent-v1"
        ),
        "status": (
            "PASS_STRUCTURAL_AND_REAL_BATCH_QUALIFICATION_QUOTIENT_FULL_"
            "STAGE_NO_ORBIT_SIGN_CREDIT"
        ),
        "layout_checks": layout_checks,
        "real_batch_raw_multiplicity_replay": {
            "layout": "inner_pendant_internal",
            "start": 0,
            "stop": 750_000,
            "raw_rays": 465_996,
            "canonical_groups": 324_498,
            "mapping_sha256": raw_checkpoint["batches"][0]["mapping_sha256"],
            "quotient_checkpoint_sha256": partial[
                "quotient_checkpoint_sha256"
            ],
            "partial_qualification_sha256": sha256(ROOT / PARTIAL_NAME),
        },
        "gate_matrix": {
            "primary_requires_complete_quotient_ray_checkpoint": True,
            "primary_requires_independent_raw_multiplicity_audit": True,
            "primary_requires_complete_exhaustive_finite_stage": True,
            "independent_seal_requires_full_raw_cuda_audit": True,
            "independent_seal_requires_raw_multiplicity_audit": True,
            "n27_final_requires_exact_and_independent_seals": True,
            "partial_qualification_is_not_accepted_by_any_seal": True,
            "primary_checkpoint_validator_rejects_multiplicity_mutation": (
                mutation_rejected
            ),
        },
        "immutable_input_hashes": {
            **SOURCES,
            PARTIAL_NAME: sha256(ROOT / PARTIAL_NAME),
            str(RAW_QUALIFICATION_CHECKPOINT.relative_to(ROOT)):
                sha256(RAW_QUALIFICATION_CHECKPOINT),
            quotient_checkpoint_name: sha256(ROOT / quotient_checkpoint_name),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Engineering qualification only. The genuine batch validates the "
            "independent mapping replay, while no full orbit is claimed until "
            "production rays, finite stage, full raw audit, both seals, and "
            "the n>=27 wrapper complete on immutable artifacts."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
