#!/usr/bin/env python3
"""Memory-bounded exact scan of the rank-eight low/high endpoint cone.

This fixes the exceptional parameter at delta1=0, delta2=2h+a2 and slices
on four off-face slacks.  The only allowed signed locus is the independently
certified enlarged face

    a0=a2=b3=b4=b5=b6=b7=0,

with b2 retained.  Every target slice is formed, scanned, checkpointed, and
released; the full polynomial is never materialised.
"""

from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import math
from pathlib import Path
import threading
import time

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
TOTAL_DEGREE = 16
SLICE_NAMES = ("a0", "a2", "b3", "b4", "b5", "b6")
REMAINING_NAMES = (
    "h", "ta", "a3", "a4", "a5", "a6", "a7",
    "tb", "b0", "b1", "b2", "b7",
)
REMAINING_OFF_INDICES = (REMAINING_NAMES.index("b7"),)
CHECKPOINT = ROOT / "rank8_low_high_endpoint_sliced_checkpoint_20260820.json"
REPORT = ROOT / "rank8_low_high_endpoint_sliced_exact_20260820.json"


def add(left, right):
    out = dict(left)
    for key, value in right.items():
        if key in out:
            value += out[key]
        if value:
            out[key] = value
        elif key in out:
            del out[key]
    return out


def scale(poly, multiplier):
    if multiplier == 0:
        return {}
    if multiplier == 1:
        return poly
    return {key: multiplier * value for key, value in poly.items()}


def multiply(left, right, maximum_degree, maximum_key=None):
    out = {}
    for left_key, left_value in left.items():
        for right_key, right_value in right.items():
            key = tuple(a + b for a, b in zip(left_key, right_key))
            if sum(key) > maximum_degree:
                continue
            if maximum_key is not None and any(
                value > bound for value, bound in zip(key, maximum_key)
            ):
                continue
            value = left_value * right_value
            if key in out:
                value += out[key]
            if value:
                out[key] = value
            elif key in out:
                del out[key]
    return out


def target_product(left, right, target, zero):
    out = zero
    for left_key, left_value in left.items():
        right_key = tuple(total - value for total, value in zip(target, left_key))
        if min(right_key) < 0:
            continue
        right_value = right.get(right_key)
        if right_value is not None:
            out += left_value * right_value
    return out


def compositions(total, parts, prefix=()):
    if parts == 1:
        yield prefix + (total,)
        return
    for value in range(total + 1):
        yield from compositions(total - value, parts - 1, prefix + (value,))


def all_targets():
    return [
        key
        for total in range(TOTAL_DEGREE + 1)
        for key in compositions(total, len(SLICE_NAMES))
    ]


class Construction:
    def __init__(self, target):
        self.target = target
        self.context = fmpz_mpoly_ctx.get(REMAINING_NAMES, "lex")
        self.zero = self.context.constant(0)
        self.one = self.context.constant(1)
        generators = list(self.context.gens())
        self.generators = {
            REMAINING_NAMES[index]: generators[index]
            for index in range(len(REMAINING_NAMES))
        }
        self.origin = (0,) * len(SLICE_NAMES)
        self.units = {
            name: tuple(int(name == chosen) for chosen in SLICE_NAMES)
            for name in SLICE_NAMES
        }

    def variable(self, name):
        if name in self.units:
            return {self.units[name]: self.one}
        return {self.origin: self.generators[name]}

    def linear(self, *names_with_coefficients):
        out = {}
        for coefficient, name in names_with_coefficients:
            out = add(out, scale(self.variable(name), coefficient))
        return out

    def coefficient_row(self, terminal_name, gaps):
        ratios = [None] * 9
        ratios[8] = self.variable(terminal_name)
        for index in range(7, -1, -1):
            ratios[index] = add(ratios[index + 1], gaps[index])
        coefficients = [{self.origin: self.one}]
        for ratio in ratios:
            coefficients.append(
                multiply(
                    coefficients[-1], ratio, len(coefficients), self.target
                )
            )
        return coefficients

    def product_rows(self):
        h = self.variable("h")
        left_gaps = [self.linear((2, "h"), (1, "a0")), {}, self.linear((2, "h"), (1, "a2"))]
        left_gaps.extend(self.linear((1, "h"), (1, f"a{index}")) for index in range(3, 8))
        right_gaps = [self.linear((2, "h"), (1, "b0"))]
        right_gaps.extend(self.linear((1, "h"), (1, f"b{index}")) for index in range(1, 8))
        left = self.coefficient_row("ta", left_gaps)
        right = self.coefficient_row("tb", right_gaps)
        rows = []
        for rank in (7, 8, 9):
            coefficient = {}
            for index in range(rank + 1):
                coefficient = add(
                    coefficient,
                    scale(
                        multiply(
                            left[index], right[rank - index], rank, self.target
                        ),
                        math.comb(rank, index),
                    ),
                )
            rows.append(coefficient)
        return rows[0], rows[1], rows[2], h


class PROCESS_MEMORY_COUNTERS_EX(ctypes.Structure):
    _fields_ = [
        ("cb", ctypes.c_ulong), ("PageFaultCount", ctypes.c_ulong),
        ("PeakWorkingSetSize", ctypes.c_size_t), ("WorkingSetSize", ctypes.c_size_t),
        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t), ("QuotaPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t), ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
        ("PagefileUsage", ctypes.c_size_t), ("PeakPagefileUsage", ctypes.c_size_t),
        ("PrivateUsage", ctypes.c_size_t),
    ]


