#!/usr/bin/env python3
"""Exact b0-factored mixed-cross producer for one face and one slack grade.

The right factor row is affine in b0: b0 occurs only in right gap zero,
hence only in right ratio zero, and that ratio is used once in every row
entry.  The right directional row and all c/v convolutions are therefore
affine too.  This producer constructs their exact coefficients X[0], X[1]
from the specializations b0=0,1 and applies every bilinear curvature or
derivative form coefficientwise:

    [b0^e] B(X,Y) = sum_{i+j=e} B(X[i],Y[j]),  e=0,1,2.

Only one outer coefficient and one family are materialized at a time.  The
canonical full monomial (including b0 as the final variable) is restored
before hashing, so reports can be exact-compared with the unfactored route.
"""

from __future__ import annotations

import argparse
import ctypes
import gc
import hashlib
import heapq
import json
import os
from ctypes import wintypes
from pathlib import Path

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
from probe_rank8_low_low_a23_mixed_cross_row_grade_agent import product_grade


DEPENDENCIES = (
    "probe_rank8_low_low_a23_mixed_cross_truncated_agent.py",
    "probe_rank8_low_low_a23_mixed_cross_row_grade_agent.py",
)
FULL_NAMES = BASE_NAMES + SLACK_NAMES
REDUCED_SLACK_NAMES = tuple(name for name in SLACK_NAMES if name != "b0")
REDUCED_NAMES = BASE_NAMES + REDUCED_SLACK_NAMES
PIECE_DEGREE_BOUNDS = {
    "curvature": {"base": 16, "linear": 15, "direction": 14},
    "strong": {"base": 17, "linear": 16, "direction": 15},
}
DEFAULT_PRIVATE_LIMIT = 500_000_000
FAILURE_CONTEXT: dict = {}


class PMC(ctypes.Structure):
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


def private_bytes() -> int:
    counters = PMC()
    counters.cb = ctypes.sizeof(counters)
    current = ctypes.windll.kernel32.GetCurrentProcess
    current.restype = wintypes.HANDLE
    query = ctypes.windll.psapi.GetProcessMemoryInfo
    query.argtypes = (wintypes.HANDLE, ctypes.POINTER(PMC), wintypes.DWORD)
    query.restype = wintypes.BOOL
    if not query(current(), ctypes.byref(counters), counters.cb):
        raise OSError("GetProcessMemoryInfo failed")
    return int(counters.PrivateUsage)


def guard(stage: str, peak: list[int], limit: int) -> None:
    current = private_bytes()
    peak[0] = max(peak[0], current)
    if current >= limit:
        raise MemoryError(f"private-memory guard at {stage}: {current} >= {limit}")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def subtract_rows(one: dict[int, Graded], zero: dict[int, Graded]) -> dict[int, Graded]:
    return {rank: one[rank] - zero[rank] for rank in (7, 8, 9)}


def build_split_common(face: tuple[int, int], degree: int, peak: list[int], limit: int) -> dict:
    context = fmpz_mpoly_ctx.get(REDUCED_NAMES, "degrevlex")
    raw = dict(zip(REDUCED_NAMES, context.gens()))
    zero_raw = context.constant(0)
    Graded.max_degree = degree
    Graded.zero = zero_raw
    variables = {
        name: Graded.slack(value) if name in REDUCED_SLACK_NAMES else Graded.base(value)
        for name, value in raw.items()
    }
    zero = Graded.base(zero_raw)
    one = Graded.base(context.constant(1))
    h, ta, tb, p, q = (variables[name] for name in BASE_NAMES)
    z, w = face
    a2, a3 = (1 - z) * p, z * p
    b2, b3 = (1 - w) * q, w * q
    left_gaps = [
        2 * h + variables["a0"], h, h + a2, h + a3,
        h + variables["a4"], h + variables["a5"],
        h + variables["a6"], h + variables["a7"],
    ]
    left_ratios, left = factor_row(ta, left_gaps, one)
    tail = [zero, zero, zero] + left[3:]
    capacity = left_ratios[2]
    assert all(not item for item in capacity.c[2:])

    def specialization(value: int) -> dict:
        b0 = Graded.slack(context.constant(value))
        right_gaps = [
            2 * h + b0, h, h + b2, h + b3,
            h + variables["b4"], h + variables["b5"],
            h + variables["b6"], h + variables["b7"],
        ]
        right_ratios, right_base = factor_row(tb, right_gaps, one)
        right_direction = None
        if degree <= 16:
            right_direction = [zero for _ in right_base]
            right_direction[3] = right_base[2] * h
            for rank in range(4, len(right_base)):
                right_direction[rank] = right_direction[rank - 1] * right_ratios[rank - 1]
        result = {
            "base_c": {rank: convolution(left, right_base, rank, zero) for rank in (7, 8, 9)},
            "base_v": {rank: convolution(tail, right_base, rank, zero) for rank in (7, 8, 9)},
            "direction_c": None,
            "direction_v": None,
        }
        if right_direction is not None:
            result["direction_c"] = {
                rank: convolution(left, right_direction, rank, zero) for rank in (7, 8, 9)
            }
            result["direction_v"] = {
                rank: convolution(tail, right_direction, rank, zero) for rank in (7, 8, 9)
            }
        return result

    at_zero = specialization(0)
    guard("b0=0 affine common state", peak, limit)
    at_one = specialization(1)
    guard("b0=0,1 affine common states", peak, limit)
    split = {}
    for key in ("base_c", "base_v", "direction_c", "direction_v"):
        if at_zero[key] is None:
            split[key] = None
        else:
            split[key] = (at_zero[key], subtract_rows(at_one[key], at_zero[key]))
    del at_one
    gc.collect()
    guard("exact affine coefficient extraction", peak, limit)
    return {
        "context": context,
        "raw": raw,
        "zero_raw": zero_raw,
        "capacity": capacity,
        **split,
    }


