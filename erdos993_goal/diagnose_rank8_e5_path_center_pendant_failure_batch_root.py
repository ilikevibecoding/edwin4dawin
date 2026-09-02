#!/usr/bin/env python3
"""Isolate and exactly replay the first failed center-pendant GPU batch."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from types import SimpleNamespace

import numpy as np
from numba import cuda

import benchmark_rank8_cuda_path_center_pendant_internal_formula_agent as formula
import run_rank8_cuda_unordered_halves_internal_rays_driver_agent as driver


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_e5_path_center_pendant_failure_batch_diagnostic_root_20260825.json"
START = 897_000_000
STOP = 897_750_000


def exact_newton(length_row: list[int], varying: int, shift: int) -> list[list[int]]:
    values = [[] for _ in range(driver.common.RANKS)]
    for point in range(driver.common.POINTS):
        lengths = list(length_row)
        lengths[varying] += shift + point
        center_pendant = lengths[10] + 1 + lengths[11]
        adjacency, paths = formula.five_cubic_path(center_pendant, tuple(lengths[:10]))
        root = paths["center_pendant"][lengths[10] + 1]
        core = formula.forest_poly(adjacency)
        deleted = formula.forest_poly(adjacency, frozenset({root}))
        deltas = formula.literal_deltas(core, deleted)
        for rank, value in enumerate(deltas):
            values[rank].append(value)
    output = []
    for row in values:
        work = list(row)
        coefficients = []
        while work:
            coefficients.append(work[0])
            work = [right - left for left, right in zip(work, work[1:])]
        output.append(coefficients)
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=START)
    parser.add_argument("--stop", type=int, default=STOP)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    start = args.start
    stop = args.stop
    assert 0 <= start < stop
    halves, half_sums, half_masks = driver.center.half_table()
    first_long = np.full(1 << 12, -1, dtype=np.int8)
    for mask in range(1, 1 << 12):
        first_long[mask] = (mask & -mask).bit_length() - 1
    config = SimpleNamespace(
        near_states=8,
        near_long_value=7,
        tail_states=7,
        tail_long_value=7,
    )
    rows, varying, shifts, all_short, finite, order27 = driver.make_rows(
        config, start, stop, halves, half_sums, half_masks, first_long
    )
    left, right, near, tail = driver.decode(start, stop, 8, 7)
    masks = (
        half_masks[left]
        | (half_masks[right] << np.uint16(5))
        | ((near == 7).astype(np.uint16) << np.uint16(10))
        | ((tail == 7).astype(np.uint16) << np.uint16(11))
    )
    selected_patterns = np.arange(start, stop, dtype=np.int64)[masks != 0]
    assert len(selected_patterns) == len(rows)

    primes = driver.common.primes31()
    inverses, modulus, modulus_limbs = driver.common.crt_constants(primes)
    count = len(rows)
    d_rows = cuda.to_device(rows)
    d_varying = cuda.to_device(varying)
    d_shifts = cuda.to_device(shifts)
    d_primes = cuda.to_device(np.asarray(primes, dtype=np.uint32))
    d_inverses = cuda.to_device(np.asarray(inverses, dtype=np.uint32))
    d_modulus = cuda.to_device(np.asarray(modulus_limbs, dtype=np.uint32))
    d_degrees = cuda.to_device(np.asarray(driver.center.DEGREES, dtype=np.uint32))
    residue_count = count * driver.common.PRIME_COUNT * driver.common.RANKS * driver.common.POINTS
    d_residues = cuda.device_array(residue_count, dtype=np.uint32)
    d_codes = cuda.device_array(count * driver.common.RANKS * driver.common.POINTS, dtype=np.uint8)
    formula.evaluate_kernel[(count * driver.common.POINTS + 63) // 64, 64](
        d_rows, d_varying, d_shifts, d_primes, d_residues
    )
    work = count * driver.common.PRIME_COUNT * driver.common.RANKS
    driver.common.differences_kernel[(work + 127) // 128, 128](
        d_residues, d_primes, count
    )
    code_work = count * driver.common.RANKS * driver.common.POINTS
    driver.common.classify_coefficients_kernel[(code_work + 127) // 128, 128](
        d_residues, d_primes, d_inverses, d_modulus, d_degrees, count, d_codes
    )
    cuda.synchronize()
    codes = d_codes.copy_to_host().reshape(count, driver.common.RANKS, driver.common.POINTS)
    negative_positions = np.argwhere(codes == 2)
    stats = driver.center.validate_codes(codes)
    unique_rows = sorted({int(position[0]) for position in negative_positions})
    records = []
    for row_index in unique_rows[:64]:
        length_row = [int(value) for value in rows[row_index]]
        exact = exact_newton(length_row, int(varying[row_index]), int(shifts[row_index]))
        exact_negative = [
            [rank, power, str(value)]
            for rank, coefficients in enumerate(exact)
            for power, value in enumerate(coefficients)
            if value < 0
        ]
        gpu_negative = [
            [int(position[1]), int(position[2])]
            for position in negative_positions
            if int(position[0]) == row_index
        ]
        assert {(rank, power) for rank, power, _ in exact_negative} == {
            tuple(entry) for entry in gpu_negative
        }
        records.append(
            {
                "batch_row": row_index,
                "pattern_index": int(selected_patterns[row_index]),
                "base_lengths": length_row,
                "varying_index": int(varying[row_index]),
                "initial_shift": int(shifts[row_index]),
                "gpu_negative_rank_power": gpu_negative,
                "exact_negative_rank_power_value": exact_negative,
                "exact_newton_coefficients_orders_0_to_28": [
                    [str(value) for value in row] for row in exact
                ],
            }
        )
    payload = {
        "schema": "rank8-e5-path-center-pendant-failure-batch-diagnostic-v1",
        "status": "EXACT_DIAGNOSTIC_NO_COUNTEREXAMPLE_CLAIM",
        "batch": {
            "start": start,
            "stop": stop,
            "patterns": stop - start,
            "rays": count,
            "all_short": all_short,
            "finite": finite,
            "order27": order27,
        },
        "classification": {
            "negative_coefficients": int(len(negative_positions)),
            "rays_with_negative_coefficients": len(unique_rows),
            "bound_code_count": int(np.count_nonzero(codes == 3)),
            "gate_failures": stats["gate_failures"],
        },
        "exact_replays": records,
        "exact_replay_truncated": len(unique_rows) > len(records),
    }
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("NEGATIVE_COEFFICIENTS", len(negative_positions))
    print("NEGATIVE_RAYS", len(unique_rows))
    print("EXACT_REPLAYS", len(records))
    for record in records[:8]:
        print(
            "PATTERN", record["pattern_index"],
            "LENGTHS", record["base_lengths"],
            "VARYING", record["varying_index"],
            "SHIFT", record["initial_shift"],
            "NEG", record["exact_negative_rank_power_value"],
        )


if __name__ == "__main__":
    main()
