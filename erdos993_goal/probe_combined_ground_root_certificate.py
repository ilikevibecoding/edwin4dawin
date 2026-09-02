#!/usr/bin/env python3
"""Probe complementary finite certificates for tau >= T.

Certificate A is the third inverse-y moment bound.
Certificate B is a continued-fraction invariant: if M is the endpoint
resolvent ceiling needed for the final 2x2 Schur determinant, and

    d_k - T - b_k M - 1/M >= 0

at the final classical row, monotonicity in k should propagate the ceiling
through the whole classical prefix.  This probe tests whether A or B always
covers the conditional chamber g0<0.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import sympy as sp


HERE = Path(__file__).resolve().parent
R, U, V, C = sp.symbols("r u v c")


def expressions(parity: str):
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
    g0 = parse(components["endpoint_margin_at_zero_shift"])
    slope = parse(components["shift_slope_denominator"])
    q2 = parse(components["current_last_cholesky_pivot"])
    p3 = parse(components["third_inverse_y_power_sum"])
    d_previous = parse(tail["d_previous"])
    d_last = parse(tail["d_last"])
    terminal = parse(tail["terminal"])
    b_previous = parse(tail["b_previous"])
    if parity == "odd":
        n, alpha, beta = R + 4, 2 * R, sp.Rational(1, 2)
    else:
        n, alpha, beta = R + 5, 2 * R + 1, sp.Rational(-1, 2)
    k = n - 1
    classical_diagonal = sp.cancel(
        (
            alpha**2
            + alpha * beta
            + 2 * alpha * k
            + alpha
            + 2 * beta * k
            + beta
            + 2 * k**2
            + 2 * k
        )
        / ((alpha + beta + 2 * k) * (alpha + beta + 2 * k + 2))
    )
    classical_subdiagonal = sp.cancel(
        k
        * (alpha + k)
        * (beta + k)
        * (alpha + beta + k)
        / (
            (alpha + beta + 2 * k) ** 2
            * (alpha + beta + 2 * k - 1)
            * (alpha + beta + 2 * k + 1)
        )
    )
    return (
        g0,
        slope,
        q2,
        p3,
        d_previous,
        d_last,
        terminal,
        b_previous,
        classical_diagonal,
        classical_subdiagonal,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), default="odd")
    parser.add_argument("--samples", type=int, default=1_000_000)
    parser.add_argument("--seed", type=int, default=993)
    args = parser.parse_args()
    raw = expressions(args.parity)
    evaluate = sp.lambdify((R, U, V, C), raw, modules="numpy", cse=True)
    rng = np.random.default_rng(args.seed)
    r_values = np.floor(
        np.expm1(rng.uniform(0.0, np.log1p(1_000_000.0), args.samples))
    )
    u_values = rng.uniform(0.0, 0.45, args.samples)
    v_values = rng.uniform(0.0, 0.45, args.samples)
    c_values = np.expm1(
        rng.uniform(np.log1p(1e-12), np.log1p(3.0), args.samples)
    )
    (
        g0,
        slope,
        q2,
        p3,
        d_previous,
        d_last,
        terminal,
        b_previous,
        classical_diagonal,
        classical_subdiagonal,
    ) = evaluate(r_values, u_values, v_values, c_values)
    threshold = -q2 * g0 / slope
    moment_margin = slope**3 + q2**3 * g0**3 * p3
    m_ceiling = (
        d_previous - threshold - terminal / (d_last - threshold)
    ) / b_previous
    invariant_margin = (
        classical_diagonal
        - threshold
        - classical_subdiagonal * m_ceiling
        - 1 / m_ceiling
    )
    finite = (
        np.isfinite(g0)
        & np.isfinite(threshold)
        & np.isfinite(moment_margin)
        & np.isfinite(m_ceiling)
        & np.isfinite(invariant_margin)
    )
    chamber = (
        finite
        & (g0 < 0.0)
        & (threshold > 0.0)
        & (threshold < d_last)
        & (m_ceiling > 0.0)
    )
    moment_ok = moment_margin >= -1e-10 * np.maximum(1.0, np.abs(slope) ** 3)
    invariant_ok = invariant_margin >= -1e-10
    uncovered = chamber & ~moment_ok & ~invariant_ok

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
            "g0": float(g0[index]),
            "threshold": float(threshold[index]),
            "moment_margin": float(moment_margin[index]),
            "m_ceiling": float(m_ceiling[index]),
            "invariant_margin": float(invariant_margin[index]),
        }

    report = {
        "status": "COMBINED_GROUND_ROOT_CERTIFICATE_PROBE",
        "parity": args.parity,
        "samples": args.samples,
        "conditional_chamber": int(np.count_nonzero(chamber)),
        "moment_failures": int(np.count_nonzero(chamber & ~moment_ok)),
        "invariant_failures": int(np.count_nonzero(chamber & ~invariant_ok)),
        "uncovered": int(np.count_nonzero(uncovered)),
        "worst_uncovered_by_moment": witness(uncovered, moment_margin),
        "worst_uncovered_by_invariant": witness(uncovered, invariant_margin),
        "worst_moment_failure": witness(chamber & ~moment_ok, moment_margin),
        "worst_invariant_failure": witness(chamber & ~invariant_ok, invariant_margin),
        "maximum_r_invariant_failure": int(np.max(r_values[chamber & ~invariant_ok]))
        if np.any(chamber & ~invariant_ok)
        else None,
        "minimum_r_moment_failure": int(np.min(r_values[chamber & ~moment_ok]))
        if np.any(chamber & ~moment_ok)
        else None,
    }
    output = HERE / f"combined_ground_root_certificate_{args.parity}_probe_20260806.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(output)


if __name__ == "__main__":
    main()