def outer_product(left, right, degree: int, exponent: int, zero):
    result = zero
    for i in range(2):
        j = exponent - i
        if 0 <= j < 2:
            result += product_grade(left[i], right[j], degree, zero)
    return result


def outer_curvature(values, degree: int, exponent: int, zero, h):
    if degree < 0:
        return zero
    return (
        outer_product((values[0][8], values[1][8]), (values[0][8], values[1][8]), degree, exponent, zero)
        - outer_product((values[0][7], values[1][7]), (values[0][9], values[1][9]), degree, exponent, zero)
        - h * outer_product((values[0][7], values[1][7]), (values[0][8], values[1][8]), degree, exponent, zero)
    )


def outer_cross(base, direction, degree: int, exponent: int, zero, h):
    return (
        2 * outer_product((base[0][8], base[1][8]), (direction[0][8], direction[1][8]), degree, exponent, zero)
        - outer_product((base[0][7], base[1][7]), (direction[0][9], direction[1][9]), degree, exponent, zero)
        - outer_product((direction[0][7], direction[1][7]), (base[0][9], base[1][9]), degree, exponent, zero)
        - h * (
            outer_product((base[0][7], base[1][7]), (direction[0][8], direction[1][8]), degree, exponent, zero)
            + outer_product((direction[0][7], direction[1][7]), (base[0][8], base[1][8]), degree, exponent, zero)
        )
    )


def outer_derivative(c, v, degree: int, exponent: int, zero, h):
    return (
        2 * outer_product((c[0][8], c[1][8]), (v[0][8], v[1][8]), degree, exponent, zero)
        - outer_product((v[0][7], v[1][7]), (c[0][9], c[1][9]), degree, exponent, zero)
        - outer_product((c[0][7], c[1][7]), (v[0][9], v[1][9]), degree, exponent, zero)
        - h * (
            outer_product((v[0][7], v[1][7]), (c[0][8], c[1][8]), degree, exponent, zero)
            + outer_product((c[0][7], c[1][7]), (v[0][8], v[1][8]), degree, exponent, zero)
        )
    )


def outer_derivative_cross(c0, c1, v0, v1, degree: int, exponent: int, zero, h):
    def op(x, xr, y, yr):
        return outer_product((x[0][xr], x[1][xr]), (y[0][yr], y[1][yr]), degree, exponent, zero)

    return (
        2 * (op(c0, 8, v1, 8) + op(c1, 8, v0, 8))
        - op(v0, 7, c1, 9) - op(v1, 7, c0, 9)
        - op(c0, 7, v1, 9) - op(c1, 7, v0, 9)
        - h * (
            op(v0, 7, c1, 8) + op(v1, 7, c0, 8)
            + op(c0, 7, v1, 8) + op(c1, 7, v0, 8)
        )
    )


