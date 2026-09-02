#!/usr/bin/env python3
"""Probe the conditional third-moment margin in symmetric coordinates.

The tail expressions are symmetric in u,v.  Write s=u+v and q=uv, and
sample the exact q derivative of

    D^3 + Q2^3 * G0^3 * P3

on the chamber G0<0.  Only concise aggregate output is emitted.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import sympy as sp


HERE = Path(__file__).resolve().parent
R, U, V, C = sp.symbols("r u v c", nonnegative=True)
S, Q = sp.symbols("s q", nonnegative=True)


def symmetric_rational(expression: sp.Expr) -> sp.Expr:
    numerator, denominator = sp.fraction(sp.cancel(expression))

    def convert(polynomial: sp.Expr) -> sp.Expr:
        result, remainder, mapping = sp.symmetrize(polynomial, [U, V], formal=True)
        if remainder != 0:
            raise ValueError("expression is not symmetric in u,v")
        sigma1, sigma2 = mapping[0][0], mapping[1][0]
        return sp.expand(result.subs({sigma1: S, sigma2: Q}))

    return convert(numerator) / convert(denominator)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), default="odd")
    parser.add_argument("--samples", type=int, default=100_000)
    parser.add_argument("--seed", type=int, default=993)
    args = parser.parse_args()

    source = HERE / f"ground_deflated_tail_endpoint_{args.parity}_symbolic_components_20260806.json"
    raw = json.loads(source.read_text(encoding="utf-8"))["records"][0]["target_expressions"]
    local = {"r": R, "u": U, "v": V, "c": C}
    names = {
        "g": "endpoint_margin_at_zero_shift",
        "d": "shift_slope_denominator",
        "q2": "current_last_cholesky_pivot",
        "p3": "third_inverse_y_power_sum",
    }
    converted = {
        short: symmetric_rational(sp.sympify(raw[long], locals=local))
        for short, long in names.items()
    }
    margin = converted["d"] ** 3 + converted["q2"] ** 3 * converted["g"] ** 3 * converted["p3"]
    derivative = sp.diff(margin, Q)
    evaluate = sp.lambdify(
        (R, S, Q, C),
        (converted["g"], margin, derivative),
        modules="numpy",
        cse=True,
    )

    rng = np.random.default_rng(args.seed)
    # Log-uniform r and c cover the thin small-c chamber and large-order limit.
    r_values = np.expm1(rng.uniform(0.0, np.log1p(10_000.0), args.samples))
    s_values = rng.uniform(0.0, 2.0, args.samples)
    q_max = np.where(s_values <= 1.0, s_values * s_values / 4.0, s_values - 1.0)
    q_values = rng.uniform(0.0, 1.0, args.samples) * q_max
    c_values = np.expm1(rng.uniform(np.log1p(1e-10), np.log1p(1e8), args.samples))
    g_values, margin_values, derivative_values = evaluate(
        r_values, s_values, q_values, c_values
    )
    finite = np.isfinite(g_values) & np.isfinite(margin_values) & np.isfinite(derivative_values)
    chamber = finite & (g_values < 0.0)
    scale = np.maximum(1.0, np.abs(margin_values))
    tolerance = 2e-10 * scale
    positive = chamber & (derivative_values > tolerance)
    negative = chamber & (derivative_values < -tolerance)
    near_zero = chamber & ~(positive | negative)
    bad_margin = chamber & (margin_values < -tolerance)

    def witness(mask: np.ndarray, objective: np.ndarray, mode: str) -> dict[str, float] | None:
        indices = np.flatnonzero(mask)
        if not len(indices):
            return None
        local_index = int(np.argmin(objective[indices]) if mode == "min" else np.argmax(objective[indices]))
        index = int(indices[local_index])
        return {
            "r": float(r_values[index]),
            "s": float(s_values[index]),
            "q": float(q_values[index]),
            "c": float(c_values[index]),
            "g0": float(g_values[index]),
            "margin": float(margin_values[index]),
            "d_margin_dq": float(derivative_values[index]),
        }

    report = {
        "status": "SYMMETRIC_MOMENT_MARGIN_GEOMETRY_PROBE",
        "parity": args.parity,
        "samples": args.samples,
        "finite": int(np.count_nonzero(finite)),
        "conditional_chamber": int(np.count_nonzero(chamber)),
        "derivative_positive": int(np.count_nonzero(positive)),
        "derivative_negative": int(np.count_nonzero(negative)),
        "derivative_near_zero": int(np.count_nonzero(near_zero)),
        "negative_margin": int(np.count_nonzero(bad_margin)),
        "most_negative_derivative": witness(chamber, derivative_values, "min"),
        "most_positive_derivative": witness(chamber, derivative_values, "max"),
        "smallest_margin": witness(chamber, margin_values, "min"),
    }
    output = HERE / f"symmetric_moment_margin_geometry_{args.parity}_probe_20260806.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(output)


if __name__ == "__main__":
    main()
