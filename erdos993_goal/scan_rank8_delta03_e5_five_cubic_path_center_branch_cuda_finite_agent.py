#!/usr/bin/env python3
"""Checkpointed CUDA scan of path:center_branch all-short finite patterns."""

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
import scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent as rays  # noqa: E402
from numba import cuda, uint8, uint32, uint64  # noqa: E402


ROOT = Path(__file__).resolve().parent
CHECKPOINT = ROOT / "rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_checkpoint_agent_20260825.json"
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_exact_agent_20260825.json"
EXPECTED = {
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "certify_rank8_delta03_e5_five_cubic_path_center_branch_newton_reduction_agent.py":
        "E966426A32A4648AC1164C0BA92342B8CB3D6B5C52E2AFED8CA021382685C37F",
    "rank8_delta03_e5_five_cubic_path_center_branch_newton_reduction_exact_agent_20260825.json":
        "01AD31A3D91E6FE8AA2A3F467AD7C3EA9C0E7BD0AF2BA7B31884B92DEBAE00BF",
}
DEFAULT_BATCH = 5_000_000
WIDTH = 9
LIMBS = 9


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


@cuda.jit
def evaluate_finite_kernel(length_rows, primes, output):
    row = cuda.grid(1)
    if row >= length_rows.shape[0]:
        return
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
    engine.far_parts(
        length_rows[row, 0], length_rows[row, 1], length_rows[row, 2],
        length_rows[row, 3], length_rows[row, 4], left_free, left_blocked,
    )
    engine.far_parts(
        length_rows[row, 5], length_rows[row, 6], length_rows[row, 7],
        length_rows[row, 8], length_rows[row, 9], right_free, right_blocked,
    )
    engine.path_into(length_rows[row, 10], pendant_free)
    engine.path_into(length_rows[row, 10] - 1, pendant_blocked)
    engine.vector_mul(left_free, right_free, scratch)
    engine.vector_mul(scratch, pendant_free, deleted)
    engine.vector_mul(left_blocked, right_blocked, scratch)
    engine.vector_mul(scratch, pendant_blocked, selected_unshifted)
    engine.vector_shift(selected_unshifted, 1, selected)
    engine.vector_add(deleted, selected, core)
    for prime_index in range(engine.PRIME_COUNT):
        prime = uint64(primes[prime_index])
        r1 = engine.residual_mod(core, deleted, 1, prime)
        r2 = engine.residual_mod(core, deleted, 2, prime)
        r3 = engine.residual_mod(core, deleted, 3, prime)
        r4 = engine.residual_mod(core, deleted, 4, prime)
        d0 = r1
        d1 = engine.msub(r2, r1, prime)
        d2 = engine.madd(
            engine.msub(r3, engine.mmul(uint64(2), r2, prime), prime), r1, prime
        )
        d3 = engine.msub(
            engine.madd(
                engine.msub(r4, engine.mmul(uint64(3), r3, prime), prime),
                engine.mmul(uint64(3), r2, prime),
                prime,
            ),
            r1,
            prime,
        )
        base = (row * engine.PRIME_COUNT + prime_index) * engine.RANKS
        output[base] = uint32(d0)
        output[base + 1] = uint32(d1)
        output[base + 2] = uint32(d2)
        output[base + 3] = uint32(d3)


@cuda.jit
def classify_finite_kernel(residues, primes, inverses, modulus_limbs, row_count, codes):
    flat = cuda.grid(1)
    total = row_count * engine.RANKS
    if flat >= total:
        return
    rank = flat % engine.RANKS
    row = flat // engine.RANKS
    x = cuda.local.array(LIMBS, dtype=uint32)
    modulus = cuda.local.array(LIMBS, dtype=uint32)
    for limb in range(LIMBS):
        x[limb] = uint32(0)
        modulus[limb] = uint32(0)
    x[0] = residues[(row * engine.PRIME_COUNT) * engine.RANKS + rank]
    modulus[0] = primes[0]
    for prime_index in range(1, engine.PRIME_COUNT):
        prime = uint64(primes[prime_index])
        residue = uint64(
            residues[(row * engine.PRIME_COUNT + prime_index) * engine.RANKS + rank]
        )
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
    positive = (not zero) and x[8] == 0 and (x[7] & uint32(0x8000_0000)) == 0
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
    negative = (
        not zero
        and negative_high8 == 0
        and (negative_high7 & uint32(0x8000_0000)) == 0
    )
    if positive:
        code = uint8(0)
    elif zero:
        code = uint8(1)
    elif negative:
        code = uint8(2)
    else:
        code = uint8(3)
    codes[flat] = code


