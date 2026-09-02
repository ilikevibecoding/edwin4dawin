#!/usr/bin/env python3
"""Real-formula CUDA benchmark for five_cubic_path:center_leaf."""

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
SPINES = (0, 2, 5, 7, 10)
WIDTH = 9


@cuda.jit
def evaluate_kernel(length_rows, varying_rows, shift_rows, primes, output):
    flat = cuda.grid(1)
    total = length_rows.shape[0] * POINTS
    if flat >= total:
        return
    ray = flat // POINTS
    point = flat - ray * POINTS
    lengths = cuda.local.array(11, dtype=int32)
    for index in range(11):
        lengths[index] = length_rows[ray, index]
    lengths[varying_rows[ray]] += shift_rows[ray] + point

    left_free = cuda.local.array(WIDTH, dtype=uint64)
    left_blocked = cuda.local.array(WIDTH, dtype=uint64)
    right_free = cuda.local.array(WIDTH, dtype=uint64)
    right_blocked = cuda.local.array(WIDTH, dtype=uint64)
    center_absent = cuda.local.array(WIDTH, dtype=uint64)
    center_present_unshifted = cuda.local.array(WIDTH, dtype=uint64)
    center_present = cuda.local.array(WIDTH, dtype=uint64)
    link_free = cuda.local.array(WIDTH, dtype=uint64)
    link_blocked = cuda.local.array(WIDTH, dtype=uint64)
    shifted_blocked = cuda.local.array(WIDTH, dtype=uint64)
    whole = cuda.local.array(WIDTH, dtype=uint64)

    base.far_parts(
        lengths[0], lengths[1], lengths[2], lengths[3], lengths[4],
        left_free, left_blocked,
    )
    base.far_parts(
        lengths[5], lengths[6], lengths[7], lengths[8], lengths[9],
        right_free, right_blocked,
    )
    base.vector_mul(left_free, right_free, center_absent)
    base.vector_mul(left_blocked, right_blocked, center_present_unshifted)
    base.vector_shift(center_present_unshifted, 1, center_present)
    base.cross(center_absent, center_present, lengths[10], link_free, link_blocked)
    base.vector_shift(link_blocked, 1, shifted_blocked)
    base.vector_add(link_free, shifted_blocked, whole)

    for prime_index in range(PRIME_COUNT):
        prime = uint64(primes[prime_index])
        r1 = base.residual_mod(whole, link_free, 1, prime)
        r2 = base.residual_mod(whole, link_free, 2, prime)
        r3 = base.residual_mod(whole, link_free, 3, prime)
        r4 = base.residual_mod(whole, link_free, 4, prime)
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
        offset = (((ray * PRIME_COUNT + prime_index) * RANKS) * POINTS) + point
        output[offset] = uint32(d0)
        output[offset + POINTS] = uint32(d1)
        output[offset + 2 * POINTS] = uint32(d2)
        output[offset + 3 * POINTS] = uint32(d3)


@cuda.jit
def evaluate_finite_kernel(length_rows, primes, output):
    ray = cuda.grid(1)
    if ray >= length_rows.shape[0]:
        return
    left_free = cuda.local.array(WIDTH, dtype=uint64)
    left_blocked = cuda.local.array(WIDTH, dtype=uint64)
    right_free = cuda.local.array(WIDTH, dtype=uint64)
    right_blocked = cuda.local.array(WIDTH, dtype=uint64)
    center_absent = cuda.local.array(WIDTH, dtype=uint64)
    center_present_unshifted = cuda.local.array(WIDTH, dtype=uint64)
    center_present = cuda.local.array(WIDTH, dtype=uint64)
    link_free = cuda.local.array(WIDTH, dtype=uint64)
    link_blocked = cuda.local.array(WIDTH, dtype=uint64)
    shifted_blocked = cuda.local.array(WIDTH, dtype=uint64)
    whole = cuda.local.array(WIDTH, dtype=uint64)
    base.far_parts(
        length_rows[ray, 0], length_rows[ray, 1], length_rows[ray, 2],
        length_rows[ray, 3], length_rows[ray, 4], left_free, left_blocked,
    )
    base.far_parts(
        length_rows[ray, 5], length_rows[ray, 6], length_rows[ray, 7],
        length_rows[ray, 8], length_rows[ray, 9], right_free, right_blocked,
    )
    base.vector_mul(left_free, right_free, center_absent)
    base.vector_mul(left_blocked, right_blocked, center_present_unshifted)
    base.vector_shift(center_present_unshifted, 1, center_present)
    base.cross(
        center_absent, center_present, length_rows[ray, 10], link_free, link_blocked
    )
    base.vector_shift(link_blocked, 1, shifted_blocked)
    base.vector_add(link_free, shifted_blocked, whole)
    for prime_index in range(PRIME_COUNT):
        prime = uint64(primes[prime_index])
        r1 = base.residual_mod(whole, link_free, 1, prime)
        r2 = base.residual_mod(whole, link_free, 2, prime)
        r3 = base.residual_mod(whole, link_free, 3, prime)
        r4 = base.residual_mod(whole, link_free, 4, prime)
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
        offset = (ray * PRIME_COUNT + prime_index) * RANKS
        output[offset] = uint32(d0)
        output[offset + 1] = uint32(d1)
        output[offset + 2] = uint32(d2)
        output[offset + 3] = uint32(d3)


def random_rays(count: int):
    source = random.Random(0xCE17_EAF9_9320_2608)
    maxima = [8 if index in SPINES else 7 for index in range(11)]
    rows = np.empty((count, 11), dtype=np.int32)
    varying = np.empty(count, dtype=np.int32)
    shifts = np.empty(count, dtype=np.int32)
    for ray in range(count):
        row = [source.randint(1, maximum) for maximum in maxima]
        forced = source.randrange(11)
        row[forced] = maxima[forced]
        index = next(i for i, value in enumerate(row) if value == maxima[i])
        rows[ray] = row
        varying[ray] = index
        shifts[ray] = max(0, 28 - (1 + sum(row)))
    return rows, varying, shifts


def literal_check(rows, varying, shifts, primes, residues, checks=8):
    view = residues.reshape(len(rows), PRIME_COUNT, RANKS, POINTS)
    comparisons = 0
    for ray in range(min(checks, len(rows))):
        for point in (0, 13, 28):
            lengths = [int(value) for value in rows[ray]]
            lengths[int(varying[ray])] += int(shifts[ray]) + point
            adjacency, paths = five_cubic_path(lengths[10], tuple(lengths[:10]))
            root = paths["center_pendant"][-1]
            core = forest_poly(adjacency)
            deleted = forest_poly(adjacency, frozenset({root}))
            exact = literal_deltas(core, deleted)
            for prime_index, prime in enumerate(primes):
                for rank in range(RANKS):
                    assert int(view[ray, prime_index, rank, point]) == exact[rank] % prime
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
    evaluate_kernel[1, 1](d_rows[:1], d_varying[:1], d_shifts[:1], d_primes, d_output)
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
    print("PASS_CUDA_REAL_PATH_CENTER_LEAF_FORMULA_BENCH")
    print("RAYS", count)
    print("KERNEL_SECONDS", f"{elapsed:.6f}")
    print("RAYS_PER_SECOND_EQUIVALENT", f"{count / elapsed:.3f}")
    print("LITERAL_RESIDUE_CHECKS", comparisons)
    print("CHECKSUM", int(residues.astype(np.uint64).sum(dtype=np.uint64)))


if __name__ == "__main__":
    main()
