#!/usr/bin/env python3
"""GPU benchmark for the real five-cubic-path center-root formula.

Each CUDA thread evaluates one ray/sample point exactly through rank eight,
then computes Delta_0..Delta_3 modulo nine 31-bit primes.  Small rows are
cross-checked against an independently built literal tree on the CPU.
"""

from __future__ import annotations

import os
import random
import time
from pathlib import Path

import numpy as np
import sympy as sp


CUDA_SITE = Path.home() / (
    "AppData/Local/Packages/PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0/"
    "LocalCache/local-packages/Python312/site-packages/nvidia/cuda_nvcc"
)
os.environ.setdefault("CUDA_HOME", str(CUDA_SITE))

from numba import cuda, int32, uint8, uint32, uint64  # noqa: E402
from numba.cuda.cudadrv import nvvm  # noqa: E402

from probe_rank8_delta03_e5_five_cubic_path_internal_root_shape_agent import (  # noqa: E402
    deltas03 as literal_deltas,
    five_cubic_path,
    forest_poly,
)


nvvm.get_supported_ccs = lambda: nvvm.ccs_supported_by_ctk((12, 4))
WIDTH = 9
PRIME_COUNT = 9
POINTS = 29
RANKS = 4
SPINES = (0, 2, 5, 7)
LIMBS = 9


@cuda.jit(device=True, inline=True)
def choose_u64(n, k):
    if k < 0 or n < k:
        return uint64(0)
    value = uint64(1)
    for j in range(k):
        value = (value * uint64(n - j)) // uint64(j + 1)
    return value


@cuda.jit(device=True, inline=True)
def path_into(n, out):
    if n == -1:
        out[0] = uint64(1)
        for rank in range(1, WIDTH):
            out[rank] = uint64(0)
        return
    if n <= -2:
        for rank in range(WIDTH):
            out[rank] = uint64(0)
        return
    for rank in range(WIDTH):
        out[rank] = choose_u64(n - rank + 1, rank)


@cuda.jit(device=True, inline=True)
def vector_mul(left, right, out):
    for rank in range(WIDTH):
        total = uint64(0)
        for index in range(rank + 1):
            total += left[index] * right[rank - index]
        out[rank] = total


@cuda.jit(device=True, inline=True)
def vector_add(left, right, out):
    for rank in range(WIDTH):
        out[rank] = left[rank] + right[rank]


@cuda.jit(device=True, inline=True)
def vector_shift(source, amount, out):
    for rank in range(WIDTH):
        out[rank] = uint64(0) if rank < amount else source[rank - amount]


@cuda.jit(device=True)
def cross(absent, present, length, out_free, out_blocked):
    path_a = cuda.local.array(WIDTH, dtype=uint64)
    path_b = cuda.local.array(WIDTH, dtype=uint64)
    first = cuda.local.array(WIDTH, dtype=uint64)
    second = cuda.local.array(WIDTH, dtype=uint64)
    path_into(length - 1, path_a)
    path_into(length - 2, path_b)
    vector_mul(path_a, absent, first)
    vector_mul(path_b, present, second)
    vector_add(first, second, out_free)
    vector_mul(path_b, absent, first)
    path_into(length - 3, path_a)
    vector_mul(path_a, present, second)
    vector_add(first, second, out_blocked)


@cuda.jit(device=True)
def far_parts(center_middle, middle_pendant, middle_outer, low, high, out_free, out_blocked):
    left = cuda.local.array(WIDTH, dtype=uint64)
    right = cuda.local.array(WIDTH, dtype=uint64)
    absent = cuda.local.array(WIDTH, dtype=uint64)
    present_unshifted = cuda.local.array(WIDTH, dtype=uint64)
    present = cuda.local.array(WIDTH, dtype=uint64)
    outer_free = cuda.local.array(WIDTH, dtype=uint64)
    outer_blocked = cuda.local.array(WIDTH, dtype=uint64)
    middle_absent = cuda.local.array(WIDTH, dtype=uint64)
    middle_present_unshifted = cuda.local.array(WIDTH, dtype=uint64)
    middle_present = cuda.local.array(WIDTH, dtype=uint64)

    path_into(low, left)
    path_into(high, right)
    vector_mul(left, right, absent)
    path_into(low - 1, left)
    path_into(high - 1, right)
    vector_mul(left, right, present_unshifted)
    vector_shift(present_unshifted, 1, present)
    cross(absent, present, middle_outer, outer_free, outer_blocked)

    path_into(middle_pendant, left)
    vector_mul(left, outer_free, middle_absent)
    path_into(middle_pendant - 1, left)
    vector_mul(left, outer_blocked, middle_present_unshifted)
    vector_shift(middle_present_unshifted, 1, middle_present)
    cross(middle_absent, middle_present, center_middle, out_free, out_blocked)


