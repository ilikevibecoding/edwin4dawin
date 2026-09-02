#!/usr/bin/env python3
"""Independent reconstruction audit of the shared strong grade-17 rows.

This file deliberately does not import the producer.  It transcribes the top
homogeneous factor rows in closed form, reconstructs every b0 coefficient,
and exact-compares all four face/row manifests coefficient digest by
coefficient digest.  The audit also checks, coefficientwise, that the two
endpoint faces coincide and the middle row is four times the far row.
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
JOB = "rank8_low_low_a23_mixed_cross_strong_grade17_top_shared_job_agent_20260823.json"
JOB_SHA256 = "A613A60400DCA2B4F8554D55EB9F7F38238932D1F4BBFFB5F6208D1AD3C4C9DC"
PRODUCER_SOURCE_SHA256 = "5E3B2E138C5DC538C602E4D48893C79E116476F8513E450CDE86A7E825344766"
THEORETICAL_NOTE = (
    "RANK8_LOW_LOW_A23_MIXED_CROSS_HIGH_GRADE_BOUNDS_AGENT_20260822.md",
    "BE056D1EAC7AD07EDB42BFDEE40873C949D32D24F3EC8912BD5B555D5E3B394E",
)
REDUCED = ("a0", "b4", "b5", "b6", "b7", "a4", "a5", "a6", "a7")
FULL = ("h", "ta", "tb", "P", "Q") + REDUCED + ("b0",)
GROUP_A_INDICES = (0, 1, 2, 3, 4)
GROUP_B_REDUCED_INDICES = (5, 6, 7, 8)
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


def pinned_json(path: Path, expected: str) -> dict:
    actual = sha256(path)
    assert actual == expected, (path.name, actual, expected)
    return json.loads(path.read_text(encoding="utf-8"))


def closed_form_rows(context, peak: list[int], limit: int):
    """An explicit transcription independent of the producer recurrence."""
    x = dict(zip(REDUCED, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    A = x["a4"] + x["a5"] + x["a6"] + x["a7"]
    A5 = x["a5"] + x["a6"] + x["a7"]
    A6 = x["a6"] + x["a7"]
    X = x["a0"] + A
    B = x["b4"] + x["b5"] + x["b6"] + x["b7"]
    B5 = x["b5"] + x["b6"] + x["b7"]
    B6 = x["b6"] + x["b7"]

    # Closed products of the top homogeneous left factor ratios.
    left = [
        one,
        X,
        X * A,
        X * A**2,
        X * A**3,
        X * A**4,
        X * A**4 * A5,
        X * A**4 * A5 * A6,
        X * A**4 * A5 * A6 * x["a7"],
        zero,
    ]
    # Closed b0^0 and b0^1 coefficients of the right factor row.  These
    # formulas follow directly from the single affine factor (B+b0).
    right0 = [
        one,
        B,
        B**2,
        B**3,
        B**4,
        B**5,
        B**5 * B5,
        B**5 * B5 * B6,
        B**5 * B5 * B6 * x["b7"],
        zero,
    ]
    right1 = [
        zero,
        one,
        B,
        B**2,
        B**3,
        B**4,
        B**4 * B5,
        B**4 * B5 * B6,
        B**4 * B5 * B6 * x["b7"],
        zero,
    ]
    for rank in range(1, 9):
        assert right0[rank] == B * right1[rank]
    guard("closed factor rows", peak, limit)

    c = {}
    for rank in (7, 8, 9):
        c0 = zero
        c1 = zero
        for index in range(rank + 1):
            weight = math.comb(rank, index)
            c0 += weight * left[index] * right0[rank - index]
            c1 += weight * left[index] * right1[rank - index]
        c[rank] = (c0, c1)
        guard(f"closed convolution rank {rank}", peak, limit)
    return A, c


def reconstructed_slice(A, c: dict[int, tuple], outer: int,
                        peak: list[int], limit: int):
    if outer == 0:
        value = c[8][0] * c[8][0]
        guard("audit b0^0 square", peak, limit)
        other = c[7][0] * c[9][0]
        guard("audit b0^0 product", peak, limit)
        value -= other
    elif outer == 1:
        value = 2 * c[8][0] * c[8][1]
        guard("audit b0^1 first product", peak, limit)
        other = c[7][0] * c[9][1]
        guard("audit b0^1 second product", peak, limit)
        value -= other
        del other
        gc.collect()
        other = c[7][1] * c[9][0]
        guard("audit b0^1 third product", peak, limit)
        value -= other
    else:
        assert outer == 2
        value = c[8][1] * c[8][1]
        guard("audit b0^2 square", peak, limit)
        other = c[7][1] * c[9][1]
        guard("audit b0^2 product", peak, limit)
        value -= other
    del other
    gc.collect()
    result = A * value
    del value
    gc.collect()
    guard(f"audit b0^{outer} complete polynomial", peak, limit)
    return result


def replay_slice(polynomial, outer: int, complete: dict[int, hashlib._Hash],
                 peak: list[int], limit: int) -> dict:
    digests = {1: hashlib.sha256(), 4: hashlib.sha256()}
    terms = negative = 0
    minimum = None
    first_negative = None
    previous = None
    for term_index in range(len(polynomial)):
        reduced = tuple(map(int, polynomial.monomial(term_index)))
        key = (-sum(reduced), tuple(reversed(reduced)))
        if previous is not None:
            assert previous <= key
        previous = key
        assert sum(reduced) + outer == DEGREE
        if not any(reduced[index] for index in GROUP_A_INDICES):
            continue
        if outer == 0 and not any(
            reduced[index] for index in GROUP_B_REDUCED_INDICES
        ):
            continue
        coefficient = int(polynomial.coefficient(term_index))
        full = (0, 0, 0, 0, 0) + reduced + (outer,)
        prefix = ",".join(map(str, full)) + ":"
        for scale in (1, 4):
            encoded = (prefix + str(scale * coefficient) + "\n").encode()
            digests[scale].update(encoded)
            complete[scale].update(encoded)
        terms += 1
        minimum = coefficient if minimum is None else min(minimum, coefficient)
        if coefficient < 0:
            negative += 1
            if first_negative is None:
                first_negative = {"monomial": list(full), "coefficient": coefficient}
        if terms % 100_000 == 0:
            print("AUDIT OUTER", outer, "MIXED TERMS", terms, "PRIVATE", private_bytes(), flush=True)
            guard(f"audit b0^{outer} coefficient {terms}", peak, limit)
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


def expected_scaled_stat(replay: dict, scale: int) -> dict:
    first = replay["first_negative_far"]
    return {
        "outer_exponent": replay["outer_exponent"],
        "unfiltered_terms": replay["unfiltered_terms"],
        "mixed_support_terms": replay["mixed_support_terms"],
        "negative_terms": replay["negative_terms"],
        "minimum": None if replay["minimum_far"] is None else scale * replay["minimum_far"],
        "first_negative": None if first is None else {
            "monomial": first["monomial"],
            "coefficient": scale * first["coefficient"],
        },
        "ordered_coefficient_sha256": replay[
            "ordered_far_coefficient_sha256"
            if scale == 1 else "ordered_middle_coefficient_sha256"
        ],
    }


def validate_artifacts(job: dict, replays: list[dict], complete_digests: dict[int, str]) -> list[dict]:
    assert job["status"] == "PASS_EXACT_SHARED_GRADE17_FOUR_STRONG_CELLS_NONNEGATIVE"
    assert job["source_sha256"] == PRODUCER_SOURCE_SHA256
    assert job["literal_identity_proof"]["face_01_equals_face_10"] is True
    assert job["literal_identity_proof"]["middle_equals_4_times_far"] is True
    assert job["literal_identity_proof"]["endpoint_variables_P_Q_absent"] is True
    assert job["outer_slices"] == replays
    completed = job["completed_cells"]
    assert len(completed) == 4
    results = []
    by_cell = {(item["face_token"], item["auxiliary"]): item for item in completed}
    for face_token, face in FACES:
        for label, scale in LABELS:
            item = by_cell[(face_token, label)]
            manifest_path = Path(item["manifest"])
            assert sha256(manifest_path) == item["manifest_sha256"]
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            assert manifest["status"] == "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE"
            assert manifest["source_sha256"] == PRODUCER_SOURCE_SHA256
            assert manifest["face"] == list(face)
            assert manifest["auxiliary"] == label
            assert manifest["total_ordinary_slack_degree"] == DEGREE
            assert manifest["literal_identities"]["face_01_equals_face_10"] is True
            assert manifest["literal_identities"]["strong_middle_times_4_equals_4_times_strong_far"] is True
            assert manifest["result"]["negative_terms"] == 0
            assert manifest["result"]["ordered_coefficient_sha256"] == complete_digests[scale]
            assert manifest["result"]["mixed_support_terms"] == sum(
                replay["mixed_support_terms"] for replay in replays
            )
            chunks = manifest["result"]["chunks"]
            assert [chunk["outer_exponent"] for chunk in chunks] == [0, 1, 2]
            for replay, record in zip(replays, chunks):
                chunk_path = Path(record["path"])
                assert sha256(chunk_path) == record["sha256"]
                chunk = json.loads(chunk_path.read_text(encoding="utf-8"))
                assert chunk["source_sha256"] == PRODUCER_SOURCE_SHA256
                assert chunk["face"] == list(face)
                assert chunk["auxiliary"] == label
                assert chunk["row_scale_from_shared_far_polynomial"] == scale
                expected = expected_scaled_stat(replay, scale)
                assert chunk["chunk"] == expected
                assert record["mixed_support_terms"] == expected["mixed_support_terms"]
                assert record["negative_terms"] == 0
                assert record["ordered_coefficient_sha256"] == expected["ordered_coefficient_sha256"]
            results.append({
                "face_token": face_token,
                "face": list(face),
                "auxiliary": label,
                "scale_from_far": scale,
                "producer_manifest": manifest_path.name,
                "producer_manifest_sha256": item["manifest_sha256"],
                "mixed_support_terms": manifest["result"]["mixed_support_terms"],
                "replayed_negative_terms": 0,
                "replayed_ordered_coefficient_sha256": complete_digests[scale],
            })
    assert results[0]["replayed_ordered_coefficient_sha256"] == results[2]["replayed_ordered_coefficient_sha256"]
    assert results[1]["replayed_ordered_coefficient_sha256"] == results[3]["replayed_ordered_coefficient_sha256"]
    return results


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--private-limit", type=int, default=DEFAULT_PRIVATE_LIMIT)
    args = parser.parse_args()
    assert JOB_SHA256 != "__PIN_AFTER_PRODUCER__", "auditor job hash was not pinned"
    assert sha256(HERE / THEORETICAL_NOTE[0]) == THEORETICAL_NOTE[1]
    job = pinned_json(HERE / JOB, JOB_SHA256)
    peak = [0]
    guard("audit start", peak, args.private_limit)
    context = fmpz_mpoly_ctx.get(REDUCED, "degrevlex")
    A, convolutions = closed_form_rows(context, peak, args.private_limit)
    complete = {1: hashlib.sha256(), 4: hashlib.sha256()}
    replays = []
    for outer in (0, 1, 2):
        FAILURE_CONTEXT["outer_exponent"] = outer
        polynomial = reconstructed_slice(A, convolutions, outer, peak, args.private_limit)
        replay = replay_slice(polynomial, outer, complete, peak, args.private_limit)
        replays.append(replay)
        print(
            "AUDIT SLICE", outer, "UNFILTERED", replay["unfiltered_terms"],
            "MIXED", replay["mixed_support_terms"], "NEGATIVE", replay["negative_terms"],
            "MIN", replay["minimum_far"], flush=True,
        )
        del polynomial
        gc.collect()
        guard(f"audit released b0^{outer}", peak, args.private_limit)
    complete_digests = {
        scale: digest.hexdigest().upper() for scale, digest in complete.items()
    }
    results = validate_artifacts(job, replays, complete_digests)
    report = {
        "schema": "rank8-low-low-a23-mixed-cross-grade17-top-shared-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_CLOSED_FORM_RECONSTRUCTION_ALL_FOUR_GRADE17_STRONG_CELLS",
        "imports_producer": False,
        "producer_job": JOB,
        "producer_job_sha256": JOB_SHA256,
        "producer_source_sha256": PRODUCER_SOURCE_SHA256,
        "total_ordinary_slack_degree": DEGREE,
        "outer_exponents_replayed": [0, 1, 2],
        "replayed_outer_slices": replays,
        "cells": results,
        "literal_identity_checks": {
            "closed_form_rows_equal_single_factor_recurrence_by_explicit_products": True,
            "P_Q_and_face_coordinates_absent_from_top_rows": True,
            "face_01_equals_face_10_coefficientwise": True,
            "middle_equals_4_times_far_coefficientwise": True,
            "all_four_rows_have_zero_negative_coefficients": True,
        },
        "hard_private_memory_limit_bytes": args.private_limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "theoretical_note": {
            "path": THEORETICAL_NOTE[0], "sha256": THEORETICAL_NOTE[1]
        },
        "source_sha256": sha256(Path(__file__)),
    }
    output = HERE / (
        "rank8_low_low_a23_mixed_cross_strong_grade17_top_shared_independent_audit_agent_20260823.json"
    )
    report_hash = atomic_json(output, report)
    print("AUDIT REPORT", output, report_hash, report["status"], flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as exc:
        failure = {
            "schema": "rank8-low-low-a23-mixed-cross-grade17-top-shared-independent-audit-failure-agent-v1",
            "status": "FAIL_CLOSED_INDEPENDENT_AUDIT_EXCEPTION_OR_MEMORY_STOP",
            "exception_type": type(exc).__name__,
            "exception": str(exc),
            "context": FAILURE_CONTEXT,
            "source_sha256": sha256(Path(__file__)),
        }
        atomic_json(
            HERE / "rank8_low_low_a23_mixed_cross_strong_grade17_top_shared_independent_audit_failure_agent_20260823.json",
            failure,
        )
        raise
