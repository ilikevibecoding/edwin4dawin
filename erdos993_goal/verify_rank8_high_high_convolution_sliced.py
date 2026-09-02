#!/usr/bin/env python3
"""Memory-bounded exact rank-eight high/high convolution-cone replay.

The rank-eight factorial margin is

    q8^2 - q7*q9 - h*q7*q8.

Both factors use the high gap cone

    delta0=2h+d0, delta1=h+d1, ..., delta7=h+d7.

We dehomogenise at h=1 and retain six high-impact variables as external
slice indices.  Homogeneity recovers the omitted h exponent, so the map is
injective on monomials.  Left/right symmetry lets one canonical slice stand
for its swapped mate.  No full margin polynomial is ever materialised.
"""

from __future__ import annotations

import argparse
import ctypes
import gc
import hashlib
import json
import math
from pathlib import Path
import threading
import time
from typing import Iterable

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
TOTAL_DEGREE = 16
SLICE_NAMES = ("ta", "a7", "a6", "tb", "b7", "b6")
LEFT_SLICE = slice(0, 3)
RIGHT_SLICE = slice(3, 6)
REMAINING_NAMES = tuple(
    [f"a{index}" for index in range(6)]
    + [f"b{index}" for index in range(6)]
)
CHECKPOINT = ROOT / "rank8_high_high_convolution_sliced_checkpoint_20260820.json"
REPORT = ROOT / "rank8_high_high_convolution_sliced_exact_20260820.json"
GIB = 1024**3

SliceKey = tuple[int, ...]
SlicePoly = dict[SliceKey, object]


def add(left: SlicePoly, right: SlicePoly) -> SlicePoly:
    out = dict(left)
    for key, value in right.items():
        if key in out:
            value += out[key]
        if value:
            out[key] = value
        elif key in out:
            del out[key]
    return out


def scale(poly: SlicePoly, multiplier: int) -> SlicePoly:
    if multiplier == 0:
        return {}
    if multiplier == 1:
        return poly
    return {key: multiplier*value for key, value in poly.items()}


def multiply(left: SlicePoly, right: SlicePoly, maximum_degree: int) -> SlicePoly:
    out: SlicePoly = {}
    for lkey, lvalue in left.items():
        for rkey, rvalue in right.items():
            key = tuple(x+y for x, y in zip(lkey, rkey))
            if sum(key) > maximum_degree:
                continue
            value = lvalue*rvalue
            if key in out:
                value += out[key]
            if value:
                out[key] = value
            elif key in out:
                del out[key]
    return out


def target_product(left: SlicePoly, right: SlicePoly, target: SliceKey, zero):
    out = zero
    for lkey, lvalue in left.items():
        rkey = tuple(t-x for t, x in zip(target, lkey))
        if min(rkey) < 0:
            continue
        rvalue = right.get(rkey)
        if rvalue is not None:
            out += lvalue*rvalue
    return out


def compositions(total: int, parts: int, prefix: SliceKey = ()) -> Iterable[SliceKey]:
    if parts == 1:
        yield prefix+(total,)
        return
    for value in range(total+1):
        yield from compositions(total-value, parts-1, prefix+(value,))


def all_targets() -> list[SliceKey]:
    return [
        key
        for total in range(TOTAL_DEGREE+1)
        for key in compositions(total, len(SLICE_NAMES))
    ]


def canonical(target: SliceKey) -> bool:
    return target[LEFT_SLICE] <= target[RIGHT_SLICE]


def multiplicity(target: SliceKey) -> int:
    return 1 if target[LEFT_SLICE] == target[RIGHT_SLICE] else 2


