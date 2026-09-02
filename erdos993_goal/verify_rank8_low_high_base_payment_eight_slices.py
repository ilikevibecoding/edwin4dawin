#!/usr/bin/env python3
"""Exact no-gap scan of the eight remaining low/high payment slices.

The positive pairwise-MLR circuit proves every (a0,a2) coefficient outside
the nine-term support of p1*p2 automatically.  The (0,0) support slice is
the completed b3,b4,b5 hard-low theorem.  This verifier keeps b3,b4 in the
coefficient ring, keeps b5 as a sliced exponent, and checks the remaining
eight (a0,a2) support pairs one at a time.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
CHECKPOINT = ROOT / "rank8_low_high_base_payment_eight_slices_checkpoint_20260820.json"
REPORT = ROOT / "rank8_low_high_base_payment_eight_slices_exact_20260820.json"
NAMES = (
    "h", "ta", "a3", "a4", "a5", "a6", "a7",
    "tb", "b0", "b1", "b2", "b3", "b4",
)
SUPPORT = ((0, 1), (0, 2), (0, 3), (1, 0), (1, 1), (1, 2), (2, 0), (2, 1))
INPUTS = {
    "verify_rank8_low_high_payment_support_reduction.py":
        "E85C3370EFB0B762F070DB3B25E431D1A7D63C7E8D258B176B4223046AE3E6A0",
    "rank8_low_high_payment_support_reduction_exact_20260820.json":
        "C6D432A394EED4D3C6F40D81C292733549DF258C0B59C4AD61B42D48455C888F",
    "verify_rank8_low_high_base_payment_b345_sliced.py":
        "FC2CA2C929F345D7D6E5147E9C32833291428632B421D76DA805E787A9D4EF00",
    "rank8_low_high_base_payment_b345_sliced_exact_20260820.json":
        "7DD2B2BC42D9C84FDBDD655D065CBC515A001FA4C2326A5E160CBF752942583C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def key_sum(left, right):
    if isinstance(left, tuple):
        return tuple(a + b for a, b in zip(left, right))
    return left + right


def add_map(left, right):
    out = dict(left)
    for key, value in right.items():
        combined = out.get(key)
        value = value if combined is None else combined + value
        if value:
            out[key] = value
        elif key in out:
            del out[key]
    return out


def multiply_map(left, right, cap=None):
    out = {}
    for left_key, left_value in left.items():
        for right_key, right_value in right.items():
            key = key_sum(left_key, right_key)
            if cap is not None:
                if isinstance(key, tuple):
                    if any(key[index] > cap[index] for index in range(len(key))):
                        continue
                elif key > cap:
                    continue
            value = left_value * right_value
            prior = out.get(key)
            value = value if prior is None else prior + value
            if value:
                out[key] = value
            elif key in out:
                del out[key]
    return out


def factor(terminal, gaps, zero_key, one, cap=None):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = add_map(ratios[index + 1], gaps[index])
    coefficients = [{zero_key: one}]
    for ratio in ratios:
        coefficients.append(multiply_map(coefficients[-1], ratio, cap=cap))
    return coefficients


def convolution(left, right, rank):
    out = {}
    for index in range(rank + 1):
        multiplier = math.comb(rank, index)
        for (e0, e2), left_value in left[index].items():
            for e5, right_value in right[rank - index].items():
                key = (e0, e2, e5)
                value = multiplier * left_value * right_value
                prior = out.get(key)
                value = value if prior is None else prior + value
                if value:
                    out[key] = value
                elif key in out:
                    del out[key]
    return out


def coefficient_product(left, right, target, zero):
    out = zero
    for key, value in left.items():
        complement = tuple(target[i] - key[i] for i in range(3))
        if min(complement) < 0:
            continue
        other = right.get(complement)
        if other is not None:
            out += value * other
    return out


def one_dimensional_product(left, right, target, zero):
    out = zero
    for degree, value in left.items():
        other = right.get(target - degree)
        if other is not None:
            out += value * other
    return out


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


def construction(low_cap):
    context = fmpz_mpoly_ctx.get(NAMES, "degrevlex")
    variables = dict(zip(NAMES, context.gens()))
    zero = context.constant(0)
    one = context.constant(1)
    h = variables["h"]

    low_base = lambda value: {(0, 0): value}
    left_gaps = [add_map(low_base(2 * h), {(1, 0): one}), low_base(h)]
    left_gaps.append(add_map(low_base(h), {(0, 1): one}))
    left_gaps.extend(low_base(h + variables[f"a{index}"]) for index in range(3, 8))
    left = factor(low_base(variables["ta"]), left_gaps, (0, 0), one, cap=low_cap)

    high_base = lambda value: {0: value}
    right_gaps = [high_base(2 * h + variables["b0"])]
    right_gaps.extend(high_base(h + variables[f"b{index}"]) for index in range(1, 5))
    right_gaps.append(add_map(high_base(h), {1: one}))
    right_gaps.extend((high_base(h), high_base(h)))
    right = factor(high_base(variables["tb"]), right_gaps, 0, one)

    rows = {rank: convolution(left, right, rank) for rank in (7, 8, 9)}
    p12 = multiply_map(left[1], left[2])
    return zero, h, left, right, rows, p12


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--only-low")
    args = parser.parse_args()
    actual = {name: sha256(ROOT / name) for name in INPUTS}
    assert actual == INPUTS
    maximum = 12
    if args.only_low:
        selected = tuple(map(int, args.only_low.split(",")))
        if selected not in SUPPORT:
            raise SystemExit("--only-low must be one of the eight support pairs")
        selected_lows = (selected,)
    else:
        selected_lows = SUPPORT
    if args.resume and CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        slices = saved["slices"]
        completed = {(tuple(row["a0_a2_exponents"]), row["b5_exponent"]) for row in slices}
    else:
        slices = []
        completed = set()

    processed = 0
    for low in selected_lows:
        # Rebuild only the low exponents that can contribute to this support
        # pair.  This reduces the live coefficient map by roughly an order of
        # magnitude compared with carrying every a0/a2 exponent at once.
        zero, h, _, right, rows, p12 = construction(low)
        for e5 in range(maximum + 1):
            if (low, e5) in completed:
                continue
            target = (*low, e5)
            polynomial = coefficient_product(rows[8], rows[8], target, zero)
            polynomial -= coefficient_product(rows[7], rows[9], target, zero)
            polynomial -= h * coefficient_product(rows[7], rows[8], target, zero)
            kernel = 196 * one_dimensional_product(right[6], right[6], e5, zero)
            kernel -= 168 * one_dimensional_product(right[5], right[7], e5, zero)
            target_left = p12.get(low)
            if target_left is not None:
                polynomial -= h * target_left * kernel
            row = {
                "a0_a2_exponents": list(low),
                "b5_exponent": e5,
                **statistics(polynomial),
            }
            slices.append(row)
            atomic_json(CHECKPOINT, {
                "status": "RUNNING_EXACT_EIGHT_LOW_SUPPORT_SLICES",
                "maximum_b5_exponent": maximum,
                "slices": slices,
                "immutable_inputs": actual,
                "source_sha256": sha256(Path(__file__)),
            })
            print("SLICE", low, e5, row, flush=True)
            if row["negative"]:
                atomic_json(REPORT, {
                    "schema": "rank8-low-high-base-payment-eight-slices-v1",
                    "status": "LOW_SUPPORT_SLICE_COEFFICIENT_OBSTRUCTION_NOT_VALUE_COUNTEREXAMPLE",
                    "failed_slice": row,
                    "slices": slices,
                    "immutable_inputs": actual,
                    "source_sha256": sha256(Path(__file__)),
                })
                return 2
            processed += 1
            if args.limit is not None and processed >= args.limit:
                print("STOPPED_AT_REQUESTED_LIMIT", processed)
                return 3

    expected = {(low, e5) for low in SUPPORT for e5 in range(maximum + 1)}
    completed = {(tuple(row["a0_a2_exponents"]), row["b5_exponent"]) for row in slices}
    if completed != expected:
        print("PARTIAL_SUPPORT_COVERAGE", len(completed), "OF", len(expected))
        return 3

    atomic_json(REPORT, {
        "schema": "rank8-low-high-base-payment-eight-slices-v1",
        "status": "PASS_EXACT_EIGHT_LOW_SUPPORT_SLICES_B345",
        "theorem": (
            "Together with the positive-MLR support reduction and the hard-low "
            "slice, the base-payment polynomial is nonnegative for arbitrary "
            "a0,a2,b3,b4,b5 when b6=b7=0."
        ),
        "support_pairs": [list(pair) for pair in SUPPORT],
        "maximum_b5_exponent": maximum,
        "slices": slices,
        "immutable_inputs": actual,
        "scope_warning": "Corrected terminal compression is a separate dependency for b6,b7.",
        "source_sha256": sha256(Path(__file__)),
    })
    print("PASS_EXACT_EIGHT_LOW_SUPPORT_SLICES_B345")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(REPORT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
