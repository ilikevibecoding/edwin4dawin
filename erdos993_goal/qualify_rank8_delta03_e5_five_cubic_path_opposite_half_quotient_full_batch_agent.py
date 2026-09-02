#!/usr/bin/env python3
"""Full 750,000-pattern qualification of the low-memory quotient engine.

For the first production batch of each still-open layout, this program runs a
low-memory raw legacy replay and a canonical grouped replay.  Both use original
raw-ray ordinals in the exact legacy fingerprint recurrence.  It requires
identical classifier totals and the identical final per-batch residue
fingerprint.  No checkpoint or live-controller file is read or written.
"""

from __future__ import annotations

import gc
import hashlib
import json
import os
from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace

import numpy as np

import benchmark_rank8_cuda_path_inner_pendant_internal_formula_agent as inner_pendant_formula
import benchmark_rank8_cuda_path_inner_spine_internal_formula_agent as inner_spine_formula
import benchmark_rank8_cuda_path_outer_pendant_internal_formula_agent as outer_pendant_formula
import benchmark_rank8_cuda_path_outer_spine_internal_formula_agent as outer_spine_formula
import run_rank8_cuda_opposite_half_message_quotient_chunked_engine_agent as engine
import run_rank8_cuda_opposite_half_message_quotient_driver_agent as quotient
import run_rank8_cuda_ordered_halves_internal_rays_driver_agent as inner_pendant_rows
import run_rank8_cuda_path_inner_spine_internal_rays_driver_agent as inner_spine_rows
import run_rank8_cuda_path_outer_pendant_internal_rays_driver_agent as outer_pendant_rows
import run_rank8_cuda_path_outer_spine_internal_rays_driver_agent as outer_spine_rows
import scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent as center


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_full_batch_"
    "qualification_agent_20260825.json"
)
EXPECTED = {
    "run_rank8_cuda_opposite_half_message_quotient_chunked_engine_agent.py":
        "EF1B9D19E20424564AC51F8CF399612480772581E9F6B07C6B5B78573641E108",
    "run_rank8_cuda_opposite_half_message_quotient_driver_agent.py":
        "F85FA0522D9DF83D344150B90D417E0F5A0DB6BCB46AE1A338C13366B7FBA864",
    "benchmark_rank8_cuda_path_inner_pendant_internal_formula_agent.py":
        "3375CA9FC94BD2453FB9185EAA9D6A91A752AE22ACEB8FB001A22DFE0AB9F0A7",
    "benchmark_rank8_cuda_path_inner_spine_internal_formula_agent.py":
        "AD84186A273F8D8B2DCF6ED4CC90F1D5AAED5BA9B501D333BB397178E0771E7F",
    "benchmark_rank8_cuda_path_outer_spine_internal_formula_agent.py":
        "49E9B33FD62E4CA79E134D5ECCA6E4C05B0F802BE9B64C681E36006C98FB3DFB",
    "benchmark_rank8_cuda_path_outer_pendant_internal_formula_agent.py":
        "4DD5408DD553B2754137A737C6F9DD5902C6B458F6A4E6EEB962CC4393BF486E",
    "run_rank8_cuda_ordered_halves_internal_rays_driver_agent.py":
        "F2DC6C7037DFA3B1B0C5747FF73549EA75BAA712069B14AEECCB628AA55C00CF",
    "run_rank8_cuda_path_inner_spine_internal_rays_driver_agent.py":
        "EF01B40C79F4DD702DB4F94A7936C06F2CEA7935E1CE72A55290703B3DEE804D",
    "run_rank8_cuda_path_outer_spine_internal_rays_driver_agent.py":
        "407EC8E3B09572B290E700FE36C0E4290FB54DCCF91ED855C762BB461BE7836A",
    "run_rank8_cuda_path_outer_pendant_internal_rays_driver_agent.py":
        "77618A288F3D92491D95E9D8DCEC672D2AB58F7DA361F0FEB9FC531988034830",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
}
BATCH_SIZE = 750_000


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


@dataclass(frozen=True)
class Layout:
    name: str
    row_adapter: object
    formula: object
    opposite_start: int
    near_states: int
    tail_states: int


LAYOUTS = (
    Layout(
        "inner_pendant_internal",
        inner_pendant_rows,
        inner_pendant_formula,
        5,
        8,
        7,
    ),
    Layout(
        "inner_spine_internal",
        inner_spine_rows,
        inner_spine_formula,
        7,
        8,
        8,
    ),
    Layout(
        "outer_spine_internal",
        outer_spine_rows,
        outer_spine_formula,
        7,
        8,
        8,
    ),
    Layout(
        "outer_pendant_internal",
        outer_pendant_rows,
        outer_pendant_formula,
        5,
        8,
        7,
    ),
)


def first_long_table() -> np.ndarray:
    table = np.full(1 << 12, -1, dtype=np.int8)
    for mask in range(1, 1 << 12):
        table[mask] = (mask & -mask).bit_length() - 1
    return table


