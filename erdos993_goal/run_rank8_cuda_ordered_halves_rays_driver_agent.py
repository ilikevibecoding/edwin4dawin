#!/usr/bin/env python3
"""Checkpointed driver for ordered-half CUDA Newton ray scans."""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import numpy as np

import benchmark_rank8_cuda_path_center_formula_agent as common
import run_rank8_cuda_unordered_halves_rays_driver_agent as shared
import scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent as center
from numba import cuda


Config = shared.Config
sha256 = shared.sha256
atomic_json = shared.atomic_json
fresh = shared.fresh
load = shared.load


def decode(start: int, stop: int, tail_states: int):
    patterns = np.arange(start, stop, dtype=np.int64)
    pairs = patterns // tail_states
    tail = (patterns % tail_states + 1).astype(np.int32)
    left = pairs // center.HALVES
    right = pairs - left * center.HALVES
    assert np.all(left >= 0) and np.all(left < center.HALVES)
    assert np.all(right >= 0) and np.all(right < center.HALVES)
    return left.astype(np.int32), right.astype(np.int32), tail


def make_rows(config: Config, start, stop, halves, half_sums, half_masks, first_long):
    left, right, tail = decode(start, stop, config.tail_states)
    masks = (
        half_masks[left]
        | (half_masks[right] << np.uint16(5))
        | ((tail == config.tail_long_value).astype(np.uint16) << np.uint16(10))
    )
    selector = masks != 0
    orders = 1 + half_sums[left] + half_sums[right] + tail
    all_short = int(np.count_nonzero(~selector))
    finite = int(np.count_nonzero((~selector) & (orders >= 28)))
    order27 = int(np.count_nonzero((~selector) & (orders == 27)))
    ray_left = left[selector]
    ray_right = right[selector]
    rows = np.empty((len(ray_left), 11), dtype=np.int32)
    rows[:, :5] = halves[ray_left]
    rows[:, 5:10] = halves[ray_right]
    rows[:, 10] = tail[selector]
    ray_masks = masks[selector]
    varying = first_long[ray_masks].astype(np.int32)
    shifts = np.maximum(0, 28 - (1 + rows.sum(axis=1, dtype=np.int32))).astype(
        np.int32
    )
    return rows, varying, shifts, all_short, finite, order27


