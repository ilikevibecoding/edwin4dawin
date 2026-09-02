#!/usr/bin/env python3
"""Checkpointed exhaustive CUDA scan of path:center_branch Newton rays.

The canonical domain is the unordered pair of 12,544 five-coordinate path
halves times the seven center-pendant states.  All patterns containing at
least one long state are evaluated at 29 exact points.  Nine 31-bit residues
recover every signed coefficient within the checked-i256 bound, after which
the full Delta_0..Delta_3 Newton gate is enforced fail-closed.

This scanner covers rays only.  The all-short finite part is scanned by a
separate engine and neither report receives orbit-closure credit alone.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import time
from pathlib import Path

import numpy as np


os.environ.setdefault("NUMBA_CUDA_MAX_PENDING_DEALLOCS_COUNT", "1")

import benchmark_rank8_cuda_path_center_formula_agent as engine  # noqa: E402
from numba import cuda, uint64  # noqa: E402


ROOT = Path(__file__).resolve().parent
CHECKPOINT = ROOT / "rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_checkpoint_agent_20260825.json"
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_exact_agent_20260825.json"
EXPECTED = {
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "certify_rank8_delta03_e5_five_cubic_path_center_branch_newton_reduction_agent.py":
        "E966426A32A4648AC1164C0BA92342B8CB3D6B5C52E2AFED8CA021382685C37F",
    "rank8_delta03_e5_five_cubic_path_center_branch_newton_reduction_exact_agent_20260825.json":
        "01AD31A3D91E6FE8AA2A3F467AD7C3EA9C0E7BD0AF2BA7B31884B92DEBAE00BF",
}
HALVES = 12_544
TOTAL_PATTERNS = 550_775_680
EXPECTED_RAYS = 436_402_330
EXPECTED_ALL_SHORT = 114_373_350
EXPECTED_FINITE = 113_140_669
EXPECTED_ORDER27 = 467_085
DEFAULT_BATCH = 750_000
DEGREES = (28, 28, 27, 26)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def half_table():
    rows = []
    for outer_low in range(1, 8):
        for outer_high in range(outer_low, 8):
            for middle_outer in range(1, 9):
                for middle_pendant in range(1, 8):
                    for center_middle in range(1, 9):
                        rows.append((
                            center_middle,
                            middle_pendant,
                            middle_outer,
                            outer_low,
                            outer_high,
                        ))
    table = np.asarray(rows, dtype=np.int32)
    assert table.shape == (HALVES, 5)
    masks = (
        (table[:, 0] == 8).astype(np.uint16)
        | ((table[:, 1] == 7).astype(np.uint16) << 1)
        | ((table[:, 2] == 8).astype(np.uint16) << 2)
        | ((table[:, 3] == 7).astype(np.uint16) << 3)
        | ((table[:, 4] == 7).astype(np.uint16) << 4)
    )
    return table, table.sum(axis=1, dtype=np.int32), masks


def decode_batch(start: int, stop: int):
    patterns = np.arange(start, stop, dtype=np.int64)
    pairs = patterns // 7
    center = (patterns % 7 + 1).astype(np.int32)
    diagonal = 2 * HALVES + 1
    discriminant = diagonal * diagonal - 8 * pairs
    left = np.floor((diagonal - np.sqrt(discriminant.astype(np.float64))) / 2).astype(np.int64)
    starts = left * (2 * HALVES - left + 1) // 2
    too_high = pairs < starts
    if np.any(too_high):
        left[too_high] -= 1
        starts = left * (2 * HALVES - left + 1) // 2
    next_starts = (left + 1) * (2 * HALVES - left) // 2
    too_low = pairs >= next_starts
    if np.any(too_low):
        left[too_low] += 1
        starts = left * (2 * HALVES - left + 1) // 2
    right = left + pairs - starts
    assert np.all(left >= 0) and np.all(left < HALVES)
    assert np.all(right >= left) and np.all(right < HALVES)
    return left.astype(np.int32), right.astype(np.int32), center


def batch_rows(start, stop, halves, half_sums, half_masks, first_long):
    left, right, center = decode_batch(start, stop)
    masks = (
        half_masks[left]
        | (half_masks[right] << np.uint16(5))
        | ((center == 7).astype(np.uint16) << np.uint16(10))
    )
    ray_selector = masks != 0
    all_short = int(np.count_nonzero(~ray_selector))
    orders = 1 + half_sums[left] + half_sums[right] + center
    finite = int(np.count_nonzero((~ray_selector) & (orders >= 28)))
    order27 = int(np.count_nonzero((~ray_selector) & (orders == 27)))
    ray_left = left[ray_selector]
    ray_right = right[ray_selector]
    ray_center = center[ray_selector]
    ray_masks = masks[ray_selector]
    rows = np.empty((len(ray_left), 11), dtype=np.int32)
    rows[:, :5] = halves[ray_left]
    rows[:, 5:10] = halves[ray_right]
    rows[:, 10] = ray_center
    varying = first_long[ray_masks].astype(np.int32)
    shifts = np.maximum(0, 28 - (1 + rows.sum(axis=1, dtype=np.int32))).astype(np.int32)
    assert np.all(varying >= 0) and np.all(varying < 11)
    return rows, varying, shifts, all_short, finite, order27


@cuda.jit
def fingerprint_kernel(residues, ray_count, first, second):
    ray = cuda.grid(1)
    if ray >= ray_count:
        return
    h1 = uint64(0xCBF29CE484222325) ^ uint64(ray)
    h2 = uint64(0x9E3779B97F4A7C15) + uint64(ray)
    base = ray * engine.PRIME_COUNT * engine.RANKS * engine.POINTS
    width = engine.PRIME_COUNT * engine.RANKS * engine.POINTS
    for index in range(width):
        value = uint64(residues[base + index])
        h1 = (h1 ^ value) * uint64(0x100000001B3)
        h2 ^= value + uint64(0x9E3779B97F4A7C15) + (h2 << uint64(6)) + (h2 >> uint64(2))
    first[ray] = h1
    second[ray] = h2


def validate_codes(codes: np.ndarray):
    failures = 0
    positive = 0
    active_zero = 0
    degree_zero = 0
    bound_failures = int(np.count_nonzero(codes == 3))
    negative = int(np.count_nonzero(codes == 2))
    for rank, degree in enumerate(DEGREES):
        first = codes[:, rank, :2]
        active = codes[:, rank, 2: degree + 1]
        trailing = codes[:, rank, degree + 1:]
        failures += int(np.count_nonzero(first != 0))
        failures += int(np.count_nonzero((active != 0) & (active != 1)))
        failures += int(np.count_nonzero(trailing != 1))
        positive += int(np.count_nonzero(first == 0)) + int(np.count_nonzero(active == 0))
        active_zero += int(np.count_nonzero(active == 1))
        degree_zero += int(np.count_nonzero(trailing == 1))
    return {
        "gate_failures": failures,
        "bound_failures": bound_failures,
        "negative_classifications": negative,
        "positive_active_coefficients": positive,
        "zero_active_coefficients": active_zero,
        "zero_degree_overflow_coefficients": degree_zero,
    }


def fresh_checkpoint(batch_size: int, dependencies: dict):
    return {
        "schema": "rank8-delta03-e5-five-cubic-path-center-branch-cuda-rays-checkpoint-agent-v1",
        "dependencies": dependencies,
        "batch_size": batch_size,
        "cursor": 0,
        "batches": [],
        "totals": {
            "patterns": 0,
            "rays": 0,
            "all_short": 0,
            "finite": 0,
            "order27": 0,
            "gate_failures": 0,
            "bound_failures": 0,
            "negative_classifications": 0,
            "positive_active_coefficients": 0,
            "zero_active_coefficients": 0,
            "zero_degree_overflow_coefficients": 0,
        },
    }


def load_checkpoint(batch_size: int, dependencies: dict):
    if not CHECKPOINT.exists():
        return fresh_checkpoint(batch_size, dependencies)
    checkpoint = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    assert checkpoint["schema"] == "rank8-delta03-e5-five-cubic-path-center-branch-cuda-rays-checkpoint-agent-v1"
    assert checkpoint["dependencies"] == dependencies
    assert checkpoint["batch_size"] == batch_size
    cursor = 0
    for batch in checkpoint["batches"]:
        assert batch["start"] == cursor and batch["stop"] > cursor
        cursor = batch["stop"]
    assert checkpoint["cursor"] == cursor
    return checkpoint


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH)
    parser.add_argument("--max-batches", type=int)
    args = parser.parse_args()
    assert 1 <= args.batch_size <= DEFAULT_BATCH
    dependencies = {name: sha256(ROOT / name) for name in EXPECTED}
    assert dependencies == EXPECTED
    reduction = json.loads(
        (ROOT / "rank8_delta03_e5_five_cubic_path_center_branch_newton_reduction_exact_agent_20260825.json")
        .read_text(encoding="utf-8")
    )
    assert reduction["status"] == "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_CENTER_BRANCH_TRANSFER_NEWTON_REDUCTION"
    assert reduction["quotient_counts"]["total"] == TOTAL_PATTERNS
    assert reduction["quotient_counts"]["rays"] == EXPECTED_RAYS
    halves, half_sums, half_masks = half_table()
    first_long = np.full(1 << 11, -1, dtype=np.int8)
    for mask in range(1, 1 << 11):
        first_long[mask] = (mask & -mask).bit_length() - 1
    checkpoint = load_checkpoint(args.batch_size, dependencies)
    start_cursor = checkpoint["cursor"]
    if start_cursor == TOTAL_PATTERNS:
        print("ALREADY_COMPLETE", sha256(CHECKPOINT))
        return

    primes = engine.primes31()
    inverses, modulus, modulus_limbs = engine.crt_constants(primes)
    assert modulus.bit_length() == 279
    assert math_comb_bound() < 2**64
    capacity = args.batch_size
    d_rows = cuda.device_array((capacity, 11), dtype=np.int32)
    d_varying = cuda.device_array(capacity, dtype=np.int32)
    d_shifts = cuda.device_array(capacity, dtype=np.int32)
    d_primes = cuda.to_device(np.asarray(primes, dtype=np.uint32))
    d_inverses = cuda.to_device(np.asarray(inverses, dtype=np.uint32))
    d_modulus = cuda.to_device(np.asarray(modulus_limbs, dtype=np.uint32))
    d_degrees = cuda.to_device(np.asarray(DEGREES, dtype=np.uint32))
    residue_capacity = capacity * engine.PRIME_COUNT * engine.RANKS * engine.POINTS
    d_residues = cuda.device_array(residue_capacity, dtype=np.uint32)
    code_capacity = capacity * engine.RANKS * engine.POINTS
    d_codes = cuda.device_array(code_capacity, dtype=np.uint8)
    d_first = cuda.device_array(capacity, dtype=np.uint64)
    d_second = cuda.device_array(capacity, dtype=np.uint64)

    # Compile every kernel before measured batches.
    warm_rows = np.asarray([[8, 7, 8, 7, 7, 8, 7, 8, 7, 7, 7]], dtype=np.int32)
    d_rows[:1].copy_to_device(warm_rows)
    d_varying[:1].copy_to_device(np.asarray([0], dtype=np.int32))
    d_shifts[:1].copy_to_device(np.asarray([0], dtype=np.int32))
    engine.evaluate_kernel[1, 1](d_rows[:1], d_varying[:1], d_shifts[:1], d_primes, d_residues)
    engine.differences_kernel[1, 1](d_residues, d_primes, 1)
    engine.classify_coefficients_kernel[1, 1](
        d_residues, d_primes, d_inverses, d_modulus, d_degrees, 1, d_codes
    )
    fingerprint_kernel[1, 1](d_residues, 1, d_first, d_second)
    cuda.synchronize()

    run_started = time.perf_counter()
    completed_this_run = 0
    while checkpoint["cursor"] < TOTAL_PATTERNS:
        if args.max_batches is not None and completed_this_run >= args.max_batches:
            break
        start = checkpoint["cursor"]
        stop = min(TOTAL_PATTERNS, start + args.batch_size)
        batch_started = time.perf_counter()
        rows, varying, shifts, all_short, finite, order27 = batch_rows(
            start, stop, halves, half_sums, half_masks, first_long
        )
        ray_count = len(rows)
        assert ray_count <= capacity
        d_rows[:ray_count].copy_to_device(rows)
        d_varying[:ray_count].copy_to_device(varying)
        d_shifts[:ray_count].copy_to_device(shifts)
        evaluation_threads = 64
        evaluation_blocks = (ray_count * engine.POINTS + evaluation_threads - 1) // evaluation_threads
        engine.evaluate_kernel[evaluation_blocks, evaluation_threads](
            d_rows[:ray_count], d_varying[:ray_count], d_shifts[:ray_count], d_primes, d_residues
        )
        difference_threads = 128
        difference_work = ray_count * engine.PRIME_COUNT * engine.RANKS
        engine.differences_kernel[
            (difference_work + difference_threads - 1) // difference_threads,
            difference_threads,
        ](d_residues, d_primes, ray_count)
        classification_threads = 128
        classification_work = ray_count * engine.RANKS * engine.POINTS
        engine.classify_coefficients_kernel[
            (classification_work + classification_threads - 1) // classification_threads,
            classification_threads,
        ](d_residues, d_primes, d_inverses, d_modulus, d_degrees, ray_count, d_codes)
        fingerprint_threads = 128
        fingerprint_kernel[
            (ray_count + fingerprint_threads - 1) // fingerprint_threads,
            fingerprint_threads,
        ](d_residues, ray_count, d_first, d_second)
        cuda.synchronize()
        codes = d_codes[:classification_work].copy_to_host().reshape(ray_count, engine.RANKS, engine.POINTS)
        stats = validate_codes(codes)
        assert stats["gate_failures"] == 0
        assert stats["bound_failures"] == 0
        assert stats["negative_classifications"] == 0
        fingerprints = np.empty((ray_count, 2), dtype="<u8")
        fingerprints[:, 0] = d_first[:ray_count].copy_to_host()
        fingerprints[:, 1] = d_second[:ray_count].copy_to_host()
        fingerprint_sha = hashlib.sha256(fingerprints.tobytes(order="C")).hexdigest().upper()
        elapsed = time.perf_counter() - batch_started
        batch = {
            "start": start,
            "stop": stop,
            "patterns": stop - start,
            "rays": ray_count,
            "all_short": all_short,
            "finite": finite,
            "order27": order27,
            **stats,
            "residue_fingerprint_sha256": fingerprint_sha,
            "elapsed_seconds": elapsed,
        }
        checkpoint["batches"].append(batch)
        checkpoint["cursor"] = stop
        for key in checkpoint["totals"]:
            if key in batch:
                checkpoint["totals"][key] += batch[key]
        atomic_json(CHECKPOINT, checkpoint)
        completed_this_run += 1
        if completed_this_run == 1 or completed_this_run % 5 == 0 or stop == TOTAL_PATTERNS:
            wall = time.perf_counter() - run_started
            print(
                "BATCH_PASS", len(checkpoint["batches"]), start, stop,
                ray_count, f"{elapsed:.3f}",
                "RUN_RAYS_PER_SECOND", f"{(checkpoint['totals']['rays'] / max(wall, 1e-9)):.1f}",
                flush=True,
            )

    if checkpoint["cursor"] != TOTAL_PATTERNS:
        print("CHECKPOINTED", checkpoint["cursor"], sha256(CHECKPOINT))
        return
    totals = checkpoint["totals"]
    assert totals["patterns"] == TOTAL_PATTERNS
    assert totals["rays"] == EXPECTED_RAYS
    assert totals["all_short"] == EXPECTED_ALL_SHORT
    assert totals["finite"] == EXPECTED_FINITE
    assert totals["order27"] == EXPECTED_ORDER27
    assert totals["gate_failures"] == 0
    assert totals["bound_failures"] == 0
    assert totals["negative_classifications"] == 0
    batch_body = "".join(
        json.dumps(batch, sort_keys=True, separators=(",", ":")) + "\n"
        for batch in checkpoint["batches"]
    )
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-path-center-branch-cuda-rays-exact-agent-v1",
        "status": "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_CENTER_BRANCH_RAYS",
        "root_orbit": "five_cubic_path:center_branch",
        "domain": "all canonical mixed and all-long Newton rays",
        "batch_size": args.batch_size,
        "batches": len(checkpoint["batches"]),
        "totals": totals,
        "degree_bounds_by_delta": list(DEGREES),
        "crt_prime_count": len(primes),
        "crt_modulus_bits": modulus.bit_length(),
        "coefficient_bound": "signed magnitude strictly below 2^255 or fail closed",
        "batch_manifest_sha256": hashlib.sha256(batch_body.encode("utf-8")).hexdigest().upper(),
        "checkpoint_sha256": sha256(CHECKPOINT),
        "immutable_input_hashes": dependencies,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Rays only; all-short finite patterns require the separate finite report.",
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


def math_comb_bound() -> int:
    # Every intermediate nonnegative rank-k count is at most C(110,k).
    import math
    return max(math.comb(110, rank) for rank in range(9))


if __name__ == "__main__":
    main()
