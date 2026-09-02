#!/usr/bin/env python3
"""Read-only diagnostic for the fail-closed center-pendant CUDA ray batch.

This script does not touch the production checkpoint.  It replays the first
uncommitted production batch in small chunks, locates every non-PASS CRT sign
classification, reconstructs the signed Newton coefficient, and checks the
first witness through the literal CPU tree implementation.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from numba import cuda

import benchmark_rank8_cuda_path_center_formula_agent as common
import benchmark_rank8_cuda_path_center_pendant_internal_formula_agent as formula
import run_rank8_cuda_unordered_halves_internal_rays_driver_agent as driver
import scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent as center
from probe_rank8_delta03_e5_five_cubic_path_internal_root_shape_agent import (
    deltas03 as literal_deltas,
    five_cubic_path,
    forest_poly,
)


ROOT = Path(__file__).resolve().parent
CHECKPOINT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_center_pendant_internal_"
    "cuda_rays_checkpoint_agent_20260825.json"
)
CHUNK_PATTERNS = 25_000


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def signed_crt(residues: list[int], primes: list[int]) -> int:
    value = residues[0]
    modulus = primes[0]
    for residue, prime in zip(residues[1:], primes[1:]):
        factor = ((residue - value) % prime) * pow(modulus % prime, -1, prime)
        value += modulus * (factor % prime)
        modulus *= prime
    return value if value <= modulus // 2 else value - modulus


def literal_newton(row: list[int], varying: int, shift: int) -> list[list[int]]:
    samples = [[] for _ in range(common.RANKS)]
    for point in range(common.POINTS):
        lengths = list(row)
        lengths[varying] += shift + point
        center_pendant = lengths[10] + 1 + lengths[11]
        adjacency, paths = five_cubic_path(center_pendant, tuple(lengths[:10]))
        root = paths["center_pendant"][lengths[10] + 1]
        whole = forest_poly(adjacency)
        deleted = forest_poly(adjacency, frozenset({root}))
        values = literal_deltas(whole, deleted)
        for rank in range(common.RANKS):
            samples[rank].append(int(values[rank]))
    coefficients: list[list[int]] = []
    for rank_samples in samples:
        work = rank_samples[:]
        row_coefficients = []
        while work:
            row_coefficients.append(work[0])
            work = [right - left for left, right in zip(work, work[1:])]
        coefficients.append(row_coefficients)
    return coefficients


def main() -> None:
    checkpoint = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    start = int(checkpoint["cursor"])
    stop = start + int(checkpoint["batch_size"])
    output = ROOT / (
        "rank8_delta03_e5_five_cubic_path_center_pendant_internal_"
        f"cuda_negative_diagnostic_{start}_{stop}_agent_20260825.json"
    )
    halves, half_sums, half_masks = center.half_table()
    first_long = np.full(1 << 12, -1, dtype=np.int8)
    for mask in range(1, 1 << 12):
        first_long[mask] = (mask & -mask).bit_length() - 1

    primes = common.primes31()
    inverses, modulus, modulus_limbs = common.crt_constants(primes)
    d_primes = cuda.to_device(np.asarray(primes, dtype=np.uint32))
    d_inverses = cuda.to_device(np.asarray(inverses, dtype=np.uint32))
    d_modulus = cuda.to_device(np.asarray(modulus_limbs, dtype=np.uint32))
    d_degrees = cuda.to_device(np.asarray(center.DEGREES, dtype=np.uint32))

    capacity = CHUNK_PATTERNS
    d_rows = cuda.device_array((capacity, 12), dtype=np.int32)
    d_varying = cuda.device_array(capacity, dtype=np.int32)
    d_shifts = cuda.device_array(capacity, dtype=np.int32)
    d_residues = cuda.device_array(
        capacity * common.PRIME_COUNT * common.RANKS * common.POINTS,
        dtype=np.uint32,
    )
    d_codes = cuda.device_array(
        capacity * common.RANKS * common.POINTS, dtype=np.uint8
    )

    witnesses = []
    chunks = []
    cursor = start
    while cursor < stop:
        chunk_stop = min(stop, cursor + CHUNK_PATTERNS)
        left, right, near, tail = driver.decode(
            cursor, chunk_stop, near_states=8, tail_states=7
        )
        masks = (
            half_masks[left]
            | (half_masks[right] << np.uint16(5))
            | ((near == 7).astype(np.uint16) << np.uint16(10))
            | ((tail == 7).astype(np.uint16) << np.uint16(11))
        )
        selector = masks != 0
        pattern_indices = np.arange(cursor, chunk_stop, dtype=np.int64)[selector]
        rows = np.empty((int(np.count_nonzero(selector)), 12), dtype=np.int32)
        rows[:, :5] = halves[left[selector]]
        rows[:, 5:10] = halves[right[selector]]
        rows[:, 10] = near[selector]
        rows[:, 11] = tail[selector]
        ray_masks = masks[selector]
        varying = first_long[ray_masks].astype(np.int32)
        shifts = np.maximum(0, 28 - (2 + rows.sum(axis=1, dtype=np.int32))).astype(
            np.int32
        )
        count = len(rows)
        if count:
            d_rows[:count].copy_to_device(rows)
            d_varying[:count].copy_to_device(varying)
            d_shifts[:count].copy_to_device(shifts)
            formula.evaluate_kernel[(count * common.POINTS + 63) // 64, 64](
                d_rows[:count],
                d_varying[:count],
                d_shifts[:count],
                d_primes,
                d_residues,
            )
            common.differences_kernel[
                (count * common.PRIME_COUNT * common.RANKS + 127) // 128, 128
            ](d_residues, d_primes, count)
            common.classify_coefficients_kernel[
                (count * common.RANKS * common.POINTS + 127) // 128, 128
            ](
                d_residues,
                d_primes,
                d_inverses,
                d_modulus,
                d_degrees,
                count,
                d_codes,
            )
            cuda.synchronize()
            codes = d_codes[: count * common.RANKS * common.POINTS].copy_to_host()
            codes = codes.reshape(count, common.RANKS, common.POINTS)
            bad = np.argwhere((codes == 2) | (codes == 3))
            chunks.append(
                {
                    "pattern_start": cursor,
                    "pattern_stop": chunk_stop,
                    "rays": count,
                    "negative_classifications": int(np.count_nonzero(codes == 2)),
                    "bound_failures": int(np.count_nonzero(codes == 3)),
                    "gate_failures": center.validate_codes(codes)["gate_failures"],
                }
            )
            for ray_index, rank, power in bad[:64]:
                residue_start = (
                    int(ray_index) * common.PRIME_COUNT * common.RANKS * common.POINTS
                )
                residue_stop = residue_start + (
                    common.PRIME_COUNT * common.RANKS * common.POINTS
                )
                ray_residues = d_residues[residue_start:residue_stop].copy_to_host()
                ray_residues = ray_residues.reshape(
                    common.PRIME_COUNT, common.RANKS, common.POINTS
                )
                residues = [
                    int(ray_residues[p, int(rank), int(power)])
                    for p in range(common.PRIME_COUNT)
                ]
                witnesses.append(
                    {
                        "pattern_index": int(pattern_indices[int(ray_index)]),
                        "row": [int(value) for value in rows[int(ray_index)]],
                        "varying": int(varying[int(ray_index)]),
                        "shift": int(shifts[int(ray_index)]),
                        "rank": int(rank),
                        "power": int(power),
                        "classification_code": int(codes[int(ray_index), int(rank), int(power)]),
                        "crt_signed_coefficient": signed_crt(residues, primes),
                        "crt_residues": residues,
                    }
                )
        cursor = chunk_stop
        print(
            "CHUNK",
            chunks[-1]["pattern_start"],
            chunks[-1]["pattern_stop"],
            "NEG",
            chunks[-1]["negative_classifications"],
            "BOUND",
            chunks[-1]["bound_failures"],
            flush=True,
        )

    literal = None
    if witnesses:
        witness = witnesses[0]
        coefficients = literal_newton(
            witness["row"], witness["varying"], witness["shift"]
        )
        literal_value = coefficients[witness["rank"]][witness["power"]]
        literal = {
            "rank": witness["rank"],
            "power": witness["power"],
            "literal_signed_coefficient": literal_value,
            "matches_crt": literal_value == witness["crt_signed_coefficient"],
            "all_coefficients_for_rank": coefficients[witness["rank"]],
        }

    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-center-pendant-internal-"
            "cuda-negative-diagnostic-v1"
        ),
        "status": (
            "FAIL_WITNESS_CONFIRMED"
            if witnesses and literal and literal["matches_crt"]
            else "NO_CONFIRMED_WITNESS"
        ),
        "production_checkpoint": {
            "path": CHECKPOINT.name,
            "sha256": sha256(CHECKPOINT),
            "cursor": start,
        },
        "production_batch": {"start": start, "stop": stop},
        "chunks": chunks,
        "witnesses": witnesses,
        "literal_replay": literal,
        "immutable_input_hashes": {
            "formula": sha256(ROOT / formula.__file__),
            "driver": sha256(ROOT / driver.__file__),
            "classification_engine": sha256(ROOT / common.__file__),
        },
        "crt_modulus_bits": modulus.bit_length(),
    }
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(output)
    print(payload["status"])
    print("OUTPUT", output.name, sha256(output))


if __name__ == "__main__":
    main()
