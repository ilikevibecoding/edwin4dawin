#!/usr/bin/env python3
"""Separately transcribed CUDA message engine for path:center_branch audit."""

from __future__ import annotations

import random
import time

import numpy as np
import sympy as sp

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
SPINES = (0, 2, 5, 7)


@cuda.jit(device=True)
def send_message(branch_absent, branch_present, distance, parent_absent, parent_present):
    path_near = cuda.local.array(WIDTH, dtype=uint64)
    path_far = cuda.local.array(WIDTH, dtype=uint64)
    first = cuda.local.array(WIDTH, dtype=uint64)
    second = cuda.local.array(WIDTH, dtype=uint64)
    common.path_into(distance - 1, path_near)
    common.path_into(distance - 2, path_far)
    common.vector_mul(path_near, branch_absent, first)
    common.vector_mul(path_far, branch_present, second)
    common.vector_add(first, second, parent_absent)
    common.vector_mul(path_far, branch_absent, first)
    common.path_into(distance - 3, path_near)
    common.vector_mul(path_near, branch_present, second)
    common.vector_add(first, second, parent_present)


@cuda.jit(device=True)
def outer_message(link, low, high, parent_absent, parent_present):
    low_path = cuda.local.array(WIDTH, dtype=uint64)
    high_path = cuda.local.array(WIDTH, dtype=uint64)
    branch_absent = cuda.local.array(WIDTH, dtype=uint64)
    branch_present_raw = cuda.local.array(WIDTH, dtype=uint64)
    branch_present = cuda.local.array(WIDTH, dtype=uint64)
    common.path_into(low, low_path)
    common.path_into(high, high_path)
    common.vector_mul(low_path, high_path, branch_absent)
    common.path_into(low - 1, low_path)
    common.path_into(high - 1, high_path)
    common.vector_mul(low_path, high_path, branch_present_raw)
    common.vector_shift(branch_present_raw, 1, branch_present)
    send_message(branch_absent, branch_present, link, parent_absent, parent_present)


@cuda.jit(device=True)
def long_message(center_link, middle_leaf, outer_link, low, high, parent_absent, parent_present):
    outer_absent = cuda.local.array(WIDTH, dtype=uint64)
    outer_present = cuda.local.array(WIDTH, dtype=uint64)
    leaf_path = cuda.local.array(WIDTH, dtype=uint64)
    middle_absent = cuda.local.array(WIDTH, dtype=uint64)
    middle_present_raw = cuda.local.array(WIDTH, dtype=uint64)
    middle_present = cuda.local.array(WIDTH, dtype=uint64)
    outer_message(outer_link, low, high, outer_absent, outer_present)
    common.path_into(middle_leaf, leaf_path)
    common.vector_mul(leaf_path, outer_absent, middle_absent)
    common.path_into(middle_leaf - 1, leaf_path)
    common.vector_mul(leaf_path, outer_present, middle_present_raw)
    common.vector_shift(middle_present_raw, 1, middle_present)
    send_message(middle_absent, middle_present, center_link, parent_absent, parent_present)


@cuda.jit(device=True)
def root_polynomials(lengths, whole, root_deleted):
    left_absent = cuda.local.array(WIDTH, dtype=uint64)
    left_present = cuda.local.array(WIDTH, dtype=uint64)
    right_absent = cuda.local.array(WIDTH, dtype=uint64)
    right_present = cuda.local.array(WIDTH, dtype=uint64)
    leaf_absent = cuda.local.array(WIDTH, dtype=uint64)
    leaf_present = cuda.local.array(WIDTH, dtype=uint64)
    scratch = cuda.local.array(WIDTH, dtype=uint64)
    selected_raw = cuda.local.array(WIDTH, dtype=uint64)
    selected = cuda.local.array(WIDTH, dtype=uint64)
    long_message(
        lengths[0], lengths[1], lengths[2], lengths[3], lengths[4],
        left_absent, left_present,
    )
    long_message(
        lengths[5], lengths[6], lengths[7], lengths[8], lengths[9],
        right_absent, right_present,
    )
    common.path_into(lengths[10], leaf_absent)
    common.path_into(lengths[10] - 1, leaf_present)
    common.vector_mul(left_absent, right_absent, scratch)
    common.vector_mul(scratch, leaf_absent, root_deleted)
    common.vector_mul(left_present, right_present, scratch)
    common.vector_mul(scratch, leaf_present, selected_raw)
    common.vector_shift(selected_raw, 1, selected)
    common.vector_add(root_deleted, selected, whole)


