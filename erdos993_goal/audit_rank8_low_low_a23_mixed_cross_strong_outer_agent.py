#!/usr/bin/env python3
"""Independent exact replay of a strong mixed-cross outer-chunk manifest.

This auditor does not import the producer or its row/merge helpers.  It
reconstructs the two or three strong pieces from the low-level graded factor
arithmetic, combines their FLINT coefficient streams with a separate linear
minimum-key merge, and exact-compares every b0 chunk plus the complete ordered
row digest.  No global strong polynomial is assembled.
"""

from __future__ import annotations

import argparse
import ctypes
import gc
import hashlib
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


HARD_PRIVATE_LIMIT = 3_000_000_000
LOW_LEVEL_SOURCE = "probe_rank8_low_low_a23_mixed_cross_truncated_agent.py"


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


def guard(stage, peak):
    current = private_bytes()
    peak[0] = max(peak[0], current)
    if current >= HARD_PRIVATE_LIMIT:
        raise MemoryError(f"memory guard at {stage}: {current}")


def grade_product(left, right, degree, zero):
    result = zero
    if degree < 0:
        return result
    for i in range(degree + 1):
        j = degree - i
        if i < len(left.c) and j < len(right.c) and left.c[i] and right.c[j]:
            result += left.c[i] * right.c[j]
    return result


def grade_curvature(row, degree, zero, h):
    return (
        grade_product(row[8], row[8], degree, zero)
        - grade_product(row[7], row[9], degree, zero)
        - h * grade_product(row[7], row[8], degree, zero)
    )


def grade_cross(row0, row1, degree, zero, h):
    return (
        2 * grade_product(row0[8], row1[8], degree, zero)
        - grade_product(row0[7], row1[9], degree, zero)
        - grade_product(row1[7], row0[9], degree, zero)
        - h
        * (
            grade_product(row0[7], row1[8], degree, zero)
            + grade_product(row1[7], row0[8], degree, zero)
        )
    )


def grade_derivative(c, v, degree, zero, h):
    return (
        2 * grade_product(c[8], v[8], degree, zero)
        - grade_product(v[7], c[9], degree, zero)
        - grade_product(c[7], v[9], degree, zero)
        - h
        * (
            grade_product(v[7], c[8], degree, zero)
            + grade_product(c[7], v[8], degree, zero)
        )
    )


def grade_derivative_cross(c0, c1, v0, v1, degree, zero, h):
    return (
        2
        * (
            grade_product(c0[8], v1[8], degree, zero)
            + grade_product(c1[8], v0[8], degree, zero)
        )
        - grade_product(v0[7], c1[9], degree, zero)
        - grade_product(v1[7], c0[9], degree, zero)
        - grade_product(c0[7], v1[9], degree, zero)
        - grade_product(c1[7], v0[9], degree, zero)
        - h
        * (
            grade_product(v0[7], c1[8], degree, zero)
            + grade_product(v1[7], c0[8], degree, zero)
            + grade_product(c0[7], v1[8], degree, zero)
            + grade_product(c1[7], v0[8], degree, zero)
        )
    )