def curvature_pieces(common: dict, degree: int, exponent: int, peak: list[int], limit: int) -> dict:
    zero, h = common["zero_raw"], common["raw"]["h"]
    v0, v1 = common["base_v"], common["direction_v"]
    pieces = {"base": outer_curvature(v0, degree, exponent, zero, h)}
    guard(f"curvature base outer {exponent}", peak, limit)
    if degree <= 15:
        pieces["linear"] = outer_cross(v0, v1, degree, exponent, zero, h)
        guard(f"curvature linear outer {exponent}", peak, limit)
    if degree <= 14:
        pieces["direction"] = outer_curvature(v1, degree, exponent, zero, h)
        guard(f"curvature direction outer {exponent}", peak, limit)
    return pieces


def strong_pieces(common: dict, degree: int, exponent: int, peak: list[int], limit: int) -> dict:
    zero, h = common["zero_raw"], common["raw"]["h"]
    capacity = common["capacity"]
    c0, v0 = common["base_c"], common["base_v"]
    c1, v1 = common["direction_c"], common["direction_v"]

    base = (
        capacity.c[0] * outer_curvature(c0, degree, exponent, zero, h)
        + capacity.c[1] * outer_curvature(c0, degree - 1, exponent, zero, h)
        + h * outer_derivative(c0, v0, degree, exponent, zero, h)
    )
    pieces = {"base": base}
    guard(f"strong base outer {exponent}", peak, limit)
    if degree <= 16:
        linear = (
            capacity.c[0] * outer_cross(c0, c1, degree, exponent, zero, h)
            + capacity.c[1] * outer_cross(c0, c1, degree - 1, exponent, zero, h)
            + h * outer_derivative_cross(c0, c1, v0, v1, degree, exponent, zero, h)
        )
        pieces["linear"] = linear
        guard(f"strong linear outer {exponent}", peak, limit)
    if degree <= 15:
        direction = (
            capacity.c[0] * outer_curvature(c1, degree, exponent, zero, h)
            + capacity.c[1] * outer_curvature(c1, degree - 1, exponent, zero, h)
            + h * outer_derivative(c1, v1, degree, exponent, zero, h)
        )
        pieces["direction"] = direction
        guard(f"strong direction outer {exponent}", peak, limit)
    return pieces


def row_spec(label: str, pieces: dict) -> list[tuple[str, int, object]]:
    scales = (
        (("base", 4), ("linear", 2))
        if label.endswith("middle_times_4")
        else (("base", 1), ("linear", 1), ("direction", 1))
    )
    return [(name, scale, pieces[name]) for name, scale in scales if name in pieces]


def key_for(monomial: tuple[int, ...]):
    return (-sum(monomial), tuple(reversed(monomial)))


class Cursor:
    def __init__(self, polynomial, scale: int, degree: int, exponent: int):
        self.p = polynomial
        self.scale = scale
        self.degree = degree
        self.exponent = exponent
        indices = {name: REDUCED_NAMES.index(name) for name in REDUCED_NAMES}
        self.a = tuple(indices[name] for name in GROUP_A)
        self.b_without_outer = tuple(indices[name] for name in GROUP_B if name != "b0")
        self.i = 0
        self.previous = None
        self.raw_terms_visited = 0
        self.mixed_terms_visited = 0

    def advance(self):
        while self.i < len(self.p):
            i = self.i
            self.i += 1
            self.raw_terms_visited += 1
            reduced = tuple(map(int, self.p.monomial(i)))
            key = key_for(reduced)
            if self.previous is not None:
                assert self.previous <= key
            self.previous = key
            if not any(reduced[j] for j in self.a):
                continue
            if self.exponent == 0 and not any(reduced[j] for j in self.b_without_outer):
                continue
            assert sum(reduced[len(BASE_NAMES):]) + self.exponent == self.degree
            self.mixed_terms_visited += 1
            full = reduced + (self.exponent,)
            return key, full, self.scale * int(self.p.coefficient(i))
        return None


def new_row_state(label: str, piece_names: list[str], piece_scales: list[int]) -> dict:
    return {
        "label": label,
        "piece_names": piece_names,
        "piece_scales": piece_scales,
        "piece_lengths": [0] * len(piece_names),
        "piece_raw_terms_visited": [0] * len(piece_names),
        "piece_mixed_terms_visited": [0] * len(piece_names),
        "chunks": [],
        "terms": 0,
        "negative": 0,
        "overall": hashlib.sha256(),
    }


