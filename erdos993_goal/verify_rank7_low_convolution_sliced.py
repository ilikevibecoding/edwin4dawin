#!/usr/bin/env python3
"""Memory-bounded exact rank-seven low-convolution cone replay.

The full low/high and low/low margins are homogeneous of total degree 14 in
their cone parameters.  Consequently dehomogenising at the *kept* variable
``b=1`` is injective on monomials: the missing exponent is exactly

    14 - (the sum of all retained exponents).

We then keep four off-hard-face variables as external slice indices.  The
factor coefficients q_6,q_7,q_8 are built as dictionaries from those four
exponents to FLINT polynomials in the remaining twelve variables.  Each
degree-14 margin slice is formed, scanned, and released separately.  Thus the
full cone is never materialised, while every original integer coefficient is
checked exactly.

This script intentionally does not trust an old coefficient dump.  It
reconstructs the factor cones and the hard face from their defining linear
gap parametrisations on every run.
"""

from __future__ import annotations

import argparse
import ctypes
import gc
import hashlib
import json
import math
import os
import threading
import time
from pathlib import Path
from typing import Iterable

from flint import fmpz_mpoly_ctx

from explore_rank7_convolution_hard_faces import low_high_hard, low_low_hard
from explore_rank7_convolution_extended_faces import low_high_b1_face


ROOT = Path(__file__).resolve().parent
TOTAL_DEGREE = 14
GIB = 1024**3


CASES = {
    "low-high": {
        "names": (
            "a", "b", "ta", "a0", "a2", "a3", "a4", "a5", "a6",
            "tb", "b0", "b1", "b2", "b3", "b4", "b5", "b6",
        ),
        "slice": ("a", "a0", "a2", "b1"),
        "off": ("a", "a0", "a2", "b2", "b3", "b4", "b5", "b6"),
        "face": ("b", "ta", "a3", "a4", "a5", "a6", "tb", "b0", "b1"),
        "face_builder": low_high_b1_face,
        "checkpoint": ROOT / "rank7_low_high_outside_b1_face_4slice_checkpoint_20260816.json",
        "report": ROOT / "rank7_low_high_outside_b1_face_sliced_exact_20260816.json",
    },
    "low-low": {
        "names": (
            "a", "b", "c", "ta", "a0", "a2", "a3", "a4", "a5", "a6",
            "tb", "b0", "b2", "b3", "b4", "b5", "b6",
        ),
        "slice": ("a", "a0", "a2", "b2"),
        "off": ("a", "a0", "a2", "b2", "b3", "b4", "b5", "b6"),
        "face": ("b", "c", "ta", "a3", "a4", "a5", "a6", "tb", "b0"),
        "face_builder": low_low_hard,
        "checkpoint": ROOT / "rank7_low_low_outside_hard_face_4slice_checkpoint_20260816.json",
        "report": ROOT / "rank7_low_low_off_face_sliced_exact_20260816.json",
    },
}


SliceKey = tuple[int, ...]
Slice = dict[SliceKey, object]


def add(left: Slice, right: Slice) -> Slice:
    out = dict(left)
    for key, value in right.items():
        if key in out:
            combined = out[key] + value
            if combined:
                out[key] = combined
            else:
                del out[key]
        elif value:
            out[key] = value
    return out


def scale(poly: Slice, multiplier: int) -> Slice:
    if multiplier == 0:
        return {}
    if multiplier == 1:
        return poly
    return {key: multiplier * value for key, value in poly.items()}


def multiply(left: Slice, right: Slice, maximum_degree: int = 8) -> Slice:
    out: Slice = {}
    for lkey, lvalue in left.items():
        for rkey, rvalue in right.items():
            key = tuple(x + y for x, y in zip(lkey, rkey))
            if sum(key) > maximum_degree:
                continue
            product = lvalue * rvalue
            if key in out:
                product += out[key]
            if product:
                out[key] = product
            elif key in out:
                del out[key]
    return out


def target_product(left: Slice, right: Slice, target: SliceKey, zero):
    """Coefficient at one external multidegree in a sliced product."""
    out = zero
    for lkey, lvalue in left.items():
        rkey = tuple(t - x for t, x in zip(target, lkey))
        if min(rkey) < 0:
            continue
        rvalue = right.get(rkey)
        if rvalue is not None:
            out += lvalue * rvalue
    return out


