#!/usr/bin/env python3
"""Exact shared producer for four mixed-face curvature grade-16 cells.

Only the base curvature has ordinary-slack degree 16.  Its top homogeneous
factor rows omit P,Q and hence the endpoint face.  Therefore face01=face10,
and the middle row is literally four times the far row.  The common far row
is C8^2-C7*C9 and is streamed one b0 coefficient at a time.
"""

from __future__ import annotations

import argparse
import ctypes
import gc
import hashlib
import json
import math
import os
from ctypes import wintypes
from pathlib import Path

from flint import fmpz_mpoly_ctx


HERE = Path(__file__).resolve().parent
NOTE = (
    "RANK8_LOW_LOW_A23_MIXED_CROSS_HIGH_GRADE_BOUNDS_AGENT_20260822.md",
    "BE056D1EAC7AD07EDB42BFDEE40873C949D32D24F3EC8912BD5B555D5E3B394E",
)
BASE = ("h", "ta", "tb", "P", "Q")
REDUCED = ("a0", "b4", "b5", "b6", "b7", "a4", "a5", "a6", "a7")
FULL = BASE + REDUCED + ("b0",)
GROUP_A = ("a0", "b4", "b5", "b6", "b7")
GROUP_B = ("a4", "a5", "a6", "a7", "b0")
FACES = (("01", (0, 1)), ("10", (1, 0)))
LABELS = (("curvature_middle_times_4", 4), ("curvature_far", 1))
DEGREE = 16
LIMIT = 475_000_000
FAILURE_CONTEXT: dict = {}