def stream_outer_chunk(
    output_dir: Path,
    date_tag: str,
    face: tuple[int, int],
    face_token: str,
    degree: int,
    family: str,
    label: str,
    exponent: int,
    piece_spec: list[tuple[str, int, object]],
    state: dict,
    source_hash: str,
    dependency_hashes: dict,
    peak: list[int],
    limit: int,
) -> None:
    assert [name for name, _, _ in piece_spec] == state["piece_names"]
    cursors = [Cursor(polynomial, scale, degree, exponent) for _, scale, polynomial in piece_spec]
    heap = []
    for cursor_index, cursor in enumerate(cursors):
        item = cursor.advance()
        if item is not None:
            key, monomial, coefficient = item
            heapq.heappush(heap, (key, cursor_index, monomial, coefficient))
    digest = hashlib.sha256()
    terms = negative = 0
    minimum = first_negative = None
    while heap:
        key, cursor_index, monomial, coefficient = heapq.heappop(heap)
        combined = coefficient
        consumed = [cursor_index]
        while heap and heap[0][0] == key:
            _, other_index, other_monomial, other_coefficient = heapq.heappop(heap)
            assert other_monomial == monomial
            combined += other_coefficient
            consumed.append(other_index)
        for index in consumed:
            item = cursors[index].advance()
            if item is not None:
                next_key, next_monomial, next_coefficient = item
                heapq.heappush(heap, (next_key, index, next_monomial, next_coefficient))
        if combined == 0:
            continue
        encoded = (",".join(map(str, monomial)) + ":" + str(combined) + "\n").encode()
        digest.update(encoded)
        state["overall"].update(encoded)
        terms += 1
        minimum = combined if minimum is None else min(minimum, combined)
        if combined < 0:
            negative += 1
            if first_negative is None:
                first_negative = {"monomial": list(monomial), "coefficient": combined}
        if terms % 100_000 == 0:
            guard(f"{label} outer {exponent} merge {terms}", peak, limit)

    for i, (_, _, polynomial) in enumerate(piece_spec):
        state["piece_lengths"][i] += len(polynomial)
        state["piece_raw_terms_visited"][i] += cursors[i].raw_terms_visited
        state["piece_mixed_terms_visited"][i] += cursors[i].mixed_terms_visited
    state["terms"] += terms
    state["negative"] += negative
    stat = {
        "outer_exponent": exponent,
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "minimum": minimum,
        "first_negative": first_negative,
        "ordered_coefficient_sha256": digest.hexdigest().upper(),
    }
    prefix = output_dir / (
        f"rank8_low_low_a23_mixed_cross_face_{face_token}_{label}_grade_{degree}_"
        f"outer_factored_agent_{date_tag}"
    )
    chunk_path = Path(str(prefix) + f"_b0_exp_{exponent}.json")
    chunk_payload = {
        "schema": "rank8-low-low-a23-mixed-cross-face-grade-outer-factored-chunk-agent-v1",
        "status": (
            "PASS_EXACT_MIXED_CROSS_OUTER_FACTORED_CHUNK_COEFFICIENTWISE_NONNEGATIVE"
            if negative == 0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
        ),
        "face": list(face),
        "bridge_corner": [2 * face[0], 2 * face[1]],
        "family": family,
        "auxiliary": label,
        "total_ordinary_slack_degree": degree,
        "outer_variable": "b0",
        "outer_exponent": exponent,
        "outer_support_bound": [0, 2],
        "variables": list(FULL_NAMES),
        "group_A": list(GROUP_A),
        "group_B": list(GROUP_B),
        "piece_scales": {name: scale for name, scale, _ in piece_spec},
        "chunk": stat,
        "construction": "exact_affine_b0_common_then_bilinear_outer_coefficient",
        "source_sha256": source_hash,
        "dependency_sha256": dependency_hashes,
    }
    chunk_hash = atomic_json(chunk_path, chunk_payload)
    state["chunks"].append({
        "outer_exponent": exponent,
        "path": str(chunk_path.resolve()),
        "sha256": chunk_hash,
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "minimum": minimum,
        "ordered_coefficient_sha256": stat["ordered_coefficient_sha256"],
    })
    print(label, "CHUNK", exponent, "TERMS", terms, "NEGATIVE", negative, flush=True)


