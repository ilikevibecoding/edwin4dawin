#!/usr/bin/env python3
"""Independent per-base derivative replay for distinct strong grade-16 faces.

This reconstruction uses nine slack variables and differentiates separately
with respect to each of the five base variables.  It independently rebuilds
full C, oriented tail V, and both direction rows, including the canonical
h*derivative-cross term (which vanishes only after differentiation at the
base origin).  It imports no producer code.
"""
from __future__ import annotations

import argparse
import ctypes
import gc
import hashlib
import heapq
import json
import math
import os
from ctypes import wintypes
from pathlib import Path

from flint import fmpz_mpoly_ctx

HERE = Path(__file__).resolve().parent
JOB = "rank8_low_low_a23_mixed_cross_strong_grade16_c_v_piece_merge_job_agent_20260823.json"
JOB_SHA256 = "5923F3DF5DC54C317D0033FBD18451ED1B5D08943FD1034C5F36A95A903E53EF"
PRODUCER_SOURCE = "36854CF5D7A08DD70821E3E2C219A7EBEADECC26E955F20F5763AD83F980C484"
SCOPE = (
    "rank8_low_low_a23_mixed_cross_strong_grade16_formula_scope_audit_agent_20260823.json",
    "9ECDC098157CC1F98E240C3FF2367BE1B9D737B1F06357599DD86C7C3B8A9DB8",
)
BASE = ("h", "ta", "tb", "P", "Q")
SLACK = ("a0", "b4", "b5", "b6", "b7", "a4", "a5", "a6", "a7")
FACES = (("01", (0, 1)), ("10", (1, 0)))
LABELS = (("strong_middle_times_4", 4, 2), ("strong_far", 1, 1))
DEGREE = 16
LIMIT = 475_000_000
FAILURE_CONTEXT = {}


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


def private_bytes():
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


def guard(stage, peak, limit):
    current = private_bytes()
    peak[0] = max(peak[0], current)
    FAILURE_CONTEXT.update(stage=stage, private_bytes=current, peak_private_bytes=peak[0])
    if current >= limit:
        raise MemoryError(f"private-memory guard {stage}: {current} >= {limit}")


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def atomic_json(path, payload):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def pinned(path, expected):
    actual = sha256(path)
    assert actual == expected, (Path(path).name, actual, expected)
    return json.loads(Path(path).read_text(encoding="utf-8"))


class J:
    """Value and one selected base-variable derivative at the base origin."""

    __slots__ = ("v", "d")

    def __init__(self, value, derivative):
        self.v = value
        self.d = derivative

    def __add__(self, other):
        if not isinstance(other, J):
            other = J(other, self.v.context().constant(0))
        return J(self.v + other.v, self.d + other.d)

    __radd__ = __add__

    def __neg__(self):
        return J(-self.v, -self.d)

    def __sub__(self, other):
        return self + (-other)

    def __mul__(self, other):
        if not isinstance(other, J):
            return J(self.v * other, self.d * other)
        return J(self.v * other.v, self.v * other.d + self.d * other.v)

    __rmul__ = __mul__


def pair_add(left, right):
    return (left[0] + right[0], left[1] + right[1])


def pair_mul(left, right):
    # The unique b0-bearing factor can occur at most once in a row product.
    assert (not left[1].v and not left[1].d) or (not right[1].v and not right[1].d)
    return (left[0] * right[0], left[0] * right[1] + left[1] * right[0])


def zero_pair(zero):
    return (J(zero, zero), J(zero, zero))