def run(config: Config, evaluate_kernel, max_batches: int | None = None):
    halves, half_sums, half_masks = center.half_table()
    first_long = np.full(1 << 11, -1, dtype=np.int8)
    for mask in range(1, 1 << 11):
        first_long[mask] = (mask & -mask).bit_length() - 1
    state = load(config)
    if state["cursor"] == config.total_patterns:
        print("ALREADY_COMPLETE", sha256(config.checkpoint))
        return
    primes = common.primes31()
    inverses, modulus, modulus_limbs = common.crt_constants(primes)
    d_primes = cuda.to_device(np.asarray(primes, dtype=np.uint32))
    d_inverses = cuda.to_device(np.asarray(inverses, dtype=np.uint32))
    d_modulus = cuda.to_device(np.asarray(modulus_limbs, dtype=np.uint32))
    d_degrees = cuda.to_device(np.asarray(center.DEGREES, dtype=np.uint32))
    d_rows = cuda.device_array((config.batch_size, 11), dtype=np.int32)
    d_varying = cuda.device_array(config.batch_size, dtype=np.int32)
    d_shifts = cuda.device_array(config.batch_size, dtype=np.int32)
    residue_capacity = (
        config.batch_size * common.PRIME_COUNT * common.RANKS * common.POINTS
    )
    d_residues = cuda.device_array(residue_capacity, dtype=np.uint32)
    d_codes = cuda.device_array(
        config.batch_size * common.RANKS * common.POINTS, dtype=np.uint8
    )
    d_first = cuda.device_array(config.batch_size, dtype=np.uint64)
    d_second = cuda.device_array(config.batch_size, dtype=np.uint64)
    warm = np.asarray(
        [[8, 7, 8, 7, 7, 8, 7, 8, 7, 7, config.tail_long_value]],
        dtype=np.int32,
    )
    d_rows[:1].copy_to_device(warm)
    d_varying[:1].copy_to_device(np.asarray([0], dtype=np.int32))
    d_shifts[:1].copy_to_device(np.asarray([0], dtype=np.int32))
    evaluate_kernel[1, 1](
        d_rows[:1], d_varying[:1], d_shifts[:1], d_primes, d_residues
    )
    common.differences_kernel[1, 1](d_residues, d_primes, 1)
    common.classify_coefficients_kernel[1, 1](
        d_residues, d_primes, d_inverses, d_modulus, d_degrees, 1, d_codes
    )
    center.fingerprint_kernel[1, 1](d_residues, 1, d_first, d_second)
    cuda.synchronize()
    completed = 0
    run_started = time.perf_counter()
    while state["cursor"] < config.total_patterns:
        if max_batches is not None and completed >= max_batches:
            break
        start = state["cursor"]
        stop = min(config.total_patterns, start + config.batch_size)
        batch_started = time.perf_counter()
        rows, varying, shifts, all_short, finite, order27 = make_rows(
            config, start, stop, halves, half_sums, half_masks, first_long
        )
        count = len(rows)
        if count:
            d_rows[:count].copy_to_device(rows)
            d_varying[:count].copy_to_device(varying)
            d_shifts[:count].copy_to_device(shifts)
            evaluate_kernel[(count * common.POINTS + 63) // 64, 64](
                d_rows[:count],
                d_varying[:count],
                d_shifts[:count],
                d_primes,
                d_residues,
            )
            work = count * common.PRIME_COUNT * common.RANKS
            common.differences_kernel[(work + 127) // 128, 128](
                d_residues, d_primes, count
            )
            code_work = count * common.RANKS * common.POINTS
            common.classify_coefficients_kernel[(code_work + 127) // 128, 128](
                d_residues,
                d_primes,
                d_inverses,
                d_modulus,
                d_degrees,
                count,
                d_codes,
            )
            center.fingerprint_kernel[(count + 127) // 128, 128](
                d_residues, count, d_first, d_second
            )
            cuda.synchronize()
            codes = d_codes[:code_work].copy_to_host().reshape(
                count, common.RANKS, common.POINTS
            )
            stats = center.validate_codes(codes)
            fingerprints = np.empty((count, 2), dtype="<u8")
            fingerprints[:, 0] = d_first[:count].copy_to_host()
            fingerprints[:, 1] = d_second[:count].copy_to_host()
            fingerprint = hashlib.sha256(
                fingerprints.tobytes(order="C")
            ).hexdigest().upper()
        else:
            stats = {
                "gate_failures": 0,
                "bound_failures": 0,
                "negative_classifications": 0,
                "positive_active_coefficients": 0,
                "zero_active_coefficients": 0,
                "zero_degree_overflow_coefficients": 0,
            }
            fingerprint = hashlib.sha256(b"").hexdigest().upper()
        assert stats["gate_failures"] == 0
        assert stats["bound_failures"] == 0
        assert stats["negative_classifications"] == 0
        batch = {
            "start": start,
            "stop": stop,
            "patterns": stop - start,
            "rays": count,
            "all_short": all_short,
            "finite": finite,
            "order27": order27,
            **stats,
            "residue_fingerprint_sha256": fingerprint,
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
                "BATCH_PASS",
                len(state["batches"]),
                start,
                stop,
                count,
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
    assert totals["gate_failures"] == 0
    assert totals["bound_failures"] == 0
    assert totals["negative_classifications"] == 0
    manifest = "".join(
        json.dumps(row, sort_keys=True, separators=(",", ":")) + "\n"
        for row in state["batches"]
    )
    payload = {
        "schema": config.schema + "-exact-v1",
        "status": config.status,
        "root_orbit": config.root_orbit,
        "totals": totals,
        "degree_bounds_by_delta": list(center.DEGREES),
        "crt_prime_count": len(primes),
        "crt_modulus_bits": modulus.bit_length(),
        "batch_manifest_sha256": hashlib.sha256(
            manifest.encode("utf-8")
        ).hexdigest().upper(),
        "checkpoint_sha256": sha256(config.checkpoint),
        "immutable_input_hashes": config.dependencies,
        "driver_sha256": sha256(Path(__file__)),
        "source_sha256": sha256(config.source),
        "scope_guard": "Newton rays only; finite all-short patterns require a separate pass.",
    }
    atomic_json(config.output, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(config.output))
