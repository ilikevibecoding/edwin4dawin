#!/usr/bin/env python3
"""Memory-bounded exact strong-grade scan, chunked by the b0 exponent.

The requested strong row is kept as two (middle) or three (far) algebraic
pieces.  The pieces are never added into one global polynomial.  Instead their
FLINT term arrays are traversed by index and merged in monomial order, so only
one combined coefficient is live at a time.  Since every fixed-grade strong
term has the same total algebraic degree, degrevlex order makes the exponent of
the final variable b0 monotone.  Each b0-exponent chunk is therefore complete
and can be committed atomically before the next chunk.
"""

from __future__ import annotations

import argparse
import ctypes
import gc
import hashlib
import heapq
import json
import os
from pathlib import Path

from ctypes import wintypes
from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_a23_mixed_cross_truncated_agent import (
    BASE_NAMES,
    GROUP_A,
    GROUP_B,
    SLACK_NAMES,
    Graded,
    convolution,
    factor_row,
)
from probe_rank8_low_low_a23_mixed_cross_row_grade_agent import (
    cross_grade,
    curvature_grade,
    derivative_cross_grade,
    derivative_grade,
)


DEPENDENCIES = (
    "probe_rank8_low_low_a23_mixed_cross_truncated_agent.py",
    "probe_rank8_low_low_a23_mixed_cross_row_grade_agent.py",
)
LABELS = ("strong_middle_times_4", "strong_far")
HARD_PRIVATE_LIMIT = 3_000_000_000


class PROCESS_MEMORY_COUNTERS_EX(ctypes.Structure):
    _fields_ = [
        ("cb", wintypes.DWORD),
        ("PageFaultCount", wintypes.DWORD),
        ("PeakWorkingSetSize", ctypes.c_size_t),
        ("WorkingSetSize", ctypes.c_size_t),
        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
        ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
        ("PagefileUsage", ctypes.c_size_t),
        ("PeakPagefileUsage", ctypes.c_size_t),
        ("PrivateUsage", ctypes.c_size_t),
    ]


def memory_snapshot():
    counters = PROCESS_MEMORY_COUNTERS_EX()
    counters.cb = ctypes.sizeof(counters)
    get_current_process = ctypes.windll.kernel32.GetCurrentProcess
    get_current_process.restype = wintypes.HANDLE
    get_process_memory_info = ctypes.windll.psapi.GetProcessMemoryInfo
    get_process_memory_info.argtypes = (
        wintypes.HANDLE,
        ctypes.POINTER(PROCESS_MEMORY_COUNTERS_EX),
        wintypes.DWORD,
    )
    get_process_memory_info.restype = wintypes.BOOL
    ok = get_process_memory_info(
        get_current_process(),
        ctypes.byref(counters),
        counters.cb,
    )
    if not ok:
        raise OSError("GetProcessMemoryInfo failed")
    return {
        "private_bytes": int(counters.PrivateUsage),
        "working_set_bytes": int(counters.WorkingSetSize),
        "peak_working_set_bytes": int(counters.PeakWorkingSetSize),
    }


def enforce_memory_limit(stage, peak):
    snapshot = memory_snapshot()
    peak[0] = max(peak[0], snapshot["private_bytes"])
    if snapshot["private_bytes"] >= HARD_PRIVATE_LIMIT:
        raise MemoryError(
            f"private-memory guard at {stage}: "
            f"{snapshot['private_bytes']} >= {HARD_PRIVATE_LIMIT}"
        )
    return snapshot