def finish_manifest(
    output_dir: Path,
    date_tag: str,
    face: tuple[int, int],
    face_token: str,
    degree: int,
    family: str,
    state: dict,
    source_hash: str,
    dependency_hashes: dict,
    peak: list[int],
    limit: int,
) -> dict:
    assert [item["outer_exponent"] for item in state["chunks"]] == [0, 1, 2]
    label = state["label"]
    prefix = output_dir / (
        f"rank8_low_low_a23_mixed_cross_face_{face_token}_{label}_grade_{degree}_"
        f"outer_factored_agent_{date_tag}"
    )
    manifest = Path(str(prefix) + "_manifest.json")
    result = {
        "chunks": state["chunks"],
        "mixed_support_terms": state["terms"],
        "negative_terms": state["negative"],
        "ordered_coefficient_sha256": state["overall"].hexdigest().upper(),
        "piece_names": state["piece_names"],
        "piece_scales": state["piece_scales"],
        "piece_lengths": state["piece_lengths"],
        "piece_raw_terms_visited": state["piece_raw_terms_visited"],
        "piece_mixed_terms_visited": state["piece_mixed_terms_visited"],
    }
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-face-grade-outer-factored-manifest-agent-v1",
        "status": (
            "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_FACTORED_CHUNKS_NONNEGATIVE"
            if state["negative"] == 0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
        ),
        "face": list(face),
        "bridge_corner": [2 * face[0], 2 * face[1]],
        "family": family,
        "auxiliary": label,
        "total_ordinary_slack_degree": degree,
        "outer_variable": "b0",
        "outer_exponent_range": [0, 2],
        "piece_degree_bounds": PIECE_DEGREE_BOUNDS[family],
        "global_row_assembly": False,
        "construction_identity": "[b0^e]B(X,Y)=sum_{i+j=e}B(X_i,Y_j)",
        "hard_private_memory_limit_bytes": limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "result": result,
        "source_sha256": source_hash,
        "dependency_sha256": dependency_hashes,
    }
    manifest_hash = atomic_json(manifest, payload)
    print(label, "MANIFEST", manifest, manifest_hash, flush=True)
    return {
        "family": family,
        "auxiliary": label,
        "manifest": str(manifest.resolve()),
        "manifest_sha256": manifest_hash,
        "mixed_support_terms": state["terms"],
        "negative_terms": state["negative"],
        "ordered_coefficient_sha256": result["ordered_coefficient_sha256"],
    }