class PMC(ctypes.Structure):
    _fields_ = [
        ("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD),
        ("PeakWorkingSetSize", ctypes.c_size_t), ("WorkingSetSize", ctypes.c_size_t),
        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t), ("QuotaPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
        ("QuotaNonPagedPoolUsage", ctypes.c_size_t), ("PagefileUsage", ctypes.c_size_t),
        ("PeakPagefileUsage", ctypes.c_size_t), ("PrivateUsage", ctypes.c_size_t),
    ]


def private_bytes() -> int:
    counters = PMC(); counters.cb = ctypes.sizeof(counters)
    current = ctypes.windll.kernel32.GetCurrentProcess; current.restype = wintypes.HANDLE
    query = ctypes.windll.psapi.GetProcessMemoryInfo
    query.argtypes = (wintypes.HANDLE, ctypes.POINTER(PMC), wintypes.DWORD)
    query.restype = wintypes.BOOL
    if not query(current(), ctypes.byref(counters), counters.cb):
        raise OSError("GetProcessMemoryInfo failed")
    return int(counters.PrivateUsage)


def guard(stage: str, peak: list[int], limit: int) -> None:
    current = private_bytes(); peak[0] = max(peak[0], current)
    FAILURE_CONTEXT.update(stage=stage, private_bytes=current, peak_private_bytes=peak[0])
    if current >= limit:
        raise MemoryError(f"private-memory guard at {stage}: {current} >= {limit}")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def build_rows(context, peak: list[int], limit: int):
    x = dict(zip(REDUCED, context.gens())); zero = context.constant(0); one = context.constant(1)
    A = x["a4"] + x["a5"] + x["a6"] + x["a7"]
    A5 = x["a5"] + x["a6"] + x["a7"]; A6 = x["a6"] + x["a7"]
    B = x["b4"] + x["b5"] + x["b6"] + x["b7"]
    B5 = x["b5"] + x["b6"] + x["b7"]; B6 = x["b6"] + x["b7"]
    left_ratios = [x["a0"] + A, A, A, A, A, A5, A6, x["a7"], zero]
    right_ratios = [
        (B, one), (B, zero), (B, zero), (B, zero), (B, zero),
        (B5, zero), (B6, zero), (x["b7"], zero), (zero, zero),
    ]
    left = [one]
    for ratio in left_ratios:
        left.append(left[-1] * ratio)
    right = [(one, zero)]
    for r0, r1 in right_ratios:
        p0, p1 = right[-1]; assert not p1 or not r1
        right.append((p0 * r0, p0 * r1 + p1 * r0))
    assert len(left) == len(right) == 10 and not left[9] and not right[9][0] and not right[9][1]
    guard("top factor rows", peak, limit)
    c = {}
    for rank in (7, 8, 9):
        values = []
        for outer in (0, 1):
            value = zero
            for i in range(rank + 1):
                value += math.comb(rank, i) * left[i] * right[rank - i][outer]
            values.append(value)
        c[rank] = tuple(values); guard(f"convolution {rank}", peak, limit)
    return c


def determinant_slice(c, outer: int, peak: list[int], limit: int):
    if outer == 0:
        value = c[8][0] * c[8][0]; guard("outer0 square", peak, limit)
        other = c[7][0] * c[9][0]; guard("outer0 product", peak, limit)
        value -= other
    elif outer == 1:
        value = 2 * c[8][0] * c[8][1]; guard("outer1 first", peak, limit)
        other = c[7][0] * c[9][1]; guard("outer1 second", peak, limit)
        value -= other; del other; gc.collect()
        other = c[7][1] * c[9][0]; guard("outer1 third", peak, limit)
        value -= other
    else:
        assert outer == 2
        value = c[8][1] * c[8][1]; guard("outer2 square", peak, limit)
        other = c[7][1] * c[9][1]; guard("outer2 product", peak, limit)
        value -= other
    del other; gc.collect(); guard(f"outer{outer} determinant", peak, limit)
    return value


def stream(polynomial, outer: int, completes: dict[int, object], peak: list[int], limit: int):
    ga = tuple(REDUCED.index(name) for name in GROUP_A)
    gb = tuple(REDUCED.index(name) for name in GROUP_B if name != "b0")
    digests = {1: hashlib.sha256(), 4: hashlib.sha256()}
    terms = negative = 0; minimum = first = None; previous = None
    for index in range(len(polynomial)):
        reduced = tuple(map(int, polynomial.monomial(index)))
        key = (-sum(reduced), tuple(reversed(reduced)))
        if previous is not None: assert previous <= key
        previous = key; assert sum(reduced) + outer == DEGREE
        if not any(reduced[i] for i in ga): continue
        if outer == 0 and not any(reduced[i] for i in gb): continue
        coefficient = int(polynomial.coefficient(index)); assert coefficient
        full = (0, 0, 0, 0, 0) + reduced + (outer,)
        prefix = ",".join(map(str, full)) + ":"
        for scale in (1, 4):
            encoded = (prefix + str(scale * coefficient) + "\n").encode()
            digests[scale].update(encoded); completes[scale].update(encoded)
        terms += 1; minimum = coefficient if minimum is None else min(minimum, coefficient)
        if coefficient < 0:
            negative += 1
            if first is None: first = {"monomial": list(full), "coefficient": coefficient}
        if terms % 100_000 == 0:
            print("OUTER", outer, "MIXED", terms, "PRIVATE", private_bytes(), flush=True)
            guard(f"outer{outer} term {terms}", peak, limit)
    return {
        "outer_exponent": outer, "unfiltered_terms": len(polynomial),
        "mixed_support_terms": terms, "negative_terms": negative,
        "minimum_far": minimum, "first_negative_far": first,
        "ordered_far_coefficient_sha256": digests[1].hexdigest().upper(),
        "ordered_middle_coefficient_sha256": digests[4].hexdigest().upper(),
    }


def scaled(stat: dict, scale: int) -> dict:
    first = stat["first_negative_far"]
    return {
        "outer_exponent": stat["outer_exponent"], "unfiltered_terms": stat["unfiltered_terms"],
        "mixed_support_terms": stat["mixed_support_terms"], "negative_terms": stat["negative_terms"],
        "minimum": None if stat["minimum_far"] is None else scale * stat["minimum_far"],
        "first_negative": None if first is None else {
            "monomial": first["monomial"], "coefficient": scale * first["coefficient"]
        },
        "ordered_coefficient_sha256": stat[
            "ordered_far_coefficient_sha256" if scale == 1 else "ordered_middle_coefficient_sha256"
        ],
    }


def write_artifacts(output_dir: Path, stats: list[dict], complete: dict[int, str],
                    source: str, peak: list[int], limit: int):
    completed = []
    for token, face in FACES:
        for label, scale in LABELS:
            prefix = output_dir / (
                f"rank8_low_low_a23_mixed_cross_face_{token}_{label}_grade_16_"
                "outer_stream_agent_20260823"
            )
            chunks = []
            for item in stats:
                chunk = scaled(item, scale)
                payload = {
                    "schema": "rank8-low-low-a23-mixed-cross-grade16-top-shared-chunk-agent-v1",
                    "status": "PASS_EXACT_MIXED_CROSS_OUTER_CHUNK_COEFFICIENTWISE_NONNEGATIVE"
                    if chunk["negative_terms"] == 0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT",
                    "face": list(face), "bridge_corner": [2 * face[0], 2 * face[1]],
                    "family": "curvature", "auxiliary": label,
                    "total_ordinary_slack_degree": DEGREE, "outer_variable": "b0",
                    "outer_exponent": chunk["outer_exponent"], "outer_support_bound": [0, 2],
                    "variables": list(FULL), "group_A": list(GROUP_A), "group_B": list(GROUP_B),
                    "row_scale_from_shared_far_polynomial": scale, "chunk": chunk,
                    "literal_identities": {"face_01_equals_face_10": True, "middle_equals_4_times_far": True},
                    "source_sha256": source, "theoretical_note": {"path": NOTE[0], "sha256": NOTE[1]},
                }
                path = Path(str(prefix) + f"_b0_exp_{chunk['outer_exponent']}.json")
                digest = atomic_json(path, payload)
                chunks.append({
                    "outer_exponent": chunk["outer_exponent"], "path": str(path.resolve()),
                    "sha256": digest, "mixed_support_terms": chunk["mixed_support_terms"],
                    "negative_terms": chunk["negative_terms"], "minimum": chunk["minimum"],
                    "ordered_coefficient_sha256": chunk["ordered_coefficient_sha256"],
                })
            total_terms = sum(x["mixed_support_terms"] for x in chunks)
            total_negative = sum(x["negative_terms"] for x in chunks)
            manifest = {
                "schema": "rank8-low-low-a23-mixed-cross-grade16-top-shared-manifest-agent-v1",
                "status": "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE"
                if total_negative == 0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT",
                "face": list(face), "bridge_corner": [2 * face[0], 2 * face[1]],
                "family": "curvature", "auxiliary": label,
                "total_ordinary_slack_degree": DEGREE, "outer_variable": "b0",
                "outer_exponent_range": [0, 2], "global_row_assembly": False,
                "construction_identity": "[b0^e](C8^2-C7*C9) for top homogeneous convolution C",
                "literal_identities": {
                    "face_01_equals_face_10": True, "middle_equals_4_times_far": True,
                    "endpoint_variables_absent": ["P", "Q"], "base_variables_zero_in_top_part": list(BASE),
                },
                "hard_private_memory_limit_bytes": limit,
                "observed_peak_private_bytes_at_checkpoints": peak[0],
                "result": {
                    "chunks": chunks, "mixed_support_terms": total_terms,
                    "negative_terms": total_negative, "ordered_coefficient_sha256": complete[scale],
                    "piece_names": ["grade16_base_curvature_top"], "piece_scales": [scale],
                },
                "source_sha256": source, "theoretical_note": {"path": NOTE[0], "sha256": NOTE[1]},
            }
            path = Path(str(prefix) + "_manifest.json"); digest = atomic_json(path, manifest)
            completed.append({
                "face_token": token, "face": list(face), "auxiliary": label, "scale": scale,
                "manifest": str(path.resolve()), "manifest_sha256": digest,
                "mixed_support_terms": total_terms, "negative_terms": total_negative,
                "ordered_coefficient_sha256": complete[scale],
            })
    return completed


def main():
    parser = argparse.ArgumentParser(); parser.add_argument("--output-directory", default=".")
    parser.add_argument("--private-limit", type=int, default=LIMIT); args = parser.parse_args()
    output = Path(args.output_directory).resolve(); output.mkdir(parents=True, exist_ok=True)
    assert sha256(HERE / NOTE[0]) == NOTE[1]
    source = sha256(Path(__file__)); peak = [0]; guard("start", peak, args.private_limit)
    context = fmpz_mpoly_ctx.get(REDUCED, "degrevlex"); c = build_rows(context, peak, args.private_limit)
    completes = {1: hashlib.sha256(), 4: hashlib.sha256()}; stats = []
    for outer in (0, 1, 2):
        FAILURE_CONTEXT["outer_exponent"] = outer
        polynomial = determinant_slice(c, outer, peak, args.private_limit)
        stat = stream(polynomial, outer, completes, peak, args.private_limit); stats.append(stat)
        print("SLICE", outer, "UNFILTERED", stat["unfiltered_terms"], "MIXED",
              stat["mixed_support_terms"], "NEGATIVE", stat["negative_terms"],
              "MIN", stat["minimum_far"], flush=True)
        del polynomial; gc.collect(); guard(f"released outer{outer}", peak, args.private_limit)
    complete = {scale: digest.hexdigest().upper() for scale, digest in completes.items()}
    cells = write_artifacts(output, stats, complete, source, peak, args.private_limit)
    passed = len(cells) == 4 and all(item["negative_terms"] == 0 for item in cells)
    assert cells[0]["ordered_coefficient_sha256"] == cells[2]["ordered_coefficient_sha256"]
    assert cells[1]["ordered_coefficient_sha256"] == cells[3]["ordered_coefficient_sha256"]
    job = {
        "schema": "rank8-low-low-a23-mixed-cross-grade16-top-shared-job-agent-v1",
        "status": "PASS_EXACT_SHARED_GRADE16_FOUR_CURVATURE_CELLS_NONNEGATIVE"
        if passed else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT",
        "total_ordinary_slack_degree": DEGREE, "faces": [list(face) for _, face in FACES],
        "rows": [label for label, _ in LABELS], "completed_cells": cells,
        "outer_slices": stats,
        "literal_identity_proof": {
            "endpoint_variables_P_Q_absent": True, "face_01_equals_face_10": True,
            "middle_equals_4_times_far": True, "far_formula": "C8^2-C7*C9",
        },
        "hard_private_memory_limit_bytes": args.private_limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": source, "theoretical_note": {"path": NOTE[0], "sha256": NOTE[1]},
    }
    path = output / "rank8_low_low_a23_mixed_cross_curvature_grade16_top_shared_job_agent_20260823.json"
    digest = atomic_json(path, job); print("JOB", path, digest, job["status"], flush=True)
    if not passed: raise SystemExit(2)


if __name__ == "__main__":
    try:
        main()
    except BaseException as exc:
        atomic_json(HERE / "rank8_low_low_a23_mixed_cross_curvature_grade16_top_shared_failure_agent_20260823.json", {
            "schema": "rank8-low-low-a23-mixed-cross-grade16-top-shared-failure-agent-v1",
            "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_STOP", "exception_type": type(exc).__name__,
            "exception": str(exc), "context": FAILURE_CONTEXT, "source_sha256": sha256(Path(__file__)),
        })
        raise
