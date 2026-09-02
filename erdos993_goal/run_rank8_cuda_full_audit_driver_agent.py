#!/usr/bin/env python3
"""Reusable full independent CUDA audit driver for eleven-coordinate path orbits."""

from __future__ import annotations

import hashlib
import json
import os
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np


os.environ.setdefault("NUMBA_CUDA_MAX_PENDING_DEALLOCS_COUNT", "1")

import benchmark_rank8_cuda_path_center_formula_agent as common  # noqa: E402
import scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_agent as finite_common  # noqa: E402
import scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent as center  # noqa: E402
from numba import cuda  # noqa: E402


@dataclass(frozen=True)
class Config:
    root: Path
    checkpoint: Path
    output: Path
    source: Path
    schema: str
    status: str
    root_orbit: str
    primary_name: str
    primary_status: str
    tail_states: int
    tail_long_value: int
    total_patterns: int
    expected_rays: int
    expected_all_short: int
    expected_finite: int
    expected_order27: int
    batch_size: int
    dependencies: dict[str, str]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def fresh(config: Config):
    return {
        "schema": config.schema + "-checkpoint-v1",
        "dependencies": config.dependencies,
        "batch_size": config.batch_size,
        "cursor": 0,
        "batches": [],
        "totals": {
            "patterns": 0,
            "rays": 0,
            "all_short": 0,
            "finite": 0,
            "order27": 0,
            "ray_gate_failures": 0,
            "ray_bound_failures": 0,
            "ray_negative_classifications": 0,
            "finite_positive_values": 0,
            "finite_nonpositive_values": 0,
            "finite_bound_failures": 0,
        },
    }


def load(config: Config):
    if not config.checkpoint.exists():
        return fresh(config)
    state = json.loads(config.checkpoint.read_text(encoding="utf-8"))
    assert state["schema"] == config.schema + "-checkpoint-v1"
    assert state["dependencies"] == config.dependencies
    assert state["batch_size"] == config.batch_size
    cursor = 0
    for row in state["batches"]:
        assert row["start"] == cursor and row["stop"] > cursor
        cursor = row["stop"]
    assert state["cursor"] == cursor
    return state


def fingerprint_pair(first, second, count):
    if count == 0:
        return hashlib.sha256(b"").hexdigest().upper()
    body = np.empty((count, 2), dtype="<u8")
    body[:, 0] = first[:count].copy_to_host()
    body[:, 1] = second[:count].copy_to_host()
    return hashlib.sha256(body.tobytes(order="C")).hexdigest().upper()


