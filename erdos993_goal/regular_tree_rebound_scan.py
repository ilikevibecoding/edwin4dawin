#!/usr/bin/env python3
"""Search complete d-ary trees for a nonunimodal independence sequence.

At hard-core fugacity 1, sufficiently high branching lies in the
non-uniqueness regime on the infinite regular tree.  Deep finite trees can
therefore exhibit competing even/odd boundary phases far beyond the order
range accessible to unlabeled enumeration or local edge-swap searches.

For a complete d-ary rooted tree of height h, recursively write

    U_h = A_{h-1}^d,
    D_h = x U_{h-1}^d,
    A_h = U_h + D_h,

with A_0=1+x and U_0=1.  This script propagates normalized coefficient
distributions by FFT together with log partition functions, then checks for
a coefficient reascent after the first descent.  Floating point is only a
locator.  A numerical witness must be replayed with exact arithmetic before
it is a counterexample.
"""

from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path

import numpy as np
from scipy.signal import fftconvolve


def normalize(values: np.ndarray) -> np.ndarray:
    values = np.asarray(values, dtype=np.float64)
    values[np.abs(values) < 1e-300] = 0.0
    values[values < 0.0] = 0.0
    total = float(values.sum())
    if not math.isfinite(total) or total <= 0.0:
        raise ArithmeticError("coefficient distribution lost its mass")
    return values / total


def multiply(left: np.ndarray, right: np.ndarray) -> np.ndarray:
    return normalize(fftconvolve(left, right))


def power_distribution(base: np.ndarray, exponent: int) -> np.ndarray:
    result = np.asarray([1.0])
    factor = normalize(base)
    power = exponent
    while power:
        if power & 1:
            result = multiply(result, factor)
        power >>= 1
        if power:
            factor = multiply(factor, factor)
    return result


def aligned_mixture(
    left: np.ndarray,
    left_log_weight: float,
    right: np.ndarray,
    right_log_weight: float,
) -> tuple[np.ndarray, float, tuple[float, float]]:
    length = max(len(left), len(right))
    left = np.pad(left, (0, length - len(left)))
    right = np.pad(right, (0, length - len(right)))
    maximum = max(left_log_weight, right_log_weight)
    lw = math.exp(left_log_weight - maximum)
    rw = math.exp(right_log_weight - maximum)
    total = lw + rw
    weights = (lw / total, rw / total)
    return (
        normalize(weights[0] * left + weights[1] * right),
        maximum + math.log(total),
        weights,
    )


def profile(values: np.ndarray, tolerance: float) -> dict:
    positive = np.flatnonzero(values > max(values) * 1e-14)
    lo = int(positive[0]) if len(positive) else 0
    hi = int(positive[-1]) if len(positive) else len(values) - 1
    first_descent = None
    first_reascent = None
    best_post_descent_ratio = -1.0
    best_index = None
    for k in range(lo, hi):
        if first_descent is None and values[k + 1] < values[k]:
            first_descent = k
            continue
        if first_descent is not None:
            ratio = float(values[k + 1] / values[k])
            if ratio > best_post_descent_ratio:
                best_post_descent_ratio = ratio
                best_index = k
            if first_reascent is None and ratio > 1.0 + tolerance:
                first_reascent = k
    mode = int(np.argmax(values))
    return {
        "degree": len(values) - 1,
        "trusted_profile_interval": [lo, hi],
        "mode": mode,
        "first_descent": first_descent,
        "first_reascent": first_reascent,
        "best_post_descent_ratio": best_post_descent_ratio,
        "best_index": best_index,
        "mode_probability": float(values[mode]),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--d-min", type=int, default=2)
    parser.add_argument("--d-max", type=int, default=12)
    parser.add_argument("--height-max", type=int, default=12)
    parser.add_argument("--degree-max", type=int, default=500_000)
    parser.add_argument("--tolerance", type=float, default=1e-9)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    records = []
    numerical_witness = None
    champion = None

    for d in range(args.d_min, args.d_max + 1):
        a_distribution = np.asarray([0.5, 0.5])
        u_distribution = np.asarray([1.0])
        log_a = math.log(2.0)
        log_u = 0.0
        order = 1

        for height in range(1, args.height_max + 1):
            new_order = 1 + d * order
            new_u = power_distribution(a_distribution, d)
            new_log_u = d * log_a
            d_distribution = np.concatenate(
                (np.asarray([0.0]), power_distribution(u_distribution, d))
            )
            d_log_weight = d * log_u
            new_a, new_log_a, phase_weights = aligned_mixture(
                new_u,
                new_log_u,
                d_distribution,
                d_log_weight,
            )
            if len(new_a) - 1 > args.degree_max:
                break

            result = {
                "branching": d,
                "height": height,
                "order": new_order,
                "phase_weights_root_excluded_included": phase_weights,
                **profile(new_a, args.tolerance),
            }
            records.append(result)
            if (
                champion is None
                or result["best_post_descent_ratio"]
                > champion["best_post_descent_ratio"]
            ):
                champion = result
            print(
                f"d={d} h={height} n={new_order:,} "
                f"degree={result['degree']:,} mode={result['mode']:,} "
                f"post-ratio={result['best_post_descent_ratio']:.12f} "
                f"reascent={result['first_reascent']} "
                f"phase={phase_weights[1]:.6g}",
                flush=True,
            )
            if result["first_reascent"] is not None:
                numerical_witness = result
                break

            order = new_order
            a_distribution, u_distribution = new_a, new_u
            log_a, log_u = new_log_a, new_log_u
        if numerical_witness is not None:
            break

    report = {
        "status": (
            "NUMERICAL_REASCENT_REQUIRES_EXACT_REPLAY"
            if numerical_witness
            else "NO_NUMERICAL_REASCENT"
        ),
        "floating_point_locator_only": True,
        "parameters": vars(args) | {"output": str(args.output)},
        "records": records,
        "champion": champion,
        "numerical_witness": numerical_witness,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "champion": champion,
                "numerical_witness": numerical_witness,
                "elapsed_seconds": report["elapsed_seconds"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if numerical_witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