class Construction:
    def __init__(self) -> None:
        self.context = fmpz_mpoly_ctx.get(REMAINING_NAMES, "lex")
        self.zero = self.context.constant(0)
        self.one = self.context.constant(1)
        self.gens = dict(zip(REMAINING_NAMES, self.context.gens()))
        self.origin = (0,)*len(SLICE_NAMES)
        self.units = {
            name: tuple(int(name == chosen) for chosen in SLICE_NAMES)
            for name in SLICE_NAMES
        }

    def variable(self, name: str) -> SlicePoly:
        if name == "h":
            return {self.origin: self.one}
        if name in self.units:
            return {self.units[name]: self.one}
        return {self.origin: self.gens[name]}

    def linear(self, terms: tuple[tuple[int, str], ...]) -> SlicePoly:
        out: SlicePoly = {}
        for coefficient, name in terms:
            out = add(out, scale(self.variable(name), coefficient))
        return out

    def factor(self, side: str) -> list[SlicePoly]:
        terminal = self.variable(f"t{side}")
        gaps = [
            self.linear(((2, "h"), (1, f"{side}0"))),
            *(
                self.linear(((1, "h"), (1, f"{side}{index}")))
                for index in range(1, 8)
            ),
        ]
        ratios: list[SlicePoly | None] = [None]*9
        ratios[8] = terminal
        for index in range(7, -1, -1):
            ratios[index] = add(ratios[index+1], gaps[index])  # type: ignore[arg-type]
        coefficients: list[SlicePoly] = [{self.origin: self.one}]
        for ratio in ratios:
            coefficients.append(
                multiply(coefficients[-1], ratio, len(coefficients))  # type: ignore[arg-type]
            )
        return coefficients

    def product_coefficients(self) -> tuple[SlicePoly, SlicePoly, SlicePoly]:
        left = self.factor("a")
        right = self.factor("b")
        result = []
        for rank in (7, 8, 9):
            coefficient: SlicePoly = {}
            for index in range(rank+1):
                coefficient = add(
                    coefficient,
                    scale(
                        multiply(left[index], right[rank-index], rank),
                        math.comb(rank, index),
                    ),
                )
            result.append(coefficient)
        return result[0], result[1], result[2]


class PROCESS_MEMORY_COUNTERS_EX(ctypes.Structure):
    _fields_ = [
        ("cb", ctypes.c_ulong), ("PageFaultCount", ctypes.c_ulong),
        ("PeakWorkingSetSize", ctypes.c_size_t), ("WorkingSetSize", ctypes.c_size_t),
        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t), ("QuotaPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t), ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
        ("PagefileUsage", ctypes.c_size_t), ("PeakPagefileUsage", ctypes.c_size_t),
        ("PrivateUsage", ctypes.c_size_t),
    ]


def private_bytes() -> int:
    counters = PROCESS_MEMORY_COUNTERS_EX()
    counters.cb = ctypes.sizeof(counters)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    psapi = ctypes.WinDLL("psapi", use_last_error=True)
    kernel32.GetCurrentProcess.restype = ctypes.c_void_p
    psapi.GetProcessMemoryInfo.argtypes = (
        ctypes.c_void_p, ctypes.POINTER(PROCESS_MEMORY_COUNTERS_EX), ctypes.c_ulong,
    )
    psapi.GetProcessMemoryInfo.restype = ctypes.c_int
    ok = psapi.GetProcessMemoryInfo(
        kernel32.GetCurrentProcess(), ctypes.byref(counters), counters.cb
    )
    if not ok:
        raise ctypes.WinError()
    return int(counters.PrivateUsage)