def run(config: Config, audit_engine, ray_driver, finite_driver, max_batches=None):
    primary = json.loads(
        (config.root / config.primary_name).read_text(encoding="utf-8")
    )
    assert primary["status"] == config.primary_status
    assert primary["root_orbit"] == config.root_orbit
    assert primary["canonical_coordinate_patterns"] == config.total_patterns
    assert primary["n28_plus_newton_rays"] == config.expected_rays
    assert primary["n28_plus_all_short_finite_patterns"] == config.expected_finite
    assert primary["all_short_order27_patterns"] == config.expected_order27
    assert primary["nonpositive_or_bound_failures"] == 0

    halves, half_sums, half_masks = center.half_table()
    first_long = np.full(1 << 11, -1, dtype=np.int8)
    for mask in range(1, 1 << 11):
        first_long[mask] = (mask & -mask).bit_length() - 1
    state = load(config)
    primes = audit_engine.audit_primes31()
    inverses, modulus, modulus_limbs = common.crt_constants(primes)
    d_primes = cuda.to_device(np.asarray(primes, dtype=np.uint32))
    d_inverses = cuda.to_device(np.asarray(inverses, dtype=np.uint32))
    d_modulus = cuda.to_device(np.asarray(modulus_limbs, dtype=np.uint32))
    d_degrees = cuda.to_device(np.asarray(center.DEGREES, dtype=np.uint32))
    d_rows = cuda.device_array((config.batch_size, 11), dtype=np.int32)
    d_varying = cuda.device_array(config.batch_size, dtype=np.int32)
    d_shifts = cuda.device_array(config.batch_size, dtype=np.int32)
    ray_capacity = (
        config.batch_size * common.PRIME_COUNT * common.RANKS * common.POINTS
    )
    d_ray_residues = cuda.device_array(ray_capacity, dtype=np.uint32)
    d_ray_codes = cuda.device_array(
        config.batch_size * common.RANKS * common.POINTS, dtype=np.uint8
    )
    d_ray_first = cuda.device_array(config.batch_size, dtype=np.uint64)
    d_ray_second = cuda.device_array(config.batch_size, dtype=np.uint64)
    finite_capacity = config.batch_size * common.PRIME_COUNT * common.RANKS
    d_finite_residues = cuda.device_array(finite_capacity, dtype=np.uint32)
    d_finite_codes = cuda.device_array(
        config.batch_size * common.RANKS, dtype=np.uint8
    )
    d_finite_first = cuda.device_array(config.batch_size, dtype=np.uint64)
    d_finite_second = cuda.device_array(config.batch_size, dtype=np.uint64)

    warm = np.asarray(
        [[8, 7, 8, 7, 7, 8, 7, 8, 7, 7, config.tail_long_value]],
        dtype=np.int32,
    )
    d_rows[:1].copy_to_device(warm)
    d_varying[:1].copy_to_device(np.asarray([0], dtype=np.int32))
    d_shifts[:1].copy_to_device(np.asarray([0], dtype=np.int32))
    audit_engine.evaluate_rays_kernel[1, 1](
        d_rows[:1], d_varying[:1], d_shifts[:1], d_primes, d_ray_residues
    )
    common.differences_kernel[1, 1](d_ray_residues, d_primes, 1)
    common.classify_coefficients_kernel[1, 1](
        d_ray_residues,
        d_primes,
        d_inverses,
        d_modulus,
        d_degrees,
        1,
        d_ray_codes,
    )
    center.fingerprint_kernel[1, 1](
        d_ray_residues, 1, d_ray_first, d_ray_second
    )
    audit_engine.evaluate_finite_kernel[1, 1](
        d_rows[:1], d_primes, d_finite_residues
    )
    finite_common.classify_finite_kernel[1, 1](
        d_finite_residues,
        d_primes,
        d_inverses,
        d_modulus,
        1,
        d_finite_codes,
    )
    finite_common.finite_fingerprint_kernel[1, 1](
        d_finite_residues, 1, d_finite_first, d_finite_second
    )
    cuda.synchronize()

    completed = 0
    run_started = time.perf_counter()
    while state["cursor"] < config.total_patterns:
        if max_batches is not None and completed >= max_batches:
            break
        start = state["cursor"]
        stop = min(config.total_patterns, start + config.batch_size)
        batch_started = time.perf_counter()
        ray_rows, varying, shifts, all_short, finite_expected, order27 = (
            ray_driver.make_rows(
                config, start, stop, halves, half_sums, half_masks, first_long
            )
        )
        finite_rows, finite_all_short, finite_order27 = finite_driver.make_rows(
            config, start, stop, halves, half_sums, half_masks
        )
        assert finite_all_short == all_short
        assert finite_order27 == order27
        assert len(finite_rows) == finite_expected

        ray_count = len(ray_rows)
        if ray_count:
            d_rows[:ray_count].copy_to_device(ray_rows)
            d_varying[:ray_count].copy_to_device(varying)
            d_shifts[:ray_count].copy_to_device(shifts)
            audit_engine.evaluate_rays_kernel[
                (ray_count * common.POINTS + 63) // 64, 64
            ](
                d_rows[:ray_count],
                d_varying[:ray_count],
                d_shifts[:ray_count],
                d_primes,
                d_ray_residues,
            )
            work = ray_count * common.PRIME_COUNT * common.RANKS
            common.differences_kernel[(work + 127) // 128, 128](
                d_ray_residues, d_primes, ray_count
            )
            code_work = ray_count * common.RANKS * common.POINTS
            common.classify_coefficients_kernel[
                (code_work + 127) // 128, 128
            ](
                d_ray_residues,
                d_primes,
                d_inverses,
                d_modulus,
                d_degrees,
                ray_count,
                d_ray_codes,
            )
            center.fingerprint_kernel[(ray_count + 127) // 128, 128](
                d_ray_residues, ray_count, d_ray_first, d_ray_second
            )
            cuda.synchronize()
            ray_codes = d_ray_codes[:code_work].copy_to_host().reshape(
                ray_count, common.RANKS, common.POINTS
            )
            ray_stats = center.validate_codes(ray_codes)
            ray_fingerprint = fingerprint_pair(
                d_ray_first, d_ray_second, ray_count
            )
        else:
            ray_stats = {
                "gate_failures": 0,
                "bound_failures": 0,
                "negative_classifications": 0,
                "positive_active_coefficients": 0,
                "zero_active_coefficients": 0,
                "zero_degree_overflow_coefficients": 0,
            }
            ray_fingerprint = hashlib.sha256(b"").hexdigest().upper()
        assert ray_stats["gate_failures"] == 0
        assert ray_stats["bound_failures"] == 0
        assert ray_stats["negative_classifications"] == 0

        finite_count = len(finite_rows)
        if finite_count:
            d_rows[:finite_count].copy_to_device(finite_rows)
            audit_engine.evaluate_finite_kernel[
                (finite_count + 63) // 64, 64
            ](d_rows[:finite_count], d_primes, d_finite_residues)
            finite_common.classify_finite_kernel[
                (finite_count * common.RANKS + 127) // 128, 128
            ](
                d_finite_residues,
                d_primes,
                d_inverses,
                d_modulus,
                finite_count,
                d_finite_codes,
            )
            finite_common.finite_fingerprint_kernel[
                (finite_count + 127) // 128, 128
            ](
                d_finite_residues,
                finite_count,
                d_finite_first,
                d_finite_second,
            )
            cuda.synchronize()
            finite_codes = d_finite_codes[
                :finite_count * common.RANKS
            ].copy_to_host()
            finite_nonpositive = int(np.count_nonzero(finite_codes != 0))
            finite_bounds = int(np.count_nonzero(finite_codes == 3))
            finite_fingerprint = fingerprint_pair(
                d_finite_first, d_finite_second, finite_count
            )
        else:
            finite_nonpositive = 0
            finite_bounds = 0
            finite_fingerprint = hashlib.sha256(b"").hexdigest().upper()
        assert finite_nonpositive == 0
        assert finite_bounds == 0

        batch = {
            "start": start,
            "stop": stop,
            "patterns": stop - start,
            "rays": ray_count,
            "all_short": all_short,
            "finite": finite_count,
            "order27": order27,
            "ray_gate_failures": ray_stats["gate_failures"],
            "ray_bound_failures": ray_stats["bound_failures"],
            "ray_negative_classifications": ray_stats[
                "negative_classifications"
            ],
            "finite_positive_values": finite_count * common.RANKS,
            "finite_nonpositive_values": finite_nonpositive,
            "finite_bound_failures": finite_bounds,
            "ray_residue_fingerprint_sha256": ray_fingerprint,
            "finite_residue_fingerprint_sha256": finite_fingerprint,
            "elapsed_seconds": time.perf_counter() - batch_started,
        }
        state["batches"].append(batch)
        state["cursor"] = stop
        for key in state["totals"]:
            state["totals"][key] += batch[key]
        atomic_json(config.checkpoint, state)
        completed += 1
        if completed == 1 or completed % 5 == 0 or stop == config.total_patterns:
            print(
                "AUDIT_BATCH_PASS",
                len(state["batches"]),
                start,
                stop,
                ray_count,
                finite_count,
                f"{batch['elapsed_seconds']:.3f}",
                "RUN_RAYS_PER_SECOND",
                f"{state['totals']['rays'] / max(time.perf_counter() - run_started, 1e-9):.1f}",
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
    assert totals["ray_gate_failures"] == 0
    assert totals["ray_bound_failures"] == 0
    assert totals["ray_negative_classifications"] == 0
    assert totals["finite_positive_values"] == 4 * config.expected_finite
    assert totals["finite_nonpositive_values"] == 0
    assert totals["finite_bound_failures"] == 0
    manifest = "".join(
        json.dumps(row, sort_keys=True, separators=(",", ":")) + "\n"
        for row in state["batches"]
    )
    payload = {
        "schema": config.schema + "-exact-v1",
        "status": config.status,
        "root_orbit": config.root_orbit,
        "method": (
            "Separately transcribed path-message engine, disjoint nine-prime "
            "CRT basis, exhaustive canonical ray and finite enumeration."
        ),
        "totals": totals,
        "crt_prime_count": len(primes),
        "crt_modulus_bits": modulus.bit_length(),
        "batch_manifest_sha256": hashlib.sha256(
            manifest.encode("utf-8")
        ).hexdigest().upper(),
        "checkpoint_sha256": sha256(config.checkpoint),
        "immutable_input_hashes": config.dependencies,
        "driver_sha256": sha256(Path(__file__)),
        "source_sha256": sha256(config.source),
        "scope_guard": "Independent full audit of one root orbit only.",
    }
    atomic_json(config.output, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(config.output))