def qualify(layout: Layout) -> dict:
    halves, sums, masks = center.half_table()
    config = SimpleNamespace(
        near_states=layout.near_states,
        tail_states=layout.tail_states,
        near_long_value=7,
        tail_long_value=7,
    )
    rows, varying, shifts, all_short, finite, order27 = (
        layout.row_adapter.make_rows(
            config,
            0,
            BATCH_SIZE,
            halves,
            sums,
            masks,
            first_long_table(),
        )
    )
    batch = quotient.quotient_rows(
        rows, varying, shifts, layout.opposite_start
    )
    legacy = engine.legacy_pass(
        rows,
        varying,
        shifts,
        layout.formula.evaluate_kernel,
        chunk_capacity=20_000,
    )
    grouped = engine.grouped_pass(
        batch,
        layout.formula.evaluate_kernel,
        group_capacity=20_000,
        member_capacity=40_000,
    )
    assert legacy.raw_rays == grouped.raw_rays == len(rows)
    assert legacy.evaluated_rows == len(rows)
    assert grouped.evaluated_rows == batch.quotient_groups
    assert legacy.statistics == grouped.statistics
    assert (
        legacy.residue_fingerprint_sha256
        == grouped.residue_fingerprint_sha256
    )
    assert legacy.original_kernel_first_chunk_fingerprint_match is True
    assert legacy.statistics["gate_failures"] == 0
    assert legacy.statistics["bound_failures"] == 0
    assert legacy.statistics["negative_classifications"] == 0
    result = {
        "start": 0,
        "stop": BATCH_SIZE,
        "patterns": BATCH_SIZE,
        "raw_rays": len(rows),
        "all_short": all_short,
        "finite": finite,
        "order27": order27,
        "quotient_groups": batch.quotient_groups,
        "formula_evaluations_saved": len(rows) - batch.quotient_groups,
        "quotient_fraction": batch.quotient_groups / len(rows),
        "static_raw_rows": batch.static_raw_rows,
        "dynamic_raw_rows": batch.dynamic_raw_rows,
        "multiplicity_sum": int(
            batch.group_multiplicities.sum(dtype=np.int64)
        ),
        "raw_to_group_mapping_sha256": batch.mapping_sha256,
        "legacy_raw_gpu_chunks": legacy.gpu_chunks,
        "grouped_gpu_chunks": grouped.gpu_chunks,
        "legacy_evaluate_difference_classify_fingerprint_seconds": (
            legacy.elapsed_seconds
        ),
        "grouped_evaluate_difference_expand_classify_fingerprint_seconds": (
            grouped.elapsed_seconds
        ),
        "classifier_statistics": legacy.statistics,
        "legacy_compatible_residue_fingerprint_sha256": (
            legacy.residue_fingerprint_sha256
        ),
        "legacy_custom_global_ordinal_kernel_matches_original_kernel_on_first_chunk": True,
        "legacy_and_grouped_classifier_statistics_equal": True,
        "legacy_and_grouped_full_batch_fingerprints_equal": True,
    }
    del rows, varying, shifts, batch
    gc.collect()
    return result


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    engine.validate_inputs()
    layouts = {}
    for layout in LAYOUTS:
        layouts[layout.name] = qualify(layout)
        row = layouts[layout.name]
        print(
            "FULL_BATCH_PASS",
            layout.name,
            row["raw_rays"],
            row["quotient_groups"],
            row["legacy_compatible_residue_fingerprint_sha256"],
            flush=True,
        )
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-opposite-half-quotient-"
            "full-batch-qualification-agent-v1"
        ),
        "status": (
            "PASS_EXACT_ALL_FOUR_FULL_PRODUCTION_BATCH_LEGACY_"
            "FINGERPRINT_EQUIVALENT_OPPOSITE_HALF_QUOTIENT_NO_PROOF_CREDIT"
        ),
        "batch_size": BATCH_SIZE,
        "group_capacity": 20_000,
        "member_capacity": 40_000,
        "layout_qualifications": layouts,
        "checks": {
            "original_750000_pattern_batch_boundary_preserved": True,
            "original_raw_ray_ordinals_preserved": True,
            "explicit_multiplicities_recover_all_raw_rays": True,
            "legacy_fingerprint_replayed_in_bounded_memory": True,
            "grouped_fingerprint_replayed_in_bounded_memory": True,
            "all_four_full_batch_fingerprints_byte_identical": True,
            "all_four_full_batch_classifier_statistics_identical": True,
            "no_live_checkpoint_read_or_write": True,
        },
        "timing_guard": (
            "A live independent GPU audit was concurrent; timing is "
            "diagnostic only and not used for correctness or completion."
        ),
        "immutable_input_hashes": actual,
        "engine_immutable_input_hashes": engine.validate_inputs(),
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Full production-batch acceleration qualification only. It "
            "changes no live chain and gives no orbit or residual-sign proof "
            "credit."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
