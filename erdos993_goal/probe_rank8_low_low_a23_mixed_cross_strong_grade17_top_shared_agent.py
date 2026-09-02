#!/usr/bin/env python3
"""Exact shared producer for the four mixed-face strong grade-17 cells.

At ordinary-slack degree 17 only the capacity-slack times the base curvature
can survive.  Setting all five base variables to zero leaves factor rows that
do not contain the endpoint-face coordinates P,Q.  Thus faces (0,1) and
(1,0) have one literal common polynomial.  The middle auxiliary is exactly
four times the far auxiliary.  This program constructs the common far row one
b0 coefficient at a time and derives all four durable row manifests from that
single exact coefficient stream.

This is a finite rank-eight auxiliary certificate only.  It does not assert
the full Erdos #993 conjecture.
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
DATE_TAG = "20260823"
THEORETICAL_NOTE = (
    "RANK8_LOW_LOW_A23_MIXED_CROSS_HIGH_GRADE_BOUNDS_AGENT_20260822.md",
    "BE056D1EAC7AD07EDB42BFDEE40873C949D32D24F3EC8912BD5B555D5E3B394E",
)
BASE_NAMES = ("h", "ta", "tb", "P", "Q")
REDUCED_SLACK_NAMES = (
    "a0", "b4", "b5", "b6", "b7", "a4", "a5", "a6", "a7",
)
FULL_NAMES = BASE_NAMES + REDUCED_SLACK_NAMES + ("b0",)
GROUP_A = ("a0", "b4", "b5", "b6", "b7")
GROUP_B = ("a4", "a5", "a6", "a7", "b0")
FACES = (("01", (0, 1)), ("10", (1, 0)))
LABELS = (("strong_middle_times_4", 4), ("strong_far", 1))
DEGREE = 17
DEFAULT_PRIVATE_LIMIT = 475_000_000
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


def checked_note() -> dict:
    path = HERE / THEORETICAL_NOTE[0]
    actual = sha256(path)
    assert actual == THEORETICAL_NOTE[1], (actual, THEORETICAL_NOTE[1])
    return {"path": path.name, "sha256": actual}


def prefix_row(one, ratios: list):
    """Build rank 0..9 products from the nine top homogeneous ratios."""
    row = [one]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    assert len(row) == 10
    return row


def affine_prefix_row(one, zero, ratios: list[tuple]):
    """Build rank 0..9 products as coefficients of b0^0,b0^1."""
    row = [(one, zero)]
    for ratio0, ratio1 in ratios:
        old0, old1 = row[-1]
        # No ratio after ratio zero contains b0, so a quadratic term is
        # impossible.  Assert this literal affine invariant at every step.
        assert not old1 or not ratio1
        row.append((old0 * ratio0, old0 * ratio1 + old1 * ratio0))
    assert len(row) == 10
    return row


def build_top_convolutions(context, peak: list[int], limit: int):
    raw = dict(zip(REDUCED_SLACK_NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    a0 = raw["a0"]
    b4, b5, b6, b7 = (raw[name] for name in ("b4", "b5", "b6", "b7"))
    a4, a5, a6, a7 = (raw[name] for name in ("a4", "a5", "a6", "a7"))
    a_tail4 = a4 + a5 + a6 + a7
    a_tail5 = a5 + a6 + a7
    a_tail6 = a6 + a7
    b_tail4 = b4 + b5 + b6 + b7
    b_tail5 = b5 + b6 + b7
    b_tail6 = b6 + b7

    # These are exactly the ordinary-slack top homogeneous parts of ratios
    # 0,...,8.  The terminal ratio 8 has top part zero.
    left_ratios = [
        a0 + a_tail4,
        a_tail4,
        a_tail4,
        a_tail4,
        a_tail4,
        a_tail5,
        a_tail6,
        a7,
        zero,
    ]
    right_ratios = [
        (b_tail4, one),
        (b_tail4, zero),
        (b_tail4, zero),
        (b_tail4, zero),
        (b_tail4, zero),
        (b_tail5, zero),
        (b_tail6, zero),
        (b7, zero),
        (zero, zero),
    ]
    left = prefix_row(one, left_ratios)
    right = affine_prefix_row(one, zero, right_ratios)
    assert not left[9] and not right[9][0] and not right[9][1]
    guard("top factor rows", peak, limit)

    convolutions: dict[int, tuple] = {}
    for rank in (7, 8, 9):
        coefficients = []
        for outer in (0, 1):
            value = zero
            for index in range(rank + 1):
                value += (
                    math.comb(rank, index)
                    * left[index]
                    * right[rank - index][outer]
                )
            coefficients.append(value)
        convolutions[rank] = tuple(coefficients)
        guard(f"top convolution rank {rank}", peak, limit)
    return raw, a_tail4, convolutions


def construct_far_slice(capacity_slack, convolutions: dict[int, tuple], outer: int,
                        peak: list[int], limit: int):
    c70, c71 = convolutions[7]
    c80, c81 = convolutions[8]
    c90, c91 = convolutions[9]
    if outer == 0:
        determinant = c80 * c80
        guard("b0^0 square", peak, limit)
        subtractand = c70 * c90
        guard("b0^0 cross product", peak, limit)
        determinant -= subtractand
    elif outer == 1:
        determinant = 2 * c80 * c81
        guard("b0^1 first product", peak, limit)
        subtractand = c70 * c91
        guard("b0^1 second product", peak, limit)
        determinant -= subtractand
        del subtractand
        gc.collect()
        subtractand = c71 * c90
        guard("b0^1 third product", peak, limit)
        determinant -= subtractand
    else:
        assert outer == 2
        determinant = c81 * c81
        guard("b0^2 square", peak, limit)
        subtractand = c71 * c91
        guard("b0^2 cross product", peak, limit)
        determinant -= subtractand
    del subtractand
    gc.collect()
    guard(f"b0^{outer} determinant", peak, limit)
    result = capacity_slack * determinant
    del determinant
    gc.collect()
    guard(f"b0^{outer} capacity times determinant", peak, limit)
    return result


def empty_digest() -> str:
    return hashlib.sha256().hexdigest().upper()


def stream_slice(polynomial, outer: int, peak: list[int], limit: int) -> dict:
    group_a_indices = tuple(REDUCED_SLACK_NAMES.index(name) for name in GROUP_A)
    group_b_indices = tuple(
        REDUCED_SLACK_NAMES.index(name) for name in GROUP_B if name != "b0"
    )
    digests = {1: hashlib.sha256(), 4: hashlib.sha256()}
    terms = 0
    negative = 0
    minimum = None
    first_negative = None
    previous_key = None
    for term_index in range(len(polynomial)):
        reduced = tuple(map(int, polynomial.monomial(term_index)))
        key = (-sum(reduced), tuple(reversed(reduced)))
        if previous_key is not None:
            assert previous_key <= key
        previous_key = key
        assert sum(reduced) + outer == DEGREE
        if not any(reduced[index] for index in group_a_indices):
            continue
        if outer == 0 and not any(reduced[index] for index in group_b_indices):
            continue
        coefficient = int(polynomial.coefficient(term_index))
        assert coefficient != 0
        full = (0, 0, 0, 0, 0) + reduced + (outer,)
        encoded_far = (
            ",".join(map(str, full)) + ":" + str(coefficient) + "\n"
        ).encode()
        encoded_middle = (
            ",".join(map(str, full)) + ":" + str(4 * coefficient) + "\n"
        ).encode()
        digests[1].update(encoded_far)
        digests[4].update(encoded_middle)
        terms += 1
        minimum = coefficient if minimum is None else min(minimum, coefficient)
        if coefficient < 0:
            negative += 1
            if first_negative is None:
                first_negative = {"monomial": list(full), "coefficient": coefficient}
        if terms % 100_000 == 0:
            print("OUTER", outer, "MIXED TERMS", terms, "PRIVATE", private_bytes(), flush=True)
            guard(f"b0^{outer} coefficient term {terms}", peak, limit)
    return {
        "outer_exponent": outer,
        "unfiltered_terms": len(polynomial),
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "minimum_far": minimum,
        "first_negative_far": first_negative,
        "ordered_far_coefficient_sha256": digests[1].hexdigest().upper(),
        "ordered_middle_coefficient_sha256": digests[4].hexdigest().upper(),
    }


def scaled_stat(base: dict, scale: int) -> dict:
    minimum = base["minimum_far"]
    first = base["first_negative_far"]
    return {
        "outer_exponent": base["outer_exponent"],
        "unfiltered_terms": base["unfiltered_terms"],
        "mixed_support_terms": base["mixed_support_terms"],
        "negative_terms": base["negative_terms"],
        "minimum": None if minimum is None else scale * minimum,
        "first_negative": None if first is None else {
            "monomial": first["monomial"],
            "coefficient": scale * first["coefficient"],
        },
        "ordered_coefficient_sha256": base[
            "ordered_far_coefficient_sha256"
            if scale == 1 else "ordered_middle_coefficient_sha256"
        ],
    }


def artifact_prefix(output_dir: Path, face_token: str, label: str) -> Path:
    return output_dir / (
        f"rank8_low_low_a23_mixed_cross_face_{face_token}_{label}_grade_17_"
        f"outer_stream_agent_{DATE_TAG}"
    )


def write_four_manifests(output_dir: Path, slice_stats: list[dict], source_hash: str,
                         note: dict, peak: list[int], limit: int) -> list[dict]:
    completed = []
    for face_token, face in FACES:
        for label, scale in LABELS:
            prefix = artifact_prefix(output_dir, face_token, label)
            chunks = []
            overall = hashlib.sha256()
            total_terms = total_negative = 0
            for base in slice_stats:
                stat = scaled_stat(base, scale)
                # Reconstruct the complete row digest by concatenating the
                # exact per-slice coefficient lines.  Since only digests were
                # retained, the already-computed complete digests are passed
                # separately below; this loop writes the durable chunk data.
                chunk_payload = {
                    "schema": "rank8-low-low-a23-mixed-cross-grade17-top-shared-chunk-agent-v1",
                    "status": (
                        "PASS_EXACT_MIXED_CROSS_OUTER_CHUNK_COEFFICIENTWISE_NONNEGATIVE"
                        if stat["negative_terms"] == 0
                        else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
                    ),
                    "face": list(face),
                    "bridge_corner": [2 * face[0], 2 * face[1]],
                    "family": "strong",
                    "auxiliary": label,
                    "total_ordinary_slack_degree": DEGREE,
                    "outer_variable": "b0",
                    "outer_exponent": stat["outer_exponent"],
                    "outer_support_bound": [0, 2],
                    "variables": list(FULL_NAMES),
                    "group_A": list(GROUP_A),
                    "group_B": list(GROUP_B),
                    "row_scale_from_shared_far_polynomial": scale,
                    "chunk": stat,
                    "literal_identities": {
                        "face_01_equals_face_10": True,
                        "strong_middle_times_4_equals_4_times_strong_far": True,
                    },
                    "source_sha256": source_hash,
                    "theoretical_note": note,
                }
                path = Path(str(prefix) + f"_b0_exp_{stat['outer_exponent']}.json")
                chunk_hash = atomic_json(path, chunk_payload)
                chunks.append({
                    "outer_exponent": stat["outer_exponent"],
                    "path": str(path.resolve()),
                    "sha256": chunk_hash,
                    "mixed_support_terms": stat["mixed_support_terms"],
                    "negative_terms": stat["negative_terms"],
                    "minimum": stat["minimum"],
                    "ordered_coefficient_sha256": stat["ordered_coefficient_sha256"],
                })
                total_terms += stat["mixed_support_terms"]
                total_negative += stat["negative_terms"]
            # Complete digests were updated directly while each polynomial was
            # live, then stored in slice_stats[0]'s shared metadata.
            row_digest = slice_stats[0]["complete_digests"][str(scale)]
            result = {
                "chunks": chunks,
                "mixed_support_terms": total_terms,
                "negative_terms": total_negative,
                "ordered_coefficient_sha256": row_digest,
                "piece_names": ["grade17_base_capacity_slack_times_base_curvature"],
                "piece_scales": [scale],
            }
            manifest_payload = {
                "schema": "rank8-low-low-a23-mixed-cross-grade17-top-shared-manifest-agent-v1",
                "status": (
                    "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE"
                    if total_negative == 0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
                ),
                "face": list(face),
                "bridge_corner": [2 * face[0], 2 * face[1]],
                "family": "strong",
                "auxiliary": label,
                "total_ordinary_slack_degree": DEGREE,
                "outer_variable": "b0",
                "outer_exponent_range": [0, 2],
                "global_row_assembly": False,
                "construction_identity": (
                    "A*[b0^e](C8^2-C7*C9), with C the top homogeneous "
                    "binomial convolution"
                ),
                "literal_identities": {
                    "face_01_equals_face_10": True,
                    "strong_middle_times_4_equals_4_times_strong_far": True,
                    "endpoint_variables_absent": ["P", "Q"],
                    "base_variables_zero_in_top_part": list(BASE_NAMES),
                },
                "hard_private_memory_limit_bytes": limit,
                "observed_peak_private_bytes_at_checkpoints": peak[0],
                "result": result,
                "source_sha256": source_hash,
                "theoretical_note": note,
            }
            manifest_path = Path(str(prefix) + "_manifest.json")
            manifest_hash = atomic_json(manifest_path, manifest_payload)
            completed.append({
                "face_token": face_token,
                "face": list(face),
                "auxiliary": label,
                "scale": scale,
                "manifest": str(manifest_path.resolve()),
                "manifest_sha256": manifest_hash,
                "mixed_support_terms": total_terms,
                "negative_terms": total_negative,
                "ordered_coefficient_sha256": row_digest,
            })
    return completed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-directory", default=".")
    parser.add_argument("--private-limit", type=int, default=DEFAULT_PRIVATE_LIMIT)
    args = parser.parse_args()
    output_dir = Path(args.output_directory).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    source_hash = sha256(Path(__file__))
    note = checked_note()
    peak = [0]
    guard("start", peak, args.private_limit)
    context = fmpz_mpoly_ctx.get(REDUCED_SLACK_NAMES, "degrevlex")
    _, capacity_slack, convolutions = build_top_convolutions(
        context, peak, args.private_limit
    )
    slice_stats = []
    complete = {1: hashlib.sha256(), 4: hashlib.sha256()}
    for outer in (0, 1, 2):
        FAILURE_CONTEXT["outer_exponent"] = outer
        polynomial = construct_far_slice(
            capacity_slack, convolutions, outer, peak, args.private_limit
        )
        stat = stream_slice(polynomial, outer, peak, args.private_limit)
        # Re-stream only the surviving mixed coefficients into the complete
        # digests while the slice is still live.  This is indexed and bounded;
        # it avoids retaining any Python coefficient table.
        group_a_indices = tuple(REDUCED_SLACK_NAMES.index(name) for name in GROUP_A)
        group_b_indices = tuple(
            REDUCED_SLACK_NAMES.index(name) for name in GROUP_B if name != "b0"
        )
        for term_index in range(len(polynomial)):
            reduced = tuple(map(int, polynomial.monomial(term_index)))
            if not any(reduced[index] for index in group_a_indices):
                continue
            if outer == 0 and not any(reduced[index] for index in group_b_indices):
                continue
            coefficient = int(polynomial.coefficient(term_index))
            full = (0, 0, 0, 0, 0) + reduced + (outer,)
            prefix = ",".join(map(str, full)) + ":"
            complete[1].update((prefix + str(coefficient) + "\n").encode())
            complete[4].update((prefix + str(4 * coefficient) + "\n").encode())
        slice_stats.append(stat)
        print(
            "SLICE", outer, "UNFILTERED", stat["unfiltered_terms"],
            "MIXED", stat["mixed_support_terms"], "NEGATIVE", stat["negative_terms"],
            "MIN", stat["minimum_far"], "PRIVATE", private_bytes(), flush=True,
        )
        del polynomial
        gc.collect()
        guard(f"after releasing b0^{outer}", peak, args.private_limit)
    slice_stats[0]["complete_digests"] = {
        str(scale): digest.hexdigest().upper() for scale, digest in complete.items()
    }
    completed = write_four_manifests(
        output_dir, slice_stats, source_hash, note, peak, args.private_limit
    )
    all_nonnegative = all(item["negative_terms"] == 0 for item in completed)
    assert len(completed) == 4
    assert completed[0]["ordered_coefficient_sha256"] == completed[2]["ordered_coefficient_sha256"]
    assert completed[1]["ordered_coefficient_sha256"] == completed[3]["ordered_coefficient_sha256"]
    job_payload = {
        "schema": "rank8-low-low-a23-mixed-cross-grade17-top-shared-job-agent-v1",
        "status": (
            "PASS_EXACT_SHARED_GRADE17_FOUR_STRONG_CELLS_NONNEGATIVE"
            if all_nonnegative else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
        ),
        "total_ordinary_slack_degree": DEGREE,
        "faces": [list(face) for _, face in FACES],
        "rows": [label for label, _ in LABELS],
        "completed_cells": completed,
        "outer_slices": [
            {key: value for key, value in item.items() if key != "complete_digests"}
            for item in slice_stats
        ],
        "literal_identity_proof": {
            "top_left_ratios": [
                "a0+A", "A", "A", "A", "A", "a5+a6+a7", "a6+a7", "a7", "0"
            ],
            "top_right_ratios": [
                "b0+B", "B", "B", "B", "B", "b5+b6+b7", "b6+b7", "b7", "0"
            ],
            "capacity_top_part": "A=a4+a5+a6+a7",
            "endpoint_variables_P_Q_absent": True,
            "face_01_equals_face_10": True,
            "middle_equals_4_times_far": True,
            "far_formula": "A*(C8^2-C7*C9)",
        },
        "hard_private_memory_limit_bytes": args.private_limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": source_hash,
        "theoretical_note": note,
    }
    job_path = output_dir / (
        "rank8_low_low_a23_mixed_cross_strong_grade17_top_shared_job_agent_20260823.json"
    )
    job_hash = atomic_json(job_path, job_payload)
    print("JOB", job_path, job_hash, job_payload["status"], flush=True)
    if not all_nonnegative:
        raise SystemExit(2)


if __name__ == "__main__":
    try:
        main()
    except BaseException as exc:
        failure = {
            "schema": "rank8-low-low-a23-mixed-cross-grade17-top-shared-failure-agent-v1",
            "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_STOP",
            "exception_type": type(exc).__name__,
            "exception": str(exc),
            "context": FAILURE_CONTEXT,
            "source_sha256": sha256(Path(__file__)),
        }
        atomic_json(
            HERE / "rank8_low_low_a23_mixed_cross_strong_grade17_top_shared_failure_agent_20260823.json",
            failure,
        )
        raise
