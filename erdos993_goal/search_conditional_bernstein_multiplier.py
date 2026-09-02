#!/usr/bin/env python3
"""Search a Bernstein Positivstellensatz certificate on a fixed r slice.

Given a target M and condition g<0, seek Bernstein-nonnegative P,Q with
M=P+(-g)Q, equivalently P=M+gQ.  This is a finite linear feasibility problem
for the Bernstein coefficients of Q.
"""

from __future__ import annotations

import argparse
import json
from math import comb
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog
from scipy.sparse import coo_matrix


HERE = Path(__file__).resolve().parent
U, V, W = sp.symbols("u v w")


def bernstein_coefficients(expression: sp.Expr, degrees: tuple[int, int, int]) -> np.ndarray:
    polynomial = sp.Poly(sp.expand(expression), U, V, W)
    power = {monomial: float(coefficient) for monomial, coefficient in polynomial.terms()}
    output = np.zeros(tuple(degree + 1 for degree in degrees), dtype=float)
    for index in np.ndindex(output.shape):
        total = 0.0
        for monomial, coefficient in power.items():
            if all(monomial[axis] <= index[axis] for axis in range(3)):
                factor = 1.0
                for axis in range(3):
                    factor *= comb(index[axis], monomial[axis]) / comb(
                        degrees[axis], monomial[axis]
                    )
                total += coefficient * factor
        output[index] = total
    return output


def product_matrix(
    g_bernstein: np.ndarray,
    q_degrees: tuple[int, int, int],
) -> coo_matrix:
    g_degrees = tuple(value - 1 for value in g_bernstein.shape)
    out_degrees = tuple(g_degrees[i] + q_degrees[i] for i in range(3))
    rows: list[int] = []
    columns: list[int] = []
    values: list[float] = []
    q_shape = tuple(value + 1 for value in q_degrees)
    out_shape = tuple(value + 1 for value in out_degrees)
    for gi in np.ndindex(g_bernstein.shape):
        gv = g_bernstein[gi]
        if gv == 0:
            continue
        for qi in np.ndindex(q_shape):
            oi = tuple(gi[axis] + qi[axis] for axis in range(3))
            factor = gv
            for axis in range(3):
                factor *= (
                    comb(g_degrees[axis], gi[axis])
                    * comb(q_degrees[axis], qi[axis])
                    / comb(out_degrees[axis], oi[axis])
                )
            rows.append(np.ravel_multi_index(oi, out_shape))
            columns.append(np.ravel_multi_index(qi, q_shape))
            values.append(factor)
    return coo_matrix(
        (values, (rows, columns)),
        shape=(int(np.prod(out_shape)), int(np.prod(q_shape))),
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--target", default="third_moment_threshold_margin")
    parser.add_argument("--c-max", type=sp.Rational, default=sp.Rational(2))
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--margin", type=float, default=0.0)
    args = parser.parse_args()
    record = json.loads(args.report.read_text(encoding="utf-8"))["records"][0]
    local = {"u": U, "v": V, "c": args.c_max * W, "r": sp.Integer(record["r_specialization"])}
    condition = sp.sympify(
        record["target_expressions"]["endpoint_margin_at_zero_shift"], locals=local
    )
    target = sp.sympify(record["target_expressions"][args.target], locals=local)
    condition_numerator, _ = sp.fraction(sp.cancel(condition))
    target_numerator, _ = sp.fraction(sp.cancel(target))
    condition_degrees = tuple(sp.Poly(condition_numerator, U, V, W).degree(x) for x in (U, V, W))
    target_degrees = tuple(sp.Poly(target_numerator, U, V, W).degree(x) for x in (U, V, W))
    q_degrees = tuple(target_degrees[i] - condition_degrees[i] for i in range(3))
    assert min(q_degrees) >= 0

    g = bernstein_coefficients(condition_numerator, condition_degrees)
    m = bernstein_coefficients(target_numerator, target_degrees)
    # Independent positive rescalings only change the unknown multiplier.
    g_scale = np.max(np.abs(g))
    m_scale = np.max(np.abs(m))
    gs = g / g_scale
    ms = m / m_scale
    product = product_matrix(gs, q_degrees).tocsr()
    row_max = np.maximum(
        np.abs(ms.ravel()),
        np.asarray(np.abs(product).max(axis=1).toarray()).ravel(),
    )
    row_max[row_max == 0] = 1.0
    normalized_product = product.multiply((1.0 / row_max)[:, None]).tocsr()
    normalized_m = ms.ravel() / row_max
    # P=M+gQ>=0 gives -product*q <= M.
    requested_margin = np.full(product.shape[0], args.margin)
    structurally_forced_zero = (np.abs(normalized_m) < 1e-15) & (
        np.diff(normalized_product.indptr) == 0
    )
    requested_margin[structurally_forced_zero] = 0.0
    result = linprog(
        np.ones(product.shape[1]),
        A_ub=-normalized_product,
        b_ub=normalized_m - requested_margin,
        bounds=(0, None),
        method="highs",
        options={"dual_feasibility_tolerance": 1e-9, "primal_feasibility_tolerance": 1e-9},
    )
    payload: dict[str, object] = {
        "status": "feasible" if result.success else "infeasible_or_unresolved",
        "message": result.message,
        "report": str(args.report),
        "target": args.target,
        "c_max": str(args.c_max),
        "condition_degrees": condition_degrees,
        "target_degrees": target_degrees,
        "multiplier_degrees": q_degrees,
        "variable_count": product.shape[1],
        "constraint_count": product.shape[0],
        "requested_scaled_margin": args.margin,
        "structurally_forced_zero_constraints": int(np.sum(structurally_forced_zero)),
    }
    if result.success:
        q = result.x
        p = ms.ravel() + product @ q
        normalized_p = p / row_max
        q_shape = tuple(value + 1 for value in q_degrees)
        nonzero_controls = [
            {
                "index": [int(value) for value in np.unravel_index(index, q_shape)],
                "value": float(value),
            }
            for index, value in enumerate(q)
            if value > 1e-12
        ]
        payload.update(
            {
                "minimum_multiplier_control": float(np.min(q)),
                "minimum_remainder_control": float(np.min(p)),
                "minimum_row_normalized_remainder": float(np.min(normalized_p)),
                "positive_multiplier_controls": int(np.sum(q > 1e-10)),
                "objective": float(result.fun),
                "nonzero_multiplier_controls_scaled": nonzero_controls,
                "target_scale": float(m_scale),
                "condition_scale": float(g_scale),
                "tight_remainder_controls": [
                    {
                        "index": [
                            int(value) for value in np.unravel_index(index, ms.shape)
                        ],
                        "row_normalized_value": float(value),
                    }
                    for index, value in enumerate(normalized_p)
                    if abs(value) < 1e-9
                ],
            }
        )
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
