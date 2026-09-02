"""Fast numerical stress test of the far-left PF collision orientation.

The source-one roots are obtained directly from the shifted Jacobi row.  On
the interval to their left we evaluate the elementary-symmetric reduction
from ``verify_pf_length3_far_left_reduction.py`` without forming any large
window polynomial.  A hit of the PF minor cone is then tested against the
sign of the two collision derivatives.

This script is diagnostic only.  Passing samples are not a proof; a negative
derivative product would rigorously identify which proposed induction route
needs an exact counterexample replay.
"""

from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path

import numpy as np
from scipy.special import roots_jacobi


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_far_left_orientation_stress_20260807.json"


def elementary(values: np.ndarray, degree: int) -> np.ndarray:
    output = np.zeros(degree + 1, dtype=np.longdouble)
    output[0] = 1
    used = 0
    for value in values:
        used = min(used + 1, degree)
        for j in range(used, 0, -1):
            output[j] += value * output[j - 1]
    return output


def source_magnitudes(p: int, alpha: int) -> np.ndarray:
    degree = p // 2
    beta = -0.5 if p % 2 == 0 else 0.5
    nodes, _ = roots_jacobi(degree, alpha, beta)
    y = (1 - nodes) / 2
    return np.asarray(y / (4 * (1 - y)), dtype=np.longdouble)


def row_values(
    p: int,
    alpha: int,
    magnitudes: np.ndarray,
    z: np.longdouble,
    u: np.longdouble,
    v: np.longdouble,
) -> tuple[np.ndarray, np.ndarray]:
    # rho_i=-magnitudes_i and x=-z, so rho_i-x=z-magnitudes_i.
    reciprocal_gaps = 1 / (z - magnitudes)
    e = elementary(reciprocal_gaps, 8)
    eta = np.asarray(
        [
            (p + alpha - j) / ((p - 2 * j) * (p - 2 * j - 1))
            for j in range(8)
        ],
        dtype=np.longdouble,
    )
    kappa = np.ones(9, dtype=np.longdouble)
    for j in range(8):
        kappa[j + 1] = kappa[j] * eta[j]
    r = np.asarray(
        [kappa[j] * math.factorial(j) * e[j] for j in range(9)],
        dtype=np.longdouble,
    )
    sigma = reciprocal_gaps.sum()
    rz = np.asarray(
        [-sigma * r[j] + r[j + 1] / eta[j] for j in range(8)],
        dtype=np.longdouble,
    )
    s, q = u + v, u * v
    p_values = np.asarray(
        [r[j] - s * z * r[j + 1] + q * z * z * r[j + 2] for j in range(6)],
        dtype=np.longdouble,
    )
    pz = np.asarray(
        [
            rz[j]
            - s * (r[j + 1] + z * rz[j + 1])
            + q * (2 * z * r[j + 2] + z * z * rz[j + 2])
            for j in range(4)
        ],
        dtype=np.longdouble,
    )
    g = np.asarray([z**j * p_values[j] for j in range(4)], dtype=np.longdouble)
    gx = np.asarray(
        [
            -(j * z ** (j - 1) * p_values[j] + z**j * pz[j])
            for j in range(4)
        ],
        dtype=np.longdouble,
    )
    return g, gx


def sample_uv(rng: random.Random) -> tuple[np.longdouble, np.longdouble]:
    mode = rng.randrange(4)
    if mode == 0:
        u, v = rng.random(), rng.random()
    elif mode == 1:
        u, v = 10 ** rng.uniform(-5, -0.05), 1 - 10 ** rng.uniform(-5, -0.05)
    elif mode == 2:
        u, v = 10 ** rng.uniform(-5, 0), 10 ** rng.uniform(-5, 0)
    else:
        u, v = rng.betavariate(0.35, 0.35), rng.betavariate(0.35, 0.35)
    return np.longdouble(min(u, v)), np.longdouble(max(u, v))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=200_000)
    parser.add_argument("--max-r", type=int, default=200)
    parser.add_argument("--seed", type=int, default=993_1701)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    cache: dict[tuple[int, int], np.ndarray] = {}
    pf_hits = 0
    negative_hits = []
    closest_product = None
    representative = None

    for _ in range(args.samples):
        parity = rng.randrange(2)
        reserve_index = rng.randrange(args.max_r + 1)
        if parity == 0:
            p, alpha = 2 * reserve_index + 17, 2 * reserve_index
            parity_name = "odd"
        else:
            p, alpha = 2 * reserve_index + 18, 2 * reserve_index + 1
            parity_name = "even"
        key = (p, alpha)
        if key not in cache:
            cache[key] = source_magnitudes(p, alpha)
        magnitudes = cache[key]
        ground = magnitudes.max()
        # Resolve the near-edge region heavily, while still testing the far tail.
        relative = np.longdouble(10 ** rng.uniform(-7, 3))
        z = ground * (1 + relative)
        u, v = sample_uv(rng)
        g, gx = row_values(p, alpha, magnitudes, z, u, v)
        if not np.all(np.isfinite(g)) or not np.all(np.isfinite(gx)):
            continue
        scale = max(np.max(np.abs(g)), np.longdouble(1))
        gs = g / scale
        d0 = gs[1] * gs[1] - gs[0] * gs[2]
        d2 = gs[2] * gs[2] - gs[1] * gs[3]
        e = gs[0] * gs[3] - gs[1] * gs[2]
        minor_scale = max(abs(d0), abs(d2), abs(e), np.longdouble(1e-4900))
        d0, d2, e = d0 / minor_scale, d2 / minor_scale, e / minor_scale
        same = (d0 > 0 and d2 > 0 and e > 0) or (d0 < 0 and d2 < 0 and e < 0)
        h = e * e - 4 * d0 * d2
        tolerance = np.longdouble(2e-13) * max(abs(e * e), abs(4 * d0 * d2), 1)
        if not same or h < -tolerance:
            continue
        pf_hits += 1
        a = d2 * gx[0] + e * gx[1] + d0 * gx[2]
        b = d2 * gx[1] + e * gx[2] + d0 * gx[3]
        product_scale = max(abs(a) * abs(b), np.longdouble(1e-4900))
        product_sign = int(np.sign(a * b))
        normalized_product = float((a * b) / product_scale)
        record = {
            "parity": parity_name,
            "reserve_index": reserve_index,
            "p": p,
            "alpha": alpha,
            "u": float(u),
            "v": float(v),
            "z": float(z),
            "source_ground_magnitude": float(ground),
            "relative_distance": float(relative),
            "normalized_H": float(h),
            "derivative_product_sign": product_sign,
            "normalized_derivative_product": normalized_product,
        }
        if closest_product is None or abs(normalized_product) < closest_product:
            closest_product = abs(normalized_product)
            representative = record
        if product_sign <= 0:
            negative_hits.append(record)
            if len(negative_hits) >= 20:
                break

    report = {
        "status": (
            "NUMERICAL_PF_ORIENTATION_COUNTEREXAMPLE_CANDIDATE"
            if negative_hits
            else "NO_NUMERICAL_PF_ORIENTATION_FAILURE_FOUND"
        ),
        "scope": {
            "requested_samples": args.samples,
            "max_reserve_index": args.max_r,
            "seed": args.seed,
            "pf_cone_hits": pf_hits,
        },
        "negative_or_zero_derivative_product_hits": negative_hits,
        "closest_normalized_product_record": representative,
        "logical_status": "Numerical stress evidence only; every candidate requires exact replay.",
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "pf_hits": pf_hits, "failures": len(negative_hits)}, indent=2))


if __name__ == "__main__":
    main()