def build(face, base_name, context, peak, limit):
    raw = dict(zip(SLACK, context.gens()))
    zero = context.constant(0)
    one = context.constant(1)
    base = {name: J(zero, one if name == base_name else zero) for name in BASE}
    slack = {name: J(raw[name], zero) for name in SLACK}
    h, ta, tb, p, q = (base[name] for name in BASE)
    z, w = face
    a2, a3 = (1 - z) * p, z * p
    b2, b3 = (1 - w) * q, w * q

    left_gaps = [
        2 * h + slack["a0"], h, h + a2, h + a3,
        h + slack["a4"], h + slack["a5"],
        h + slack["a6"], h + slack["a7"],
    ]
    left_ratios = [None] * 9
    left_ratios[8] = ta
    for index in range(7, -1, -1):
        left_ratios[index] = left_ratios[index + 1] + left_gaps[index]
    left = [J(one, zero)]
    for ratio in left_ratios:
        left.append(left[-1] * ratio)
    tail = [J(zero, zero), J(zero, zero), J(zero, zero)] + left[3:]
    capacity = left_ratios[2]

    right_gaps = [
        2 * h, h, h + b2, h + b3,
        h + slack["b4"], h + slack["b5"],
        h + slack["b6"], h + slack["b7"],
    ]
    right_ratios = [None] * 9
    right_ratios[8] = (tb, J(zero, zero))
    for index in range(7, -1, -1):
        right_ratios[index] = pair_add(
            right_ratios[index + 1],
            (right_gaps[index], J(one, zero) if index == 0 else J(zero, zero)),
        )
    right = [(J(one, zero), J(zero, zero))]
    for ratio in right_ratios:
        right.append(pair_mul(right[-1], ratio))

    direction = [zero_pair(zero) for _ in range(10)]
    direction[3] = (right[2][0] * h, right[2][1] * h)
    for rank in range(4, 10):
        direction[rank] = pair_mul(direction[rank - 1], right_ratios[rank - 1])
    for pair in direction:
        assert not pair[0].v and not pair[1].v

    c, v, dc, dv = {}, {}, {}, {}
    for rank in (7, 8, 9):
        c_rank = zero_pair(zero)
        v_rank = zero_pair(zero)
        dc_rank = zero_pair(zero)
        dv_rank = zero_pair(zero)
        for index in range(rank + 1):
            weight = math.comb(rank, index)
            c_rank = pair_add(
                c_rank,
                (
                    weight * left[index] * right[rank - index][0],
                    weight * left[index] * right[rank - index][1],
                ),
            )
            v_rank = pair_add(
                v_rank,
                (
                    weight * tail[index] * right[rank - index][0],
                    weight * tail[index] * right[rank - index][1],
                ),
            )
            dc_rank = pair_add(
                dc_rank,
                (
                    weight * left[index] * direction[rank - index][0],
                    weight * left[index] * direction[rank - index][1],
                ),
            )
            dv_rank = pair_add(
                dv_rank,
                (
                    weight * tail[index] * direction[rank - index][0],
                    weight * tail[index] * direction[rank - index][1],
                ),
            )
        c[rank], v[rank], dc[rank], dv[rank] = c_rank, v_rank, dc_rank, dv_rank
    guard(f"independent strong16 face{face} derivative {base_name}", peak, limit)
    return h, capacity, c, v, dc, dv


def pair_product(left, right, outer, zero):
    result = J(zero, zero)
    for left_outer in range(2):
        right_outer = outer - left_outer
        if 0 <= right_outer < 2:
            result += left[left_outer] * right[right_outer]
    return result


def curvature(c, outer, h, zero):
    return (
        pair_product(c[8], c[8], outer, zero)
        - pair_product(c[7], c[9], outer, zero)
        - h * pair_product(c[7], c[8], outer, zero)
    )


def cross(c, dc, outer, h, zero):
    return (
        2 * pair_product(c[8], dc[8], outer, zero)
        - pair_product(c[7], dc[9], outer, zero)
        - pair_product(dc[7], c[9], outer, zero)
        - h
        * (
            pair_product(c[7], dc[8], outer, zero)
            + pair_product(dc[7], c[8], outer, zero)
        )
    )


def derivative(c, v, outer, h, zero):
    return (
        2 * pair_product(c[8], v[8], outer, zero)
        - pair_product(v[7], c[9], outer, zero)
        - pair_product(c[7], v[9], outer, zero)
        - h
        * (
            pair_product(v[7], c[8], outer, zero)
            + pair_product(c[7], v[8], outer, zero)
        )
    )


def derivative_cross(c, dc, v, dv, outer, h, zero):
    return (
        2
        * (
            pair_product(c[8], dv[8], outer, zero)
            + pair_product(dc[8], v[8], outer, zero)
        )
        - pair_product(v[7], dc[9], outer, zero)
        - pair_product(dv[7], c[9], outer, zero)
        - pair_product(c[7], dv[9], outer, zero)
        - pair_product(dc[7], v[9], outer, zero)
        - h
        * (
            pair_product(v[7], dc[8], outer, zero)
            + pair_product(dv[7], c[8], outer, zero)
            + pair_product(c[7], dv[8], outer, zero)
            + pair_product(dc[7], v[8], outer, zero)
        )
    )


def pieces(h, capacity, c, v, dc, dv, outer, zero, peak, limit):
    base = capacity * curvature(c, outer, h, zero) + h * derivative(c, v, outer, h, zero)
    linear = capacity * cross(c, dc, outer, h, zero) + h * derivative_cross(
        c, dc, v, dv, outer, h, zero
    )
    # The second summand is retained in the independent formula and its
    # derivative vanishes because h, DC, and DV all vanish at the base origin.
    guard(f"independent strong16 pieces outer{outer}", peak, limit)
    return base.d, linear.d


