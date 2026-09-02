#!/usr/bin/env python3
"""Checkpointed production driver for the opposite-half message quotient.

This is an additive, new-version driver.  It preserves every original
750,000-pattern batch boundary, raw count, raw-ray ordinal, classifier total,
and legacy residue fingerprint.  Only formula evaluation is grouped; exact
group results are expanded in bounded memory before raw-ordinal fingerprinting.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np

import benchmark_rank8_cuda_path_center_formula_agent as common
import run_rank8_cuda_opposite_half_message_quotient_chunked_engine_agent as engine
import run_rank8_cuda_opposite_half_message_quotient_driver_agent as quotient
import scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent as center


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "run_rank8_cuda_opposite_half_message_quotient_chunked_engine_agent.py":
        "EF1B9D19E20424564AC51F8CF399612480772581E9F6B07C6B5B78573641E108",
    "run_rank8_cuda_opposite_half_message_quotient_driver_agent.py":
        "F85FA0522D9DF83D344150B90D417E0F5A0DB6BCB46AE1A338C13366B7FBA864",
    "qualify_rank8_delta03_e5_five_cubic_path_opposite_half_quotient_full_batch_agent.py":
        "9369FB908FA85FE73521521B015B6ECF5B0431002E73A15647FB8F9723D56A4E",
    "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_full_batch_qualification_agent_20260825.json":
        "49E6DBCA6E7039E090F8D82D118AB94C4E4CB3F5174E01AA3B1E601D6EE3C3B9",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


@dataclass(frozen=True)
class Config:
    root: Path
    checkpoint: Path
    output: Path
    source: Path
    schema: str
    status: str
    root_orbit: str
    near_states: int
    near_long_value: int
    tail_states: int
    tail_long_value: int
    total_patterns: int
    expected_rays: int
    expected_all_short: int
    expected_finite: int
    expected_order27: int
    batch_size: int
    opposite_start: int
    dependencies: dict[str, str]
    group_capacity: int = 20_000
    member_capacity: int = 40_000


LEGACY_TOTAL_KEYS = (
    "patterns",
    "rays",
    "all_short",
    "finite",
    "order27",
    "gate_failures",
    "bound_failures",
    "negative_classifications",
    "positive_active_coefficients",
    "zero_active_coefficients",
    "zero_degree_overflow_coefficients",
)
QUOTIENT_TOTAL_KEYS = (
    "formula_evaluations",
    "formula_evaluations_saved",
    "static_raw_rows",
    "dynamic_raw_rows",
    "gpu_chunks",
)


def fresh(config: Config) -> dict:
    return {
        "schema": config.schema + "-quotient-checkpoint-v1",
        "dependencies": config.dependencies,
        "driver_immutable_input_hashes": {
            name: sha256(ROOT / name) for name in EXPECTED
        },
        "quotient_mapping_arrays_sha256": (
            quotient.load_tables().mapping_arrays_sha256
        ),
        "batch_size": config.batch_size,
        "opposite_start": config.opposite_start,
        "group_capacity": config.group_capacity,
        "member_capacity": config.member_capacity,
        "cursor": 0,
        "batches": [],
        "totals": {key: 0 for key in LEGACY_TOTAL_KEYS},
        "quotient_totals": {key: 0 for key in QUOTIENT_TOTAL_KEYS},
    }


def load(config: Config) -> dict:
    if not config.checkpoint.exists():
        return fresh(config)
    state = json.loads(config.checkpoint.read_text(encoding="utf-8"))
    expected_fresh = fresh(config)
    for key in (
        "schema",
        "dependencies",
        "driver_immutable_input_hashes",
        "quotient_mapping_arrays_sha256",
        "batch_size",
        "opposite_start",
        "group_capacity",
        "member_capacity",
    ):
        assert state[key] == expected_fresh[key]
    cursor = 0
    replay_totals = {key: 0 for key in LEGACY_TOTAL_KEYS}
    replay_quotient = {key: 0 for key in QUOTIENT_TOTAL_KEYS}
    for batch in state["batches"]:
        assert batch["start"] == cursor and batch["stop"] > cursor
        assert batch["patterns"] == batch["stop"] - batch["start"]
        assert batch["raw_multiplicity_sum"] == batch["rays"]
        assert batch["formula_evaluations"] <= batch["rays"]
        assert batch["formula_evaluations_saved"] == (
            batch["rays"] - batch["formula_evaluations"]
        )
        assert batch["static_raw_rows"] + batch["dynamic_raw_rows"] == batch["rays"]
        assert len(batch["raw_to_group_mapping_sha256"]) == 64
        assert len(batch["residue_fingerprint_sha256"]) == 64
        for key in replay_totals:
            replay_totals[key] += batch[key]
        for key in replay_quotient:
            replay_quotient[key] += batch[key]
        cursor = batch["stop"]
    assert state["cursor"] == cursor
    assert state["totals"] == replay_totals
    assert state["quotient_totals"] == replay_quotient
    return state


def run(
    config: Config,
    evaluate_kernel,
    make_rows: Callable,
    max_batches: int | None = None,
) -> None:
    internal = {name: sha256(ROOT / name) for name in EXPECTED}
    assert internal == EXPECTED
    engine.validate_inputs()
    tables = quotient.load_tables()
    assert config.opposite_start in (5, 7)
    assert config.batch_size == 750_000
    assert config.group_capacity > 0 and config.member_capacity > 0
    halves, half_sums, half_masks = center.half_table()
    assert np.array_equal(halves, tables.halves)
    assert np.array_equal(half_sums, tables.half_sums)
    first_long = np.full(1 << 12, -1, dtype=np.int8)
    for mask in range(1, 1 << 12):
        first_long[mask] = (mask & -mask).bit_length() - 1

    state = load(config)
    if state["cursor"] == config.total_patterns:
        print("ALREADY_COMPLETE", sha256(config.checkpoint))
        return
    completed = 0
    run_started = time.perf_counter()
    while state["cursor"] < config.total_patterns:
        if max_batches is not None and completed >= max_batches:
            break
        start = state["cursor"]
        stop = min(config.total_patterns, start + config.batch_size)
        batch_started = time.perf_counter()
        rows, varying, shifts, all_short, finite, order27 = make_rows(
            config,
            start,
            stop,
            halves,
            half_sums,
            half_masks,
            first_long,
        )
        raw_count = len(rows)
        grouped = quotient.quotient_rows(
            rows, varying, shifts, config.opposite_start
        )
        result = engine.grouped_pass(
            grouped,
            evaluate_kernel,
            group_capacity=config.group_capacity,
            member_capacity=config.member_capacity,
        )
        assert result.raw_rays == raw_count
        assert result.evaluated_rows == grouped.quotient_groups
        stats = result.statistics
        assert stats["gate_failures"] == 0
        assert stats["bound_failures"] == 0
        assert stats["negative_classifications"] == 0
        batch = {
            "start": start,
            "stop": stop,
            "patterns": stop - start,
            "rays": raw_count,
            "all_short": all_short,
            "finite": finite,
            "order27": order27,
            **stats,
            "formula_evaluations": grouped.quotient_groups,
            "formula_evaluations_saved": raw_count - grouped.quotient_groups,
            "static_raw_rows": grouped.static_raw_rows,
            "dynamic_raw_rows": grouped.dynamic_raw_rows,
            "gpu_chunks": result.gpu_chunks,
            "raw_multiplicity_sum": int(
                grouped.group_multiplicities.sum(dtype=np.int64)
            ),
            "maximum_group_multiplicity": int(
                grouped.group_multiplicities.max(initial=0)
            ),
            "raw_to_group_mapping_sha256": grouped.mapping_sha256,
            "residue_fingerprint_sha256": (
                result.residue_fingerprint_sha256
            ),
            "elapsed_seconds": time.perf_counter() - batch_started,
        }
        assert batch["raw_multiplicity_sum"] == raw_count
        state["batches"].append(batch)
        state["cursor"] = stop
        for key in state["totals"]:
            state["totals"][key] += batch[key]
        for key in state["quotient_totals"]:
            state["quotient_totals"][key] += batch[key]
        atomic_json(config.checkpoint, state)
        completed += 1
        if completed == 1 or completed % 5 == 0 or stop == config.total_patterns:
            elapsed = max(time.perf_counter() - run_started, 1e-9)
            print(
                "QUOTIENT_BATCH_PASS",
                len(state["batches"]),
                start,
                stop,
                raw_count,
                grouped.quotient_groups,
                f"{batch['elapsed_seconds']:.3f}",
                "RUN_RAW_RAYS_PER_SECOND",
                f"{sum(row['rays'] for row in state['batches'][-completed:]) / elapsed:.1f}",
                flush=True,
            )
    if state["cursor"] != config.total_patterns:
        print("CHECKPOINTED", state["cursor"], sha256(config.checkpoint))
        return

    totals = state["totals"]
    assert totals["patterns"] == config.total_patterns
    assert totals["rays"] == config.expected_rays
    assert totals["all_short"] == config.expected_all_short
    assert totals["finite"] == config.expected_finite
    assert totals["order27"] == config.expected_order27
    assert totals["gate_failures"] == 0
    assert totals["bound_failures"] == 0
    assert totals["negative_classifications"] == 0
    assert state["quotient_totals"]["formula_evaluations_saved"] == (
        totals["rays"] - state["quotient_totals"]["formula_evaluations"]
    )
    assert (
        state["quotient_totals"]["static_raw_rows"]
        + state["quotient_totals"]["dynamic_raw_rows"]
        == totals["rays"]
    )
    manifest = "".join(
        json.dumps(row, sort_keys=True, separators=(",", ":")) + "\n"
        for row in state["batches"]
    )
    primes = common.primes31()
    _, modulus, _ = common.crt_constants(primes)
    payload = {
        "schema": config.schema + "-quotient-exact-v1",
        "status": config.status,
        "root_orbit": config.root_orbit,
        "totals": totals,
        "quotient_totals": state["quotient_totals"],
        "degree_bounds_by_delta": list(center.DEGREES),
        "crt_prime_count": len(primes),
        "crt_modulus_bits": modulus.bit_length(),
        "batch_manifest_sha256": hashlib.sha256(
            manifest.encode("utf-8")
        ).hexdigest().upper(),
        "checkpoint_sha256": sha256(config.checkpoint),
        "quotient_mapping_arrays_sha256": tables.mapping_arrays_sha256,
        "immutable_input_hashes": config.dependencies,
        "driver_immutable_input_hashes": internal,
        "driver_sha256": sha256(Path(__file__)),
        "source_sha256": sha256(config.source),
        "coverage_guards": {
            "original_pattern_domain_and_batch_boundaries_preserved": True,
            "raw_ray_ordinals_and_legacy_fingerprints_preserved": True,
            "multiplicities_recover_every_raw_ray": True,
            "selected_side_coordinates_never_quotiented": True,
            "original_exhaustive_totals_are_reported": True,
        },
        "scope_guard": (
            "Newton rays only. Canonical opposite-message grouping is a "
            "hash-pinned computational acceleration; no orbit/sign credit. "
            "Finite all-short patterns still require a separate pass."
        ),
    }
    atomic_json(config.output, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(config.output))
