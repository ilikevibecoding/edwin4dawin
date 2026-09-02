#!/usr/bin/env python3
"""Independent 15-base-monomial replay of curvature grade-14 rows.

The audit works only in the nine slack variables.  For each of the fifteen
degree-two monomials in h,ta,tb,P,Q, it independently extracts that exact
coefficient using a small target-coefficient algebra, then heap-merges the
45 base/linear/direction streams in canonical monomial order.  It imports no
producer code.
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
JOB = "rank8_low_low_a23_mixed_cross_curvature_grade14_tail_v_second_order_job_agent_20260823.json"
JOB_SHA256 = "E338E05E3F98820D3BA7016A37AD9124E7936B436C13397ADD1DB769D3E3A548"
PRODUCER_SOURCE = "6FF273EEE009B5D79BB5C95788250EBF10C163E9E2F1E59AD439710161EDF85C"
SCOPE = (
    "rank8_low_low_a23_mixed_cross_curvature_grade14_formula_scope_audit_agent_20260823.json",
    "7B253A85818BD040003369BE94F0F5AAE7530EA8B5501F1FB1BBFE6578FE4A9A",
)
BASE = ("h", "ta", "tb", "P", "Q")
SLACK = ("a0", "b4", "b5", "b6", "b7", "a4", "a5", "a6", "a7")
BASE_PAIRS = tuple((left, right) for left in range(5) for right in range(left, 5))
FACES = (("01", (0, 1)), ("10", (1, 0)))
LABELS = (
    ("curvature_middle_times_4", (4, 2, 0)),
    ("curvature_far", (1, 1, 1)),
)
DEGREE = 14
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


class TC:
    """Coefficients up to one selected degree-two base monomial."""

    __slots__ = ("c", "target")

    def __init__(self, coefficients, target):
        self.c = coefficients
        self.target = target

    @staticmethod
    def constant(value, target):
        zero = value.context().constant(0)
        size = (target[0] + 1) * (target[1] + 1)
        coefficients = [zero for _ in range(size)]
        coefficients[0] = value
        return TC(coefficients, target)

    @staticmethod
    def variable(zero, one, target, axis):
        item = TC.constant(zero, target)
        item.c[(1 if axis == 0 else 0) * (target[1] + 1) + (1 if axis == 1 else 0)] = one
        return item

    def __add__(self, other):
        if not isinstance(other, TC):
            other = TC.constant(other, self.target)
        assert self.target == other.target
        return TC([left + right for left, right in zip(self.c, other.c)], self.target)

    __radd__ = __add__

    def __neg__(self):
        return TC([-value for value in self.c], self.target)

    def __sub__(self, other):
        return self + (-other)

    def __mul__(self, other):
        if not isinstance(other, TC):
            return TC([value * other for value in self.c], self.target)
        assert self.target == other.target
        first_max, second_max = self.target
        width = second_max + 1
        zero = self.c[0].context().constant(0)
        result = [zero for _ in self.c]
        for first_left in range(first_max + 1):
            for second_left in range(second_max + 1):
                left_value = self.c[first_left * width + second_left]
                if not left_value:
                    continue
                for first_right in range(first_max - first_left + 1):
                    for second_right in range(second_max - second_left + 1):
                        right_value = other.c[first_right * width + second_right]
                        if right_value:
                            result[(first_left + first_right) * width + second_left + second_right] += left_value * right_value
        return TC(result, self.target)

    __rmul__ = __mul__

    def target_coefficient(self):
        return self.c[-1]

    def is_zero(self):
        return all(not value for value in self.c)


def pair_add(left, right):
    return (left[0] + right[0], left[1] + right[1])


def pair_mul(left, right):
    assert left[1].is_zero() or right[1].is_zero()
    return (left[0] * right[0], left[0] * right[1] + left[1] * right[0])


def zero_pair(zero, target):
    return (TC.constant(zero, target), TC.constant(zero, target))


def base_variable(index, pair, zero, one, target):
    left, right = pair
    if index == left:
        return TC.variable(zero, one, target, 0)
    if left != right and index == right:
        return TC.variable(zero, one, target, 1)
    return TC.constant(zero, target)


def build(face, base_pair, context, peak, limit):
    raw = dict(zip(SLACK, context.gens()))
    zero = context.constant(0)
    one = context.constant(1)
    target = (2, 0) if base_pair[0] == base_pair[1] else (1, 1)
    base = {
        name: base_variable(index, base_pair, zero, one, target)
        for index, name in enumerate(BASE)
    }
    slack = {name: TC.constant(raw[name], target) for name in SLACK}
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
    left = [TC.constant(one, target)]
    for ratio in left_ratios:
        left.append(left[-1] * ratio)
    tail = [TC.constant(zero, target) for _ in range(3)] + left[3:]

    right_gaps = [
        2 * h, h, h + b2, h + b3,
        h + slack["b4"], h + slack["b5"],
        h + slack["b6"], h + slack["b7"],
    ]
    right_ratios = [None] * 9
    right_ratios[8] = (tb, TC.constant(zero, target))
    for index in range(7, -1, -1):
        right_ratios[index] = pair_add(
            right_ratios[index + 1],
            (right_gaps[index], TC.constant(one, target) if index == 0 else TC.constant(zero, target)),
        )
    right_row = [(TC.constant(one, target), TC.constant(zero, target))]
    for ratio in right_ratios:
        right_row.append(pair_mul(right_row[-1], ratio))

    direction = [zero_pair(zero, target) for _ in range(10)]
    direction[3] = (right_row[2][0] * h, right_row[2][1] * h)
    for rank in range(4, 10):
        direction[rank] = pair_mul(direction[rank - 1], right_ratios[rank - 1])
    for outer_pair in direction:
        assert not outer_pair[0].c[0] and not outer_pair[1].c[0]

    v, dv = {}, {}
    for rank in (7, 8, 9):
        v_rank = zero_pair(zero, target)
        dv_rank = zero_pair(zero, target)
        for index in range(rank + 1):
            weight = math.comb(rank, index)
            v_rank = pair_add(
                v_rank,
                (
                    weight * tail[index] * right_row[rank - index][0],
                    weight * tail[index] * right_row[rank - index][1],
                ),
            )
            dv_rank = pair_add(
                dv_rank,
                (
                    weight * tail[index] * direction[rank - index][0],
                    weight * tail[index] * direction[rank - index][1],
                ),
            )
        v[rank], dv[rank] = v_rank, dv_rank
    guard(f"independent curvature14 face{face} base_pair{base_pair}", peak, limit)
    return h, v, dv


def pair_product(left, right, outer, zero, target):
    result = TC.constant(zero, target)
    for left_outer in range(2):
        right_outer = outer - left_outer
        if 0 <= right_outer < 2:
            result += left[left_outer] * right[right_outer]
    return result


def curvature(values, outer, h, zero, target):
    return (
        pair_product(values[8], values[8], outer, zero, target)
        - pair_product(values[7], values[9], outer, zero, target)
        - h * pair_product(values[7], values[8], outer, zero, target)
    )


def cross(base, direction, outer, h, zero, target):
    return (
        2 * pair_product(base[8], direction[8], outer, zero, target)
        - pair_product(base[7], direction[9], outer, zero, target)
        - pair_product(direction[7], base[9], outer, zero, target)
        - h
        * (
            pair_product(base[7], direction[8], outer, zero, target)
            + pair_product(direction[7], base[8], outer, zero, target)
        )
    )


def pieces(h, v, dv, outer, zero, target, peak, limit):
    base = curvature(v, outer, h, zero, target).target_coefficient()
    linear = cross(v, dv, outer, h, zero, target).target_coefficient()
    direction = curvature(dv, outer, h, zero, target).target_coefficient()
    guard(f"independent curvature14 pieces outer{outer} target{target}", peak, limit)
    return base, linear, direction


class Cursor:
    def __init__(self, poly, base_monomial, piece_index, outer):
        self.poly = poly
        self.base_monomial = base_monomial
        self.piece_index = piece_index
        self.outer = outer
        self.index = 0

    def advance(self):
        if self.index >= len(self.poly):
            return None
        reduced = tuple(map(int, self.poly.monomial(self.index)))
        coefficient = int(self.poly.coefficient(self.index))
        self.index += 1
        full = self.base_monomial + reduced + (self.outer,)
        return (-sum(full), tuple(reversed(full))), full, coefficient


def merge(records, outer, complete, peak, limit):
    cursors = []
    for base_monomial, polys in records:
        for piece_index, poly in enumerate(polys):
            if len(poly):
                cursors.append(Cursor(poly, base_monomial, piece_index, outer))
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
        for label, _ in LABELS
    }
    digests = {label: hashlib.sha256() for label, _ in LABELS}
    raw_union = 0
    previous = None
    while heap:
        order, cursor_index, full, coefficient = heapq.heappop(heap)
        coefficients = [0, 0, 0]
        coefficients[cursors[cursor_index].piece_index] += coefficient
        consumed = [cursor_index]
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
        assert sum(full[:5]) == 2 and sum(reduced) + outer == DEGREE
        if not any(reduced[index] for index in range(5)):
            continue
        if outer == 0 and not any(reduced[index] for index in range(5, 9)):
            continue
        prefix = ",".join(map(str, full)) + ":"
        for label, scales in LABELS:
            combined = sum(scale * value for scale, value in zip(scales, coefficients))
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
            print("INDEPENDENT CURVATURE14 MERGE OUTER", outer, "RAW", raw_union, "PRIVATE", private_bytes(), flush=True)
        guard(f"independent curvature14 merge outer{outer} raw{raw_union}", peak, limit)
    for label in stats:
        stats[label]["ordered_coefficient_sha256"] = digests[label].hexdigest().upper()
        stats[label]["unfiltered_union_terms"] = raw_union
    return stats


def base_monomial(pair):
    result = [0] * 5
    result[pair[0]] += 1
    result[pair[1]] += 1
    return tuple(result)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--private-limit", type=int, default=LIMIT)
    args = parser.parse_args()
    assert JOB_SHA256 != "__PIN_AFTER_PRODUCER__"
    scope = pinned(HERE / SCOPE[0], SCOPE[1])
    assert scope["status"] == "PASS_CANONICAL_GRADE14_CURVATURE_SCOPE_TAIL_V_ALL_THREE_PIECES_DISTINCT_FACES"
    job = pinned(HERE / JOB, JOB_SHA256)
    assert job["source_sha256"] == PRODUCER_SOURCE
    assert job["status"] == "PASS_EXACT_DISTINCT_FACES_GRADE14_CURVATURE_TAIL_V_ALL_THREE_PIECES_NONNEGATIVE"

    peak = [0]
    all_replays = {}
    completed = {}
    for token, face in FACES:
        context = fmpz_mpoly_ctx.get(SLACK, "degrevlex")
        zero = context.constant(0)
        complete = {label: hashlib.sha256() for label, _ in LABELS}
        replays = {label: [] for label, _ in LABELS}
        for outer in (0, 1, 2):
            records = []
            for pair_index, pair in enumerate(BASE_PAIRS):
                FAILURE_CONTEXT.update(face_token=token, outer_exponent=outer, base_pair=list(pair))
                target = (2, 0) if pair[0] == pair[1] else (1, 1)
                h, v, dv = build(face, pair, context, peak, args.private_limit)
                records.append((base_monomial(pair), pieces(h, v, dv, outer, zero, target, peak, args.private_limit)))
                del h, v, dv
                gc.collect()
                print("AUDIT BUILD FACE", token, "OUTER", outer, "BASE_PAIR", pair_index + 1, "/", len(BASE_PAIRS), "PRIVATE", private_bytes(), flush=True)
            stats = merge(records, outer, complete, peak, args.private_limit)
            for label, _ in LABELS:
                replays[label].append(stats[label])
                print(
                    "AUDIT CURVATURE14 FACE", token, "ROW", label, "OUTER", outer,
                    "TERMS", stats[label]["mixed_support_terms"],
                    "NEG", stats[label]["negative_terms"], "MIN", stats[label]["minimum"],
                    flush=True,
                )
            del records
            gc.collect()
            guard(f"audit curvature14 released face{token} outer{outer}", peak, args.private_limit)
        all_replays[token] = replays
        completed[token] = {label: complete[label].hexdigest().upper() for label, _ in LABELS}
        del context
        gc.collect()

    produced = {(item["face_token"], item["auxiliary"]): item for item in job["completed_cells"]}
    cells = []
    for token, face in FACES:
        for label, _ in LABELS:
            item = produced[(token, label)]
            path = Path(item["manifest"])
            assert sha256(path) == item["manifest_sha256"]
            manifest = json.loads(path.read_text(encoding="utf-8"))
            canonical_scope = manifest["canonical_scope"]
            assert canonical_scope["oriented_left_tail_V"] is True
            assert canonical_scope["full_convolution_C_excluded"] is True
            assert canonical_scope["surviving_pieces"] == ["base", "linear", "direction"]
            assert canonical_scope["faces_computed_separately"] is True
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
        "schema": "rank8-low-low-a23-mixed-cross-curvature-grade14-per-base-pair-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_FIFTEEN_BASE_MONOMIAL_RECONSTRUCTION_BOTH_DISTINCT_FACES_GRADE14_CURVATURE_ROWS",
        "imports_producer": False,
        "producer_job": JOB,
        "producer_job_sha256": JOB_SHA256,
        "producer_source_sha256": PRODUCER_SOURCE,
        "scope_audit": {"path": SCOPE[0], "sha256": SCOPE[1]},
        "total_ordinary_slack_degree": DEGREE,
        "cells": cells,
        "row_replays": all_replays,
        "checks": {
            "canonical_oriented_left_tail_V": True,
            "full_convolution_C_excluded": True,
            "base_linear_direction_all_reconstructed": True,
            "fifteen_degree_two_base_monomials_separately_reconstructed": True,
            "diagonal_coefficients_not_derivative_doubled": True,
            "faces_separately_reconstructed": True,
            "face_hash_reuse": False,
        },
        "hard_private_memory_limit_bytes": args.private_limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": sha256(Path(__file__)),
    }
    output = HERE / "rank8_low_low_a23_mixed_cross_curvature_grade14_per_base_pair_independent_audit_agent_20260823.json"
    print("AUDIT REPORT", output, atomic_json(output, report), report["status"], flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as exc:
        atomic_json(
            HERE / "rank8_low_low_a23_mixed_cross_curvature_grade14_per_base_pair_independent_audit_failure_agent_20260823.json",
            {
                "schema": "rank8-low-low-a23-mixed-cross-curvature-grade14-per-base-pair-independent-audit-failure-agent-v1",
                "status": "FAIL_CLOSED_INDEPENDENT_AUDIT_EXCEPTION_OR_MEMORY_STOP",
                "exception_type": type(exc).__name__,
                "exception": str(exc),
                "context": FAILURE_CONTEXT,
                "source_sha256": sha256(Path(__file__)),
            },
        )
        raise