def update_job(
    path: Path,
    face: tuple[int, int],
    degree: int,
    source_hash: str,
    dependency_hashes: dict,
    completed: list[dict],
    peak: list[int],
    limit: int,
    final: bool = False,
) -> str:
    expected = []
    if degree <= 16:
        expected.extend(("curvature_middle_times_4", "curvature_far"))
    expected.extend(("strong_middle_times_4", "strong_far"))
    done = [item["auxiliary"] for item in completed]
    missing = [label for label in expected if label not in done]
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-face-grade-outer-factored-job-agent-v1",
        "status": (
            "PASS_COMPLETE_FACE_GRADE_ALL_REQUIRED_OUTER_FACTORED_ROWS"
            if final and not missing and all(item["negative_terms"] == 0 for item in completed)
            else "CHECKPOINT_INCOMPLETE_FACE_GRADE_OUTER_FACTORED"
        ),
        "face": list(face),
        "bridge_corner": [2 * face[0], 2 * face[1]],
        "total_ordinary_slack_degree": degree,
        "expected_rows": expected,
        "completed_rows": completed,
        "missing_rows": missing,
        "global_row_assembly": False,
        "outer_factored_construction": True,
        "hard_private_memory_limit_bytes": limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": source_hash,
        "dependency_sha256": dependency_hashes,
    }
    return atomic_json(path, payload)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0"), required=True)
    parser.add_argument("--degree", type=int, choices=range(2, 18), required=True)
    parser.add_argument("--output-directory", default=".")
    parser.add_argument("--date-tag", default="20260823")
    parser.add_argument("--hard-private-limit-bytes", type=int, default=DEFAULT_PRIVATE_LIMIT)
    args = parser.parse_args()
    face = tuple(map(int, args.face.split(",")))
    face_token = args.face.replace(",", "")
    output_dir = Path(args.output_directory).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    here = Path(__file__).resolve().parent
    source_hash = sha256(Path(__file__))
    dependency_hashes = {name: sha256(here / name) for name in DEPENDENCIES}
    peak = [0]
    guard("job start", peak, args.hard_private_limit_bytes)
    job_path = output_dir / (
        f"rank8_low_low_a23_mixed_cross_face_{face_token}_grade_{args.degree}_"
        f"outer_factored_job_agent_{args.date_tag}.json"
    )
    completed = []
    FAILURE_CONTEXT.update({
        "job_path": job_path,
        "face": face,
        "degree": args.degree,
        "source_hash": source_hash,
        "dependency_hashes": dependency_hashes,
        "peak": peak,
        "limit": args.hard_private_limit_bytes,
    })
    update_job(
        job_path, face, args.degree, source_hash, dependency_hashes,
        completed, peak, args.hard_private_limit_bytes,
    )
    common = build_split_common(face, args.degree, peak, args.hard_private_limit_bytes)

    if args.degree <= 16:
        curvature_labels = ("curvature_middle_times_4", "curvature_far")
        states = {}
        available = {"base": None}
        if args.degree <= 15:
            available["linear"] = None
        if args.degree <= 14:
            available["direction"] = None
        for label in curvature_labels:
            dummy = row_spec(label, available)
            states[label] = new_row_state(
                label, [name for name, _, _ in dummy], [scale for _, scale, _ in dummy]
            )
        for exponent in range(3):
            pieces = curvature_pieces(
                common, args.degree, exponent, peak, args.hard_private_limit_bytes
            )
            for label in curvature_labels:
                spec = row_spec(label, pieces)
                stream_outer_chunk(
                    output_dir, args.date_tag, face, face_token, args.degree,
                    "curvature", label, exponent, spec, states[label], source_hash,
                    dependency_hashes, peak, args.hard_private_limit_bytes,
                )
            del pieces
            gc.collect()
            guard(f"curvature outer {exponent} released", peak, args.hard_private_limit_bytes)
        for label in curvature_labels:
            completed.append(finish_manifest(
                output_dir, args.date_tag, face, face_token, args.degree,
                "curvature", states[label], source_hash, dependency_hashes,
                peak, args.hard_private_limit_bytes,
            ))
            update_job(
                job_path, face, args.degree, source_hash, dependency_hashes,
                completed, peak, args.hard_private_limit_bytes,
            )
        del states
        gc.collect()

    strong_labels = ("strong_middle_times_4", "strong_far")
    states = {}
    for label in strong_labels:
        available = {"base": None}
        if args.degree <= 16:
            available["linear"] = None
        if args.degree <= 15:
            available["direction"] = None
        dummy = row_spec(label, available)
        states[label] = new_row_state(
            label, [name for name, _, _ in dummy], [scale for _, scale, _ in dummy]
        )
    for exponent in range(3):
        pieces = strong_pieces(common, args.degree, exponent, peak, args.hard_private_limit_bytes)
        for label in strong_labels:
            spec = row_spec(label, pieces)
            stream_outer_chunk(
                output_dir, args.date_tag, face, face_token, args.degree,
                "strong", label, exponent, spec, states[label], source_hash,
                dependency_hashes, peak, args.hard_private_limit_bytes,
            )
        del pieces
        gc.collect()
        guard(f"strong outer {exponent} released", peak, args.hard_private_limit_bytes)
    for label in strong_labels:
        completed.append(finish_manifest(
            output_dir, args.date_tag, face, face_token, args.degree,
            "strong", states[label], source_hash, dependency_hashes,
            peak, args.hard_private_limit_bytes,
        ))
        update_job(
            job_path, face, args.degree, source_hash, dependency_hashes,
            completed, peak, args.hard_private_limit_bytes,
        )

    job_hash = update_job(
        job_path, face, args.degree, source_hash, dependency_hashes,
        completed, peak, args.hard_private_limit_bytes, final=True,
    )
    print("JOB", job_path, job_hash, flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as error:
        if FAILURE_CONTEXT:
            path = FAILURE_CONTEXT["job_path"]
            prior = (
                json.loads(path.read_text(encoding="utf-8"))
                if path.exists() else {}
            )
            failure = {
                **prior,
                "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_GUARD",
                "failure": {
                    "type": type(error).__name__,
                    "message": str(error),
                    "private_bytes_at_failure": private_bytes(),
                },
                "observed_peak_private_bytes_at_checkpoints": max(
                    FAILURE_CONTEXT["peak"][0], private_bytes()
                ),
                "hard_private_memory_limit_bytes": FAILURE_CONTEXT["limit"],
                "source_sha256": FAILURE_CONTEXT["source_hash"],
                "dependency_sha256": FAILURE_CONTEXT["dependency_hashes"],
            }
            atomic_json(path, failure)
        raise
