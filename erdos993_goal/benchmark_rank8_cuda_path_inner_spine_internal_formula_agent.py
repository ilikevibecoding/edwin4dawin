#!/usr/bin/env python3
"""Real-formula CUDA benchmark for five_cubic_path:inner_spine_internal."""

from __future__ import annotations

import random
import time

import numpy as np

import benchmark_rank8_cuda_path_center_formula_agent as base
import benchmark_rank8_cuda_path_center_pendant_internal_formula_agent as shared
from numba import cuda, int32, uint32, uint64

from probe_rank8_delta03_e5_five_cubic_path_internal_root_shape_agent import (
    deltas03 as literal_deltas,
    five_cubic_path,
    forest_poly,
)


POINTS = base.POINTS
PRIME_COUNT = base.PRIME_COUNT
RANKS = base.RANKS
GAPS = (0, 1)
SPINES = (4, 7, 9)
WIDTH = 9


@cuda.jit(device=True)
def outer_arm_message(link, low, high, parent_free, parent_blocked):
    low_path = cuda.local.array(WIDTH, dtype=uint64)
    high_path = cuda.local.array(WIDTH, dtype=uint64)
    branch_absent = cuda.local.array(WIDTH, dtype=uint64)
    branch_present_raw = cuda.local.array(WIDTH, dtype=uint64)
    branch_present = cuda.local.array(WIDTH, dtype=uint64)
    base.path_into(low, low_path)
    base.path_into(high, high_path)
    base.vector_mul(low_path, high_path, branch_absent)
    base.path_into(low - 1, low_path)
    base.path_into(high - 1, high_path)
    base.vector_mul(low_path, high_path, branch_present_raw)
    base.vector_shift(branch_present_raw, 1, branch_present)
    base.cross(
        branch_absent,
        branch_present,
        link,
        parent_free,
        parent_blocked,
    )


@cuda.jit(device=True)
def root_polynomials(lengths, whole, root_deleted):
    outer_free = cuda.local.array(WIDTH, dtype=uint64)
    outer_blocked = cuda.local.array(WIDTH, dtype=uint64)
    inner_leaf_free = cuda.local.array(WIDTH, dtype=uint64)
    inner_leaf_blocked = cuda.local.array(WIDTH, dtype=uint64)
    inner_absent = cuda.local.array(WIDTH, dtype=uint64)
    inner_present_raw = cuda.local.array(WIDTH, dtype=uint64)
    inner_present = cuda.local.array(WIDTH, dtype=uint64)
    root_inner_free = cuda.local.array(WIDTH, dtype=uint64)
    root_inner_blocked = cuda.local.array(WIDTH, dtype=uint64)
    right_free = cuda.local.array(WIDTH, dtype=uint64)
    right_blocked = cuda.local.array(WIDTH, dtype=uint64)
    center_leaf_free = cuda.local.array(WIDTH, dtype=uint64)
    center_leaf_blocked = cuda.local.array(WIDTH, dtype=uint64)
    center_absent = cuda.local.array(WIDTH, dtype=uint64)
    center_present_raw = cuda.local.array(WIDTH, dtype=uint64)
    center_present = cuda.local.array(WIDTH, dtype=uint64)
    root_center_free = cuda.local.array(WIDTH, dtype=uint64)
    root_center_blocked = cuda.local.array(WIDTH, dtype=uint64)
    selected_raw = cuda.local.array(WIDTH, dtype=uint64)
    selected = cuda.local.array(WIDTH, dtype=uint64)

    outer_arm_message(
        lengths[4],
        lengths[5],
        lengths[6],
        outer_free,
        outer_blocked,
    )
    base.path_into(lengths[3], inner_leaf_free)
    base.path_into(lengths[3] - 1, inner_leaf_blocked)
    base.vector_mul(inner_leaf_free, outer_free, inner_absent)
    base.vector_mul(inner_leaf_blocked, outer_blocked, inner_present_raw)
    base.vector_shift(inner_present_raw, 1, inner_present)
    base.cross(
        inner_absent,
        inner_present,
        lengths[1] + 1,
        root_inner_free,
        root_inner_blocked,
    )

    base.far_parts(
        lengths[7],
        lengths[8],
        lengths[9],
        lengths[10],
        lengths[11],
        right_free,
        right_blocked,
    )
    base.path_into(lengths[2], center_leaf_free)
    base.path_into(lengths[2] - 1, center_leaf_blocked)
    base.vector_mul(center_leaf_free, right_free, center_absent)
    base.vector_mul(center_leaf_blocked, right_blocked, center_present_raw)
    base.vector_shift(center_present_raw, 1, center_present)
    base.cross(
        center_absent,
        center_present,
        lengths[0] + 1,
        root_center_free,
        root_center_blocked,
    )

    base.vector_mul(root_inner_free, root_center_free, root_deleted)
    base.vector_mul(root_inner_blocked, root_center_blocked, selected_raw)
    base.vector_shift(selected_raw, 1, selected)
    base.vector_add(root_deleted, selected, whole)


