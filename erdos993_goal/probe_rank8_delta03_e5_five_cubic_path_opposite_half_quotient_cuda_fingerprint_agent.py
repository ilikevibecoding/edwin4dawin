#!/usr/bin/env python3
"""GPU equivalence probe for the pinned opposite-half message quotient.

For all four still-open internal-root layouts this probe exercises every
quotient mode on complete canonical half subdomains.  It compares the legacy
raw-row Newton residues with grouped evaluation expanded back into the exact
raw-ray order, then compares the unchanged classifier statistics and legacy
per-row-seeded batch fingerprint.

It also reconstructs two genuine 750,000-pattern production batch mappings
per layout on the CPU.  No live checkpoint is read or written.
"""

from __future__ import annotations

import gc
import hashlib
import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace

import numpy as np
from numba import cuda

import benchmark_rank8_cuda_path_center_formula_agent as common
import benchmark_rank8_cuda_path_inner_pendant_internal_formula_agent as inner_pendant_formula
import benchmark_rank8_cuda_path_inner_spine_internal_formula_agent as inner_spine_formula
import benchmark_rank8_cuda_path_outer_pendant_internal_formula_agent as outer_pendant_formula
import benchmark_rank8_cuda_path_outer_spine_internal_formula_agent as outer_spine_formula
import run_rank8_cuda_opposite_half_message_quotient_driver_agent as quotient
import run_rank8_cuda_ordered_halves_internal_rays_driver_agent as inner_pendant_rows
import run_rank8_cuda_path_inner_spine_internal_rays_driver_agent as inner_spine_rows
import run_rank8_cuda_path_outer_pendant_internal_rays_driver_agent as outer_pendant_rows
import run_rank8_cuda_path_outer_spine_internal_rays_driver_agent as outer_spine_rows
import scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent as center


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_cuda_"
    "fingerprint_probe_agent_20260825.json"
)
EXPECTED = {
    "run_rank8_cuda_opposite_half_message_quotient_driver_agent.py":
        "F85FA0522D9DF83D344150B90D417E0F5A0DB6BCB46AE1A338C13366B7FBA864",
    "run_rank8_cuda_ordered_halves_internal_rays_driver_agent.py":
        "F2DC6C7037DFA3B1B0C5747FF73549EA75BAA712069B14AEECCB628AA55C00CF",
    "run_rank8_cuda_path_inner_spine_internal_rays_driver_agent.py":
        "EF01B40C79F4DD702DB4F94A7936C06F2CEA7935E1CE72A55290703B3DEE804D",
    "run_rank8_cuda_path_outer_spine_internal_rays_driver_agent.py":
        "407EC8E3B09572B290E700FE36C0E4290FB54DCCF91ED855C762BB461BE7836A",
    "run_rank8_cuda_path_outer_pendant_internal_rays_driver_agent.py":
        "77618A288F3D92491D95E9D8DCEC672D2AB58F7DA361F0FEB9FC531988034830",
    "benchmark_rank8_cuda_path_inner_pendant_internal_formula_agent.py":
        "3375CA9FC94BD2453FB9185EAA9D6A91A752AE22ACEB8FB001A22DFE0AB9F0A7",
    "benchmark_rank8_cuda_path_inner_spine_internal_formula_agent.py":
        "AD84186A273F8D8B2DCF6ED4CC90F1D5AAED5BA9B501D333BB397178E0771E7F",
    "benchmark_rank8_cuda_path_outer_spine_internal_formula_agent.py":
        "49E9B33FD62E4CA79E134D5ECCA6E4C05B0F802BE9B64C681E36006C98FB3DFB",
    "benchmark_rank8_cuda_path_outer_pendant_internal_formula_agent.py":
        "4DD5408DD553B2754137A737C6F9DD5902C6B458F6A4E6EEB962CC4393BF486E",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
}
BATCH_SIZE = 750_000
WIDTH = common.PRIME_COUNT * common.RANKS * common.POINTS


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
    total_patterns: int
    selected_long_target: int
    order_constant: int


