#!/usr/bin/env python3
"""Real-formula CUDA benchmark for five_cubic_path:near_inner_branch."""

from __future__ import annotations

import random
import time

import numpy as np

import benchmark_rank8_cuda_path_center_formula_agent as base
from numba import cuda, int32, uint32, uint64

from probe_rank8_delta03_e5_five_cubic_path_internal_root_shape_agent import (
    deltas03 as literal_deltas,
    five_cubic_path,
    forest_poly,
)


POINTS = base.POINTS
PRIME_COUNT = base.PRIME_COUNT
RANKS = base.RANKS
SPINES = (0, 2, 5, 7)
WIDTH = 9


@cuda.jit(device=True)
def root_polynomials(lengths, whole, root_deleted):
    low_path = cuda.local.array(WIDTH, dtype=uint64)
    high_path = cuda.local.array(WIDTH, dtype=uint64)
    outer_absent = cuda.local.array(WIDTH, dtype=uint64)
    outer_present_raw = cuda.local.array(WIDTH, dtype=uint64)
    outer_present = cuda.local.array(WIDTH, dtype=uint64)
    outer_free = cuda.local.array(WIDTH, dtype=uint64)
    outer_blocked = cuda.local.array(WIDTH, dtype=uint64)
    right_free = cuda.local.array(WIDTH, dtype=uint64)
    right_blocked = cuda.local.array(WIDTH, dtype=uint64)
    center_absent = cuda.local.array(WIDTH, dtype=uint64)
    center_present_raw = cuda.local.array(WIDTH, dtype=uint64)
    center_present = cuda.local.array(WIDTH, dtype=uint64)
    remote_free = cuda.local.array(WIDTH, dtype=uint64)
    remote_blocked = cuda.local.array(WIDTH, dtype=uint64)
    pendant_free = cuda.local.array(WIDTH, dtype=uint64)
    pendant_blocked = cuda.local.array(WIDTH, dtype=uint64)
    scratch = cuda.local.array(WIDTH, dtype=uint64)
    selected_raw = cuda.local.array(WIDTH, dtype=uint64)
    selected = cuda.local.array(WIDTH, dtype=uint64)

    base.path_into(lengths[3], low_path)
    base.path_into(lengths[4], high_path)
    base.vector_mul(low_path, high_path, outer_absent)
    base.path_into(lengths[3] - 1, low_path)
    base.path_into(lengths[4] - 1, high_path)
    base.vector_mul(low_path, high_path, outer_present_raw)
    base.vector_shift(outer_present_raw, 1, outer_present)
    base.cross(
        outer_absent, outer_present, lengths[2], outer_free, outer_blocked
    )

    base.far_parts(
        lengths[5], lengths[6], lengths[7], lengths[8], lengths[9],
        right_free, right_blocked,
    )
    base.path_into(lengths[10], pendant_free)
    base.vector_mul(right_free, pendant_free, center_absent)
    base.path_into(lengths[10] - 1, pendant_blocked)
    base.vector_mul(right_blocked, pendant_blocked, center_present_raw)
    base.vector_shift(center_present_raw, 1, center_present)
    base.cross(
        center_absent, center_present, lengths[0], remote_free, remote_blocked
    )

    base.path_into(lengths[1], pendant_free)
    base.vector_mul(outer_free, remote_free, scratch)
    base.vector_mul(scratch, pendant_free, root_deleted)
    base.path_into(lengths[1] - 1, pendant_blocked)
    base.vector_mul(outer_blocked, remote_blocked, scratch)
    base.vector_mul(scratch, pendant_blocked, selected_raw)
    base.vector_shift(selected_raw, 1, selected)
    base.vector_add(root_deleted, selected, whole)