@cuda.jit
def evaluate_kernel(length_rows, varying_rows, shift_rows, primes, output):
    flat = cuda.grid(1)
    total = length_rows.shape[0] * POINTS
    if flat >= total:
        return
    row = flat // POINTS
    point = flat - row * POINTS
    lengths = cuda.local.array(12, dtype=int32)
    for index in range(12):
        lengths[index] = length_rows[row, index]
    lengths[varying_rows[row]] += shift_rows[row] + point
    whole = cuda.local.array(WIDTH, dtype=uint64)
    deleted = cuda.local.array(WIDTH, dtype=uint64)
    root_polynomials(lengths, whole, deleted)
    shared.write_residues(whole, deleted, row, point, primes, output, POINTS)


@cuda.jit
def evaluate_finite_kernel(length_rows, primes, output):
    row = cuda.grid(1)
    if row >= length_rows.shape[0]:
        return
    lengths = cuda.local.array(12, dtype=int32)
    for index in range(12):
        lengths[index] = length_rows[row, index]
    whole = cuda.local.array(WIDTH, dtype=uint64)
    deleted = cuda.local.array(WIDTH, dtype=uint64)
    root_polynomials(lengths, whole, deleted)
    shared.write_residues(whole, deleted, row, 0, primes, output, 1)


def long_value(index: int) -> int:
    if index in GAPS:
        return 7
    return 8 if index in SPINES else 7


def random_rays(count: int):
    source = random.Random(0x1AAE_5A1E_9320_2608)
    rows = np.empty((count, 12), dtype=np.int32)
    varying = np.empty(count, dtype=np.int32)
    shifts = np.empty(count, dtype=np.int32)
    for row_index in range(count):
        row = []
        for index in range(12):
            if index in GAPS:
                row.append(source.randint(0, 7))
            else:
                row.append(source.randint(1, long_value(index)))
        forced = source.randrange(12)
        row[forced] = long_value(forced)
        index = next(
            position
            for position, value in enumerate(row)
            if value == long_value(position)
        )
        rows[row_index] = row
        varying[row_index] = index
        shifts[row_index] = max(0, 28 - (3 + sum(row)))
    return rows, varying, shifts


def literal_check(rows, varying, shifts, primes, residues, checks=8):
    view = residues.reshape(len(rows), PRIME_COUNT, RANKS, POINTS)
    comparisons = 0
    for row_index in range(min(checks, len(rows))):
        for point in (0, 13, 28):
            lengths = [int(value) for value in rows[row_index]]
            lengths[int(varying[row_index])] += int(shifts[row_index]) + point
            selected_spine = lengths[0] + lengths[1] + 2
            other = (
                selected_spine,
                lengths[3],
                lengths[4],
                lengths[5],
                lengths[6],
                lengths[7],
                lengths[8],
                lengths[9],
                lengths[10],
                lengths[11],
            )
            adjacency, paths = five_cubic_path(lengths[2], other)
            root = paths["inner_spine"][lengths[0] + 1]
            core = forest_poly(adjacency)
            deleted = forest_poly(adjacency, frozenset({root}))
            exact = literal_deltas(core, deleted)
            for prime_index, prime in enumerate(primes):
                for rank in range(RANKS):
                    assert (
                        int(view[row_index, prime_index, rank, point])
                        == exact[rank] % prime
                    )
                    comparisons += 1
    return comparisons


def main() -> None:
    count = 16_384
    primes = base.primes31()
    rows, varying, shifts = random_rays(count)
    d_rows = cuda.to_device(rows)
    d_varying = cuda.to_device(varying)
    d_shifts = cuda.to_device(shifts)
    d_primes = cuda.to_device(np.asarray(primes, dtype=np.uint32))
    size = count * PRIME_COUNT * RANKS * POINTS
    d_output = cuda.device_array(size, dtype=np.uint32)
    evaluate_kernel[1, 1](
        d_rows[:1], d_varying[:1], d_shifts[:1], d_primes, d_output
    )
    cuda.synchronize()
    started = time.perf_counter()
    threads = 64
    evaluate_kernel[(count * POINTS + threads - 1) // threads, threads](
        d_rows, d_varying, d_shifts, d_primes, d_output
    )
    cuda.synchronize()
    elapsed = time.perf_counter() - started
    residues = d_output.copy_to_host()
    comparisons = literal_check(rows, varying, shifts, primes, residues)
    print("PASS_CUDA_REAL_PATH_INNER_SPINE_INTERNAL_FORMULA_BENCH")
    print("RAYS", count)
    print("KERNEL_SECONDS", f"{elapsed:.6f}")
    print("RAYS_PER_SECOND_EQUIVALENT", f"{count / elapsed:.3f}")
    print("LITERAL_RESIDUE_CHECKS", comparisons)
    print("CHECKSUM", int(residues.astype(np.uint64).sum(dtype=np.uint64)))


if __name__ == "__main__":
    main()