LAYOUTS = (
    Layout(
        "inner_pendant_internal",
        inner_pendant_rows,
        inner_pendant_formula,
        5,
        8,
        7,
        8_811_708_416,
        7 * 12_544 * 56,
        2,
    ),
    Layout(
        "inner_spine_internal",
        inner_spine_rows,
        inner_spine_formula,
        7,
        8,
        8,
        8_811_708_416,
        196 * 12_544 * 64,
        3,
    ),
    Layout(
        "outer_spine_internal",
        outer_spine_rows,
        outer_spine_formula,
        7,
        8,
        8,
        8_811_708_416,
        196 * 12_544 * 64,
        3,
    ),
    Layout(
        "outer_pendant_internal",
        outer_pendant_rows,
        outer_pendant_formula,
        5,
        8,
        7,
        15_420_489_728,
        2_744 * 12_544 * 56,
        2,
    ),
)


def first_long_table() -> np.ndarray:
    table = np.full(1 << 12, -1, dtype=np.int8)
    for mask in range(1, 1 << 12):
        table[mask] = (mask & -mask).bit_length() - 1
    return table


def actual_batch_mapping(layout: Layout, start: int) -> dict:
    halves, sums, masks = center.half_table()
    config = SimpleNamespace(
        near_states=layout.near_states,
        tail_states=layout.tail_states,
        near_long_value=7,
        tail_long_value=7,
    )
    stop = min(layout.total_patterns, start + BATCH_SIZE)
    begun = time.perf_counter()
    rows, varying, shifts, all_short, finite, order27 = (
        layout.row_adapter.make_rows(
            config,
            start,
            stop,
            halves,
            sums,
            masks,
            first_long_table(),
        )
    )
    batch = quotient.quotient_rows(
        rows, varying, shifts, layout.opposite_start
    )
    result = {
        "start": start,
        "stop": stop,
        "patterns": stop - start,
        "raw_rays": len(rows),
        "all_short": all_short,
        "finite": finite,
        "order27": order27,
        "quotient_groups": batch.quotient_groups,
        "formula_evaluations_saved": len(rows) - batch.quotient_groups,
        "quotient_fraction": batch.quotient_groups / max(len(rows), 1),
        "static_raw_rows": batch.static_raw_rows,
        "dynamic_raw_rows": batch.dynamic_raw_rows,
        "multiplicity_sum": int(
            batch.group_multiplicities.sum(dtype=np.int64)
        ),
        "maximum_group_multiplicity": int(
            batch.group_multiplicities.max(initial=0)
        ),
        "raw_to_group_mapping_sha256": batch.mapping_sha256,
        "mapping_seconds": time.perf_counter() - begun,
    }
    assert result["multiplicity_sum"] == result["raw_rays"]
    del rows, varying, shifts, batch
    gc.collect()
    return result


