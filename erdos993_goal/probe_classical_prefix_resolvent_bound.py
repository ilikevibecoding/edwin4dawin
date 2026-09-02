#!/usr/bin/env python3
"""Probe a fixed-order Jacobi-prefix resolvent certificate.

The unchanged leading block is the Jacobi matrix for shifted
P_n^(alpha,beta).  Its endpoint resolvent has the exact expansion

    m(t) = m_0 + m_1 t + ...,

where the first coefficients follow from the Taylor coefficients of
-pi_(n-1)(t)/pi_n(t).  If the prefix spectrum is at least 1/4, then

    m(t) <= sum_(j=0)^k m_j t^j + 4 m_k t^(k+1)/(1-4t).

This is a rational fixed-depth upper bound, independent of the order n.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import sympy as sp


HERE = Path(__file__).resolve().parent
R, U, V, C, T = sp.symbols("r u v c T")


def normalized_jacobi_coefficients(n: sp.Expr, alpha: sp.Expr, beta: sp.Expr, order: int):
    return [
        sp.cancel(
            (-1) ** j
            * sp.prod(n - h for h in range(j))
            / sp.factorial(j)
            * sp.rf(n + alpha + beta + 1, j)
            / sp.rf(alpha + 1, j)
        )
        for j in range(order + 1)
    ]


def resolvent_moments(parity: str, order: int) -> list[sp.Expr]:
    if parity == "odd":
        n, alpha, beta = R + 4, 2 * R, sp.Rational(1, 2)
    else:
        n, alpha, beta = R + 5, 2 * R + 1, sp.Rational(-1, 2)
    denominator = normalized_jacobi_coefficients(n, alpha, beta, order)
    numerator = normalized_jacobi_coefficients(n - 1, alpha, beta, order)
    ratio = [sp.S.One]
    for j in range(1, order + 1):
        ratio.append(
            sp.cancel(
                numerator[j]
                - sum(denominator[h] * ratio[j - h] for h in range(1, j + 1))
            )
        )
    m0 = sp.cancel(
        (2 * n + alpha + beta - 1)
        * (2 * n + alpha + beta)
        / ((n + alpha) * (n + alpha + beta))
    )
    return [sp.cancel(m0 * value) for value in ratio]


def load_tail_expressions(parity: str):
    local = {"r": R, "u": U, "v": V, "c": C}
    components = json.loads(
        (HERE / f"ground_deflated_tail_endpoint_{parity}_symbolic_components_20260806.json").read_text(
            encoding="utf-8"
        )
    )["records"][0]["target_expressions"]
    tail = json.loads(
        (HERE / f"one_sided_darboux_{parity}_tail_cache_20260806.json").read_text(
            encoding="utf-8"
        )
    )["current"]
    parse = lambda value: sp.sympify(value, locals=local)
    return (
        parse(components["endpoint_margin_at_zero_shift"]),
        parse(components["shift_slope_denominator"]),
        parse(components["current_last_cholesky_pivot"]),
        parse(tail["d_previous"]),
        parse(tail["d_last"]),
        parse(tail["terminal"]),
        parse(tail["b_previous"]),
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), default="odd")
    parser.add_argument("--order", type=int, default=8)
    parser.add_argument("--samples", type=int, default=500_000)
    parser.add_argument("--seed", type=int, default=993)
    args = parser.parse_args()
    moments = resolvent_moments(args.parity, args.order)
    g0, slope, q2, d_previous, d_last, terminal, b_previous = load_tail_expressions(
        args.parity
    )
    evaluate = sp.lambdify(
        (R, U, V, C),
        (g0, slope, q2, d_previous, d_last, terminal, b_previous),
        modules="numpy",
        cse=True,
    )
    evaluate_moments = sp.lambdify(R, moments, modules="numpy", cse=True)

    rng = np.random.default_rng(args.seed)
    minimum_r = 9 if args.parity == "odd" else 8
    r_values = np.floor(
        np.expm1(rng.uniform(np.log1p(minimum_r), np.log1p(1_000_000), args.samples))
    )
    u_values = rng.uniform(0.0, 0.45, args.samples)
    v_values = rng.uniform(0.0, 0.45, args.samples)
    c_values = np.expm1(
        rng.uniform(np.log1p(1e-10), np.log1p(3.0), args.samples)
    )
    g_values, slope_values, q2_values, d_previous_values, d_last_values, terminal_values, b_previous_values = evaluate(
        r_values, u_values, v_values, c_values
    )
    t_values = -q2_values * g_values / slope_values
    moment_values = evaluate_moments(r_values)
    upper_values = np.zeros_like(t_values)
    for j in range(args.order + 1):
        upper_values += moment_values[j] * t_values**j
    upper_values += (
        4
        * moment_values[-1]
        * t_values ** (args.order + 1)
        / (1 - 4 * t_values)
    )
    a_values = d_previous_values - t_values - b_previous_values * upper_values
    determinant_values = (d_last_values - t_values) * a_values - terminal_values
    finite = (
        np.isfinite(g_values)
        & np.isfinite(t_values)
        & np.isfinite(a_values)
        & np.isfinite(determinant_values)
    )
    chamber = finite & (g_values < 0.0) & (t_values > 0.0) & (t_values < 0.25)
    failures = chamber & ((a_values <= 0.0) | (determinant_values <= 0.0))

    def witness(mask: np.ndarray, objective: np.ndarray):
        indices = np.flatnonzero(mask)
        if not len(indices):
            return None
        index = int(indices[np.argmin(objective[indices])])
        return {
            "r": int(r_values[index]),
            "u": float(u_values[index]),
            "v": float(v_values[index]),
            "c": float(c_values[index]),
            "g0": float(g_values[index]),
            "threshold": float(t_values[index]),
            "a_bound": float(a_values[index]),
            "determinant_bound": float(determinant_values[index]),
        }

    report = {
        "status": "CLASSICAL_PREFIX_RESOLVENT_BOUND_PROBE",
        "parity": args.parity,
        "order": args.order,
        "samples": args.samples,
        "conditional_chamber": int(np.count_nonzero(chamber)),
        "failures": int(np.count_nonzero(failures)),
        "smallest_determinant_bound": witness(chamber, determinant_values),
        "smallest_a_bound": witness(chamber, a_values),
        "first_moments": [str(value) for value in moments],
    }
    output = HERE / f"classical_prefix_resolvent_bound_{args.parity}_probe_20260806.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "first_moments"}, indent=2))
    print(output)


if __name__ == "__main__":
    main()