def compositions(total: int, parts: int, prefix: SliceKey = ()) -> Iterable[SliceKey]:
    if parts == 1:
        yield prefix + (total,)
        return
    for value in range(total + 1):
        yield from compositions(total - value, parts - 1, prefix + (value,))


def keys_through_degree(degree: int, dimension: int) -> Iterable[SliceKey]:
    # Total-degree order puts the exceptional base slice first.
    for total in range(degree + 1):
        yield from compositions(total, dimension)


class Construction:
    def __init__(self, case: str):
        self.case = case
        self.data = CASES[case]
        names = self.data["names"]
        self.slice_names = self.data["slice"]
        self.remaining_names = tuple(
            name for name in names if name != "b" and name not in self.slice_names
        )
        assert len(self.remaining_names) == 12
        # Lex order avoids the extra total-degree field used by degrevlex.
        self.context = fmpz_mpoly_ctx.get(self.remaining_names, "lex")
        self.zero = self.context.constant(0)
        self.one = self.context.constant(1)
        self.gens = dict(zip(self.remaining_names, self.context.gens()))
        self.units = {
            name: tuple(int(name == chosen) for chosen in self.slice_names)
            for name in self.slice_names
        }
        self.origin = (0,) * len(self.slice_names)

    def variable(self, name: str) -> Slice:
        if name == "b":
            return {self.origin: self.one}
        if name in self.units:
            return {self.units[name]: self.one}
        return {self.origin: self.gens[name]}

    def linear(self, **coefficients: int) -> Slice:
        out: Slice = {}
        for name, coefficient in coefficients.items():
            if coefficient:
                out = add(out, scale(self.variable(name), coefficient))
        return out

    def cumulative_coefficients(self, terminal: Slice, gaps: list[Slice]) -> list[Slice]:
        ratios: list[Slice | None] = [None] * 8
        ratios[7] = terminal
        for index in range(6, -1, -1):
            ratios[index] = add(ratios[index + 1], gaps[index])  # type: ignore[arg-type]
        coefficients: list[Slice] = [{self.origin: self.one}]
        for ratio in ratios:
            coefficients.append(multiply(coefficients[-1], ratio, len(coefficients)))
        return coefficients

    def low_factor(self, side: str) -> list[Slice]:
        if side == "left":
            terminal = self.variable("ta")
            d0, d2, d3, d4, d5, d6 = (
                self.variable(name) for name in ("a0", "a2", "a3", "a4", "a5", "a6")
            )
            if self.case == "low-high":
                # h=a+b, r=a.
                gaps = [
                    self.linear(a=2, b=2), self.variable("a"),
                    add(self.linear(a=1, b=2), d2),
                    add(self.linear(a=1, b=1), d3),
                    add(self.linear(a=1, b=1), d4),
                    add(self.linear(a=1, b=1), d5),
                    add(self.linear(a=1, b=1), d6),
                ]
            else:
                # h=a+b+c, r=a.
                gaps = [
                    self.linear(a=2, b=2, c=2), self.variable("a"),
                    add(self.linear(a=1, b=2, c=2), d2),
                    add(self.linear(a=1, b=1, c=1), d3),
                    add(self.linear(a=1, b=1, c=1), d4),
                    add(self.linear(a=1, b=1, c=1), d5),
                    add(self.linear(a=1, b=1, c=1), d6),
                ]
            gaps[0] = add(gaps[0], d0)
            return self.cumulative_coefficients(terminal, gaps)

        # Only the right low factor of the low/low case arrives here.
        assert self.case == "low-low" and side == "right"
        terminal = self.variable("tb")
        d0, d2, d3, d4, d5, d6 = (
            self.variable(name) for name in ("b0", "b2", "b3", "b4", "b5", "b6")
        )
        # h=a+b+c, r=a+b, hence 2h-r=a+b+2c.
        gaps = [
            add(self.linear(a=2, b=2, c=2), d0),
            self.linear(a=1, b=1),
            add(self.linear(a=1, b=1, c=2), d2),
            add(self.linear(a=1, b=1, c=1), d3),
            add(self.linear(a=1, b=1, c=1), d4),
            add(self.linear(a=1, b=1, c=1), d5),
            add(self.linear(a=1, b=1, c=1), d6),
        ]
        return self.cumulative_coefficients(terminal, gaps)

    def high_factor(self) -> list[Slice]:
        assert self.case == "low-high"
        terminal = self.variable("tb")
        slacks = [self.variable(name) for name in ("b0", "b1", "b2", "b3", "b4", "b5", "b6")]
        gaps = [add(self.linear(a=2, b=2), slacks[0])]
        gaps.extend(add(self.linear(a=1, b=1), value) for value in slacks[1:])
        return self.cumulative_coefficients(terminal, gaps)

    def product_coefficients(self) -> tuple[Slice, Slice, Slice]:
        left = self.low_factor("left")
        right = self.high_factor() if self.case == "low-high" else self.low_factor("right")
        result: list[Slice] = []
        for rank in (6, 7, 8):
            coefficient: Slice = {}
            for index in range(rank + 1):
                coefficient = add(
                    coefficient,
                    scale(multiply(left[index], right[rank - index], rank), math.comb(rank, index)),
                )
            result.append(coefficient)
        return result[0], result[1], result[2]

    def h(self) -> Slice:
        if self.case == "low-high":
            return self.linear(a=1, b=1)
        return self.linear(a=1, b=1, c=1)