def atomic_json(path, payload):
    encoded = json.dumps(payload, indent=2) + "\n"
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(encoded, encoding="utf-8")
    os.replace(temporary, path)
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_strong_pieces(face, label, degree, peak):
    names = BASE_NAMES + SLACK_NAMES
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    raw = dict(zip(names, context.gens()))
    zero_raw = context.constant(0)
    one_raw = context.constant(1)
    Graded.max_degree = degree
    Graded.zero = zero_raw
    variables = {
        name: Graded.slack(value) if name in SLACK_NAMES else Graded.base(value)
        for name, value in raw.items()
    }
    zero = Graded.base(zero_raw)
    one = Graded.base(one_raw)
    h, ta, tb, p, q = (variables[name] for name in BASE_NAMES)
    h_raw = raw["h"]
    z, w = face
    a2, a3 = (1 - z) * p, z * p
    b2, b3 = (1 - w) * q, w * q
    left_gaps = [
        2 * h + variables["a0"],
        h,
        h + a2,
        h + a3,
        h + variables["a4"],
        h + variables["a5"],
        h + variables["a6"],
        h + variables["a7"],
    ]
    right_gaps = [
        2 * h + variables["b0"],
        h,
        h + b2,
        h + b3,
        h + variables["b4"],
        h + variables["b5"],
        h + variables["b6"],
        h + variables["b7"],
    ]
    left_ratios, left = factor_row(ta, left_gaps, one)
    right_ratios, right_base = factor_row(tb, right_gaps, one)
    right_direction = [zero for _ in right_base]
    right_direction[3] = right_base[2] * h
    for rank in range(4, len(right_base)):
        right_direction[rank] = right_direction[rank - 1] * right_ratios[rank - 1]
    tail = [zero, zero, zero] + left[3:]
    enforce_memory_limit("factor rows", peak)

    base_c = {
        rank: convolution(left, right_base, rank, zero)
        for rank in (7, 8, 9)
    }
    direction_c = {
        rank: convolution(left, right_direction, rank, zero)
        for rank in (7, 8, 9)
    }
    base_v = {
        rank: convolution(tail, right_base, rank, zero)
        for rank in (7, 8, 9)
    }
    direction_v = {
        rank: convolution(tail, right_direction, rank, zero)
        for rank in (7, 8, 9)
    }
    enforce_memory_limit("convolutions", peak)

    capacity = left_ratios[2]
    assert all(not item for item in capacity.c[2:])

    base_d = curvature_grade(base_c, degree, zero_raw, h_raw)
    base_previous = curvature_grade(base_c, degree - 1, zero_raw, h_raw)
    margin_base = capacity.c[0] * base_d + capacity.c[1] * base_previous
    del base_d, base_previous
    derivative_base = derivative_grade(
        base_c, base_v, degree, zero_raw, h_raw
    )
    strong_base = margin_base + h_raw * derivative_base
    del margin_base, derivative_base
    gc.collect()
    enforce_memory_limit("strong base piece", peak)

    linear_d = cross_grade(base_c, direction_c, degree, zero_raw, h_raw)
    linear_previous = cross_grade(
        base_c, direction_c, degree - 1, zero_raw, h_raw
    )
    margin_linear = capacity.c[0] * linear_d + capacity.c[1] * linear_previous
    del linear_d, linear_previous
    derivative_linear = derivative_cross_grade(
        base_c,
        direction_c,
        base_v,
        direction_v,
        degree,
        zero_raw,
        h_raw,
    )
    strong_linear = margin_linear + h_raw * derivative_linear
    del margin_linear, derivative_linear
    gc.collect()
    enforce_memory_limit("strong linear piece", peak)

    if label == "strong_middle_times_4":
        return names, ((4, strong_base), (2, strong_linear))

    direction_d = curvature_grade(direction_c, degree, zero_raw, h_raw)
    direction_previous = curvature_grade(
        direction_c, degree - 1, zero_raw, h_raw
    )
    margin_direction = (
        capacity.c[0] * direction_d + capacity.c[1] * direction_previous
    )
    del direction_d, direction_previous
    derivative_direction = derivative_grade(
        direction_c, direction_v, degree, zero_raw, h_raw
    )
    strong_direction = margin_direction + h_raw * derivative_direction
    del margin_direction, derivative_direction
    gc.collect()
    enforce_memory_limit("strong direction piece", peak)
    return names, ((1, strong_base), (1, strong_linear), (1, strong_direction))


def order_key(monomial):
    # This is the ascending Python key for FLINT's descending degrevlex order.
    return (-sum(monomial), tuple(reversed(monomial)))


