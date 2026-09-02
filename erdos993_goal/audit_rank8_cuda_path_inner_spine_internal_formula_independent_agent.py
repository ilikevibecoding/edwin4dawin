#!/usr/bin/env python3
"""Independent CUDA message engine for path:inner_spine_internal."""

from __future__ import annotations

import random
import time

import numpy as np
import sympy as sp

import audit_rank8_cuda_path_center_pendant_internal_formula_independent_agent as messages
import benchmark_rank8_cuda_path_center_formula_agent as common
from numba import cuda, int32, uint32, uint64

from probe_rank8_delta03_e5_five_cubic_path_internal_root_shape_agent import (
    deltas03 as literal_deltas,
    five_cubic_path,
    forest_poly,
)


WIDTH = 9
POINTS = 29
PRIME_COUNT = 9
RANKS = 4
GAPS = (0, 1)
SPINES = (4, 7, 9)


@cuda.jit(device=True)
def root_polynomials(lengths, whole, root_deleted):
    outer_absent = cuda.local.array(WIDTH, dtype=uint64)
    outer_present = cuda.local.array(WIDTH, dtype=uint64)
    leaf_path = cuda.local.array(WIDTH, dtype=uint64)
    inner_absent = cuda.local.array(WIDTH, dtype=uint64)
    inner_present_raw = cuda.local.array(WIDTH, dtype=uint64)
    inner_present = cuda.local.array(WIDTH, dtype=uint64)
    root_inner_absent = cuda.local.array(WIDTH, dtype=uint64)
    root_inner_present = cuda.local.array(WIDTH, dtype=uint64)
    far_absent = cuda.local.array(WIDTH, dtype=uint64)
    far_present = cuda.local.array(WIDTH, dtype=uint64)
    center_absent = cuda.local.array(WIDTH, dtype=uint64)
    center_present_raw = cuda.local.array(WIDTH, dtype=uint64)
    center_present = cuda.local.array(WIDTH, dtype=uint64)
    root_center_absent = cuda.local.array(WIDTH, dtype=uint64)
    root_center_present = cuda.local.array(WIDTH, dtype=uint64)
    selected_raw = cuda.local.array(WIDTH, dtype=uint64)
    selected = cuda.local.array(WIDTH, dtype=uint64)

    messages.outer_arm_message(
        lengths[4],
        lengths[5],
        lengths[6],
        outer_absent,
        outer_present,
    )
    common.path_into(lengths[3], leaf_path)
    common.vector_mul(leaf_path, outer_absent, inner_absent)
    common.path_into(lengths[3] - 1, leaf_path)
    common.vector_mul(leaf_path, outer_present, inner_present_raw)
    common.vector_shift(inner_present_raw, 1, inner_present)
    messages.send_message(
        inner_absent,
        inner_present,
        lengths[1] + 1,
        root_inner_absent,
        root_inner_present,
    )

    messages.side_message(
        lengths[7],
        lengths[8],
        lengths[9],
        lengths[10],
        lengths[11],
        far_absent,
        far_present,
    )
    common.path_into(lengths[2], leaf_path)
    common.vector_mul(leaf_path, far_absent, center_absent)
    common.path_into(lengths[2] - 1, leaf_path)
    common.vector_mul(leaf_path, far_present, center_present_raw)
    common.vector_shift(center_present_raw, 1, center_present)
    messages.send_message(
        center_absent,
        center_present,
        lengths[0] + 1,
        root_center_absent,
        root_center_present,
    )

    common.vector_mul(root_inner_absent, root_center_absent, root_deleted)
    common.vector_mul(root_inner_present, root_center_present, selected_raw)
    common.vector_shift(selected_raw, 1, selected)
    common.vector_add(root_deleted, selected, whole)


@cuda.jit
def evaluate_rays_kernel(length_rows, varying_rows, shift_rows, primes, output):
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
    messages.write_residues(whole, deleted, row, point, primes, output, POINTS)


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
    messages.write_residues(whole, deleted, row, 0, primes, output, 1)


def audit_primes31():
    values = []
    cursor = 2**31 - 864_000_000
    for _ in range(PRIME_COUNT):
        cursor = int(sp.prevprime(cursor))
        values.append(cursor)
        cursor -= 2_100_000
    modulus = 1
    for value in values:
        modulus *= value
    assert modulus.bit_length() > 255
    assert set(values).isdisjoint(common.primes31())
    return values


def long_value(index: int) -> int:
    if index in GAPS:
        return 7
    return 8 if index in SPINES else 7


def random_rays(count):
    source = random.Random(0xA011_1AAE_5A1E_2608)
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


def literal_checks(rows, varying, shifts, primes, residues, checks=8):
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
    primes = audit_primes31()
    rows, varying, shifts = random_rays(count)
    d_rows = cuda.to_device(rows)
    d_varying = cuda.to_device(varying)
    d_shifts = cuda.to_device(shifts)
    d_primes = cuda.to_device(np.asarray(primes, dtype=np.uint32))
    size = count * PRIME_COUNT * RANKS * POINTS
    d_output = cuda.device_array(size, dtype=np.uint32)
    evaluate_rays_kernel[1, 1](
        d_rows[:1], d_varying[:1], d_shifts[:1], d_primes, d_output
    )
    cuda.synchronize()
    started = time.perf_counter()
    threads = 64
    evaluate_rays_kernel[(count * POINTS + threads - 1) // threads, threads](
        d_rows, d_varying, d_shifts, d_primes, d_output
    )
    cuda.synchronize()
    elapsed = time.perf_counter() - started
    residues = d_output.copy_to_host()
    comparisons = literal_checks(rows, varying, shifts, primes, residues)
    print("PASS_INDEPENDENT_CUDA_PATH_INNER_SPINE_INTERNAL_FORMULA_BENCH")
    print("RAYS", count)
    print("KERNEL_SECONDS", f"{elapsed:.6f}")
    print("RAYS_PER_SECOND_EQUIVALENT", f"{count / elapsed:.3f}")
    print("LITERAL_RESIDUE_CHECKS", comparisons)
    print("CHECKSUM", int(residues.astype(np.uint64).sum(dtype=np.uint64)))


if __name__ == "__main__":
    main()
