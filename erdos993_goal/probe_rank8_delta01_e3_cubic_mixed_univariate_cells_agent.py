#!/usr/bin/env python3
"""Low-memory exact probes for mixed short/long cubic e=3 cells.

Long coordinates use the sealed stable bases and their offsets collapse to a
single variable S.  Short coordinates are literal.  This module constructs
the exact rank-eight core/deletion polynomials and tests both the base values
and the extension increments after the order-n>=37 shift.  It is a diagnostic
and library for the forthcoming checkpointed scanner, not a global theorem.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
import time
from pathlib import Path

from flint import fmpq, fmpq_poly


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta01_e3_cubic_mixed_univariate_sample_probe_agent_20260823.json"
MAX_RANK = 8
RANKS = (0, 1)
X = fmpq_poly([0, 1])
ZERO = fmpq_poly([0])
ONE = fmpq_poly([1])
LONG_BASE = {
    "pendant": 8,
    "spine": 10,
    "incident": 9,
    "near": 8,
    "tail": 7,
}


def constant(value: int) -> fmpq_poly:
    return fmpq_poly([value])


def path_count(order: int | fmpq_poly, rank: int) -> fmpq_poly:
    if isinstance(order, int):
        if order == -1:
            return ONE if rank == 0 else ZERO
        if order <= -2:
            return ZERO
        top = order - rank + 1
        return constant(math.comb(top, rank) if top >= rank >= 0 else 0)
    value = ONE
    for index in range(rank):
        value *= order - rank + 1 - index
    return value / math.factorial(rank)


def path(order: int | fmpq_poly, max_rank: int = MAX_RANK):
    return [path_count(order, rank) for rank in range(max_rank + 1)]


def product(factors, max_rank: int = MAX_RANK):
    values = [ONE] + [ZERO] * max_rank
    for factor in factors:
        values = [
            sum((values[index] * factor[rank - index] for index in range(rank + 1)), ZERO)
            for rank in range(max_rank + 1)
        ]
    return values


def shifted(vector, amount: int):
    return [ZERO] * amount + vector[: MAX_RANK + 1 - amount]


def vector_sum(vectors):
    return [sum((vector[rank] for vector in vectors), ZERO) for rank in range(MAX_RANK + 1)]


def core(lengths):
    rows = []
    for left in (0, 1):
        for middle in (0, 1):
            for right in (0, 1):
                rows.append(shifted(product([
                    path(lengths["a1"] - left), path(lengths["a2"] - left),
                    path(lengths["m"] - middle),
                    path(lengths["b1"] - right), path(lengths["b2"] - right),
                    path(lengths["u"] - 1 - left - middle),
                    path(lengths["v"] - 1 - middle - right),
                ]), left + middle + right))
    return vector_sum(rows)


def deleted_outer_branch(lengths):
    rows = []
    for middle in (0, 1):
        for right in (0, 1):
            rows.append(shifted(product([
                path(lengths["a1"]), path(lengths["a2"]),
                path(lengths["u"] - 1 - middle), path(lengths["m"] - middle),
                path(lengths["v"] - 1 - middle - right),
                path(lengths["b1"] - right), path(lengths["b2"] - right),
            ]), middle + right))
    return vector_sum(rows)


def deleted_middle_branch(lengths):
    rows = []
    for left in (0, 1):
        for right in (0, 1):
            rows.append(shifted(product([
                path(lengths["m"]),
                path(lengths["a1"] - left), path(lengths["a2"] - left),
                path(lengths["u"] - 1 - left),
                path(lengths["b1"] - right), path(lengths["b2"] - right),
                path(lengths["v"] - 1 - right),
            ]), left + right))
    return vector_sum(rows)


def deleted_outer_leaf(lengths):
    rows = []
    for left in (0, 1):
        for middle in (0, 1):
            for right in (0, 1):
                rows.append(shifted(product([
                    path(lengths["a1"] - 1 - left), path(lengths["a2"] - left),
                    path(lengths["m"] - middle),
                    path(lengths["b1"] - right), path(lengths["b2"] - right),
                    path(lengths["u"] - 1 - left - middle),
                    path(lengths["v"] - 1 - middle - right),
                ]), left + middle + right))
    return vector_sum(rows)


def deleted_middle_leaf(lengths):
    rows = []
    for left in (0, 1):
        for middle in (0, 1):
            for right in (0, 1):
                rows.append(shifted(product([
                    path(lengths["a1"] - left), path(lengths["a2"] - left),
                    path(lengths["m"] - 1 - middle),
                    path(lengths["b1"] - right), path(lengths["b2"] - right),
                    path(lengths["u"] - 1 - left - middle),
                    path(lengths["v"] - 1 - middle - right),
                ]), left + middle + right))
    return vector_sum(rows)


def deleted_outer_pendant_internal(lengths):
    rows = []
    for left in (0, 1):
        for middle in (0, 1):
            for right in (0, 1):
                rows.append(shifted(product([
                    path(lengths["tail"]), path(lengths["near"] - left),
                    path(lengths["a2"] - left), path(lengths["m"] - middle),
                    path(lengths["b1"] - right), path(lengths["b2"] - right),
                    path(lengths["u"] - 1 - left - middle),
                    path(lengths["v"] - 1 - middle - right),
                ]), left + middle + right))
    return vector_sum(rows)


def deleted_middle_pendant_internal(lengths):
    rows = []
    for left in (0, 1):
        for middle in (0, 1):
            for right in (0, 1):
                rows.append(shifted(product([
                    path(lengths["tail"]), path(lengths["near"] - middle),
                    path(lengths["a1"] - left), path(lengths["a2"] - left),
                    path(lengths["b1"] - right), path(lengths["b2"] - right),
                    path(lengths["u"] - 1 - left - middle),
                    path(lengths["v"] - 1 - middle - right),
                ]), left + middle + right))
    return vector_sum(rows)


def deleted_spine_internal(lengths):
    rows = []
    for left in (0, 1):
        for middle in (0, 1):
            for right in (0, 1):
                rows.append(shifted(product([
                    path(lengths["near"] - left), path(lengths["tail"] - middle),
                    path(lengths["a1"] - left), path(lengths["a2"] - left),
                    path(lengths["m"] - middle),
                    path(lengths["b1"] - right), path(lengths["b2"] - right),
                    path(lengths["v"] - 1 - middle - right),
                ]), left + middle + right))
    return vector_sum(rows)


DELETED = {
    "outer_branch": deleted_outer_branch,
    "middle_branch": deleted_middle_branch,
    "outer_leaf": deleted_outer_leaf,
    "middle_leaf": deleted_middle_leaf,
    "outer_pendant_internal": deleted_outer_pendant_internal,
    "middle_pendant_internal": deleted_middle_pendant_internal,
    "spine_internal": deleted_spine_internal,
}


def residual(c, h, siblings: int):
    p7 = sum((math.comb(siblings, index) * c[7 - index] for index in range(8)), ZERO) + h[6]
    p8 = sum((math.comb(siblings, index) * c[8 - index] for index in range(9)), ZERO) + h[7]
    p9_open = sum((math.comb(siblings, index) * c[9 - index] for index in range(1, 10)), ZERO)
    return (
        8 * c[7] * h[6] * (16 * p8**2 - p7 * p8 - 18 * p7 * p9_open)
        - 8 * h[6] * p7 * (16 * c[8]**2 - c[7] * c[8])
        - 9 * c[7] * p7 * (14 * h[7]**2 - h[6] * h[7])
    )


def delta_values(c, h):
    first = residual(c, h, 1)
    return first, residual(c, h, 2) - first


def cell(label: str, raw_states: dict[str, int | str], threshold: int = 37):
    long_names = [name for name, value in raw_states.items() if isinstance(value, str)]
    assert long_names
    lengths = {}
    baseline_sum = 0
    for name, value in raw_states.items():
        if isinstance(value, str):
            base = LONG_BASE[value]
            lengths[name] = constant(base)
            baseline_sum += base
        else:
            lengths[name] = value
            baseline_sum += value
    order_constant = 2 if "pendant_internal" in label else 3 if label == "spine_internal" else 1
    baseline_order = baseline_sum + order_constant
    shift = max(0, threshold - baseline_order)
    lengths[long_names[0]] = lengths[long_names[0]] + X + shift

    if label == "outer_pendant_internal":
        core_lengths = {**lengths, "a1": lengths["near"] + lengths["tail"] + 1}
    elif label == "middle_pendant_internal":
        core_lengths = {**lengths, "m": lengths["near"] + lengths["tail"] + 1}
    elif label == "spine_internal":
        core_lengths = {**lengths, "u": lengths["near"] + lengths["tail"] + 2}
    else:
        core_lengths = lengths
    old_delta = delta_values(core(core_lengths), DELETED[label](lengths))
    increment = tuple(value(X + 1) - value for value in old_delta)
    return old_delta, increment, baseline_order, shift


def coefficient_stats(poly: fmpq_poly):
    coefficients = poly.coeffs()
    negatives = [(power, value) for power, value in enumerate(coefficients) if value < 0]
    return {
        "degree": poly.degree(),
        "terms": len(coefficients),
        "negative_coefficients": len(negatives),
        "minimum_coefficient": str(min(coefficients)),
        "constant_coefficient": str(coefficients[0]),
        "negative_terms": [{"power": power, "coefficient": str(value)} for power, value in negatives],
    }


def random_state(label: str, rng: random.Random):
    pendant = [*range(1, 8), "pendant"]
    spine = [*range(1, 10), "spine"]
    incident = [*range(1, 9), "incident"]
    near = [*range(0, 8), "near"]
    tail = [*range(0, 7), "tail"]
    if label in ("outer_branch", "middle_branch"):
        row = {name: rng.choice(pendant) for name in ("a1", "a2", "m", "b1", "b2")}
        row.update({name: rng.choice(spine) for name in ("u", "v")})
    elif label == "outer_leaf":
        row = {"a1": rng.choice(incident)}
        row.update({name: rng.choice(pendant) for name in ("a2", "m", "b1", "b2")})
        row.update({name: rng.choice(spine) for name in ("u", "v")})
    elif label == "middle_leaf":
        row = {"m": rng.choice(incident)}
        row.update({name: rng.choice(pendant) for name in ("a1", "a2", "b1", "b2")})
        row.update({name: rng.choice(spine) for name in ("u", "v")})
    elif label == "outer_pendant_internal":
        row = {"near": rng.choice(near), "tail": rng.choice(tail)}
        row.update({name: rng.choice(pendant) for name in ("a2", "m", "b1", "b2")})
        row.update({name: rng.choice(spine) for name in ("u", "v")})
    elif label == "middle_pendant_internal":
        row = {"near": rng.choice(near), "tail": rng.choice(tail)}
        row.update({name: rng.choice(pendant) for name in ("a1", "a2", "b1", "b2")})
        row.update({name: rng.choice(spine) for name in ("u", "v")})
    elif label == "spine_internal":
        row = {"near": rng.choice(near), "tail": rng.choice(near)}
        row.update({name: rng.choice(pendant) for name in ("a1", "a2", "m", "b1", "b2")})
        row["v"] = rng.choice(spine)
    else:
        raise ValueError(label)
    if not any(isinstance(value, str) for value in row.values()):
        row[next(iter(row))] = "near" if next(iter(row)) == "near" else "pendant"
    if all(isinstance(value, str) for value in row.values()):
        for name in row:
            if name not in ("near", "tail"):
                row[name] = 1
                break
    return row


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples-per-root", type=int, default=8)
    parser.add_argument("--seed", type=int, default=993)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    started = time.perf_counter()
    rows = []
    for label in DELETED:
        for index in range(args.samples_per_root):
            states = random_state(label, rng)
            base, increment, baseline, shift = cell(label, states)
            row = {
                "root_location_orbit": label,
                "sample": index,
                "states": states,
                "baseline_order": baseline,
                "order_shift": shift,
                "base_ranks": {str(rank): coefficient_stats(base[rank]) for rank in RANKS},
                "increment_ranks": {str(rank): coefficient_stats(increment[rank]) for rank in RANKS},
            }
            rows.append(row)
            print("CELL", label, index, row["increment_ranks"], flush=True)
    payload = {
        "schema": "rank8-delta01-e3-cubic-mixed-univariate-sample-probe-agent-v1",
        "status": "SAMPLE_PROBE_COMPLETE",
        "seed": args.seed,
        "samples_per_root": args.samples_per_root,
        "cells": rows,
        "totals": {
            "cells": len(rows),
            "base_negative_coefficients": sum(r["base_ranks"][str(k)]["negative_coefficients"] for r in rows for k in RANKS),
            "increment_negative_coefficients": sum(r["increment_ranks"][str(k)]["negative_coefficients"] for r in rows for k in RANKS),
        },
        "runtime_seconds": time.perf_counter() - started,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "scope_warning": "Random samples are diagnostics only and are not an exhaustive certificate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"], payload["totals"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", hashlib.sha256(OUTPUT.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
