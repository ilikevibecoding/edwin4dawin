#!/usr/bin/env python3
"""Floating locator for the outer-rooted Galvin terminal payment.

This is reconnaissance only.  It evaluates normalized coefficient
distributions near the prefix boundary for

    m = round(c * (3/2)^t)

using FFT polynomial powers.  Any prospective failure or extremum must
be replayed with exact integers.
"""

from __future__ import annotations

import argparse
import math

import numpy as np


def normalize(values: np.ndarray) -> np.ndarray:
    values = np.asarray(values, dtype=np.float64)
    values[np.abs(values) < 1e-300] = 0.0
    values[values < 0.0] = 0.0
    total = float(values.sum())
    if not math.isfinite(total) or total <= 0.0:
        raise ArithmeticError("lost coefficient mass")
    return values / total


def multiply(left: np.ndarray, right: np.ndarray) -> np.ndarray:
    length = len(left) + len(right) - 1
    fft_length = 1 << (length - 1).bit_length()
    product = np.fft.irfft(
        np.fft.rfft(left, fft_length)
        * np.fft.rfft(right, fft_length),
        fft_length,
    )[:length]
    return normalize(product)


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


def rooted_distributions(t: int, m: int) -> tuple[np.ndarray, np.ndarray]:
    e_values = np.asarray(
        [math.comb(t, k) * (2.0**k) for k in range(t + 1)]
        + [0.0]
    )
    short = np.asarray(
        [0.0] + [float(math.comb(t, k)) for k in range(t + 1)]
    )
    a_values = e_values + short
    a_power = power_distribution(a_values, m)

    e_power = power_distribution(e_values, m)
    shifted_e = np.concatenate((np.asarray([0.0]), e_power))

    log_a_over_e = m * math.log1p((2.0 / 3.0) ** t)
    if log_a_over_e > 700:
        e_weight = 0.0
    else:
        e_weight = 1.0 / (1.0 + math.exp(log_a_over_e))
    a_weight = 1.0 - e_weight

    degree = max(len(a_power), len(shifted_e))
    if len(a_power) < degree:
        a_power = np.pad(a_power, (0, degree - len(a_power)))
    if len(shifted_e) < degree:
        shifted_e = np.pad(
            shifted_e, (0, degree - len(shifted_e))
        )
    root_deleted = a_weight * a_power
    rooted_tree = root_deleted + e_weight * shifted_e
    return rooted_tree, root_deleted


def coefficient(values: np.ndarray, rank: int) -> float:
    return float(values[rank]) if 0 <= rank < len(values) else 0.0


def profile(t: int, m: int, offset: int) -> dict | None:
    rooted_tree, root_deleted = rooted_distributions(t, m)
    alpha_terminal = m * (t + 1) + 1
    cutoff = (2 * alpha_terminal + 1) // 3
    r = cutoff - offset
    if r < 1:
        return None

    bm = coefficient(rooted_tree, r - 1)
    b = coefficient(rooted_tree, r)
    bp = coefficient(rooted_tree, r + 1)
    cm = coefficient(root_deleted, r - 1)
    c = coefficient(root_deleted, r)
    if min(bm, b) <= 0:
        return None

    cross = b * c - bp * cm
    gsb = r * b * b + bm * b - (r + 1) * bm * bp
    a_clear = 2 * b * b + b * cm + (r + 1) * cross
    lambda_clear = 2 * b * b + b * cm + 2 * (r + 1) * cross
    if min(a_clear, lambda_clear) <= 0:
        return None
    mean_clear = bm * a_clear - (b + cm) * gsb
    payment_den = b * b * bm * (b + cm + bm) * lambda_clear
    payment_ratio = mean_clear * mean_clear / payment_den
    x_value = (b + cm) * gsb / (bm * a_clear)
    s_value = (
        bm
        * a_clear
        * a_clear
        / (b * b * (b + cm + bm) * lambda_clear)
    )
    return {
        "t": t,
        "m": m,
        "scaled_m": m * ((2.0 / 3.0) ** t),
        "order": 1 + m * (1 + 2 * t),
        "rank_r": r,
        "offset": offset,
        "x": x_value,
        "s": s_value,
        "payment_ratio": payment_ratio,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--t-min", type=int, default=8)
    ap.add_argument("--t-max", type=int, default=20)
    ap.add_argument("--c-min", type=float, default=0.1)
    ap.add_argument("--c-max", type=float, default=4.0)
    ap.add_argument("--c-step", type=float, default=0.05)
    ap.add_argument("--offset-min", type=int, default=2)
    ap.add_argument("--offset-max", type=int, default=4)
    args = ap.parse_args()

    global_best = None
    for t in range(args.t_min, args.t_max + 1):
        local = None
        c_parameter = args.c_min
        seen = set()
        while c_parameter <= args.c_max + args.c_step / 2:
            m = max(1, round(c_parameter * (1.5**t)))
            c_parameter += args.c_step
            if m in seen:
                continue
            seen.add(m)
            for offset in range(
                args.offset_min, args.offset_max + 1
            ):
                item = profile(t, m, offset)
                if item is None:
                    continue
                if (
                    local is None
                    or item["payment_ratio"] > local["payment_ratio"]
                ):
                    local = item
                if (
                    global_best is None
                    or item["payment_ratio"]
                    > global_best["payment_ratio"]
                ):
                    global_best = item
        assert local is not None
        print(
            f"t={t}: ratio={local['payment_ratio']:.12f} "
            f"m={local['m']} c={local['scaled_m']:.6f} "
            f"r={local['rank_r']} offset={local['offset']} "
            f"x={local['x']:.9f} s={local['s']:.9f}",
            flush=True,
        )
    print("global:", global_best)


if __name__ == "__main__":
    main()
