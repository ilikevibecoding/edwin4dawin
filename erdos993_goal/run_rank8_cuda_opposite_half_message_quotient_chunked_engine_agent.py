#!/usr/bin/env python3
"""Low-memory exact engine for an opposite-half quotient batch.

The engine keeps the original batch boundary and raw-ray ordinal.  Canonical
groups are evaluated in bounded GPU chunks, Newton-differenced once, expanded
into compact member buffers, classified, and fingerprinted with each member's
original raw ordinal.  The final fingerprint byte array is therefore in the
same order and uses the same seeds as the legacy full-batch implementation,
without allocating a multi-gigabyte full raw residue buffer.
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from numba import cuda, uint64

import benchmark_rank8_cuda_path_center_formula_agent as common
import run_rank8_cuda_opposite_half_message_quotient_driver_agent as quotient
import scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent as center


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "run_rank8_cuda_opposite_half_message_quotient_driver_agent.py":
        "F85FA0522D9DF83D344150B90D417E0F5A0DB6BCB46AE1A338C13366B7FBA864",
    "certify_rank8_delta03_e5_five_cubic_path_opposite_half_quotient_all_layouts_agent.py":
        "64B5B830FCA22EC45B96F2FBCFF429F6EE021438D75F3AD568DA6876119540FA",
    "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_all_layouts_exact_agent_20260825.json":
        "DFAF77DFFF213F5C0B1D12CA6EEEDCFB4B252493B6E452D2A93D5249CFADA2F3",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
}
WIDTH = common.PRIME_COUNT * common.RANKS * common.POINTS
CODE_WIDTH = common.RANKS * common.POINTS


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def validate_inputs() -> dict[str, str]:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    certificate = json.loads(
        (ROOT / (
            "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_"
            "all_layouts_exact_agent_20260825.json"
        )).read_text(encoding="utf-8")
    )
    assert certificate["status"] == (
        "PASS_EXACT_PINNED_ALL_LAYOUT_OPPOSITE_HALF_COMPUTATIONAL_"
        "QUOTIENT_NO_ORBIT_SIGN_CREDIT"
    )
    return actual


@dataclass(frozen=True)
class PassResult:
    raw_rays: int
    evaluated_rows: int
    gpu_chunks: int
    statistics: dict[str, int]
    residue_fingerprint_sha256: str
    elapsed_seconds: float
    original_kernel_first_chunk_fingerprint_match: bool | None


@cuda.jit
def expand_group_members_compact_kernel(
    grouped_residues,
    local_group_by_member,
    member_count,
    width,
    member_residues,
):
    flat = cuda.grid(1)
    total = member_count * width
    if flat >= total:
        return
    member = flat // width
    offset = flat - member * width
    group = local_group_by_member[member]
    member_residues[flat] = grouped_residues[group * width + offset]


@cuda.jit
def fingerprint_raw_ordinals_kernel(
    residues, raw_ordinals, member_count, first, second
):
    member = cuda.grid(1)
    if member >= member_count:
        return
    raw = uint64(raw_ordinals[member])
    h1 = uint64(0xCBF29CE484222325) ^ raw
    h2 = uint64(0x9E3779B97F4A7C15) + raw
    base = member * WIDTH
    for index in range(WIDTH):
        value = uint64(residues[base + index])
        h1 = (h1 ^ value) * uint64(0x100000001B3)
        h2 ^= (
            value
            + uint64(0x9E3779B97F4A7C15)
            + (h2 << uint64(6))
            + (h2 >> uint64(2))
        )
    first[member] = h1
    second[member] = h2


def zero_statistics() -> dict[str, int]:
    return {
        "gate_failures": 0,
        "bound_failures": 0,
        "negative_classifications": 0,
        "positive_active_coefficients": 0,
        "zero_active_coefficients": 0,
        "zero_degree_overflow_coefficients": 0,
    }


def add_statistics(total: dict[str, int], increment: dict[str, int]) -> None:
    assert total.keys() == increment.keys()
    for key in total:
        total[key] += int(increment[key])


@dataclass
class Devices:
    primes: object
    inverses: object
    modulus: object
    degrees: object


def common_devices() -> tuple[Devices, list[int]]:
    primes = common.primes31()
    inverses, _, modulus_limbs = common.crt_constants(primes)
    return (
        Devices(
            primes=cuda.to_device(np.asarray(primes, dtype=np.uint32)),
            inverses=cuda.to_device(np.asarray(inverses, dtype=np.uint32)),
            modulus=cuda.to_device(np.asarray(modulus_limbs, dtype=np.uint32)),
            degrees=cuda.to_device(np.asarray(center.DEGREES, dtype=np.uint32)),
        ),
        primes,
    )


def classify_and_fingerprint(
    residues,
    count: int,
    raw_ordinals: np.ndarray,
    devices: Devices,
    d_codes,
    d_raw_ordinals,
    d_first,
    d_second,
) -> tuple[dict[str, int], np.ndarray]:
    assert raw_ordinals.shape == (count,)
    d_raw_ordinals[:count].copy_to_device(raw_ordinals)
    code_work = count * CODE_WIDTH
    common.classify_coefficients_kernel[(code_work + 127) // 128, 128](
        residues,
        devices.primes,
        devices.inverses,
        devices.modulus,
        devices.degrees,
        count,
        d_codes[:code_work],
    )
    fingerprint_raw_ordinals_kernel[(count + 127) // 128, 128](
        residues,
        d_raw_ordinals[:count],
        count,
        d_first[:count],
        d_second[:count],
    )
    cuda.synchronize()
    codes = d_codes[:code_work].copy_to_host().reshape(
        count, common.RANKS, common.POINTS
    )
    statistics = center.validate_codes(codes)
    fingerprints = np.empty((count, 2), dtype="<u8")
    fingerprints[:, 0] = d_first[:count].copy_to_host()
    fingerprints[:, 1] = d_second[:count].copy_to_host()
    return statistics, fingerprints


def legacy_pass(
    rows: np.ndarray,
    varying: np.ndarray,
    shifts: np.ndarray,
    evaluate_kernel,
    chunk_capacity: int = 20_000,
) -> PassResult:
    """Low-memory replay of the original raw-row batch fingerprint."""
    validate_inputs()
    raw_count = len(rows)
    assert varying.shape == shifts.shape == (raw_count,)
    devices, _ = common_devices()
    capacity = min(max(raw_count, 1), chunk_capacity)
    d_rows = cuda.device_array((capacity, 12), dtype=np.int32)
    d_varying = cuda.device_array(capacity, dtype=np.int32)
    d_shifts = cuda.device_array(capacity, dtype=np.int32)
    d_residues = cuda.device_array(capacity * WIDTH, dtype=np.uint32)
    d_codes = cuda.device_array(capacity * CODE_WIDTH, dtype=np.uint8)
    d_raw_ordinals = cuda.device_array(capacity, dtype=np.int32)
    d_first = cuda.device_array(capacity, dtype=np.uint64)
    d_second = cuda.device_array(capacity, dtype=np.uint64)
    d_original_first = cuda.device_array(capacity, dtype=np.uint64)
    d_original_second = cuda.device_array(capacity, dtype=np.uint64)

    all_fingerprints = np.empty((raw_count, 2), dtype="<u8")
    totals = zero_statistics()
    chunks = 0
    original_match: bool | None = None
    started = time.perf_counter()
    for start in range(0, raw_count, capacity):
        stop = min(raw_count, start + capacity)
        count = stop - start
        d_rows[:count].copy_to_device(rows[start:stop])
        d_varying[:count].copy_to_device(varying[start:stop])
        d_shifts[:count].copy_to_device(shifts[start:stop])
        evaluate_kernel[(count * common.POINTS + 63) // 64, 64](
            d_rows[:count],
            d_varying[:count],
            d_shifts[:count],
            devices.primes,
            d_residues[:count * WIDTH],
        )
        difference_work = count * common.PRIME_COUNT * common.RANKS
        common.differences_kernel[(difference_work + 127) // 128, 128](
            d_residues[:count * WIDTH], devices.primes, count
        )
        raw_ordinals = np.arange(start, stop, dtype=np.int32)
        stats, fingerprints = classify_and_fingerprint(
            d_residues[:count * WIDTH],
            count,
            raw_ordinals,
            devices,
            d_codes,
            d_raw_ordinals,
            d_first,
            d_second,
        )
        if start == 0:
            center.fingerprint_kernel[(count + 127) // 128, 128](
                d_residues[:count * WIDTH],
                count,
                d_original_first[:count],
                d_original_second[:count],
            )
            cuda.synchronize()
            original = np.empty((count, 2), dtype="<u8")
            original[:, 0] = d_original_first[:count].copy_to_host()
            original[:, 1] = d_original_second[:count].copy_to_host()
            original_match = bool(np.array_equal(original, fingerprints))
            assert original_match
        add_statistics(totals, stats)
        all_fingerprints[start:stop] = fingerprints
        chunks += 1
    fingerprint = hashlib.sha256(
        all_fingerprints.tobytes(order="C")
    ).hexdigest().upper()
    return PassResult(
        raw_rays=raw_count,
        evaluated_rows=raw_count,
        gpu_chunks=chunks,
        statistics=totals,
        residue_fingerprint_sha256=fingerprint,
        elapsed_seconds=time.perf_counter() - started,
        original_kernel_first_chunk_fingerprint_match=original_match,
    )


def grouped_pass(
    batch: quotient.QuotientBatch,
    evaluate_kernel,
    group_capacity: int = 20_000,
    member_capacity: int = 40_000,
) -> PassResult:
    """Evaluate each batch-local canonical group once and restore raw order."""
    validate_inputs()
    raw_count = batch.raw_rays
    group_count = batch.quotient_groups
    assert group_count == len(batch.group_rows)
    assert raw_count == len(batch.raw_to_group)
    assert int(batch.group_multiplicities.sum(dtype=np.int64)) == raw_count
    assert int(batch.group_multiplicities.max(initial=0)) <= member_capacity

    members = np.argsort(batch.raw_to_group, kind="stable").astype(
        np.int32, copy=False
    )
    offsets = np.empty(group_count + 1, dtype=np.int64)
    offsets[0] = 0
    np.cumsum(batch.group_multiplicities, dtype=np.int64, out=offsets[1:])
    assert offsets[-1] == raw_count
    assert np.array_equal(
        batch.raw_to_group[members],
        np.repeat(
            np.arange(group_count, dtype=np.int32),
            batch.group_multiplicities,
        ),
    )

    devices, _ = common_devices()
    group_capacity = min(max(group_count, 1), group_capacity)
    member_capacity = min(max(raw_count, 1), member_capacity)
    d_group_rows = cuda.device_array((group_capacity, 12), dtype=np.int32)
    d_group_varying = cuda.device_array(group_capacity, dtype=np.int32)
    d_group_shifts = cuda.device_array(group_capacity, dtype=np.int32)
    d_group_residues = cuda.device_array(group_capacity * WIDTH, dtype=np.uint32)
    d_member_residues = cuda.device_array(member_capacity * WIDTH, dtype=np.uint32)
    d_local_group = cuda.device_array(member_capacity, dtype=np.int32)
    d_codes = cuda.device_array(member_capacity * CODE_WIDTH, dtype=np.uint8)
    d_raw_ordinals = cuda.device_array(member_capacity, dtype=np.int32)
    d_first = cuda.device_array(member_capacity, dtype=np.uint64)
    d_second = cuda.device_array(member_capacity, dtype=np.uint64)

    all_fingerprints = np.empty((raw_count, 2), dtype="<u8")
    seen = np.zeros(raw_count, dtype=np.bool_)
    totals = zero_statistics()
    chunks = 0
    g0 = 0
    started = time.perf_counter()
    while g0 < group_count:
        by_group_capacity = min(group_count, g0 + group_capacity)
        member_limit = offsets[g0] + member_capacity
        by_member_capacity = int(
            np.searchsorted(offsets, member_limit, side="right") - 1
        )
        g1 = min(by_group_capacity, by_member_capacity)
        if g1 <= g0:
            g1 = g0 + 1
        member_start = int(offsets[g0])
        member_stop = int(offsets[g1])
        raw_ordinals = np.ascontiguousarray(
            members[member_start:member_stop], dtype=np.int32
        )
        local_group = np.ascontiguousarray(
            batch.raw_to_group[raw_ordinals] - g0, dtype=np.int32
        )
        groups = g1 - g0
        member_count = len(raw_ordinals)
        assert groups <= group_capacity and member_count <= member_capacity
        assert np.all((local_group >= 0) & (local_group < groups))
        assert not np.any(seen[raw_ordinals])
        seen[raw_ordinals] = True

        d_group_rows[:groups].copy_to_device(batch.group_rows[g0:g1])
        d_group_varying[:groups].copy_to_device(batch.group_varying[g0:g1])
        d_group_shifts[:groups].copy_to_device(batch.group_shifts[g0:g1])
        evaluate_kernel[(groups * common.POINTS + 63) // 64, 64](
            d_group_rows[:groups],
            d_group_varying[:groups],
            d_group_shifts[:groups],
            devices.primes,
            d_group_residues[:groups * WIDTH],
        )
        difference_work = groups * common.PRIME_COUNT * common.RANKS
        common.differences_kernel[(difference_work + 127) // 128, 128](
            d_group_residues[:groups * WIDTH], devices.primes, groups
        )
        d_local_group[:member_count].copy_to_device(local_group)
        expansion_work = member_count * WIDTH
        expand_group_members_compact_kernel[
            (expansion_work + 127) // 128, 128
        ](
            d_group_residues[:groups * WIDTH],
            d_local_group[:member_count],
            member_count,
            WIDTH,
            d_member_residues[:member_count * WIDTH],
        )
        stats, fingerprints = classify_and_fingerprint(
            d_member_residues[:member_count * WIDTH],
            member_count,
            raw_ordinals,
            devices,
            d_codes,
            d_raw_ordinals,
            d_first,
            d_second,
        )
        add_statistics(totals, stats)
        all_fingerprints[raw_ordinals] = fingerprints
        g0 = g1
        chunks += 1
    assert np.all(seen)
    fingerprint = hashlib.sha256(
        all_fingerprints.tobytes(order="C")
    ).hexdigest().upper()
    return PassResult(
        raw_rays=raw_count,
        evaluated_rows=group_count,
        gpu_chunks=chunks,
        statistics=totals,
        residue_fingerprint_sha256=fingerprint,
        elapsed_seconds=time.perf_counter() - started,
        original_kernel_first_chunk_fingerprint_match=None,
    )
