#!/usr/bin/env python3
"""Independent formal-two-grading audit of a b0-factored row manifest.

Unlike the producer's two-specialization coefficient extraction, this replay
carries total slack degree and b0 exponent as two formal grading indices from
the first factor-row multiplication onward.  It imports no producer helper.
"""

from __future__ import annotations

import argparse
import ctypes
import gc
import hashlib
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
    convolution,
    factor_row,
)


LOW_LEVEL_SOURCE = "probe_rank8_low_low_a23_mixed_cross_truncated_agent.py"
FULL_NAMES = BASE_NAMES + SLACK_NAMES
REDUCED_SLACK_NAMES = tuple(name for name in SLACK_NAMES if name != "b0")
REDUCED_NAMES = BASE_NAMES + REDUCED_SLACK_NAMES
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


class FormalGraded:
    """Total ordinary degree by formal b0 exponent (the latter capped at one)."""

    max_degree = 0
    zero = None

    def __init__(self, components):
        self.c = tuple(tuple(row) for row in components)
        assert len(self.c) == self.max_degree + 1
        assert all(len(row) == 2 for row in self.c)

    @classmethod
    def base(cls, polynomial):
        rows = [[cls.zero, cls.zero] for _ in range(cls.max_degree + 1)]
        rows[0][0] = polynomial
        return cls(rows)

    @classmethod
    def slack(cls, polynomial):
        rows = [[cls.zero, cls.zero] for _ in range(cls.max_degree + 1)]
        if cls.max_degree >= 1:
            rows[1][0] = polynomial
        return cls(rows)

    @classmethod
    def outer_slack(cls, polynomial):
        rows = [[cls.zero, cls.zero] for _ in range(cls.max_degree + 1)]
        if cls.max_degree >= 1:
            rows[1][1] = polynomial
        return cls(rows)

    def __add__(self, other):
        if not isinstance(other, FormalGraded):
            other = FormalGraded.base(other)
        return FormalGraded(
            [self.c[d][e] + other.c[d][e] for e in range(2)]
            for d in range(self.max_degree + 1)
        )

    __radd__ = __add__

    def __neg__(self):
        return FormalGraded([-item for item in row] for row in self.c)

    def __sub__(self, other):
        return self + (-other)

    def __rsub__(self, other):
        return FormalGraded.base(other) - self

    def __mul__(self, other):
        if not isinstance(other, FormalGraded):
            return FormalGraded([item * other for item in row] for row in self.c)
        result = [
            [self.zero, self.zero] for _ in range(self.max_degree + 1)
        ]
        for dl in range(self.max_degree + 1):
            for el in range(2):
                left = self.c[dl][el]
                if not left:
                    continue
                for dr in range(self.max_degree + 1 - dl):
                    for er in range(2):
                        right = other.c[dr][er]
                        if not right:
                            continue
                        if el + er > 1:
                            raise AssertionError(
                                "formal b0^2 arose before the quadratic row form"
                            )
                        result[dl + dr][el + er] += left * right
        return FormalGraded(result)

    __rmul__ = __mul__