def independently_construct_pieces(face, label, degree, peak):
    names = BASE_NAMES + SLACK_NAMES
    ctx = fmpz_mpoly_ctx.get(names, "degrevlex")
    generators = dict(zip(names, ctx.gens()))
    zero_coefficient = ctx.constant(0)
    Graded.max_degree = degree
    Graded.zero = zero_coefficient
    variables = {}
    for name in names:
        if name in SLACK_NAMES:
            variables[name] = Graded.slack(generators[name])
        else:
            variables[name] = Graded.base(generators[name])
    zero = Graded.base(zero_coefficient)
    one = Graded.base(ctx.constant(1))
    h = variables["h"]
    h0 = generators["h"]
    z, w = face
    a2 = (1 - z) * variables["P"]
    a3 = z * variables["P"]
    b2 = (1 - w) * variables["Q"]
    b3 = w * variables["Q"]
    left_gaps = (
        2 * h + variables["a0"],
        h,
        h + a2,
        h + a3,
        h + variables["a4"],
        h + variables["a5"],
        h + variables["a6"],
        h + variables["a7"],
    )
    right_gaps = (
        2 * h + variables["b0"],
        h,
        h + b2,
        h + b3,
        h + variables["b4"],
        h + variables["b5"],
        h + variables["b6"],
        h + variables["b7"],
    )
    left_ratio, left_row = factor_row(variables["ta"], left_gaps, one)
    right_ratio, right_zero = factor_row(variables["tb"], right_gaps, one)
    right_one = [zero for _ in right_zero]
    right_one[3] = h * right_zero[2]
    for k in range(4, 10):
        right_one[k] = right_one[k - 1] * right_ratio[k - 1]
    left_tail = [zero, zero, zero] + left_row[3:]
    guard("independent factor rows", peak)

    c0 = {r: convolution(left_row, right_zero, r, zero) for r in (7, 8, 9)}
    c1 = {r: convolution(left_row, right_one, r, zero) for r in (7, 8, 9)}
    v0 = {r: convolution(left_tail, right_zero, r, zero) for r in (7, 8, 9)}
    v1 = {r: convolution(left_tail, right_one, r, zero) for r in (7, 8, 9)}
    guard("independent convolutions", peak)

    capacity = left_ratio[2]
    assert not any(capacity.c[k] for k in range(2, degree + 1))

    base_margin = (
        capacity.c[0] * grade_curvature(c0, degree, zero_coefficient, h0)
        + capacity.c[1] * grade_curvature(c0, degree - 1, zero_coefficient, h0)
    )
    base_derivative = grade_derivative(c0, v0, degree, zero_coefficient, h0)
    base_piece = base_margin + h0 * base_derivative
    del base_margin, base_derivative
    gc.collect()
    guard("independent base piece", peak)

    linear_margin = (
        capacity.c[0] * grade_cross(c0, c1, degree, zero_coefficient, h0)
        + capacity.c[1] * grade_cross(c0, c1, degree - 1, zero_coefficient, h0)
    )
    linear_derivative = grade_derivative_cross(
        c0, c1, v0, v1, degree, zero_coefficient, h0
    )
    linear_piece = linear_margin + h0 * linear_derivative
    del linear_margin, linear_derivative
    gc.collect()
    guard("independent linear piece", peak)

    if label == "strong_middle_times_4":
        return names, ((4, base_piece), (2, linear_piece))

    assert label == "strong_far"
    direction_margin = (
        capacity.c[0] * grade_curvature(c1, degree, zero_coefficient, h0)
        + capacity.c[1] * grade_curvature(c1, degree - 1, zero_coefficient, h0)
    )
    direction_derivative = grade_derivative(
        c1, v1, degree, zero_coefficient, h0
    )
    direction_piece = direction_margin + h0 * direction_derivative
    del direction_margin, direction_derivative
    gc.collect()
    guard("independent direction piece", peak)
    return names, ((1, base_piece), (1, linear_piece), (1, direction_piece))


def key_for(monomial):
    return (-sum(monomial), tuple(reversed(monomial)))


class Cursor:
    def __init__(self, polynomial, scale, group_a, group_b, degree):
        self.p = polynomial
        self.scale = scale
        self.a = group_a
        self.b = group_b
        self.degree = degree
        self.i = 0
        self.previous = None

    def next_mixed(self):
        while self.i < len(self.p):
            i = self.i
            self.i += 1
            monomial = tuple(map(int, self.p.monomial(i)))
            key = key_for(monomial)
            if self.previous is not None:
                assert self.previous <= key
            self.previous = key
            if not (
                any(monomial[j] for j in self.a)
                and any(monomial[j] for j in self.b)
            ):
                continue
            assert sum(monomial[len(BASE_NAMES) :]) == self.degree
            return key, monomial, self.scale * int(self.p.coefficient(i))
        return None


def new_stat(exponent):
    return {
        "outer_exponent": exponent,
        "mixed_support_terms": 0,
        "negative_terms": 0,
        "minimum": None,
        "first_negative": None,
        "digest": hashlib.sha256(),
    }