@cuda.jit(device=True, inline=True)
def madd(left, right, prime):
    return (left + right) % prime


@cuda.jit(device=True, inline=True)
def msub(left, right, prime):
    return (left + prime - right) % prime


@cuda.jit(device=True, inline=True)
def mmul(left, right, prime):
    return (left * right) % prime


@cuda.jit(device=True)
def residual_mod(core, deleted, siblings, prime):
    p7 = uint64(deleted[6]) % prime
    p8 = uint64(deleted[7]) % prime
    open9 = uint64(0)
    for j in range(8):
        coefficient = choose_u64(siblings, j) % prime
        p7 = madd(p7, mmul(uint64(core[7 - j]) % prime, coefficient, prime), prime)
    for j in range(9):
        coefficient = choose_u64(siblings, j) % prime
        p8 = madd(p8, mmul(uint64(core[8 - j]) % prime, coefficient, prime), prime)
    for j in range(1, 10):
        coefficient = choose_u64(siblings, j) % prime
        open9 = madd(open9, mmul(uint64(core[9 - j]) % prime, coefficient, prime), prime)

    q8 = mmul(uint64(16), mmul(p8, p8, prime), prime)
    q8 = msub(q8, mmul(p7, p8, prime), prime)
    q8 = msub(q8, mmul(uint64(18), mmul(p7, open9, prime), prime), prime)
    cq = mmul(uint64(16), mmul(uint64(core[8]) % prime, uint64(core[8]) % prime, prime), prime)
    cq = msub(cq, mmul(uint64(core[7]) % prime, uint64(core[8]) % prime, prime), prime)
    hq = mmul(uint64(14), mmul(uint64(deleted[7]) % prime, uint64(deleted[7]) % prime, prime), prime)
    hq = msub(hq, mmul(uint64(deleted[6]) % prime, uint64(deleted[7]) % prime, prime), prime)

    first = mmul(uint64(8), uint64(core[7]) % prime, prime)
    first = mmul(first, uint64(deleted[6]) % prime, prime)
    first = mmul(first, q8, prime)
    second = mmul(uint64(8), uint64(deleted[6]) % prime, prime)
    second = mmul(second, p7, prime)
    second = mmul(second, cq, prime)
    third = mmul(uint64(9), uint64(core[7]) % prime, prime)
    third = mmul(third, p7, prime)
    third = mmul(third, hq, prime)
    return msub(msub(first, second, prime), third, prime)


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
    varying = varying_rows[ray]
    lengths[varying] += shift_rows[ray] + point

    left_free = cuda.local.array(WIDTH, dtype=uint64)
    left_blocked = cuda.local.array(WIDTH, dtype=uint64)
    right_free = cuda.local.array(WIDTH, dtype=uint64)
    right_blocked = cuda.local.array(WIDTH, dtype=uint64)
    pendant_free = cuda.local.array(WIDTH, dtype=uint64)
    pendant_blocked = cuda.local.array(WIDTH, dtype=uint64)
    scratch = cuda.local.array(WIDTH, dtype=uint64)
    deleted = cuda.local.array(WIDTH, dtype=uint64)
    selected_unshifted = cuda.local.array(WIDTH, dtype=uint64)
    selected = cuda.local.array(WIDTH, dtype=uint64)
    core = cuda.local.array(WIDTH, dtype=uint64)

    far_parts(lengths[0], lengths[1], lengths[2], lengths[3], lengths[4], left_free, left_blocked)
    far_parts(lengths[5], lengths[6], lengths[7], lengths[8], lengths[9], right_free, right_blocked)
    path_into(lengths[10], pendant_free)
    path_into(lengths[10] - 1, pendant_blocked)
    vector_mul(left_free, right_free, scratch)
    vector_mul(scratch, pendant_free, deleted)
    vector_mul(left_blocked, right_blocked, scratch)
    vector_mul(scratch, pendant_blocked, selected_unshifted)
    vector_shift(selected_unshifted, 1, selected)
    vector_add(deleted, selected, core)

    for prime_index in range(PRIME_COUNT):
        prime = uint64(primes[prime_index])
        r1 = residual_mod(core, deleted, 1, prime)
        r2 = residual_mod(core, deleted, 2, prime)
        r3 = residual_mod(core, deleted, 3, prime)
        r4 = residual_mod(core, deleted, 4, prime)
        d0 = r1
        d1 = msub(r2, r1, prime)
        d2 = madd(msub(r3, mmul(uint64(2), r2, prime), prime), r1, prime)
        d3 = msub(
            madd(msub(r4, mmul(uint64(3), r3, prime), prime), mmul(uint64(3), r2, prime), prime),
            r1,
            prime,
        )
        base = (((ray * PRIME_COUNT + prime_index) * RANKS) * POINTS) + point
        stride = POINTS
        output[base] = uint32(d0)
        output[base + stride] = uint32(d1)
        output[base + 2 * stride] = uint32(d2)
        output[base + 3 * stride] = uint32(d3)