@cuda.jit(device=True)
def write_residues(whole, deleted, row, point, primes, output, point_stride):
    for prime_index in range(PRIME_COUNT):
        prime = uint64(primes[prime_index])
        r1 = base.residual_mod(whole, deleted, 1, prime)
        r2 = base.residual_mod(whole, deleted, 2, prime)
        r3 = base.residual_mod(whole, deleted, 3, prime)
        r4 = base.residual_mod(whole, deleted, 4, prime)
        d0 = r1
        d1 = base.msub(r2, r1, prime)
        d2 = base.madd(
            base.msub(r3, base.mmul(uint64(2), r2, prime), prime), r1, prime
        )
        d3 = base.msub(
            base.madd(
                base.msub(r4, base.mmul(uint64(3), r3, prime), prime),
                base.mmul(uint64(3), r2, prime),
                prime,
            ),
            r1,
            prime,
        )
        offset = ((row * PRIME_COUNT + prime_index) * RANKS) * point_stride + point
        output[offset] = uint32(d0)
        output[offset + point_stride] = uint32(d1)
        output[offset + 2 * point_stride] = uint32(d2)
        output[offset + 3 * point_stride] = uint32(d3)


@cuda.jit
def evaluate_kernel(length_rows, varying_rows, shift_rows, primes, output):
    flat = cuda.grid(1)
    total = length_rows.shape[0] * POINTS
    if flat >= total:
        return
    row = flat // POINTS
    point = flat - row * POINTS
    lengths = cuda.local.array(11, dtype=int32)
    for index in range(11):
        lengths[index] = length_rows[row, index]
    lengths[varying_rows[row]] += shift_rows[row] + point
    whole = cuda.local.array(WIDTH, dtype=uint64)
    deleted = cuda.local.array(WIDTH, dtype=uint64)
    root_polynomials(lengths, whole, deleted)
    write_residues(whole, deleted, row, point, primes, output, POINTS)


@cuda.jit
def evaluate_finite_kernel(length_rows, primes, output):
    row = cuda.grid(1)
    if row >= length_rows.shape[0]:
        return
    lengths = cuda.local.array(11, dtype=int32)
    for index in range(11):
        lengths[index] = length_rows[row, index]
    whole = cuda.local.array(WIDTH, dtype=uint64)
    deleted = cuda.local.array(WIDTH, dtype=uint64)
    root_polynomials(lengths, whole, deleted)
    write_residues(whole, deleted, row, 0, primes, output, 1)


def random_rays(count: int):
    source = random.Random(0x1AAE_7993_2026_0825)
    maxima = [8 if index in SPINES else 7 for index in range(11)]
    rows = np.empty((count, 11), dtype=np.int32)
    varying = np.empty(count, dtype=np.int32)
    shifts = np.empty(count, dtype=np.int32)
    for row_index in range(count):
        row = [source.randint(1, maximum) for maximum in maxima]
        forced = source.randrange(11)
        row[forced] = maxima[forced]
        index = next(i for i, value in enumerate(row) if value == maxima[i])
        rows[row_index] = row
        varying[row_index] = index
        shifts[row_index] = max(0, 28 - (1 + sum(row)))
    return rows, varying, shifts


def literal_check(rows, varying, shifts, primes, residues, checks=8):
    view = residues.reshape(len(rows), PRIME_COUNT, RANKS, POINTS)
    comparisons = 0
    for row_index in range(min(checks, len(rows))):
        for point in (0, 13, 28):
            lengths = [int(value) for value in rows[row_index]]
            lengths[int(varying[row_index])] += int(shifts[row_index]) + point
            adjacency, paths = five_cubic_path(lengths[10], tuple(lengths[:10]))
            root = paths["inner_pendant"][0]
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
    print("PASS_CUDA_REAL_PATH_NEAR_INNER_BRANCH_FORMULA_BENCH")
    print("RAYS", count)
    print("KERNEL_SECONDS", f"{elapsed:.6f}")
    print("RAYS_PER_SECOND_EQUIVALENT", f"{count / elapsed:.3f}")
    print("LITERAL_RESIDUE_CHECKS", comparisons)
    print("CHECKSUM", int(residues.astype(np.uint64).sum(dtype=np.uint64)))


if __name__ == "__main__":
    main()
