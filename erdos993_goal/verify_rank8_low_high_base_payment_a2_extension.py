#!/usr/bin/env python3
"""Checkpointed exact a2-extension of the base-payment theorem.

The coefficient ring keeps the full cumulative-X hard variables.  The two
off-face slacks a0 and a2 are represented by a tiny bivariate exponent map,
so one exact coefficient slice is materialised at a time.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx


ROOT = Path(__file__).resolve().parent
CHECKPOINT = ROOT / "rank8_low_high_base_payment_a2_extension_checkpoint_20260820.json"
REPORT = ROOT / "rank8_low_high_base_payment_a2_extension_exact_20260820.json"
NAMES = ("h", "ta", "a3", "a4", "a5", "a6", "a7", "tb", "b0", "b1", "b2")
EXPECTED = {
    "verify_rank8_low_high_base_payment_hard_face_amgm.py":
        "8D95452625F2458EE9942A39FD6B7FB93FA62F93B216670C8B802CAE19DEE572",
    "rank8_low_high_base_payment_hard_face_amgm_exact_20260820.json":
        "61A48385D356468133A1D08BDD2D585D28D0B027565ACF7207C467445DF0A6B6",
    "verify_rank8_low_high_base_payment_a0_extension.py":
        "966122844EE01DD8ACD263C41321805EC252AF5CB57E677AA3FAFE6572BA9EC4",
    "rank8_low_high_base_payment_a0_extension_exact_20260820.json":
        "714546657253E1864FE559CAE190B5B1AB168E422ED2422980E18D9DDA5A5587",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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
    return {key: multiplier * value for key, value in poly.items()} if multiplier else {}


def multiply(left, right):
    out = {}
    for (a0, a2), left_value in left.items():
        for (b0, b2), right_value in right.items():
            key = (a0 + b0, a2 + b2)
            value = left_value * right_value
            if key in out:
                value += out[key]
            if value:
                out[key] = value
            elif key in out:
                del out[key]
    return out


def coefficient_product(left, right, target, zero):
    out = zero
    for left_key, left_value in left.items():
        right_key = (target[0] - left_key[0], target[1] - left_key[1])
        if min(right_key) < 0:
            continue
        right_value = right.get(right_key)
        if right_value is not None:
            out += left_value * right_value
    return out


def factor(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    coefficients = [one]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def stats(polynomial):
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
    left_gaps = [2 * h, h, h]
    left_gaps.extend(h + variables[f"a{index}"] for index in range(3, 8))
    right_gaps = [2 * h + variables["b0"]]
    right_gaps.extend(h + variables[f"b{index}"] for index in range(1, 3))
    right_gaps.extend([h] * 5)
    left_ratios, _ = factor(variables["ta"], left_gaps, one)
    _, right = factor(variables["tb"], right_gaps, one)

    # Ratio maps in (a0 exponent, a2 exponent).  The a2 gap raises A0,A1,A2;
    # a0 raises A0 only.
    ratio_maps = []
    for index, base in enumerate(left_ratios):
        item = {(0, 0): base}
        if index <= 2:
            item[(0, 1)] = one
        if index == 0:
            item[(1, 0)] = one
        ratio_maps.append(item)
    left = [{(0, 0): one}]
    for ratio in ratio_maps:
        left.append(multiply(left[-1], ratio))

    c = {}
    for rank in (7, 8, 9):
        row = {}
        for index in range(rank + 1):
            row = add(
                row,
                scale(left[index], math.comb(rank, index) * right[rank - index]),
            )
        c[rank] = row
    clear_kernel = 196 * right[6] ** 2 - 168 * right[5] * right[7]
    target = scale(multiply(left[1], left[2]), h * clear_kernel)
    return context, zero, c, target


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    context, zero, c, target = construction()
    targets = [(a0, a2) for a2 in range(1, 7) for a0 in range(3)]
    if args.resume and CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        rows = saved["slices"]
        completed = {tuple(row["exponents_a0_a2"]) for row in rows}
    else:
        rows = []
        completed = set()
    for key in targets:
        if key in completed:
            continue
        polynomial = coefficient_product(c[8], c[8], key, zero)
        polynomial -= coefficient_product(c[7], c[9], key, zero)
        polynomial -= variables_h(context) * coefficient_product(c[7], c[8], key, zero)
        polynomial -= target.get(key, zero)
        row = {"exponents_a0_a2": list(key), **stats(polynomial)}
        rows.append(row)
        checkpoint = {
            "status": "RUNNING_EXACT_A2_EXTENSION",
            "slices": rows,
            "immutable_inputs": actual,
            "source_sha256": sha256(Path(__file__)),
        }
        atomic_json(CHECKPOINT, checkpoint)
        print("SLICE", key, row, flush=True)
        if row["negative"]:
            payload = {
                "schema": "rank8-low-high-base-payment-a2-extension-v1",
                "status": "EXACT_COEFFIC_ENCLOSURE_OBSTRUCTION_NOT_VALUE_COUNTEREXAMPLE",
                "failed_slice": row,
                "slices": rows,
                "immutable_inputs": actual,
                "scope_warning": "A negative coefficient is not a negative cone value.",
                "source_sha256": sha256(Path(__file__)),
            }
            atomic_json(REPORT, payload)
            print(payload["status"])
            print("REPORT", sha256(REPORT))
            return
    payload = {
        "schema": "rank8-low-high-base-payment-a2-extension-v1",
        "status": "PASS_EXACT_A2_EXTENSION_WITH_A0_ARBITRARY",
        "identity": "all coefficients with a2 exponent >=1 are nonnegative for a0 exponents 0..2",
        "slices": rows,
        "immutable_inputs": actual,
        "scope_warning": "This leaves only high-tail slacks b3..b7 off the base-payment cone.",
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


def variables_h(context):
    return list(context.gens())[NAMES.index("h")]


if __name__ == "__main__":
    main()