@cuda.jit
def differences_kernel(residues, primes, ray_count):
    flat = cuda.grid(1)
    total = ray_count * PRIME_COUNT * RANKS
    if flat >= total:
        return
    rank = flat % RANKS
    quotient = flat // RANKS
    prime_index = quotient % PRIME_COUNT
    ray = quotient // PRIME_COUNT
    prime = uint64(primes[prime_index])
    base = (((ray * PRIME_COUNT + prime_index) * RANKS + rank) * POINTS)
    work = cuda.local.array(POINTS, dtype=uint32)
    for point in range(POINTS):
        work[point] = residues[base + point]
    width = POINTS
    for power in range(POINTS):
        residues[base + power] = work[0]
        for point in range(width - 1):
            work[point] = uint32(
                (uint64(work[point + 1]) + prime - uint64(work[point])) % prime
            )
        width -= 1


@cuda.jit
def classify_coefficients_kernel(
    residues, primes, inverses, modulus_limbs, degree_bounds, ray_count, codes
):
    flat = cuda.grid(1)
    total = ray_count * RANKS * POINTS
    if flat >= total:
        return
    power = flat % POINTS
    quotient = flat // POINTS
    rank = quotient % RANKS
    ray = quotient // RANKS
    x = cuda.local.array(LIMBS, dtype=uint32)
    modulus = cuda.local.array(LIMBS, dtype=uint32)
    for limb in range(LIMBS):
        x[limb] = uint32(0)
        modulus[limb] = uint32(0)
    first_base = (((ray * PRIME_COUNT) * RANKS + rank) * POINTS) + power
    x[0] = residues[first_base]
    modulus[0] = primes[0]

    for prime_index in range(1, PRIME_COUNT):
        prime = uint64(primes[prime_index])
        residue_base = (((ray * PRIME_COUNT + prime_index) * RANKS + rank) * POINTS) + power
        residue = uint64(residues[residue_base])
        x_mod = uint64(0)
        for limb in range(LIMBS - 1, -1, -1):
            x_mod = ((x_mod << uint64(32)) + uint64(x[limb])) % prime
        difference = (residue + prime - x_mod) % prime
        factor = (difference * uint64(inverses[prime_index])) % prime
        carry = uint64(0)
        for limb in range(LIMBS):
            value = uint64(modulus[limb]) * factor + uint64(x[limb]) + carry
            x[limb] = uint32(value & uint64(0xFFFF_FFFF))
            carry = value >> uint64(32)
        carry = uint64(0)
        for limb in range(LIMBS):
            value = uint64(modulus[limb]) * prime + carry
            modulus[limb] = uint32(value & uint64(0xFFFF_FFFF))
            carry = value >> uint64(32)

    zero = True
    for limb in range(LIMBS):
        if x[limb] != 0:
            zero = False
    small_positive = (not zero) and x[8] == 0 and (x[7] & uint32(0x8000_0000)) == 0
    borrow = uint64(0)
    negative_high7 = uint32(0)
    negative_high8 = uint32(0)
    for limb in range(LIMBS):
        minuend = uint64(modulus_limbs[limb])
        subtrahend = uint64(x[limb]) + borrow
        if minuend >= subtrahend:
            difference = minuend - subtrahend
            borrow = uint64(0)
        else:
            difference = (uint64(1) << uint64(32)) + minuend - subtrahend
            borrow = uint64(1)
        if limb == 7:
            negative_high7 = uint32(difference)
        elif limb == 8:
            negative_high8 = uint32(difference)
    small_negative = (
        not zero
        and negative_high8 == 0
        and (negative_high7 & uint32(0x8000_0000)) == 0
    )
    if zero:
        code = uint8(1)
    elif small_positive:
        code = uint8(0)
    elif small_negative:
        code = uint8(2)
    else:
        code = uint8(3)
    codes[flat] = code


