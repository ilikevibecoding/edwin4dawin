#!/usr/bin/env python3
"""Continuous optimization of PFSR in the two-step recursive cone.

This is a floating counterexample locator.  It parameterizes positive
C,D coefficient windows by extension means and curvature drops, forms
F=C+xD and T=F+xC exactly, and penalizes violations of the live branch,
curvature box, reserve nonnegativity, and all available lower C12
constraints.  Any negative result must be rationalized independently.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from scipy.optimize import differential_evolution

from scan_full_square_recursive_cone import (
    sigma,
    window_from_means,
)


def means_from_start(start: float, drops: np.ndarray) -> list[float]:
    values = [start]
    for drop in drops:
        values.append(1.0 + values[-1] - float(drop))
    return values


def evaluate(vector: np.ndarray, r: int) -> tuple[float, dict | None]:
    k = r + 1
    c_means = means_from_start(vector[0], vector[2:6])
    d_means = means_from_start(vector[1], vector[6:10])
    if min(c_means + d_means) <= 0:
        return 1e6, None
    c = window_from_means(r - 2, c_means)
    d_unit = window_from_means(r - 3, d_means)
    scale_cap = min(
        c[j] / d_unit[j] for j in range(r - 2, r + 2)
    )
    d_scale = scale_cap * 10.0 ** (-vector[10])
    d = {j: d_scale * value for j, value in d_unit.items()}
    f = {
        j: c[j] + d[j - 1]
        for j in range(r - 1, r + 3)
    }
    t = {
        j: f[j] + c[j - 1]
        for j in range(r, r + 3)
    }
    bm, b = f[r - 1], f[r]
    a, ap = t[r], t[r + 1]
    u = r * b / bm
    v = k * ap / a
    zeta = v - k * u / r
    q_c = sigma(c, r)
    q_c_next = sigma(c, k)
    q_d = sigma(d, r - 1)
    q_d_next = sigma(d, r)
    q_f = sigma(f, r)
    q_f_next = sigma(f, k)
    q_t = sigma(t, k)
    reserve_t = k - v + v * q_t
    reserve_f = r - u + u * q_f
    margin = reserve_t - zeta * zeta

    scale = float(max(r, 1))
    violations = [
        max(0.0, -zeta),
        max(0.0, k - v),
        max(0.0, -reserve_t),
        max(0.0, -reserve_f),
        max(0.0, r * q_c - 2.0 * k * q_t),
        max(0.0, (r - 1) * q_d - 2.0 * r * q_f),
        max(0.0, r * q_d_next - 2.0 * k * q_f_next),
    ]
    q_values = (
        q_c,
        q_c_next,
        q_d,
        q_d_next,
        q_f,
        q_f_next,
        q_t,
    )
    violations.extend(max(0.0, -q) for q in q_values)
    violations.extend(max(0.0, q - 4.0) for q in q_values)
    penalty = 1e10 * sum(
        (value / scale) ** 2 for value in violations
    )
    objective = margin / scale + penalty
    detail = {
        "r": r,
        "C_means": c_means,
        "D_means": d_means,
        "D_scale": d_scale,
        "u": u,
        "v": v,
        "zeta": zeta,
        "q_C": q_c,
        "q_C_next": q_c_next,
        "q_D": q_d,
        "q_D_next": q_d_next,
        "q_F": q_f,
        "q_F_next": q_f_next,
        "q_T": q_t,
        "R_F": reserve_f,
        "R_T": reserve_t,
        "margin": margin,
        "violations": violations,
        "feasible": max(violations, default=0.0) < 1e-7,
    }
    return objective, detail


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ranks", default="20,50,100,200")
    parser.add_argument("--maxiter", type=int, default=500)
    parser.add_argument("--popsize", type=int, default=20)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "full_square_recursive_cone_optimization_20260729.json"
        ),
    )
    args = parser.parse_args()

    records = []
    for index, r in enumerate(
        int(value) for value in args.ranks.split(",")
    ):
        upper = 6.0 * (r + 1)
        bounds = (
            [(0.05, upper), (0.05, upper)]
            + [(0.0, 4.0)] * 8
            + [(0.0, 8.0)]
        )
        result = differential_evolution(
            lambda x: evaluate(x, r)[0],
            bounds,
            maxiter=args.maxiter,
            popsize=args.popsize,
            seed=args.seed + index,
            polish=True,
            updating="immediate",
            workers=1,
            tol=1e-9,
        )
        _, detail = evaluate(result.x, r)
        record = {
            "rank": r,
            "objective": float(result.fun),
            "success": bool(result.success),
            "message": str(result.message),
            "evaluations": int(result.nfev),
            "detail": detail,
        }
        records.append(record)
        print(
            json.dumps(
                record,
                default=lambda value: value.item(),
            ),
            flush=True,
        )

    feasible = [
        record for record in records
        if record["detail"] is not None
        and record["detail"]["feasible"]
    ]
    champion = min(
        feasible,
        key=lambda record: record["detail"]["margin"],
        default=None,
    )
    report = {
        "status": (
            "FLOAT_RECURSIVE_CONE_PFSR_FAILURE"
            if champion is not None
            and champion["detail"]["margin"] < 0
            else "NO_FEASIBLE_FLOAT_FAILURE_FOUND"
        ),
        "parameters": vars(args) | {"output": str(args.output)},
        "champion": champion,
        "records": records,
    }
    args.output.write_text(
        json.dumps(
            report,
            indent=2,
            default=lambda value: value.item(),
        )
        + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {"status": report["status"], "champion": champion},
            indent=2,
            default=lambda value: value.item(),
        )
    )


if __name__ == "__main__":
    main()