def independent_merge(names, pieces, degree, peak):
    indices = {name: names.index(name) for name in names}
    a = tuple(indices[name] for name in GROUP_A)
    b = tuple(indices[name] for name in GROUP_B)
    outer = indices["b0"]
    cursors = [Cursor(p, scale, a, b, degree) for scale, p in pieces]
    current = [cursor.next_mixed() for cursor in cursors]
    stats = [new_stat(e) for e in range(degree + 1)]
    whole = hashlib.sha256()
    terms = negative = 0
    previous_outer = 0
    while any(item is not None for item in current):
        smallest = min(item[0] for item in current if item is not None)
        active = [i for i, item in enumerate(current) if item is not None and item[0] == smallest]
        monomial = current[active[0]][1]
        coefficient = 0
        for i in active:
            assert current[i][1] == monomial
            coefficient += current[i][2]
            current[i] = cursors[i].next_mixed()
        if coefficient == 0:
            continue
        exponent = monomial[outer]
        assert previous_outer <= exponent <= degree
        previous_outer = exponent
        encoded = ((",".join(map(str, monomial))) + ":" + str(coefficient) + "\n").encode()
        whole.update(encoded)
        stat = stats[exponent]
        stat["digest"].update(encoded)
        stat["mixed_support_terms"] += 1
        stat["minimum"] = coefficient if stat["minimum"] is None else min(stat["minimum"], coefficient)
        if coefficient < 0:
            negative += 1
            stat["negative_terms"] += 1
            if stat["first_negative"] is None:
                stat["first_negative"] = {"monomial": list(monomial), "coefficient": coefficient}
        terms += 1
        if terms % 100_000 == 0:
            guard(f"independent merge term {terms}", peak)
    serial_stats = []
    for stat in stats:
        digest = stat.pop("digest").hexdigest().upper()
        stat["ordered_coefficient_sha256"] = digest
        serial_stats.append(stat)
    return {
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "ordered_coefficient_sha256": whole.hexdigest().upper(),
        "chunks": serial_stats,
        "piece_lengths": [len(p) for _, p in pieces],
    }


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def audit_manifest(path, expected_hash, face, label, degree, replay):
    assert sha256(path) == expected_hash
    manifest = json.loads(path.read_text(encoding="utf-8"))
    assert manifest["face"] == list(face)
    assert manifest["auxiliary"] == label
    assert manifest["total_ordinary_slack_degree"] == degree
    assert manifest["outer_variable"] == "b0"
    assert manifest["outer_exponent_range"] == [0, degree]
    assert manifest["global_row_assembly"] is False
    records = manifest["result"]["chunks"]
    assert [item["outer_exponent"] for item in records] == list(range(degree + 1))
    assert len(replay["chunks"]) == degree + 1
    chunk_audit = []
    for expected, actual in zip(records, replay["chunks"]):
        chunk_path = Path(expected["path"]).resolve()
        assert sha256(chunk_path) == expected["sha256"]
        payload = json.loads(chunk_path.read_text(encoding="utf-8"))
        assert payload["face"] == list(face)
        assert payload["auxiliary"] == label
        assert payload["total_ordinary_slack_degree"] == degree
        assert payload["outer_exponent"] == actual["outer_exponent"]
        assert payload["global_row_assembly"] is False
        stored = payload["chunk"]
        for key in (
            "mixed_support_terms",
            "negative_terms",
            "minimum",
            "first_negative",
            "ordered_coefficient_sha256",
        ):
            assert stored[key] == actual[key]
            assert expected[key] == actual[key] if key in expected else True
        chunk_audit.append({
            "outer_exponent": actual["outer_exponent"],
            "path": str(chunk_path),
            "sha256": expected["sha256"],
            "replay_exact_match": True,
        })
    result = manifest["result"]
    assert result["mixed_support_terms"] == replay["mixed_support_terms"]
    assert result["negative_terms"] == replay["negative_terms"]
    assert result["ordered_coefficient_sha256"] == replay["ordered_coefficient_sha256"]
    assert result["piece_lengths"] == replay["piece_lengths"]
    assert sum(item["mixed_support_terms"] for item in replay["chunks"]) == replay["mixed_support_terms"]
    return manifest, chunk_audit


def atomic_report(path, payload):
    encoded = json.dumps(payload, indent=2) + "\n"
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(encoded, encoding="utf-8")
    os.replace(temporary, path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0"), required=True)
    parser.add_argument("--label", choices=("strong_middle_times_4", "strong_far"), required=True)
    parser.add_argument("--degree", type=int, choices=range(2, 18), required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--expected-manifest-sha256", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    face = tuple(map(int, args.face.split(",")))
    manifest_path = Path(args.manifest).resolve()
    expected_hash = args.expected_manifest_sha256.upper()
    peak = [0]
    guard("audit start", peak)
    names, pieces = independently_construct_pieces(face, args.label, args.degree, peak)
    replay = independent_merge(names, pieces, args.degree, peak)
    manifest, chunk_audit = audit_manifest(
        manifest_path,
        expected_hash,
        face,
        args.label,
        args.degree,
        replay,
    )
    here = Path(__file__).resolve().parent
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-outer-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_EXACT_OUTER_CHUNK_AND_ORDERED_ROW_REPLAY",
        "face": list(face),
        "auxiliary": args.label,
        "total_ordinary_slack_degree": args.degree,
        "manifest": str(manifest_path),
        "manifest_sha256": expected_hash,
        "replayed_mixed_support_terms": replay["mixed_support_terms"],
        "replayed_negative_terms": replay["negative_terms"],
        "replayed_ordered_coefficient_sha256": replay["ordered_coefficient_sha256"],
        "piece_lengths": replay["piece_lengths"],
        "chunk_audit": chunk_audit,
        "disjoint_coverage": (
            "The independently replayed fixed-grade mixed terms are partitioned "
            "by their unique integer b0 exponent 0..degree, every exponent file "
            "is present exactly once, and the per-chunk counts sum to the full row."
        ),
        "global_row_assembly": False,
        "hard_private_memory_limit_bytes": HARD_PRIVATE_LIMIT,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "low_level_dependency_sha256": sha256(here / LOW_LEVEL_SOURCE),
        "producer_source_sha256_from_manifest": manifest["source_sha256"],
    }
    output = Path(args.output).resolve()
    atomic_report(output, payload)
    print("PASS", output, sha256(output), flush=True)


if __name__ == "__main__":
    main()