def run(range_start: int, range_stop: int | None, resume: bool) -> dict:
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
        construction = Construction()
        q7, q8, q9 = construction.product_coefficients()
        targets = [target for target in all_targets() if canonical(target)]
        represented_total = sum(multiplicity(target) for target in targets)
        assert represented_total == math.comb(TOTAL_DEGREE+len(SLICE_NAMES), len(SLICE_NAMES))
        if range_stop is None:
            range_stop = len(targets)
        assert 1 <= range_start <= range_stop <= len(targets)

        if resume and CHECKPOINT.exists():
            saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
            assert saved["range_start"] == range_start and saved["range_stop"] == range_stop
            completed = saved["completed_canonical_slices"]
            represented_slices = saved["represented_slices"]
            terms = saved["represented_terms"]
            negative = saved["represented_negative_coefficients"]
            minimum = saved["minimum"]
            maximum = saved["maximum"]
            rows = saved["slice_statistics"]
        else:
            completed = range_start-1
            represented_slices = terms = negative = 0
            minimum = maximum = None
            rows = []

        for ordinal, target in enumerate(targets, 1):
            if ordinal < range_start or ordinal <= completed:
                continue
            if ordinal > range_stop:
                break
            margin = target_product(q8, q8, target, construction.zero)
            margin -= target_product(q7, q9, target, construction.zero)
            margin -= target_product(q7, q8, target, construction.zero)
            row_terms = row_negative = 0
            row_minimum = row_maximum = None
            for monomial, coefficient_raw in margin.terms():
                coefficient = int(coefficient_raw)
                h_exponent = TOTAL_DEGREE-sum(target)-sum(map(int, monomial))
                assert h_exponent >= 0
                row_terms += 1
                row_negative += coefficient < 0
                row_minimum = coefficient if row_minimum is None else min(row_minimum, coefficient)
                row_maximum = coefficient if row_maximum is None else max(row_maximum, coefficient)
            mult = multiplicity(target)
            represented_slices += mult
            terms += mult*row_terms
            negative += mult*row_negative
            if row_minimum is not None:
                minimum = row_minimum if minimum is None else min(minimum, row_minimum)
                maximum = row_maximum if maximum is None else max(maximum, row_maximum)
            rows.append({
                "canonical_ordinal": ordinal,
                "exponents": list(target),
                "symmetry_multiplicity": mult,
                "terms": row_terms,
                "negative": row_negative,
                "minimum": row_minimum,
                "maximum": row_maximum,
            })
            del margin
            gc.collect()
            checkpoint = {
                "status": "IN_PROGRESS_EXACT_SLICED_RANK8_HIGH_HIGH",
                "range_start": range_start,
                "range_stop": range_stop,
                "completed_canonical_slices": ordinal,
                "canonical_slices_total": len(targets),
                "all_slices_total": represented_total,
                "represented_slices": represented_slices,
                "represented_terms": terms,
                "represented_negative_coefficients": negative,
                "minimum": minimum,
                "maximum": maximum,
                "peak_private_bytes": peak,
                "peak_private_GiB": peak/GIB,
                "slice_statistics": rows,
            }
            CHECKPOINT.write_text(json.dumps(checkpoint, indent=2)+"\n", encoding="utf-8")
            print(
                f"rank8 high/high canonical {ordinal}/{len(targets)} "
                f"represented={represented_slices}/{represented_total} terms={terms} "
                f"negative={negative} private_GiB={private_bytes()/GIB:.3f}",
                flush=True,
            )
            # A negative coefficient is an enlarged-cone obstruction only.
            assert row_negative == 0
            assert peak < GIB

        assert negative == 0
        report = {
            "status": (
                "PASS_EXACT_MEMORY_BOUNDED_FULL_RANK8_HIGH_HIGH_CONVOLUTION_CONE"
                if range_start == 1 and range_stop == len(targets)
                else "PASS_EXACT_MEMORY_BOUNDED_RANK8_HIGH_HIGH_CONVOLUTION_CONE_RANGE"
            ),
            "range_start": range_start,
            "range_stop": range_stop,
            "canonical_slices_total": len(targets),
            "all_slices_total": represented_total,
            "represented_slices": represented_slices,
            "total_degree": TOTAL_DEGREE,
            "dehomogenised_variable": "h",
            "slice_variables": list(SLICE_NAMES),
            "remaining_polynomial_variables": list(REMAINING_NAMES),
            "injectivity_reason": "homogeneity recovers the h exponent as 16 minus the retained total degree",
            "symmetry_reason": "the margin is invariant under swapping the two factors and their parameter names",
            "statistics": {
                "terms": terms,
                "negative": negative,
                "minimum": minimum,
                "maximum": maximum,
            },
            "peak_private_bytes": peak,
            "peak_private_GiB": peak/GIB,
            "elapsed_seconds": time.time()-started,
            "slice_statistics": rows,
            "scope_warning": "A failed coefficient assertion would be an enlarged-cone failure, not a forest counterexample.",
            "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        }
        output = REPORT
        if range_start != 1 or range_stop != len(targets):
            output = REPORT.with_name(
                f"{REPORT.stem}_range_{range_start}_{range_stop}{REPORT.suffix}"
            )
        output.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
        print(report["status"])
        print("REPORT", output.name, hashlib.sha256(output.read_bytes()).hexdigest().upper())
        return report
    finally:
        stop.set()
        sampler.join(timeout=1)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--range-start", type=int, default=1)
    parser.add_argument("--range-stop", type=int)
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()
    run(args.range_start, args.range_stop, args.resume)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