class MixedCursor:
    def __init__(self, polynomial, scale, group_a, group_b, degree):
        self.polynomial = polynomial
        self.scale = scale
        self.group_a = group_a
        self.group_b = group_b
        self.degree = degree
        self.index = 0
        self.length = len(polynomial)
        self.previous_key = None
        self.raw_terms_visited = 0
        self.mixed_terms_visited = 0

    def advance(self):
        while self.index < self.length:
            index = self.index
            self.index += 1
            monomial = tuple(map(int, self.polynomial.monomial(index)))
            coefficient = self.scale * int(self.polynomial.coefficient(index))
            self.raw_terms_visited += 1
            key = order_key(monomial)
            if self.previous_key is not None:
                assert self.previous_key <= key
            self.previous_key = key
            if not (
                any(monomial[item] for item in self.group_a)
                and any(monomial[item] for item in self.group_b)
            ):
                continue
            assert sum(monomial[len(BASE_NAMES) :]) == self.degree
            self.mixed_terms_visited += 1
            return key, monomial, coefficient
        return None


def empty_chunk(exponent):
    return {
        "outer_exponent": exponent,
        "mixed_support_terms": 0,
        "negative_terms": 0,
        "minimum": None,
        "first_negative": None,
        "ordered_coefficient_sha256": hashlib.sha256().hexdigest().upper(),
    }