def primes31() -> list[int]:
    primes = []
    cursor = 2**31 - 1
    for _ in range(PRIME_COUNT):
        cursor = int(sp.prevprime(cursor))
        primes.append(cursor)
        cursor -= 1_000_000
    return primes


def crt_constants(primes: list[int]):
    modulus = 1
    inverses = [0]
    for index, prime in enumerate(primes):
        if index:
            inverses.append(pow(modulus % prime, -1, prime))
        modulus *= prime
    assert modulus.bit_length() > 255
    limbs = [(modulus >> (32 * index)) & 0xFFFF_FFFF for index in range(LIMBS)]
    return inverses, modulus, limbs


def rays(count: int):
    source = random.Random(0xE5C0_DA99_3202_6082)
    maxima = [8 if index in SPINES else 7 for index in range(11)]
    rows = np.empty((count, 11), dtype=np.int32)
    varying = np.empty(count, dtype=np.int32)
    shifts = np.empty(count, dtype=np.int32)
    for ray in range(count):
        row = [source.randint(1, maximum) for maximum in maxima]
        forced = source.randrange(11)
        row[forced] = maxima[forced]
        first_long = next(index for index, value in enumerate(row) if value == maxima[index])
        rows[ray] = row
        varying[ray] = first_long
        shifts[ray] = max(0, 28 - (1 + sum(row)))
    return rows, varying, shifts


def literal_check(rows, varying, shifts, primes, residues, checks: int = 8):
    view = residues.reshape(len(rows), PRIME_COUNT, RANKS, POINTS)
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
    return min(checks, len(rows)) * 3 * PRIME_COUNT * RANKS


def literal_newton_check(rows, varying, shifts, primes, coefficients, checks: int = 4):
    view = coefficients.reshape(len(rows), PRIME_COUNT, RANKS, POINTS)
    comparisons = 0
    for ray in range(min(checks, len(rows))):
        exact_rows = [[] for _ in range(RANKS)]
        for point in range(POINTS):
            lengths = [int(value) for value in rows[ray]]
            lengths[int(varying[ray])] += int(shifts[ray]) + point
            adjacency, _paths = five_cubic_path(lengths[10], tuple(lengths[:10]))
            core = forest_poly(adjacency)
            deleted = forest_poly(adjacency, frozenset({0}))
            values = literal_deltas(core, deleted)
            for rank in range(RANKS):
                exact_rows[rank].append(values[rank])
        for rank in range(RANKS):
            work = exact_rows[rank]
            exact_coefficients = []
            while work:
                exact_coefficients.append(work[0])
                work = [right - left for left, right in zip(work, work[1:])]
            for prime_index, prime in enumerate(primes):
                for power, value in enumerate(exact_coefficients):
                    assert int(view[ray, prime_index, rank, power]) == value % prime
                    comparisons += 1
    return comparisons