@cuda.jit
def finite_fingerprint_kernel(residues, row_count, first, second):
    row = cuda.grid(1)
    if row >= row_count:
        return
    h1 = uint64(0xCBF29CE484222325) ^ uint64(row)
    h2 = uint64(0x9E3779B97F4A7C15) + uint64(row)
    base = row * engine.PRIME_COUNT * engine.RANKS
    width = engine.PRIME_COUNT * engine.RANKS
    for index in range(width):
        value = uint64(residues[base + index])
        h1 = (h1 ^ value) * uint64(0x100000001B3)
        h2 ^= value + uint64(0x9E3779B97F4A7C15) + (h2 << uint64(6)) + (h2 >> uint64(2))
    first[row] = h1
    second[row] = h2


def finite_rows(start, stop, halves, half_sums, half_masks):
    left, right, center = rays.decode_batch(start, stop)
    masks = (
        half_masks[left]
        | (half_masks[right] << np.uint16(5))
        | ((center == 7).astype(np.uint16) << np.uint16(10))
    )
    orders = 1 + half_sums[left] + half_sums[right] + center
    all_short_selector = masks == 0
    finite_selector = all_short_selector & (orders >= 28)
    order27 = int(np.count_nonzero(all_short_selector & (orders == 27)))
    finite_left = left[finite_selector]
    finite_right = right[finite_selector]
    finite_center = center[finite_selector]
    rows = np.empty((len(finite_left), 11), dtype=np.int32)
    rows[:, :5] = halves[finite_left]
    rows[:, 5:10] = halves[finite_right]
    rows[:, 10] = finite_center
    return rows, int(np.count_nonzero(all_short_selector)), order27


