#!/usr/bin/env python3
"""Fast floating-point reconnaissance for scaled Galvin forest factors.

The exact FLINT scan is authoritative but expensive at the natural scaling
``m = Theta((3/2)^t)``.  This script works with coefficient distributions
normalized at x=1 and uses FFT exponentiation.  It is only a locator for
parameter pairs that must subsequently be checked by
``forest_factor_galvin_search.py``.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
from scipy.signal import fftconvolve
from scipy.stats import binom

from forest_factor_galvin_search import STRONG_LC_32
from verify_perfect_matching_lc_failure import decorated_polynomial


def normalize(values: np.ndarray) -> np.ndarray:
    values = np.asarray(values, dtype=np.float64)
    values[np.abs(values) < 1e-300] = 0.0
    values[values < 0.0] = 0.0
    total = float(values.sum())
    if not math.isfinite(total) or total <= 0.0:
        raise ArithmeticError("lost coefficient mass")
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


def galvin_distribution(t: int, m: int) -> np.ndarray:
    # S=(1+2x)^t+x(1+x)^t and Q=(1+2x)^t.
    q_coeff = np.asarray(
        [math.comb(t, k) * (2.0**k) for k in range(t + 1)]
        + [0.0]
    )
    short = np.asarray([0.0] + [float(math.comb(t, k)) for k in range(t + 1)])
    s_coeff = q_coeff + short
    s_power = power_distribution(s_coeff, m)

    q_degree = t * m
    q_power = binom.pmf(np.arange(q_degree + 1), q_degree, 2.0 / 3.0)
    q_power = np.concatenate((np.asarray([0.0]), normalize(q_power)))

    log_ratio = m * math.log1p((2.0 / 3.0) ** t)
    q_weight = 1.0 / (1.0 + math.exp(log_ratio))
    s_weight = 1.0 - q_weight
    if len(s_power) < len(q_power):
        s_power = np.pad(s_power, (0, len(q_power) - len(s_power)))
    elif len(q_power) < len(s_power):
        q_power = np.pad(q_power, (0, len(s_power) - len(q_power)))
    return normalize(s_weight * s_power + q_weight * q_power)


def profile(values: np.ndarray) -> dict:
    mode = int(np.argmax(values))
    cutoff = float(values[mode]) * 1e-14
    best_ratio = -1.0
    best_index = -1
    first_reascent = None
    # A nearly tied first step down from the mode is not a rebound.  Score
    # only later steps, matching ``rebound_profile`` in the exact search.
    for k in range(mode + 1, len(values) - 1):
        if values[k] <= cutoff or values[k + 1] <= cutoff:
            continue
        ratio = float(values[k + 1] / values[k])
        if ratio > best_ratio:
            best_ratio = ratio
            best_index = k
        if first_reascent is None and ratio > 1.0 + 2e-10:
            first_reascent = k
    return {
        "mode": mode,
        "best_post_mode_ratio": best_ratio,
        "best_index": best_index,
        "numerical_reascent": first_reascent,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--t-min", type=int, default=12)
    parser.add_argument("--t-max", type=int, default=20)
    parser.add_argument("--c-min", type=float, default=1.0)
    parser.add_argument("--c-max", type=float, default=6.0)
    parser.add_argument("--c-step", type=float, default=0.1)
    parser.add_argument(
        "--base",
        choices=("perfect_matching_102", "strong_lc_32"),
        default="perfect_matching_102",
    )
    parser.add_argument(
        "--output", type=Path, default=Path("galvin_scaled_float_scan.json")
    )
    args = parser.parse_args()

    fixed_coefficients = (
        decorated_polynomial()
        if args.base == "perfect_matching_102"
        else STRONG_LC_32
    )
    fixed = normalize(np.asarray(fixed_coefficients, dtype=np.float64))
    champion = None
    records = []
    for t in range(args.t_min, args.t_max + 1):
        c = args.c_min
        local = None
        while c <= args.c_max + 0.5 * args.c_step:
            m = max(1, round(c * (1.5**t)))
            factor = galvin_distribution(t, m)
            forest = multiply(fixed, factor)
            result = {
                "t": t,
                "m": m,
                "scaled_m": m * ((2.0 / 3.0) ** t),
                "forest_degree": len(forest) - 1,
                **profile(forest),
            }
            if (
                local is None
                or result["best_post_mode_ratio"]
                > local["best_post_mode_ratio"]
            ):
                local = result
            if (
                champion is None
                or result["best_post_mode_ratio"]
                > champion["best_post_mode_ratio"]
            ):
                champion = result
            c += args.c_step
        assert local is not None
        records.append(local)
        print(
            f"t={t} m={local['m']} c={local['scaled_m']:.4f} "
            f"ratio={local['best_post_mode_ratio']:.12f} "
            f"index={local['best_index']}",
            flush=True,
        )

    payload = {
        "status": "floating_reconnaissance_only",
        "parameters": {
            "t": [args.t_min, args.t_max],
            "c": [args.c_min, args.c_max, args.c_step],
            "base": args.base,
        },
        "champion": champion,
        "best_by_t": records,
    }
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps({"champion": champion}, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