class Cursor:
    def __init__(self, poly, base_index, piece_index, outer):
        self.poly = poly
        self.base_index = base_index
        self.piece_index = piece_index
        self.outer = outer
        self.index = 0

    def advance(self):
        if self.index >= len(self.poly):
            return None
        reduced = tuple(map(int, self.poly.monomial(self.index)))
        coefficient = int(self.poly.coefficient(self.index))
        self.index += 1
        base = tuple(1 if index == self.base_index else 0 for index in range(5))
        full = base + reduced + (self.outer,)
        return (-sum(full), tuple(reversed(full))), full, coefficient


def merge(records, outer, complete, peak, limit):
    cursors = []
    for base_index, (base_poly, linear_poly) in enumerate(records):
        for piece_index, poly in enumerate((base_poly, linear_poly)):
            if len(poly):
                cursors.append(Cursor(poly, base_index, piece_index, outer))
    heap = []
    for index, cursor in enumerate(cursors):
        item = cursor.advance()
        if item is not None:
            heapq.heappush(heap, (item[0], index, item[1], item[2]))
    stats = {
        label: {
            "outer_exponent": outer,
            "mixed_support_terms": 0,
            "negative_terms": 0,
            "minimum": None,
            "first_negative": None,
            "ordered_coefficient_sha256": None,
        }
        for label, _, _ in LABELS
    }
    digests = {label: hashlib.sha256() for label, _, _ in LABELS}
    raw_union = 0
    previous = None
    while heap:
        order, index, full, coefficient = heapq.heappop(heap)
        coefficients = [0, 0]
        coefficients[cursors[index].piece_index] += coefficient
        consumed = [index]
        while heap and heap[0][0] == order:
            _, other_index, other_full, other_coefficient = heapq.heappop(heap)
            assert other_full == full
            coefficients[cursors[other_index].piece_index] += other_coefficient
            consumed.append(other_index)
        for other_index in consumed:
            item = cursors[other_index].advance()
            if item is not None:
                heapq.heappush(heap, (item[0], other_index, item[1], item[2]))
        if previous is not None:
            assert previous <= order
        previous = order
        raw_union += 1
        reduced = full[5:-1]
        assert sum(full[:5]) == 1 and sum(reduced) + outer == DEGREE
        if not any(reduced[index] for index in range(5)):
            continue
        if outer == 0 and not any(reduced[index] for index in range(5, 9)):
            continue
        prefix = ",".join(map(str, full)) + ":"
        for label, base_scale, linear_scale in LABELS:
            combined = base_scale * coefficients[0] + linear_scale * coefficients[1]
            if not combined:
                continue
            encoded = (prefix + str(combined) + "\n").encode()
            digests[label].update(encoded)
            complete[label].update(encoded)
            stat = stats[label]
            stat["mixed_support_terms"] += 1
            stat["minimum"] = combined if stat["minimum"] is None else min(stat["minimum"], combined)
            if combined < 0:
                stat["negative_terms"] += 1
                if stat["first_negative"] is None:
                    stat["first_negative"] = {"monomial": list(full), "coefficient": combined}
        if raw_union % 100000 == 0:
            print("INDEPENDENT STRONG16 MERGE OUTER", outer, "RAW", raw_union, "PRIVATE", private_bytes(), flush=True)
        guard(f"independent strong16 merge outer{outer} raw{raw_union}", peak, limit)
    for label in stats:
        stats[label]["ordered_coefficient_sha256"] = digests[label].hexdigest().upper()
        stats[label]["unfiltered_union_terms"] = raw_union
    return stats


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--private-limit", type=int, default=LIMIT)
    args = parser.parse_args()
    assert JOB_SHA256 != "__PIN_AFTER_PRODUCER__"
    scope = pinned(HERE / SCOPE[0], SCOPE[1])
    assert scope["status"] == "PASS_CANONICAL_GRADE16_STRONG_SCOPE_FULL_C_TAIL_V_BASE_LINEAR_DISTINCT_FACES"
    job = pinned(HERE / JOB, JOB_SHA256)
    assert job["source_sha256"] == PRODUCER_SOURCE
    assert job["status"] == "PASS_EXACT_DISTINCT_FACES_GRADE16_STRONG_C_V_BASE_LINEAR_ROWS_NONNEGATIVE"

    peak = [0]
    all_replays = {}
    completed = {}
    for token, face in FACES:
        context = fmpz_mpoly_ctx.get(SLACK, "degrevlex")
        zero = context.constant(0)
        complete = {label: hashlib.sha256() for label, _, _ in LABELS}
        replays = {label: [] for label, _, _ in LABELS}
        for outer in (0, 1, 2):
            records = []
            for base_name in BASE:
                FAILURE_CONTEXT.update(face_token=token, outer_exponent=outer, base_variable=base_name)
                h, capacity, c, v, dc, dv = build(face, base_name, context, peak, args.private_limit)
                records.append(pieces(h, capacity, c, v, dc, dv, outer, zero, peak, args.private_limit))
                del h, capacity, c, v, dc, dv
                gc.collect()
            stats = merge(records, outer, complete, peak, args.private_limit)
            for label, _, _ in LABELS:
                replays[label].append(stats[label])
                print(
                    "AUDIT STRONG16 FACE", token, "ROW", label, "OUTER", outer,
                    "TERMS", stats[label]["mixed_support_terms"],
                    "NEG", stats[label]["negative_terms"], "MIN", stats[label]["minimum"],
                    flush=True,
                )
            del records
            gc.collect()
            guard(f"audit strong16 released face{token} outer{outer}", peak, args.private_limit)
        all_replays[token] = replays
        completed[token] = {label: complete[label].hexdigest().upper() for label, _, _ in LABELS}
        del context
        gc.collect()

    produced = {(item["face_token"], item["auxiliary"]): item for item in job["completed_cells"]}
    cells = []
    for token, face in FACES:
        for label, _, _ in LABELS:
            item = produced[(token, label)]
            path = Path(item["manifest"])
            assert sha256(path) == item["manifest_sha256"]
            manifest = json.loads(path.read_text(encoding="utf-8"))
            canonical_scope = manifest["canonical_scope"]
            assert canonical_scope["margin_uses_full_C"] is True
            assert canonical_scope["derivative_uses_oriented_left_tail_V"] is True
            assert canonical_scope["faces_computed_separately"] is True
            assert canonical_scope["surviving_pieces"] == ["base", "linear"]
            assert manifest["result"]["ordered_coefficient_sha256"] == completed[token][label]
            for replay, record in zip(all_replays[token][label], manifest["result"]["chunks"]):
                chunk = pinned(Path(record["path"]), record["sha256"])
                assert chunk["chunk"] == replay
                assert record["ordered_coefficient_sha256"] == replay["ordered_coefficient_sha256"]
                assert replay["negative_terms"] == 0
            cells.append(
                {
                    "face_token": token,
                    "face": list(face),
                    "auxiliary": label,
                    "producer_manifest": path.name,
                    "producer_manifest_sha256": item["manifest_sha256"],
                    "replayed_negative_terms": 0,
                    "replayed_ordered_coefficient_sha256": completed[token][label],
                    "row_replays": all_replays[token][label],
                }
            )

    report = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-grade16-per-base-derivative-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_PER_BASE_DERIVATIVE_RECONSTRUCTION_BOTH_DISTINCT_FACES_GRADE16_STRONG_ROWS",
        "imports_producer": False,
        "producer_job": JOB,
        "producer_job_sha256": JOB_SHA256,
        "producer_source_sha256": PRODUCER_SOURCE,
        "scope_audit": {"path": SCOPE[0], "sha256": SCOPE[1]},
        "total_ordinary_slack_degree": DEGREE,
        "cells": cells,
        "row_replays": all_replays,
        "checks": {
            "margin_uses_full_convolution_C": True,
            "derivative_uses_oriented_left_tail_V": True,
            "canonical_h_derivative_cross_formula_reconstructed_before_projection": True,
            "base_and_linear_only": True,
            "direction_excluded": True,
            "five_base_derivatives_separately_reconstructed": True,
            "faces_separately_reconstructed": True,
            "face_hash_reuse": False,
        },
        "hard_private_memory_limit_bytes": args.private_limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": sha256(Path(__file__)),
    }
    output = HERE / "rank8_low_low_a23_mixed_cross_strong_grade16_per_base_derivative_independent_audit_agent_20260823.json"
    print("AUDIT REPORT", output, atomic_json(output, report), report["status"], flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as exc:
        atomic_json(
            HERE / "rank8_low_low_a23_mixed_cross_strong_grade16_per_base_derivative_independent_audit_failure_agent_20260823.json",
            {
                "schema": "rank8-low-low-a23-mixed-cross-strong-grade16-independent-audit-failure-agent-v1",
                "status": "FAIL_CLOSED_INDEPENDENT_AUDIT_EXCEPTION_OR_MEMORY_STOP",
                "exception_type": type(exc).__name__,
                "exception": str(exc),
                "context": FAILURE_CONTEXT,
                "source_sha256": sha256(Path(__file__)),
            },
        )
        raise