def private_bytes():
    counters = PROCESS_MEMORY_COUNTERS_EX()
    counters.cb = ctypes.sizeof(counters)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    psapi = ctypes.WinDLL("psapi", use_last_error=True)
    kernel32.GetCurrentProcess.restype = ctypes.c_void_p
    psapi.GetProcessMemoryInfo.argtypes = (
        ctypes.c_void_p, ctypes.POINTER(PROCESS_MEMORY_COUNTERS_EX), ctypes.c_ulong,
    )
    psapi.GetProcessMemoryInfo.restype = ctypes.c_int
    if not psapi.GetProcessMemoryInfo(
        kernel32.GetCurrentProcess(), ctypes.byref(counters), counters.cb
    ):
        raise ctypes.WinError()
    return int(counters.PrivateUsage)


def summarize_target(polynomial, target):
    all_terms = outside_terms = hard_terms = 0
    all_negative = outside_negative = hard_negative = 0
    all_minimum = outside_minimum = hard_minimum = None
    all_maximum = outside_maximum = hard_maximum = None
    target_is_zero = not any(target)
    for monomial, coefficient in polynomial.terms():
        value = int(coefficient)
        all_terms += 1
        all_negative += value < 0
        all_minimum = value if all_minimum is None else min(all_minimum, value)
        all_maximum = value if all_maximum is None else max(all_maximum, value)
        is_hard = target_is_zero and all(int(monomial[index]) == 0 for index in REMAINING_OFF_INDICES)
        if is_hard:
            hard_terms += 1
            hard_negative += value < 0
            hard_minimum = value if hard_minimum is None else min(hard_minimum, value)
            hard_maximum = value if hard_maximum is None else max(hard_maximum, value)
        else:
            outside_terms += 1
            outside_negative += value < 0
            outside_minimum = value if outside_minimum is None else min(outside_minimum, value)
            outside_maximum = value if outside_maximum is None else max(outside_maximum, value)
    return {
        "target": list(target),
        "terms": all_terms,
        "negative": all_negative,
        "minimum": all_minimum,
        "maximum": all_maximum,
        "outside_terms": outside_terms,
        "outside_negative": outside_negative,
        "outside_minimum": outside_minimum,
        "outside_maximum": outside_maximum,
        "hard_terms": hard_terms,
        "hard_negative": hard_negative,
        "hard_minimum": hard_minimum,
        "hard_maximum": hard_maximum,
    }


def atomic_json(path, payload):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def run(range_start, range_stop, resume, shared):
    started = time.time()
    peak = private_bytes()
    stop = threading.Event()

    def sample():
        nonlocal peak
        while not stop.wait(0.1):
            peak = max(peak, private_bytes())

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    try:
        targets = all_targets()
        shared_construction = Construction(None) if shared else None
        if shared_construction is not None:
            shared_rows = shared_construction.product_rows()
        else:
            shared_rows = None
        if range_stop is None:
            range_stop = len(targets)
        assert 1 <= range_start <= range_stop <= len(targets)
        if resume and CHECKPOINT.exists():
            saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
            assert saved["range_start"] == range_start and saved["range_stop"] == range_stop
            rows = saved["slice_statistics"]
            completed = saved["completed_slices"]
        else:
            rows = []
            completed = range_start - 1
        for ordinal, target in enumerate(targets, 1):
            if ordinal < range_start or ordinal <= completed:
                continue
            if ordinal > range_stop:
                break
            construction = shared_construction or Construction(target)
            if shared_rows is None:
                q7, q8, q9, h = construction.product_rows()
            else:
                q7, q8, q9, h = shared_rows
            margin = target_product(q8, q8, target, construction.zero)
            margin -= target_product(q7, q9, target, construction.zero)
            for h_key, h_value in h.items():
                residual = tuple(total - value for total, value in zip(target, h_key))
                if min(residual) < 0:
                    continue
                margin -= h_value * target_product(q7, q8, residual, construction.zero)
            row = summarize_target(margin, target)
            if row["outside_negative"]:
                raise AssertionError(f"negative coefficient outside enlarged face at {target}: {row}")
            rows.append(row)
            completed = ordinal
            peak = max(peak, private_bytes())
            checkpoint = {
                "status": "RUNNING_EXACT_RANK8_LOW_HIGH_ENDPOINT_SLICED",
                "range_start": range_start,
                "range_stop": range_stop,
                "completed_slices": completed,
                "total_slices": len(targets),
                "slice_statistics": rows,
                "peak_private_bytes": peak,
                "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
            }
            atomic_json(CHECKPOINT, checkpoint)
            print("PASS", ordinal, target, row["terms"], flush=True)
        payload = {
            "schema": "rank8-low-high-endpoint-sliced-range-v1",
            "status": "PASS_EXACT_RANK8_LOW_HIGH_ENDPOINT_SLICED_RANGE",
            "range_start": range_start,
            "range_stop": range_stop,
            "completed_slices": completed - range_start + 1,
            "total_slices": len(targets),
            "shared_row_build": shared,
            "slice_names": list(SLICE_NAMES),
            "remaining_names": list(REMAINING_NAMES),
            "slice_statistics": rows,
            "outside_terms": sum(row["outside_terms"] for row in rows),
            "outside_negative": sum(row["outside_negative"] for row in rows),
            "hard_terms": sum(row["hard_terms"] for row in rows),
            "hard_negative": sum(row["hard_negative"] for row in rows),
            "peak_private_bytes": peak,
            "elapsed_seconds": time.time() - started,
            "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        }
        atomic_json(REPORT, payload)
        print(payload["status"])
        print("REPORT", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())
    finally:
        stop.set()
        sampler.join()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--range-start", type=int, default=1)
    parser.add_argument("--range-stop", type=int)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--shared", action="store_true")
    args = parser.parse_args()
    run(args.range_start, args.range_stop, args.resume, args.shared)


if __name__ == "__main__":
    main()