def synthetic_domain(layout: Layout) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict]:
    tables = quotient.load_tables()
    halves = tables.halves
    long_indices = np.flatnonzero(tables.first_long >= 0)
    short_indices = np.flatnonzero(tables.first_long < 0)
    chunks = []
    varyings = []
    labels: dict[str, dict] = {}

    if layout.opposite_start == 5:
        if layout.name == "inner_pendant_internal":
            selected_long = np.asarray((8, 1, 1, 1, 1), dtype=np.int32)
        else:
            selected_long = np.asarray((1, 8, 1, 1, 1), dtype=np.int32)
        selected_short = np.asarray((1, 1, 1, 1, 1), dtype=np.int32)

        static_rows = np.empty((len(halves), 12), dtype=np.int32)
        static_rows[:, :5] = selected_long
        static_rows[:, 5:10] = halves
        static_rows[:, 10:] = (0, 1)
        static_varying = np.full(
            len(static_rows),
            0 if layout.name == "inner_pendant_internal" else 1,
            dtype=np.int32,
        )
        chunks.append(static_rows)
        varyings.append(static_varying)
        labels["selected_side_first_static"] = {
            "start": 0,
            "stop": len(static_rows),
            "raw_rows": len(static_rows),
            "expected_groups": 9_091,
        }

        dynamic_rows = np.empty((len(long_indices), 12), dtype=np.int32)
        dynamic_rows[:, :5] = selected_short
        dynamic_rows[:, 5:10] = halves[long_indices]
        dynamic_rows[:, 10:] = (0, 1)
        dynamic_varying = (
            layout.opposite_start
            + tables.first_long[long_indices].astype(np.int32)
        )
        start = sum(len(chunk) for chunk in chunks)
        chunks.append(dynamic_rows)
        varyings.append(dynamic_varying)
        labels["opposite_half_first_dynamic"] = {
            "start": start,
            "stop": start + len(dynamic_rows),
            "raw_rows": len(dynamic_rows),
            "expected_groups": 4_075,
        }

        later_rows = np.empty((len(short_indices), 12), dtype=np.int32)
        later_rows[:, :5] = selected_short
        later_rows[:, 5:10] = halves[short_indices]
        later_rows[:, 10:] = (7, 1)
        later_varying = np.full(len(later_rows), 10, dtype=np.int32)
        start = sum(len(chunk) for chunk in chunks)
        chunks.append(later_rows)
        varyings.append(later_varying)
        labels["later_coordinate_first_static"] = {
            "start": start,
            "stop": start + len(later_rows),
            "raw_rows": len(later_rows),
            "expected_groups": 5_283,
        }
    else:
        selected_long = np.asarray((0, 0, 1, 1, 8, 1, 1), dtype=np.int32)
        selected_short = np.asarray((0, 0, 1, 1, 1, 1, 1), dtype=np.int32)
        static_rows = np.empty((len(halves), 12), dtype=np.int32)
        static_rows[:, :7] = selected_long
        static_rows[:, 7:12] = halves
        static_varying = np.full(len(static_rows), 4, dtype=np.int32)
        chunks.append(static_rows)
        varyings.append(static_varying)
        labels["selected_side_first_static"] = {
            "start": 0,
            "stop": len(static_rows),
            "raw_rows": len(static_rows),
            "expected_groups": 9_091,
        }

        dynamic_rows = np.empty((len(long_indices), 12), dtype=np.int32)
        dynamic_rows[:, :7] = selected_short
        dynamic_rows[:, 7:12] = halves[long_indices]
        dynamic_varying = (
            layout.opposite_start
            + tables.first_long[long_indices].astype(np.int32)
        )
        start = sum(len(chunk) for chunk in chunks)
        chunks.append(dynamic_rows)
        varyings.append(dynamic_varying)
        labels["opposite_half_first_dynamic"] = {
            "start": start,
            "stop": start + len(dynamic_rows),
            "raw_rows": len(dynamic_rows),
            "expected_groups": 4_075,
        }

    rows = np.ascontiguousarray(np.concatenate(chunks), dtype=np.int32)
    varying = np.ascontiguousarray(np.concatenate(varyings), dtype=np.int32)
    shifts = np.maximum(
        0,
        28 - (layout.order_constant + rows.sum(axis=1, dtype=np.int32)),
    ).astype(np.int32)
    return rows, varying, shifts, labels


