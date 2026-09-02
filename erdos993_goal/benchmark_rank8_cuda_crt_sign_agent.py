#!/usr/bin/env python3
"""Benchmark exact signed-255-bit recovery from nine 31-bit GPU residues."""

from __future__ import annotations

import os
import time
from pathlib import Path

import numpy as np
import sympy as sp


SITE = Path.home() / (
    "AppData/Local/Packages/PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0/"
    "LocalCache/local-packages/Python312/site-packages/nvidia/cuda_nvcc"
)
os.environ.setdefault("CUDA_HOME", str(SITE))

from numba import cuda, uint32, uint64  # noqa: E402
from numba.cuda.cudadrv import nvvm  # noqa: E402


nvvm.get_supported_ccs = lambda: nvvm.ccs_supported_by_ctk((12, 4))
LIMBS = 9
PRIME_COUNT = 9


@cuda.jit
def classify_kernel(count, primes, inverses, modulus_limbs, failures, checksum):
    index = cuda.grid(1)
    if index >= count:
        return
    x = cuda.local.array(LIMBS, dtype=uint32)
    modulus = cuda.local.array(LIMBS, dtype=uint32)
    for limb in range(LIMBS):
        x[limb] = uint32(0)
        modulus[limb] = uint32(0)
    magnitude = uint64(index + 1)
    negative = (index & 1) != 0
    first_prime = uint64(primes[0])
    residue = magnitude % first_prime
    if negative and residue != 0:
        residue = first_prime - residue
    x[0] = uint32(residue)
    modulus[0] = primes[0]

    for prime_index in range(1, PRIME_COUNT):
        prime = uint64(primes[prime_index])
        residue = magnitude % prime
        if negative and residue != 0:
            residue = prime - residue
        x_mod = uint64(0)
        for limb in range(LIMBS - 1, -1, -1):
            x_mod = ((x_mod << uint64(32)) + uint64(x[limb])) % prime
        difference = (residue + prime - x_mod) % prime
        factor = (difference * uint64(inverses[prime_index])) % prime
        carry = uint64(0)
        for limb in range(LIMBS):
            product = uint64(modulus[limb]) * factor + uint64(x[limb]) + carry
            x[limb] = uint32(product & uint64(0xFFFF_FFFF))
            carry = product >> uint64(32)
        carry = uint64(0)
        for limb in range(LIMBS):
            product = uint64(modulus[limb]) * prime + carry
            modulus[limb] = uint32(product & uint64(0xFFFF_FFFF))
            carry = product >> uint64(32)

    positive = x[8] == 0 and (x[7] & uint32(0x8000_0000)) == 0
    if negative:
        borrow = uint64(0)
        small_negative = True
        high_limb = uint32(0)
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
                high_limb = uint32(difference)
            if limb == 8 and difference != 0:
                small_negative = False
        if (high_limb & uint32(0x8000_0000)) != 0:
            small_negative = False
        if not small_negative or positive:
            cuda.atomic.add(failures, 0, 1)
    elif not positive:
        cuda.atomic.add(failures, 0, 1)
    cuda.atomic.add(checksum, 0, uint64(x[0]) ^ uint64(index))


def limbs(value: int) -> list[int]:
    return [(value >> (32 * index)) & 0xFFFF_FFFF for index in range(LIMBS)]


def main() -> None:
    primes = []
    cursor = 2**31 - 1
    for _ in range(PRIME_COUNT):
        cursor = int(sp.prevprime(cursor))
        primes.append(cursor)
        cursor -= 1_000_000
    modulus = 1
    inverses = [0]
    for index, prime in enumerate(primes):
        if index:
            inverses.append(pow(modulus % prime, -1, prime))
        modulus *= prime
    assert modulus.bit_length() > 255
    count = 5_000_000
    failures = np.zeros(1, dtype=np.uint64)
    checksum = np.zeros(1, dtype=np.uint64)
    d_primes = cuda.to_device(np.asarray(primes, dtype=np.uint32))
    d_inverses = cuda.to_device(np.asarray(inverses, dtype=np.uint32))
    d_modulus = cuda.to_device(np.asarray(limbs(modulus), dtype=np.uint32))
    d_failures = cuda.to_device(failures)
    d_checksum = cuda.to_device(checksum)
    blocks = (count + 255) // 256
    classify_kernel[1, 1](1, d_primes, d_inverses, d_modulus, d_failures, d_checksum)
    cuda.synchronize()
    d_failures.copy_to_device(failures)
    d_checksum.copy_to_device(checksum)
    started = time.perf_counter()
    classify_kernel[blocks, 256](count, d_primes, d_inverses, d_modulus, d_failures, d_checksum)
    cuda.synchronize()
    elapsed = time.perf_counter() - started
    failures = d_failures.copy_to_host()
    checksum = d_checksum.copy_to_host()
    print("PASS_CUDA_CRT_SIGN_BENCH" if failures[0] == 0 else "FAIL_CUDA_CRT_SIGN_BENCH")
    print("COUNT", count)
    print("SECONDS", f"{elapsed:.6f}")
    print("CLASSIFICATIONS_PER_SECOND", f"{count / elapsed:.3f}")
    print("MODULUS_BITS", modulus.bit_length())
    print("FAILURES", int(failures[0]))
    print("CHECKSUM", int(checksum[0]))


if __name__ == "__main__":
    main()