def main() -> None:
    count = 16_384
    prime_values = primes31()
    inverses, modulus, modulus_limbs = crt_constants(prime_values)
    rows, varying, shifts = rays(count)
    d_rows = cuda.to_device(rows)
    d_varying = cuda.to_device(varying)
    d_shifts = cuda.to_device(shifts)
    d_primes = cuda.to_device(np.asarray(prime_values, dtype=np.uint32))
    d_inverses = cuda.to_device(np.asarray(inverses, dtype=np.uint32))
    d_modulus = cuda.to_device(np.asarray(modulus_limbs, dtype=np.uint32))
    d_degrees = cuda.to_device(np.asarray([28, 28, 27, 26], dtype=np.uint32))
    output_size = count * PRIME_COUNT * RANKS * POINTS
    d_output = cuda.device_array(output_size, dtype=np.uint32)
    d_warm_codes = cuda.device_array(RANKS * POINTS, dtype=np.uint8)
    threads = 64
    blocks = (count * POINTS + threads - 1) // threads
    evaluate_kernel[1, 1](d_rows[:1], d_varying[:1], d_shifts[:1], d_primes, d_output)
    differences_kernel[1, 1](d_output, d_primes, 1)
    classify_coefficients_kernel[1, 1](
        d_output, d_primes, d_inverses, d_modulus, d_degrees, 1, d_warm_codes
    )
    cuda.synchronize()
    started = time.perf_counter()
    evaluate_kernel[blocks, threads](d_rows, d_varying, d_shifts, d_primes, d_output)
    cuda.synchronize()
    kernel_seconds = time.perf_counter() - started
    copy_started = time.perf_counter()
    residues = d_output.copy_to_host()
    copy_seconds = time.perf_counter() - copy_started
    exact_checks = literal_check(rows, varying, shifts, prime_values, residues)
    difference_threads = 128
    difference_count = count * PRIME_COUNT * RANKS
    difference_blocks = (difference_count + difference_threads - 1) // difference_threads
    difference_started = time.perf_counter()
    differences_kernel[difference_blocks, difference_threads](d_output, d_primes, count)
    cuda.synchronize()
    difference_seconds = time.perf_counter() - difference_started
    coefficient_copy_started = time.perf_counter()
    coefficients = d_output.copy_to_host()
    coefficient_copy_seconds = time.perf_counter() - coefficient_copy_started
    newton_checks = literal_newton_check(rows, varying, shifts, prime_values, coefficients)
    code_count = count * RANKS * POINTS
    d_codes = cuda.device_array(code_count, dtype=np.uint8)
    classify_threads = 128
    classify_blocks = (code_count + classify_threads - 1) // classify_threads
    classify_started = time.perf_counter()
    classify_coefficients_kernel[classify_blocks, classify_threads](
        d_output, d_primes, d_inverses, d_modulus, d_degrees, count, d_codes
    )
    cuda.synchronize()
    classify_seconds = time.perf_counter() - classify_started
    codes = d_codes.copy_to_host().reshape(count, RANKS, POINTS)
    degree_bounds = (28, 28, 27, 26)
    gate_failures = 0
    bound_failures = int(np.count_nonzero(codes == 3))
    for rank, degree in enumerate(degree_bounds):
        gate_failures += int(np.count_nonzero(codes[:, rank, 0:2] != 0))
        gate_failures += int(np.count_nonzero(codes[:, rank, 2: degree + 1] == 2))
        gate_failures += int(np.count_nonzero(codes[:, rank, 2: degree + 1] == 3))
        gate_failures += int(np.count_nonzero(codes[:, rank, degree + 1:] != 1))
    print("PASS_CUDA_REAL_PATH_CENTER_FORMULA_BENCH")
    print("RAYS", count)
    print("SAMPLE_POINTS", count * POINTS)
    print("RESIDUES", output_size)
    print("KERNEL_SECONDS", f"{kernel_seconds:.6f}")
    print("SAMPLE_POINTS_PER_SECOND", f"{count * POINTS / kernel_seconds:.3f}")
    print("RAYS_PER_SECOND_EQUIVALENT", f"{count / kernel_seconds:.3f}")
    print("COPY_SECONDS", f"{copy_seconds:.6f}")
    print("LITERAL_RESIDUE_CHECKS", exact_checks)
    print("DIFFERENCE_SECONDS", f"{difference_seconds:.6f}")
    print("COEFFICIENT_COPY_SECONDS", f"{coefficient_copy_seconds:.6f}")
    print("LITERAL_NEWTON_RESIDUE_CHECKS", newton_checks)
    print("CLASSIFY_SECONDS", f"{classify_seconds:.6f}")
    print("CLASSIFICATIONS_PER_SECOND", f"{code_count / classify_seconds:.3f}")
    print("CRT_MODULUS_BITS", modulus.bit_length())
    print("GATE_FAILURES", gate_failures)
    print("BOUND_FAILURES", bound_failures)
    print("RESIDUE_CHECKSUM", int(coefficients.astype(np.uint64).sum(dtype=np.uint64)))
    print("CODE_CHECKSUM", int(codes.astype(np.uint64).sum(dtype=np.uint64)))


if __name__ == "__main__":
    main()
