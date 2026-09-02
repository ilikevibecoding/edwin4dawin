#!/usr/bin/env python3
"""Memory-bounded exact b5 slices over the proved b3,b4 hard-low face.

The coefficient ring retains the cumulative-X hard variables and b3,b4.
Only the exponent of b5 is stored in a small map.  The b5=0 slice is pinned
to the already completed b3,b4 coefficient scan; positive b5 slices are
formed, scanned, checkpointed, and released one at a time.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
CHECKPOINT = ROOT / "rank8_low_high_base_payment_b345_sliced_checkpoint_20260820.json"
REPORT = ROOT / "rank8_low_high_base_payment_b345_sliced_exact_20260820.json"
NAMES = (
    "h", "ta", "a3", "a4", "a5", "a6", "a7",
    "tb", "b0", "b1", "b2", "b3", "b4",
)
EXPECTED = {
    "probe_rank8_low_high_base_payment_high_tail_subset.py":
        "F8CC822C04B6ED129A84F36E85BC77A6BC7C6B63E057C311B91EC8A36693EDE7",
    "rank8_low_high_base_payment_b3_b4_subset_exact_20260820.json":
        "5E70574DBA9433A36414AB011CD87E8D6324EB358901164905340C528CA3D19A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left, right):
    out = dict(left)
    for key, value in right.items():
        value = out.get(key, 0) + value
        if value:
            out[key] = value
        elif key in out:
            del out[key]
    return out


def scale(poly, multiplier):
    return {key: multiplier * value for key, value in poly.items()} if multiplier else {}


def multiply(left, right):
    out = {}
    for left_degree, left_value in left.items():
        for right_degree, right_value in right.items():
            degree = left_degree + right_degree
            value = out.get(degree, 0) + left_value * right_value
            if value:
                out[degree] = value
            elif degree in out:
                del out[degree]
    return out


def coefficient_product(left, right, target, zero):
    out = zero
    for left_degree, left_value in left.items():
        right_value = right.get(target - left_degree)
        if right_value is not None:
            out += left_value * right_value
    return out


def factor(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = add(ratios[index + 1], gaps[index])
    coefficients = [{0: one}]
    for ratio in ratios:
        coefficients.append(multiply(coefficients[-1], ratio))
    return coefficients


def statistics(polynomial):
    terms = negative = 0
    minimum = maximum = None
    first_negative = None
    for monomial, coefficient in polynomial.terms():
        value = int(coefficient)
        terms += 1
        negative += value < 0
        minimum = value if minimum is None else min(minimum, value)
        maximum = value if maximum is None else max(maximum, value)
        if value < 0 and first_negative is None:
            first_negative = {"monomial": list(map(int, monomial)), "coefficient": value}
    return {
        "terms": terms,
        "negative": negative,
        "minimum": minimum,
        "maximum": maximum,
        "first_negative": first_negative,
    }


def atomic_json(path, payload):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def construction():
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    variables = dict(zip(NAMES, context.gens()))
    zero = context.constant(0)
    one = context.constant(1)
    h = variables["h"]
    base = lambda value: {0: value}
    b5 = {1: one}
    left_gaps = [base(2 * h), {}, base(2 * h)]
    left_gaps.extend(base(h + variables[f"a{index}"]) for index in range(3, 8))
    right_gaps = [base(2 * h + variables["b0"])]
    right_gaps.extend(base(h + variables[f"b{index}"]) for index in range(1, 5))
    right_gaps.extend((add(base(h), b5), base(h), base(h)))
    left = factor(base(variables["ta"]), left_gaps, one)
    right = factor(base(variables["tb"]), right_gaps, one)
    rows = {}
    for rank in (7, 8, 9):
        row = {}
        for index in range(rank + 1):
            row = add(
                row,
                scale(multiply(left[index], right[rank - index]), math.comb(rank, index)),
            )
        rows[rank] = row
    kernel = add(scale(multiply(right[6], right[6]), 196), scale(multiply(right[5], right[7]), -168))
    target = scale(multiply(multiply(left[1], left[2]), kernel), h)
    return zero, h, rows, target


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    zero, h, rows, target = construction()
    maximum = max(max(row) for row in (*rows.values(), target))
    targets = list(range(1, maximum + 1))
    if args.resume and CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        slices = saved["slices"]
        completed = {row["b5_exponent"] for row in slices}
    else:
        slices = []
        completed = set()
    for exponent in targets:
        if exponent in completed:
            continue
        polynomial = coefficient_product(rows[8], rows[8], exponent, zero)
        polynomial -= coefficient_product(rows[7], rows[9], exponent, zero)
        polynomial -= h * coefficient_product(rows[7], rows[8], exponent, zero)
        polynomial -= target.get(exponent, zero)
        row = {"b5_exponent": exponent, **statistics(polynomial)}
        slices.append(row)
        checkpoint = {
            "status": "RUNNING_EXACT_B345_SLICED",
            "maximum_b5_exponent": maximum,
            "slices": slices,
            "immutable_inputs": actual,
            "source_sha256": sha256(Path(__file__)),
        }
        atomic_json(CHECKPOINT, checkpoint)
        print("SLICE", exponent, row, flush=True)
        if row["negative"]:
            payload = {
                "schema": "rank8-low-high-base-payment-b345-sliced-v1",
                "status": "B345_SLICE_COEFFICIENT_OBSTRUCTION_NOT_VALUE_COUNTEREXAMPLE",
                "failed_slice": row,
                "slices": slices,
                "immutable_inputs": actual,
                "source_sha256": sha256(Path(__file__)),
            }
            atomic_json(REPORT, payload)
            print(payload["status"])
            print("REPORT", sha256(REPORT))
            return 2
    payload = {
        "schema": "rank8-low-high-base-payment-b345-sliced-v1",
        "status": "PASS_EXACT_B345_HARD_LOW_COEFFICIENTWISE",
        "theorem": (
            "The base-payment polynomial is nonnegative on the cumulative-X hard-low "
            "face for arbitrary b3,b4,b5 with b6=b7=0."
        ),
        "b5_zero_input": actual,
        "maximum_b5_exponent": maximum,
        "slices": slices,
        "scope_warning": "a0,a2 mixed with b3..b5 still require a separate lift.",
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