def merge_and_write_chunks(
    names, pieces, face, label, degree, prefix, source_hash, dependency_hashes, peak
):
    name_index = {name: index for index, name in enumerate(names)}
    group_a = tuple(name_index[name] for name in GROUP_A)
    group_b = tuple(name_index[name] for name in GROUP_B)
    outer_index = name_index["b0"]
    cursors = [
        MixedCursor(polynomial, scale, group_a, group_b, degree)
        for scale, polynomial in pieces
    ]
    heap = []
    for cursor_index, cursor in enumerate(cursors):
        item = cursor.advance()
        if item is not None:
            key, monomial, coefficient = item
            heapq.heappush(heap, (key, cursor_index, monomial, coefficient))

    chunk = empty_chunk(0)
    chunk_digest = hashlib.sha256()
    overall_digest = hashlib.sha256()
    chunk_records = []
    combined_terms = 0
    total_negative = 0
    previous_outer = 0

    def finish_chunk(item):
        item["ordered_coefficient_sha256"] = chunk_digest.hexdigest().upper()
        item["status"] = (
            "PASS_EXACT_MIXED_CROSS_OUTER_CHUNK_COEFFICIENTWISE_NONNEGATIVE"
            if item["negative_terms"] == 0
            else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
        )
        payload = {
            "schema": "rank8-low-low-a23-mixed-cross-strong-outer-chunk-agent-v1",
            "status": item["status"],
            "face": list(face),
            "auxiliary": label,
            "total_ordinary_slack_degree": degree,
            "outer_variable": "b0",
            "outer_exponent": item["outer_exponent"],
            "variables": list(names),
            "group_A": list(GROUP_A),
            "group_B": list(GROUP_B),
            "chunk": item,
            "piece_scales": [scale for scale, _ in pieces],
            "global_row_assembly": False,
            "source_sha256": source_hash,
            "dependency_sha256": dependency_hashes,
        }
        path = Path(f"{prefix}_b0_exp_{item['outer_exponent']}.json").resolve()
        file_hash = atomic_json(path, payload)
        record = {
            "outer_exponent": item["outer_exponent"],
            "path": str(path),
            "sha256": file_hash,
            "mixed_support_terms": item["mixed_support_terms"],
            "negative_terms": item["negative_terms"],
            "minimum": item["minimum"],
            "ordered_coefficient_sha256": item["ordered_coefficient_sha256"],
        }
        chunk_records.append(record)
        print(
            "CHUNK",
            item["outer_exponent"],
            "TERMS",
            item["mixed_support_terms"],
            "NEGATIVE",
            item["negative_terms"],
            "OUTPUT_SHA256",
            file_hash,
            flush=True,
        )

    while heap:
        key, cursor_index, monomial, coefficient = heapq.heappop(heap)
        combined = coefficient
        consumed = [cursor_index]
        while heap and heap[0][0] == key:
            _, other_index, other_monomial, other_coefficient = heapq.heappop(heap)
            assert other_monomial == monomial
            combined += other_coefficient
            consumed.append(other_index)
        for item_index in consumed:
            item = cursors[item_index].advance()
            if item is not None:
                next_key, next_monomial, next_coefficient = item
                heapq.heappush(
                    heap,
                    (next_key, item_index, next_monomial, next_coefficient),
                )
        if combined == 0:
            continue
        outer = monomial[outer_index]
        assert outer >= previous_outer
        while previous_outer < outer:
            finish_chunk(chunk)
            previous_outer += 1
            chunk = empty_chunk(previous_outer)
            chunk_digest = hashlib.sha256()
        encoded = (
            (",".join(map(str, monomial))) + ":" + str(combined) + "\n"
        ).encode()
        chunk_digest.update(encoded)
        overall_digest.update(encoded)
        chunk["mixed_support_terms"] += 1
        chunk["minimum"] = (
            combined
            if chunk["minimum"] is None
            else min(chunk["minimum"], combined)
        )
        if combined < 0:
            chunk["negative_terms"] += 1
            total_negative += 1
            if chunk["first_negative"] is None:
                chunk["first_negative"] = {
                    "monomial": list(monomial),
                    "coefficient": combined,
                }
        combined_terms += 1
        if combined_terms % 100_000 == 0:
            enforce_memory_limit(f"merge term {combined_terms}", peak)

    finish_chunk(chunk)
    while previous_outer < degree:
        previous_outer += 1
        chunk_digest = hashlib.sha256()
        finish_chunk(empty_chunk(previous_outer))

    enforce_memory_limit("finished merge", peak)
    return {
        "chunks": chunk_records,
        "mixed_support_terms": combined_terms,
        "negative_terms": total_negative,
        "ordered_coefficient_sha256": overall_digest.hexdigest().upper(),
        "piece_lengths": [len(cursor.polynomial) for cursor in cursors],
        "piece_raw_terms_visited": [cursor.raw_terms_visited for cursor in cursors],
        "piece_mixed_terms_visited": [cursor.mixed_terms_visited for cursor in cursors],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0"), required=True)
    parser.add_argument("--label", choices=LABELS, required=True)
    parser.add_argument("--degree", type=int, choices=range(2, 18), required=True)
    parser.add_argument("--output-prefix", required=True)
    args = parser.parse_args()
    face = tuple(map(int, args.face.split(",")))
    here = Path(__file__).resolve().parent
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    dependency_hashes = {
        item: hashlib.sha256((here / item).read_bytes()).hexdigest().upper()
        for item in DEPENDENCIES
    }
    peak = [0]
    enforce_memory_limit("start", peak)
    names, pieces = build_strong_pieces(face, args.label, args.degree, peak)
    result = merge_and_write_chunks(
        names,
        pieces,
        face,
        args.label,
        args.degree,
        args.output_prefix,
        source_hash,
        dependency_hashes,
        peak,
    )
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-outer-manifest-agent-v1",
        "status": (
            "PASS_EXACT_MIXED_CROSS_STRONG_GRADE_OUTER_CHUNKS_NONNEGATIVE"
            if result["negative_terms"] == 0
            else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
        ),
        "face": list(face),
        "auxiliary": args.label,
        "total_ordinary_slack_degree": args.degree,
        "outer_variable": "b0",
        "outer_exponent_range": [0, args.degree],
        "disjoint_coverage": (
            "Every mixed-support monomial in this fixed grade has exactly one "
            "b0 exponent in 0..degree; fixed total algebraic degree makes the "
            "chunks contiguous in degrevlex order."
        ),
        "global_row_assembly": False,
        "hard_private_memory_limit_bytes": HARD_PRIVATE_LIMIT,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "result": result,
        "source_sha256": source_hash,
        "dependency_sha256": dependency_hashes,
    }
    manifest = Path(f"{args.output_prefix}_manifest.json").resolve()
    manifest_hash = atomic_json(manifest, payload)
    print("MANIFEST", manifest, manifest_hash, flush=True)


if __name__ == "__main__":
    main()