def build_formal_common(face: tuple[int, int], degree: int, peak: list[int], limit: int):
    context = fmpz_mpoly_ctx.get(REDUCED_NAMES, "degrevlex")
    raw = dict(zip(REDUCED_NAMES, context.gens()))
    zero_raw = context.constant(0)
    FormalGraded.max_degree = degree
    FormalGraded.zero = zero_raw
    variables = {
        name: FormalGraded.slack(value)
        if name in REDUCED_SLACK_NAMES
        else FormalGraded.base(value)
        for name, value in raw.items()
    }
    variables["b0"] = FormalGraded.outer_slack(context.constant(1))
    zero = FormalGraded.base(zero_raw)
    one = FormalGraded.base(context.constant(1))
    h, ta, tb, p, q = (variables[name] for name in BASE_NAMES)
    z, w = face
    a2, a3 = (1 - z) * p, z * p
    b2, b3 = (1 - w) * q, w * q
    left_gaps = [
        2 * h + variables["a0"], h, h + a2, h + a3,
        h + variables["a4"], h + variables["a5"],
        h + variables["a6"], h + variables["a7"],
    ]
    right_gaps = [
        2 * h + variables["b0"], h, h + b2, h + b3,
        h + variables["b4"], h + variables["b5"],
        h + variables["b6"], h + variables["b7"],
    ]
    left_ratios, left = factor_row(ta, left_gaps, one)
    right_ratios, right_base = factor_row(tb, right_gaps, one)
    right_direction = None
    if degree <= 16:
        right_direction = [zero for _ in right_base]
        right_direction[3] = right_base[2] * h
        for rank in range(4, len(right_base)):
            right_direction[rank] = right_direction[rank - 1] * right_ratios[rank - 1]
    tail = [zero, zero, zero] + left[3:]
    result = {
        "raw": raw,
        "zero_raw": zero_raw,
        "capacity": left_ratios[2],
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
    assert all(
        not result["capacity"].c[d][e]
        for d in range(degree + 1)
        for e in range(2)
        if d > 1 or e > 0
    )
    guard("independent formal factor and convolution state", peak, limit)
    return result


def coefficient_product(left: FormalGraded, right: FormalGraded, degree: int, exponent: int, zero):
    result = zero
    if degree < 0:
        return result
    for dl in range(degree + 1):
        dr = degree - dl
        if dl >= len(left.c) or dr >= len(right.c):
            continue
        for el in range(2):
            er = exponent - el
            if 0 <= er < 2 and left.c[dl][el] and right.c[dr][er]:
                result += left.c[dl][el] * right.c[dr][er]
    return result


def coefficient_curvature(row, degree: int, exponent: int, zero, h):
    return (
        coefficient_product(row[8], row[8], degree, exponent, zero)
        - coefficient_product(row[7], row[9], degree, exponent, zero)
        - h * coefficient_product(row[7], row[8], degree, exponent, zero)
    )


def coefficient_cross(row0, row1, degree: int, exponent: int, zero, h):
    return (
        2 * coefficient_product(row0[8], row1[8], degree, exponent, zero)
        - coefficient_product(row0[7], row1[9], degree, exponent, zero)
        - coefficient_product(row1[7], row0[9], degree, exponent, zero)
        - h * (
            coefficient_product(row0[7], row1[8], degree, exponent, zero)
            + coefficient_product(row1[7], row0[8], degree, exponent, zero)
        )
    )


def coefficient_derivative(c, v, degree: int, exponent: int, zero, h):
    return (
        2 * coefficient_product(c[8], v[8], degree, exponent, zero)
        - coefficient_product(v[7], c[9], degree, exponent, zero)
        - coefficient_product(c[7], v[9], degree, exponent, zero)
        - h * (
            coefficient_product(v[7], c[8], degree, exponent, zero)
            + coefficient_product(c[7], v[8], degree, exponent, zero)
        )
    )


def coefficient_derivative_cross(c0, c1, v0, v1, degree: int, exponent: int, zero, h):
    p = lambda x, rank_x, y, rank_y: coefficient_product(
        x[rank_x], y[rank_y], degree, exponent, zero
    )
    return (
        2 * (p(c0, 8, v1, 8) + p(c1, 8, v0, 8))
        - p(v0, 7, c1, 9) - p(v1, 7, c0, 9)
        - p(c0, 7, v1, 9) - p(c1, 7, v0, 9)
        - h * (
            p(v0, 7, c1, 8) + p(v1, 7, c0, 8)
            + p(c0, 7, v1, 8) + p(c1, 7, v0, 8)
        )
    )


def construct_pieces(common: dict, label: str, degree: int, exponent: int, peak: list[int], limit: int):
    zero, h = common["zero_raw"], common["raw"]["h"]
    if label.startswith("curvature_"):
        base = coefficient_curvature(common["base_v"], degree, exponent, zero, h)
        pieces = {"base": base}
        guard(f"formal curvature base outer {exponent}", peak, limit)
        if degree <= 15:
            pieces["linear"] = coefficient_cross(
                common["base_v"], common["direction_v"], degree, exponent, zero, h
            )
            guard(f"formal curvature linear outer {exponent}", peak, limit)
        if degree <= 14:
            pieces["direction"] = coefficient_curvature(
                common["direction_v"], degree, exponent, zero, h
            )
            guard(f"formal curvature direction outer {exponent}", peak, limit)
    else:
        capacity = common["capacity"]
        c0, c1 = common["base_c"], common["direction_c"]
        v0, v1 = common["base_v"], common["direction_v"]
        base = (
            capacity.c[0][0] * coefficient_curvature(c0, degree, exponent, zero, h)
            + capacity.c[1][0] * coefficient_curvature(c0, degree - 1, exponent, zero, h)
            + h * coefficient_derivative(c0, v0, degree, exponent, zero, h)
        )
        pieces = {"base": base}
        guard(f"formal strong base outer {exponent}", peak, limit)
        if degree <= 16:
            pieces["linear"] = (
                capacity.c[0][0] * coefficient_cross(c0, c1, degree, exponent, zero, h)
                + capacity.c[1][0] * coefficient_cross(c0, c1, degree - 1, exponent, zero, h)
                + h * coefficient_derivative_cross(c0, c1, v0, v1, degree, exponent, zero, h)
            )
            guard(f"formal strong linear outer {exponent}", peak, limit)
        if degree <= 15:
            pieces["direction"] = (
                capacity.c[0][0] * coefficient_curvature(c1, degree, exponent, zero, h)
                + capacity.c[1][0] * coefficient_curvature(c1, degree - 1, exponent, zero, h)
                + h * coefficient_derivative(c1, v1, degree, exponent, zero, h)
            )
            guard(f"formal strong direction outer {exponent}", peak, limit)
    scales = (
        (("base", 4), ("linear", 2))
        if label.endswith("middle_times_4")
        else (("base", 1), ("linear", 1), ("direction", 1))
    )
    return [(name, scale, pieces[name]) for name, scale in scales if name in pieces]


def key_for(monomial):
    return (-sum(monomial), tuple(reversed(monomial)))


class Cursor:
    def __init__(self, polynomial, scale: int, degree: int, exponent: int):
        self.p = polynomial
        self.scale = scale
        self.degree = degree
        self.exponent = exponent
        indices = {name: REDUCED_NAMES.index(name) for name in REDUCED_NAMES}
        self.a = tuple(indices[name] for name in GROUP_A)
        self.b = tuple(indices[name] for name in GROUP_B if name != "b0")
        self.i = 0
        self.previous = None

    def advance(self):
        while self.i < len(self.p):
            i = self.i
            self.i += 1
            reduced = tuple(map(int, self.p.monomial(i)))
            key = key_for(reduced)
            if self.previous is not None:
                assert self.previous <= key
            self.previous = key
            if not any(reduced[j] for j in self.a):
                continue
            if self.exponent == 0 and not any(reduced[j] for j in self.b):
                continue
            assert sum(reduced[len(BASE_NAMES):]) + self.exponent == self.degree
            return key, reduced + (self.exponent,), self.scale * int(self.p.coefficient(i))
        return None


def replay_outer(piece_spec, degree: int, exponent: int, peak: list[int], limit: int):
    cursors = [Cursor(poly, scale, degree, exponent) for _, scale, poly in piece_spec]
    current = [cursor.advance() for cursor in cursors]
    digest = hashlib.sha256()
    terms = negative = 0
    minimum = first_negative = None
    while any(item is not None for item in current):
        smallest = min(item[0] for item in current if item is not None)
        active = [i for i, item in enumerate(current) if item is not None and item[0] == smallest]
        monomial = current[active[0]][1]
        coefficient = 0
        for i in active:
            assert current[i][1] == monomial
            coefficient += current[i][2]
            current[i] = cursors[i].advance()
        if coefficient == 0:
            continue
        encoded = (",".join(map(str, monomial)) + ":" + str(coefficient) + "\n").encode()
        digest.update(encoded)
        terms += 1
        minimum = coefficient if minimum is None else min(minimum, coefficient)
        if coefficient < 0:
            negative += 1
            if first_negative is None:
                first_negative = {"monomial": list(monomial), "coefficient": coefficient}
        if terms % 100_000 == 0:
            guard(f"formal outer {exponent} replay {terms}", peak, limit)
    return {
        "outer_exponent": exponent,
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "minimum": minimum,
        "first_negative": first_negative,
        "ordered_coefficient_sha256": digest.hexdigest().upper(),
        "piece_lengths": [len(poly) for _, _, poly in piece_spec],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0"), required=True)
    parser.add_argument(
        "--label",
        choices=(
            "curvature_middle_times_4", "curvature_far",
            "strong_middle_times_4", "strong_far",
        ),
        required=True,
    )
    parser.add_argument("--degree", type=int, choices=range(2, 18), required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--expected-manifest-sha256", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--hard-private-limit-bytes", type=int, default=DEFAULT_PRIVATE_LIMIT)
    args = parser.parse_args()
    face = tuple(map(int, args.face.split(",")))
    peak = [0]
    FAILURE_CONTEXT.update({
        "output": Path(args.output).resolve(),
        "face": face,
        "label": args.label,
        "degree": args.degree,
        "peak": peak,
        "limit": args.hard_private_limit_bytes,
    })
    common = build_formal_common(face, args.degree, peak, args.hard_private_limit_bytes)
    manifest_path = Path(args.manifest).resolve()
    expected_hash = args.expected_manifest_sha256.upper()
    assert sha256(manifest_path) == expected_hash
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["status"] == "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_FACTORED_CHUNKS_NONNEGATIVE"
    assert manifest["face"] == list(face)
    assert manifest["auxiliary"] == args.label
    assert manifest["total_ordinary_slack_degree"] == args.degree
    assert manifest["outer_exponent_range"] == [0, 2]
    records = manifest["result"]["chunks"]
    assert [item["outer_exponent"] for item in records] == [0, 1, 2]
    full_digest = hashlib.sha256()
    total_terms = total_negative = 0
    summed_piece_lengths = None
    chunk_audit = []
    for exponent, record in enumerate(records):
        piece_spec = construct_pieces(
            common, args.label, args.degree, exponent, peak, args.hard_private_limit_bytes
        )
        replay = replay_outer(
            piece_spec, args.degree, exponent, peak, args.hard_private_limit_bytes
        )
        chunk_path = Path(record["path"]).resolve()
        assert sha256(chunk_path) == record["sha256"]
        chunk = json.loads(chunk_path.read_text(encoding="utf-8"))
        for key in (
            "mixed_support_terms", "negative_terms", "minimum",
            "first_negative", "ordered_coefficient_sha256",
        ):
            assert chunk["chunk"][key] == replay[key]
        # Rebuild the full digest directly from the independently replayed
        # coefficient stream a second time so it is not inferred from hashes.
        cursors = [Cursor(poly, scale, args.degree, exponent) for _, scale, poly in piece_spec]
        current = [cursor.advance() for cursor in cursors]
        while any(item is not None for item in current):
            smallest = min(item[0] for item in current if item is not None)
            active = [i for i, item in enumerate(current) if item is not None and item[0] == smallest]
            monomial = current[active[0]][1]
            coefficient = 0
            for i in active:
                coefficient += current[i][2]
                current[i] = cursors[i].advance()
            if coefficient:
                full_digest.update((",".join(map(str, monomial)) + ":" + str(coefficient) + "\n").encode())
        total_terms += replay["mixed_support_terms"]
        total_negative += replay["negative_terms"]
        if summed_piece_lengths is None:
            summed_piece_lengths = [0] * len(replay["piece_lengths"])
        for i, length in enumerate(replay["piece_lengths"]):
            summed_piece_lengths[i] += length
        chunk_audit.append({
            "outer_exponent": exponent,
            "path": str(chunk_path),
            "sha256": record["sha256"],
            "replay_exact_match": True,
            **replay,
        })
        del piece_spec
        gc.collect()
        guard(f"formal outer {exponent} released", peak, args.hard_private_limit_bytes)

    result = manifest["result"]
    assert total_terms == result["mixed_support_terms"]
    assert total_negative == result["negative_terms"] == 0
    assert full_digest.hexdigest().upper() == result["ordered_coefficient_sha256"]
    assert summed_piece_lengths == result["piece_lengths"]
    here = Path(__file__).resolve().parent
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-outer-factored-formal-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_FORMAL_TWO_GRADING_EXACT_ROW_AND_CHUNK_REPLAY",
        "face": list(face),
        "bridge_corner": [2 * face[0], 2 * face[1]],
        "auxiliary": args.label,
        "total_ordinary_slack_degree": args.degree,
        "manifest": str(manifest_path),
        "manifest_sha256": expected_hash,
        "replayed_mixed_support_terms": total_terms,
        "replayed_negative_terms": total_negative,
        "replayed_ordered_coefficient_sha256": full_digest.hexdigest().upper(),
        "piece_lengths": summed_piece_lengths,
        "chunk_audit": chunk_audit,
        "outer_support_bound": [0, 2],
        "independent_construction": "formal_total_degree_by_b0_exponent_factor_arithmetic",
        "imports_producer": False,
        "global_row_assembly": False,
        "hard_private_memory_limit_bytes": args.hard_private_limit_bytes,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": sha256(Path(__file__)),
        "low_level_dependency_sha256": sha256(here / LOW_LEVEL_SOURCE),
        "producer_source_sha256_from_manifest": manifest["source_sha256"],
    }
    output = Path(args.output).resolve()
    report_hash = atomic_json(output, payload)
    print("PASS", output, report_hash, flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as error:
        if FAILURE_CONTEXT:
            requested = FAILURE_CONTEXT["output"]
            failure_path = requested.with_suffix(requested.suffix + ".failure.json")
            current = private_bytes()
            atomic_json(failure_path, {
                "schema": "rank8-low-low-a23-mixed-cross-outer-factored-formal-independent-audit-agent-v1",
                "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_GUARD",
                "face": list(FAILURE_CONTEXT["face"]),
                "auxiliary": FAILURE_CONTEXT["label"],
                "total_ordinary_slack_degree": FAILURE_CONTEXT["degree"],
                "requested_output": str(requested),
                "failure": {"type": type(error).__name__, "message": str(error)},
                "private_bytes_at_failure": current,
                "observed_peak_private_bytes_at_checkpoints": max(
                    FAILURE_CONTEXT["peak"][0], current
                ),
                "hard_private_memory_limit_bytes": FAILURE_CONTEXT["limit"],
                "source_sha256": sha256(Path(__file__)),
            })
        raise