def cuda_equivalence(layout: Layout) -> dict:
    rows, varying, shifts, labels = synthetic_domain(layout)
    quotient_started = time.perf_counter()
    batch = quotient.quotient_rows(
        rows, varying, shifts, layout.opposite_start
    )
    quotient_seconds = time.perf_counter() - quotient_started
    for label in labels.values():
        sub = quotient.quotient_rows(
            rows[label["start"]:label["stop"]],
            varying[label["start"]:label["stop"]],
            shifts[label["start"]:label["stop"]],
            layout.opposite_start,
        )
        assert sub.quotient_groups == label["expected_groups"]
        label["observed_groups"] = sub.quotient_groups
        label["mapping_sha256"] = sub.mapping_sha256

    primes = common.primes31()
    inverses, modulus, modulus_limbs = common.crt_constants(primes)
    d_primes = cuda.to_device(np.asarray(primes, dtype=np.uint32))
    d_inverses = cuda.to_device(np.asarray(inverses, dtype=np.uint32))
    d_modulus = cuda.to_device(np.asarray(modulus_limbs, dtype=np.uint32))
    d_degrees = cuda.to_device(np.asarray(center.DEGREES, dtype=np.uint32))

    # Compile each path on one row before timing.
    d_warm_rows = cuda.to_device(rows[:1])
    d_warm_varying = cuda.to_device(varying[:1])
    d_warm_shifts = cuda.to_device(shifts[:1])
    d_warm = cuda.device_array(WIDTH, dtype=np.uint32)
    layout.formula.evaluate_kernel[1, 1](
        d_warm_rows, d_warm_varying, d_warm_shifts, d_primes, d_warm
    )
    common.differences_kernel[1, 1](d_warm, d_primes, 1)
    d_warm_inverse = cuda.to_device(np.asarray([0], dtype=np.int32))
    d_warm_expanded = cuda.device_array(WIDTH, dtype=np.uint32)
    quotient.expand_grouped_residues_kernel[(WIDTH + 127) // 128, 128](
        d_warm, d_warm_inverse, 1, WIDTH, d_warm_expanded
    )
    cuda.synchronize()

    raw_count = len(rows)
    group_count = batch.quotient_groups
    d_raw_rows = cuda.to_device(rows)
    d_raw_varying = cuda.to_device(varying)
    d_raw_shifts = cuda.to_device(shifts)
    d_legacy = cuda.device_array(raw_count * WIDTH, dtype=np.uint32)
    legacy_started = time.perf_counter()
    layout.formula.evaluate_kernel[
        (raw_count * common.POINTS + 63) // 64, 64
    ](
        d_raw_rows,
        d_raw_varying,
        d_raw_shifts,
        d_primes,
        d_legacy,
    )
    legacy_work = raw_count * common.PRIME_COUNT * common.RANKS
    common.differences_kernel[(legacy_work + 127) // 128, 128](
        d_legacy, d_primes, raw_count
    )
    cuda.synchronize()
    legacy_seconds = time.perf_counter() - legacy_started

    d_group_rows = cuda.to_device(batch.group_rows)
    d_group_varying = cuda.to_device(batch.group_varying)
    d_group_shifts = cuda.to_device(batch.group_shifts)
    d_grouped = cuda.device_array(group_count * WIDTH, dtype=np.uint32)
    d_expanded = cuda.device_array(raw_count * WIDTH, dtype=np.uint32)
    d_inverse = cuda.to_device(batch.raw_to_group)
    grouped_started = time.perf_counter()
    layout.formula.evaluate_kernel[
        (group_count * common.POINTS + 63) // 64, 64
    ](
        d_group_rows,
        d_group_varying,
        d_group_shifts,
        d_primes,
        d_grouped,
    )
    grouped_work = group_count * common.PRIME_COUNT * common.RANKS
    common.differences_kernel[(grouped_work + 127) // 128, 128](
        d_grouped, d_primes, group_count
    )
    expansion_work = raw_count * WIDTH
    quotient.expand_grouped_residues_kernel[
        (expansion_work + 127) // 128, 128
    ](d_grouped, d_inverse, raw_count, WIDTH, d_expanded)
    cuda.synchronize()
    grouped_seconds = time.perf_counter() - grouped_started

    legacy = d_legacy.copy_to_host()
    expanded = d_expanded.copy_to_host()
    assert np.array_equal(legacy, expanded)
    residue_sha = hashlib.sha256(
        legacy.astype("<u4", copy=False).tobytes(order="C")
    ).hexdigest().upper()

    code_count = raw_count * common.RANKS * common.POINTS
    d_legacy_codes = cuda.device_array(code_count, dtype=np.uint8)
    d_expanded_codes = cuda.device_array(code_count, dtype=np.uint8)
    common.classify_coefficients_kernel[(code_count + 127) // 128, 128](
        d_legacy,
        d_primes,
        d_inverses,
        d_modulus,
        d_degrees,
        raw_count,
        d_legacy_codes,
    )
    common.classify_coefficients_kernel[(code_count + 127) // 128, 128](
        d_expanded,
        d_primes,
        d_inverses,
        d_modulus,
        d_degrees,
        raw_count,
        d_expanded_codes,
    )
    d_legacy_first = cuda.device_array(raw_count, dtype=np.uint64)
    d_legacy_second = cuda.device_array(raw_count, dtype=np.uint64)
    d_expanded_first = cuda.device_array(raw_count, dtype=np.uint64)
    d_expanded_second = cuda.device_array(raw_count, dtype=np.uint64)
    center.fingerprint_kernel[(raw_count + 127) // 128, 128](
        d_legacy, raw_count, d_legacy_first, d_legacy_second
    )
    center.fingerprint_kernel[(raw_count + 127) // 128, 128](
        d_expanded, raw_count, d_expanded_first, d_expanded_second
    )
    cuda.synchronize()

    legacy_codes = d_legacy_codes.copy_to_host().reshape(
        raw_count, common.RANKS, common.POINTS
    )
    expanded_codes = d_expanded_codes.copy_to_host().reshape(
        raw_count, common.RANKS, common.POINTS
    )
    assert np.array_equal(legacy_codes, expanded_codes)
    legacy_stats = center.validate_codes(legacy_codes)
    expanded_stats = center.validate_codes(expanded_codes)
    assert legacy_stats == expanded_stats
    legacy_fingerprints = np.empty((raw_count, 2), dtype="<u8")
    expanded_fingerprints = np.empty((raw_count, 2), dtype="<u8")
    legacy_fingerprints[:, 0] = d_legacy_first.copy_to_host()
    legacy_fingerprints[:, 1] = d_legacy_second.copy_to_host()
    expanded_fingerprints[:, 0] = d_expanded_first.copy_to_host()
    expanded_fingerprints[:, 1] = d_expanded_second.copy_to_host()
    assert np.array_equal(legacy_fingerprints, expanded_fingerprints)
    fingerprint = hashlib.sha256(
        legacy_fingerprints.tobytes(order="C")
    ).hexdigest().upper()

    result = {
        "raw_rows": raw_count,
        "quotient_groups": group_count,
        "formula_evaluations_saved": raw_count - group_count,
        "quotient_fraction": group_count / raw_count,
        "static_raw_rows": batch.static_raw_rows,
        "dynamic_raw_rows": batch.dynamic_raw_rows,
        "multiplicity_sum": int(
            batch.group_multiplicities.sum(dtype=np.int64)
        ),
        "maximum_group_multiplicity": int(
            batch.group_multiplicities.max()
        ),
        "raw_to_group_mapping_sha256": batch.mapping_sha256,
        "mode_subdomains": labels,
        "legacy_newton_residues_equal_expanded_group_residues": True,
        "legacy_classifier_codes_equal_expanded_group_codes": True,
        "legacy_classifier_statistics": legacy_stats,
        "legacy_per_raw_row_seeded_fingerprint_equal": True,
        "newton_residue_array_sha256": residue_sha,
        "legacy_compatible_residue_fingerprint_sha256": fingerprint,
        "cpu_quotient_mapping_seconds": quotient_seconds,
        "legacy_gpu_evaluate_and_difference_seconds": legacy_seconds,
        "grouped_gpu_evaluate_difference_and_expand_seconds": grouped_seconds,
        "timing_guard": (
            "Concurrent live GPU audit makes these probe timings diagnostic "
            "only; equivalence hashes, not speed, are evidentiary."
        ),
    }
    assert result["multiplicity_sum"] == raw_count

    del (
        legacy,
        expanded,
        legacy_codes,
        expanded_codes,
        legacy_fingerprints,
        expanded_fingerprints,
        d_raw_rows,
        d_raw_varying,
        d_raw_shifts,
        d_legacy,
        d_group_rows,
        d_group_varying,
        d_group_shifts,
        d_grouped,
        d_expanded,
        d_inverse,
    )
    gc.collect()
    return result


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    batch_mappings = {}
    cuda_checks = {}
    for layout in LAYOUTS:
        selected_batch_start = (
            layout.selected_long_target // BATCH_SIZE
        ) * BATCH_SIZE
        batch_mappings[layout.name] = [
            actual_batch_mapping(layout, 0),
            actual_batch_mapping(layout, selected_batch_start),
        ]
        cuda_checks[layout.name] = cuda_equivalence(layout)
        print(
            "LAYOUT_PASS",
            layout.name,
            cuda_checks[layout.name]["raw_rows"],
            cuda_checks[layout.name]["quotient_groups"],
            cuda_checks[layout.name][
                "legacy_compatible_residue_fingerprint_sha256"
            ],
            flush=True,
        )

    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-opposite-half-quotient-"
            "cuda-fingerprint-probe-agent-v1"
        ),
        "status": (
            "PASS_EXACT_LEGACY_RAW_ORDER_FINGERPRINT_PRESERVING_"
            "OPPOSITE_HALF_QUOTIENT_PROBE_NO_PROOF_CREDIT"
        ),
        "batch_size": BATCH_SIZE,
        "production_batch_mapping_replays": batch_mappings,
        "cuda_equivalence_checks": cuda_checks,
        "checks": {
            "selected_side_coordinates_unchanged": True,
            "opposite_half_orientation_pendant_columns_5_through_9": True,
            "opposite_half_orientation_spine_columns_7_through_11": True,
            "raw_domain_rows_recovered_by_explicit_multiplicity": True,
            "raw_to_group_mapping_digest_per_batch": True,
            "newton_residues_expanded_to_original_raw_order": True,
            "unchanged_legacy_classifier_used_after_expansion": True,
            "unchanged_raw_row_seeded_fingerprint_used_after_expansion": True,
            "all_four_layouts_byte_identical_to_legacy": True,
        },
        "quotient_mapping_arrays_sha256": quotient.load_tables().mapping_arrays_sha256,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Acceleration probe only. It reads no live checkpoint, changes "
            "no existing controller, and gives no orbit or residual-sign "
            "proof credit. A production driver still requires a full-batch "
            "memory/throughput qualification before chain integration."
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
