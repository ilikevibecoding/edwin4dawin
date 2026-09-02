#!/usr/bin/env python3
"""Pinned batch-local quotient utilities for five-cubic-path CUDA rays.

The selected side is never changed.  The designated five-coordinate
opposite half is replaced by the canonical representative of its exact
rank-eight parent-message class.  If the Newton-ray coordinate lies in that
half, the stronger whole-offset-curve quotient is used and the representative
ray coordinate is changed to that representative's first capped coordinate.

Raw rows remain explicitly recoverable through ``raw_to_group``.  After a
group is evaluated, its Newton residues can be expanded back into original
raw-ray order before classification and the legacy fingerprint kernel.  That
is the required route to byte-identical per-batch audit fingerprints.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np
from numba import cuda


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "certify_rank8_delta03_e5_five_cubic_path_opposite_half_message_quotient_agent.py":
        "F72BF76B0C2A32BFFE15FDCF13E9F0CDD1AE61A541519A90FCF3E3DA6876695D",
    "rank8_delta03_e5_five_cubic_path_opposite_half_message_quotient_exact_agent_20260825.json":
        "E0E9C25CA2725C9C4A7B2FEBFAC7BB4D35BCB36FD12DBEF118430834CFB8FDAB",
    "audit_rank8_delta03_e5_five_cubic_path_opposite_half_message_quotient_literal_agent.py":
        "8F5EDA6BFD274085F11A0B6DAC1E2484AD3644AFE0CECFAC57A2D765A2DD1088",
    "rank8_delta03_e5_five_cubic_path_opposite_half_message_quotient_literal_audit_agent_20260825.json":
        "DC7F2800B649AF48BC27C7EE63CCF858A61E8E5C06B5A8B973730FD8298F05B9",
}
CERTIFICATE = ROOT / (
    "rank8_delta03_e5_five_cubic_path_opposite_half_message_quotient_"
    "exact_agent_20260825.json"
)
AUDIT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_opposite_half_message_quotient_"
    "literal_audit_agent_20260825.json"
)
MAXIMA = np.asarray((8, 7, 8, 7, 7), dtype=np.int32)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


@dataclass(frozen=True)
class QuotientTables:
    halves: np.ndarray
    half_sums: np.ndarray
    static_representatives: np.ndarray
    dynamic_representatives: np.ndarray
    first_long: np.ndarray
    state_index_by_code: np.ndarray
    mapping_arrays_sha256: str
    immutable_input_hashes: dict[str, str]


@dataclass(frozen=True)
class QuotientBatch:
    group_rows: np.ndarray
    group_varying: np.ndarray
    group_shifts: np.ndarray
    raw_to_group: np.ndarray
    group_multiplicities: np.ndarray
    group_keys: np.ndarray
    raw_rays: int
    quotient_groups: int
    static_raw_rows: int
    dynamic_raw_rows: int
    mapping_sha256: str


def state_code(rows: np.ndarray) -> np.ndarray:
    """Mixed-radix exact code for canonical half rows."""
    values = np.asarray(rows, dtype=np.int64)
    assert values.ndim == 2 and values.shape[1] == 5
    code = values[:, 0]
    code = code * 8 + values[:, 1]
    code = code * 9 + values[:, 2]
    code = code * 8 + values[:, 3]
    code = code * 8 + values[:, 4]
    return code


@lru_cache(maxsize=1)
def load_tables() -> QuotientTables:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    audit = json.loads(AUDIT.read_text(encoding="utf-8"))
    assert certificate["status"] == (
        "PASS_EXACT_CANONICAL_OPPOSITE_HALF_MESSAGE_QUOTIENT_"
        "NO_ORBIT_SIGN_CREDIT"
    )
    assert audit["status"] == (
        "PASS_INDEPENDENT_LITERAL_TREE_DP_OPPOSITE_HALF_MESSAGE_"
        "QUOTIENT_NO_ORBIT_SIGN_CREDIT"
    )
    assert certificate["mapping_arrays_sha256"] == audit[
        "mapping_arrays_sha256"
    ]

    rows = []
    for outer_low in range(1, 8):
        for outer_high in range(outer_low, 8):
            for middle_outer in range(1, 9):
                for middle_pendant in range(1, 8):
                    for center_middle in range(1, 9):
                        rows.append((
                            center_middle,
                            middle_pendant,
                            middle_outer,
                            outer_low,
                            outer_high,
                        ))
    halves = np.asarray(rows, dtype=np.int32)
    assert halves.shape == (12_544, 5)
    half_sums = halves.sum(axis=1, dtype=np.int32)
    first_long = np.full(len(halves), -1, dtype=np.int8)
    long_matrix = halves == MAXIMA[None, :]
    for index in range(len(halves)):
        positions = np.flatnonzero(long_matrix[index])
        if len(positions):
            first_long[index] = int(positions[0])

    static = np.asarray(
        certificate["static_representative_by_half_index"], dtype=np.int32
    )
    dynamic = np.asarray(
        certificate["dynamic_representative_by_half_index"], dtype=np.int32
    )
    assert static.shape == dynamic.shape == (12_544,)
    assert np.all(static >= 0)
    assert np.array_equal(dynamic >= 0, first_long >= 0)
    assert np.array_equal(half_sums[static], half_sums)
    long_indices = np.flatnonzero(dynamic >= 0)
    assert np.array_equal(
        half_sums[dynamic[long_indices]], half_sums[long_indices]
    )

    codes = state_code(halves)
    lookup = np.full(int(codes.max()) + 1, -1, dtype=np.int32)
    assert len(np.unique(codes)) == len(codes)
    lookup[codes] = np.arange(len(halves), dtype=np.int32)
    return QuotientTables(
        halves=halves,
        half_sums=half_sums,
        static_representatives=static,
        dynamic_representatives=dynamic,
        first_long=first_long,
        state_index_by_code=lookup,
        mapping_arrays_sha256=certificate["mapping_arrays_sha256"],
        immutable_input_hashes=actual,
    )


def packed_group_keys(
    rows: np.ndarray, varying: np.ndarray, shifts: np.ndarray
) -> np.ndarray:
    """Collision-free 56-bit encoding of a normalized ray row."""
    assert rows.ndim == 2 and rows.shape[1] == 12
    assert np.all((rows >= 0) & (rows <= 15))
    assert np.all((varying >= 0) & (varying <= 15))
    assert np.all((shifts >= 0) & (shifts <= 15))
    keys = np.zeros(len(rows), dtype=np.uint64)
    for index in range(12):
        keys |= rows[:, index].astype(np.uint64) << np.uint64(4 * index)
    keys |= varying.astype(np.uint64) << np.uint64(48)
    keys |= shifts.astype(np.uint64) << np.uint64(52)
    return keys


def quotient_rows(
    rows: np.ndarray,
    varying: np.ndarray,
    shifts: np.ndarray,
    opposite_start: int,
) -> QuotientBatch:
    """Normalize only the designated opposite half, then group exact rows."""
    tables = load_tables()
    raw_rows = np.asarray(rows, dtype=np.int32)
    raw_varying = np.asarray(varying, dtype=np.int32)
    raw_shifts = np.asarray(shifts, dtype=np.int32)
    assert raw_rows.ndim == 2 and raw_rows.shape[1] == 12
    assert raw_varying.shape == raw_shifts.shape == (len(raw_rows),)
    assert opposite_start in (5, 7)
    opposite_stop = opposite_start + 5

    normalized = raw_rows.copy()
    opposite = raw_rows[:, opposite_start:opposite_stop]
    codes = state_code(opposite)
    assert len(codes) == 0 or int(codes.max()) < len(tables.state_index_by_code)
    half_indices = tables.state_index_by_code[codes]
    assert np.all(half_indices >= 0)

    dynamic_rows = (
        (raw_varying >= opposite_start) & (raw_varying < opposite_stop)
    )
    representatives = tables.static_representatives[half_indices].copy()
    representatives[dynamic_rows] = tables.dynamic_representatives[
        half_indices[dynamic_rows]
    ]
    assert np.all(representatives >= 0)
    normalized[:, opposite_start:opposite_stop] = tables.halves[
        representatives
    ]
    assert np.array_equal(
        raw_rows[:, :opposite_start], normalized[:, :opposite_start]
    )
    assert np.array_equal(
        raw_rows[:, opposite_stop:], normalized[:, opposite_stop:]
    )
    assert np.array_equal(
        raw_rows.sum(axis=1, dtype=np.int32),
        normalized.sum(axis=1, dtype=np.int32),
    )

    normalized_varying = raw_varying.copy()
    if np.any(dynamic_rows):
        representative_local_varying = tables.first_long[
            representatives[dynamic_rows]
        ]
        assert np.all(representative_local_varying >= 0)
        normalized_varying[dynamic_rows] = (
            opposite_start + representative_local_varying.astype(np.int32)
        )
    keys = packed_group_keys(normalized, normalized_varying, raw_shifts)
    unique_keys, first, inverse, counts = np.unique(
        keys,
        return_index=True,
        return_inverse=True,
        return_counts=True,
    )
    first = first.astype(np.int64, copy=False)
    inverse = inverse.astype(np.int32, copy=False)
    counts = counts.astype(np.int32, copy=False)
    assert int(counts.sum(dtype=np.int64)) == len(raw_rows)
    assert np.array_equal(keys, unique_keys[inverse])
    assert np.array_equal(
        packed_group_keys(
            normalized[first], normalized_varying[first], raw_shifts[first]
        ),
        unique_keys,
    )

    digest = hashlib.sha256()
    digest.update(inverse.astype("<i4", copy=False).tobytes(order="C"))
    digest.update(unique_keys.astype("<u8", copy=False).tobytes(order="C"))
    digest.update(counts.astype("<i4", copy=False).tobytes(order="C"))
    return QuotientBatch(
        group_rows=np.ascontiguousarray(normalized[first], dtype=np.int32),
        group_varying=np.ascontiguousarray(
            normalized_varying[first], dtype=np.int32
        ),
        group_shifts=np.ascontiguousarray(raw_shifts[first], dtype=np.int32),
        raw_to_group=np.ascontiguousarray(inverse, dtype=np.int32),
        group_multiplicities=np.ascontiguousarray(counts, dtype=np.int32),
        group_keys=np.ascontiguousarray(unique_keys, dtype=np.uint64),
        raw_rays=len(raw_rows),
        quotient_groups=len(unique_keys),
        static_raw_rows=int(np.count_nonzero(~dynamic_rows)),
        dynamic_raw_rows=int(np.count_nonzero(dynamic_rows)),
        mapping_sha256=digest.hexdigest().upper(),
    )


@cuda.jit
def expand_grouped_residues_kernel(
    grouped_residues, raw_to_group, raw_count, width, raw_residues
):
    flat = cuda.grid(1)
    total = raw_count * width
    if flat >= total:
        return
    raw_row = flat // width
    offset = flat - raw_row * width
    group = raw_to_group[raw_row]
    raw_residues[flat] = grouped_residues[group * width + offset]


@cuda.jit
def scatter_group_chunk_residues_kernel(
    grouped_residues,
    raw_indices,
    local_group_by_member,
    member_count,
    width,
    raw_residues,
):
    flat = cuda.grid(1)
    total = member_count * width
    if flat >= total:
        return
    member = flat // width
    offset = flat - member * width
    raw_row = raw_indices[member]
    group = local_group_by_member[member]
    raw_residues[raw_row * width + offset] = (
        grouped_residues[group * width + offset]
    )