def checkpoint(batch_size, dependencies):
    if not CHECKPOINT.exists():
        return {
            "schema": "rank8-delta03-e5-five-cubic-path-center-branch-cuda-finite-checkpoint-agent-v1",
            "dependencies": dependencies,
            "batch_size": batch_size,
            "cursor": 0,
            "batches": [],
            "totals": {
                "patterns": 0, "all_short": 0, "finite": 0, "order27": 0,
                "positive_values": 0, "nonpositive_values": 0, "bound_failures": 0,
            },
        }
    result = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    assert result["dependencies"] == dependencies and result["batch_size"] == batch_size
    assert result["cursor"] == (result["batches"][-1]["stop"] if result["batches"] else 0)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH)
    parser.add_argument("--max-batches", type=int)
    args = parser.parse_args()
    assert 1 <= args.batch_size <= DEFAULT_BATCH
    dependencies = {name: sha256(ROOT / name) for name in EXPECTED}
    assert dependencies == EXPECTED
    halves, half_sums, half_masks = rays.half_table()
    state = checkpoint(args.batch_size, dependencies)
    if state["cursor"] == rays.TOTAL_PATTERNS:
        print("ALREADY_COMPLETE", sha256(CHECKPOINT))
        return
    prime_values = engine.primes31()
    inverses, modulus, modulus_limbs = engine.crt_constants(prime_values)
    capacity = args.batch_size
    d_rows = cuda.device_array((capacity, 11), dtype=np.int32)
    d_primes = cuda.to_device(np.asarray(prime_values, dtype=np.uint32))
    d_inverses = cuda.to_device(np.asarray(inverses, dtype=np.uint32))
    d_modulus = cuda.to_device(np.asarray(modulus_limbs, dtype=np.uint32))
    d_residues = cuda.device_array(capacity * engine.PRIME_COUNT * engine.RANKS, dtype=np.uint32)
    d_codes = cuda.device_array(capacity * engine.RANKS, dtype=np.uint8)
    d_first = cuda.device_array(capacity, dtype=np.uint64)
    d_second = cuda.device_array(capacity, dtype=np.uint64)
    warm = np.asarray([[7, 6, 7, 6, 6, 7, 6, 7, 6, 6, 6]], dtype=np.int32)
    d_rows[:1].copy_to_device(warm)
    evaluate_finite_kernel[1, 1](d_rows[:1], d_primes, d_residues)
    classify_finite_kernel[1, 1](d_residues, d_primes, d_inverses, d_modulus, 1, d_codes)
    finite_fingerprint_kernel[1, 1](d_residues, 1, d_first, d_second)
    cuda.synchronize()
    warm_residues = d_residues[:engine.PRIME_COUNT * engine.RANKS].copy_to_host()
    warm_adjacency, _paths = engine.five_cubic_path(int(warm[0, 10]), tuple(map(int, warm[0, :10])))
    warm_core = engine.forest_poly(warm_adjacency)
    warm_deleted = engine.forest_poly(warm_adjacency, frozenset({0}))
    warm_exact = engine.literal_deltas(warm_core, warm_deleted)
    for prime_index, prime in enumerate(prime_values):
        for rank in range(engine.RANKS):
            assert int(warm_residues[prime_index * engine.RANKS + rank]) == warm_exact[rank] % prime
    completed = 0
    run_started = time.perf_counter()
    while state["cursor"] < rays.TOTAL_PATTERNS:
        if args.max_batches is not None and completed >= args.max_batches:
            break
        start = state["cursor"]
        stop = min(rays.TOTAL_PATTERNS, start + args.batch_size)
        batch_started = time.perf_counter()
        rows, all_short, order27 = finite_rows(start, stop, halves, half_sums, half_masks)
        count = len(rows)
        if count:
            d_rows[:count].copy_to_device(rows)
            threads = 64
            evaluate_finite_kernel[(count + threads - 1) // threads, threads](
                d_rows[:count], d_primes, d_residues
            )
            classify_threads = 128
            classify_finite_kernel[
                (count * engine.RANKS + classify_threads - 1) // classify_threads,
                classify_threads,
            ](d_residues, d_primes, d_inverses, d_modulus, count, d_codes)
            finite_fingerprint_kernel[(count + 127) // 128, 128](
                d_residues, count, d_first, d_second
            )
            cuda.synchronize()
            codes = d_codes[:count * engine.RANKS].copy_to_host()
            nonpositive = int(np.count_nonzero(codes != 0))
            bounds = int(np.count_nonzero(codes == 3))
            assert nonpositive == 0 and bounds == 0
            fingerprints = np.empty((count, 2), dtype="<u8")
            fingerprints[:, 0] = d_first[:count].copy_to_host()
            fingerprints[:, 1] = d_second[:count].copy_to_host()
            fingerprint_body = fingerprints.tobytes(order="C")
        else:
            nonpositive = 0
            bounds = 0
            fingerprint_body = b""
        batch = {
            "start": start, "stop": stop, "patterns": stop - start,
            "all_short": all_short, "finite": count, "order27": order27,
            "positive_values": count * engine.RANKS,
            "nonpositive_values": nonpositive, "bound_failures": bounds,
            "residue_fingerprint_sha256": hashlib.sha256(fingerprint_body).hexdigest().upper(),
            "elapsed_seconds": time.perf_counter() - batch_started,
        }
        state["batches"].append(batch)
        state["cursor"] = stop
        for key in state["totals"]:
            state["totals"][key] += batch[key]
        atomic_json(CHECKPOINT, state)
        completed += 1
        if completed == 1 or completed % 5 == 0 or stop == rays.TOTAL_PATTERNS:
            print(
                "FINITE_BATCH_PASS", len(state["batches"]), start, stop, count,
                f"{batch['elapsed_seconds']:.3f}", "RUN_FINITE_PER_SECOND",
                f"{state['totals']['finite'] / max(time.perf_counter() - run_started, 1e-9):.1f}",
                flush=True,
            )
    if state["cursor"] != rays.TOTAL_PATTERNS:
        print("CHECKPOINTED", state["cursor"], sha256(CHECKPOINT))
        return
    totals = state["totals"]
    assert totals["patterns"] == rays.TOTAL_PATTERNS
    assert totals["all_short"] == rays.EXPECTED_ALL_SHORT
    assert totals["finite"] == rays.EXPECTED_FINITE
    assert totals["order27"] == rays.EXPECTED_ORDER27
    assert totals["positive_values"] == rays.EXPECTED_FINITE * engine.RANKS
    assert totals["nonpositive_values"] == totals["bound_failures"] == 0
    batch_body = "".join(
        json.dumps(batch, sort_keys=True, separators=(",", ":")) + "\n"
        for batch in state["batches"]
    )
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-path-center-branch-cuda-finite-exact-agent-v1",
        "status": "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_CENTER_BRANCH_FINITE",
        "root_orbit": "five_cubic_path:center_branch",
        "domain": "all canonical all-short patterns of order at least 28",
        "totals": totals,
        "crt_prime_count": len(prime_values),
        "crt_modulus_bits": modulus.bit_length(),
        "literal_residue_preflight_checks": engine.PRIME_COUNT * engine.RANKS,
        "batch_manifest_sha256": hashlib.sha256(batch_body.encode("utf-8")).hexdigest().upper(),
        "checkpoint_sha256": sha256(CHECKPOINT),
        "immutable_input_hashes": dependencies,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Finite all-short patterns only; Newton rays require the separate ray report.",
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
