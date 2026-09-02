#!/usr/bin/env python3
"""Memory-bounded exact b3/b4 slices of the b5-compression E2 factor."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
CHECKPOINT = ROOT / "rank8_low_high_terminal_compression_b5_e2_b34_checkpoint_20260820.json"
REPORT = ROOT / "rank8_low_high_terminal_compression_b5_e2_b34_exact_20260820.json"
NAMES = (
    "h", "ta", "a0", "a2", "a3", "a4", "a5", "a6", "a7",
    "tb", "b0", "b1", "b2",
)
INPUTS = {
    "verify_rank8_low_high_base_payment_terminal_compression_b5.py":
        "4C4CF4BC145D2560012A0FC068E575186CC2E822C13BE3B8E0A1C9162EB8D9E3",
    "rank8_low_high_base_payment_terminal_compression_b5_e3_exact_20260820.json":
        "23F700444A3C4A74ADB98D4569002D348AAED44F144E6F66E55680AEC50230D4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add_map(left, right):
    out = dict(left)
    for key, value in right.items():
        prior = out.get(key)
        value = value if prior is None else prior + value
        if value:
            out[key] = value
        elif key in out:
            del out[key]
    return out


def multiply_map(left, right):
    out = {}
    for left_key, left_value in left.items():
        for right_key, right_value in right.items():
            key = (left_key[0] + right_key[0], left_key[1] + right_key[1])
            value = left_value * right_value
            prior = out.get(key)
            value = value if prior is None else prior + value
            if value:
                out[key] = value
            elif key in out:
                del out[key]
    return out


def scale_map(poly, multiplier):
    return {key: multiplier * value for key, value in poly.items()}


def factor(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = add_map(ratios[index + 1], gaps[index])
    rows = [{(0, 0): one}]
    for ratio in ratios:
        rows.append(multiply_map(rows[-1], ratio))
    return rows


def convolution(left, right, rank):
    out = {}
    for index in range(rank + 1):
        multiplier = math.comb(rank, index) * left[index]
        out = add_map(out, scale_map(right[rank - index], multiplier))
    return out


def coefficient_product(left, right, target, zero):
    out = zero
    for key, value in left.items():
        complement = (target[0] - key[0], target[1] - key[1])
        if min(complement) < 0:
            continue
        other = right.get(complement)
        if other is not None:
            out += value * other
    return out


def statistics(poly):
    terms = negative = 0
    minimum = maximum = None
    first_negative = None
    for monomial, coefficient in poly.terms():
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
    v = dict(zip(NAMES, context.gens()))
    zero, one = context.constant(0), context.constant(1)
    h, t = v["h"], v["tb"]

    def ordinary_factor(terminal, gaps):
        ratios = [None] * 9
        ratios[8] = terminal
        for index in range(7, -1, -1):
            ratios[index] = ratios[index + 1] + gaps[index]
        rows = [one]
        for ratio in ratios:
            rows.append(rows[-1] * ratio)
        return rows

    left = ordinary_factor(
        v["ta"],
        [2 * h + v["a0"], h, h + v["a2"]]
        + [h + v[f"a{index}"] for index in range(3, 8)],
    )
    base = lambda value: {(0, 0): value}
    right_gaps = [base(2 * h + v["b0"]), base(h + v["b1"]), base(h + v["b2"])]
    right_gaps.append(add_map(base(h), {(1, 0): one}))
    right_gaps.append(add_map(base(h), {(0, 1): one}))
    right_gaps.extend((base(h), base(h), base(h)))
    right = factor(base(t), right_gaps, one)

    c7 = convolution(left, right, 7)
    c8 = convolution(left, right, 8)
    a1, p2 = left[1], left[2]
    q6, q8 = right[6], right[8]
    A = scale_map(q6, 2 * t + 3 * h + 8 * a1)
    D = add_map(q8, scale_map(q6, t * (2 * t + 3 * h)))
    D = add_map(D, scale_map(q6, 9 * a1 * (2 * t + 3 * h) + 36 * p2))
    E = scale_map(q6, 3 * t + 3 * h + 9 * a1)
    return zero, h, c7, c8, q6, A, D, E


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    actual = {name: sha256(ROOT / name) for name in INPUTS}
    assert actual == INPUTS
    zero, h, c7, c8, q6, A, D, E = construction()
    tasks = [(e3, e4) for e3 in range(9) for e4 in range(11)]
    if args.resume and CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        assert saved["immutable_inputs"] == actual
        slices = saved["slices"]
    else:
        slices = []
    completed = {(row["b3_exponent"], row["b4_exponent"]) for row in slices}
    processed = 0
    for target in tasks:
        if target in completed:
            continue
        poly = coefficient_product(c7, E, target, zero)
        poly += coefficient_product(q6, D, target, zero)
        poly -= coefficient_product(A, A, target, zero)
        poly -= 2 * coefficient_product(c8, q6, target, zero)
        poly += h * coefficient_product(q6, add_map(c7, A), target, zero)
        row = {
            "b3_exponent": target[0],
            "b4_exponent": target[1],
            **statistics(poly),
        }
        slices.append(row)
        atomic_json(CHECKPOINT, {
            "status": "RUNNING_EXACT_B5_COMPRESSION_E2_B34_SLICES",
            "slices": slices,
            "immutable_inputs": actual,
            "source_sha256": sha256(Path(__file__)),
        })
        print("SLICE", target, row, flush=True)
        if row["negative"]:
            atomic_json(REPORT, {
                "schema": "rank8-low-high-b5-compression-e2-b34-v1",
                "status": "E2_B34_SLICE_COEFFICIENT_OBSTRUCTION_NOT_VALUE_COUNTEREXAMPLE",
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
    atomic_json(REPORT, {
        "schema": "rank8-low-high-b5-compression-e2-b34-v1",
        "status": "PASS_EXACT_B5_TERMINAL_COMPRESSION_E2",
        "identity": "P_actual-P_shifted=z*E1+z^2*E2+z^3*E3",
        "factor": "E2",
        "slices": slices,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    })
    print("PASS_EXACT_B5_TERMINAL_COMPRESSION_E2")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(REPORT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