@cuda.jit(device=True)
def write_residues(whole, deleted, ray, point, primes, output, point_stride):
    for prime_index in range(PRIME_COUNT):
        prime = uint64(primes[prime_index])
        r1 = common.residual_mod(whole, deleted, 1, prime)
        r2 = common.residual_mod(whole, deleted, 2, prime)
        r3 = common.residual_mod(whole, deleted, 3, prime)
        r4 = common.residual_mod(whole, deleted, 4, prime)
        d0 = r1
        d1 = common.msub(r2, r1, prime)
        d2 = common.madd(
            common.msub(r3, common.mmul(uint64(2), r2, prime), prime), r1, prime
        )
        d3 = common.msub(
            common.madd(
                common.msub(r4, common.mmul(uint64(3), r3, prime), prime),
                common.mmul(uint64(3), r2, prime),
                prime,
            ),
            r1,
            prime,
        )
        base = ((ray * PRIME_COUNT + prime_index) * RANKS) * point_stride + point
        output[base] = uint32(d0)
        output[base + point_stride] = uint32(d1)
        output[base + 2 * point_stride] = uint32(d2)
        output[base + 3 * point_stride] = uint32(d3)


@cuda.jit
def evaluate_rays_kernel(length_rows, varying_rows, shift_rows, primes, output):
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
    whole = cuda.local.array(WIDTH, dtype=uint64)
    deleted = cuda.local.array(WIDTH, dtype=uint64)
    root_polynomials(lengths, whole, deleted)
    write_residues(whole, deleted, ray, point, primes, output, POINTS)


@cuda.jit
def evaluate_finite_kernel(length_rows, primes, output):
    ray = cuda.grid(1)
    if ray >= length_rows.shape[0]:
        return
    lengths = cuda.local.array(11, dtype=int32)
    for index in range(11):
        lengths[index] = length_rows[ray, index]
    whole = cuda.local.array(WIDTH, dtype=uint64)
    deleted = cuda.local.array(WIDTH, dtype=uint64)
    root_polynomials(lengths, whole, deleted)
    write_residues(whole, deleted, ray, 0, primes, output, 1)


def audit_primes31():
    values = []
    cursor = 2**31 - 200_000_000
    for _ in range(PRIME_COUNT):
        cursor = int(sp.prevprime(cursor))
        values.append(cursor)
        cursor -= 1_300_000
    modulus = 1
    for value in values:
        modulus *= value
    assert modulus.bit_length() > 255
    return values


def random_rays(count):
    source = random.Random(0xA0D1_7993_2026_0825)
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


def literal_checks(rows, varying, shifts, primes, residues, checks=8):
    view = residues.reshape(len(rows), PRIME_COUNT, RANKS, POINTS)
    comparisons = 0
    for ray in range(min(checks, len(rows))):
        for point in (0, 13, 28):
            lengths = [int(value) for value in rows[ray]]
            lengths[int(varying[ray])] += int(shifts[ray]) + point
            adjacency, _paths = five_cubic_path(lengths[10], tuple(lengths[:10]))
            core = forest_poly(adjacency)
            deleted = forest_poly(adjacency, frozenset({0}))
            exact = literal_deltas(core, deleted)
            for prime_index, prime in enumerate(primes):
                for rank in range(RANKS):
                    assert int(view[ray, prime_index, rank, point]) == exact[rank] % prime
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
    evaluate_rays_kernel[1, 1](d_rows[:1], d_varying[:1], d_shifts[:1], d_primes, d_output)
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
    print("PASS_INDEPENDENT_CUDA_PATH_CENTER_FORMULA_BENCH")
    print("RAYS", count)
    print("KERNEL_SECONDS", f"{elapsed:.6f}")
    print("RAYS_PER_SECOND_EQUIVALENT", f"{count / elapsed:.3f}")
    print("LITERAL_RESIDUE_CHECKS", comparisons)
    print("CHECKSUM", int(residues.astype(np.uint64).sum(dtype=np.uint64)))


if __name__ == "__main__":
    main()