def dehomogenised_face_slices(case: str) -> dict[SliceKey, dict[tuple[int, ...], int]]:
    """Drop b and split an independent face by the external exponents."""
    hard, context = CASES[case]["face_builder"]()
    names = tuple(str(value) for value in context.gens())
    b_index = names.index("b")
    slice_names = CASES[case]["slice"]
    retained_face_names = tuple(
        name for name in CASES[case]["face"] if name != "b" and name not in slice_names
    )
    result: dict[SliceKey, dict[tuple[int, ...], int]] = {}
    for monomial, coefficient in hard.terms():
        exponent_by_name = dict(zip(names, map(int, monomial)))
        target = tuple(exponent_by_name.get(name, 0) for name in slice_names)
        key = tuple(exponent_by_name[name] for name in retained_face_names)
        target_map = result.setdefault(target, {})
        # Homogeneity makes this projection injective.
        assert key not in target_map
        assert sum(int(value) for value in monomial) == TOTAL_DEGREE
        target_map[key] = int(coefficient)
    return result


class PROCESS_MEMORY_COUNTERS_EX(ctypes.Structure):
    _fields_ = [
        ("cb", ctypes.c_ulong),
        ("PageFaultCount", ctypes.c_ulong),
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
    counters = PROCESS_MEMORY_COUNTERS_EX()
    counters.cb = ctypes.sizeof(counters)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    psapi = ctypes.WinDLL("psapi", use_last_error=True)
    kernel32.GetCurrentProcess.restype = ctypes.c_void_p
    psapi.GetProcessMemoryInfo.argtypes = (
        ctypes.c_void_p,
        ctypes.POINTER(PROCESS_MEMORY_COUNTERS_EX),
        ctypes.c_ulong,
    )
    psapi.GetProcessMemoryInfo.restype = ctypes.c_int
    handle = kernel32.GetCurrentProcess()
    ok = psapi.GetProcessMemoryInfo(
        handle, ctypes.byref(counters), counters.cb
    )
    if not ok:
        raise ctypes.WinError()
    return int(counters.PrivateUsage)


def suffixed(path: Path, worker_id: str) -> Path:
    if not worker_id:
        return path
    return path.with_name(f"{path.stem}_{worker_id}{path.suffix}")


def run(
    case: str,
    resume: bool = False,
    range_start: int = 1,
    range_stop: int | None = None,
    worker_id: str = "",
) -> dict:
    started = time.time()
    peak = private_bytes()
    stop = threading.Event()

    def sample() -> None:
        nonlocal peak
        while not stop.wait(0.1):
            peak = max(peak, private_bytes())

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    try:
        construction = Construction(case)
        q6, q7, q8 = construction.product_coefficients()
        h = construction.h()
        face_names_without_b_or_slice = tuple(
            name
            for name in CASES[case]["face"]
            if name != "b" and name not in construction.slice_names
        )
        face_positions = tuple(
            construction.remaining_names.index(name) for name in face_names_without_b_or_slice
        )
        expected_face_slices = dehomogenised_face_slices(case)
        total_slices = math.comb(TOTAL_DEGREE + len(construction.slice_names), len(construction.slice_names))
        if range_stop is None:
            range_stop = total_slices
        assert 1 <= range_start <= range_stop <= total_slices
        all_targets = list(keys_through_degree(TOTAL_DEGREE, len(construction.slice_names)))
        target_ordinal = {target: ordinal for ordinal, target in enumerate(all_targets, 1)}
        expected_face_slices_in_range = {
            target: values
            for target, values in expected_face_slices.items()
            if range_start <= target_ordinal[target] <= range_stop
        }
        expected_face_terms = sum(
            len(values) for values in expected_face_slices_in_range.values()
        )
        off = set(CASES[case]["off"])

        checkpoint_path = suffixed(CASES[case]["checkpoint"], worker_id)
        if resume and checkpoint_path.exists():
            saved = json.loads(checkpoint_path.read_text(encoding="utf-8"))
            assert saved["case"] == case
            # Legacy full-range checkpoints may be narrowed safely so long as
            # every completed ordinal lies in the requested new range.
            if "range_start" in saved:
                assert int(saved["range_start"]) == range_start
                assert int(saved["range_stop"]) >= range_stop
            completed_slices = int(saved["completed_slices"])
            assert range_start - 1 <= completed_slices <= range_stop
            total_terms = int(saved["terms_scanned"])
            total_negative = int(saved["negative_coefficients_seen"])
            outside_terms = int(saved["outside_exceptional_face_terms_scanned"])
            outside_negative = int(saved["outside_exceptional_face_negative_coefficients_seen"])
            minimum = saved["minimum"]
            maximum = saved["maximum"]
            outside_minimum = saved["outside_minimum"]
            outside_maximum = saved["outside_maximum"]
            verified_face_slices = {tuple(row) for row in saved["verified_exceptional_face_slices"]}
            slice_rows = saved["slice_statistics"]
            print(f"{case} resumed after {completed_slices}/{total_slices} slices", flush=True)
        else:
            completed_slices = range_start - 1
            total_terms = total_negative = outside_terms = outside_negative = 0
            minimum = maximum = outside_minimum = outside_maximum = None
            verified_face_slices: set[SliceKey] = set()
            slice_rows = []

        for ordinal, target in enumerate(all_targets, 1):
            if ordinal < range_start or ordinal <= completed_slices:
                continue
            if ordinal > range_stop:
                break
            margin = target_product(q7, q7, target, construction.zero)
            margin -= target_product(q6, q8, target, construction.zero)
            for hkey, hvalue in h.items():
                residual = tuple(t - x for t, x in zip(target, hkey))
                if min(residual) >= 0:
                    margin -= hvalue * target_product(q6, q7, residual, construction.zero)

            row_terms = row_negative = row_outside = row_outside_negative = 0
            row_minimum = row_maximum = None
            face_extracted: dict[tuple[int, ...], int] = {}
            for monomial, coefficient_raw in margin.terms():
                coefficient = int(coefficient_raw)
                retained_degree = sum(int(value) for value in monomial)
                b_exponent = TOTAL_DEGREE - sum(target) - retained_degree
                assert b_exponent >= 0
                total_terms += 1
                row_terms += 1
                total_negative += coefficient < 0
                row_negative += coefficient < 0
                minimum = coefficient if minimum is None else min(minimum, coefficient)
                maximum = coefficient if maximum is None else max(maximum, coefficient)
                row_minimum = coefficient if row_minimum is None else min(row_minimum, coefficient)
                row_maximum = coefficient if row_maximum is None else max(row_maximum, coefficient)

                exponents = dict(zip(construction.slice_names, target))
                exponents.update(
                    (name, int(monomial[index]))
                    for index, name in enumerate(construction.remaining_names)
                )
                exponents["b"] = b_exponent
                on_hard = all(exponents[name] == 0 for name in off)
                if on_hard:
                    key = tuple(int(monomial[index]) for index in face_positions)
                    assert key not in face_extracted
                    face_extracted[key] = coefficient
                else:
                    outside_terms += 1
                    row_outside += 1
                    outside_negative += coefficient < 0
                    row_outside_negative += coefficient < 0
                    outside_minimum = (
                        coefficient if outside_minimum is None else min(outside_minimum, coefficient)
                    )
                    outside_maximum = (
                        coefficient if outside_maximum is None else max(outside_maximum, coefficient)
                    )

            slice_rows.append(
                {
                    "exponents": list(target),
                    "terms": row_terms,
                    "negative": row_negative,
                    "outside_exceptional_face_terms": row_outside,
                    "outside_exceptional_face_negative": row_outside_negative,
                    "minimum": row_minimum,
                    "maximum": row_maximum,
                }
            )
            del margin
            gc.collect()

            expected_face_slice = expected_face_slices.get(target, {})
            assert face_extracted == expected_face_slice
            if expected_face_slice:
                verified_face_slices.add(target)

            checkpoint = {
                "status": "IN_PROGRESS_EXACT_SLICED_REPLAY",
                "case": case,
                "completed_slices": ordinal,
                "total_slices": total_slices,
                "range_start": range_start,
                "range_stop": range_stop,
                "worker_id": worker_id,
                "last_slice_exponents": list(target),
                "terms_scanned": total_terms,
                "negative_coefficients_seen": total_negative,
                "outside_exceptional_face_terms_scanned": outside_terms,
                "outside_exceptional_face_negative_coefficients_seen": outside_negative,
                "minimum": minimum,
                "maximum": maximum,
                "outside_minimum": outside_minimum,
                "outside_maximum": outside_maximum,
                "verified_exceptional_face_slices": [list(row) for row in sorted(verified_face_slices)],
                "exceptional_face_terms": expected_face_terms,
                "slice_statistics": slice_rows,
                "peak_private_GiB": peak / GIB,
                "elapsed_seconds": time.time() - started,
            }
            checkpoint_path.write_text(json.dumps(checkpoint, indent=2) + "\n", encoding="utf-8")
            print(
                f"{case} slices {ordinal}/{total_slices}; terms={total_terms}; "
                f"off_negative={outside_negative}; private_GiB={private_bytes()/GIB:.3f}",
                flush=True,
            )
            # Stop on the first exact obstruction, after persisting it.
            assert row_outside_negative == 0

        # The theorem-producing assertion.
        assert outside_negative == 0
        assert verified_face_slices == set(expected_face_slices_in_range)
        assert total_terms == outside_terms + expected_face_terms
        face_values = tuple(
            coefficient
            for values in expected_face_slices_in_range.values()
            for coefficient in values.values()
        )
        face_statistics = {
            "terms": len(face_values),
            "negative": sum(value < 0 for value in face_values),
            "minimum": min(face_values) if face_values else None,
            "maximum": max(face_values) if face_values else None,
        }

        report = {
            "status": f"PASS_EXACT_MEMORY_BOUNDED_RANK7_{case.upper().replace('-', '_')}_OFF_FACE_CONE",
            "case": case,
            "range_start": range_start,
            "range_stop": range_stop,
            "worker_id": worker_id,
            "total_degree": TOTAL_DEGREE,
            "dehomogenised_variable": "b",
            "slice_variables": list(construction.slice_names),
            "remaining_polynomial_variables": list(construction.remaining_names),
            "injectivity_reason": "homogeneity recovers b exponent as 14 minus the retained total degree",
            "full_statistics": {
                "terms": total_terms,
                "negative": total_negative,
                "minimum": minimum,
                "maximum": maximum,
            },
            "outside_exceptional_face_statistics": {
                "terms": outside_terms,
                "negative": outside_negative,
                "minimum": outside_minimum,
                "maximum": outside_maximum,
            },
            "exceptional_face_statistics": face_statistics,
            "exceptional_face_equals_independent_reduced_reconstruction": True,
            "slice_count": len(slice_rows),
            "slice_statistics": slice_rows,
            "peak_private_bytes": peak,
            "peak_private_GiB": peak / GIB,
            "elapsed_seconds": time.time() - started,
            "conclusion": "every negative coefficient of the full cone lies on the independently certified exceptional face",
        }
        report_path = CASES[case]["report"]
        if range_start != 1 or range_stop != total_slices or worker_id:
            label = worker_id or f"range_{range_start}_{range_stop}"
            report_path = suffixed(report_path, label)
        report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(report["status"], flush=True)
        print("full", report["full_statistics"], flush=True)
        print("outside exceptional face", report["outside_exceptional_face_statistics"], flush=True)
        print("exceptional face", report["exceptional_face_statistics"], flush=True)
        print("peak_private_GiB", f"{peak/GIB:.3f}", flush=True)
        print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
        print("report_sha256", hashlib.sha256(report_path.read_bytes()).hexdigest().upper())
        return report
    finally:
        stop.set()
        sampler.join(timeout=1)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", choices=tuple(CASES), required=True)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--range-start", type=int, default=1)
    parser.add_argument("--range-stop", type=int)
    parser.add_argument("--worker-id", default="")
    args = parser.parse_args()
    run(
        args.case,
        resume=args.resume,
        range_start=args.range_start,
        range_stop=args.range_stop,
        worker_id=args.worker_id,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
